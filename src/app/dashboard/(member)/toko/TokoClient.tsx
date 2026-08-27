"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Plus, Package, ShoppingBag, Star, Truck, Send,
  Eye, EyeOff, Trash2, MoreHorizontal, Loader2,
  CheckCircle2, Pencil, X, Clock, ExternalLink, Settings,
  MessageSquare, BarChart3, TrendingUp, DollarSign, Minus,
  Calendar, ChevronDown, Filter,
} from "lucide-react";
import { toast } from "sonner";
import { TokoSettingsPanel } from "./TokoSettingsPanel";

/* ─── Types ─── */
interface Product {
  id: string; name: string; price: number; stock: number;
  images: string[]; status: string;
  umkm: { name: string };
}

interface SellerReview {
  id: string; umkmId: string; umkmName: string;
  rating: number; comment: string | null;
  ownerReply: string | null; ownerRepliedAt: string | null;
  createdAt: string;
  reviewer: { fullName: string; avatarUrl: string | null };
}

interface OrderItemData {
  id: string; quantity: number; price: number;
  product: { name: string; images: string[] };
}

interface SellerOrder {
  id: string; orderStatus: string; sellerAmount: number;
  trackingNumber: string | null; courier: string | null;
  createdAt: string;
  buyer: { fullName: string };
  items: OrderItemData[];
}

interface ConvUser { id: string; fullName: string; avatarUrl: string | null }
interface ConvUmkm { id: string; name: string; imageUrl: string | null }

interface ConvItem {
  id: string;
  buyer: ConvUser; seller: ConvUser; umkm: ConvUmkm;
  lastMessage: { content: string; createdAt: string; senderId: string } | null;
  unreadCount: number;
  updatedAt: string;
}

interface ConvMessage {
  id: string; content: string; createdAt: string;
  senderId: string; sender: ConvUser;
}

interface CurrentUser { id: string; fullName: string; avatarUrl: string | null }
interface UmkmInfo { id: string; name: string }

type Tab = "ringkasan" | "produk" | "pesanan" | "saldo" | "ulasan" | "chat" | "pengaturan";

interface UmkmSettingsData {
  id: string; name: string; category: string; description: string;
  address: string; phone: string; instagram: string; website: string;
  mapsUrl: string; imageUrl: string;
  shippingConfig: import("@/lib/constants").ShippingConfig;
  operatingHours: string; replyTime: string;
  bankName: string; bankAccountNumber: string; bankAccountName: string;
}

interface Props {
  currentUser: CurrentUser;
  umkmList: UmkmInfo[];
  products: Product[];
  orders: SellerOrder[];
  reviews: SellerReview[];
  conversations: ConvItem[];
  hasMarketplaceUmkm: boolean;
  umkmSettings: UmkmSettingsData | null;
  initialTab?: Tab;
}

/* ─── Helpers ─── */
function formatPrice(n: number) {
  return "Rp" + new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(n);
}

const C = {
  teal: "#006D77", tealBg: "rgba(0,109,119,0.08)",
  dark: "#0F1923", muted: "#6B7D8F",
  border: "rgba(0,0,0,0.08)", bg: "#F8F9FA",
  gold: "#D4A017",
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  WAITING_PAYMENT: "Menunggu Bayar", PAID: "Sudah Dibayar",
  PROCESSING: "Diproses", SHIPPED: "Dikirim",
  COMPLETED: "Selesai", CANCELLED: "Dibatalkan",
};
const ORDER_STATUS_COLOR: Record<string, string> = {
  WAITING_PAYMENT: "#F59E0B", PAID: "#3B82F6",
  PROCESSING: "#6366F1", SHIPPED: "#8B5CF6",
  COMPLETED: "#10B981", CANCELLED: "#EF4444",
};

/* ─── Avatar ─── */
function Avatar({ user, size = 36 }: { user: { fullName: string; avatarUrl: string | null }; size?: number }) {
  if (user.avatarUrl)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.avatarUrl} alt={user.fullName} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg,${C.teal},#00A896)`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: size * 0.38, flexShrink: 0 }}>
      {user.fullName[0]}
    </div>
  );
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={11} style={{ fill: s <= rating ? "#FBBF24" : "none", color: s <= rating ? "#FBBF24" : "#CBD5E0" }} />
      ))}
    </div>
  );
}

function NavBtn({ icon: Icon, label, count, active, onClick, badgeColor }: {
  icon: React.ElementType; label: string; count?: number; active: boolean; onClick: () => void; badgeColor?: string;
}) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 9, width: "100%", textAlign: "left", border: "none", cursor: "pointer", background: active ? C.tealBg : "transparent", color: active ? C.teal : C.dark, fontWeight: active ? 700 : 500, fontSize: 13, transition: "all 0.15s" }}>
      <Icon size={15} style={{ flexShrink: 0, color: active ? C.teal : C.muted }} />
      <span style={{ flex: 1 }}>{label}</span>
      {!!count && count > 0 && (
        <span style={{ background: badgeColor ?? C.teal, color: "white", borderRadius: 100, fontSize: 9, fontWeight: 700, padding: "1px 6px", flexShrink: 0 }}>{count}</span>
      )}
    </button>
  );
}

/* ══════════ RINGKASAN (OVERVIEW) PANEL ══════════ */
type TxStatusFilter = "all" | "completed" | "active" | "cancelled";
type PeriodFilter = "today" | "7d" | "30d" | "this_month" | "this_year" | "all" | "custom";

function getDateRange(period: PeriodFilter, customFrom?: string, customTo?: string): { from: Date; to: Date } | null {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  switch (period) {
    case "today": return { from: startOfDay(now), to: endOfDay(now) };
    case "7d": { const d = new Date(now); d.setDate(d.getDate() - 7); return { from: startOfDay(d), to: endOfDay(now) }; }
    case "30d": { const d = new Date(now); d.setDate(d.getDate() - 30); return { from: startOfDay(d), to: endOfDay(now) }; }
    case "this_month": return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
    case "this_year": return { from: new Date(now.getFullYear(), 0, 1), to: endOfDay(now) };
    case "custom": {
      if (!customFrom || !customTo) return null;
      return { from: startOfDay(new Date(customFrom)), to: endOfDay(new Date(customTo)) };
    }
    default: return null;
  }
}

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  today: "Hari Ini", "7d": "7 Hari Terakhir", "30d": "30 Hari Terakhir",
  this_month: "Bulan Ini", this_year: "Tahun Ini", all: "Semua Waktu", custom: "Kustom",
};

function RingkasanPanel({ orders, products, reviews }: { orders: SellerOrder[]; products: Product[]; reviews: SellerReview[] }) {
  const [statusFilter, setStatusFilter] = useState<TxStatusFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SellerOrder | null>(null);
  const periodRef = useRef<HTMLDivElement>(null);

  // Close period dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (periodRef.current && !periodRef.current.contains(e.target as Node)) setShowPeriodMenu(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Filter by period
  const dateRange = getDateRange(periodFilter, customFrom, customTo);
  const periodOrders = dateRange
    ? orders.filter(o => { const d = new Date(o.createdAt); return d >= dateRange.from && d <= dateRange.to; })
    : orders;

  // Filter by status
  const filteredTx = statusFilter === "all" ? periodOrders
    : statusFilter === "completed" ? periodOrders.filter(o => o.orderStatus === "COMPLETED")
    : statusFilter === "active" ? periodOrders.filter(o => ["PAID", "PROCESSING", "SHIPPED"].includes(o.orderStatus))
    : periodOrders.filter(o => o.orderStatus === "CANCELLED");

  // Stats based on filtered period
  const completedOrders = periodOrders.filter(o => o.orderStatus === "COMPLETED");
  const totalRevenue = completedOrders.reduce((s, o) => s + o.sellerAmount, 0);
  const pendingRevenue = periodOrders
    .filter(o => ["PAID", "PROCESSING", "SHIPPED"].includes(o.orderStatus))
    .reduce((s, o) => s + o.sellerAmount, 0);
  const totalOrders = periodOrders.length;
  const activeProducts = products.filter(p => p.status === "ACTIVE").length;
  const totalSold = completedOrders
    .reduce((s, o) => s + o.items.reduce((si, i) => si + i.quantity, 0), 0);
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "-";
  const newOrders = periodOrders.filter(o => o.orderStatus === "PAID").length;
  const processingOrders = periodOrders.filter(o => o.orderStatus === "PROCESSING").length;

  const statCards: { label: string; value: string; sub?: string; icon: React.ElementType; color: string; bg: string; tip: string }[] = [
    { label: "Total Pesanan", value: String(totalOrders), sub: `${totalSold} item terjual`, icon: ShoppingBag, color: "#6366F1", bg: "#EEF2FF", tip: "Jumlah semua pesanan dalam periode yang dipilih." },
    { label: "Escrow Aktif", value: formatPrice(pendingRevenue), sub: `${periodOrders.filter(o => ["PAID","PROCESSING","SHIPPED"].includes(o.orderStatus)).length} pesanan berjalan`, icon: Clock, color: "#3B82F6", bg: "#EFF6FF", tip: "Dana dari pesanan yang belum selesai. Uang sudah dibayar buyer tapi masih ditahan sampai pesanan selesai." },
    { label: "Pendapatan", value: formatPrice(totalRevenue), sub: `${completedOrders.length} pesanan selesai`, icon: DollarSign, color: "#10B981", bg: "#ECFDF5", tip: "Total pendapatan bersih dari pesanan yang sudah selesai (sudah dipotong fee platform)." },
    { label: "Rating Toko", value: avgRating, sub: `${reviews.length} ulasan`, icon: Star, color: "#F59E0B", bg: "#FFFBEB", tip: "Rata-rata rating dari ulasan pembeli di semua produk toko." },
  ];

  const statusFilters: { key: TxStatusFilter; label: string; count: number }[] = [
    { key: "all", label: "Semua", count: periodOrders.length },
    { key: "active", label: "Aktif", count: periodOrders.filter(o => ["PAID", "PROCESSING", "SHIPPED"].includes(o.orderStatus)).length },
    { key: "completed", label: "Selesai", count: completedOrders.length },
    { key: "cancelled", label: "Dibatalkan", count: periodOrders.filter(o => o.orderStatus === "CANCELLED").length },
  ];

  // Low stock products (stock <= 5 and active)
  const lowStock = products.filter(p => p.status === "ACTIVE" && p.stock <= 5).sort((a, b) => a.stock - b.stock);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 24, background: C.bg }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontWeight: 700, fontSize: 15 }}>Ringkasan Toko</h2>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
            {activeProducts} produk aktif · {newOrders + processingOrders > 0
              ? <span style={{ color: "#3B82F6", fontWeight: 600 }}>{newOrders + processingOrders} perlu ditindaklanjuti</span>
              : "Semua pesanan terkendali"}
          </p>
        </div>
        {/* Period selector dropdown */}
        <div ref={periodRef} style={{ position: "relative" }}>
          <button onClick={() => setShowPeriodMenu(v => !v)} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10,
            border: `1px solid ${C.border}`, background: "white", cursor: "pointer", fontSize: 12, fontWeight: 600, color: C.dark,
          }}>
            <Calendar size={13} style={{ color: C.teal }} />
            {PERIOD_LABELS[periodFilter]}
            <ChevronDown size={13} style={{ color: C.muted }} />
          </button>
          {showPeriodMenu && (
            <div style={{
              position: "absolute", right: 0, top: "calc(100% + 4px)", background: "white", borderRadius: 12,
              border: `1px solid ${C.border}`, boxShadow: "0 8px 30px rgba(0,0,0,0.12)", zIndex: 20, minWidth: 200, overflow: "hidden",
            }}>
              {(Object.keys(PERIOD_LABELS) as PeriodFilter[]).filter(k => k !== "custom").map(key => (
                <button key={key} onClick={() => { setPeriodFilter(key); setShowPeriodMenu(false); }} style={{
                  display: "block", width: "100%", textAlign: "left", padding: "9px 16px", border: "none", cursor: "pointer",
                  background: periodFilter === key ? C.tealBg : "transparent", color: periodFilter === key ? C.teal : C.dark,
                  fontWeight: periodFilter === key ? 700 : 500, fontSize: 12, transition: "background 0.15s",
                }}
                  onMouseEnter={e => { if (periodFilter !== key) e.currentTarget.style.background = C.bg; }}
                  onMouseLeave={e => { if (periodFilter !== key) e.currentTarget.style.background = "transparent"; }}
                >
                  {PERIOD_LABELS[key]}
                </button>
              ))}
              <div style={{ borderTop: `1px solid ${C.border}`, padding: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8 }}>Rentang Kustom</p>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                    style={{ flex: 1, padding: "5px 8px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 11 }} />
                  <span style={{ fontSize: 11, color: C.muted }}>—</span>
                  <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                    style={{ flex: 1, padding: "5px 8px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 11 }} />
                </div>
                <button onClick={() => {
                  if (customFrom && customTo) { setPeriodFilter("custom"); setShowPeriodMenu(false); }
                }} disabled={!customFrom || !customTo} style={{
                  marginTop: 8, width: "100%", padding: "6px 0", borderRadius: 8, border: "none", cursor: customFrom && customTo ? "pointer" : "not-allowed",
                  background: customFrom && customTo ? C.teal : C.bg, color: customFrom && customTo ? "white" : C.muted, fontSize: 11, fontWeight: 600,
                }}>
                  Terapkan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} title={stat.tip} style={{ background: "white", borderRadius: 12, border: `1px solid ${C.border}`, padding: 16, cursor: "help" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{stat.label}</span>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: stat.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={15} style={{ color: stat.color }} />
                </div>
              </div>
              <p style={{ fontSize: 20, fontWeight: 800, color: C.dark }}>{stat.value}</p>
              {stat.sub && <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{stat.sub}</p>}
            </div>
          );
        })}
      </div>

      {/* Action needed */}
      {(newOrders > 0 || processingOrders > 0) && (
        <div style={{ background: "white", borderRadius: 12, border: `1px solid #006D7730`, padding: 16, marginBottom: 20, boxShadow: "0 0 0 1.5px #006D7720" }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Perlu Tindakan</h3>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {newOrders > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#EFF6FF", borderRadius: 8, padding: "8px 14px" }}>
                <Package size={14} style={{ color: "#3B82F6" }} />
                <span style={{ fontSize: 12 }}><strong>{newOrders}</strong> pesanan baru menunggu konfirmasi</span>
              </div>
            )}
            {processingOrders > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#EEF2FF", borderRadius: 8, padding: "8px 14px" }}>
                <Truck size={14} style={{ color: "#6366F1" }} />
                <span style={{ fontSize: 12 }}><strong>{processingOrders}</strong> pesanan perlu dikirim</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: lowStock.length > 0 ? "1fr 1fr" : "1fr", gap: 16 }}>
        {/* Transactions with filter */}
        <div style={{ background: "white", borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Riwayat Transaksi</span>
              <span style={{ fontSize: 11, color: C.muted }}>{filteredTx.length} pesanan</span>
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {statusFilters.map(f => {
                if (f.key !== "all" && f.count === 0) return null;
                const isActive = statusFilter === f.key;
                return (
                  <button key={f.key} onClick={() => setStatusFilter(f.key)} style={{
                    padding: "4px 10px", borderRadius: 100, border: `1px solid ${isActive ? C.teal : C.border}`,
                    background: isActive ? C.tealBg : "transparent", color: isActive ? C.teal : C.muted,
                    fontWeight: isActive ? 700 : 500, fontSize: 11, cursor: "pointer", transition: "all 0.15s",
                  }}>
                    {f.label}{f.key !== "all" && f.count > 0 ? ` (${f.count})` : ""}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ maxHeight: 320, overflowY: "auto" }}>
            {filteredTx.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: C.muted, fontSize: 12 }}>
                Tidak ada transaksi
              </div>
            ) : (
              filteredTx.map((order) => {
                const statusColor = ORDER_STATUS_COLOR[order.orderStatus] ?? C.muted;
                return (
                  <button key={order.id} onClick={() => setSelectedOrder(order)} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: `1px solid ${C.border}`,
                    width: "100%", textAlign: "left", background: "transparent", border: "none", borderBottomStyle: "solid",
                    cursor: "pointer", transition: "background 0.15s",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.buyer.fullName}</p>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 100, background: `${statusColor}18`, color: statusColor, flexShrink: 0 }}>
                          {ORDER_STATUS_LABEL[order.orderStatus]}
                        </span>
                      </div>
                      <p style={{ fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {order.items.map(i => i.product.name).join(", ")}
                      </p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: order.orderStatus === "CANCELLED" ? "#EF4444" : "#10B981", flexShrink: 0 }}>
                      {formatPrice(order.sellerAmount)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Low stock alerts */}
        {lowStock.length > 0 && (
          <div style={{ background: "white", borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Stok Menipis</span>
              <span style={{ fontSize: 11, color: "#EF4444", fontWeight: 600 }}>{lowStock.length} produk</span>
            </div>
            <div>
              {lowStock.slice(0, 5).map((p) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: C.bg, overflow: "hidden", flexShrink: 0 }}>
                    {p.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0]} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🛍️</div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                    <p style={{ fontSize: 11, color: p.stock === 0 ? "#EF4444" : "#F59E0B", fontWeight: 600 }}>
                      {p.stock === 0 ? "Habis" : `Sisa ${p.stock}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Transaction detail modal */}
      {selectedOrder && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setSelectedOrder(null)}
        >
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
          <div
            style={{ position: "relative", background: "white", borderRadius: 16, width: "100%", maxWidth: 440, maxHeight: "80vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "white", borderRadius: "16px 16px 0 0", zIndex: 1 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700 }}>Detail Transaksi</h3>
              <button onClick={() => setSelectedOrder(null)} style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: C.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ padding: "16px 20px" }}>
              {/* Status + buyer */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700 }}>{selectedOrder.buyer.fullName}</p>
                  <p style={{ fontSize: 11, color: C.muted }}>
                    {new Date(selectedOrder.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 100,
                  background: `${ORDER_STATUS_COLOR[selectedOrder.orderStatus] ?? C.muted}18`,
                  color: ORDER_STATUS_COLOR[selectedOrder.orderStatus] ?? C.muted,
                }}>
                  {ORDER_STATUS_LABEL[selectedOrder.orderStatus] ?? selectedOrder.orderStatus}
                </span>
              </div>

              {/* Items */}
              <div style={{ background: C.bg, borderRadius: 10, padding: 12, marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.4px" }}>Produk</p>
                {selectedOrder.items.map((item) => (
                  <div key={item.id} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: "white", overflow: "hidden", flexShrink: 0, border: `1px solid ${C.border}` }}>
                      {item.product.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.product.images[0]} alt={item.product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🛍️</div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600 }}>{item.product.name}</p>
                      <p style={{ fontSize: 11, color: C.muted }}>{item.quantity} x {formatPrice(item.price)}</p>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Tracking */}
              {selectedOrder.trackingNumber && (
                <div style={{ background: "#F5F3FF", borderRadius: 10, padding: 12, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <Truck size={14} style={{ color: "#6366F1", flexShrink: 0 }} />
                  <div style={{ fontSize: 12 }}>
                    {selectedOrder.courier && <span style={{ fontWeight: 600 }}>{selectedOrder.courier} </span>}
                    <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{selectedOrder.trackingNumber}</span>
                  </div>
                </div>
              )}

              {/* Revenue */}
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: C.muted }}>Pendapatan bersih</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: selectedOrder.orderStatus === "CANCELLED" ? "#EF4444" : C.teal }}>
                  {formatPrice(selectedOrder.sellerAmount)}
                </span>
              </div>

              {/* Link to full detail */}
              <Link href={`/orders/${selectedOrder.id}`} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                marginTop: 16, padding: "10px 16px", borderRadius: 10, border: `1px solid ${C.border}`,
                textDecoration: "none", color: C.muted, fontSize: 12, fontWeight: 600, transition: "all 0.15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.color = C.dark; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.muted; }}
              >
                <ExternalLink size={13} /> Lihat Detail Lengkap
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════ SALDO & PENARIKAN PANEL ══════════ */
interface BalanceData { totalEarnings: number; totalWithdrawn: number; totalPending: number; availableBalance: number }
interface WithdrawalData {
  id: string; amount: number; withdrawalFee: number; netAmount: number; status: string;
  bankName: string; bankAccountNumber: string; bankAccountName: string;
  rejectedReason: string | null; createdAt: string; completedAt: string | null;
  umkm: { name: string };
}

const WD_STATUS_LABEL: Record<string, string> = {
  PENDING: "Menunggu", PROCESSING: "Diproses", COMPLETED: "Selesai", FAILED: "Gagal", REJECTED: "Ditolak",
};
const WD_STATUS_COLOR: Record<string, string> = {
  PENDING: "#F59E0B", PROCESSING: "#3B82F6", COMPLETED: "#10B981", FAILED: "#EF4444", REJECTED: "#6B7D8F",
};

function SaldoPanel({ umkmList, umkmSettings }: { umkmList: UmkmInfo[]; umkmSettings: UmkmSettingsData | null }) {
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feeInfo, setFeeInfo] = useState<{ withdrawalFee: number; withdrawalMinimum: number } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [balRes, wdRes, feeRes] = await Promise.all([
        fetch("/api/marketplace/seller-balance"),
        fetch("/api/marketplace/withdrawals"),
        fetch("/api/admin/marketplace-fees").then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      if (balRes.ok) setBalance(await balRes.json());
      if (wdRes.ok) setWithdrawals(await wdRes.json());
      if (feeRes) setFeeInfo({ withdrawalFee: feeRes.withdrawalFee ?? 5000, withdrawalMinimum: feeRes.withdrawalMinimum ?? 50000 });
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleWithdraw() {
    const amt = parseInt(amount);
    if (isNaN(amt) || amt <= 0) { toast.error("Masukkan jumlah yang valid"); return; }
    if (!umkmList[0]) { toast.error("Tidak ada UMKM terdaftar"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/marketplace/withdrawals", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, umkmId: umkmList[0].id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal");
      toast.success("Penarikan berhasil diajukan");
      setShowForm(false);
      setAmount("");
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengajukan penarikan");
    } finally { setSubmitting(false); }
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
        <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: C.teal }} />
      </div>
    );
  }

  const bal = balance ?? { totalEarnings: 0, totalWithdrawn: 0, totalPending: 0, availableBalance: 0 };
  const fee = feeInfo?.withdrawalFee ?? 5000;
  const minWd = feeInfo?.withdrawalMinimum ?? 50000;
  const parsedAmt = parseInt(amount) || 0;
  const netPreview = parsedAmt > fee ? parsedAmt - fee : 0;
  const hasPending = withdrawals.some(w => w.status === "PENDING" || w.status === "PROCESSING");
  const bankInfo = umkmSettings;

  const balCards: { label: string; value: string; color: string; bg: string; icon: React.ElementType; tip: string }[] = [
    { label: "Total Penghasilan", value: formatPrice(bal.totalEarnings), color: "#6366F1", bg: "#EEF2FF", icon: BarChart3, tip: "Total seluruh pendapatan bersih dari semua pesanan yang sudah selesai." },
    { label: "Saldo Tersedia", value: formatPrice(bal.availableBalance), color: "#10B981", bg: "#ECFDF5", icon: DollarSign, tip: "Dana yang bisa ditarik ke rekening bank Anda saat ini." },
    { label: "Proses Pencairan", value: formatPrice(bal.totalPending), color: "#F59E0B", bg: "#FFFBEB", icon: Clock, tip: "Dana yang sudah diajukan penarikan dan sedang diproses ke rekening bank Anda." },
    { label: "Total Pencairan", value: formatPrice(bal.totalWithdrawn), color: "#3B82F6", bg: "#EFF6FF", icon: TrendingUp, tip: "Total dana yang sudah berhasil ditransfer ke rekening bank Anda." },
  ];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 24, background: C.bg }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <h2 style={{ fontWeight: 700, fontSize: 15 }}>Saldo & Penarikan</h2>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Kelola pencairan dana dari penjualan</p>
        </div>
        {bal.availableBalance >= minWd && !hasPending && (
          <button onClick={() => setShowForm(true)} style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8,
            background: C.teal, color: "white", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
          }}>
            Tarik Dana
          </button>
        )}
      </div>

      {/* Balance Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {balCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} title={s.tip} style={{ background: "white", borderRadius: 10, border: `1px solid ${C.border}`, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "help" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={15} style={{ color: s.color }} />
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 800, color: C.dark, lineHeight: 1.1 }}>{s.value}</p>
                <p style={{ fontSize: 10, color: C.muted, fontWeight: 500 }}>{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bank info card */}
      {bankInfo && (
        <div style={{ background: "white", borderRadius: 12, border: `1px solid ${C.border}`, padding: 16, marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 8 }}>Rekening Pencairan</p>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <DollarSign size={18} style={{ color: "#6366F1" }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700 }}>{bankInfo.bankName || "Belum diatur"}</p>
              <p style={{ fontSize: 12, color: C.muted }}>
                {bankInfo.bankAccountNumber ? `${bankInfo.bankAccountNumber} · ${bankInfo.bankAccountName}` : "Atur di Pengaturan Toko"}
              </p>
            </div>
          </div>
          <p style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
            Biaya penarikan: <strong>Rp{fee.toLocaleString("id-ID")}</strong> per transaksi · Minimum: <strong>Rp{minWd.toLocaleString("id-ID")}</strong>
          </p>
        </div>
      )}

      {/* Withdrawal Form Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowForm(false)}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
          <div style={{ position: "relative", background: "white", borderRadius: 16, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700 }}>Tarik Dana</h3>
              <button onClick={() => setShowForm(false)} style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: C.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ padding: "16px 20px" }}>
              <div style={{ background: "#ECFDF5", borderRadius: 10, padding: 12, marginBottom: 16, textAlign: "center" }}>
                <p style={{ fontSize: 11, color: "#065F46" }}>Saldo Tersedia</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: "#10B981" }}>{formatPrice(bal.availableBalance)}</p>
              </div>

              <label style={{ fontSize: 12, fontWeight: 600, color: C.dark, display: "block", marginBottom: 6 }}>Jumlah Penarikan</label>
              <input
                type="text" inputMode="numeric" value={amount ? parseInt(amount).toLocaleString("id-ID") : ""} onChange={e => setAmount(e.target.value.replace(/\D/g, ""))}
                placeholder={`Min. Rp${minWd.toLocaleString("id-ID")}`}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, marginBottom: 4, boxSizing: "border-box" }}
              />
              {parsedAmt > 0 && (
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>
                  Biaya penarikan: <strong>Rp{fee.toLocaleString("id-ID")}</strong> · Diterima: <strong style={{ color: "#10B981" }}>{formatPrice(netPreview)}</strong>
                </div>
              )}
              <button onClick={() => setAmount(String(bal.availableBalance))} style={{
                fontSize: 11, color: C.teal, background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0, marginBottom: 16,
              }}>
                Tarik semua saldo
              </button>

              <div style={{ background: C.bg, borderRadius: 8, padding: 10, marginBottom: 16, fontSize: 12 }}>
                <p style={{ fontWeight: 600, marginBottom: 4 }}>Transfer ke:</p>
                <p>{bankInfo?.bankName ?? "-"}</p>
                <p>{bankInfo?.bankAccountNumber ?? "-"} · {bankInfo?.bankAccountName ?? "-"}</p>
              </div>

              <button onClick={handleWithdraw} disabled={submitting || parsedAmt < minWd || parsedAmt > bal.availableBalance} style={{
                width: "100%", padding: "11px 0", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer",
                background: (submitting || parsedAmt < minWd || parsedAmt > bal.availableBalance) ? C.bg : C.teal,
                color: (submitting || parsedAmt < minWd || parsedAmt > bal.availableBalance) ? C.muted : "white",
              }}>
                {submitting ? "Memproses..." : "Ajukan Penarikan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal History */}
      <div style={{ background: "white", borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Riwayat Penarikan</span>
        </div>
        {withdrawals.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", color: C.muted, fontSize: 12 }}>
            Belum ada riwayat penarikan
          </div>
        ) : (
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {withdrawals.map((wd) => {
              const statusColor = WD_STATUS_COLOR[wd.status] ?? C.muted;
              return (
                <div key={wd.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{formatPrice(wd.amount)}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 100, background: `${statusColor}18`, color: statusColor }}>
                        {WD_STATUS_LABEL[wd.status] ?? wd.status}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: C.muted }}>
                      {wd.bankName} · {wd.bankAccountNumber} · Fee: {formatPrice(wd.withdrawalFee)} · Diterima: {formatPrice(wd.netAmount)}
                    </p>
                    {wd.rejectedReason && <p style={{ fontSize: 11, color: "#EF4444", marginTop: 2 }}>Alasan: {wd.rejectedReason}</p>}
                    <p style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                      {new Date(wd.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {wd.completedAt && ` · Cair: ${new Date(wd.completedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════ PRODUK PANEL ══════════ */
function ProdukPanel({ products: initialProducts, umkmList }: { products: Product[]; umkmList: UmkmInfo[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editStockId, setEditStockId] = useState<string | null>(null);
  const [stockValue, setStockValue] = useState("");

  async function toggleStatus(productId: string, newStatus: "ACTIVE" | "INACTIVE") {
    setLoadingId(productId);
    setOpenMenuId(null);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, status: newStatus } : p));
      toast.success(newStatus === "ACTIVE" ? "Produk diaktifkan" : "Produk dinonaktifkan");
    } catch {
      toast.error("Gagal memperbarui produk");
    } finally {
      setLoadingId(null);
    }
  }

  async function saveStock(productId: string) {
    const newStock = parseInt(stockValue);
    if (isNaN(newStock) || newStock < 0) { toast.error("Stok harus angka >= 0"); return; }
    setLoadingId(productId);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: newStock }),
      });
      if (!res.ok) throw new Error();
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: newStock } : p));
      setEditStockId(null);
      toast.success("Stok diperbarui");
    } catch {
      toast.error("Gagal memperbarui stok");
    } finally {
      setLoadingId(null);
    }
  }

  async function deleteProduct(productId: string) {
    if (!confirm("Hapus produk ini?")) return;
    setLoadingId(productId);
    setOpenMenuId(null);
    try {
      const res = await fetch(`/api/products/${productId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setProducts(prev => prev.filter(p => p.id !== productId));
      toast.success("Produk dihapus");
    } catch {
      toast.error("Gagal menghapus produk");
    } finally {
      setLoadingId(null);
    }
  }

  const activeCount = products.filter(p => p.status === "ACTIVE").length;
  const inactiveCount = products.filter(p => p.status === "INACTIVE").length;
  const outOfStock = products.filter(p => p.status === "ACTIVE" && p.stock === 0).length;
  const lowStockCount = products.filter(p => p.status === "ACTIVE" && p.stock > 0 && p.stock <= 5).length;
  const totalStockValue = products.filter(p => p.status === "ACTIVE").reduce((s, p) => s + p.price * p.stock, 0);

  const prodSummary: { label: string; value: string | number; color: string; bg: string; icon: React.ElementType }[] = [
    { label: "Produk Aktif", value: activeCount, color: "#10B981", bg: "#ECFDF5", icon: CheckCircle2 },
    { label: "Nonaktif", value: inactiveCount, color: "#6B7D8F", bg: "#F1F5F9", icon: EyeOff },
    { label: "Stok Habis", value: outOfStock, color: "#EF4444", bg: "#FEF2F2", icon: Package },
    { label: "Stok Menipis", value: lowStockCount, color: "#F59E0B", bg: "#FFFBEB", icon: TrendingUp },
    { label: "Nilai Inventori", value: formatPrice(totalStockValue), color: "#6366F1", bg: "#EEF2FF", icon: DollarSign },
  ];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 24, background: C.bg }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <h2 style={{ fontWeight: 700, fontSize: 15 }}>Kelola Produk</h2>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
            {activeCount} aktif · {products.length} total
          </p>
        </div>
        {umkmList.length > 0 && (
          <Link href="/dashboard/toko/produk/tambah" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: C.teal, color: "white", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
            <Plus size={14} /> Tambah Produk
          </Link>
        )}
      </div>

      {/* Summary Cards */}
      {products.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 18 }}>
          {prodSummary.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} style={{ background: "white", borderRadius: 10, border: `1px solid ${C.border}`, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={15} style={{ color: s.color }} />
                </div>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 800, color: C.dark, lineHeight: 1.1 }}>{s.value}</p>
                  <p style={{ fontSize: 10, color: C.muted, fontWeight: 500 }}>{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {products.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 24px", background: "white", borderRadius: 16, border: `1px solid ${C.border}` }}>
          <Package size={44} style={{ margin: "0 auto 14px", opacity: 0.2 }} />
          <p style={{ fontSize: 13, color: C.muted }}>Belum ada produk. Tambahkan produk pertama kamu!</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {products.map((product) => {
            const isEditingStock = editStockId === product.id;
            return (
              <div key={product.id} style={{ background: "white", borderRadius: 12, border: `1px solid ${C.border}`, padding: "12px 14px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: 10, background: C.bg, overflow: "hidden", flexShrink: 0 }}>
                  {product.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.images[0]} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🛍️</div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.name}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.teal, marginTop: 2 }}>{formatPrice(product.price)}</p>
                  <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 100, background: product.status === "ACTIVE" ? "#dcfce7" : "#f1f5f9", color: product.status === "ACTIVE" ? "#16a34a" : C.muted, fontWeight: 600 }}>
                      {product.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                    </span>
                    {/* Inline stock edit */}
                    {isEditingStock ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 11, color: C.muted }}>Stok:</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <button
                            onClick={() => setStockValue(String(Math.max(0, parseInt(stockValue || "0") - 1)))}
                            style={{ width: 22, height: 22, borderRadius: 4, border: `1px solid ${C.border}`, background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}
                          ><Minus size={11} /></button>
                          <input
                            type="number"
                            value={stockValue}
                            onChange={e => setStockValue(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") saveStock(product.id); if (e.key === "Escape") setEditStockId(null); }}
                            style={{ width: 48, textAlign: "center", border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 4px", fontSize: 12, outline: "none" }}
                            min="0"
                            autoFocus
                          />
                          <button
                            onClick={() => setStockValue(String(parseInt(stockValue || "0") + 1))}
                            style={{ width: 22, height: 22, borderRadius: 4, border: `1px solid ${C.border}`, background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}
                          ><Plus size={11} /></button>
                        </div>
                        <button
                          onClick={() => saveStock(product.id)}
                          disabled={loadingId === product.id}
                          style={{ padding: "2px 8px", borderRadius: 4, border: "none", background: C.teal, color: "white", cursor: "pointer", fontSize: 11, fontWeight: 600 }}
                        >
                          {loadingId === product.id ? <Loader2 size={10} className="animate-spin" /> : "OK"}
                        </button>
                        <button
                          onClick={() => setEditStockId(null)}
                          style={{ padding: "2px 6px", borderRadius: 4, border: `1px solid ${C.border}`, background: "transparent", cursor: "pointer", fontSize: 11, color: C.muted }}
                        ><X size={10} /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditStockId(product.id); setStockValue(String(product.stock)); setOpenMenuId(null); }}
                        style={{ fontSize: 11, color: product.stock <= 5 && product.status === "ACTIVE" ? "#EF4444" : C.muted, fontWeight: product.stock <= 5 && product.status === "ACTIVE" ? 600 : 400, background: "transparent", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline dotted", textUnderlineOffset: 2 }}
                        title="Klik untuk edit stok"
                      >
                        Stok: {product.stock}
                      </button>
                    )}
                    <span style={{ fontSize: 11, color: C.muted }}>· {product.umkm.name}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <button
                    onClick={() => setOpenMenuId(openMenuId === product.id ? null : product.id)}
                    disabled={loadingId === product.id}
                    style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${C.border}`, background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}
                  >
                    {loadingId === product.id ? <Loader2 size={15} className="animate-spin" /> : <MoreHorizontal size={15} />}
                  </button>
                  {openMenuId === product.id && (
                    <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "white", borderRadius: 10, border: `1px solid ${C.border}`, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 10, minWidth: 150, padding: 6 }}>
                      <Link href={`/dashboard/toko/produk/${product.id}/edit`} onClick={() => setOpenMenuId(null)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 7, textDecoration: "none", fontSize: 13, color: C.dark }}>
                        <Pencil size={14} /> Edit Produk
                      </Link>
                      {product.status === "ACTIVE" ? (
                        <button onClick={() => toggleStatus(product.id, "INACTIVE")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 7, border: "none", background: "transparent", cursor: "pointer", width: "100%", fontSize: 13, color: C.dark }}>
                          <EyeOff size={14} /> Nonaktifkan
                        </button>
                      ) : (
                        <button onClick={() => toggleStatus(product.id, "ACTIVE")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 7, border: "none", background: "transparent", cursor: "pointer", width: "100%", fontSize: 13, color: C.dark }}>
                          <Eye size={14} /> Aktifkan
                        </button>
                      )}
                      <button onClick={() => deleteProduct(product.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 7, border: "none", background: "transparent", cursor: "pointer", width: "100%", fontSize: 13, color: "#EF4444" }}>
                        <Trash2 size={14} /> Hapus
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════ PESANAN PANEL (seller) ══════════ */
type OrderFilter = "all" | "new" | "processing" | "shipped" | "completed" | "cancelled";

const ORDER_FILTERS: { key: OrderFilter; label: string; statuses: string[] }[] = [
  { key: "all", label: "Semua", statuses: [] },
  { key: "new", label: "Baru", statuses: ["PAID"] },
  { key: "processing", label: "Diproses", statuses: ["PROCESSING"] },
  { key: "shipped", label: "Dikirim", statuses: ["SHIPPED"] },
  { key: "completed", label: "Selesai", statuses: ["COMPLETED"] },
  { key: "cancelled", label: "Dibatalkan", statuses: ["CANCELLED"] },
];

function PesananPanel({ orders: initialOrders }: { orders: SellerOrder[] }) {
  const [orders, setOrders] = useState<SellerOrder[]>(initialOrders);
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [shippingForm, setShippingForm] = useState<string | null>(null);
  const [courier, setCourier] = useState("");
  const [tracking, setTracking] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filteredOrders = filter === "all"
    ? orders
    : orders.filter(o => ORDER_FILTERS.find(f => f.key === filter)?.statuses.includes(o.orderStatus));

  const filterCounts: Record<OrderFilter, number> = {
    all: orders.length,
    new: orders.filter(o => o.orderStatus === "PAID").length,
    processing: orders.filter(o => o.orderStatus === "PROCESSING").length,
    shipped: orders.filter(o => o.orderStatus === "SHIPPED").length,
    completed: orders.filter(o => o.orderStatus === "COMPLETED").length,
    cancelled: orders.filter(o => o.orderStatus === "CANCELLED").length,
  };

  async function acceptOrder(orderId: string) {
    if (!confirm("Terima dan proses pesanan ini?")) return;
    setLoadingId(orderId);
    try {
      const res = await fetch(`/api/orders/marketplace/${orderId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept_order" }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Gagal"); }
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, orderStatus: "PROCESSING" } : o));
      toast.success("Pesanan diterima & sedang diproses");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menerima pesanan");
    } finally {
      setLoadingId(null);
    }
  }

  async function confirmShipped(orderId: string) {
    if (!courier.trim()) { toast.error("Masukkan nama kurir"); return; }
    setLoadingId(orderId);
    try {
      const res = await fetch(`/api/orders/marketplace/${orderId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm_shipped", courier: courier.trim(), trackingNumber: tracking.trim() || undefined }),
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error ?? "Gagal");
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, orderStatus: updated.orderStatus, courier: updated.courier, trackingNumber: updated.trackingNumber } : o));
      setShippingForm(null);
      setCourier(""); setTracking("");
      toast.success("Status diperbarui ke Dikirim");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui status");
    } finally {
      setLoadingId(null);
    }
  }

  if (orders.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.muted, background: C.bg }}>
        <Clock size={44} style={{ opacity: 0.12, marginBottom: 14 }} />
        <p style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>Belum ada pesanan masuk</p>
        <p style={{ fontSize: 12, marginTop: 4 }}>Pesanan dari pembeli akan muncul di sini</p>
      </div>
    );
  }

  const completedTotal = orders.filter(o => o.orderStatus === "COMPLETED").reduce((s, o) => s + o.sellerAmount, 0);
  const escrowTotal = orders.filter(o => ["PAID", "PROCESSING", "SHIPPED"].includes(o.orderStatus)).reduce((s, o) => s + o.sellerAmount, 0);
  const avgOrderValue = orders.length > 0 ? orders.reduce((s, o) => s + o.sellerAmount, 0) / orders.length : 0;

  const orderSummary: { label: string; value: string | number; color: string; bg: string; icon: React.ElementType }[] = [
    { label: "Pesanan Baru", value: filterCounts.new, color: "#3B82F6", bg: "#EFF6FF", icon: Package },
    { label: "Diproses", value: filterCounts.processing, color: "#6366F1", bg: "#EEF2FF", icon: Clock },
    { label: "Dikirim", value: filterCounts.shipped, color: "#8B5CF6", bg: "#F5F3FF", icon: Truck },
    { label: "Selesai", value: filterCounts.completed, color: "#10B981", bg: "#ECFDF5", icon: CheckCircle2 },
    { label: "Pendapatan", value: formatPrice(completedTotal), color: "#006D77", bg: "#E6F7F8", icon: DollarSign },
  ];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 24, background: C.bg }}>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontWeight: 700, fontSize: 15 }}>Pesanan Masuk</h2>
        <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
          {filterCounts.new > 0 && <span style={{ color: "#3B82F6", fontWeight: 600 }}>{filterCounts.new} pesanan baru</span>}
          {filterCounts.new > 0 && filterCounts.processing > 0 && " · "}
          {filterCounts.processing > 0 && <span style={{ color: "#6366F1", fontWeight: 600 }}>{filterCounts.processing} sedang diproses</span>}
          {(filterCounts.new === 0 && filterCounts.processing === 0) && `${orders.length} total`}
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 18 }}>
        {orderSummary.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} style={{ background: "white", borderRadius: 10, border: `1px solid ${C.border}`, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={15} style={{ color: s.color }} />
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 800, color: C.dark, lineHeight: 1.1 }}>{s.value}</p>
                <p style={{ fontSize: 10, color: C.muted, fontWeight: 500 }}>{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tab filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {ORDER_FILTERS.map(f => {
          const count = filterCounts[f.key];
          if (f.key !== "all" && count === 0) return null;
          const isActive = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: "6px 14px", borderRadius: 100, border: `1.5px solid ${isActive ? C.teal : C.border}`,
                background: isActive ? C.tealBg : "white", color: isActive ? C.teal : C.muted,
                fontWeight: isActive ? 700 : 500, fontSize: 12, cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 6, transition: "all 0.15s",
              }}
            >
              {f.label}
              {count > 0 && f.key !== "all" && (
                <span style={{ background: isActive ? C.teal : C.border, color: isActive ? "white" : C.muted, borderRadius: 100, fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {filteredOrders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", background: "white", borderRadius: 12, border: `1px solid ${C.border}` }}>
          <Package size={32} style={{ margin: "0 auto 10px", opacity: 0.15 }} />
          <p style={{ fontSize: 13, color: C.muted }}>Tidak ada pesanan di kategori ini</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredOrders.map((order) => {
            const isLoading = loadingId === order.id;
            const statusColor = ORDER_STATUS_COLOR[order.orderStatus] ?? C.muted;
            const isNew = order.orderStatus === "PAID";
            const isProcessing = order.orderStatus === "PROCESSING";
            const needsAction = isNew || isProcessing;
            const isShippingOpen = shippingForm === order.id;

            return (
              <div key={order.id} style={{ background: "white", borderRadius: 12, border: `1px solid ${needsAction ? "#006D7730" : C.border}`, padding: 16, ...(needsAction ? { boxShadow: "0 0 0 1.5px #006D7720" } : {}) }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700 }}>{order.buyer.fullName}</p>
                    <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                      {new Date(order.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: `${statusColor}18`, color: statusColor, flexShrink: 0 }}>
                    {ORDER_STATUS_LABEL[order.orderStatus] ?? order.orderStatus}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                  {order.items.map((item) => (
                    <div key={item.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{ width: 38, height: 38, borderRadius: 8, background: C.bg, overflow: "hidden", flexShrink: 0 }}>
                        {item.product.images[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.product.images[0]} alt={item.product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.product.name}</p>
                        <p style={{ fontSize: 11, color: C.muted }}>×{item.quantity} · {formatPrice(item.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {order.trackingNumber && (
                  <div style={{ background: C.bg, borderRadius: 8, padding: "7px 12px", marginBottom: 12, fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>
                    <Truck size={12} style={{ color: C.muted }} />
                    <span style={{ color: C.muted }}>Resi:</span>
                    <span style={{ fontWeight: 600 }}>{order.courier} {order.trackingNumber}</span>
                  </div>
                )}

                {/* Shipping form (inline expand) — only for PROCESSING */}
                {isShippingOpen && (
                  <div style={{ background: C.bg, borderRadius: 10, padding: 14, marginBottom: 12, border: `1px solid ${C.border}` }}>
                    <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Informasi Pengiriman</p>
                    <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 11, color: C.muted, display: "block", marginBottom: 4 }}>Kurir *</label>
                        <input value={courier} onChange={e => setCourier(e.target.value)} placeholder="cth: JNE, Sicepat, Ambil di Toko" style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 11, color: C.muted, display: "block", marginBottom: 4 }}>No. Resi (opsional)</label>
                        <input value={tracking} onChange={e => setTracking(e.target.value)} placeholder="cth: JNE123456789" style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => confirmShipped(order.id)} disabled={isLoading || !courier.trim()} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: isLoading || !courier.trim() ? "#ccc" : C.teal, color: "white", border: "none", cursor: isLoading || !courier.trim() ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600 }}>
                        {isLoading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Konfirmasi Kirim
                      </button>
                      <button onClick={() => { setShippingForm(null); setCourier(""); setTracking(""); }} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", cursor: "pointer", fontSize: 12, color: C.muted }}>Batal</button>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                  <p style={{ fontWeight: 700, fontSize: 14 }}>{formatPrice(order.sellerAmount)} <span style={{ fontSize: 11, fontWeight: 400, color: C.muted }}>(setelah fee)</span></p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {/* PAID: Tombol Terima Pesanan */}
                    {isNew && (
                      <button onClick={() => acceptOrder(order.id)} disabled={isLoading} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: isLoading ? "#ccc" : "#3B82F6", color: "white", border: "none", cursor: isLoading ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600, opacity: isLoading ? 0.7 : 1 }}>
                        {isLoading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Terima Pesanan
                      </button>
                    )}
                    {/* PROCESSING: Tombol Proses Pengiriman */}
                    {isProcessing && !isShippingOpen && (
                      <button onClick={() => { setShippingForm(order.id); setCourier(""); setTracking(""); }} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: C.teal, color: "white", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                        <Truck size={13} /> Proses Pengiriman
                      </button>
                    )}
                    {order.orderStatus === "SHIPPED" && (
                      <span style={{ fontSize: 12, color: C.muted, display: "flex", alignItems: "center", gap: 6 }}>
                        <Truck size={13} /> Menunggu konfirmasi pembeli
                      </span>
                    )}
                    {order.orderStatus === "COMPLETED" && (
                      <span style={{ fontSize: 12, color: "#10B981", display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                        <CheckCircle2 size={13} /> Selesai
                      </span>
                    )}
                    {/* Link ke detail */}
                    <Link href={`/orders/${order.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, textDecoration: "none", fontSize: 12 }}>
                      Detail
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════ ULASAN PANEL (seller) ══════════ */
function UlasanPanel({ reviews: initialReviews }: { reviews: SellerReview[] }) {
  const [reviews, setReviews] = useState<SellerReview[]>(initialReviews);
  const [replyMode, setReplyMode] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function saveReply(reviewId: string, umkmId: string, reply: string | null) {
    setLoadingId(reviewId);
    try {
      const res = await fetch(`/api/umkm/${umkmId}/review?reviewId=${reviewId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerReply: reply }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, ownerReply: updated.ownerReply, ownerRepliedAt: updated.ownerRepliedAt } : r));
      setReplyMode(null); setReplyText("");
      toast.success(reply ? "Balasan disimpan" : "Balasan dihapus");
    } catch {
      toast.error("Gagal menyimpan balasan");
    } finally {
      setLoadingId(null);
    }
  }

  if (reviews.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.muted, background: C.bg }}>
        <Star size={44} style={{ opacity: 0.12, marginBottom: 14 }} />
        <p style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>Belum ada ulasan</p>
        <p style={{ fontSize: 12, marginTop: 4 }}>Ulasan dari pembeli akan muncul di sini</p>
      </div>
    );
  }

  const pendingCount = reviews.filter(r => !r.ownerReply).length;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 24, background: C.bg }}>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontWeight: 700, fontSize: 15 }}>Ulasan Pembeli</h2>
        <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
          {reviews.length} ulasan
          {pendingCount > 0 && <> · <span style={{ color: "#F59E0B", fontWeight: 600 }}>{pendingCount} belum dibalas</span></>}
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {reviews.map((review) => {
          const isReplyOpen = replyMode === review.id;
          const isLoading = loadingId === review.id;

          return (
            <div key={review.id} style={{ background: "white", borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
              <div style={{ fontSize: 10, color: C.teal, fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                🏪 {review.umkmName}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <Avatar user={review.reviewer} size={32} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 13 }}>{review.reviewer.fullName}</p>
                      <StarRow rating={review.rating} />
                    </div>
                    <span style={{ fontSize: 10, color: C.muted }}>
                      {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true, locale: idLocale })}
                    </span>
                  </div>
                  {review.comment && <p style={{ fontSize: 12, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>{review.comment}</p>}
                </div>
              </div>

              {review.ownerReply && !isReplyOpen && (
                <div style={{ marginTop: 10, marginLeft: 42, paddingLeft: 12, borderLeft: `2px solid ${C.teal}40` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.teal }}>Balasan Anda</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => { setReplyMode(review.id); setReplyText(review.ownerReply ?? ""); }} style={{ padding: 4, border: "none", background: "transparent", cursor: "pointer", color: C.muted }}>
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => saveReply(review.id, review.umkmId, null)} disabled={isLoading} style={{ padding: 4, border: "none", background: "transparent", cursor: "pointer", color: C.muted }}>
                        {isLoading ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                      </button>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>{review.ownerReply}</p>
                </div>
              )}

              {isReplyOpen ? (
                <div style={{ marginTop: 10, marginLeft: 42 }}>
                  <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Tulis balasan..." rows={2} style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, fontFamily: "inherit", resize: "none", outline: "none", boxSizing: "border-box" }} autoFocus />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button onClick={() => saveReply(review.id, review.umkmId, replyText.trim() || null)} disabled={isLoading || !replyText.trim()} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 8, background: isLoading || !replyText.trim() ? "#ccc" : C.teal, color: "white", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                      {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Kirim
                    </button>
                    <button onClick={() => { setReplyMode(null); setReplyText(""); }} style={{ padding: "5px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", cursor: "pointer", fontSize: 12, color: C.muted }}>Batal</button>
                  </div>
                </div>
              ) : !review.ownerReply && (
                <div style={{ marginTop: 10, marginLeft: 42 }}>
                  <button onClick={() => { setReplyMode(review.id); setReplyText(""); }} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", cursor: "pointer", fontSize: 12, color: C.muted }}>
                    <Pencil size={12} /> Balas
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════ SELLER CHAT PANEL ══════════ */
function SellerChatPanel({ conversations: initialConvs, currentUserId }: {
  conversations: ConvItem[]; currentUserId: string;
}) {
  const router = useRouter();
  const [convs, setConvs] = useState<ConvItem[]>(initialConvs);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConvMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeConv = convs.find((c) => c.id === activeId);
  const otherUser = activeConv ? activeConv.buyer : null;

  const loadMessages = useCallback(async (convId: string, silent = false) => {
    if (!silent) setLoadingMsgs(true);
    try {
      const res = await fetch(`/api/chat/conversations/${convId}`);
      if (!res.ok) return;
      const data = await res.json();
      const hadUnread = !silent;
      setMessages(data.conversation.messages);
      setConvs(prev => prev.map(c => c.id === convId ? { ...c, unreadCount: 0 } : c));
      if (hadUnread) router.refresh();
    } finally {
      if (!silent) setLoadingMsgs(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeId) return;
    loadMessages(activeId);
    pollRef.current = setInterval(() => loadMessages(activeId, true), 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeId, loadMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send() {
    if (!input.trim() || !activeId || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    try {
      const res = await fetch(`/api/chat/conversations/${activeId}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) return;
      const { message } = await res.json();
      setMessages(prev => [...prev, message]);
      setConvs(prev => prev.map(c =>
        c.id === activeId ? { ...c, lastMessage: { content, createdAt: message.createdAt, senderId: currentUserId }, updatedAt: message.createdAt } : c
      ));
    } finally { setSending(false); }
  }

  async function deleteConv(id: string) {
    if (!confirm("Hapus percakapan ini? Semua pesan akan dihapus permanen.")) return;
    try {
      const res = await fetch(`/api/chat/conversations/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Gagal menghapus percakapan"); return; }
      setConvs(prev => prev.filter(c => c.id !== id));
      if (activeId === id) { setActiveId(null); setMessages([]); }
      toast.success("Percakapan dihapus");
    } catch { toast.error("Terjadi kesalahan"); }
  }

  return (
    <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
      {/* Conversation list */}
      <div style={{ width: 260, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0, background: "white" }}>
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Pesan Masuk {convs.length > 0 && `(${convs.length})`}
          </p>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {convs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 16px", color: C.muted }}>
              <MessageSquare size={28} style={{ margin: "0 auto 10px", opacity: 0.25 }} />
              <p style={{ fontSize: 12 }}>Belum ada chat dari pembeli</p>
              <p style={{ fontSize: 11, marginTop: 4 }}>Pesan dari calon pembeli akan muncul di sini</p>
            </div>
          ) : convs.map((c) => {
            const isActive = c.id === activeId;
            return (
              <div key={c.id} onClick={() => setActiveId(c.id)} className="group" style={{ display: "flex", gap: 10, padding: "11px 14px", cursor: "pointer", background: isActive ? C.tealBg : "transparent", borderLeft: `3px solid ${isActive ? C.teal : "transparent"}`, transition: "all 0.15s", position: "relative" }}>
                <Avatar user={c.buyer} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontWeight: c.unreadCount > 0 ? 700 : 600, fontSize: 13, color: C.dark }}>{c.buyer.fullName}</span>
                    <span style={{ fontSize: 10, color: C.muted, flexShrink: 0, marginLeft: 4 }}>
                      {c.lastMessage ? formatDistanceToNow(new Date(c.lastMessage.createdAt), { addSuffix: false, locale: idLocale }) : ""}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                    <span style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 155, fontWeight: c.unreadCount > 0 ? 600 : 400, color: c.unreadCount > 0 ? C.dark : C.muted }}>
                      {c.lastMessage ? (c.lastMessage.senderId === currentUserId ? "Kamu: " : "") + c.lastMessage.content : <em>Percakapan baru</em>}
                    </span>
                    {c.unreadCount > 0 && (
                      <span style={{ background: C.teal, color: "white", borderRadius: 100, fontSize: 9, fontWeight: 700, padding: "1px 6px", flexShrink: 0 }}>{c.unreadCount}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConv(c.id); }}
                  className="opacity-0 group-hover:opacity-100"
                  style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.06)", border: "none", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "opacity 0.15s" }}
                  title="Hapus percakapan"
                >
                  <X size={12} style={{ color: C.muted }} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Message area */}
      {!activeId ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.muted, background: C.bg }}>
          <MessageSquare size={44} style={{ opacity: 0.12, marginBottom: 14 }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>Pilih percakapan</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Chat dari calon pembeli akan muncul di panel kiri</p>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ padding: "11px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12, background: "white" }}>
            {otherUser && <Avatar user={otherUser} size={34} />}
            <div style={{ fontWeight: 700, fontSize: 14 }}>{otherUser?.fullName}</div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8, background: C.bg }}>
            {loadingMsgs ? (
              <div style={{ textAlign: "center", padding: 40 }}><Loader2 size={20} style={{ margin: "0 auto", opacity: 0.3 }} className="animate-spin" /></div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: "center", color: C.muted, fontSize: 12, padding: "32px 0" }}>Belum ada pesan. Mulai percakapan!</div>
            ) : messages.map((m, i) => {
              const isMine = m.senderId === currentUserId;
              const prevMsg = messages[i - 1];
              const showDate = !prevMsg || format(new Date(m.createdAt), "dd/MM/yyyy") !== format(new Date(prevMsg.createdAt), "dd/MM/yyyy");
              return (
                <div key={m.id}>
                  {showDate && <div style={{ textAlign: "center", margin: "8px 0", fontSize: 11, color: C.muted }}>{format(new Date(m.createdAt), "EEEE, dd MMM yyyy", { locale: idLocale })}</div>}
                  <div style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
                    <div style={{ maxWidth: "70%", padding: "9px 13px", borderRadius: isMine ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: isMine ? C.dark : "white", color: isMine ? "white" : C.dark, fontSize: 13, lineHeight: 1.5 }}>
                      {m.content}
                      <div style={{ fontSize: 10, opacity: 0.5, marginTop: 3, textAlign: "right" }}>{format(new Date(m.createdAt), "HH:mm")}</div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <div style={{ padding: "10px 16px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 10, alignItems: "flex-end", background: "white" }}>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Ketik pesan... (Enter untuk kirim)" rows={1} style={{ flex: 1, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "9px 13px", fontSize: 13, fontFamily: "inherit", resize: "none", outline: "none", maxHeight: 120, overflowY: "auto" }} />
            <button onClick={send} disabled={!input.trim() || sending} style={{ width: 38, height: 38, borderRadius: "50%", background: !input.trim() || sending ? "#ccc" : C.dark, color: "white", border: "none", cursor: !input.trim() || sending ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s" }}>
              {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════ MAIN ══════════ */
export function TokoClient({ currentUser, umkmList, products, orders, reviews, conversations, hasMarketplaceUmkm, umkmSettings, initialTab: initialTabProp }: Props) {
  const [tab, setTabState] = useState<Tab>(initialTabProp ?? "ringkasan");
  const router = useRouter();

  const setTab = useCallback((t: Tab) => {
    setTabState(t);
    router.replace(`/dashboard/toko?tab=${t}`, { scroll: false });
  }, [router]);

  const pendingOrders = orders.filter(o => ["PAID", "PROCESSING"].includes(o.orderStatus)).length;
  const pendingReplies = reviews.filter(r => !r.ownerReply).length;
  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 7rem)", background: "white", borderRadius: 16, border: `1px solid ${C.border}`, overflow: "hidden" }}>

      {/* ── Left Sidebar ── */}
      <div style={{ width: 220, background: "white", borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "14px 14px 12px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar user={currentUser} size={34} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser.fullName}</p>
              <p style={{ fontSize: 11, color: C.muted }}>Dashboard Toko</p>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.6px", padding: "0 6px 6px" }}>Kelola Toko</p>
          <NavBtn icon={BarChart3} label="Ringkasan" active={tab === "ringkasan"} onClick={() => setTab("ringkasan")} />
          <NavBtn icon={Package} label="Produk" count={products.filter(p => p.status === "ACTIVE").length > 0 ? undefined : 0} active={tab === "produk"} onClick={() => setTab("produk")} />
          <NavBtn icon={ShoppingBag} label="Pesanan" count={pendingOrders} active={tab === "pesanan"} onClick={() => setTab("pesanan")} badgeColor="#3B82F6" />
          <NavBtn icon={MessageSquare} label="Pesan" count={totalUnread} active={tab === "chat"} onClick={() => setTab("chat")} />
          <NavBtn icon={DollarSign} label="Saldo" active={tab === "saldo"} onClick={() => setTab("saldo")} />
          <NavBtn icon={Star} label="Ulasan" count={pendingReplies} active={tab === "ulasan"} onClick={() => setTab("ulasan")} badgeColor="#F59E0B" />
          <NavBtn icon={Settings} label="Pengaturan" active={tab === "pengaturan"} onClick={() => setTab("pengaturan")} />

          <div style={{ height: 1, background: C.border, margin: "10px 6px" }} />
          <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.6px", padding: "0 6px 6px" }}>Toko Saya</p>
          {umkmList.map(u => (
            <Link key={u.id} href={`/umkm/${u.id}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 9, fontSize: 12, color: C.muted, textDecoration: "none", transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = C.tealBg)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              🏪 <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</span>
              <ExternalLink size={11} style={{ flexShrink: 0, opacity: 0.5 }} />
            </Link>
          ))}
        </div>

      </div>

      {/* ── Right Panel ── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {!hasMarketplaceUmkm ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center", background: C.bg }}>
            <ShoppingBag size={48} style={{ opacity: 0.15, marginBottom: 16, color: C.dark }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: C.dark, marginBottom: 6 }}>UMKM kamu belum terdaftar di Pasar Lokal</p>
            <p style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Aktifkan marketplace lewat halaman edit UMKM untuk mulai berjualan</p>
            {umkmList.length > 0 && umkmList.map(u => (
              <Link key={u.id} href={`/dashboard/umkm/${u.id}/edit`} style={{ display: "inline-block", padding: "8px 18px", borderRadius: 8, background: C.teal, color: "white", textDecoration: "none", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                Aktifkan {u.name}
              </Link>
            ))}
          </div>
        ) : (
          <>
            {tab === "ringkasan" && <RingkasanPanel orders={orders} products={products} reviews={reviews} />}
            {tab === "produk" && <ProdukPanel products={products} umkmList={umkmList} />}
            {tab === "pesanan" && <PesananPanel orders={orders} />}
            {tab === "saldo" && <SaldoPanel umkmList={umkmList} umkmSettings={umkmSettings} />}
            {tab === "chat" && <SellerChatPanel conversations={conversations} currentUserId={currentUser.id} />}
            {tab === "ulasan" && <UlasanPanel reviews={reviews} />}
            {tab === "pengaturan" && umkmSettings && <TokoSettingsPanel umkm={umkmSettings} />}
          </>
        )}
      </div>
    </div>
  );
}
