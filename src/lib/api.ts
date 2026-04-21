const BASE_URL = import.meta.env.VITE_API_URL ?? "https://queue-api.hugoedm.fun";
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
    // Try to extract detail from JSON error body
    try {
      const json = JSON.parse(text);
      throw new Error(json.detail ?? text);
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
// NOTE: activate/update/delete use /api/{id} not /api/periodes/{id}

export const periodeApi = {
  getAll: () => request<Periode[]>("/api/periodes"),

  // /api/periodes/active is broken on server — derive from getAll instead
  getActive: async (): Promise<Periode | null> => {
    const all = await request<Periode[]>("/api/periodes");
    return all.find((p) => p.is_active) ?? null;
  },

  create: (name: string) =>
    request<Periode>("/api/periodes", {
      method: "POST",
      body: JSON.stringify({ name, is_active: false }),
    }),

  // Correct path: /api/{periode_id}/activate
  activate: (id: string) =>
    request<Periode>(`/api/${id}/activate`, { method: "PATCH" }),

  // Correct path: /api/{periode_id}
  update: (id: string, data: Partial<Pick<Periode, "name" | "is_active">>) =>
    request<Periode>(`/api/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/api/${id}`, { method: "DELETE" }),
};

// ── Registrations ──────────────────────────────────────────────────────────
// NOTE: query param is "periodeId" (camelCase), rt_rw must be "NNN:NNN"
// API auto-generates referral_code and queue_number — do NOT send them

export const registrationApi = {
  getAll: (params?: { periodeId?: string; status?: string }) => {
    const qs = params
      ? "?" + new URLSearchParams(params as Record<string, string>).toString()
      : "";
    return request<Registration[]>(`/api/registrations${qs}`);
  },

  getById: (id: string) => request<Registration>(`/api/registrations/${id}`),

  create: (data: {
    name: string;
    kk_number: string;
    rt_rw: string; // must be "NNN:NNN"
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

  update: (
    id: string,
    data: Partial<
      Pick<QueueSettings, "current_queue_number" | "current_referral_code" | "next_queue_counter">
    >
  ) =>
    request<QueueSettings>(`/api/queue-settings/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// ── Queue Operations ───────────────────────────────────────────────────────
// NOTE: API does not accept a body — queue ops work on the active periode

export const queueApi = {
  next: () =>
    request<{ message: string; serving?: Registration; settings?: QueueSettings }>(
      "/api/queue/next",
      { method: "POST" }
    ),
  pending: () =>
    request<{ message: string }>("/api/queue/pending", { method: "POST" }),
  back: () =>
    request<{ message: string; serving?: Registration; settings?: QueueSettings }>(
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
      retryDelay = 1000; // reset backoff on successful connect
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
          retryDelay = Math.min(retryDelay * 2, 30000); // exponential backoff, max 30s
          connect();
        }, retryDelay);
      }
    };

    ws.onerror = () => {
      // onclose will fire after onerror, so just close cleanly
      if (ws?.readyState !== WebSocket.CLOSED) {
        ws?.close();
      }
    };
  }

  connect();

  return {
    close() {
      closed = true;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        retryTimeout = null;
      }
      if (ws && ws.readyState !== WebSocket.CLOSED) {
        ws.close();
      }
      ws = null;
    },
  };
}
