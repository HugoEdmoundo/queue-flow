const BASE_URL = (import.meta.env.VITE_API_URL ?? "https://api-queue.hugoedm.fun").replace(/\/$/, "");
const WS_URL = BASE_URL.replace(/^https/, "wss").replace(/^http/, "ws");

// ── Types ──────────────────────────────────────────────────────────────────

export interface Periode {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Registration {
  id: string;
  name: string;
  kk_number: string;
  rt_rw: string;
  referral_code: string;
  queue_number: number;
  status: "waiting" | "serving" | "served" | "pending";
  periode_id: string;
  created_at: string;
  updated_at: string;
}

export interface QueueSettings {
  id: string;
  periode_id: string;
  current_queue_number: number;
  current_referral_code: string;
  next_queue_counter: number;
  created_at: string;
  updated_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    try {
      const json = JSON.parse(text);
      throw new Error(json.detail ?? json.message ?? text);
    } catch (parseErr) {
      if (parseErr instanceof SyntaxError) throw new Error(text || `HTTP ${res.status}`);
      throw parseErr;
    }
  }
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

// ── Periodes ───────────────────────────────────────────────────────────────

export const periodeApi = {
  getAll: () => request<Periode[]>("/api/periodes"),

  // Response: { message: string, data: Periode }
  // Falls back to getAll() if /active returns 404
  getActive: async (): Promise<Periode | null> => {
    try {
      const res = await request<{ message: string; data: Periode }>("/api/periodes/active");
      return res?.data ?? null;
    } catch {
      // Fallback: derive from getAll if /active not available
      try {
        const all = await request<Periode[]>("/api/periodes");
        return all.find((p) => p.is_active) ?? null;
      } catch {
        return null;
      }
    }
  },

  create: (name: string) =>
    request<Periode>("/api/periodes", {
      method: "POST",
      body: JSON.stringify({ name, is_active: false }),
    }),

  // PATCH /api/periodes/{id}/activate
  activate: (id: string) =>
    request<Periode>(`/api/periodes/${id}/activate`, { method: "PATCH" }),

  update: (id: string, data: Partial<Pick<Periode, "name" | "is_active">>) =>
    request<Periode>(`/api/periodes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/api/periodes/${id}`, { method: "DELETE" }),
};

// ── Registrations ──────────────────────────────────────────────────────────
// rt_rw must be exactly "XXX:XXX" (3 digits : 3 digits)

export const registrationApi = {
  getAll: (params?: { periodeId?: string; status?: string }) => {
    const qs = params
      ? "?" + new URLSearchParams(params as Record<string, string>).toString()
      : "";
    return request<Registration[]>(`/api/registrations${qs}`);
  },

  create: (data: {
    name: string;
    kk_number: string; // exactly 16 digits
    rt_rw: string;     // exactly "XXX:XXX"
    periode_id: string;
  }) =>
    request<Registration>("/api/registrations", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Pick<Registration, "status" | "name" | "kk_number" | "rt_rw">>) =>
    request<Registration>(`/api/registrations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/api/registrations/${id}`, { method: "DELETE" }),
};

// ── Queue Settings ─────────────────────────────────────────────────────────

export const queueSettingsApi = {
  getByPeriode: (periodeId: string) =>
    request<QueueSettings>(`/api/queue-settings/periode/${periodeId}`),

  create: (data: {
    periode_id: string;
    current_queue_number?: number;
    current_referral_code?: string;
    next_queue_counter?: number;
  }) =>
    request<QueueSettings>("/api/queue-settings", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ── Queue Operations ───────────────────────────────────────────────────────

export const queueApi = {
  next: () =>
    request<{ message: string; current_queue?: Registration }>(
      "/api/queue/next",
      { method: "POST" }
    ),
  pending: () =>
    request<{ message: string; current_serving?: Partial<Registration>; pending?: Partial<Registration> }>(
      "/api/queue/pending",
      { method: "POST" }
    ),
  back: () =>
    request<{ message: string; current_serving?: Partial<Registration>; previous_serving?: Partial<Registration> }>(
      "/api/queue/back",
      { method: "POST" }
    ),
};

// ── WebSocket with auto-reconnect ──────────────────────────────────────────

export function createWebSocket(onMessage: (data: unknown) => void): { close: () => void } {
  let ws: WebSocket | null = null;
  let closed = false;
  let retryTimeout: ReturnType<typeof setTimeout> | null = null;
  let retryDelay = 1000;

  function connect() {
    if (closed) return;
    ws = new WebSocket(`${WS_URL}/ws`);

    ws.onopen = () => {
      retryDelay = 1000;
    };

    ws.onmessage = (e) => {
      try {
        onMessage(JSON.parse(e.data));
      } catch {
        // ignore non-JSON frames
      }
    };

    ws.onclose = () => {
      ws = null;
      if (!closed) {
        retryTimeout = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 30000);
          connect();
        }, retryDelay);
      }
    };

    ws.onerror = () => {
      if (ws?.readyState !== WebSocket.CLOSED) ws?.close();
    };
  }

  connect();

  return {
    close() {
      closed = true;
      if (retryTimeout) { clearTimeout(retryTimeout); retryTimeout = null; }
      if (ws && ws.readyState !== WebSocket.CLOSED) ws.close();
      ws = null;
    },
  };
}
