import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CalendarDays, LayoutDashboard, Package, User, BadgeCheck } from "lucide-react"; // LayoutDashboard masih dipakai di tombol Kembali ke Beranda
import { DashboardSignOut } from "./SignOutButton";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: {
      role: true,
      isVerified: true,
      verificationRequest: { select: { status: true } },
    },
  });

  // Admin & Moderator punya panel terpisah
  if (dbUser?.role === "ADMIN" || dbUser?.role === "MODERATOR") {
    redirect("/admin");
  }

  const verificationStatus = dbUser?.verificationRequest?.status;
  const showVerifyLink = !dbUser?.isVerified && verificationStatus !== "PENDING";

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r bg-background hidden md:flex flex-col">
        <div className="h-14 flex items-center px-4 border-b">
          <Link href="/" className="font-bold text-lg">
            Beltim<span className="text-primary">Hub</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <User className="h-4 w-4" />
            Halaman Saya
          </Link>

          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 pt-3 pb-0.5">Organizer</p>
          <Link
            href="/dashboard/organizer"
            className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <CalendarDays className="h-4 w-4" />
            Event Saya
          </Link>

          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 pt-3 pb-0.5">Konten</p>
          {showVerifyLink && (
            <Link
              href="/dashboard/verifikasi"
              className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <BadgeCheck className="h-4 w-4" />
              Ajukan Verifikasi
            </Link>
          )}
          <Link
            href="/dashboard/saya"
            className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Package className="h-4 w-4" />
            Iklan, UMKM & Loker
          </Link>
        </nav>
        <div className="p-3 border-t flex flex-col gap-1">
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <LayoutDashboard className="h-4 w-4 rotate-180" />
            Kembali ke Beranda
          </Link>
          <DashboardSignOut />
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="md:hidden h-14 flex items-center px-4 border-b bg-background gap-3">
          <Link href="/" className="font-bold text-lg">
            Beltim<span className="text-primary">Hub</span>
          </Link>
          <span className="text-muted-foreground text-sm">/ Dashboard</span>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
