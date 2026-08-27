"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  User, Settings, Ticket, Megaphone, Store, Briefcase,
  ArrowRightLeft, Home, ShoppingBag, MapPin, LayoutDashboard,
} from "lucide-react";

interface Props {
  isOrganizer: boolean;
  hasIklan: boolean;
  hasUmkm: boolean;
  hasLoker: boolean;
  hasToko: boolean;
  badgeBuyer?: number;
  badgeSeller?: number;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  exact?: boolean;
}

function NavLink({ href, label, icon: Icon, badge, exact }: NavItem) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-colors",
        isActive
          ? "bg-white/20 text-white font-medium"
          : "text-white/70 hover:text-white hover:bg-white/10"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {!!badge && badge > 0 && (
        <span className="bg-white text-primary text-[11px] font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1.5 shadow-sm">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40 px-3 pt-4 pb-1">
      {label}
    </p>
  );
}

export function DashboardNav({ isOrganizer, hasIklan, hasUmkm, hasLoker, hasToko, badgeBuyer, badgeSeller }: Props) {
  const hasAnyKonten = hasIklan || hasUmkm || hasLoker || hasToko;

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col">
      <NavLink href="/dashboard" label="Dashboard" icon={LayoutDashboard} exact />

      <div className="border-t border-white/15 my-3" />

      {/* Akun */}
      <SectionLabel label="Akun" />
      <NavLink href="/dashboard/profil" label="Profil" icon={User} />
      <NavLink href="/dashboard/pengaturan" label="Pengaturan" icon={Settings} />

      <div className="border-t border-white/15 my-3" />

      {/* Aktivitas */}
      <SectionLabel label="Aktivitas" />
      <NavLink href="/dashboard/pesan" label="Pembelian Saya" icon={ShoppingBag} badge={badgeBuyer} />
      <NavLink href="/dashboard/alamat" label="Alamat" icon={MapPin} />

      <div className="border-t border-white/15 my-3" />

      {/* Tiket */}
      <SectionLabel label="Tiket" />
      <NavLink href="/dashboard/tiket" label="Tiket Saya" icon={Ticket} />

      <div className="border-t border-white/15 my-3" />

      {/* Jualan & Konten */}
      <SectionLabel label="Jualan & Konten" />
      {hasToko ? (
        <NavLink href="/dashboard/toko" label="Toko Saya" icon={ShoppingBag} badge={badgeSeller} />
      ) : hasUmkm ? (
        <NavLink href="/dashboard/umkm" label="UMKM Saya" icon={Store} />
      ) : (
        <NavLink href="/umkm/tambah" label="Daftarkan UMKM" icon={Store} />
      )}
      {hasIklan && <NavLink href="/dashboard/iklan" label="Iklan" icon={Megaphone} />}
      {hasLoker && <NavLink href="/dashboard/loker" label="Lowongan" icon={Briefcase} />}

      <div className="flex-1" />

      <div className="border-t border-white/15 pt-3 flex flex-col gap-1">
        <Link
          href={isOrganizer ? "/dashboard/organizer" : "/dashboard/beralih-kreator"}
          className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md text-white font-medium hover:bg-white/10 transition-colors"
        >
          <ArrowRightLeft className="h-4 w-4 shrink-0" />
          {isOrganizer ? "Dashboard Organizer" : "Jadi Organizer"}
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Home className="h-4 w-4 shrink-0" />
          Kembali ke Beranda
        </Link>
      </div>
    </nav>
  );
}
