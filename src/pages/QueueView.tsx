import { useState } from "react";
import { useQueueData } from "@/hooks/useQueueData";
import { usePeriodeData } from "@/hooks/usePeriodeData";
import { QueueTable } from "@/components/QueueTable";
import { ServingCard } from "@/components/ServingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, AlertTriangle } from "lucide-react";

export default function QueueView() {
  const [code, setCode] = useState("");
  const [entered, setEntered] = useState(false);
  const [enteredCode, setEnteredCode] = useState("");
  const { activePeriode } = usePeriodeData();
  const { waiting, served, serving, registrations } = useQueueData(activePeriode?.id);

  const myReg = registrations.find((r) => r.referral_code === enteredCode);
  const isExpired = myReg?.status === "served";

  const handleEnter = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      setEnteredCode(code.trim().toUpperCase());
      setEntered(true);
    }
  };

  if (!entered) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="bg-primary/10 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
              <KeyRound className="w-7 h-7 text-primary" />
            </div>
            <CardTitle className="text-xl">Cek Antrian</CardTitle>
            <p className="text-sm text-muted-foreground">Masukkan kode referral Anda</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEnter} className="space-y-4">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Masukkan kode referral"
                className="text-center text-lg font-mono tracking-widest uppercase"
              />
              <Button type="submit" className="w-full">
                Lihat Antrian
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <AlertTriangle className="w-16 h-16 text-destructive mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Antrian Expired</h2>
            <p className="text-muted-foreground">Kode referral ini sudah digunakan dan tidak bisa diakses lagi.</p>
            <Button variant="outline" onClick={() => { setEntered(false); setCode(""); }}>
              Kembali
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 space-y-4 max-w-4xl mx-auto">
      {myReg && (
        <div className="bg-primary text-primary-foreground rounded-xl px-6 py-4 text-center">
          <p className="text-xs uppercase tracking-widest opacity-80 mb-1">Nomor Antrian Anda</p>
          <p className="text-5xl font-black">{myReg.queue_number}</p>
          <p className="text-sm opacity-80 mt-1 font-mono">{myReg.referral_code}</p>
        </div>
      )}

      {!myReg && (
        <div className="bg-destructive/10 text-destructive rounded-xl px-6 py-4 text-center">
          <p className="font-medium">Kode referral tidak ditemukan</p>
        </div>
      )}

      <ServingCard serving={serving} />
      <QueueTable waiting={waiting} served={served} />
    </div>
  );
}
