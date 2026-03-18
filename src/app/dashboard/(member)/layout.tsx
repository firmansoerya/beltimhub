import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DashboardNav } from "../DashboardNav";
import { DashboardSignOut } from "../SignOutButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { role: true },
  });

  if (dbUser?.role === "ADMIN" || dbUser?.role === "MODERATOR") {
    redirect("/admin");
  }

  const isOrganizer = dbUser?.role === "ORGANIZER";

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-primary hidden md:flex flex-col h-full">
        <div className="h-14 flex items-center px-4 shrink-0">
          <Link href="/" className="font-bold text-lg text-white">
            BeltimHub
          </Link>
        </div>

        <DashboardNav isOrganizer={isOrganizer} />

        <div className="px-3 pb-3 shrink-0">
          <DashboardSignOut />
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="md:hidden h-14 flex items-center px-4 border-b bg-background gap-3 shrink-0">
          <Link href="/" className="font-bold text-lg">
            Beltim<span className="text-primary">Hub</span>
          </Link>
          <span className="text-muted-foreground text-sm">/ Dashboard</span>
        </header>
        <main className="flex-1 overflow-y-auto px-6 md:px-8 pb-6 md:pb-8">{children}</main>
      </div>
    </div>
  );
}
