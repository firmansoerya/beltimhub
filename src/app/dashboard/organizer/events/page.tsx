import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CalendarDays, Plus, ChevronRight, CheckSquare } from "lucide-react";
import { DraftEventActions } from "./DraftEventActions";

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

const tabs = [
  { key: "aktif", label: "Event Aktif" },
  { key: "draft", label: "Event Draft" },
  { key: "lalu", label: "Event Lalu" },
];

export default async function OrganizerEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { tab = "aktif", q = "" } = await searchParams;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, role: true },
  });
  if (!user) redirect("/sign-in");
  if (user.role !== "ORGANIZER" && user.role !== "ADMIN") redirect("/dashboard/beralih-kreator");

  const statusFilter =
    tab === "draft" ? ["DRAFT"] :
    tab === "lalu" ? ["COMPLETED", "CANCELLED"] :
    ["PUBLISHED", "ONGOING"];

  const events = await prisma.event.findMany({
    where: {
      organizerId: user.id,
      status: { in: statusFilter as ("DRAFT" | "PUBLISHED" | "ONGOING" | "COMPLETED" | "CANCELLED")[] },
      ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
    },
    include: {
      tickets: {
        where: { paymentStatus: "PAID" },
        select: { checkedInAt: true, amount: true },
      },
      ticketCategories: { select: { quota: true } },
    },
    orderBy: [{ status: "asc" }, { eventDate: "desc" }],
  });

  // DRAFT di atas: sort manual agar DRAFT selalu paling atas
  const sortedEvents = [
    ...events.filter(e => e.status === "DRAFT"),
    ...events.filter(e => e.status !== "DRAFT"),
  ];

  return (
    <div>
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background -mx-6 md:-mx-8 px-6 md:px-8 pt-5 border-b mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">Event Saya</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Kelola semua event yang kamu buat</p>
          </div>
          <Link
            href="/event/buat"
            className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-3 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Buat Event
          </Link>
        </div>

        {/* Search + Tabs */}
        <form method="GET" className="mb-3">
          <input type="hidden" name="tab" value={tab} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Cari event..."
            className="w-full text-sm bg-muted/50 border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
          />
        </form>
        <div className="flex">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={"?tab=" + t.key + (q ? "&q=" + encodeURIComponent(q) : "")}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="bg-background border rounded-xl overflow-hidden">
        {events.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Tidak ada event di kategori ini.</p>
            {tab === "aktif" && (
              <Link href="/event/buat" className="text-primary text-sm hover:underline mt-2 inline-block">
                Buat event pertamamu
              </Link>
            )}
          </div>
        ) : (
          <ul className="divide-y">
            {sortedEvents.map((event) => {
              const paidCount = event.tickets.length;
              const effectiveQuota = event.ticketCategories.length > 0
                ? event.ticketCategories.reduce((s, c) => s + c.quota, 0)
                : event.quota;
              const fillPct = effectiveQuota > 0 ? Math.round((paidCount / effectiveQuota) * 100) : 0;
              const checkedIn = event.tickets.filter(t => t.checkedInAt).length;
              const revenue = event.tickets.reduce((s, t) => s + t.amount, 0);
              const isDraft = event.status === "DRAFT";

              return (
                <li key={event.id} className="flex items-center hover:bg-muted/40 transition-colors">
                  <Link
                    href={`/dashboard/organizer/events/${event.id}`}
                    className="flex-1 flex items-center gap-4 px-5 py-4 min-w-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColor[event.status]}`}>
                          {statusLabel[event.status]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.eventDate).toLocaleDateString("id-ID", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="font-medium text-sm truncate">{event.title}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                        <span className="text-xs text-muted-foreground">
                          {paidCount}/{effectiveQuota} peserta ({fillPct}%)
                        </span>
                        {checkedIn > 0 && (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <CheckSquare className="h-3 w-3" />{checkedIn} check-in
                          </span>
                        )}
                        {revenue > 0 && (
                          <span className="text-xs text-muted-foreground">
                            Rp {revenue.toLocaleString("id-ID")}
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
