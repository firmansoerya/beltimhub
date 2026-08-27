export const revalidate = 60;

import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, Store, Package, Search, Star, MapPin } from "lucide-react";
import { SortSelect } from "./SortSelect";

import { BannerCarousel } from "./BannerCarousel";

const PRODUCT_CATEGORIES = [
  "Semua", "Kuliner", "Fashion", "Kerajinan", "Pertanian", "Perikanan", "Jasa", "Teknologi", "Lainnya",
];

function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
}

async function ProductGrid({ category, q, page, sort }: { category?: string; q?: string; page: number; sort?: string }) {
  const limit = 20;
  const skip = (page - 1) * limit;

  const items = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      umkm: { is: { marketplaceStatus: "APPROVED" } },
      ...(category && category !== "Semua" ? { category } : {}),
      ...(q ? { OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { description: { contains: q, mode: "insensitive" as const } },
      ]} : {}),
    },
    orderBy: sort === "cheapest" ? { price: "asc" as const }
           : sort === "expensive" ? { price: "desc" as const }
           : sort === "bestseller" ? { soldCount: "desc" as const }
           : { createdAt: "desc" as const },
    skip,
    take: limit,
    include: {
      umkm: { select: { id: true, name: true, imageUrl: true, isVerified: true } },
    },
  });

  if (items.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground col-span-full">
        <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">Belum ada produk{q ? ` untuk "${q}"` : ""}</p>
        <p className="text-sm mt-1">Coba kata kunci atau kategori lain</p>
      </div>
    );
  }

  return (
    <>
      {items.map((product) => (
        <Link key={product.id} href={`/pasar-lokal/${product.id}`} className="group">
          <div className="bg-background border rounded-lg overflow-hidden hover:shadow-md transition-all duration-200">
            {/* Image */}
            <div className="aspect-square overflow-hidden bg-muted relative">
              {product.images[0] ? (
                <Image
                  src={product.images[0]}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-8 w-8 text-muted-foreground/30" />
                </div>
              )}
              {product.stock === 0 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white text-xs font-bold bg-red-600 px-2 py-1 rounded">Habis</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-2.5">
              <p className="text-sm line-clamp-2 leading-snug mb-1.5 group-hover:text-primary transition-colors">
                {product.name}
              </p>
              <p className="text-primary font-bold text-base mb-1.5">
                {formatPrice(product.price)}
              </p>

              {/* Sold count */}
              {product.soldCount > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-muted-foreground/50">|</span>
                  <span>{product.soldCount > 1000 ? `${(product.soldCount / 1000).toFixed(0)}rb+` : product.soldCount} terjual</span>
                </div>
              )}

              {/* Store */}
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Store className="h-3 w-3 shrink-0" />
                <span className="truncate">{product.umkm.name}</span>
                {product.umkm.isVerified && (
                  <ShieldCheck className="h-3 w-3 text-teal-600 shrink-0" />
                )}
              </div>

              {product.stock > 0 && product.stock <= 5 && (
                <p className="text-[11px] text-orange-500 mt-1">Tersisa {product.stock}</p>
              )}
            </div>
          </div>
        </Link>
      ))}
    </>
  );
}

function ProductSkeleton() {
  return (
    <>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="bg-background border rounded-lg overflow-hidden">
          <Skeleton className="aspect-square rounded-none" />
          <div className="p-2.5 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </>
  );
}

import { isFeatureEnabled } from "@/lib/site-settings";
import { FeatureDisabledNotice } from "@/components/FeatureDisabledNotice";

export default async function PasarLokalPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string; q?: string; sort?: string }>;
}) {
  const isEnabled = await isFeatureEnabled("pasar-lokal");
  if (!isEnabled) {
    return <FeatureDisabledNotice featureName="Pasar Lokal" />;
  }

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1"));
  const category = params.category;
  const q = params.q;
  const sort = params.sort;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Banner Carousel */}
      <BannerCarousel />

      {/* Sticky search + trust badges */}
      <div className="bg-background border-b sticky top-14 z-30">
        <div className="container mx-auto max-w-6xl px-4 py-3">
          {/* Search */}
          <form method="GET" action="/pasar-lokal" className="mb-3">
            {category && category !== "Semua" && <input type="hidden" name="category" value={category} />}
            {sort && <input type="hidden" name="sort" value={sort} />}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Cari produk di Pasar Lokal..."
                className="w-full pl-10 pr-4 py-2.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>
          </form>

          {/* Trust badges */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
              <span>Pembayaran Escrow</span>
            </div>
            <div className="flex items-center gap-1">
              <Store className="h-3.5 w-3.5 text-teal-600" />
              <span>UMKM Terverifikasi</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-teal-600" />
              <span>Produk Asli Beltim</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-4">
        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar">
          {PRODUCT_CATEGORIES.map((cat) => {
            const isActive = (cat === "Semua" && !category) || category === cat;
            const href = cat === "Semua"
              ? `/pasar-lokal${q ? `?q=${q}` : ""}${sort ? `${q ? "&" : "?"}sort=${sort}` : ""}`
              : `/pasar-lokal?category=${cat}${q ? `&q=${q}` : ""}${sort ? `&sort=${sort}` : ""}`;
            return (
              <Link
                key={cat}
                href={href}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-background border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                }`}
              >
                {cat}
              </Link>
            );
          })}
        </div>

        {/* Toolbar: search result + sort */}
        <div className="flex items-center justify-between py-3">
          <p className="text-sm text-muted-foreground">
            {q ? <>Hasil pencarian: <span className="font-medium text-foreground">&quot;{q}&quot;</span></> : null}
          </p>
          <SortSelect />
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <Suspense fallback={<ProductSkeleton />}>
            <ProductGrid category={category} q={q} page={page} sort={sort} />
          </Suspense>
        </div>

        {/* Load more */}
        <div className="flex justify-center py-8">
          <Link
            href={`/pasar-lokal?page=${page + 1}${category ? `&category=${category}` : ""}${q ? `&q=${q}` : ""}${sort ? `&sort=${sort}` : ""}`}
            className="px-8 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Muat lebih banyak
          </Link>
        </div>
      </div>

    </div>
  );
}
