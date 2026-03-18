import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  CalendarDays, Users, CheckSquare, TrendingUp, Ticket, Plus, ChevronRight,
} from "lucide-react";
import { DraftEventActions } from "./events/DraftEventActions";

export default async function OrganizerDashboard() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, fullName: true, role: true, organizerTosAcceptedAt: true },
  });

  if (!user) redirect("/sign-in");
  if (user.role !== "ORGANIZER" && user.role !== "ADMIN") redirect("/dashboard/beralih-kreator");
  if (!user.organizerTosAcceptedAt) redirect("/dashboard/organizer/tos");

  const events = await prisma.event.findMany({
    where: { organizerId: user.id },
    include: {
      _count: { select: { tickets: true } },
      tickets: {
        where: { paymentStatus: "PAID" },
        select: { checkedInAt: true, amount: true },
      },
      ticketCategories: { select: { quota: true } },
    },
    orderBy: { eventDate: "desc" },
  });

  const aktifEvents = events.filter(e => e.status === "PUBLISHED" || e.status === "ONGOING").length;
  const draftEvents = events.filter(e => e.status === "DRAFT").length;
  const totalTicketsSold = events.reduce((s, e) => s + e.tickets.length, 0);
  const totalRevenue = events.reduce((s, e) => s + e.tickets.reduce((ts, t) => ts + t.amount, 0), 0);
  const totalCheckedIn = events.reduce((s, e) => s + e.tickets.filter(t => t.checkedInAt).length, 0);

  const statusLabel: Record<string, string> = {
    DRAFT: "Draft", PUBLISHED: "Aktif", ONGOING: "Berlangsung",
    COMPLETED: "Selesai", CANCELLED: "Dibatalkan",
  };
  const statusColor: Record<string, string> = {
    DRAFT: "bg-muted text-muted-foreground",
    PUBLISHED: "bg-green-100 text-green-700",
    ONGOING: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-slate-100 text-slate-600",
    CANCELLED: "bg-red-100 text-red-600",
  };

  const firstName = user.fullName.split(" ")[0];

  return (
    <div>
      <div className="sticky top-0 z-20 bg-background -mx-6 md:-mx-8 px-6 md:px-8 py-5 border-b mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Halo, {firstName}! Selamat datang di dashboard kreator.</p>
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Event Aktif",        value: aktifEvents,     suffix: "Event",  icon: CalendarDays,  color: "text-primary",    bg: "bg-primary/10",   href: "/dashboard/organizer/events" },
          { label: "Event Draft",        value: draftEvents,     suffix: "Event",  icon: CalendarDays,  color: "text-slate-500",  bg: "bg-slate-100",    href: "/dashboard/organizer/events" },
          { label: "Total Transaksi",    value: events.length,   suffix: undefined, icon: TrendingUp,   color: "text-orange-500", bg: "bg-orange-50",    href: null },
          { label: "Total Tiket Terjual",value: totalTicketsSold,suffix: "Tiket",  icon: Ticket,        color: "text-blue-500",   bg: "bg-blue-50",      href: null },
          { label: "Total Penjualan",    value: `Rp ${totalRevenue.toLocaleString("id-ID")}`, suffix: undefined, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50", href: null },
          { label: "Total Pengunjung",   value: totalCheckedIn,  suffix: "Orang",  icon: Users,         color: "text-purple-500", bg: "bg-purple-50",    href: null },
        ].map(({ label, value, suffix, icon: Icon, color, bg, href }) => (
          <div key={label} className="bg-background border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">{label}</span>
              {href ? (
                <Link href={href} className="text-[10px] text-primary hover:underline">Detail</Link>
              ) : (
                <div className={`h-7 w-7 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                </div>
              )}
            </div>
            <p className="text-2xl font-bold">{value}</p>
            {suffix && <p className="text-xs text-muted-foreground mt-0.5">{suffix}</p>}
          </div>
        ))}
      </div>

      {/* Event list */}
      <div className="bg-background border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-sm">Event Terbaru</h2>
          <Link href="/dashboard/organizer/events" className="text-xs text-primary hover:underline">Lihat semua</Link>
        </div>
        {events.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Belum ada event. Yuk buat event pertamamu!</p>
            <Link href="/event/buat" className="text-primary text-sm hover:underline mt-2 inline-block">Buat event sekarang</Link>
          </div>
        ) : (
          <ul className="divide-y">
            {[
              ...events.filter(e => e.status === "DRAFT"),
              ...events.filter(e => e.status !== "DRAFT"),
            ].slice(0, 5).map((event) => {
              const paidCount = event.tickets.length;
              const effectiveQuota = event.ticketCategories.length > 0
                ? event.ticketCategories.reduce((s, c) => s + c.quota, 0)
                : event.quota;
              const fillPct = effectiveQuota > 0 ? Math.round((paidCount / effectiveQuota) * 100) : 0;
              const checkedIn = event.tickets.filter(t => t.checkedInAt).length;
              const isDraft = event.status === "DRAFT";
              return (
                <li key={event.id} className="flex items-center hover:bg-muted/40 transition-colors">
                  <Link
                    href={`/dashboard/organizer/events/${event.id}`}
                    className="flex-1 flex items-center gap-4 px-5 py-3.5 min-w-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColor[event.status]}`}>
                          {statusLabel[event.status]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.eventDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      <p className="font-medium text-sm truncate">{event.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">{paidCount}/{effectiveQuota} peserta ({fillPct}%)</span>
                        {checkedIn > 0 && (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <CheckSquare className="h-3 w-3" />{checkedIn} check-in
                          </span>
                        )}
                      </div>
                    </div>
                    {!isDraft && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </Link>
                  {isDraft && (
                    <div className="pr-4">
                      <DraftEventActions eventId={event.id} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
