import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Plus, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

type Period = { id: string; name: string; createdAt: string };

const STORAGE_PERIODS = "queuePeriods";
const STORAGE_ACTIVE_PERIOD = "activeQueuePeriod";

function loadPeriods(): Period[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(STORAGE_PERIODS);
    if (stored) return JSON.parse(stored) as Period[];
  } catch {
    return [];
  }
  return [{ id: "default", name: "Periode Default", createdAt: new Date().toISOString() }];
}

function loadActivePeriodId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_ACTIVE_PERIOD);
}

export default function Periode() {
  const navigate = useNavigate();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [activePeriodId, setActivePeriodId] = useState<string | null>(null);

  useEffect(() => {
    const currentPeriods = loadPeriods();
    setPeriods(currentPeriods);
    setSelectedPeriodId(currentPeriods[0]?.id ?? null);
    setActivePeriodId(loadActivePeriodId() || currentPeriods[0]?.id || null);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_PERIODS, JSON.stringify(periods));
  }, [periods]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activePeriodId) window.localStorage.setItem(STORAGE_ACTIVE_PERIOD, activePeriodId);
  }, [activePeriodId]);

  useEffect(() => {
    const updateFromStorage = () => {
      const currentPeriods = loadPeriods();
      setPeriods(currentPeriods);
      setActivePeriodId(loadActivePeriodId() || currentPeriods[0]?.id || null);
      setSelectedPeriodId((prev) => prev || currentPeriods[0]?.id || null);
    };
    window.addEventListener("storage", updateFromStorage);
    return () => window.removeEventListener("storage", updateFromStorage);
  }, []);

  const selectedPeriod = periods.find((item) => item.id === selectedPeriodId);
  const activePeriod = periods.find((item) => item.id === activePeriodId) ?? selectedPeriod;

  const handleCreatePeriod = () => {
    const name = window.prompt("Nama periode baru", `Periode ${periods.length + 1}`)?.trim();
    if (!name) return;
    const newPeriod: Period = {
      id: crypto.randomUUID?.() ?? `${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
    };
    setPeriods((prev) => [...prev, newPeriod]);
    setSelectedPeriodId(newPeriod.id);
    toast.success(`Periode "${name}" dibuat`);
  };

  const handleUsePeriod = () => {
    if (!selectedPeriodId) return;
    setActivePeriodId(selectedPeriodId);
    toast.success(`Periode aktif diubah ke ${selectedPeriod?.name ?? "periode baru"}`);
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
          <Button size="sm" onClick={handleCreatePeriod}>
            <Plus className="w-4 h-4 mr-1" /> Tambah Periode
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-6xl mx-auto space-y-6">
        <section className="rounded-3xl border bg-card p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Periode aktif</p>
              <p className="text-lg font-semibold text-foreground">{activePeriod?.name ?? "Periode Default"}</p>
            </div>
            <div className="text-sm text-muted-foreground">
              Pilih periode yang akan digunakan aplikasi untuk menampilkan antrian.
            </div>
          </div>

          <div className="mt-4 overflow-x-auto pb-2">
            <div className="flex gap-3 min-w-[640px]">
              {periods.map((period) => (
                <button
                  key={period.id}
                  type="button"
                  onClick={() => setSelectedPeriodId(period.id)}
                  className={`min-w-[220px] rounded-3xl border p-4 text-left transition ${
                    period.id === selectedPeriodId ? "border-primary bg-primary/5" : "border-muted/50 bg-background"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-foreground">{period.name}</p>
                    {period.id === activePeriodId ? (
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold uppercase text-primary">
                        Aktif
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">Dibuat {new Date(period.createdAt).toLocaleDateString("id-ID")}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Periode terpilih</p>
              <p className="font-semibold text-foreground">{selectedPeriod?.name ?? "Pilih periode"}</p>
            </div>
            <Button onClick={handleUsePeriod} disabled={!selectedPeriodId || selectedPeriodId === activePeriodId}>
              {selectedPeriodId === activePeriodId ? "Sudah Aktif" : "Gunakan Periode"}
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
