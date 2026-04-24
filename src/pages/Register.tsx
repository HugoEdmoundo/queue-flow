import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { periodeApi, registrationApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle, UserPlus, AlertTriangle, User, CreditCard, MapPin, Loader2, ArrowRight } from "lucide-react";
import type { Registration } from "@/lib/api";

// Store raw digits only, display with slash, send with colon "XXX:XXX"
function normalizeRtRw(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 6);
  if (digits.length === 6) {
    return `${digits.slice(0, 3)}:${digits.slice(3, 6)}`;
  }
  // pad to ensure exactly XXX:XXX
  const rt = digits.slice(0, 3).padStart(3, "0");
  const rw = digits.slice(3).padEnd(3, "0");
  return `${rt}:${rw}`;
}

function isValidRtRw(value: string): boolean {
  return value.replace(/\D/g, "").length === 6;
}

type FieldError = { name?: string; kk?: string; rtRw?: string };

export default function Register() {
  const [name, setName] = useState("");
  const [kkNumber, setKkNumber] = useState("");
  const [rtRw, setRtRw] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Registration | null>(null);
  const [duplicate, setDuplicate] = useState<Registration | null>(null);
  const [dupType, setDupType] = useState<"kk" | "name" | null>(null);
  const navigate = useNavigate();

  // Inline field errors (only shown after touch)
  const errors: FieldError = {};
  if (!name.trim()) errors.name = "Nama lengkap wajib diisi";
  if (kkNumber.length > 0 && kkNumber.length < 16) errors.kk = `Masih kurang ${16 - kkNumber.length} digit`;
  if (!kkNumber) errors.kk = "Nomor KK wajib diisi";
  if (rtRw && !isValidRtRw(rtRw)) errors.rtRw = "Harus 6 digit total (RT 3 digit + RW 3 digit)";
  if (!rtRw) errors.rtRw = "RT/RW wajib diisi";

  const touch = (field: string) => setTouched((p) => ({ ...p, [field]: true }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, kk: true, rtRw: true });
    setDuplicate(null);
    setDupType(null);

    if (Object.keys(errors).length > 0) return;

    const normalized = normalizeRtRw(rtRw);
    if (!/^\d{3}:\d{3}$/.test(normalized)) {
      toast.error("Format RT/RW tidak valid");
      return;
    }
    setSubmitting(true);
    try {
      const activePeriode = await periodeApi.getActive();
      if (!activePeriode) {
        toast.error("Tidak ada periode aktif. Hubungi admin.");
        return;
      }

      const existing = await registrationApi.getAll({ periodeId: activePeriode.id });
      const dupByKK = existing.find((r) => r.kk_number === kkNumber);
      const dupByName = existing.find((r) => r.name.toLowerCase() === name.trim().toLowerCase());
      const dup = dupByKK ?? dupByName;

      if (dup) {
        setDuplicate(dup);
        setDupType(dupByKK ? "kk" : "name");
        return;
      }

      const reg = await registrationApi.create({
        name: name.trim(),
        kk_number: kkNumber,
        rt_rw: normalized,
        periode_id: activePeriode.id,
      });

      setResult(reg);
      toast.success("Registrasi berhasil!");
    } catch (err: unknown) {
      toast.error("Gagal mendaftar: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Success card */}
          <Card className="border-0 shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-primary to-primary/80 px-6 pt-8 pb-6 text-center text-primary-foreground">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-9 h-9" />
              </div>
              <h2 className="text-2xl font-black">Registrasi Berhasil!</h2>
              <p className="text-primary-foreground/70 text-sm mt-1">Simpan informasi antrian Anda</p>
            </div>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-muted/50 p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Nomor Antrian</p>
                  <p className="text-5xl font-black text-primary leading-none">{result.queue_number}</p>
                </div>
                <div className="rounded-2xl bg-muted/50 p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Kode Referral</p>
                  <p className="text-2xl font-black font-mono text-foreground tracking-widest leading-none mt-1">{result.referral_code}</p>
                </div>
              </div>
              <div className="rounded-xl border border-muted bg-muted/20 px-4 py-3 text-sm text-muted-foreground text-center">
                Tunjukkan kode ini kepada petugas saat dipanggil
              </div>
              <Button onClick={() => navigate("/queue")} className="w-full gap-2" size="lg">
                Cek Status Antrian <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Form screen ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-primary to-primary/80 px-6 pt-8 pb-6 text-center text-primary-foreground">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
              <UserPlus className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold">Pendaftaran Antrian</h1>
            <p className="text-primary-foreground/70 text-sm mt-1">Isi data diri untuk mendapatkan nomor antrian</p>
          </div>

          <CardContent className="p-6 space-y-5">
            {/* Duplicate alert */}
            {duplicate && (
              <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 overflow-hidden">
                <div className="flex items-center gap-2 bg-destructive/10 px-4 py-2.5">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                  <p className="text-sm font-semibold text-destructive">
                    {dupType === "kk" ? "Nomor KK sudah terdaftar" : "Nama sudah terdaftar"}
                  </p>
                </div>
                <div className="px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Nama</span>
                    <span className="font-medium">{duplicate.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">No. KK</span>
                    <span className="font-mono text-xs">{duplicate.kk_number}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">No. Antrian</span>
                    <span className="font-black text-primary text-lg">#{duplicate.queue_number}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Kode</span>
                    <span className="font-mono font-bold tracking-widest">{duplicate.referral_code}</span>
                  </div>
                  <p className="text-xs text-muted-foreground pt-1 border-t border-border/50">
                    Pendaftaran ulang hanya bisa dilakukan di periode yang berbeda.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium">Nama Lengkap</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setDuplicate(null); }}
                    onBlur={() => touch("name")}
                    placeholder="Masukkan nama lengkap"
                    className={`pl-9 transition-colors ${touched.name && errors.name ? "border-destructive focus-visible:ring-destructive/30" : ""}`}
                  />
                </div>
                {touched.name && errors.name && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {errors.name}
                  </p>
                )}
              </div>

              {/* KK Number */}
              <div className="space-y-1.5">
                <Label htmlFor="kk" className="text-sm font-medium">Nomor Kartu Keluarga</Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="kk"
                    value={kkNumber}
                    onChange={(e) => { setKkNumber(e.target.value.replace(/\D/g, "").slice(0, 16)); setDuplicate(null); }}
                    onBlur={() => touch("kk")}
                    placeholder="16 digit nomor KK"
                    inputMode="numeric"
                    maxLength={16}
                    className={`pl-9 pr-16 font-mono tracking-wider transition-colors ${touched.kk && errors.kk ? "border-destructive focus-visible:ring-destructive/30" : kkNumber.length === 16 ? "border-green-500 focus-visible:ring-green-500/30" : ""}`}
                  />
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono tabular-nums ${kkNumber.length === 16 ? "text-green-600 font-bold" : "text-muted-foreground"}`}>
                    {kkNumber.length}/16
                  </span>
                </div>
                {touched.kk && errors.kk ? (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {errors.kk}
                  </p>
                ) : kkNumber.length === 16 ? (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Nomor KK valid
                  </p>
                ) : null}
              </div>

              {/* RT/RW */}
              <div className="space-y-1.5">
                <Label htmlFor="rtrw" className="text-sm font-medium">RT / RW</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="rtrw"
                    value={(() => {
                      const d = rtRw.replace(/\D/g, "");
                      if (d.length > 3) return `${d.slice(0, 3)}/${d.slice(3, 6)}`;
                      return d;
                    })()}
                    onChange={(e) => {
                      // Only keep digits, max 6
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setRtRw(digits);
                      setDuplicate(null);
                    }}
                    onBlur={() => touch("rtRw")}
                    placeholder="Contoh: 001/002"
                    inputMode="numeric"
                    className={`pl-9 transition-colors ${touched.rtRw && errors.rtRw ? "border-destructive focus-visible:ring-destructive/30" : isValidRtRw(rtRw) && rtRw ? "border-green-500 focus-visible:ring-green-500/30" : ""}`}
                  />                </div>
                {touched.rtRw && errors.rtRw ? (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {errors.rtRw}
                  </p>
                ) : isValidRtRw(rtRw) && rtRw ? (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Format RT/RW valid
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Format: 3 digit / 3 digit (contoh: 001/002)</p>
                )}
              </div>

              <Button type="submit" className="w-full gap-2" size="lg" disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Memeriksa data...</>
                ) : (
                  <><UserPlus className="w-4 h-4" /> Daftar Antrian</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
