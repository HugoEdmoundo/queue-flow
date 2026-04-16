import type { Registration } from "@/lib/api";

interface ServingCardProps {
  serving: Registration | undefined;
}

export function ServingCard({ serving }: ServingCardProps) {
  return (
    <div className="bg-serving text-serving-foreground rounded-xl px-6 py-4 text-center shadow-lg">
      {serving ? (
        <div>
          <p className="text-xs uppercase tracking-widest opacity-80 mb-1">Sedang Dilayani</p>
          <div className="flex items-center justify-center gap-4">
            <span className="text-4xl font-black">{serving.queue_number}</span>
            <span className="text-2xl opacity-70">|</span>
            <span className="text-2xl font-bold font-mono">{serving.referral_code}</span>
          </div>
        </div>
      ) : (
        <p className="text-lg font-medium opacity-80">Belum ada antrian yang dilayani</p>
      )}
    </div>
  );
}
