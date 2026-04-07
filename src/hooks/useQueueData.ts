import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Registration = Tables<"registrations">;
type QueueSettings = Tables<"queue_settings">;

export function useQueueData() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [settings, setSettings] = useState<QueueSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [regRes, settingsRes] = await Promise.all([
      supabase.from("registrations").select("*").order("queue_number", { ascending: true }),
      supabase.from("queue_settings").select("*").limit(1).single(),
    ]);
    if (regRes.data) setRegistrations(regRes.data);
    if (settingsRes.data) setSettings(settingsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    const regChannel = supabase
      .channel("registrations-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "registrations" }, () => {
        fetchData();
      })
      .subscribe();

    const settingsChannel = supabase
      .channel("queue-settings-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_settings" }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(regChannel);
      supabase.removeChannel(settingsChannel);
    };
  }, []);

  const waiting = registrations.filter((r) => r.status === "waiting");
  const served = registrations.filter((r) => r.status === "served");
  const serving = registrations.find((r) => r.status === "serving");
  const pending = registrations.filter((r) => r.status === "pending");

  return { registrations, settings, loading, waiting, served, serving, pending, refetch: fetchData };
}
