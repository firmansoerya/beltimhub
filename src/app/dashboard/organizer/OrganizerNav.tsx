"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, CalendarDays, User, Settings, ArrowRightLeft, FileText, Landmark, Users,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  disabled?: boolean;
}

function NavLink({ href, label, icon: Icon, exact, disabled }: NavItem) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  if (disabled) {
    return (
      <span className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md text-white/25 cursor-not-allowed select-none">
        <Icon className="h-4 w-4 shrink-0" />
        {label}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-colors",
        isActive
          ? "bg-white/15 text-white font-medium"
          : "text-white/60 hover:text-white hover:bg-white/10"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 px-3 pt-4 pb-1">
      {label}
    </p>
  );
}

export function OrganizerNav({ tosAccepted }: { tosAccepted: boolean }) {
  const locked = !tosAccepted;

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col">
      <NavLink href="/dashboard/organizer" label="Dashboard" icon={LayoutDashboard} exact disabled={locked} />
      <NavLink href="/dashboard/organizer/events" label="Event Saya" icon={CalendarDays} disabled={locked} />

      <div className="border-t border-white/10 my-3" />

      <SectionLabel label="Akun" />
      <NavLink href="/dashboard/organizer/profil" label="Informasi Dasar" icon={User} disabled={locked} />
      <NavLink href="/dashboard/organizer/pengaturan" label="Pengaturan" icon={Settings} disabled={locked} />
      <NavLink href="/dashboard/organizer/legal" label="Informasi Legal" icon={FileText} disabled={locked} />
      <NavLink href="/dashboard/organizer/rekening" label="Rekening" icon={Landmark} disabled={locked} />
      <NavLink href="/dashboard/organizer/kelola-akses" label="Kelola Akses" icon={Users} disabled={locked} />

      <div className="flex-1" />

      <div className="border-t border-white/10 pt-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ArrowRightLeft className="h-4 w-4 shrink-0" />
          Beralih ke Pembeli
        </Link>
      </div>
    </nav>
  );
}
