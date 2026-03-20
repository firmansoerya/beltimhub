"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ShieldCheck, MapPin, Phone, Instagram, Globe, MessageCircle,
  ExternalLink, Star, Package, ShoppingBag, Pencil, ShoppingCart,
} from "lucide-react";
import { UmkmReviewSection } from "./UmkmReviewSection";
import { ShareButton } from "@/components/ShareButton";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  ownerReply: string | null;
  ownerRepliedAt: string | null;
  createdAt: string;
  reviewer: { fullName: string; avatarUrl: string | null };
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  images: string[];
  category: string;
  soldCount: number;
}

interface UmkmData {
  id: string;
  name: string;
  category: string;
  description: string;
  address: string | null;
  phone: string | null;
  instagram: string | null;
  website: string | null;
  imageUrl: string | null;
  gallery: string[];
  mapsUrl: string | null;
  isVerified: boolean;
  isMarketplace: boolean;
  createdAt: string;
  reviews: Review[];
  products: Product[];
}

interface Props {
  umkm: UmkmData;
  isOwner: boolean;
  myReview: { id: string; rating: number; comment: string | null } | null;
  isLoggedIn: boolean;
  currentUserId: string | null;
}

type Tab = "produk" | "ulasan" | "info";

function RatingBar({ star, pct }: { star: number; pct: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground w-3 text-right">{star}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-muted-foreground w-7 text-right">{pct}%</span>
    </div>
  );
}

function StarDisplay({ rating, size = "sm" }: { rating: number; size?: "sm" | "xs" }) {
  const cls = size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`${cls} ${s <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"}`} />
      ))}
    </div>
  );
}

export function StoreFrontClient({ umkm, isOwner, myReview, isLoggedIn, currentUserId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>(umkm.isMarketplace ? "produk" : "ulasan");
  const [activeCat, setActiveCat] = useState("Semua");

  const avgRating = umkm.reviews.length > 0
    ? umkm.reviews.reduce((s, r) => s + r.rating, 0) / umkm.reviews.length
    : null;

  // Rating breakdown
  const ratingDist = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    umkm.reviews.forEach((r) => { if (r.rating >= 1 && r.rating <= 5) counts[r.rating - 1]++; });
    return [5, 4, 3, 2, 1].map((star) => ({
      star,
      pct: umkm.reviews.length > 0 ? Math.round((counts[star - 1] / umkm.reviews.length) * 100) : 0,
    }));
  }, [umkm.reviews]);

  // Category list from products
  const productCategories = useMemo(() => {
    const cats = new Map<string, number>();
    umkm.products.forEach((p) => cats.set(p.category, (cats.get(p.category) ?? 0) + 1));
    return [{ name: "Semua", count: umkm.products.length }, ...Array.from(cats.entries()).map(([name, count]) => ({ name, count }))];
  }, [umkm.products]);

  const filteredProducts = activeCat === "Semua"
    ? umkm.products
    : umkm.products.filter((p) => p.category === activeCat);

  const totalSold = umkm.products.reduce((s, p) => s + p.soldCount, 0);

  const waLink = umkm.phone
    ? `https://wa.me/62${umkm.phone.replace(/^0/, "")}?text=Halo, saya tertarik dengan usaha ${umkm.name} yang terdaftar di BeltimHub`
    : null;

  const joinYear = new Date(umkm.createdAt).getFullYear();

  const TABS: { key: Tab; label: string }[] = [
    ...(umkm.isMarketplace ? [{ key: "produk" as Tab, label: `Produk (${umkm.products.length})` }] : []),
    { key: "ulasan", label: `Ulasan (${umkm.reviews.length})` },
    { key: "info", label: "Info Toko" },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* ===== STORE HEADER ===== */}
      <div className="bg-foreground">
        {/* Cover */}
        <div className="h-36 md:h-48 relative overflow-hidden bg-gradient-to-br from-teal-900 via-teal-700 to-emerald-600">
          {umkm.gallery[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={umkm.gallery[0]} alt="Cover" className="w-full h-full object-cover opacity-30" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-foreground/60" />
          <div className="absolute top-3 left-4">
            <Link href="/umkm" className="text-xs text-white/50 hover:text-white/80 transition-colors">
              ← Kembali ke UMKM
            </Link>
          </div>
          <div className="absolute top-3 right-4">
            <ShareButton title={umkm.name} />
          </div>
        </div>

        {/* Info bar */}
        <div className="px-4 md:px-8 pb-0">
          <div className="flex items-end gap-4 -mt-10 md:-mt-12">
            {/* Avatar */}
            <div className="w-20 h-20 md:w-24 md:h-24 shrink-0 rounded-2xl border-4 border-foreground overflow-hidden bg-gradient-to-br from-teal-100 to-emerald-200 shadow-lg">
              {umkm.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={umkm.imageUrl} alt={umkm.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">🏪</div>
              )}
            </div>

            {/* Meta */}
            <div className="flex-1 min-w-0 pb-3 md:pb-4">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                {umkm.isVerified && (
                  <span className="inline-flex items-center gap-1 bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                    <ShieldCheck className="h-3 w-3" /> Terverifikasi
                  </span>
                )}
                {umkm.isMarketplace && (
                  <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                    <ShoppingBag className="h-3 w-3" /> Pasar Lokal
                  </span>
                )}
              </div>
              <h1 className="text-lg md:text-2xl font-bold text-white leading-tight">{umkm.name}</h1>
              <p className="text-xs md:text-sm text-white/50 mt-0.5 line-clamp-1">{umkm.category}</p>
            </div>

            {/* Desktop actions */}
            <div className="hidden md:flex gap-2 pb-4">
              {waLink && (
                <a href={waLink} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white border-0">
                    <MessageCircle className="h-3.5 w-3.5" />
                    Chat WA
                  </Button>
                </a>
              )}
              {isOwner && (
                <Link href={`/dashboard/umkm/${umkm.id}/edit`}>
                  <Button size="sm" variant="outline" className="gap-1.5 border-white/20 text-white hover:bg-white/10 hover:text-white bg-transparent">
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-4 md:gap-8 py-3 border-t border-white/10 mt-3">
            {avgRating !== null && (
              <div>
                <p className="text-amber-400 font-bold text-sm md:text-base">{avgRating.toFixed(1)} ★</p>
                <p className="text-white/35 text-[10px]">Rating</p>
              </div>
            )}
            {umkm.reviews.length > 0 && (
              <div>
                <p className="text-white font-bold text-sm md:text-base">{umkm.reviews.length}</p>
                <p className="text-white/35 text-[10px]">Ulasan</p>
              </div>
            )}
            {umkm.isMarketplace && (
              <div>
                <p className="text-white font-bold text-sm md:text-base">{umkm.products.length}</p>
                <p className="text-white/35 text-[10px]">Produk</p>
              </div>
            )}
            {totalSold > 0 && (
              <div>
                <p className="text-white font-bold text-sm md:text-base">{totalSold}+</p>
                <p className="text-white/35 text-[10px]">Terjual</p>
              </div>
            )}
            <div>
              <p className="text-white font-bold text-sm md:text-base">{joinYear}</p>
              <p className="text-white/35 text-[10px]">Bergabung</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-t border-white/10 -mx-4 md:-mx-8 px-4 md:px-8">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? "text-amber-400 border-amber-400"
                    : "text-white/40 border-transparent hover:text-white/70"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 grid md:grid-cols-[240px_1fr] gap-5 items-start">

        {/* ===== SIDEBAR ===== */}
        <aside className="flex flex-col gap-4 order-2 md:order-1">

          {/* Info Toko */}
          <Card>
            <CardContent className="p-4 space-y-0">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Info Toko</p>
              {umkm.address && (
                <div className="flex items-start gap-2.5 py-2.5 border-b">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Lokasi</p>
                    <p className="text-sm font-semibold">{umkm.address}</p>
                  </div>
                </div>
              )}
              {umkm.phone && (
                <div className="flex items-start gap-2.5 py-2.5 border-b">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Telepon</p>
                    <p className="text-sm font-semibold">{umkm.phone}</p>
                  </div>
                </div>
              )}
              {umkm.instagram && (
                <a
                  href={`https://instagram.com/${umkm.instagram.replace("@", "")}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-start gap-2.5 py-2.5 border-b hover:text-primary transition-colors"
                >
                  <Instagram className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Instagram</p>
                    <p className="text-sm font-semibold">@{umkm.instagram.replace("@", "")}</p>
                  </div>
                </a>
              )}
              {umkm.website && (
                <a
                  href={umkm.website}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-start gap-2.5 py-2.5 border-b hover:text-primary transition-colors"
                >
                  <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Website</p>
                    <p className="text-sm font-semibold truncate max-w-[160px]">{umkm.website.replace(/^https?:\/\//, "")}</p>
                  </div>
                </a>
              )}
              {umkm.mapsUrl && (
                <a
                  href={umkm.mapsUrl}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-start gap-2.5 py-2.5 hover:text-primary transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Maps</p>
                    <p className="text-sm font-semibold">Lihat di Google Maps</p>
                  </div>
                </a>
              )}
              {waLink && (
                <div className="pt-2">
                  <a href={waLink} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white border-0">
                      <MessageCircle className="h-3.5 w-3.5" />
                      Chat WhatsApp
                    </Button>
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rating Breakdown — hanya jika ada ulasan */}
          {umkm.reviews.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Rating Toko</p>
                <div className="text-center mb-4">
                  <p className="text-4xl font-bold leading-none">{avgRating!.toFixed(1)}</p>
                  <div className="flex justify-center mt-1.5">
                    <StarDisplay rating={Math.round(avgRating!)} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">dari {umkm.reviews.length} ulasan</p>
                </div>
                <div className="space-y-1.5">
                  {ratingDist.map(({ star, pct }) => (
                    <RatingBar key={star} star={star} pct={pct} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Category filter — hanya di tab produk */}
          {activeTab === "produk" && umkm.isMarketplace && productCategories.length > 2 && (
            <Card>
              <CardContent className="p-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Kategori</p>
                <div className="flex flex-col gap-1">
                  {productCategories.map(({ name, count }) => (
                    <button
                      key={name}
                      onClick={() => setActiveCat(name)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                        activeCat === name
                          ? "bg-foreground text-background font-semibold"
                          : "hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      <span>{name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeCat === name ? "bg-white/15 text-white" : "bg-muted-foreground/10"}`}>
                        {count}
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </aside>

        {/* ===== TAB CONTENT ===== */}
        <div className="order-1 md:order-2">

          {/* ── Tab: PRODUK ── */}
          {activeTab === "produk" && umkm.isMarketplace && (
            <div>
              {filteredProducts.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-muted-foreground text-sm">Belum ada produk di kategori ini.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filteredProducts.map((product) => (
                    <Card key={product.id} className="overflow-hidden group hover:shadow-md transition-all hover:-translate-y-0.5">
                      {/* Gambar */}
                      <div className="aspect-square bg-muted overflow-hidden relative">
                        {product.images[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl">🛍️</div>
                        )}
                        {product.stock <= 5 && product.stock > 0 && (
                          <span className="absolute top-2 right-2 text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                            Stok tipis
                          </span>
                        )}
                        {product.stock === 0 && (
                          <span className="absolute top-2 right-2 text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-md">
                            Habis
                          </span>
                        )}
                      </div>

                      {/* Body */}
                      <CardContent className="p-3">
                        <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-1">{product.category}</p>
                        <p className="text-sm font-semibold line-clamp-2 leading-snug mb-1.5 group-hover:text-primary transition-colors">{product.name}</p>
                        <p className="text-sm font-bold text-foreground mb-1">{formatPrice(product.price)}</p>
                        {product.soldCount > 0 && (
                          <p className="text-[10px] text-muted-foreground">{product.soldCount} terjual</p>
                        )}
                      </CardContent>

                      {/* Footer: tombol */}
                      <div className="px-3 pb-3 flex gap-2">
                        <Link href={`/pasar-lokal/${product.id}`} className="flex-1">
                          <button
                            disabled={product.stock === 0}
                            className="w-full flex items-center justify-center gap-1 text-xs font-bold py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <ShoppingCart className="h-3 w-3" />
                            Beli
                          </button>
                        </Link>
                        <Link href={`/pasar-lokal/${product.id}`} className="flex-1">
                          <button className="w-full text-xs font-bold py-2 rounded-lg border border-input hover:bg-muted transition-colors">
                            Detail
                          </button>
                        </Link>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Tab: ULASAN ── */}
          {activeTab === "ulasan" && (
            <div className="bg-white rounded-2xl border p-5">
              <UmkmReviewSection
                umkmId={umkm.id}
                reviews={umkm.reviews}
                myReview={myReview}
                isOwner={isOwner}
                isLoggedIn={isLoggedIn}
              />
            </div>
          )}

          {/* ── Tab: INFO TOKO ── */}
          {activeTab === "info" && (
            <div className="space-y-4">
              {/* Deskripsi */}
              <Card>
                <CardContent className="p-5">
                  <h2 className="font-semibold mb-3">Tentang Usaha</h2>
                  {umkm.description.startsWith("<") ? (
                    <div
                      className="prose prose-sm max-w-none text-muted-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground"
                      // eslint-disable-next-line react/no-danger
                      dangerouslySetInnerHTML={{ __html: umkm.description }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{umkm.description}</p>
                  )}
                </CardContent>
              </Card>

              {/* Gallery */}
              {umkm.gallery.length > 0 && (
                <Card>
                  <CardContent className="p-5">
                    <h2 className="font-semibold mb-3">Galeri</h2>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {umkm.gallery.map((img, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={img} alt={`Galeri ${i + 1}`} className="aspect-square object-cover rounded-lg" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* CTA join marketplace — hanya untuk owner yang belum join */}
              {!umkm.isMarketplace && isOwner && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
                  <div className="flex items-start gap-4">
                    <ShoppingBag className="h-7 w-7 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold mb-1">Buka Toko di Pasar Lokal</p>
                      <p className="text-sm text-muted-foreground mb-3">Jual produk UMKM dengan perlindungan escrow. Komisi hanya 3% per transaksi berhasil.</p>
                      <Link href={`/dashboard/umkm/${umkm.id}/edit`}>
                        <Button size="sm" className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white border-0">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Aktifkan Pasar Lokal
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* CTA join marketplace — untuk pengunjung/bukan owner */}
              {!umkm.isMarketplace && !isOwner && (
                <div className="bg-foreground rounded-2xl p-5 flex items-center gap-4">
                  <div className="text-2xl shrink-0">🪟</div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">Toko ini belum membuka lapak di Pasar Lokal</p>
                    <p className="text-xs text-white/40 mt-0.5">Pemilik usaha? Daftar gratis dengan proteksi escrow — komisi hanya 3%</p>
                  </div>
                  <Link href="/umkm/tambah" className="shrink-0">
                    <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-foreground font-bold border-0 whitespace-nowrap">
                      Buka Toko →
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent reviews preview di bawah produk — hanya jika tab produk aktif dan ada ulasan */}
      {activeTab === "produk" && umkm.reviews.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 md:px-8 pb-8">
          <Separator className="mb-6" />
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Ulasan Terbaru</h2>
            <button onClick={() => setActiveTab("ulasan")} className="text-sm text-primary hover:underline">
              Lihat semua ({umkm.reviews.length}) →
            </button>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {umkm.reviews.slice(0, 3).map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-full bg-muted overflow-hidden shrink-0">
                      {r.reviewer.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.reviewer.avatarUrl} alt={r.reviewer.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                          {r.reviewer.fullName[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{r.reviewer.fullName}</p>
                      <div className="flex items-center gap-1.5">
                        <StarDisplay rating={r.rating} size="xs" />
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true, locale: id })}
                        </span>
                      </div>
                    </div>
                  </div>
                  {r.comment && (
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{r.comment}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
