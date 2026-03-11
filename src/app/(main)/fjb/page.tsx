import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Clock, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { VerifiedBadge } from "@/components/VerifiedBadge";

const FJB_CATEGORIES = [
  "Semua",
  "Elektronik",
  "Kendaraan",
  "Properti",
  "Fashion",
  "Perabotan",
  "Makanan",
  "Jasa",
  "Lainnya",
];

function formatPrice(price: number) {
  if (price === 0) return "Gratis";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

async function ListingGrid({
  page,
  category,
  q,
}: {
  page: number;
  category?: string;
  q?: string;
}) {
  const limit = 12;
  const where = {
    status: "ACTIVE" as const,
    ...(category && category !== "Semua" ? { category } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const items = await prisma.listing.findMany({
    where,
    orderBy: [{ isPremium: "desc" }, { createdAt: "desc" }],
    skip: (page - 1) * limit,
    take: limit,
    include: {
      seller: { select: { id: true, fullName: true, avatarUrl: true, isVerified: true } },
    },
  });

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground col-span-full">
        Belum ada iklan untuk kategori ini.
      </div>
    );
  }

  return (
    <>
      {items.map((listing) => (
        <Link key={listing.id} href={`/fjb/${listing.id}`}>
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
            {listing.images?.[0] ? (
              <div className="aspect-square overflow-hidden rounded-t-lg bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={listing.images[0]}
                  alt={listing.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            ) : (
              <div className="aspect-square rounded-t-lg bg-muted flex items-center justify-center">
                <span className="text-4xl">📦</span>
              </div>
            )}
            <CardContent className="p-3">
              {listing.isPremium && (
                <Badge className="mb-1.5 text-xs gap-1 bg-amber-500">
                  <Star className="h-2.5 w-2.5" />
                  Unggulan
                </Badge>
              )}
              <p className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                {listing.title}
              </p>
              <p className="text-primary font-bold text-sm mb-2">
                {formatPrice(listing.price)}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                {listing.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {listing.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(listing.createdAt), {
                    addSuffix: true,
                    locale: id,
                  })}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <span className="truncate">{listing.seller.fullName}</span>
                {listing.seller.isVerified && <VerifiedBadge />}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </>
  );
}

function ListingSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i}>
          <Skeleton className="aspect-square rounded-t-lg rounded-b-none" />
          <CardContent className="p-3 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </>
  );
}

export default async function FJBPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string; q?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1");
  const category = params.category;
  const q = params.q;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <PageHeader page="fjb" />

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
        {FJB_CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={`/fjb?category=${cat === "Semua" ? "" : cat}`}
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        <Suspense fallback={<ListingSkeleton />}>
          <ListingGrid page={page} category={category} q={q} />
        </Suspense>
      </div>
    </div>
  );
}
