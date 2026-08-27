import React from "react";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { wisataData } from "@/lib/wisata-data";
import { getFeaturesConfig } from "@/lib/site-settings";
import {
  Calendar, ShoppingBag, Store, Briefcase, TreePalm,
  Newspaper, Megaphone, Info,
  MapPin, Star, Clock, ChevronRight,
  ShoppingCart, Globe, Sparkles, MessageSquare, Heart, Compass, Tag, FileText, ExternalLink
} from "lucide-react";
import { HeroSearch } from "./HeroSearch";
import { CtaCarousel } from "./CtaCarousel";

const ICON_MAP: Record<string, React.ElementType> = {
  Calendar, ShoppingCart, Megaphone, Briefcase, Store, TreePalm,
  Newspaper, Info, Globe, Sparkles, MessageSquare, Heart, Star,
  Compass, Tag, FileText,
};

const COLOR_MAP: Record<string, string> = {
  event: "bg-purple-100 text-purple-600",
  "pasar-lokal": "bg-teal-100 text-teal-600",
  umkm: "bg-orange-100 text-orange-600",
  loker: "bg-red-100 text-red-600",
  wisata: "bg-emerald-100 text-emerald-600",
  fjb: "bg-blue-100 text-blue-600",
  berita: "bg-sky-100 text-sky-600",
  info: "bg-slate-100 text-slate-600",
};

// ─── Helpers ───
function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ─── Data fetching ───
async function getHomeData() {
  const [events, productPool, listingPool, lokerPool, news, features] = await Promise.all([
    prisma.event.findMany({
      where: { status: "PUBLISHED", eventDate: { gte: new Date() } },
      orderBy: { eventDate: "asc" },
      take: 4,
      select: {
        id: true, title: true, coverImage: true, eventDate: true,
        location: true, price: true, category: true, quota: true,
        ticketCategories: { select: { price: true } },
      },
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 24,
      select: {
        id: true, name: true, price: true, images: true,
        umkm: { select: { name: true } },
      },
    }),
    prisma.listing.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 24,
      select: {
        id: true, title: true, price: true, images: true,
        location: true, isPremium: true,
        seller: { select: { nickname: true, fullName: true } },
      },
    }),
    prisma.jobListing.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 16,
      select: {
        id: true, title: true, company: true, location: true,
        salary: true, type: true,
      },
    }),
    prisma.news.findMany({
      where: { isActive: true },
      orderBy: { publishedAt: "desc" },
      take: 4,
      select: {
        id: true, title: true, snippet: true, imageUrl: true,
        publishedAt: true, sourceName: true,
      },
    }),
    getFeaturesConfig(),
  ]);

  // Iklan premium selalu tampil duluan, sisanya random
  const premiumListings = listingPool.filter((l) => l.isPremium);
  const regularListings = listingPool.filter((l) => !l.isPremium);
  const listings = [...premiumListings, ...pickRandom(regularListings, 6 - premiumListings.length)].slice(0, 6);

  return {
    events,
    products: pickRandom(productPool, 6),
    listings,
    lokerList: pickRandom(lokerPool, 4),
    news,
    features,
  };
}

function formatPrice(n: number) {
  if (n === 0) return "Gratis";
  return "Rp" + n.toLocaleString("id-ID");
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default async function HomePage() {
  const { events, products, listings, lokerList, news, features } = await getHomeData();
  const activeFeatures = features.filter(f => f.enabled);
  const enabledMap = new Map(features.map(f => [f.id, f.enabled]));

  const wisata = wisataData.slice(0, 4);

  const productTitles = [
    "Belanja dari UMKM Lokal",
    "Lagi Laris di Pasar Lokal",
    "Wajib Cek! Produk UMKM Beltim",
    "Produk Pilihan Minggu Ini",
  ];
  const productSectionTitle = productTitles[Math.floor(Math.random() * productTitles.length)];

  return (
    <div className="min-h-screen bg-background">
      {/* ══════════ HERO ══════════ */}
      <section className="relative bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/20" />
          <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-white/10" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-teal-200 text-sm font-medium tracking-wide uppercase mb-3">
              Platform Digital Belitung Timur
            </p>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight mb-4">
              Semua tentang <br className="hidden md:block" />
              <span className="text-amber-300">Belitung Timur</span> ada di sini
            </h1>
            <p className="text-teal-100 text-base md:text-lg mb-8 max-w-lg mx-auto">
              Event, belanja, UMKM, lowongan kerja, wisata, dan berita — satu platform untuk komunitas Beltim.
            </p>
            <HeroSearch />
          </div>
        </div>
      </section>


      {/* ══════════ SERVICE GRID ══════════ */}
      {activeFeatures.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 -mt-8 relative z-10">
          <div className="bg-white dark:bg-card rounded-2xl shadow-lg border p-4 md:p-6">
            <div className="flex items-start justify-around gap-1">
              {activeFeatures.map((s) => {
                const IconComp = ICON_MAP[s.iconName] || Sparkles;
                const colorClass = COLOR_MAP[s.id] || "bg-teal-100 text-teal-600";
                const isExternal = s.href.startsWith("http");
                const itemClass = "flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted/50 transition-colors group text-center flex-1 min-w-0";

                const inner = (
                  <>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass} group-hover:scale-110 transition-transform shrink-0`}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors leading-tight w-full">
                      {s.label}
                      {isExternal && <ExternalLink className="inline w-2.5 h-2.5 opacity-50 ml-0.5" />}
                    </span>
                  </>
                );

                return isExternal ? (
                  <a key={s.id} href={s.href} target="_blank" rel="noopener noreferrer" className={itemClass}>
                    {inner}
                  </a>
                ) : (
                  <Link key={s.id} href={s.href} className={itemClass}>
                    {inner}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}



      {/* ══════════ EVENTS ══════════ */}
      {enabledMap.get("event") !== false && events.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 mt-14">
          <SectionHeader title="Event Mendatang" href="/event" icon={Calendar} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
            {events.map((e) => {
              const minPrice = e.ticketCategories.length > 0
                ? Math.min(...e.ticketCategories.map((c) => c.price))
                : (e.price ?? 0);
              const isPublicEvent = minPrice === 0 && (e.quota ?? 0) >= 999999;
              const priceLabel = isPublicEvent ? "Gratis" : formatPrice(minPrice);
              return (
              <Link key={e.id} href={`/event/${e.id}`} className="group">
                <div className="bg-white dark:bg-card border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                  <div className="relative aspect-[16/9] bg-muted">
                    {e.coverImage ? (
                      <Image src={e.coverImage} alt={e.title} fill className="object-cover" sizes="300px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-purple-50">
                        <Calendar className="w-8 h-8 text-purple-300" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <span className="text-[10px] font-semibold bg-white/90 backdrop-blur px-2 py-0.5 rounded-full text-purple-600">
                        {e.category || "Event"}
                      </span>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-teal-600 transition-colors">
                      {e.title}
                    </h3>
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatDate(e.eventDate)}
                    </div>
                    {e.location && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span className="line-clamp-1">{e.location}</span>
                      </div>
                    )}
                    <p className="mt-2 text-sm font-bold text-teal-600">
                      {priceLabel}
                    </p>
                  </div>
                </div>
              </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ══════════ PRODUK POPULER ══════════ */}
      {enabledMap.get("pasar-lokal") !== false && products.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 mt-14">
          <SectionHeader title={productSectionTitle} href="/pasar-lokal" icon={ShoppingBag} />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5">
            {products.map((p) => (
              <Link key={p.id} href={`/pasar-lokal/${p.id}`} className="group">
                <div className="bg-white dark:bg-card border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                  <div className="relative aspect-square bg-muted">
                    {p.images?.[0] ? (
                      <Image src={p.images[0]} alt={p.name} fill className="object-cover" sizes="200px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-50 to-teal-100">
                        <ShoppingBag className="w-6 h-6 text-teal-300" />
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <h3 className="text-xs font-medium line-clamp-2 group-hover:text-teal-600 transition-colors">
                      {p.name}
                    </h3>
                    <p className="text-sm font-bold text-teal-600 mt-1">{formatPrice(p.price)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{p.umkm.name}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ══════════ IKLAN TERBARU (FJB) ══════════ */}
      {enabledMap.get("fjb") !== false && listings.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 mt-14">
          <SectionHeader title="Pilihan Menarik di FJB" href="/fjb" icon={Megaphone} />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5">
            {listings.map((l) => (
              <Link key={l.id} href={`/fjb/${l.id}`} className="group">
                <div className="bg-white dark:bg-card border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                  <div className="relative aspect-square bg-muted">
                    {l.images?.[0] ? (
                      <Image src={l.images[0]} alt={l.title} fill className="object-cover" sizes="200px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
                        <Megaphone className="w-6 h-6 text-blue-300" />
                      </div>
                    )}
                    {l.isPremium && (
                      <div className="absolute top-1.5 left-1.5">
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold bg-amber-500 text-white px-1.5 py-0.5 rounded-full">
                          <Star className="w-2.5 h-2.5" /> Unggulan
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <h3 className="text-xs font-medium line-clamp-2 group-hover:text-teal-600 transition-colors">
                      {l.title}
                    </h3>
                    <p className="text-sm font-bold text-teal-600 mt-1">{formatPrice(l.price)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                      {l.seller.nickname ?? l.seller.fullName}
                      {l.location && ` · ${l.location}`}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ══════════ WISATA ══════════ */}
      {enabledMap.get("wisata") !== false && (
        <section className="max-w-6xl mx-auto px-4 mt-14">
          <SectionHeader title="Jelajahi Wisata" href="/wisata" icon={TreePalm} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
            {wisata.map((w) => (
              <Link key={w.id} href={`/wisata/${w.id}`} className="group">
                <div className="bg-white dark:bg-card border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                  <div className="bg-gradient-to-br from-emerald-100 to-teal-50 p-6 text-center">
                    <span className="text-4xl">{w.emoji}</span>
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm group-hover:text-teal-600 transition-colors">
                      {w.name}
                    </h3>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {w.location}
                    </div>
                    {w.highlight && (
                      <span className="inline-block mt-2 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                        {w.highlight}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ══════════ LOKER ══════════ */}
      {enabledMap.get("loker") !== false && lokerList.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 mt-14">
          <SectionHeader title="Lowongan Terbaru" href="/loker" icon={Briefcase} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
            {lokerList.map((j) => (
              <Link key={j.id} href={`/loker/${j.id}`} className="group">
                <div className="bg-white dark:bg-card border rounded-xl p-4 hover:shadow-md transition-shadow flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                    <Briefcase className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm group-hover:text-teal-600 transition-colors line-clamp-1">
                      {j.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{j.company}</p>
                    <div className="flex items-center gap-3 mt-2">
                      {j.location && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <MapPin className="w-3 h-3" /> {j.location}
                        </span>
                      )}
                      {j.type && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                          {j.type}
                        </span>
                      )}
                    </div>
                  </div>
                  {j.salary && (
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-teal-600">{j.salary}</p>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ══════════ BERITA ══════════ */}
      {enabledMap.get("berita") !== false && news.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 mt-14">
          <SectionHeader title="Berita Terkini" href="/berita" icon={Newspaper} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
            {news.map((n) => (
              <Link key={n.id} href={`/berita#${n.id}`} className="group">
                <div className="bg-white dark:bg-card border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                  <div className="relative aspect-[16/9] bg-muted">
                    {n.imageUrl ? (
                      <Image src={n.imageUrl} alt={n.title} fill className="object-cover" sizes="300px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-50 to-sky-100">
                        <Newspaper className="w-8 h-8 text-sky-300" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-xs line-clamp-2 group-hover:text-teal-600 transition-colors">
                      {n.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                      <span>{n.sourceName}</span>
                      {n.publishedAt && (
                        <>
                          <span>·</span>
                          <span>{formatDate(n.publishedAt)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ══════════ CTA BOTTOM ══════════ */}
      <section className="max-w-6xl mx-auto px-4 mt-16 mb-16">
        <CtaCarousel />
      </section>
    </div>
  );
}

function SectionHeader({ title, href, icon: Icon }: { title: string; href: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-teal-600" />
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      <Link
        href={href}
        className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors"
      >
        Lihat Semua <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
