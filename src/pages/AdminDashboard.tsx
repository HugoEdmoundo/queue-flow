import { useState } from "react";
import { useQueueData } from "@/hooks/useQueueData";
import { usePeriodeData } from "@/hooks/usePeriodeData";
import { QueueTable } from "@/components/QueueTable";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Search,
  Pause,
  Clock,
  Trash2,
  CheckCircle,
  LayoutDashboard,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  Plus,
  Table2,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Registration = Tables<"warga">;
type Mode = "control" | "periode";

export default function AdminDashboard() {
  const [mode, setMode] = useState<Mode>("control");
  const { periodes, activePeriode, createPeriode, activatePeriode } = usePeriodeData();
  const { waiting, served, serving, pending, settings } = useQueueData(activePeriode?.id);
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [showPending, setShowPending] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedPeriodeId, setSelectedPeriodeId] = useState<string | null>(null);

  const query = search.trim().toLowerCase();
  const matchesSearch = (reg: Registration) => {
    if (!query) return true;
    return [reg.queue_number.toString(), reg.referral_code, reg.name, reg.rt_rw, reg.status]
      .filter(Boolean)
      .some((v) => v.toString().toLowerCase().includes(query));
  };

  const filteredWaiting = waiting.filter(matchesSearch);
  const filteredServed = served.filter(matchesSearch);

  // Next: serving → served (table kanan), waiting[0] → serving
  const handleNext = async () => {
    if (!settings) return;
    if (serving) {
      await supabase.from("warga").update({ status: "served" }).eq("id", serving.id);
    }
    if (waiting.length > 0) {
      const next = waiting[0];
      await supabase.from("warga").update({ status: "serving" }).eq("id", next.id);
      await supabase
        .from("queue_settings")
        .update({ current_queue_number: next.queue_number, current_referral_code: next.referral_code })
        .eq("id", settings.id);
      toast.success(`Memanggil antrian #${next.queue_number}`);
    } else {
      await supabase
        .from("queue_settings")
        .update({ current_queue_number: 0, current_referral_code: "" })
        .eq("id", settings.id);
      toast.info("Semua antrian sudah selesai");
    }
  };

  // Back: serving → waiting, served terakhir → serving
  const handleBack = async () => {
    if (!settings) return;
    if (serving) {
      await supabase.from("warga").update({ status: "waiting" }).eq("id", serving.id);
    }
    if (served.length > 0) {
      const lastServed = served[served.length - 1];
      await supabase.from("warga").update({ status: "serving" }).eq("id", lastServed.id);
      await supabase
        .from("queue_settings")
        .update({ current_queue_number: lastServed.queue_number, current_referral_code: lastServed.referral_code })
        .eq("id", settings.id);
      toast.info(`Kembali ke antrian #${lastServed.queue_number}`);
    } else {
      await supabase
        .from("queue_settings")
        .update({ current_queue_number: 0, current_referral_code: "" })
        .eq("id", settings.id);
    }
  };

  // Pending: serving → pending (hilang dari slide, masuk popup terlewat)
  const handlePending = async () => {
    if (!serving || !settings) return;
    await supabase.from("warga").update({ status: "pending" }).eq("id", serving.id);
    toast("Antrian ditunda", { description: `#${serving.queue_number} masuk ke terlewat` });
    if (waiting.length > 0) {
      const next = waiting[0];
      await supabase.from("warga").update({ status: "serving" }).eq("id", next.id);
      await supabase
        .from("queue_settings")
        .update({ current_queue_number: next.queue_number, current_referral_code: next.referral_code })
        .eq("id", settings.id);
    } else {
      await supabase
        .from("queue_settings")
        .update({ current_queue_number: 0, current_referral_code: "" })
        .eq("id", settings.id);
    }
  };

  // Accept pending: masuk ke table kanan (served)
  const handleAcceptPending = async (reg: Registration) => {
    await supabase.from("warga").update({ status: "served" }).eq("id", reg.id);
    toast.success(`#${reg.queue_number} dipindahkan ke sudah dilayani`);
  };

  // Delete pending: hapus total dari kedua table
  const handleDeletePending = async (reg: Registration) => {
    await supabase.from("warga").delete().eq("id", reg.id);
    toast(`#${reg.queue_number} dihapus`);
  };

  const handleDeleteReg = async (reg: Registration) => {
    await supabase.from("warga").delete().eq("id", reg.id);
    setSelectedReg(null);
    toast.success("Data dihapus");
  };

  const handleClearReg = async (reg: Registration) => {
    await supabase.from("warga").update({ status: "served" }).eq("id", reg.id);
    setSelectedReg(null);
    toast.success(`#${reg.queue_number} dimasukkan ke sudah dilayani`);
  };

  const handleCreatePeriode = async () => {
    const name = window.prompt("Nama periode baru", `Periode ${periodes.length + 1}`)?.trim();
    if (!name) return;
    try {
      await createPeriode(name);
      toast.success(`Periode "${name}" dibuat`);
    } catch {
      toast.error("Gagal membuat periode");
    }
  };

  const handleUsePeriode = async () => {
    const id = selectedPeriodeId ?? activePeriode?.id;
    if (!id) return;
    try {
      await activatePeriode(id);
      toast.success("Periode aktif diubah");
    } catch {
      toast.error("Gagal mengaktifkan periode");
    }
  };

  const canBack = served.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-3 sticky top-0 z-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-5 h-5 text-primary" />
            <div>
              <h1 className="text-lg font-bold text-foreground">
                {mode === "control" ? "Control" : "Periode"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {mode === "control" ? "Kelola antrian realtime" : "Atur periode antrian"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search — selalu ada di kiri */}
            <div className="flex items-center gap-2 rounded-full border border-input bg-background px-3 py-2 shadow-sm h-9">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <Input
                placeholder="Cari antrian..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-none shadow-none focus:ring-0 h-auto py-0 text-sm w-[140px]"
              />
            </div>

            {/* Tengah: Terlewat (mode antrian) atau Tambah Periode (mode periode) */}
            {mode === "control" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPending(true)}
                className="relative"
              >
                <Clock className="w-4 h-4 mr-1" />
                Terlewat
                {pending.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] rounded-full w-5 h-5 flex items-center justify-center">
                    {pending.length}
                  </span>
                )}
              </Button>
            ) : (
              <Button size="sm" onClick={handleCreatePeriode}>
                <Plus className="w-4 h-4 mr-1" /> Tambah Periode
              </Button>
            )}

            {/* Kanan: toggle mode */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMode(mode === "control" ? "periode" : "control")}
            >
              {mode === "control" ? (
                <><CalendarDays className="w-4 h-4 mr-1" /> Periode</>
              ) : (
                <><Table2 className="w-4 h-4 mr-1" /> Antrian</>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-6xl mx-auto space-y-6">
        {/* ── CONTROL MODE ── */}
        {mode === "control" && (
          <>
            {/* Serving card segi panjang: No | Kode + 3 tombol */}
            <div className="rounded-2xl border bg-serving text-serving-foreground px-6 py-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shadow">
              <div>
                <p className="text-xs uppercase tracking-widest opacity-70 mb-1">Sedang Dilayani</p>
                {serving ? (
                  <div className="flex items-center gap-4">
                    <span className="text-5xl font-black">{serving.queue_number}</span>
                    <span className="text-3xl opacity-40">|</span>
                    <span className="text-3xl font-bold font-mono tracking-widest">{serving.referral_code}</span>
                  </div>
                ) : (
                  <p className="text-lg font-medium opacity-70">Belum ada antrian dilayani</p>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                {/* Back: kembali ke no sebelumnya */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBack}
                  disabled={!canBack}
                  className="bg-white/20 border-white/30 text-serving-foreground hover:bg-white/30"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                {/* Pending: masuk ke terlewat */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePending}
                  disabled={!serving}
                  className="bg-white/20 border-white/30 text-serving-foreground hover:bg-white/30"
                >
                  <Pause className="w-4 h-4 mr-1" /> Pending
                </Button>
                {/* Next: lanjut ke antrian berikutnya */}
                <Button
                  size="sm"
                  onClick={handleNext}
                  disabled={!serving && waiting.length === 0}
                  className="bg-white/20 border-white/30 text-serving-foreground hover:bg-white/30 border"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-input bg-card p-4">
                <p className="text-sm text-muted-foreground">Belum dilayani</p>
                <p className="mt-2 text-4xl font-black text-foreground">{waiting.length}</p>
              </div>
              <div className="rounded-3xl border border-input bg-card p-4">
                <p className="text-sm text-muted-foreground">Sudah dilayani</p>
                <p className="mt-2 text-4xl font-black text-success">{served.length}</p>
              </div>
              <div className="rounded-3xl border border-input bg-card p-4">
                <p className="text-sm text-muted-foreground">Periode aktif</p>
                <p className="mt-2 text-base font-semibold text-foreground truncate">
                  {activePeriode?.name ?? "—"}
                </p>
              </div>
            </div>

            <QueueTable waiting={filteredWaiting} served={filteredServed} onRowClick={setSelectedReg} />
          </>
        )}

        {/* ── PERIODE MODE ── */}
        {mode === "periode" && (
          <section className="rounded-3xl border bg-card p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Periode aktif</p>
                <p className="text-lg font-semibold text-foreground">{activePeriode?.name ?? "Tidak ada"}</p>
              </div>
            </div>

            <div className="overflow-x-auto pb-2">
              <div className="flex gap-3 min-w-[640px]">
                {periodes.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPeriodeId(p.id)}
                    className={`min-w-[220px] rounded-3xl border p-4 text-left transition ${
                      (selectedPeriodeId ?? activePeriode?.id) === p.id
                        ? "border-primary bg-primary/5"
                        : "border-muted/50 bg-background"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-foreground">{p.name}</p>
                      {p.is_active && (
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold uppercase text-primary">
                          Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Dibuat {new Date(p.created_at).toLocaleDateString("id-ID")}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Periode terpilih</p>
                <p className="font-semibold text-foreground">
                  {periodes.find((p) => p.id === (selectedPeriodeId ?? activePeriode?.id))?.name ?? "Pilih periode"}
                </p>
              </div>
              <Button
                onClick={handleUsePeriode}
                disabled={!selectedPeriodeId || selectedPeriodeId === activePeriode?.id}
              >
                {selectedPeriodeId === activePeriode?.id ? "Sudah Aktif" : "Gunakan Periode"}
              </Button>
            </div>
          </section>
        )}
      </div>

      {/* Dialog detail warga */}
      <Dialog open={!!selectedReg} onOpenChange={() => setSelectedReg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Warga</DialogTitle>
          </DialogHeader>
          {selectedReg && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Nama:</span>
                  <p className="font-medium">{selectedReg.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">No. KK:</span>
                  <p className="font-medium">{selectedReg.kk_number}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">RT/RW:</span>
                  <p className="font-medium">{selectedReg.rt_rw}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Kode:</span>
                  <p className="font-medium font-mono">{selectedReg.referral_code}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">No. Antrian:</span>
                  <p className="font-bold text-lg">{selectedReg.queue_number}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p className="font-medium capitalize">{selectedReg.status}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleClearReg(selectedReg)}
                  disabled={selectedReg.status === "served"}
                >
                  <CheckCircle className="w-4 h-4 mr-1" /> Clear
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDeleteReg(selectedReg)}>
                  <Trash2 className="w-4 h-4 mr-1" /> Hapus
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog terlewat (pending) */}
      <Dialog open={showPending} onOpenChange={setShowPending}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Antrian Terlewat ({pending.length})</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Tidak ada antrian terlewat</p>
            ) : (
              pending.map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                  <div>
                    <span className="font-bold">#{r.queue_number}</span>
                    <span className="text-muted-foreground ml-2 font-mono text-sm">{r.referral_code}</span>
                  </div>
                  <div className="flex gap-1">
                    {/* Accept: masuk ke table kanan (sudah dilayani) */}
                    <Button size="sm" variant="outline" onClick={() => handleAcceptPending(r)}>
                      <CheckCircle className="w-4 h-4 mr-1" /> Accept
                    </Button>
                    {/* Delete: hapus total dari kedua table */}
                    <Button size="sm" variant="destructive" onClick={() => handleDeletePending(r)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
