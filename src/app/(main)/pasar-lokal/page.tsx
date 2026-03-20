export const revalidate = 60;

import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, Store, Package } from "lucide-react";

const PRODUCT_CATEGORIES = [
  "Semua", "Kuliner", "Fashion", "Kerajinan", "Pertanian", "Perikanan", "Jasa", "Teknologi", "Lainnya",
];

function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
}

async function ProductGrid({ category, q, page }: { category?: string; q?: string; page: number }) {
  const limit = 12;
  const skip = (page - 1) * limit;

  const where = {
    status: "ACTIVE" as const,
    umkm: { isMarketplace: true, isVerified: true },
    ...(category && category !== "Semua" ? { category } : {}),
    ...(q ? { OR: [
      { name: { contains: q, mode: "insensitive" as const } },
      { description: { contains: q, mode: "insensitive" as const } },
    ]} : {}),
  };

  const items = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
    include: {
      umkm: { select: { id: true, name: true, imageUrl: true, isVerified: true } },
    },
  });

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground col-span-full">
        <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>Belum ada produk untuk kategori ini.</p>
      </div>
    );
  }

  return (
    <>
      {items.map((product) => (
        <Link key={product.id} href={`/pasar-lokal/${product.id}`}>
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
            <div className="aspect-square overflow-hidden rounded-t-lg bg-muted">
              {product.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-4xl">🛍️</span>
                </div>
              )}
            </div>
            <CardContent className="p-3">
              <p className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                {product.name}
              </p>
              <p className="text-primary font-bold text-sm mb-2">
                {formatPrice(product.price)}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Store className="h-3 w-3 shrink-0" />
                <span className="truncate">{product.umkm.name}</span>
                {product.umkm.isVerified && (
                  <ShieldCheck className="h-3 w-3 text-teal-600 shrink-0" />
                )}
              </div>
              {product.stock <= 5 && product.stock > 0 && (
                <p className="text-xs text-orange-500 mt-1">Stok tersisa {product.stock}</p>
              )}
              {product.stock === 0 && (
                <p className="text-xs text-red-500 mt-1">Stok habis</p>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </>
  );
}

function ProductSkeleton() {
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

export default async function PasarLokalPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string; q?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1"));
  const category = params.category;
  const q = params.q;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold">Pasar Lokal</h1>
          <Badge className="bg-teal-600 text-white text-xs">Escrow</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Belanja produk UMKM Belitung Timur — pembayaran aman via escrow, dana ditahan sampai barang diterima.
        </p>

        {/* Keunggulan */}
        <div className="flex flex-wrap gap-3 mt-4">
          {[
            { icon: ShieldCheck, text: "Pembayaran Aman (Escrow)" },
            { icon: Store, text: "UMKM Terverifikasi" },
            { icon: Package, text: "Produk Asli Beltim" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
              <Icon className="h-3.5 w-3.5 text-teal-600" />
              {text}
            </div>
          ))}
        </div>
      </div>

      {/* Perbedaan FJB vs Pasar Lokal */}
      <div className="bg-muted/50 border rounded-lg p-4 mb-6 text-sm">
        <p className="font-medium mb-1">Pasar Lokal vs FJB — Apa bedanya?</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Pasar Lokal 🏪</p>
            <p>UMKM terverifikasi · Pembayaran via escrow · Produk baru/UMKM</p>
          </div>
          <div>
            <p className="font-medium text-foreground">FJB (Forum Jual Beli) 🤝</p>
            <p>Semua warga · COD/transfer langsung · Barang bekas/baru</p>
          </div>
        </div>
        <Link href="/fjb" className="text-xs text-primary hover:underline mt-2 block">
          Ke halaman FJB →
        </Link>
      </div>

      {/* Filter kategori */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
        {PRODUCT_CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={`/pasar-lokal${cat !== "Semua" ? `?category=${cat}` : ""}${q ? `${cat !== "Semua" ? "&" : "?"}q=${q}` : ""}`}
            className="shrink-0"
          >
            <Badge
              variant={(cat === "Semua" && !category) || category === cat ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors px-3 py-1.5"
            >
              {cat}
            </Badge>
          </Link>
        ))}
      </div>

      {/* Grid produk */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        <Suspense fallback={<ProductSkeleton />}>
          <ProductGrid category={category} q={q} page={page} />
        </Suspense>
      </div>
    </div>
  );
}
