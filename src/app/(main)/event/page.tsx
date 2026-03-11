import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Calendar, MapPin, Users, Ticket } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

function formatPrice(price: number, isPublic: boolean) {
  if (price === 0 && isPublic) return "Gratis";
  if (price === 0) return "Pendaftaran Gratis";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

const EVENT_CATEGORIES = [
  "Semua",
  "Lari",
  "Bersepeda",
  "Renang",
  "Festival",
  "Konser",
  "Komunitas",
  "Lainnya",
];

async function EventGrid({ page, category }: { page: number; category?: string }) {
  const limit = 9;
  const now = new Date();
  const where = {
    status: "PUBLISHED" as const,
    eventDate: { gte: now },
    ...(category && category !== "Semua" ? { category } : {}),
  };

  const items = await prisma.event.findMany({
    where,
    orderBy: { eventDate: "asc" },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      organizer: { select: { fullName: true } },
      _count: { select: { tickets: { where: { paymentStatus: "PAID" } } } },
    },
  });

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground col-span-full">
        Tidak ada event mendatang.
      </div>
    );
  }

  return (
    <>
      {items.map((event) => {
        const soldCount = event._count.tickets;
        const quota = event.quota;
        const availablePercent = Math.round((soldCount / quota) * 100);
        const isFull = soldCount >= quota;
        const isPublicEvent = event.price === 0 && quota >= 999999;

        return (
          <Link key={event.id} href={`/event/${event.id}`}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group overflow-hidden">
              {event.coverImage ? (
                <div className="aspect-video overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={event.coverImage}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-purple-200 flex items-center justify-center">
                  <Ticket className="h-12 w-12 text-primary/40" />
                </div>
              )}
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">
                    {event.category}
                  </Badge>
                  {event.package !== "STARTER" && (
                    <Badge className="text-xs bg-purple-600">
                      {event.package}
                    </Badge>
                  )}
                  {isFull && (
                    <Badge variant="destructive" className="text-xs">
                      Penuh
                    </Badge>
                  )}
                </div>
                <h3 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                  {event.title}
                </h3>
                <div className="space-y-1 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(event.eventDate), "EEEE, d MMMM yyyy", { locale: id })}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {event.location}
                  </div>
                </div>
                {!isPublicEvent && (
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {soldCount}/{quota} peserta
                      </span>
                      <span>{availablePercent}%</span>
                    </div>
                    <Progress value={availablePercent} className="h-1.5" />
                  </div>
                )}
                <p className="font-bold text-primary text-sm">
                  {formatPrice(event.price, isPublicEvent)}
                </p>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </>
  );
}

function EventSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <Skeleton className="aspect-video rounded-t-lg rounded-b-none" />
          <CardContent className="p-4 space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </>
  );
}

export default async function EventPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1");
  const category = params.category;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <PageHeader page="event" />

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {EVENT_CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={`/event?category=${cat === "Semua" ? "" : cat}`}
            className="shrink-0"
          >
            <Badge
              variant={
                (cat === "Semua" && !category) || category === cat
                  ? "default"
                  : "outline"
              }
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors px-3 py-1.5"
            >
              {cat}
            </Badge>
          </Link>
        ))}
      </div>

      {/* Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Suspense fallback={<EventSkeleton />}>
          <EventGrid page={page} category={category} />
        </Suspense>
      </div>
    </div>
  );
}
