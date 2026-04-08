import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, KeyRound, LayoutDashboard, Monitor } from "lucide-react";

export default function Index() {
  const links = [
    { to: "/register", icon: UserPlus, title: "Daftar Antrian", desc: "Isi data dan dapatkan nomor antrian", color: "bg-primary/10 text-primary" },
    { to: "/queue", icon: KeyRound, title: "Cek Antrian", desc: "Lihat status antrian Anda", color: "bg-accent/10 text-accent" },
    { to: "/control", icon: LayoutDashboard, title: "Control", desc: "Kelola antrian & periode", color: "bg-serving/10 text-serving" },
    { to: "/display", icon: Monitor, title: "Display TV", desc: "Tampilan untuk layar publik", color: "bg-success/10 text-success" },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6 text-center">
        <div>
          <h1 className="text-3xl font-black text-foreground">Sistem Antrian</h1>
          <p className="text-muted-foreground mt-1">Pilih menu untuk melanjutkan</p>
        </div>
        <div className="grid gap-3">
          {links.map((l) => (
            <Link key={l.to} to={l.to}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${l.color}`}>
                    <l.icon className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground">{l.title}</p>
                    <p className="text-sm text-muted-foreground">{l.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
