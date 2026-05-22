import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { periodeApi, registrationApi, queueSettingsApi } from "@/lib/api";
import type { Periode, Registration, QueueSettings } from "@/lib/api";

interface RealtimeState {
  periodes: Periode[];
  activePeriode: Periode | null;
  registrations: Registration[];
  settings: QueueSettings | null;
  loading: boolean;
  refetch: () => Promise<void>;
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
      const [allPeriodes, active] = await Promise.all([periodeApi.getAll(), periodeApi.getActive()]);
      setPeriodes(allPeriodes);
      setActivePeriode(active);

      if (!active?.id) {
        setRegistrations([]);
        setSettings(null);
        return;
      }

      const [regs, s] = await Promise.all([
        registrationApi.getAll({ periodeId: active.id }),
        queueSettingsApi.getByPeriode(active.id).catch(() => null),
      ]);
      setRegistrations([...regs].sort((a, b) => a.queue_number - b.queue_number));
      setSettings(s);
    } catch {
      // silent
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel("queue-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "registrations" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_settings" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "periodes" }, () => fetchAll())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const createPeriode = async (name: string) => {
    const p = await periodeApi.create(name);
    await fetchAll();
    return p;
  };

  const activatePeriode = async (id: string) => {
    await periodeApi.activate(id);
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

// Convenience selectors — keep arg-compatible signature with previous version
export function useQueueData(_periodeId?: string) {
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
