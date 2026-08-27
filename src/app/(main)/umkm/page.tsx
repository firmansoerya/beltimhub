export const revalidate = 60;

import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Store, Star, ChevronRight, ShieldCheck, Sparkles } from "lucide-react";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { NearbySection } from "./NearbySection";
import { RecommendationSection } from "./RecommendationSection";

const UMKM_CATEGORIES = ["Semua", "Kuliner", "Fashion", "Kerajinan", "Pertanian", "Perikanan", "Jasa", "Teknologi", "Lainnya"];

const umkmSelect = {
  id: true,
  name: true,
  imageUrl: true,
  category: true,
  isVerified: true,
  _count: { select: { reviews: true } },
} as const;

function UmkmCard({ umkm }: { umkm: { id: string; name: string; imageUrl: string | null; category: string; isVerified: boolean; _count: { reviews: number } } }) {
  return (
    <Link href={`/umkm/${umkm.id}`} className="group">
      <div className="bg-white dark:bg-card border rounded-xl overflow-hidden hover:shadow-md transition-shadow text-center p-4">
        <div className="relative w-16 h-16 mx-auto rounded-full overflow-hidden bg-muted ring-2 ring-teal-100">
          {umkm.imageUrl ? (
            <Image src={umkm.imageUrl} alt={umkm.name} fill className="object-cover" sizes="64px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-50 to-teal-100">
              <Store className="w-6 h-6 text-teal-300" />
            </div>
          )}
        </div>
        <h3 className="font-semibold text-xs mt-3 line-clamp-1 group-hover:text-teal-600 transition-colors">
          {umkm.name}
        </h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">{umkm.category}</p>
        {umkm._count.reviews > 0 && (
          <div className="flex items-center justify-center gap-0.5 mt-1">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-[10px] text-muted-foreground">{umkm._count.reviews} ulasan</span>
          </div>
        )}
        {umkm.isVerified && (
          <div className="flex items-center justify-center gap-0.5 mt-1">
            <ShieldCheck className="w-3 h-3 text-teal-500" />
            <span className="text-[10px] text-teal-600 font-medium">Terverifikasi</span>
          </div>
        )}
      </div>
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

async function FeaturedSection() {
  const items = await prisma.umkm.findMany({
    where: { isVerified: true },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: umkmSelect,
  });

  if (items.length === 0) return null;

  return (
    <section>
      <SectionHeader title="UMKM Terverifikasi" icon={ShieldCheck} />
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {items.map((u) => <UmkmCard key={u.id} umkm={u} />)}
      </div>
    </section>
  );
}

async function NewSection() {
  const items = await prisma.umkm.findMany({
    where: { isVerified: false },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: umkmSelect,
  });

  if (items.length === 0) return null;

  return (
    <section>
      <SectionHeader title="Baru Bergabung" icon={Sparkles} />
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {items.map((u) => <UmkmCard key={u.id} umkm={u} />)}
      </div>
    </section>
  );
}

async function AllUmkmGrid({ category, q, page }: { category?: string; q?: string; page: number }) {
  const limit = 24;
  const where = {
    ...(category && category !== "Semua" ? { category } : {}),
    ...(q ? { OR: [
      { name: { contains: q, mode: "insensitive" as const } },
      { description: { contains: q, mode: "insensitive" as const } },
    ]} : {}),
  };

  const [items, total] = await Promise.all([
    prisma.umkm.findMany({
      where,
      orderBy: [{ isVerified: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      select: umkmSelect,
    }),
    prisma.umkm.count({ where }),
  ]);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Store}
        title="Belum ada UMKM terdaftar"
        description="Belum ada UMKM untuk kategori ini"
        actionLabel="Daftarkan UMKM"
        actionHref="/umkm/tambah"
      />
    );
  }

  const totalPages = Math.ceil(total / limit);

  function buildHref(p: number) {
    const sp = new URLSearchParams();
    sp.set("page", String(p));
    if (category && category !== "Semua") sp.set("category", category);
    if (q) sp.set("q", q);
    return `/umkm?${sp.toString()}`;
  }

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {items.map((umkm) => <UmkmCard key={umkm.id} umkm={umkm} />)}
      </div>
      <Pagination currentPage={page} totalPages={totalPages} buildHref={buildHref} />
    </>
  );
}

function UmkmSkeleton() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-card border rounded-xl p-4 text-center">
          <Skeleton className="w-16 h-16 rounded-full mx-auto" />
          <Skeleton className="h-3 w-16 mx-auto mt-3" />
          <Skeleton className="h-2.5 w-12 mx-auto mt-1.5" />
        </div>
      ))}
    </div>
  );
}

import { isFeatureEnabled } from "@/lib/site-settings";
import { FeatureDisabledNotice } from "@/components/FeatureDisabledNotice";

export default async function UmkmPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; page?: string }>;
}) {
  const isEnabled = await isFeatureEnabled("umkm");
  if (!isEnabled) {
    return <FeatureDisabledNotice featureName="Direktori UMKM" />;
  }

  const params = await searchParams;
  const category = params.category;
  const q = params.q;
  const page = parseInt(params.page ?? "1");
  const isFiltered = !!(category && category !== "Semua") || !!q;

  return (
    <div className="min-h-screen bg-muted/30">
      <PageHeader page="umkm" />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {UMKM_CATEGORIES.map((cat) => (
            <Link key={cat} href={`/umkm${cat === "Semua" ? "" : `?category=${cat}`}`} className="shrink-0">
              <Badge
                variant={(cat === "Semua" && !category) || category === cat ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors px-3 py-1.5"
              >
                {cat}
              </Badge>
            </Link>
          ))}
        </div>

        {/* Grouped sections - only show when not filtering */}
        {!isFiltered && page === 1 && <RecommendationSection />}

        {!isFiltered && page === 1 && (
          <Suspense fallback={<UmkmSkeleton />}>
            <FeaturedSection />
          </Suspense>
        )}

        {!isFiltered && page === 1 && <NearbySection />}

        {!isFiltered && page === 1 && (
          <Suspense fallback={<UmkmSkeleton />}>
            <NewSection />
          </Suspense>
        )}

        {/* All UMKM */}
        <section>
          <SectionHeader title={isFiltered ? `Hasil: ${category || q}` : "Semua UMKM"} icon={Store} />
          <Suspense fallback={<UmkmSkeleton />}>
            <AllUmkmGrid category={category} q={q} page={page} />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
