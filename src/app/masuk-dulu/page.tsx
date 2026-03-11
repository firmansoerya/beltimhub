import Link from "next/link";
import { LogIn, UserPlus, CalendarPlus, ShoppingBag, Briefcase, Store, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const ROUTE_INFO: Record<string, { label: string; icon: React.ElementType; desc: string }> = {
  "/event/buat": {
    label: "Buat Event",
    icon: CalendarPlus,
    desc: "Buat dan kelola event kamu — dari event komunitas gratis sampai event berbayar dengan sistem tiket otomatis.",
  },
  "/fjb": {
    label: "Pasang Iklan",
    icon: ShoppingBag,
    desc: "Pasang iklan jual beli barang, kendaraan, properti, dan lainnya — gratis dan mudah.",
  },
  "/fjb/buat": {
    label: "Pasang Iklan",
    icon: ShoppingBag,
    desc: "Pasang iklan jual beli barang, kendaraan, properti, dan lainnya — gratis dan mudah.",
  },
  "/loker/buat": {
    label: "Posting Lowongan Kerja",
    icon: Briefcase,
    desc: "Posting lowongan kerja untuk perusahaan atau usahamu, dan temukan kandidat terbaik di Belitung Timur.",
  },
  "/umkm/daftar": {
    label: "Daftarkan UMKM",
    icon: Store,
    desc: "Daftarkan usaha kamu ke direktori UMKM Beltim agar lebih mudah ditemukan oleh calon pelanggan.",
  },
};

const DEFAULT_INFO = {
  label: "Fitur ini",
  icon: LogIn,
  desc: "Fitur ini hanya tersedia untuk pengguna yang sudah masuk. Masuk atau buat akun untuk melanjutkan.",
};

export default async function MasukDuluPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from = "/" } = await searchParams;
  const info = ROUTE_INFO[from] ?? DEFAULT_INFO;
  const Icon = info.icon;

  const signInUrl = `/sign-in?redirect_url=${encodeURIComponent(from)}`;
  const signUpUrl = `/sign-up?redirect_url=${encodeURIComponent(from)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop blur */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-sm mx-4 bg-background border rounded-2xl shadow-2xl overflow-hidden">
        {/* Top accent */}
        <div className="h-1.5 bg-gradient-to-r from-primary to-purple-500" />

        <div className="p-6">
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Icon className="h-6 w-6 text-primary" />
          </div>

          <h1 className="text-lg font-bold mb-1">
            Masuk untuk {info.label}
          </h1>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            {info.desc}
          </p>

          <div className="space-y-2.5">
            <Link href={signInUrl} className="block">
              <Button className="w-full gap-2">
                <LogIn className="h-4 w-4" />
                Masuk ke Akun
              </Button>
            </Link>
            <Link href={signUpUrl} className="block">
              <Button variant="outline" className="w-full gap-2">
                <UserPlus className="h-4 w-4" />
                Buat Akun Baru
              </Button>
            </Link>
          </div>

          <div className="mt-4 pt-4 border-t">
            <Link
              href={from.startsWith("/event") ? "/event" : from.startsWith("/fjb") ? "/fjb" : "/"}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors justify-center"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Kembali
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
