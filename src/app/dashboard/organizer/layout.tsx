import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { OrganizerNav } from "./OrganizerNav";
import { DashboardSignOut } from "../SignOutButton";

export default async function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await getOrCreateUser(userId);
  if (!user) redirect("/sign-in");
  if (user.role !== "ORGANIZER" && user.role !== "ADMIN") redirect("/dashboard/beralih-kreator");

  const initials = user.fullName
    .split(" ")
    .map(n => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-[#1a2744] hidden md:flex flex-col h-full">
        {/* Logo */}
        <div className="h-14 flex items-center px-4 shrink-0">
          <Link href="/" className="font-bold text-lg text-white">
            BeltimHub
          </Link>
        </div>

        {/* User info */}
        <div className="px-3 py-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt={user.fullName} className="h-full w-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user.fullName}</p>
              <p className="text-white/50 text-[10px] truncate">{user.role === "ADMIN" ? "Admin" : "Kreator"}</p>
            </div>
          </div>
        </div>

        <OrganizerNav tosAccepted={!!user.organizerTosAcceptedAt} />

        <div className="px-3 pb-3 border-t border-white/10 shrink-0">
          <DashboardSignOut />
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden h-14 flex items-center px-4 border-b bg-background gap-3 shrink-0">
          <Link href="/" className="font-bold text-lg">
            Beltim<span className="text-primary">Hub</span>
          </Link>
          <span className="text-muted-foreground text-sm">/ Kreator</span>
        </header>
        <main className="flex-1 overflow-y-auto px-6 md:px-8 pb-6 md:pb-8">{children}</main>
      </div>
    </div>
  );
}
