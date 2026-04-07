import { useQueueData } from "@/hooks/useQueueData";
import { QueueTable } from "@/components/QueueTable";
import { ServingCard } from "@/components/ServingCard";
import { Monitor } from "lucide-react";

export default function Display() {
  const { waiting, served, serving } = useQueueData();

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <Monitor className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Sistem Antrian</h1>
      </div>

      {/* Serving */}
      <div className="mb-6">
        <ServingCard serving={serving} />
      </div>

      {/* Tables */}
      <div className="flex-1">
        <QueueTable waiting={waiting} served={served} />
      </div>
    </div>
  );
}
