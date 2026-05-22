
## Tujuan

Pindahkan semua data layer dari REST API eksternal (`api-queue.hugoedm.fun`) ke **Supabase + Supabase Realtime (WebSocket)**, sambil **tetap mempertahankan konsep Periode** (mirror struktur API yang sekarang).

## Skema DB (migration)

Tambah 1 tabel baru `periodes`, dan tambahkan kolom `periode_id` ke 2 tabel existing supaya struktur sama persis dengan API lama.

```sql
-- 1) Tabel periodes
CREATE TABLE public.periodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Hanya 1 periode aktif (partial unique index)
CREATE UNIQUE INDEX periodes_only_one_active
  ON public.periodes ((is_active)) WHERE is_active = true;

-- 3) Kaitkan registrations + queue_settings ke periode
ALTER TABLE public.registrations
  ADD COLUMN periode_id uuid REFERENCES public.periodes(id) ON DELETE CASCADE;

ALTER TABLE public.queue_settings
  ADD COLUMN periode_id uuid REFERENCES public.periodes(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX queue_settings_one_per_periode
  ON public.queue_settings (periode_id);

-- 4) RLS public (no-auth, sesuai requirement)
ALTER TABLE public.periodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view periodes" ON public.periodes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert periodes" ON public.periodes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update periodes" ON public.periodes FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete periodes" ON public.periodes FOR DELETE USING (true);

-- 5) Trigger updated_at
CREATE TRIGGER set_periodes_updated_at BEFORE UPDATE ON public.periodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_registrations_updated_at BEFORE UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_queue_settings_updated_at BEFORE UPDATE ON public.queue_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) Realtime
ALTER TABLE public.periodes REPLICA IDENTITY FULL;
ALTER TABLE public.registrations REPLICA IDENTITY FULL;
ALTER TABLE public.queue_settings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.periodes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_settings;
```

> Catatan: ini melanggar batas "max 2 tabel" awal, tapi sesuai permintaan user sekarang.

## Refactor kode

### 1. Hapus API eksternal
- Hapus `src/lib/api.ts` (REST + WS custom).
- Hapus pemakaian `VITE_API_URL`.

### 2. `RealtimeContext` baru
- Fetch awal: `periodes`, `activePeriode`, `registrations(periode_id=active)`, `queue_settings(periode_id=active)`.
- Subscribe Supabase Realtime ke 3 tabel via 1 channel; setiap event → refetch.
- Expose API yang sama: `periodes`, `activePeriode`, `registrations`, `settings`, `loading`, `refetch`, `createPeriode`, `activatePeriode`.

### 3. Operasi antrian (pindah dari `queueApi` → client helpers di context)
- **createPeriode(name)**: insert `periodes`, lalu insert satu row `queue_settings { periode_id, current_queue_number:0, current_referral_code:'', next_queue_counter:1 }`.
- **activatePeriode(id)**: set semua `periodes.is_active=false`, lalu set yang dipilih `true` (partial unique index menjaga konsistensi).
- **register(name, kk, rt_rw)**: ambil & increment `next_queue_counter` di settings periode aktif, generate `referral_code` unik (retry kalau bentrok), insert ke `registrations`.
- **next**: serving lama → `served`; ambil waiting terkecil → `serving`; update `queue_settings.current_*`.
- **back**: serving → `waiting`; served terbaru → `serving`; update `queue_settings.current_*`.
- **pending**: serving → `pending`; jalankan `next`.
- **accept pending**: `pending` → `waiting` (masuk antrean lagi).
- **delete**: hapus row registrations.

### 4. Halaman & route
- Tetap semua route: `/`, `/register`, `/queue`, `/control`, `/display`, dan halaman Periode di dalam `/control` (mode periode) sesuai versi sekarang.
- UI tidak diubah — hanya panggilan API → ganti ke helper context.

### 5. File yang disentuh
- Hapus: `src/lib/api.ts`
- Tulis ulang: `src/context/RealtimeContext.tsx`
- Edit ringan: `src/pages/Register.tsx`, `src/pages/AdminDashboard.tsx`, `src/pages/QueueView.tsx`, `src/pages/Display.tsx`, `src/pages/Periode.tsx` (ganti import dari `@/lib/api` ke context helpers, sesuaikan tipe `Registration`/`Periode` lokal).
- `src/hooks/useQueueData.ts` & `usePeriodeData.ts` tetap re-export dari context.
- `supabase/migrations/...` baru untuk skema di atas.
- `src/integrations/supabase/types.ts` akan auto-regenerate setelah migration.

## Catatan
- RLS public (tanpa auth) sesuai requirement awal.
- Tetap pakai 3 tabel total: `periodes`, `registrations`, `queue_settings` (mirror API lama).
- Polling 4 detik dihapus — cukup Supabase Realtime.

Oke lanjut implement?
