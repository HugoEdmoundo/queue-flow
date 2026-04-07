import type { Tables } from "@/integrations/supabase/types";

type Registration = Tables<"warga">;

interface QueueTableProps {
  waiting: Registration[];
  served: Registration[];
  onRowClick?: (reg: Registration) => void;
}

export function QueueTable({ waiting, served, onRowClick }: QueueTableProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Left - Waiting */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
          Belum Dilayani
        </h3>
        <div className="bg-card rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">No</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Kode</th>
              </tr>
            </thead>
            <tbody>
              {waiting.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-3 py-4 text-center text-muted-foreground">
                    Tidak ada antrian
                  </td>
                </tr>
              ) : (
                waiting.map((r) => (
                  <tr
                    key={r.id}
                    className={`border-t hover:bg-muted/30 transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
                    onClick={() => onRowClick?.(r)}
                  >
                    <td className="px-3 py-2 font-mono font-bold">{r.queue_number}</td>
                    <td className="px-3 py-2 font-mono">{r.referral_code}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right - Served */}
      <div>
        <h3 className="text-sm font-semibold text-success mb-2 uppercase tracking-wide">
          Sudah Dilayani
        </h3>
        <div className="bg-card rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-success/10">
                <th className="text-left px-3 py-2 font-medium text-success">No</th>
                <th className="text-left px-3 py-2 font-medium text-success">Kode</th>
              </tr>
            </thead>
            <tbody>
              {served.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-3 py-4 text-center text-muted-foreground">
                    Belum ada
                  </td>
                </tr>
              ) : (
                [...served].reverse().map((r) => (
                  <tr
                    key={r.id}
                    className={`border-t hover:bg-success/5 transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
                    onClick={() => onRowClick?.(r)}
                  >
                    <td className="px-3 py-2 font-mono font-bold">{r.queue_number}</td>
                    <td className="px-3 py-2 font-mono">{r.referral_code}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
