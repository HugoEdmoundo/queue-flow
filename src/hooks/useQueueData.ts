import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Registration = Tables<"warga">;
type QueueSettings = Tables<"queue_settings">;

export function useQueueData(periodeId?: string | null) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [settings, setSettings] = useState<QueueSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    // If no periodeId, fetch active periode first
    let activePeriodeId = periodeId;
    if (!activePeriodeId) {
      const { data: activeP } = await supabase
        .from("periodes")
        .select("id")
        .eq("is_active", true)
        .maybeSingle();
      activePeriodeId = activeP?.id ?? null;
    }

    if (!activePeriodeId) {
      setRegistrations([]);
      setSettings(null);
      setLoading(false);
      return;
    }

    const [regRes, settingsRes] = await Promise.all([
      supabase
        .from("warga")
        .select("*")
        .eq("periode_id", activePeriodeId)
        .order("queue_number", { ascending: true }),
      supabase
        .from("queue_settings")
        .select("*")
        .eq("periode_id", activePeriodeId)
        .maybeSingle(),
    ]);

    if (regRes.data) setRegistrations(regRes.data);
    if (settingsRes.data) setSettings(settingsRes.data);
    setLoading(false);
  }, [periodeId]);

  useEffect(() => {
    fetchData();

    const regChannel = supabase
      .channel(`warga-realtime-${periodeId ?? "active"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "warga" }, () => {
        fetchData();
      })
      .subscribe();

    const settingsChannel = supabase
      .channel(`queue-settings-realtime-${periodeId ?? "active"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_settings" }, () => {
        fetchData();
      })
      .subscribe();

    const periodeChannel = supabase
      .channel(`periodes-change-${periodeId ?? "active"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "periodes" }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(regChannel);
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(periodeChannel);
    };
  }, [fetchData, periodeId]);

  const waiting = registrations.filter((r) => r.status === "waiting");
  const served = registrations.filter((r) => r.status === "served");
  const serving = registrations.find((r) => r.status === "serving");
  const pending = registrations.filter((r) => r.status === "pending");

  return { registrations, settings, loading, waiting, served, serving, pending, refetch: fetchData };
}
