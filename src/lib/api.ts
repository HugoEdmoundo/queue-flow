// Supabase-backed API layer (replaces external REST API)
import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────────────────────

export interface Periode {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type RegStatus = "waiting" | "serving" | "served" | "pending";

export interface Registration {
  id: string;
  name: string;
  kk_number: string;
  rt_rw: string;
  referral_code: string;
  queue_number: number;
  status: RegStatus;
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

function genReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no easily-confused chars
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function uniqueReferralCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = genReferralCode();
    const { data } = await supabase
      .from("registrations")
      .select("id")
      .eq("referral_code", code)
      .maybeSingle();
    if (!data) return code;
  }
  return genReferralCode() + Date.now().toString(36).slice(-2).toUpperCase();
}

// ── Periodes ───────────────────────────────────────────────────────────────

export const periodeApi = {
  getAll: async (): Promise<Periode[]> => {
    const { data, error } = await supabase
      .from("periodes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Periode[];
  },

  getActive: async (): Promise<Periode | null> => {
    const { data, error } = await supabase
      .from("periodes")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as Periode | null;
  },

  create: async (name: string): Promise<Periode> => {
    const { data, error } = await supabase
      .from("periodes")
      .insert({ name, is_active: false })
      .select()
      .single();
    if (error) throw error;
    // Auto-create the linked queue_settings row
    await supabase.from("queue_settings").insert({
      periode_id: data.id,
      current_queue_number: 0,
      current_referral_code: "",
      next_queue_counter: 1,
    });
    return data as Periode;
  },

  activate: async (id: string): Promise<Periode> => {
    // Deactivate any active periode first to satisfy the unique index
    await supabase.from("periodes").update({ is_active: false }).eq("is_active", true);
    const { data, error } = await supabase
      .from("periodes")
      .update({ is_active: true })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    // Ensure queue_settings exists for it
    const { data: s } = await supabase
      .from("queue_settings")
      .select("id")
      .eq("periode_id", id)
      .maybeSingle();
    if (!s) {
      await supabase.from("queue_settings").insert({
        periode_id: id,
        current_queue_number: 0,
        current_referral_code: "",
        next_queue_counter: 1,
      });
    }
    return data as Periode;
  },

  delete: async (id: string) => {
    const { error } = await supabase.from("periodes").delete().eq("id", id);
    if (error) throw error;
  },
};

// ── Registrations ──────────────────────────────────────────────────────────

export const registrationApi = {
  getAll: async (params?: { periodeId?: string; status?: string }): Promise<Registration[]> => {
    let q = supabase.from("registrations").select("*").order("queue_number", { ascending: true });
    if (params?.periodeId) q = q.eq("periode_id", params.periodeId);
    if (params?.status) q = q.eq("status", params.status);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Registration[];
  },

  create: async (input: {
    name: string;
    kk_number: string;
    rt_rw: string;
    periode_id: string;
  }): Promise<Registration> => {
    // Fetch & increment counter atomically-ish
    const { data: s, error: sErr } = await supabase
      .from("queue_settings")
      .select("*")
      .eq("periode_id", input.periode_id)
      .maybeSingle();
    if (sErr) throw sErr;

    let settings = s;
    if (!settings) {
      const { data: created, error: cErr } = await supabase
        .from("queue_settings")
        .insert({
          periode_id: input.periode_id,
          current_queue_number: 0,
          current_referral_code: "",
          next_queue_counter: 1,
        })
        .select()
        .single();
      if (cErr) throw cErr;
      settings = created;
    }

    const queueNumber = settings.next_queue_counter ?? 1;
    const referralCode = await uniqueReferralCode();

    const { data: reg, error: rErr } = await supabase
      .from("registrations")
      .insert({
        name: input.name,
        kk_number: input.kk_number,
        rt_rw: input.rt_rw,
        referral_code: referralCode,
        queue_number: queueNumber,
        status: "waiting",
        periode_id: input.periode_id,
      })
      .select()
      .single();
    if (rErr) throw rErr;

    await supabase
      .from("queue_settings")
      .update({ next_queue_counter: queueNumber + 1 })
      .eq("id", settings.id);

    return reg as Registration;
  },

  update: async (id: string, patch: Partial<Pick<Registration, "status" | "name" | "kk_number" | "rt_rw">>) => {
    const { data, error } = await supabase
      .from("registrations")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Registration;
  },

  delete: async (id: string) => {
    const { error } = await supabase.from("registrations").delete().eq("id", id);
    if (error) throw error;
  },
};

// ── Queue Settings ─────────────────────────────────────────────────────────

export const queueSettingsApi = {
  getByPeriode: async (periodeId: string): Promise<QueueSettings | null> => {
    const { data, error } = await supabase
      .from("queue_settings")
      .select("*")
      .eq("periode_id", periodeId)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as QueueSettings | null;
  },

  create: async (input: {
    periode_id: string;
    current_queue_number?: number;
    current_referral_code?: string;
    next_queue_counter?: number;
  }): Promise<QueueSettings> => {
    const { data, error } = await supabase
      .from("queue_settings")
      .insert({
        periode_id: input.periode_id,
        current_queue_number: input.current_queue_number ?? 0,
        current_referral_code: input.current_referral_code ?? "",
        next_queue_counter: input.next_queue_counter ?? 1,
      })
      .select()
      .single();
    if (error) throw error;
    return data as QueueSettings;
  },
};

// ── Queue operations ───────────────────────────────────────────────────────

async function getActivePeriodeId(): Promise<string> {
  const p = await periodeApi.getActive();
  if (!p) throw new Error("Tidak ada periode aktif");
  return p.id;
}

async function syncSettings(periodeId: string, current?: Registration | null) {
  await supabase
    .from("queue_settings")
    .update({
      current_queue_number: current?.queue_number ?? 0,
      current_referral_code: current?.referral_code ?? "",
    })
    .eq("periode_id", periodeId);
}

export const queueApi = {
  next: async () => {
    const periodeId = await getActivePeriodeId();
    const regs = await registrationApi.getAll({ periodeId });
    const serving = regs.find((r) => r.status === "serving");
    if (serving) {
      await supabase.from("registrations").update({ status: "served" }).eq("id", serving.id);
    }
    const nextOne = regs.filter((r) => r.status === "waiting").sort((a, b) => a.queue_number - b.queue_number)[0];
    if (nextOne) {
      await supabase.from("registrations").update({ status: "serving" }).eq("id", nextOne.id);
      await syncSettings(periodeId, nextOne);
      return { message: "ok", current_queue: nextOne };
    }
    await syncSettings(periodeId, null);
    return { message: "no more waiting" };
  },

  back: async () => {
    const periodeId = await getActivePeriodeId();
    const regs = await registrationApi.getAll({ periodeId });
    const serving = regs.find((r) => r.status === "serving");
    const lastServed = [...regs.filter((r) => r.status === "served")].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )[0];
    if (!lastServed) throw new Error("Tidak ada antrian sebelumnya");
    if (serving) {
      await supabase.from("registrations").update({ status: "waiting" }).eq("id", serving.id);
    }
    await supabase.from("registrations").update({ status: "serving" }).eq("id", lastServed.id);
    await syncSettings(periodeId, lastServed);
    return { message: "ok", current_serving: lastServed };
  },

  pending: async () => {
    const periodeId = await getActivePeriodeId();
    const regs = await registrationApi.getAll({ periodeId });
    const serving = regs.find((r) => r.status === "serving");
    if (!serving) throw new Error("Tidak ada antrian yang sedang dilayani");
    await supabase.from("registrations").update({ status: "pending" }).eq("id", serving.id);
    const nextOne = regs.filter((r) => r.status === "waiting").sort((a, b) => a.queue_number - b.queue_number)[0];
    if (nextOne) {
      await supabase.from("registrations").update({ status: "serving" }).eq("id", nextOne.id);
      await syncSettings(periodeId, nextOne);
    } else {
      await syncSettings(periodeId, null);
    }
    return { message: "ok", pending: serving };
  },
};
