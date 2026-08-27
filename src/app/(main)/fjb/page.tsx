export const revalidate = 60;

import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Clock, Star, Search, ChevronRight, Flame, Sparkles, Megaphone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Pagination } from "@/components/Pagination";
import { LocationFilter } from "./LocationFilter";

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

const listingSelect = {
  id: true,
  title: true,
  price: true,
  images: true,
  location: true,
  category: true,
  isPremium: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
  seller: { select: { id: true, fullName: true, nickname: true, avatarUrl: true, isVerified: true } },
} as const;

type ListingItem = Awaited<ReturnType<typeof prisma.listing.findFirst<{ select: typeof listingSelect }>>> & {};

function ListingCard({ listing }: { listing: NonNullable<ListingItem> }) {
  return (
    <Link href={`/fjb/${listing.id}`}>
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group overflow-hidden">
        {listing.images?.[0] ? (
          <div className="aspect-square overflow-hidden rounded-t-lg bg-muted relative">
            <Image
              src={listing.images[0]}
              alt={listing.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
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
          <div className="space-y-1 text-xs text-muted-foreground">
            {listing.location && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{listing.location}</span>
              </span>
            )}
            <div className="flex items-center gap-1 flex-wrap">
              <Clock className="h-3 w-3 shrink-0" />
              <span>
                diposting {formatDistanceToNow(new Date(listing.createdAt), { addSuffix: true, locale: id })}
                {listing.updatedAt && new Date(listing.updatedAt).getTime() - new Date(listing.createdAt).getTime() > 60000 && (
                  <>, diperbarui {formatDistanceToNow(new Date(listing.updatedAt), { addSuffix: true, locale: id })}</>
                )}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <span className="truncate">{listing.seller.nickname ?? listing.seller.fullName}</span>
            {listing.seller.isVerified && <VerifiedBadge />}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function SectionHeader({ title, icon: Icon, href }: { title: string; icon: React.ElementType; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-teal-600" />
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors"
        >
          Lihat Semua <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

async function PremiumSection() {
  const items = await prisma.listing.findMany({
    where: { status: "ACTIVE", isPremium: true },
    orderBy: { createdAt: "desc" },
    take: 4,
    select: listingSelect,
  });

  if (items.length === 0) return null;

  return (
    <section>
      <SectionHeader title="Iklan Unggulan" icon={Star} />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {items.map((l) => <ListingCard key={l.id} listing={l} />)}
      </div>
    </section>
  );
}

async function PopularSection() {
  const items = await prisma.listing.findMany({
    where: { status: "ACTIVE", viewCount: { gt: 0 } },
    orderBy: { viewCount: "desc" },
    take: 4,
    select: listingSelect,
  });

  if (items.length === 0) return null;

  return (
    <section>
      <SectionHeader title="Paling Dilihat" icon={Flame} />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {items.map((l) => <ListingCard key={l.id} listing={l} />)}
      </div>
    </section>
  );
}

async function NewSection() {
  const items = await prisma.listing.findMany({
    where: { status: "ACTIVE", isPremium: false },
    orderBy: { createdAt: "desc" },
    take: 4,
    select: listingSelect,
  });

  if (items.length === 0) return null;

  return (
    <section>
      <SectionHeader title="Baru Ditambahkan" icon={Sparkles} />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {items.map((l) => <ListingCard key={l.id} listing={l} />)}
      </div>
    </section>
  );
}

async function AllListingGrid({
  page,
  category,
  q,
  loc,
}: {
  page: number;
  category?: string;
  q?: string;
  loc?: string;
}) {
  const limit = 12;
  const where = {
    status: "ACTIVE" as const,
    ...(category && category !== "Semua" ? { category } : {}),
    ...(loc ? { location: { contains: loc, mode: "insensitive" as const } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy: [{ isPremium: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      select: listingSelect,
    }),
    prisma.listing.count({ where }),
  ]);

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        Belum ada iklan untuk {loc ? `daerah ${loc}` : "kategori ini"}.
      </div>
    );
  }

  const totalPages = Math.ceil(total / limit);

  function buildHref(p: number) {
    const sp = new URLSearchParams();
    sp.set("page", String(p));
    if (category && category !== "Semua") sp.set("category", category);
    if (q) sp.set("q", q);
    if (loc) sp.set("loc", loc);
    return `/fjb?${sp.toString()}`;
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {items.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
      </div>
      <Pagination currentPage={page} totalPages={totalPages} buildHref={buildHref} />
    </>
  );
}

function ListingSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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
    </div>
  );
}

import { isFeatureEnabled } from "@/lib/site-settings";
import { FeatureDisabledNotice } from "@/components/FeatureDisabledNotice";

export default async function FJBPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string; q?: string; loc?: string }>;
}) {
  const isEnabled = await isFeatureEnabled("fjb");
  if (!isEnabled) {
    return <FeatureDisabledNotice featureName="Forum Jual Beli (FJB)" />;
  }

  const params = await searchParams;
  const page = parseInt(params.page ?? "1");
  const category = params.category;
  const q = params.q;
  const loc = params.loc;
  const isFiltered = !!(category && category !== "Semua") || !!q || !!loc;

  return (
    <div className="min-h-screen bg-muted/30">
      <PageHeader page="fjb" />

      <div className="container mx-auto max-w-6xl px-4 py-6 space-y-8">
        {/* Search + Location */}
        <div className="flex flex-col sm:flex-row gap-2">
          <LocationFilter />
          <form method="GET" action="/fjb" className="flex-1">
            {category && category !== "Semua" && <input type="hidden" name="category" value={category} />}
            {loc && <input type="hidden" name="loc" value={loc} />}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Cari iklan di FJB..."
                className="w-full pl-10 pr-4 py-2.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>
          </form>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {FJB_CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={`/fjb${cat === "Semua" ? "" : `?category=${cat}`}${q ? `${cat === "Semua" ? "?" : "&"}q=${q}` : ""}${loc ? `${(cat === "Semua" && !q) ? "?" : "&"}loc=${loc}` : ""}`}
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

        {/* Sections - only show on page 1 without filter */}
        {!isFiltered && page === 1 && (
          <Suspense fallback={<ListingSkeleton />}>
            <PremiumSection />
          </Suspense>
        )}

        {!isFiltered && page === 1 && (
          <Suspense fallback={<ListingSkeleton />}>
            <PopularSection />
          </Suspense>
        )}

        {!isFiltered && page === 1 && (
          <Suspense fallback={<ListingSkeleton />}>
            <NewSection />
          </Suspense>
        )}

        {/* All listings */}
        <section>
          <SectionHeader title={isFiltered ? `Hasil: ${category || q || loc || "Filter"}` : "Semua Iklan"} icon={Megaphone} />
          <Suspense fallback={<ListingSkeleton />}>
            <AllListingGrid page={page} category={category} q={q} loc={loc} />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
