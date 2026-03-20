export const revalidate = 60;

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ShieldCheck, Store, Package, Star } from "lucide-react";
import { CheckoutButton } from "./CheckoutButton";

function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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
          reviews: { select: { rating: true } },
        },
      },
    },
  });

  if (!product) notFound();

  const umkm = product.umkm;
  const avgRating = umkm.reviews.length > 0
    ? umkm.reviews.reduce((s, r) => s + r.rating, 0) / umkm.reviews.length
    : null;

  const platformFee = Math.round(product.price * 3 / 100);
  const totalPrice = product.price + platformFee;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Link href="/pasar-lokal" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Pasar Lokal
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Gambar produk */}
        <div className="space-y-3">
          <div className="aspect-square rounded-xl bg-muted overflow-hidden">
            {product.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-6xl">🛍️</span>
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.slice(1).map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={img} alt={`${product.name} ${i + 2}`} className="aspect-square object-cover rounded-lg" />
              ))}
            </div>
          )}
        </div>

        {/* Info produk */}
        <div className="space-y-4">
          <div>
            <Badge variant="outline" className="mb-2">{product.category}</Badge>
            <h1 className="text-xl font-bold mb-2">{product.name}</h1>
            <p className="text-2xl font-bold text-primary">{formatPrice(product.price)}</p>
            {product.stock > 0 ? (
              <p className="text-xs text-muted-foreground mt-1">Stok: {product.stock} tersedia</p>
            ) : (
              <Badge variant="destructive" className="mt-1">Stok Habis</Badge>
            )}
          </div>

          <Separator />

          {/* Info toko */}
          <Link href={`/umkm/${umkm.id}`} className="block">
            <Card className="hover:shadow-sm transition-shadow">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted overflow-hidden shrink-0">
                  {umkm.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={umkm.imageUrl} alt={umkm.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg">🏪</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-sm truncate">{umkm.name}</span>
                    {umkm.isVerified && <ShieldCheck className="h-3.5 w-3.5 text-teal-600 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Store className="h-3 w-3" />{umkm.category}</span>
                    {avgRating && (
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {avgRating.toFixed(1)} ({umkm.reviews.length})
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-primary shrink-0">Lihat Toko →</span>
              </CardContent>
            </Card>
          </Link>

          {/* Deskripsi */}
          <div>
            <h2 className="font-semibold mb-2 text-sm">Deskripsi Produk</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{product.description}</p>
          </div>

          <Separator />

          {/* Ringkasan harga */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Harga produk</span>
              <span>{formatPrice(product.price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Biaya layanan (3%)</span>
              <span>{formatPrice(platformFee)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span className="text-primary">{formatPrice(totalPrice)}</span>
            </div>
          </div>

          {/* Garansi escrow */}
          <div className="bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-lg p-3 text-xs text-teal-800 dark:text-teal-300 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Dilindungi Sistem Escrow BeltimHub
            </p>
            <p>Dana pembayaran ditahan platform hingga barang dikonfirmasi diterima. Dana otomatis cair ke penjual dalam 3 hari.</p>
          </div>

          {/* Tombol beli */}
          {product.stock > 0 ? (
            <CheckoutButton productId={product.id} productName={product.name} totalPrice={totalPrice} />
          ) : (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground border rounded-lg py-3">
              <Package className="h-4 w-4" />
              Stok habis
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
