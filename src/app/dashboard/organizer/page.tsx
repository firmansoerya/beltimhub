import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Calendar, Users, CheckSquare, TrendingUp, Plus, ChevronRight } from "lucide-react";

export default async function OrganizerDashboard() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  let user;
  try {
    user = await prisma.user.findUnique({ where: { clerkId: userId } });

    // Auto-create user jika belum ada di DB
    if (!user) {
      const clerkUser = await currentUser();
      if (clerkUser) {
        const firstName = clerkUser.firstName ?? "";
        const lastName = clerkUser.lastName ?? "";
        const fullName = clerkUser.fullName || `${firstName} ${lastName}`.trim() || "User";
        user = await prisma.user.create({
          data: {
            clerkId: userId,
            fullName,
            email: clerkUser.emailAddresses[0]?.emailAddress,
            avatarUrl: clerkUser.imageUrl,
            role: "ORGANIZER",
          },
        });
      }
    }
  } catch {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-center">
        <div>
          <p className="font-semibold text-lg mb-2">Tidak bisa terhubung ke database</p>
          <p className="text-sm text-muted-foreground">Cek koneksi DATABASE_URL di .env</p>
        </div>
      </div>
    );
  }

  if (!user) redirect("/sign-in");

  const events = await prisma.event.findMany({
    where: { organizerId: user.id },
    include: {
      _count: { select: { tickets: true } },
      tickets: {
        where: { paymentStatus: "PAID" },
        select: { checkedInAt: true, amount: true },
      },
    },
    orderBy: { eventDate: "desc" },
  });

  const totalEvents = events.length;
  const totalRegistrations = events.reduce((s, e) => s + e._count.tickets, 0);
  const totalCheckedIn = events.reduce(
    (s, e) => s + e.tickets.filter((t) => t.checkedInAt).length,
    0
  );
  const totalRevenue = events.reduce(
    (s, e) => s + e.tickets.reduce((ts, t) => ts + t.amount, 0),
    0
  );

  const statusLabel: Record<string, string> = {
    DRAFT: "Draft",
    PUBLISHED: "Aktif",
    ONGOING: "Berlangsung",
    COMPLETED: "Selesai",
    CANCELLED: "Dibatalkan",
  };
  const statusColor: Record<string, string> = {
    DRAFT: "bg-muted text-muted-foreground",
    PUBLISHED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    ONGOING: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    COMPLETED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    CANCELLED: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Organizer</h1>
          <p className="text-muted-foreground text-sm mt-1">Halo, {user.fullName} 👋</p>
        </div>
        <Link
          href="/event/buat"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Buat Event
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Event", value: totalEvents, icon: Calendar, color: "text-primary" },
          { label: "Pendaftar", value: totalRegistrations, icon: Users, color: "text-blue-500" },
          { label: "Check-in", value: totalCheckedIn, icon: CheckSquare, color: "text-green-500" },
          {
            label: "Revenue",
            value: `Rp ${(totalRevenue / 1000).toFixed(0)}k`,
            icon: TrendingUp,
            color: "text-orange-500",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-background border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{label}</span>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Events list */}
      <div className="bg-background border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Event Saya</h2>
          <span className="text-xs text-muted-foreground">{totalEvents} event</span>
        </div>

        {events.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Belum ada event. Yuk buat event pertamamu!</p>
          </div>
        ) : (
          <ul className="divide-y">
            {events.map((event) => {
              const paidCount = event.tickets.length;
              const checkedIn = event.tickets.filter((t) => t.checkedInAt).length;
              const fillPct = event.quota > 0 ? Math.round((paidCount / event.quota) * 100) : 0;

              return (
                <li key={event.id}>
                  <Link
                    href={`/dashboard/organizer/events/${event.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColor[event.status]}`}
                        >
                          {statusLabel[event.status]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.eventDate).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="font-medium text-sm truncate">{event.title}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-muted-foreground">
                          {paidCount}/{event.quota} peserta ({fillPct}%)
                        </span>
                        {checkedIn > 0 && (
                          <span className="text-xs text-green-600 dark:text-green-400">
                            {checkedIn} check-in
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
