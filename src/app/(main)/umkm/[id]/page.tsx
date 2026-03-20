export const revalidate = 60;

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Phone, Instagram, Globe, MapPin, MessageCircle, Pencil, Star, ExternalLink, ShoppingBag, ShieldCheck, Package } from "lucide-react";
import { UmkmGallery } from "./UmkmGallery";
import { UmkmReviewSection } from "./UmkmReviewSection";
import { ShareButton } from "@/components/ShareButton";

function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
}

export default async function UmkmDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth();

  const [umkm, currentUser] = await Promise.all([
    prisma.umkm.findUnique({
      where: { id },
      include: {
        reviews: {
          include: { reviewer: { select: { fullName: true, avatarUrl: true } } },
          orderBy: { createdAt: "desc" },
        },
        products: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    userId ? prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } }) : null,
  ]);

  if (!umkm) notFound();

  const isOwner = !!currentUser && currentUser.id === umkm.ownerId;
  const myReview = currentUser ? umkm.reviews.find((r) => r.reviewerId === currentUser.id) : null;
  const avgRating = umkm.reviews.length > 0
    ? umkm.reviews.reduce((sum, r) => sum + r.rating, 0) / umkm.reviews.length
    : null;

  const waLink = umkm.phone
    ? `https://wa.me/62${umkm.phone.replace(/^0/, "")}?text=Halo, saya tertarik dengan usaha ${umkm.name} yang terdaftar di BeltimHub`
    : null;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <Link href="/umkm" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke UMKM
        </Link>
        <ShareButton title={umkm.name} />
      </div>

      {/* Header Toko */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-20 h-20 shrink-0 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-100 overflow-hidden">
          {umkm.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={umkm.imageUrl} alt={umkm.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">🏪</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge variant="outline">{umkm.category}</Badge>
            {umkm.isVerified && <Badge className="bg-teal-600 text-white">✓ Terverifikasi</Badge>}
            {umkm.isMarketplace && (
              <Badge className="bg-amber-500 text-white flex items-center gap-1">
                <ShoppingBag className="h-3 w-3" />
                Pasar Lokal
              </Badge>
            )}
          </div>
          <h1 className="text-xl font-bold">{umkm.name}</h1>
          {avgRating !== null && (
            <div className="flex items-center gap-1.5 mt-1">
              <div className="flex">
                {[1,2,3,4,5].map((s) => (
                  <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(avgRating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                ))}
              </div>
              <span className="text-sm font-medium">{avgRating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({umkm.reviews.length} ulasan)</span>
            </div>
          )}
          {umkm.address && (
            <div className="flex items-start gap-1 text-sm text-muted-foreground mt-1">
              <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{umkm.address}</span>
            </div>
          )}
          {isOwner && (
            <Link href={`/dashboard/umkm/${id}/edit`} className="inline-block mt-2">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" />
                Edit UMKM
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={umkm.isMarketplace ? "produk" : "info"}>
        <TabsList className="w-full justify-start mb-6">
          {umkm.isMarketplace && <TabsTrigger value="produk">Produk ({umkm.products.length})</TabsTrigger>}
          <TabsTrigger value="ulasan">Ulasan ({umkm.reviews.length})</TabsTrigger>
          <TabsTrigger value="info">Info Toko</TabsTrigger>
        </TabsList>

        {/* Tab Produk */}
        {umkm.isMarketplace && (
          <TabsContent value="produk">
            {umkm.products.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Belum ada produk tersedia.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {umkm.products.map((product) => (
                  <Link key={product.id} href={`/pasar-lokal/${product.id}`}>
                    <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
                      <div className="aspect-square overflow-hidden rounded-t-lg bg-muted">
                        {product.images[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">🛍️</div>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <p className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">{product.name}</p>
                        <p className="text-primary font-bold text-sm mt-1">{formatPrice(product.price)}</p>
                        {product.stock === 0 && (
                          <p className="text-xs text-red-500 mt-0.5">Stok habis</p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* Tab Ulasan */}
        <TabsContent value="ulasan">
          <UmkmReviewSection
            umkmId={id}
            reviews={umkm.reviews.map((r) => ({
              id: r.id,
              rating: r.rating,
              comment: r.comment,
              ownerReply: r.ownerReply,
              ownerRepliedAt: r.ownerRepliedAt ? r.ownerRepliedAt.toISOString() : null,
              createdAt: r.createdAt.toISOString(),
              reviewer: r.reviewer,
            }))}
            myReview={myReview ? { id: myReview.id, rating: myReview.rating, comment: myReview.comment } : null}
            isOwner={isOwner}
            isLoggedIn={!!currentUser}
          />
        </TabsContent>

        {/* Tab Info Toko */}
        <TabsContent value="info">
          <div className="space-y-5">
            {/* Gallery */}
            {umkm.gallery.length > 0 && (
              <div>
                <h2 className="font-semibold mb-3">Galeri</h2>
                <UmkmGallery images={umkm.gallery} name={umkm.name} />
              </div>
            )}

            {/* Deskripsi */}
            <div>
              <h2 className="font-semibold mb-2">Tentang Usaha</h2>
              {umkm.description.startsWith("<") ? (
                <div
                  className="prose prose-sm max-w-none text-muted-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground"
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: umkm.description }}
                />
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{umkm.description}</p>
              )}
            </div>

            <Separator />

            {/* Kontak */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Kontak & Sosial Media</p>
                {waLink && (
                  <a href={waLink} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full gap-2 bg-green-600 hover:bg-green-700">
                      <MessageCircle className="h-4 w-4" />
                      Hubungi via WhatsApp
                    </Button>
                  </a>
                )}
                {umkm.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {umkm.phone}
                  </div>
                )}
                {umkm.instagram && (
                  <a href={`https://instagram.com/${umkm.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                    <Instagram className="h-4 w-4 text-muted-foreground" />
                    @{umkm.instagram.replace("@", "")}
                  </a>
                )}
                {umkm.website && (
                  <a href={umkm.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    {umkm.website}
                  </a>
                )}
                {umkm.mapsUrl && (
                  <a href={umkm.mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    Lihat di Google Maps
                  </a>
                )}
              </CardContent>
            </Card>

            {/* CTA Pasar Lokal jika belum join */}
            {!umkm.isMarketplace && isOwner && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <ShoppingBag className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Buka Toko di Pasar Lokal</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Jual produk UMKM kamu dengan perlindungan escrow. Pembeli membayar, dana aman ditahan sampai barang diterima.
                    </p>
                    <Link href="/dashboard/umkm">
                      <Button size="sm" className="mt-3 gap-1.5 bg-amber-600 hover:bg-amber-700">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Daftarkan ke Pasar Lokal
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
