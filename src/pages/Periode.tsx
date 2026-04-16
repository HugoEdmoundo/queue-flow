import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePeriodeData } from "@/hooks/usePeriodeData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LayoutDashboard, Plus, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

export default function Periode() {
  const navigate = useNavigate();
  const { periodes, activePeriode, createPeriode, activatePeriode } = usePeriodeData();
  const [selectedPeriodeId, setSelectedPeriodeId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");

  const selectedId = selectedPeriodeId ?? activePeriode?.id ?? null;

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createPeriode(newName.trim());
      toast.success(`Periode "${newName.trim()}" dibuat`);
      setNewName("");
      setShowAdd(false);
    } catch {
      toast.error("Gagal membuat periode");
    }
  };

  const handleActivate = async () => {
    if (!selectedId) return;
    try {
      await activatePeriode(selectedId);
      toast.success("Periode aktif diubah");
    } catch {
      toast.error("Gagal mengaktifkan periode");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-3 sticky top-0 z-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
            <LayoutDashboard className="w-5 h-5 text-primary" />
            <div>
              <h1 className="text-lg font-bold text-foreground">Periode</h1>
              <p className="text-sm text-muted-foreground">Atur periode antrian</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setNewName(`Periode ${periodes.length + 1}`);
              setShowAdd(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" /> Tambah Periode
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-6xl mx-auto space-y-6">
        <section className="rounded-3xl border bg-card p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Periode aktif</p>
              <p className="text-lg font-semibold text-foreground">{activePeriode?.name ?? "Tidak ada"}</p>
            </div>
            <div className="text-sm text-muted-foreground">
              Pilih periode yang akan digunakan aplikasi untuk menampilkan antrian.
            </div>
          </div>

          <div className="mt-4 overflow-x-auto pb-2">
            <div className="flex gap-3 min-w-[640px]">
              {periodes.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPeriodeId(p.id)}
                  className={`min-w-[220px] rounded-3xl border p-4 text-left transition ${
                    selectedId === p.id
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
                {periodes.find((p) => p.id === selectedId)?.name ?? "Pilih periode"}
              </p>
            </div>
            <Button
              onClick={handleActivate}
              disabled={!selectedId || selectedId === activePeriode?.id}
            >
              {selectedId === activePeriode?.id ? "Sudah Aktif" : "Gunakan Periode"}
            </Button>
          </div>
        </section>
      </main>

      <Dialog open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (!o) setNewName(""); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tambah Periode</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nama periode"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>Batal</Button>
              <Button size="sm" onClick={handleCreate} disabled={!newName.trim()}>Buat</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
