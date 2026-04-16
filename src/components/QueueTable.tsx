import type { Registration } from "@/lib/api";

interface QueueTableProps {
  waiting: Registration[];
  served: Registration[];
  onRowClick?: (reg: Registration) => void;
  limit?: number;
}

export function QueueTable({ waiting, served, onRowClick, limit = 10 }: QueueTableProps) {
  const visibleWaiting = waiting.slice(0, limit);
  const visibleServed = [...served].reverse().slice(0, limit);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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
              {visibleWaiting.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-3 py-4 text-center text-muted-foreground">
                    Tidak ada antrian
                  </td>
                </tr>
              ) : (
                visibleWaiting.map((r) => (
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
              {visibleServed.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-3 py-4 text-center text-muted-foreground">
                    Belum ada
                  </td>
                </tr>
              ) : (
                visibleServed.map((r) => (
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
