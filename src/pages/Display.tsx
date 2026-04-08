import { useQueueData } from "@/hooks/useQueueData";
import { usePeriodeData } from "@/hooks/usePeriodeData";
import { QueueTable } from "@/components/QueueTable";
import { ServingCard } from "@/components/ServingCard";
import { Monitor } from "lucide-react";

export default function Display() {
  const { activePeriode } = usePeriodeData();
  const { waiting, served, serving } = useQueueData(activePeriode?.id);

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col">
      <div className="flex flex-col items-center justify-center gap-2 mb-6">
        <div className="flex items-center gap-3">
          <Monitor className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Sistem Antrian</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Periode aktif: {activePeriode?.name ?? "Tidak ada periode aktif"}
        </p>
      </div>

      <div className="mb-6">
        <ServingCard serving={serving} />
      </div>

      <div className="flex-1">
        <QueueTable waiting={waiting} served={served} />
      </div>
    </div>
  );
}
