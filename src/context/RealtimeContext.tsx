import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { periodeApi, registrationApi, queueSettingsApi, createWebSocket } from "@/lib/api";
import type { Periode, Registration, QueueSettings } from "@/lib/api";

const POLL_MS = 4000;

interface RealtimeState {
  periodes: Periode[];
  activePeriode: Periode | null;
  registrations: Registration[];
  settings: QueueSettings | null;
  loading: boolean;
  refetch: () => void;
  createPeriode: (name: string) => Promise<Periode>;
  activatePeriode: (id: string) => Promise<void>;
}

const Ctx = createContext<RealtimeState | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [periodes, setPeriodes] = useState<Periode[]>([]);
  const [activePeriode, setActivePeriode] = useState<Periode | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [settings, setSettings] = useState<QueueSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const busyRef = useRef(false);

  const fetchAll = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      // Fetch periodes + active in parallel
      const [allPeriodes, active] = await Promise.all([
        periodeApi.getAll(),
        periodeApi.getActive(),
      ]);
      setPeriodes(allPeriodes);
      const resolvedActive = active ?? null;
      setActivePeriode(resolvedActive);

      if (!resolvedActive?.id) {
        setRegistrations([]);
        setSettings(null);
        return;
      }

      const [regs, s] = await Promise.all([
        registrationApi.getAll({ periodeId: resolvedActive.id }),
        queueSettingsApi.getByPeriode(resolvedActive.id).catch(() => null),
      ]);

      setRegistrations([...regs].sort((a, b) => a.queue_number - b.queue_number));
      setSettings(s);
    } catch {
      // silent — will retry
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const ws = createWebSocket(() => fetchAll());
    const poll = setInterval(fetchAll, POLL_MS);
    return () => {
      ws.close();
      clearInterval(poll);
    };
  }, [fetchAll]);

  const createPeriode = async (name: string) => {
    const data = await periodeApi.create(name);
    await fetchAll();
    return data;
  };

  const activatePeriode = async (id: string) => {
    await periodeApi.activate(id);
    try {
      await queueSettingsApi.getByPeriode(id);
    } catch {
      await queueSettingsApi.create({ periode_id: id });
    }
    await fetchAll();
  };

  return (
    <Ctx.Provider
      value={{ periodes, activePeriode, registrations, settings, loading, refetch: fetchAll, createPeriode, activatePeriode }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useRealtime() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRealtime must be used inside RealtimeProvider");
  return ctx;
}

// Convenience derived selectors
export function useQueueData() {
  const { registrations, settings, loading, refetch } = useRealtime();
  const waiting = registrations.filter((r) => r.status === "waiting");
  const served = registrations.filter((r) => r.status === "served");
  const serving = registrations.find((r) => r.status === "serving");
  const pending = registrations.filter((r) => r.status === "pending");
  return { registrations, settings, loading, waiting, served, serving, pending, refetch };
}

export function usePeriodeData() {
  const { periodes, activePeriode, loading, refetch, createPeriode, activatePeriode } = useRealtime();
  return { periodes, activePeriode, loading, refetch, createPeriode, activatePeriode };
}
