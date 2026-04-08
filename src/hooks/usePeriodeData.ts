import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Periode = Tables<"periodes">;

export function usePeriodeData() {
  const [periodes, setPeriodes] = useState<Periode[]>([]);
  const [activePeriode, setActivePeriode] = useState<Periode | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPeriodes = useCallback(async () => {
    const { data } = await supabase
      .from("periodes")
      .select("*")
      .order("created_at", { ascending: true });
    if (data) {
      setPeriodes(data);
      setActivePeriode(data.find((p) => p.is_active) ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPeriodes();

    const channel = supabase
      .channel("periodes-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "periodes" }, () => {
        fetchPeriodes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPeriodes]);

  const createPeriode = async (name: string) => {
    const { data, error } = await supabase
      .from("periodes")
      .insert({ name, is_active: false })
      .select()
      .single();
    if (error) throw error;
    return data;
  };

  const activatePeriode = async (id: string) => {
    // Deactivate all
    await supabase.from("periodes").update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    // Activate selected
    await supabase.from("periodes").update({ is_active: true }).eq("id", id);
    // Ensure queue_settings row exists for this periode
    const { data: existing } = await supabase
      .from("queue_settings")
      .select("id")
      .eq("periode_id", id)
      .maybeSingle();
    if (!existing) {
      await supabase.from("queue_settings").insert({
        periode_id: id,
        current_queue_number: 0,
        current_referral_code: "",
        next_queue_counter: 1,
      });
    }
  };

  return { periodes, activePeriode, loading, createPeriode, activatePeriode, refetch: fetchPeriodes };
}
