import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  LayoutDashboard,
  Users,
  BadgeCheck,
  ShieldCheck,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { AdminSignOut } from "./AdminSignOut";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { role: true, fullName: true },
  });

  const isAdmin = dbUser?.role === "ADMIN";
  const isModerator = dbUser?.role === "MODERATOR";

  if (!isAdmin && !isModerator) redirect("/dashboard");

  const navItems = [
    {
      label: "Overview",
      href: "/admin",
      icon: LayoutDashboard,
      show: true,
    },
    {
      label: "Verifikasi User",
      href: "/admin/verifikasi",
      icon: BadgeCheck,
      show: true,
    },
    {
      label: "Manajemen User",
      href: "/admin/users",
      icon: Users,
      show: true,
    },
    {
      label: "Manajemen Admin",
      href: "/admin/admins",
      icon: ShieldCheck,
      show: isAdmin, // hanya ADMIN, bukan MODERATOR
    },
  ].filter((item) => item.show);

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r bg-background hidden md:flex flex-col">
        <div className="h-14 flex items-center px-4 border-b gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span className="font-bold text-lg">Panel Admin</span>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-1">
          {navItems.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t space-y-1">
          <div className="px-3 py-2 text-xs text-muted-foreground">
            {dbUser?.fullName}
            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium uppercase">
              {dbUser?.role}
            </span>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            Ke Beranda
          </Link>
          <AdminSignOut />
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="md:hidden h-14 flex items-center px-4 border-b bg-background gap-3">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span className="font-bold">Panel Admin</span>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
