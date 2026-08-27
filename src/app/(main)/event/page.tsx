export const revalidate = 30;

import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Ticket, Search } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";

function formatPrice(price: number, isFree: boolean) {
  if (isFree) return "Gratis";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

const EVENT_CATEGORIES = [
  "Semua", "Lari", "Bersepeda", "Olahraga", "Musik", "Festival",
  "Hiburan", "Pameran", "Seminar", "Workshop", "Webinar",
  "Konferensi", "Komunitas", "Budaya", "Lainnya",
];

async function EventGrid({
  page, category, harga, q,
}: {
  page: number;
  category?: string;
  harga?: string;
  q?: string;
}) {
  const limit = 12;
  const now = new Date();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    status: "PUBLISHED",
    eventDate: { gte: now },
  };

  if (category && category !== "Semua") where.category = category;
  if (harga === "gratis") where.price = 0;
  if (harga === "berbayar") where.price = { gt: 0 };
  if (q?.trim()) where.title = { contains: q.trim(), mode: "insensitive" };

  const [items, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { eventDate: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        organizer: { select: { fullName: true, organizerLogoUrl: true, avatarUrl: true } },
        ticketCategories: { select: { price: true } },
        _count: { select: { tickets: { where: { paymentStatus: "PAID" } } } },
      },
    }),
    prisma.event.count({ where }),
  ]);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Ticket}
        title="Tidak ada event yang sesuai"
        description="Coba ubah filter atau kata kunci pencarian"
        actionLabel="Reset filter"
        actionHref="/event"
      />
    );
  }

  const totalPages = Math.ceil(total / limit);

  function buildHref(p: number) {
    const sp = new URLSearchParams();
    sp.set("page", String(p));
    if (category && category !== "Semua") sp.set("category", category);
    if (harga) sp.set("harga", harga);
    if (q) sp.set("q", q);
    return `/event?${sp.toString()}`;
  }

  return (
    <>
      {items.map((event) => {
        const soldCount = event._count.tickets;
        const quota = event.quota;
        const isFull = soldCount >= quota;
        const isPublicEvent = event.price === 0 && quota >= 999999;
        const minPrice = event.ticketCategories.length > 0
          ? Math.min(...event.ticketCategories.map((c) => c.price))
          : event.price;
        const isFree = minPrice === 0;
        const priceLabel = isPublicEvent ? "Gratis" : formatPrice(minPrice, isFree);

        return (
          <Link key={event.id} href={`/event/${event.id}`} className="group block">
            <div className="rounded-xl border border-border/60 bg-card hover:shadow-md hover:border-primary/30 transition-all duration-200 overflow-hidden">
              {/* Image */}
              <div className="relative aspect-[16/10] bg-muted overflow-hidden">
                {event.coverImage ? (
                  <Image
                    src={event.coverImage}
                    alt={event.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 via-purple-100 to-purple-200 flex items-center justify-center">
                    <Ticket className="h-10 w-10 text-primary/30" />
                  </div>
                )}

                {event.package !== "STARTER" && (
                  <span className="absolute top-2.5 left-2.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-600 text-white">
                    {event.package}
                  </span>
                )}

                <span
                  className={cn(
                    "absolute bottom-2.5 left-2.5 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm",
                    isFree ? "bg-green-500 text-white" : "bg-white/95 text-foreground"
                  )}
                >
                  {priceLabel}
                </span>

                {isFull && (
                  <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                    <span className="text-white text-sm font-bold tracking-widest">KUOTA PENUH</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                <Badge variant="secondary" className="text-[10px] font-medium">
                  {event.category}
                </Badge>

                <p className="text-[13px] font-semibold mt-2 leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                  {event.title}
                </p>

                <div className="mt-1.5 flex flex-col gap-0.5">
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3 shrink-0" />
                    <span className="truncate">
                      {format(new Date(event.eventDate), "d MMM yyyy · HH:mm", { locale: id })} WIB
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </p>
                </div>

                <div className="h-px bg-border/60 my-2" />

                <div className="flex items-center gap-2 min-w-0">
                  {(event.organizer.organizerLogoUrl ?? event.organizer.avatarUrl) ? (
                    <Image
                      src={(event.organizer.organizerLogoUrl ?? event.organizer.avatarUrl)!}
                      alt={event.organizer.fullName}
                      width={28}
                      height={28}
                      className="rounded-full object-cover shrink-0 border border-border"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full shrink-0 bg-muted border border-border" />
                  )}
                  <p className="text-[13px] font-semibold truncate min-w-0">
                    {event.organizer.fullName}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        );
      })}

      <div className="col-span-full">
        <Pagination currentPage={page} totalPages={totalPages} buildHref={buildHref} />
      </div>
    </>
  );
}

function EventSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/60 overflow-hidden">
          <Skeleton className="aspect-[16/10] rounded-none" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-3 w-14 rounded-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="h-px bg-border/60 my-2" />
            <div className="flex items-center gap-2">
              <Skeleton className="w-7 h-7 rounded-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function FilterForm({ q, category, harga }: { q?: string; category?: string; harga?: string }) {
  return (
    <form method="GET" action="/event" className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Cari nama event..."
          className="w-full border border-border rounded-xl bg-background text-sm pl-9 pr-4 py-2.5 outline-none focus:border-primary transition-colors"
        />
      </div>

      <select
        name="category"
        defaultValue={category ?? ""}
        className="appearance-none border border-border rounded-xl bg-background text-sm px-4 py-2.5 pr-8 outline-none focus:border-primary transition-colors cursor-pointer min-w-[160px]"
      >
        <option value="">Semua Kategori</option>
        {EVENT_CATEGORIES.filter((c) => c !== "Semua").map((cat) => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>

      <select
        name="harga"
        defaultValue={harga ?? ""}
        className="appearance-none border border-border rounded-xl bg-background text-sm px-4 py-2.5 pr-8 outline-none focus:border-primary transition-colors cursor-pointer min-w-[140px]"
      >
        <option value="">Semua Harga</option>
        <option value="gratis">Gratis</option>
        <option value="berbayar">Berbayar</option>
      </select>

      <button
        type="submit"
        className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
      >
        Cari
      </button>
    </form>
  );
}

import { isFeatureEnabled } from "@/lib/site-settings";
import { FeatureDisabledNotice } from "@/components/FeatureDisabledNotice";

export default async function EventPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string; harga?: string; q?: string }>;
}) {
  const isEnabled = await isFeatureEnabled("event");
  if (!isEnabled) {
    return <FeatureDisabledNotice featureName="Event & Tiket" />;
  }

  const params = await searchParams;
  const page = parseInt(params.page ?? "1");
  const category = params.category;
  const harga = params.harga;
  const q = params.q;

  return (
    <div className="min-h-screen bg-muted/30">
      <PageHeader page="event" />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Filter */}
        <div className="mb-6">
          <FilterForm q={q} category={category} harga={harga} />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Suspense fallback={<EventSkeleton />}>
            <EventGrid page={page} category={category} harga={harga} q={q} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
