import Link from "next/link";
import { Plus } from "lucide-react";

type PageKey = "berita" | "fjb" | "event" | "wisata" | "umkm" | "loker" | "info";

const PAGE_CONFIG: Record<PageKey, {
  title: string;
  subtitle: string;
  gradient: string;
  action?: { label: string; href: string };
}> = {
  event: {
    title: "Jelajahi Event",
    subtitle: "Event sport, festival, dan komunitas di Belitung Timur",
    gradient: "from-purple-700 via-purple-600 to-indigo-600",
    action: { label: "Buat Event", href: "/event/buat" },
  },
  fjb: {
    title: "FJB Beltim",
    subtitle: "Forum Jual Beli khusus warga Belitung Timur",
    gradient: "from-orange-600 via-orange-500 to-amber-500",
    action: { label: "Pasang Iklan", href: "/fjb/buat" },
  },
  loker: {
    title: "Lowongan Kerja",
    subtitle: "Peluang kerja untuk warga Belitung Timur",
    gradient: "from-blue-700 via-blue-600 to-sky-600",
    action: { label: "Pasang Lowongan", href: "/loker/buat" },
  },
  umkm: {
    title: "UMKM Beltim",
    subtitle: "Direktori usaha mikro kecil dan menengah lokal",
    gradient: "from-teal-700 via-teal-600 to-emerald-600",
    action: { label: "Daftarkan UMKM", href: "/umkm/tambah" },
  },
  wisata: {
    title: "Wisata Beltim",
    subtitle: "Destinasi wisata unggulan di Kabupaten Belitung Timur",
    gradient: "from-cyan-700 via-cyan-600 to-teal-500",
  },
  berita: {
    title: "Beltim Today",
    subtitle: "Berita terkini seputar Kabupaten Belitung Timur",
    gradient: "from-rose-700 via-rose-600 to-pink-600",
  },
  info: {
    title: "Info Layanan Publik",
    subtitle: "Nomor penting dan layanan publik Kabupaten Belitung Timur",
    gradient: "from-slate-700 via-slate-600 to-gray-600",
  },
};

interface PageHeaderProps {
  page: PageKey;
}

export function PageHeader({ page }: PageHeaderProps) {
  const config = PAGE_CONFIG[page];

  return (
    <div className={`bg-gradient-to-r ${config.gradient} text-white`}>
      <div className="container mx-auto max-w-6xl px-4 py-8 md:py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">{config.title}</h1>
            <p className="text-white/80 text-sm md:text-base max-w-lg">{config.subtitle}</p>
          </div>
          {config.action && (
            <Link
              href={config.action.href}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-medium transition-colors backdrop-blur-sm"
            >
              <Plus className="w-4 h-4" />
              {config.action.label}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
