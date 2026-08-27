"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { UmkmReviewSection } from "./UmkmReviewSection";
import { ShareButton } from "@/components/ShareButton";

import { FloatingChatBox } from "@/components/FloatingChatBox";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  SHIPPING_METHOD_KEYS, SHIPPING_METHOD_LABELS,
  type ShippingConfig, type ShippingMethodKey,
} from "@/lib/constants";


/* ─── Color tokens ─── */
const C = {
  ink:    "#0F1923",
  ink2:   "#1E2D3D",
  sea:    "#006D77",
  sea2:   "#004F57",
  teal:   "#00A896",
  gold:   "#FFA800",
  gold2:  "#E09500",
  cream:  "#FFFDF9",
  sand:   "#FDF6EC",
  muted:  "#6B7D8F",
  border: "rgba(15,25,35,0.09)",
  success:"#16a34a",
};

/* ─── Types ─── */
interface Review {
  id: string; rating: number; comment: string | null;
  ownerReply: string | null; ownerRepliedAt: string | null;
  createdAt: string; reviewer: { fullName: string; avatarUrl: string | null };
}
interface Product {
  id: string; name: string; price: number; stock: number;
  images: string[]; category: string; soldCount: number;
}
interface UmkmData {
  id: string; name: string; category: string; description: string;
  address: string | null; phone: string | null; instagram: string | null;
  website: string | null; imageUrl: string | null; gallery: string[];
  mapsUrl: string | null; isVerified: boolean; marketplaceStatus: string;
  shippingMethods: string[]; shippingConfig: ShippingConfig | null;
  operatingHours: string | null; replyTime: string | null;
  createdAt: string; reviews: Review[]; products: Product[];
}
interface Props {
  umkm: UmkmData; isOwner: boolean;
  myReview: { id: string; rating: number; comment: string | null } | null;
  isLoggedIn: boolean; currentUserId: string | null;
}
type Tab = "produk" | "ulasan" | "info";

function fmt(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

/* ─── Stars ─── */
function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span style={{ color: C.gold, fontSize: size }}>
      {"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}
    </span>
  );
}

/* ─── Rating bar ─── */
function RatingBar({ star, pct }: { star: number; pct: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, fontSize: 11 }}>
      <span style={{ color: C.muted, width: 12, textAlign: "right" }}>{star}</span>
      <div style={{ flex: 1, height: 6, background: "#F0F2F4", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", background: C.gold, width: `${pct}%`, borderRadius: 3 }} />
      </div>
      <span style={{ color: C.muted, width: 28, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

/* ─── (Cart Modal removed — using global FloatingCart) ─── */


/* ═══════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════ */
export function StoreFrontClient({ umkm, isOwner, myReview, isLoggedIn }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>(umkm.marketplaceStatus === "APPROVED" ? "produk" : "info");
  const [activeCat, setActiveCat] = useState("Semua");
  const [sortBy, setSortBy] = useState<"newest" | "cheapest" | "expensive" | "bestseller">("newest");
  const avgRating = umkm.reviews.length > 0
    ? umkm.reviews.reduce((s, r) => s + r.rating, 0) / umkm.reviews.length
    : null;

  const ratingDist = useMemo(() => [5, 4, 3, 2, 1].map(star => ({
    star,
    pct: umkm.reviews.length > 0
      ? Math.round(umkm.reviews.filter(r => r.rating === star).length / umkm.reviews.length * 100)
      : 0,
  })), [umkm.reviews]);

  const productCategories = useMemo(() => {
    const cats = new Map<string, number>();
    umkm.products.forEach(p => cats.set(p.category, (cats.get(p.category) ?? 0) + 1));
    return [{ name: "Semua", count: umkm.products.length }, ...Array.from(cats.entries()).map(([name, count]) => ({ name, count }))];
  }, [umkm.products]);

  const filteredProducts = useMemo(() => {
    const base = activeCat === "Semua" ? umkm.products : umkm.products.filter(p => p.category === activeCat);
    return [...base].sort((a, b) => {
      if (sortBy === "cheapest") return a.price - b.price;
      if (sortBy === "expensive") return b.price - a.price;
      if (sortBy === "bestseller") return b.soldCount - a.soldCount;
      return 0; // newest — sudah urut dari server
    });
  }, [umkm.products, activeCat, sortBy]);

  const totalSold = umkm.products.reduce((s, p) => s + p.soldCount, 0);
  const joinYear  = new Date(umkm.createdAt).getFullYear();

  const waLink = umkm.phone
    ? `https://wa.me/62${umkm.phone.replace(/^0/, "")}?text=Halo, saya tertarik dengan usaha ${umkm.name} di BeltimHub`
    : null;

  const TABS: { key: Tab; label: string }[] = [
    ...(umkm.marketplaceStatus === "APPROVED" ? [{ key: "produk" as Tab, label: `🛒 Produk (${umkm.products.length})` }] : []),
    { key: "ulasan", label: `⭐ Ulasan (${umkm.reviews.length})` },
    { key: "info",   label: "📋 Info Toko" },
  ];

  /* ── Info row helper ── */
  const infoRow = (icon: string, label: string, value: string, href?: string) => {
    const inner = (
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>{label}</div>
          <div style={{ fontWeight: 600, color: C.ink, fontSize: 13 }}>{value}</div>
        </div>
      </div>
    );
    if (href) return <a key={label} href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block" }}>{inner}</a>;
    return <div key={label}>{inner}</div>;
  };

  return (
    <div style={{ fontFamily: "inherit" }}>

      {/* ══════════ STORE HEADER ══════════ */}
      <div style={{ background: C.ink }}>

        {/* Info bar */}
        <div className="px-4 md:px-8 py-5">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Avatar */}
            <div className="w-14 h-14 md:w-[72px] md:h-[72px] shrink-0" style={{ borderRadius: 18, background: "linear-gradient(135deg, #e0f7f7, #80deea)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.75rem", border: `2px solid rgba(255,255,255,0.12)`, overflow: "hidden" }}>
              {umkm.imageUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={umkm.imageUrl} alt={umkm.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : "🏪"}
            </div>

            {/* Meta */}
            <div style={{ flex: 1 }}>
              {umkm.marketplaceStatus === "APPROVED" && (
                <div style={{ marginBottom: 6 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: `rgba(255,168,0,0.15)`, color: C.gold, fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100 }}>
                    🛒 Pasar Lokal
                  </span>
                </div>
              )}
              <div className="text-lg md:text-[22px]" style={{ fontWeight: 700, color: "white", letterSpacing: -0.3, marginBottom: 4 }}>{umkm.name}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 300 }}>{umkm.category}{umkm.address ? ` · ${umkm.address}` : ""}</div>

              {/* Stats */}
              <div className="flex gap-4 md:gap-6 mt-3">
                {avgRating !== null && (
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.gold }}>{avgRating.toFixed(1)} ★</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Rating</div>
                  </div>
                )}
                {umkm.reviews.length > 0 && (
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{umkm.reviews.length.toLocaleString("id-ID")}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Ulasan</div>
                  </div>
                )}
                {umkm.marketplaceStatus === "APPROVED" && (
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{umkm.products.length}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Produk</div>
                  </div>
                )}
                {totalSold > 0 && (
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{totalSold.toLocaleString("id-ID")}+</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Terjual</div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{joinYear}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Bergabung</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
              <ShareButton title={umkm.name} />
              {!isOwner && umkm.marketplaceStatus !== "APPROVED" && waLink && (
                <a href={waLink} target="_blank" rel="noopener noreferrer"
                  style={{ background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.15)", fontSize: 12, fontWeight: 600, padding: "8px 18px", borderRadius: 100, cursor: "pointer", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                  💬 Chat WA
                </a>
              )}
              {isOwner && (
                <Link href={umkm.marketplaceStatus === "APPROVED" ? "/dashboard/toko" : `/dashboard/umkm/${umkm.id}/edit`}
                  style={{ background: C.teal, color: "white", border: "none", fontSize: 12, fontWeight: 600, padding: "8px 18px", borderRadius: 100, cursor: "pointer", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                  <Pencil size={13} /> {umkm.marketplaceStatus === "APPROVED" ? "Pengaturan Toko" : "Edit Toko"}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ background: "rgba(255,255,255,0.04)", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", paddingLeft: 32, paddingRight: 20 }}>
          <div style={{ display: "flex", flex: 1 }}>
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                style={{ fontSize: 12, fontWeight: 600, fontFamily: "inherit", color: activeTab === tab.key ? C.gold : "rgba(255,255,255,0.35)", padding: "13px 18px", cursor: "pointer", background: "none", border: "none", borderBottom: `2px solid ${activeTab === tab.key ? C.gold : "transparent"}`, transition: "all 0.2s", whiteSpace: "nowrap" }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════ MAIN GRID ══════════ */}
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-5 items-start" style={{ maxWidth: 1360, margin: "0 auto 40px", padding: "28px 16px 48px", background: "#F4F6F8", minHeight: "60vh" }}>

        {/* ── SIDEBAR ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Info Toko */}
          <div style={{ background: "white", borderRadius: 16, border: `1px solid ${C.border}`, padding: 18, overflow: "hidden" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>Info Toko</p>
            {umkm.address && infoRow("📍", "Lokasi", umkm.address)}
            {umkm.marketplaceStatus === "APPROVED" ? (
              <>
                {umkm.shippingConfig && (() => {
                  const enabled = SHIPPING_METHOD_KEYS.filter(k => umkm.shippingConfig?.[k]?.enabled);
                  if (enabled.length === 0) return null;
                  return (
                    <div key="shipping-methods" style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>🚚</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>Melayani Pengiriman</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {enabled.map(k => {
                              const m = SHIPPING_METHOD_LABELS[k];
                              const cfg = umkm.shippingConfig![k];
                              return (
                                <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                                  <span>{m.icon}</span>
                                  <span style={{ fontWeight: 600, color: C.ink }}>{m.label}</span>
                                  {cfg.fee === 0 && <span style={{ fontSize: 10, color: C.success, fontWeight: 600 }}>Gratis</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                {(umkm.shippingMethods?.length ?? 0) > 0 && infoRow("📋", "Ekspedisi", umkm.shippingMethods.join(", "))}
                {umkm.operatingHours && infoRow("🕐", "Jam Operasional", umkm.operatingHours)}
                {umkm.replyTime && infoRow("💬", "Balas Pesan", umkm.replyTime)}
              </>
            ) : (
              <>
                {umkm.phone && infoRow("📞", "Telepon", umkm.phone)}
                {umkm.instagram && infoRow("📸", "Instagram", `@${umkm.instagram.replace("@", "")}`, `https://instagram.com/${umkm.instagram.replace("@", "")}`)}
                {umkm.website && infoRow("🌐", "Website", umkm.website.replace(/^https?:\/\//, ""), umkm.website)}
                {umkm.mapsUrl && infoRow("🗺️", "Google Maps", "Lihat Lokasi", umkm.mapsUrl)}
                {!isOwner && waLink && (
                  <div style={{ paddingTop: 10 }}>
                    <a href={waLink} target="_blank" rel="noopener noreferrer"
                      style={{ display: "block", width: "100%", background: "#16a34a", color: "white", textAlign: "center", padding: "9px 0", borderRadius: 100, textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
                      💬 Hubungi via WhatsApp
                    </a>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Rating breakdown */}
          {umkm.reviews.length > 0 && avgRating !== null && (
            <div style={{ background: "white", borderRadius: 16, border: `1px solid ${C.border}`, padding: 18 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>Rating Toko</p>
              <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
                <div style={{ fontSize: 48, fontWeight: 700, color: C.ink, lineHeight: 1 }}>{avgRating.toFixed(1)}</div>
                <div style={{ color: C.gold, fontSize: 18, margin: "4px 0" }}>{"★".repeat(Math.round(avgRating))}</div>
                <div style={{ fontSize: 11, color: C.muted }}>dari {umkm.reviews.length} ulasan</div>
              </div>
              {ratingDist.map(({ star, pct }) => <RatingBar key={star} star={star} pct={pct} />)}
            </div>
          )}

          {/* Category filter — hanya saat tab produk */}
          {activeTab === "produk" && productCategories.length > 2 && (
            <div style={{ background: "white", borderRadius: 16, border: `1px solid ${C.border}`, padding: 18 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>Kategori Produk</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {productCategories.map(({ name, count }) => (
                  <button key={name} onClick={() => setActiveCat(name)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: 10, fontSize: 13, cursor: "pointer", fontFamily: "inherit", border: "none", textAlign: "left" as const, background: activeCat === name ? C.ink : "transparent", color: activeCat === name ? "white" : C.ink, transition: "all 0.18s" }}>
                    <span>{name}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, background: activeCat === name ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.06)", padding: "2px 7px", borderRadius: 100, color: activeCat === name ? "white" : C.muted }}>
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CTA join marketplace (bukan owner) */}
          {umkm.marketplaceStatus !== "APPROVED" && !isOwner && (
            <div style={{ background: `linear-gradient(135deg, ${C.ink} 0%, ${C.ink2} 100%)`, border: "1px solid rgba(255,168,0,0.2)", borderRadius: 16, padding: "20px 18px" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🪟</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 4 }}>Punya usaha di Belitung Timur?</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 12 }}>Perluas jangkauan bisnismu! Daftar gratis dan mulai berjualan online dengan proteksi escrow.</div>
              <Link href="/umkm/tambah" style={{ display: "block", background: C.gold, color: C.ink, textAlign: "center", padding: "9px 0", borderRadius: 100, textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
                Buka Toko Sekarang
              </Link>
            </div>
          )}

          {/* CTA join marketplace (owner - NONE/REJECTED) */}
          {(umkm.marketplaceStatus === "NONE" || umkm.marketplaceStatus === "REJECTED") && isOwner && (
            <div style={{ background: `linear-gradient(135deg, ${C.ink} 0%, ${C.ink2} 100%)`, border: "1px solid rgba(255,168,0,0.2)", borderRadius: 16, padding: "20px 18px" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🛍️</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 4 }}>Perluas Bisnismu dengan Berjualan Online!</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 12 }}>Jangkau lebih banyak pelanggan di Belitung Timur. Komisi hanya 3% per transaksi, dana dilindungi escrow.</div>
              <Link href={`/dashboard/umkm/${umkm.id}/marketplace`} style={{ display: "block", background: C.gold, color: C.ink, textAlign: "center", padding: "9px 0", borderRadius: 100, textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
                Aktifkan Sekarang
              </Link>
            </div>
          )}

          {/* CTA marketplace sedang ditinjau (owner - PENDING_REVIEW) */}
          {umkm.marketplaceStatus === "PENDING_REVIEW" && isOwner && (
            <div style={{ background: `linear-gradient(135deg, ${C.ink} 0%, ${C.ink2} 100%)`, border: "1px solid rgba(255,168,0,0.2)", borderRadius: 16, padding: "20px 18px" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 4 }}>Pengajuanmu Sedang Ditinjau</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Tim kami akan memproses pengajuan Pasar Lokal-mu dalam 1–3 hari kerja. Kami akan memberitahumu setelah selesai.</div>
            </div>
          )}
        </div>

        {/* ── MAIN CONTENT ── */}
        <div>

          {/* ── TAB: PRODUK ── */}
          {activeTab === "produk" && umkm.marketplaceStatus === "APPROVED" && (
            <>
              {umkm.products.length === 0 ? (
                <div style={{ textAlign: "center", padding: "64px 24px", background: "white", borderRadius: 20, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 56, marginBottom: 16 }}>📦</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: C.ink, marginBottom: 8 }}>Belum ada produk</div>
                  <div style={{ fontSize: 13, color: C.muted, maxWidth: 340, margin: "0 auto 24px", lineHeight: 1.6 }}>
                    {isOwner
                      ? "Tambahkan produk pertama kamu agar pembeli bisa langsung berbelanja dari toko ini."
                      : "Toko ini sedang mempersiapkan produk. Pantau terus atau hubungi penjual langsung via pesan."}
                  </div>
                  {isOwner && (
                    <Link href="/dashboard/toko/produk/tambah"
                      style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.gold, color: C.ink, textDecoration: "none", fontWeight: 700, fontSize: 13, padding: "11px 26px", borderRadius: 100 }}>
                      + Tambah Produk Pertama
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  {/* Toolbar */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>Semua Produk</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.muted }}>
                        <span>Urutkan</span>
                        <select
                          value={sortBy}
                          onChange={e => setSortBy(e.target.value as typeof sortBy)}
                          style={{ fontSize: 12, fontWeight: 600, color: C.ink, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "6px 10px", background: "white", cursor: "pointer", fontFamily: "inherit", outline: "none" }}
                        >
                          <option value="newest">Terbaru</option>
                          <option value="cheapest">Termurah</option>
                          <option value="expensive">Termahal</option>
                          <option value="bestseller">Terlaris</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {filteredProducts.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "48px 24px", background: "white", borderRadius: 16, border: `1px solid ${C.border}`, color: C.muted }}>
                      <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Tidak ada produk di kategori ini</div>
                      <button onClick={() => setActiveCat("Semua")} style={{ marginTop: 12, fontSize: 12, color: C.sea, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                        ← Tampilkan semua produk
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3 sm:gap-3.5">
                      {filteredProducts.map(product => (
                        <Link key={product.id} href={`/pasar-lokal/${product.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                          <div
                            style={{ background: "white", borderRadius: 16, border: `1px solid ${C.border}`, overflow: "hidden", display: "flex", flexDirection: "column", transition: "all 0.22s", position: "relative", height: "100%" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 32px rgba(15,25,35,0.1)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = ""; }}
                          >
                            {/* Image */}
                            <div style={{ aspectRatio: "1/1", background: "linear-gradient(135deg,#e0f7fa,#b2ebf2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3.5rem", position: "relative", overflow: "hidden" }}>
                              {product.images[0]
                                // eslint-disable-next-line @next/next/no-img-element
                                ? <img src={product.images[0]} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                : "🛍️"}
                              {product.stock <= 5 && product.stock > 0 && (
                                <span style={{ position: "absolute", top: 8, right: 8, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "#fef3c7", color: "#92400e" }}>Stok Tipis</span>
                              )}
                              {product.stock === 0 && (
                                <span style={{ position: "absolute", top: 8, right: 8, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "#fee2e2", color: "#991b1b" }}>Habis</span>
                              )}
                              {product.soldCount > 10 && product.stock > 5 && (
                                <span style={{ position: "absolute", top: 8, right: 8, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "#dcfce7", color: "#166534" }}>Terlaris</span>
                              )}
                            </div>

                            {/* Body */}
                            <div style={{ padding: "12px 12px 10px", flex: 1, display: "flex", flexDirection: "column" }}>
                              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35, marginBottom: 6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{product.name}</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: C.sea2, marginBottom: 4 }}>{fmt(product.price)}</div>
                              {product.soldCount > 0 && (
                                <div style={{ fontSize: 11, color: C.muted, marginTop: "auto" }}>{product.soldCount} terjual</div>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Preview ulasan di bawah produk */}
                  {umkm.reviews.length > 0 && (
                    <div style={{ marginTop: 28 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>Ulasan Terbaru</div>
                        <button onClick={() => setActiveTab("ulasan")} style={{ fontSize: 12, color: C.sea, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                          Lihat semua ({umkm.reviews.length}) →
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {umkm.reviews.slice(0, 4).map(r => (
                          <div key={r.id} style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                              <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${C.teal}, ${C.sea})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "white", fontWeight: 700, flexShrink: 0, overflow: "hidden" }}>
                                {r.reviewer.avatarUrl
                                  // eslint-disable-next-line @next/next/no-img-element
                                  ? <img src={r.reviewer.avatarUrl} alt={r.reviewer.fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  : r.reviewer.fullName[0]}
                              </div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 700 }}>{r.reviewer.fullName}</div>
                                <div style={{ fontSize: 10, color: C.muted }}>{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true, locale: idLocale })}</div>
                                <Stars rating={r.rating} size={12} />
                              </div>
                            </div>
                            {r.comment && <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{r.comment}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── TAB: ULASAN ── */}
          {activeTab === "ulasan" && (
            <div style={{ background: "white", borderRadius: 16, border: `1px solid ${C.border}`, padding: 24 }}>
              <UmkmReviewSection
                umkmId={umkm.id}
                reviews={umkm.reviews}
                myReview={myReview}
                isOwner={isOwner}
                isLoggedIn={isLoggedIn}
              />
            </div>
          )}

          {/* ── TAB: INFO TOKO ── */}
          {activeTab === "info" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Tentang Usaha</div>
                {umkm.description.startsWith("<")
                  ? <div className="prose prose-sm max-w-none" style={{ color: C.muted, fontSize: 13, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: umkm.description }} />
                  : <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{umkm.description}</p>
                }
              </div>
              {umkm.gallery.length > 0 && (
                <div style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Galeri</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {umkm.gallery.map((img, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={img} alt={`Galeri ${i + 1}`} style={{ aspectRatio: "1", objectFit: "cover", borderRadius: 10, width: "100%" }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Floating Chat (buyer only) ── */}
      {!isOwner && umkm.marketplaceStatus === "APPROVED" && (
        <FloatingChatBox umkmId={umkm.id} umkmName={umkm.name} umkmImageUrl={umkm.imageUrl} isLoggedIn={isLoggedIn} />
      )}
    </div>
  );
}
