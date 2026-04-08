import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle, UserPlus } from "lucide-react";

export default function Register() {
  const [name, setName] = useState("");
  const [kkNumber, setKkNumber] = useState("");
  const [rtRw, setRtRw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ code: string; number: number } | null>(null);
  const navigate = useNavigate();

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !kkNumber.trim() || !rtRw.trim()) {
      toast.error("Semua field harus diisi");
      return;
    }
    setSubmitting(true);

    try {
      // Get active periode
      const { data: activePeriode } = await supabase
        .from("periodes")
        .select("id")
        .eq("is_active", true)
        .maybeSingle();

      if (!activePeriode) {
        toast.error("Tidak ada periode aktif. Hubungi admin.");
        return;
      }

      // Get queue_settings for this periode
      const { data: settings } = await supabase
        .from("queue_settings")
        .select("*")
        .eq("periode_id", activePeriode.id)
        .maybeSingle();

      const nextNumber = settings?.next_queue_counter ?? 1;
      const code = generateCode();

      const { error } = await supabase.from("warga").insert({
        name: name.trim(),
        kk_number: kkNumber.trim(),
        rt_rw: rtRw.trim(),
        referral_code: code,
        queue_number: nextNumber,
        status: "waiting",
        periode_id: activePeriode.id,
      });

      if (error) throw error;

      if (settings) {
        await supabase
          .from("queue_settings")
          .update({ next_queue_counter: nextNumber + 1 })
          .eq("id", settings.id);
      }

      setResult({ code, number: nextNumber });
      toast.success("Registrasi berhasil!");
    } catch (err: any) {
      toast.error("Gagal mendaftar: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-6">
            <CheckCircle className="w-16 h-16 text-success mx-auto" />
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Registrasi Berhasil!</h2>
              <p className="text-muted-foreground">Simpan informasi berikut</p>
            </div>
            <div className="bg-primary/10 rounded-xl p-6 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Nomor Antrian</p>
                <p className="text-5xl font-black text-primary">{result.number}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Kode Referral</p>
                <p className="text-3xl font-bold font-mono text-primary tracking-widest">{result.code}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Gunakan kode ini saat tiba di lokasi pengambilan
            </p>
            <Button onClick={() => navigate("/queue")} className="w-full">
              Cek Antrian
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="bg-primary/10 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
            <UserPlus className="w-7 h-7 text-primary" />
          </div>
          <CardTitle className="text-xl">Pendaftaran Antrian</CardTitle>
          <p className="text-sm text-muted-foreground">Isi data diri untuk mendapatkan nomor antrian</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Masukkan nama lengkap" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kk">Nomor Kartu Keluarga</Label>
              <Input id="kk" value={kkNumber} onChange={(e) => setKkNumber(e.target.value.replace(/\D/g, ""))} placeholder="Masukkan nomor KK" inputMode="numeric" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rtrw">RT/RW</Label>
              <Input id="rtrw" value={rtRw} onChange={(e) => setRtRw(e.target.value.replace(/[^\d/]/g, ""))} placeholder="Contoh: 001/002" inputMode="numeric" />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Mendaftar..." : "Daftar Antrian"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
