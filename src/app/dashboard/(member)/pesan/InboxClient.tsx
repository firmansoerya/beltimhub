"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Send, MessageSquare, Loader2, Star,
  Package, Truck, CheckCircle2, X, Heart, Trash2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";

/* ─── Types ─── */
interface ConvUser { id: string; fullName: string; avatarUrl: string | null }
interface ConvUmkm  { id: string; name: string; imageUrl: string | null }

interface ConvItem {
  id: string;
  buyer: ConvUser; seller: ConvUser; umkm: ConvUmkm;
  lastMessage: { content: string; createdAt: string; senderId: string } | null;
  unreadCount: number;
  updatedAt: string;
}

interface Message {
  id: string; content: string; createdAt: string;
  senderId: string; sender: ConvUser;
}

interface BuyerReview {
  id: string;
  umkmId: string; umkmName: string; umkmImageUrl: string | null;
  rating: number; comment: string | null;
  createdAt: string;
}

interface PendingReviewItem {
  umkmId: string; umkmName: string; umkmImageUrl: string | null;
  productImages: string[];
}

interface OrderProductData { name: string; images: string[] }
interface OrderItemData { id: string; quantity: number; price: number; product: OrderProductData }

interface OrderData {
  id: string; invoiceNumber: string | null; orderStatus: string; totalAmount: number;
  shippingAddress: string | null; trackingNumber: string | null; courier: string | null;
  createdAt: string; paidAt: string | null; shippedAt: string | null; completedAt: string | null;
  seller: { fullName: string };
  items: OrderItemData[];
}

interface FavoriteItem {
  id: string; productId: string; name: string; price: number;
  image: string | null; stock: number; umkmName: string; createdAt: string;
}

interface CurrentUser { id: string; fullName: string; avatarUrl: string | null }

type Tab = "chat" | "pesanan" | "ulasan" | "favorit";

interface Props {
  currentUser: CurrentUser;
  conversations: ConvItem[];
  orders: OrderData[];
  buyerReviews: BuyerReview[];
  pendingReviews: PendingReviewItem[];
  favorites: FavoriteItem[];
  initialTab: Tab;
  initialConvId: string | null;
  initialPrefill: string | null;
}

/* ─── Helpers ─── */
function formatPrice(n: number) {
  return "Rp" + new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(n);
}

const C = {
  teal: "#006D77", tealBg: "rgba(0,109,119,0.08)",
  dark: "#0F1923", muted: "#6B7D8F",
  border: "rgba(0,0,0,0.08)", bg: "#F8F9FA",
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

/* ─── Mini Components ─── */
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

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s} type="button"
          onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
        >
          <Star size={22} style={{ fill: s <= (hover || value) ? "#FBBF24" : "none", color: s <= (hover || value) ? "#FBBF24" : "#CBD5E0", transition: "all 0.1s" }} />
        </button>
      ))}
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

/* ══════════ CHAT PANEL ══════════ */
function ChatPanel({ conversations: initialConvs, currentUserId, initialConvId, initialPrefill }: {
  conversations: ConvItem[]; currentUserId: string; initialConvId: string | null; initialPrefill: string | null;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [convs, setConvs] = useState<ConvItem[]>(initialConvs);
  const [activeId, setActiveId] = useState<string | null>(initialConvId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialPrefill ?? "");
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeConv = convs.find((c) => c.id === activeId);
  const otherUser = activeConv
    ? activeConv.buyer.id === currentUserId ? activeConv.seller : activeConv.buyer
    : null;

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

  function selectConv(id: string) {
    setActiveId(id);
    router.replace(`/dashboard/pesan?tab=chat&conv=${id}`, { scroll: false });
  }

  async function deleteConv(id: string) {
    const ok = await confirm({ description: "Hapus percakapan ini? Semua pesan akan dihapus permanen.", variant: "destructive", confirmLabel: "Hapus" });
    if (!ok) return;
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
            Percakapan {convs.length > 0 && `(${convs.length})`}
          </p>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {convs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 16px", color: C.muted }}>
              <MessageSquare size={28} style={{ margin: "0 auto 10px", opacity: 0.25 }} />
              <p style={{ fontSize: 12 }}>Belum ada percakapan</p>
              <p style={{ fontSize: 11, marginTop: 4 }}>Mulai chat dari halaman toko</p>
            </div>
          ) : convs.map((c) => {
            const other = c.buyer.id === currentUserId ? c.seller : c.buyer;
            const isActive = c.id === activeId;
            return (
              <div key={c.id} onClick={() => selectConv(c.id)} className="group" style={{ display: "flex", gap: 10, padding: "11px 14px", cursor: "pointer", background: isActive ? C.tealBg : "transparent", borderLeft: `3px solid ${isActive ? C.teal : "transparent"}`, transition: "all 0.15s", position: "relative" }}>
                {c.umkm.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.umkm.imageUrl} alt={c.umkm.name} style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg,${C.teal},#00A896)`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                    {c.umkm.name[0]}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontWeight: c.unreadCount > 0 ? 700 : 600, fontSize: 13, color: C.dark }}>{c.umkm.name}</span>
                    <span style={{ fontSize: 10, color: C.muted, flexShrink: 0, marginLeft: 4 }}>
                      {c.lastMessage ? formatDistanceToNow(new Date(c.lastMessage.createdAt), { addSuffix: false, locale: idLocale }) : ""}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                    <span style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 155, fontWeight: c.unreadCount > 0 ? 600 : 400, color: c.unreadCount > 0 ? C.dark : C.muted }}>
                      {c.lastMessage ? (c.lastMessage.senderId === currentUserId ? "Kamu: " : "") + c.lastMessage.content : <em>Mulai percakapan</em>}
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
          <p style={{ fontSize: 12, marginTop: 4 }}>atau mulai chat baru dari halaman toko</p>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ padding: "11px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12, background: "white" }}>
            {activeConv && (
              activeConv.umkm.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={activeConv.umkm.imageUrl} alt={activeConv.umkm.name} style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg,${C.teal},#00A896)`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                  {activeConv.umkm.name[0]}
                </div>
              )
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{activeConv?.umkm.name}</div>
              {activeConv && (
                <Link href={`/umkm/${activeConv.umkm.id}`} style={{ fontSize: 11, color: "#00A896", textDecoration: "none" }}>
                  Lihat toko
                </Link>
              )}
            </div>
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

/* ══════════ ULASAN SAYA PANEL (buyer perspective) ══════════ */
function UlasanSayaPanel({ buyerReviews: initReviews, pendingReviews: initPending }: {
  buyerReviews: BuyerReview[];
  pendingReviews: PendingReviewItem[];
}) {
  const [reviews, setReviews] = useState<BuyerReview[]>(initReviews);
  const [pending, setPending] = useState<PendingReviewItem[]>(initPending);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  async function submitReview(umkmId: string, umkmName: string, umkmImageUrl: string | null) {
    const rating = ratings[umkmId];
    if (!rating) { toast.error("Pilih rating terlebih dahulu"); return; }
    setSubmitting(umkmId);
    try {
      const res = await fetch(`/api/umkm/${umkmId}/review`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comments[umkmId]?.trim() || undefined }),
      });
      if (!res.ok) throw new Error();
      const newReview = await res.json();
      setPending(prev => prev.filter(p => p.umkmId !== umkmId));
      setReviews(prev => [{
        id: newReview.id, umkmId, umkmName, umkmImageUrl,
        rating, comment: comments[umkmId]?.trim() || null,
        createdAt: newReview.createdAt,
      }, ...prev]);
      toast.success("Ulasan berhasil dikirim! Terima kasih.");
    } catch {
      toast.error("Gagal mengirim ulasan");
    } finally {
      setSubmitting(null);
    }
  }

  if (reviews.length === 0 && pending.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.muted, background: C.bg }}>
        <Star size={44} style={{ opacity: 0.12, marginBottom: 14 }} />
        <p style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>Belum ada ulasan</p>
        <p style={{ fontSize: 12, marginTop: 4 }}>Selesaikan pembelian untuk mulai mengulas produk</p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 24, background: C.bg }}>

      {/* Perlu Diulas */}
      {pending.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <h2 style={{ fontWeight: 700, fontSize: 15 }}>Perlu Diulas</h2>
            <span style={{ background: "#F59E0B", color: "white", borderRadius: 100, fontSize: 10, fontWeight: 700, padding: "1px 8px" }}>{pending.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pending.map((p) => (
              <div key={p.umkmId} style={{ background: "white", borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: C.bg, overflow: "hidden", flexShrink: 0 }}>
                    {p.productImages[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.productImages[0]} alt={p.umkmName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🏪</div>
                    )}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14 }}>{p.umkmName}</p>
                    <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Beri ulasan untuk toko ini</p>
                  </div>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: C.dark, marginBottom: 6 }}>Rating</p>
                  <StarInput value={ratings[p.umkmId] ?? 0} onChange={(v) => setRatings(prev => ({ ...prev, [p.umkmId]: v }))} />
                </div>

                <textarea
                  value={comments[p.umkmId] ?? ""}
                  onChange={(e) => setComments(prev => ({ ...prev, [p.umkmId]: e.target.value }))}
                  placeholder="Ceritakan pengalaman berbelanja di sini (opsional)..."
                  rows={2}
                  maxLength={500}
                  style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, fontFamily: "inherit", resize: "none", outline: "none", boxSizing: "border-box", marginBottom: 10 }}
                />

                <button
                  onClick={() => submitReview(p.umkmId, p.umkmName, p.umkmImageUrl)}
                  disabled={submitting === p.umkmId || !ratings[p.umkmId]}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 18px", borderRadius: 8, background: submitting === p.umkmId || !ratings[p.umkmId] ? "#ccc" : C.teal, color: "white", border: "none", cursor: submitting === p.umkmId || !ratings[p.umkmId] ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}
                >
                  {submitting === p.umkmId ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  Kirim Ulasan
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Riwayat Ulasan */}
      {reviews.length > 0 && (
        <div>
          <h2 style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Riwayat Ulasan ({reviews.length})</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {reviews.map((r) => (
              <div key={r.id} style={{ background: "white", borderRadius: 12, border: `1px solid ${C.border}`, padding: 14, display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: C.bg, overflow: "hidden", flexShrink: 0 }}>
                  {r.umkmImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.umkmImageUrl} alt={r.umkmName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🏪</div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 13 }}>{r.umkmName}</p>
                      <StarRow rating={r.rating} />
                    </div>
                    <span style={{ fontSize: 10, color: C.muted, flexShrink: 0, marginLeft: 8 }}>
                      {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true, locale: idLocale })}
                    </span>
                  </div>
                  {r.comment && <p style={{ fontSize: 12, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>{r.comment}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════ PESANAN SAYA PANEL ══════════ */
function PesananPanel({ orders: initialOrders }: { orders: OrderData[] }) {
  const [orders, setOrders] = useState<OrderData[]>(initialOrders);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function doAction(orderId: string, action: "confirm_received" | "cancel") {
    setLoadingId(orderId);
    try {
      const res = await fetch(`/api/orders/marketplace/${orderId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, orderStatus: updated.orderStatus } : o));
      toast.success(action === "confirm_received" ? "Pesanan selesai! Dana akan cair ke penjual." : "Pesanan dibatalkan.");
    } catch {
      toast.error("Gagal memproses aksi");
    } finally {
      setLoadingId(null);
    }
  }

  if (orders.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.muted, background: C.bg }}>
        <Package size={44} style={{ opacity: 0.12, marginBottom: 14 }} />
        <p style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>Belum ada pembelian</p>
        <p style={{ fontSize: 12, marginTop: 4 }}>Belanja di Pasar Lokal untuk melihat pesanan di sini</p>
        <Link href="/pasar-lokal" style={{ marginTop: 14, padding: "7px 18px", borderRadius: 8, background: C.teal, color: "white", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>Belanja Sekarang</Link>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 24, background: C.bg }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontWeight: 700, fontSize: 15 }}>Pesanan Saya</h2>
        <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{orders.length} pesanan</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {orders.map((order) => {
          const isLoading = loadingId === order.id;
          const statusColor = ORDER_STATUS_COLOR[order.orderStatus] ?? C.muted;
          return (
            <div key={order.id} style={{ background: "white", borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                <div>
                  {order.invoiceNumber && (
                    <p style={{ fontSize: 11, fontWeight: 600, color: C.teal, fontFamily: "monospace" }}>{order.invoiceNumber}</p>
                  )}
                  <p style={{ fontSize: 11, color: C.muted, marginTop: order.invoiceNumber ? 1 : 0 }}>{new Date(order.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} &middot; {order.seller.fullName}</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: `${statusColor}18`, color: statusColor, flexShrink: 0 }}>
                  {ORDER_STATUS_LABEL[order.orderStatus] ?? order.orderStatus}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                {order.items.map((item) => (
                  <div key={item.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 8, background: C.bg, overflow: "hidden", flexShrink: 0 }}>
                      {item.product.images[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.product.images[0]} alt={item.product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.product.name}</p>
                      <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>×{item.quantity} · {formatPrice(item.price)}</p>
                    </div>
                  </div>
                ))}
              </div>
              {order.trackingNumber && (
                <div style={{ background: C.bg, borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>
                  <Truck size={13} style={{ color: C.muted, flexShrink: 0 }} />
                  <span style={{ color: C.muted }}>Resi:</span>
                  <span style={{ fontWeight: 600 }}>{order.courier} {order.trackingNumber}</span>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                <p style={{ fontWeight: 700, fontSize: 14 }}>{formatPrice(order.totalAmount)}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  {order.orderStatus === "WAITING_PAYMENT" && (
                    <Link href={`/orders/${order.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: C.teal, color: "white", textDecoration: "none", fontSize: 12, fontWeight: 600 }}>
                      Bayar Sekarang
                    </Link>
                  )}
                  {order.orderStatus === "SHIPPED" && (
                    <button onClick={() => doAction(order.id, "confirm_received")} disabled={isLoading} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "#10B981", color: "white", border: "none", cursor: isLoading ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600, opacity: isLoading ? 0.7 : 1 }}>
                      {isLoading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                      Konfirmasi Terima
                    </button>
                  )}
                  {["PAID", "PROCESSING", "SHIPPED", "COMPLETED"].includes(order.orderStatus) && (
                    <Link href={`/orders/${order.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "transparent", border: `1px solid ${C.border}`, color: C.dark, textDecoration: "none", fontSize: 12, fontWeight: 600 }}>
                      Detail
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════ FAVORIT PANEL ══════════ */
function FavoritPanel({ favorites: initFavs }: { favorites: FavoriteItem[] }) {
  const [favs, setFavs] = useState<FavoriteItem[]>(initFavs);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function removeFavorite(productId: string) {
    setLoadingId(productId);
    try {
      const res = await fetch(`/api/products/${productId}/favorite`, { method: "POST" });
      if (!res.ok) throw new Error();
      setFavs(prev => prev.filter(f => f.productId !== productId));
      toast.success("Dihapus dari favorit");
    } catch { toast.error("Gagal menghapus"); }
    finally { setLoadingId(null); }
  }

  if (favs.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.muted, background: C.bg }}>
        <Heart size={44} style={{ opacity: 0.12, marginBottom: 14 }} />
        <p style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>Belum ada favorit</p>
        <p style={{ fontSize: 12, marginTop: 4 }}>Simpan produk favoritmu dari Pasar Lokal</p>
        <Link href="/pasar-lokal" style={{ marginTop: 14, padding: "7px 18px", borderRadius: 8, background: C.teal, color: "white", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>Jelajahi Pasar Lokal</Link>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 24, background: C.bg }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontWeight: 700, fontSize: 15 }}>Produk Favorit</h2>
        <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{favs.length} produk</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
        {favs.map((f) => (
          <div key={f.id} style={{ background: "white", borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", position: "relative" }}>
            <Link href={`/pasar-lokal/${f.productId}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ aspectRatio: "1", background: C.bg, overflow: "hidden" }}>
                {f.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.image} alt={f.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🛍️</div>
                )}
              </div>
              <div style={{ padding: "10px 12px" }}>
                <p style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{f.name}</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.teal, marginTop: 4 }}>{"Rp" + new Intl.NumberFormat("id-ID").format(f.price)}</p>
                <p style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{f.umkmName}</p>
              </div>
            </Link>
            <button
              onClick={() => removeFavorite(f.productId)}
              disabled={loadingId === f.productId}
              style={{ position: "absolute", top: 6, right: 6, width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.9)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}
              title="Hapus dari favorit"
            >
              {loadingId === f.productId
                ? <Loader2 size={13} className="animate-spin" style={{ color: C.muted }} />
                : <Heart size={14} style={{ fill: "#EF4444", color: "#EF4444" }} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════ MAIN ══════════ */
export function InboxClient({ currentUser, conversations, orders, buyerReviews, pendingReviews, favorites, initialTab, initialConvId, initialPrefill }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);

  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);
  const activeOrders = orders.filter(o => ["WAITING_PAYMENT", "PAID", "PROCESSING", "SHIPPED"].includes(o.orderStatus)).length;

  function changeTab(t: Tab) {
    setTab(t);
    router.replace(`/dashboard/pesan?tab=${t}`, { scroll: false });
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 7rem)", background: "white", borderRadius: 16, border: `1px solid ${C.border}`, overflow: "hidden" }}>

      {/* ── Left Sidebar ── */}
      <div style={{ width: 220, background: "white", borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "14px 14px 12px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar user={currentUser} size={34} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser.fullName}</p>
              <p style={{ fontSize: 11, color: C.muted }}>Aktivitas Saya</p>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.6px", padding: "0 6px 6px" }}>Komunikasi</p>
          <NavBtn icon={MessageSquare} label="Pesan" count={totalUnread} active={tab === "chat"} onClick={() => changeTab("chat")} />

          <div style={{ height: 1, background: C.border, margin: "10px 6px" }} />

          <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.6px", padding: "0 6px 6px" }}>Pembelian</p>
          <NavBtn icon={Package} label="Pesanan Saya" count={activeOrders} active={tab === "pesanan"} onClick={() => changeTab("pesanan")} badgeColor="#8B5CF6" />
          <NavBtn icon={Star} label="Ulasan Saya" count={pendingReviews.length} active={tab === "ulasan"} onClick={() => changeTab("ulasan")} badgeColor="#F59E0B" />
          <NavBtn icon={Heart} label="Favorit" count={favorites.length} active={tab === "favorit"} onClick={() => changeTab("favorit")} badgeColor="#EF4444" />
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {tab === "chat" && <ChatPanel conversations={conversations} currentUserId={currentUser.id} initialConvId={initialConvId} initialPrefill={initialPrefill} />}
        {tab === "pesanan" && <PesananPanel orders={orders} />}
        {tab === "ulasan" && <UlasanSayaPanel buyerReviews={buyerReviews} pendingReviews={pendingReviews} />}
        {tab === "favorit" && <FavoritPanel favorites={favorites} />}
      </div>
    </div>
  );
}
