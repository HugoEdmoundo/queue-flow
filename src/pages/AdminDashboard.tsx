import { useState } from "react";
import { useQueueData } from "@/hooks/useQueueData";
import { QueueTable } from "@/components/QueueTable";
import { ServingCard } from "@/components/ServingCard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Pause, Clock, Trash2, CheckCircle, LayoutDashboard } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Registration = Tables<"registrations">;

export default function AdminDashboard() {
  const { waiting, served, serving, pending, refetch } = useQueueData();
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [showPending, setShowPending] = useState(false);
  const [view, setView] = useState<"slide" | "table">("table");

  const handleNext = async () => {
    // Move current serving to served
    if (serving) {
      await supabase.from("registrations").update({ status: "served" }).eq("id", serving.id);
    }
    // Get next waiting
    if (waiting.length > 0) {
      const next = waiting[0];
      await supabase.from("registrations").update({ status: "serving" }).eq("id", next.id);
      await supabase
        .from("queue_settings")
        .update({ current_queue_number: next.queue_number, current_referral_code: next.referral_code })
        .neq("id", "00000000-0000-0000-0000-000000000000"); // update all rows
      toast.success(`Memanggil antrian #${next.queue_number}`);
    } else {
      await supabase
        .from("queue_settings")
        .update({ current_queue_number: 0, current_referral_code: "" })
        .neq("id", "00000000-0000-0000-0000-000000000000");
      toast.info("Semua antrian sudah selesai");
    }
  };

  const handlePending = async () => {
    if (!serving) return;
    await supabase.from("registrations").update({ status: "pending" }).eq("id", serving.id);
    toast("Antrian ditunda", { description: `#${serving.queue_number} dipindahkan ke pending` });
    // Auto next
    if (waiting.length > 0) {
      const next = waiting[0];
      await supabase.from("registrations").update({ status: "serving" }).eq("id", next.id);
      await supabase
        .from("queue_settings")
        .update({ current_queue_number: next.queue_number, current_referral_code: next.referral_code })
        .neq("id", "00000000-0000-0000-0000-000000000000");
    } else {
      await supabase
        .from("queue_settings")
        .update({ current_queue_number: 0, current_referral_code: "" })
        .neq("id", "00000000-0000-0000-0000-000000000000");
    }
  };

  const handleAcceptPending = async (reg: Registration) => {
    // Move pending to waiting (put at front)
    await supabase.from("registrations").update({ status: "waiting" }).eq("id", reg.id);
    toast.success(`#${reg.queue_number} dikembalikan ke antrian`);
  };

  const handleDeletePending = async (reg: Registration) => {
    await supabase.from("registrations").update({ status: "served" }).eq("id", reg.id);
    toast(`#${reg.queue_number} dipindahkan ke sudah dilayani`);
  };

  const handleDeleteReg = async (reg: Registration) => {
    await supabase.from("registrations").delete().eq("id", reg.id);
    setSelectedReg(null);
    toast.success("Data dihapus");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Admin Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showPending ? "default" : "outline"}
            size="sm"
            onClick={() => setShowPending(true)}
            className="relative"
          >
            <Clock className="w-4 h-4 mr-1" />
            Terlewat
            {pending.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {pending.length}
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView(view === "table" ? "slide" : "table")}
          >
            {view === "table" ? "Mode Slide" : "Mode Tabel"}
          </Button>
        </div>
      </header>

      <div className="p-4 max-w-5xl mx-auto space-y-4">
        {/* Serving Card */}
        <ServingCard serving={serving} />

        {view === "slide" ? (
          /* Slide View */
          <div className="flex flex-col items-center space-y-6 py-8">
            <div className="bg-card border rounded-2xl shadow-lg p-10 text-center min-w-[300px]">
              {serving ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground uppercase tracking-wide">Sedang Dilayani</p>
                  <p className="text-7xl font-black text-primary">{serving.queue_number}</p>
                  <p className="text-2xl font-mono text-muted-foreground">{serving.referral_code}</p>
                </div>
              ) : waiting.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground uppercase tracking-wide">Selanjutnya</p>
                  <p className="text-7xl font-black text-foreground">{waiting[0].queue_number}</p>
                  <p className="text-2xl font-mono text-muted-foreground">{waiting[0].referral_code}</p>
                </div>
              ) : (
                <p className="text-xl text-muted-foreground">Tidak ada antrian</p>
              )}
            </div>

            <div className="flex items-center gap-4">
              <Button size="lg" variant="outline" onClick={handlePending} disabled={!serving}>
                <Pause className="w-5 h-5 mr-2" />
                Pending
              </Button>
              <Button size="lg" onClick={handleNext} disabled={!serving && waiting.length === 0}>
                Next
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

            {waiting.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Sisa antrian: <span className="font-bold text-foreground">{waiting.length}</span>
              </p>
            )}
          </div>
        ) : (
          /* Table View */
          <>
            {/* Controls */}
            <div className="flex items-center gap-2 justify-center">
              <Button variant="outline" onClick={handlePending} disabled={!serving}>
                <Pause className="w-4 h-4 mr-1" /> Pending
              </Button>
              <Button onClick={handleNext} disabled={!serving && waiting.length === 0}>
                <ChevronRight className="w-4 h-4 mr-1" /> Next
              </Button>
            </div>
            <QueueTable waiting={waiting} served={served} onRowClick={setSelectedReg} />
          </>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedReg} onOpenChange={() => setSelectedReg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Warga</DialogTitle>
          </DialogHeader>
          {selectedReg && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Nama:</span><p className="font-medium">{selectedReg.name}</p></div>
                <div><span className="text-muted-foreground">No. KK:</span><p className="font-medium">{selectedReg.kk_number}</p></div>
                <div><span className="text-muted-foreground">RT/RW:</span><p className="font-medium">{selectedReg.rt_rw}</p></div>
                <div><span className="text-muted-foreground">Kode:</span><p className="font-medium font-mono">{selectedReg.referral_code}</p></div>
                <div><span className="text-muted-foreground">No. Antrian:</span><p className="font-bold text-lg">{selectedReg.queue_number}</p></div>
                <div><span className="text-muted-foreground">Status:</span><p className="font-medium capitalize">{selectedReg.status}</p></div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="destructive" size="sm" onClick={() => handleDeleteReg(selectedReg)}>
                  <Trash2 className="w-4 h-4 mr-1" /> Hapus
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pending Dialog */}
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
                    <Button size="sm" variant="outline" onClick={() => handleAcceptPending(r)}>
                      <CheckCircle className="w-4 h-4 mr-1" /> Kembalikan
                    </Button>
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
