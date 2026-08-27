"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Send, MessageSquare, Loader2 } from "lucide-react";
import Link from "next/link";

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
  senderId: string;
  sender: ConvUser;
}

interface Props {
  conversations: ConvItem[];
  currentUserId: string;
  initialConvId: string | null;
}

function Avatar({ user, size = 36 }: { user: ConvUser; size?: number }) {
  if (user.avatarUrl)
    return <img src={user.avatarUrl} alt={user.fullName} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;  // eslint-disable-line @next/next/no-img-element
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#006D77,#00A896)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: size * 0.38, flexShrink: 0 }}>
      {user.fullName[0]}
    </div>
  );
}

export function ChatClient({ conversations: initialConvs, currentUserId, initialConvId }: Props) {
  const router = useRouter();
  const [convs, setConvs]         = useState<ConvItem[]>(initialConvs);
  const [activeId, setActiveId]   = useState<string | null>(initialConvId);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [sending, setSending]     = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeConv = convs.find((c) => c.id === activeId);
  const otherUser = activeConv
    ? activeConv.buyer.id === currentUserId
      ? activeConv.seller : activeConv.buyer
    : null;

  // Muat pesan conversation aktif
  const loadMessages = useCallback(async (convId: string, silent = false) => {
    if (!silent) setLoadingMsgs(true);
    try {
      const res = await fetch(`/api/chat/conversations/${convId}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.conversation.messages.map((m: Message & { createdAt: string }) => ({
        ...m, createdAt: m.createdAt,
      })));
      // Update unread di list
      setConvs(prev => prev.map(c => c.id === convId ? { ...c, unreadCount: 0 } : c));
    } finally {
      if (!silent) setLoadingMsgs(false);
    }
  }, []);

  useEffect(() => {
    if (!activeId) return;
    loadMessages(activeId);
    // Polling setiap 3 detik
    pollRef.current = setInterval(() => loadMessages(activeId, true), 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeId, loadMessages]);

  // Scroll ke bawah saat pesan baru
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || !activeId || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    try {
      const res = await fetch(`/api/chat/conversations/${activeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) return;
      const { message } = await res.json();
      setMessages(prev => [...prev, message]);
      setConvs(prev => prev.map(c =>
        c.id === activeId
          ? { ...c, lastMessage: { content, createdAt: message.createdAt, senderId: currentUserId }, updatedAt: message.createdAt }
          : c
      ));
    } finally {
      setSending(false);
    }
  }

  function selectConv(id: string) {
    setActiveId(id);
    router.replace(`/dashboard/pesan?conv=${id}`, { scroll: false });
  }

  const totalUnread = convs.reduce((s, c) => s + c.unreadCount, 0);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 7rem)", background: "white", borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)", overflow: "hidden" }}>

      {/* ── Sidebar daftar conversation ── */}
      <div style={{ width: 300, borderRight: "1px solid rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        {/* Header */}
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
            <MessageSquare size={16} />
            Pesan
            {totalUnread > 0 && (
              <span style={{ background: "#006D77", color: "white", borderRadius: 100, fontSize: 10, fontWeight: 700, padding: "1px 7px" }}>
                {totalUnread}
              </span>
            )}
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {convs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 16px", color: "#6B7D8F", fontSize: 13 }}>
              <MessageSquare size={32} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
              Belum ada percakapan
            </div>
          ) : convs.map((c) => {
            const other = c.buyer.id === currentUserId ? c.seller : c.buyer;
            const isActive = c.id === activeId;
            return (
              <div
                key={c.id}
                onClick={() => selectConv(c.id)}
                style={{
                  display: "flex", gap: 10, padding: "12px 14px", cursor: "pointer",
                  background: isActive ? "rgba(0,109,119,0.07)" : "transparent",
                  borderLeft: isActive ? "3px solid #006D77" : "3px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                <Avatar user={other} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontWeight: c.unreadCount > 0 ? 700 : 600, fontSize: 13, color: "#0F1923" }}>{other.fullName}</span>
                    <span style={{ fontSize: 10, color: "#6B7D8F", flexShrink: 0, marginLeft: 4 }}>
                      {c.lastMessage ? formatDistanceToNow(new Date(c.lastMessage.createdAt), { addSuffix: false, locale: idLocale }) : ""}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "#6B7D8F", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160, fontWeight: c.unreadCount > 0 ? 600 : 400, color: c.unreadCount > 0 ? "#0F1923" : "#6B7D8F" }}>
                      {c.lastMessage
                        ? (c.lastMessage.senderId === currentUserId ? "Kamu: " : "") + c.lastMessage.content
                        : <em>Mulai percakapan</em>}
                    </span>
                    {c.unreadCount > 0 && (
                      <span style={{ background: "#006D77", color: "white", borderRadius: 100, fontSize: 9, fontWeight: 700, padding: "1px 6px", flexShrink: 0 }}>
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: "#00A896", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    🏪 {c.umkm.name}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Area chat ── */}
      {!activeId ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#6B7D8F" }}>
          <MessageSquare size={48} style={{ opacity: 0.15, marginBottom: 16 }} />
          <p style={{ fontSize: 14, fontWeight: 600 }}>Pilih percakapan</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>atau mulai chat baru dari halaman toko</p>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Chat header */}
          <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
            {otherUser && <Avatar user={otherUser} size={36} />}
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{otherUser?.fullName}</div>
              {activeConv && (
                <Link href={`/umkm/${activeConv.umkm.id}`} style={{ fontSize: 11, color: "#00A896", textDecoration: "none" }}>
                  🏪 {activeConv.umkm.name}
                </Link>
              )}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
            {loadingMsgs ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <Loader2 size={20} style={{ margin: "0 auto", opacity: 0.3 }} className="animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: "center", color: "#6B7D8F", fontSize: 12, padding: "32px 0" }}>
                Belum ada pesan. Mulai percakapan!
              </div>
            ) : messages.map((m, i) => {
              const isMine = m.senderId === currentUserId;
              const prevMsg = messages[i - 1];
              const showDate = !prevMsg || format(new Date(m.createdAt), "dd/MM/yyyy") !== format(new Date(prevMsg.createdAt), "dd/MM/yyyy");
              return (
                <div key={m.id}>
                  {showDate && (
                    <div style={{ textAlign: "center", margin: "8px 0", fontSize: 11, color: "#6B7D8F" }}>
                      {format(new Date(m.createdAt), "EEEE, dd MMM yyyy", { locale: idLocale })}
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "70%", padding: "9px 13px", borderRadius: isMine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      background: isMine ? "#0F1923" : "#F0F2F4",
                      color: isMine ? "white" : "#0F1923",
                      fontSize: 13, lineHeight: 1.5,
                    }}>
                      {m.content}
                      <div style={{ fontSize: 10, opacity: 0.5, marginTop: 3, textAlign: "right" }}>
                        {format(new Date(m.createdAt), "HH:mm")}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(0,0,0,0.06)", display: "flex", gap: 10, alignItems: "flex-end" }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ketik pesan... (Enter untuk kirim)"
              rows={1}
              style={{
                flex: 1, border: "1.5px solid rgba(0,0,0,0.1)", borderRadius: 12,
                padding: "10px 14px", fontSize: 13, fontFamily: "inherit",
                resize: "none", outline: "none", maxHeight: 120, overflowY: "auto",
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || sending}
              style={{
                width: 40, height: 40, borderRadius: "50%", background: !input.trim() || sending ? "#ccc" : "#0F1923",
                color: "white", border: "none", cursor: !input.trim() || sending ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                transition: "background 0.2s",
              }}
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
