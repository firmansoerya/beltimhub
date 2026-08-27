import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ShieldCheck, ChevronRight } from "lucide-react";
import { AdminSignOut } from "./AdminSignOut";
import { AdminSidebarNav } from "./AdminSidebarNav";

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

  const pendingWithdrawals = isAdmin
    ? await prisma.sellerWithdrawal.count({ where: { status: "PENDING" } }).catch(() => 0)
    : 0;

  const pendingVerifications = await prisma.verificationRequest
    .count({ where: { status: "PENDING" } })
    .catch(() => 0);

  const pendingMarketplace = await prisma.umkm
    .count({ where: { marketplaceStatus: "PENDING_REVIEW" } })
    .catch(() => 0);

  const navItems = [
    {
      label: "Overview",
      href: "/admin",
      icon: "LayoutDashboard",
      badge: 0,
    },
    {
      label: "Pengguna",
      href: "/admin/users",
      icon: "Users",
      badge: pendingVerifications,
      children: [
        {
          label: "Verifikasi Pengguna",
          href: "/admin/users?tab=PENDING",
          badge: pendingVerifications,
        },
        {
          label: "Daftar User",
          href: "/admin/users?tab=users",
        },
        ...(isAdmin
          ? [
              {
                label: "Manajemen Admin",
                href: "/admin/admins",
              },
            ]
          : []),
      ],
    },
    {
      label: "Pasar Lokal",
      href: "/admin/marketplace",
      icon: "ShoppingBag",
      badge: pendingMarketplace,
      children: [
        {
          label: "Verifikasi Toko",
          href: "/admin/marketplace?tab=PENDING_REVIEW",
          badge: pendingMarketplace,
        },
        {
          label: "Biaya & Komisi",
          href: "/admin/marketplace?tab=fees",
        },
      ],
    },
    ...(isAdmin
      ? [
          {
            label: "Keuangan",
            href: "/admin/withdrawals",
            icon: "Wallet",
            badge: pendingWithdrawals,
            children: [
              {
                label: "Ringkasan",
                href: "/admin/withdrawals?tab=ringkasan",
              },
              {
                label: "Transaksi",
                href: "/admin/withdrawals?tab=transaksi",
              },
              {
                label: "Pencairan Dana",
                href: "/admin/withdrawals?tab=pencairan",
                badge: pendingWithdrawals,
              },
              {
                label: "Kalkulator Pendapatan",
                href: "/admin/kalkulator",
              },
            ],
          },
          {
            label: "Berita",
            href: "/admin/berita",
            icon: "Newspaper",
            badge: 0,
            children: [
              { label: "Sumber Berita", href: "/admin/berita?tab=sources" },
              { label: "Artikel", href: "/admin/berita?tab=articles" },
            ],
          },
          {
            label: "Pengaturan Situs",
            href: "/admin/site-settings",
            icon: "Settings2",
            badge: 0,
            children: [
              { label: "Modul & Fitur", href: "/admin/site-settings?tab=features" },
              { label: "Brand & Kontak", href: "/admin/site-settings?tab=brand" },
              { label: "Media Sosial", href: "/admin/site-settings?tab=sosmed" },
              { label: "Halaman Tentang", href: "/admin/site-settings?tab=tentang" },
              { label: "Syarat & Ketentuan", href: "/admin/site-settings?tab=syarat" },
              { label: "Kebijakan Privasi", href: "/admin/site-settings?tab=privasi" },
              { label: "Kebijakan Refund", href: "/admin/site-settings?tab=refund" },
            ],
          },
        ]
      : []),
  ];


  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Desktop Sidebar */}
      <aside className="w-56 shrink-0 border-r bg-background hidden md:flex flex-col fixed top-0 left-0 h-screen z-30">
        <div className="h-14 flex items-center px-4 border-b gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span className="font-bold text-lg">Panel Admin</span>
        </div>

        <AdminSidebarNav navItems={navItems} />

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
      <div className="flex-1 flex flex-col min-w-0 md:ml-56 h-screen overflow-y-auto">
        {/* Mobile topbar with hamburger */}
        <header className="md:hidden h-14 flex items-center px-4 border-b bg-background gap-3 sticky top-0 z-20">
          <AdminSidebarNav navItems={navItems} mobile userName={dbUser?.fullName} userRole={dbUser?.role} />
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span className="font-bold">Panel Admin</span>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
