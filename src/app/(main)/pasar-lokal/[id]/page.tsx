export const revalidate = 60;

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, Store, Star, Package, MessageCircle } from "lucide-react";
import { auth } from "@clerk/nextjs/server";

import { FloatingChatBox } from "@/components/FloatingChatBox";
import { ImageGallery } from "@/app/(main)/fjb/[id]/ImageGallery";
import { PurchaseCard } from "./PurchaseCard";
import { ShareButton } from "@/components/ShareButton";
import { parseShippingConfig, SHIPPING_METHOD_KEYS, SHIPPING_METHOD_LABELS } from "@/lib/constants";

function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    select: { name: true, description: true, price: true, images: true },
  });

  if (!product) {
    return { title: "Produk Tidak Ditemukan | BeltimHub" };
  }

  const formattedPrice = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(product.price);
  const description = `${product.name} - ${formattedPrice}`;

  return {
    title: `${product.name} | Pasar Lokal BeltimHub`,
    description,
    openGraph: {
      title: `${product.name} | Pasar Lokal BeltimHub`,
      description,
      images: product.images[0] ? [product.images[0]] : [],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth();

  const product = await prisma.product.findUnique({
    where: { id, status: "ACTIVE" },
    include: {
      umkm: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          isVerified: true,
          category: true,
          phone: true,
          instagram: true,
          address: true,
          shippingConfig: true,
          owner: { select: { clerkId: true } },
          reviews: {
            select: {
              id: true,
              rating: true,
              comment: true,
              createdAt: true,
              reviewer: { select: { fullName: true, nickname: true, avatarUrl: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          },
          _count: { select: { products: true, reviews: true } },
        },
      },
    },
  });

  if (!product) notFound();

  const umkm = product.umkm;
  const shipConfig = parseShippingConfig(umkm.shippingConfig);
  const enabledShipping = SHIPPING_METHOD_KEYS.filter(k => shipConfig[k].enabled);
  const avgRating = umkm._count.reviews > 0
    ? umkm.reviews.reduce((s, r) => s + r.rating, 0) / umkm.reviews.length
    : null;

  // Produk lain dari toko yang sama
  const otherProducts = await prisma.product.findMany({
    where: { umkmId: umkm.id, status: "ACTIVE", id: { not: product.id } },
    take: 6,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, price: true, images: true },
  });

  return (
    <>
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Layout 3 kolom: Gambar | Info | Purchase Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Kolom 1: Gambar produk */}
        <div>
          <ImageGallery images={product.images} title={product.name} />
        </div>

        {/* Kolom 2: Info produk */}
        <div className="space-y-4">
              {/* Judul & Harga */}
              <div>
                <h1 className="text-lg font-bold leading-snug mb-2">{product.name}</h1>
                <p className="text-2xl font-bold">{formatPrice(product.price)}</p>
              </div>

              <Separator />

              {/* Detail Produk */}
              <div>
                <h2 className="font-semibold text-sm mb-3">Detail Produk</h2>
                <table className="text-sm">
                  <tbody>
                    <tr>
                      <td className="text-muted-foreground pr-6 py-0.5">Kondisi</td>
                      <td className="py-0.5">Baru</td>
                    </tr>
                    <tr>
                      <td className="text-muted-foreground pr-6 py-0.5">Stok</td>
                      <td className="py-0.5">{product.stock > 0 ? `${product.stock} tersedia` : "Habis"}</td>
                    </tr>
                    <tr>
                      <td className="text-muted-foreground pr-6 py-0.5">Kategori</td>
                      <td className="py-0.5 text-primary font-medium">{product.category}</td>
                    </tr>
                    {enabledShipping.length > 0 && (
                      <tr>
                        <td className="text-muted-foreground pr-6 py-1.5 align-top">Pengiriman</td>
                        <td className="py-1.5">
                          <div className="flex flex-wrap gap-1.5">
                            {enabledShipping.map(k => {
                              const m = SHIPPING_METHOD_LABELS[k];
                              const cfg = shipConfig[k];
                              return (
                                <Badge key={k} variant="secondary" className="gap-1 text-xs font-medium py-0.5 px-2">
                                  <span>{m.icon}</span>
                                  {m.label}
                                  {cfg.fee === 0 && <span className="text-green-600 font-semibold ml-0.5">Gratis</span>}
                                </Badge>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <Separator />

              {/* Deskripsi */}
              <div>
                <h2 className="font-semibold text-sm mb-2">Deskripsi Produk</h2>
                <div className="prose prose-sm max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: product.description }} />
              </div>

              <Separator />

              {/* Info toko */}
              <Link href={`/umkm/${umkm.id}`} className="block">
                <Card className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-muted overflow-hidden shrink-0">
                      {umkm.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={umkm.imageUrl} alt={umkm.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">🏪</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm truncate">{umkm.name}</span>
                        {umkm.isVerified && <ShieldCheck className="h-3.5 w-3.5 text-teal-600 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        {avgRating && (
                          <span className="flex items-center gap-0.5">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {avgRating.toFixed(1)} ({umkm.reviews.length})
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {umkm._count.products} produk
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-primary shrink-0 font-medium">Lihat Toko →</span>
                  </CardContent>
                </Card>
              </Link>

        </div>

        {/* Kolom 3: Card pembelian */}
        <div>
          <PurchaseCard
            productId={product.id}
            name={product.name}
            price={product.price}
            image={product.images[0] ?? null}
            stock={product.stock}
            umkmId={umkm.id}
            umkmName={umkm.name}
          />
        </div>
      </div>

      {/* ULASAN PEMBELI */}
      <div className="mt-10">
        <h2 className="text-base font-bold mb-4">ULASAN PEMBELI</h2>
        {umkm.reviews.length > 0 ? (
          <div className="space-y-4">
            {/* Ringkasan rating */}
            <div className="flex items-center gap-4 mb-4">
              <div className="text-center">
                <div className="flex items-center gap-1">
                  <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                  <span className="text-3xl font-bold">{avgRating?.toFixed(1)}</span>
                </div>
                <p className="text-xs text-muted-foreground">{umkm._count.reviews} ulasan</p>
              </div>
              <Separator orientation="vertical" className="h-12" />
              <div className="flex gap-1">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = umkm.reviews.filter((r) => r.rating === star).length;
                  return (
                    <div key={star} className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span>{star}</span>
                      <span className="text-muted-foreground">({count})</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* List ulasan */}
            {umkm.reviews.map((review) => (
              <div key={review.id} className="border-b pb-4 last:border-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-muted overflow-hidden shrink-0">
                    {review.reviewer.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={review.reviewer.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {(review.reviewer.nickname ?? review.reviewer.fullName ?? "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{review.reviewer.nickname ?? review.reviewer.fullName}</p>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                {review.comment && (
                  <p className="text-sm text-muted-foreground">{review.comment}</p>
                )}
              </div>
            ))}

            {umkm._count.reviews > 5 && (
              <Link href={`/umkm/${umkm.id}`} className="text-sm text-primary hover:underline block mt-2">
                Lihat semua {umkm._count.reviews} ulasan →
              </Link>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Belum ada ulasan untuk toko ini.</p>
          </div>
        )}
      </div>

      {/* PRODUK LAINNYA DARI TOKO INI */}
      {otherProducts.length > 0 && (
        <div className="mt-10">
          <h2 className="text-base font-bold mb-4">Produk Lainnya dari {umkm.name}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {otherProducts.map((p) => (
              <Link key={p.id} href={`/pasar-lokal/${p.id}`}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
                  <div className="aspect-square overflow-hidden rounded-t-lg bg-muted">
                    {p.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-3xl">🛍️</span>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-2.5">
                    <p className="text-xs font-medium line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                      {p.name}
                    </p>
                    <p className="text-primary font-bold text-sm">{formatPrice(p.price)}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

    </div>
    {umkm.owner.clerkId !== userId && (
      <FloatingChatBox umkmId={umkm.id} umkmName={umkm.name} umkmImageUrl={umkm.imageUrl} isLoggedIn={!!userId} />
    )}
    </>
  );
}
