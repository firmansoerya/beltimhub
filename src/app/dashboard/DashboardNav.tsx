"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  User, Settings, Ticket, Megaphone, Store, Briefcase,
  ArrowRightLeft, Home, ShoppingBag,
} from "lucide-react";

interface Props {
  isOrganizer: boolean;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

function NavLink({ href, label, icon: Icon }: NavItem) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);
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
      {label}
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

export function DashboardNav({ isOrganizer }: Props) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col">
      {/* Akun */}
      <SectionLabel label="Akun" />
      <NavLink href="/dashboard/profil" label="Profil" icon={User} />
      <NavLink href="/dashboard/pengaturan" label="Pengaturan" icon={Settings} />

      <div className="border-t border-white/15 my-3" />

      {/* Tiket */}
      <SectionLabel label="Tiket" />
      <NavLink href="/dashboard/tiket" label="Tiket Saya" icon={Ticket} />

      <div className="border-t border-white/15 my-3" />

      {/* Konten */}
      <SectionLabel label="Konten" />
      <NavLink href="/dashboard/iklan" label="Iklan" icon={Megaphone} />
      <NavLink href="/dashboard/umkm" label="UMKM" icon={Store} />
      <NavLink href="/dashboard/loker" label="Lowongan" icon={Briefcase} />
      <NavLink href="/dashboard/toko" label="Toko (Pasar Lokal)" icon={ShoppingBag} />

      <div className="flex-1" />

      <div className="border-t border-white/15 pt-3 flex flex-col gap-1">
        <Link
          href={isOrganizer ? "/dashboard/organizer" : "/dashboard/beralih-kreator"}
          className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md text-white font-medium hover:bg-white/10 transition-colors"
        >
          <ArrowRightLeft className="h-4 w-4 shrink-0" />
          {isOrganizer ? "Dashboard Kreator" : "Beralih ke Kreator"}
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
