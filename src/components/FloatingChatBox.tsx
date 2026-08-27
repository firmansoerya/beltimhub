"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { MessageSquare, X, Send, Loader2, Minimize2 } from "lucide-react";
import { toast } from "sonner";

const C = {
  teal: "#006D77", dark: "#0F1923", muted: "#6B7D8F",
  border: "rgba(0,0,0,0.08)", bg: "#F8F9FA",
};

interface Message {
  id: string; content: string; createdAt: string;
  senderId: string; sender: { id: string; fullName: string; avatarUrl: string | null };
}

interface Props {
  umkmId: string;
  umkmName: string;
  umkmImageUrl: string | null;
  isLoggedIn: boolean;
}

export function FloatingChatBox({ umkmId, umkmName, umkmImageUrl, isLoggedIn }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Nudge tooltip — muncul sekali per toko
  useEffect(() => {
    const key = `chat_nudge_${umkmId}`;
    if (sessionStorage.getItem(key)) return;
    const timer = setTimeout(() => setShowNudge(true), 2000);
    const hideTimer = setTimeout(() => {
      setShowNudge(false);
      sessionStorage.setItem(key, "1");
    }, 14000);
    return () => { clearTimeout(timer); clearTimeout(hideTimer); };
  }, [umkmId]);

  // Listen for open-chat event (from PurchaseCard etc.)
  useEffect(() => {
    function handleOpenChat(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.umkmId === umkmId) {
        if (detail?.prefill) setInput(detail.prefill);
        openChat();
      }
    }
    window.addEventListener("open-floating-chat", handleOpenChat);
    return () => window.removeEventListener("open-floating-chat", handleOpenChat);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [umkmId, isLoggedIn, convId]);

  // Buka chat: create/get conversation
  async function openChat() {
    if (!isLoggedIn) { router.push("/sign-in"); return; }
    setOpen(true);
    if (convId) return; // sudah ada conversation

    setLoading(true);
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ umkmId }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Gagal membuka chat"); setOpen(false); return; }
      setConvId(data.conversationId);
    } catch {
      toast.error("Terjadi kesalahan");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  // Load messages
  const loadMessages = useCallback(async (id: string, silent = false) => {
    try {
      const res = await fetch(`/api/chat/conversations/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.conversation.messages);
      setCurrentUserId(data.currentUserId);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (!convId || !open) return;
    loadMessages(convId);
    pollRef.current = setInterval(() => loadMessages(convId, true), 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [convId, open, loadMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send() {
    if (!input.trim() || !convId || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    try {
      const res = await fetch(`/api/chat/conversations/${convId}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) return;
      const { message } = await res.json();
      setMessages(prev => [...prev, message]);
    } finally { setSending(false); }
  }

  return (
    <>
      {/* Chat window */}
      {open && (
        <div style={{
          position: "fixed", bottom: 80, right: 24, zIndex: 110,
          width: 360, height: 480, maxHeight: "70vh",
          background: "white", borderRadius: 16,
          boxShadow: "0 12px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            padding: "12px 16px", background: C.dark, color: "white",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.15)",
              overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {umkmImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={umkmImageUrl} alt={umkmName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 16 }}>🏪</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{umkmName}</p>
              <p style={{ fontSize: 10, opacity: 0.7 }}>Kirim pesan</p>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white" }}>
              <Minimize2 size={14} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6, background: C.bg }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <Loader2 size={20} style={{ margin: "0 auto", opacity: 0.3 }} className="animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: "center", color: C.muted, fontSize: 12, padding: "32px 0" }}>
                <MessageSquare size={28} style={{ margin: "0 auto 8px", opacity: 0.2 }} />
                <p>Kirim pesan ke {umkmName}</p>
                <p style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>Tanyakan ketersediaan, varian, dll</p>
                <p style={{ fontSize: 10, marginTop: 10, fontStyle: "italic", opacity: 0.55, lineHeight: 1.4 }}>
                  Balasan penjual mungkin tidak langsung —<br />pesan akan masuk ke kotak masuk mereka.
                </p>
              </div>
            ) : messages.map((m, i) => {
              const isMine = m.senderId === currentUserId;
              const prevMsg = messages[i - 1];
              const showDate = !prevMsg || format(new Date(m.createdAt), "dd/MM/yyyy") !== format(new Date(prevMsg.createdAt), "dd/MM/yyyy");
              return (
                <div key={m.id}>
                  {showDate && (
                    <div style={{ textAlign: "center", margin: "6px 0", fontSize: 10, color: C.muted }}>
                      {format(new Date(m.createdAt), "dd MMM yyyy", { locale: idLocale })}
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "80%", padding: "8px 12px",
                      borderRadius: isMine ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      background: isMine ? C.dark : "white", color: isMine ? "white" : C.dark,
                      fontSize: 13, lineHeight: 1.45,
                      boxShadow: isMine ? "none" : "0 1px 2px rgba(0,0,0,0.06)",
                    }}>
                      {m.content}
                      <div style={{ fontSize: 9, opacity: 0.5, marginTop: 2, textAlign: "right" }}>
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
          <div style={{
            padding: "8px 12px", borderTop: `1px solid ${C.border}`,
            display: "flex", gap: 8, alignItems: "flex-end", background: "white",
          }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ketik pesan..."
              rows={1}
              style={{
                flex: 1, border: `1.5px solid ${C.border}`, borderRadius: 10,
                padding: "8px 12px", fontSize: 13, fontFamily: "inherit",
                resize: "none", outline: "none", maxHeight: 80, overflowY: "auto",
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || sending}
              style={{
                width: 34, height: 34, borderRadius: "50%",
                background: !input.trim() || sending ? "#ccc" : C.dark,
                color: "white", border: "none",
                cursor: !input.trim() || sending ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </div>
      )}

      {/* Nudge tooltip */}
      {showNudge && !open && (
        <div
          onClick={() => { setShowNudge(false); sessionStorage.setItem(`chat_nudge_${umkmId}`, "1"); openChat(); }}
          style={{
            position: "fixed", bottom: 84, right: 24, zIndex: 112,
            background: C.dark, color: "white",
            padding: "10px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600,
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            cursor: "pointer", maxWidth: 220,
            animation: "nudgeIn 0.3s ease-out",
          }}
        >
          <p style={{ margin: 0 }}>Ada pertanyaan?</p>
          <p style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 400, opacity: 0.7 }}>Kirim pesan ke {umkmName}</p>
          {/* Arrow */}
          <div style={{
            position: "absolute", bottom: -6, right: 20,
            width: 12, height: 12, background: C.dark,
            transform: "rotate(45deg)", borderRadius: 2,
          }} />
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => {
          if (showNudge) { setShowNudge(false); sessionStorage.setItem(`chat_nudge_${umkmId}`, "1"); }
          open ? setOpen(false) : openChat();
        }}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 111,
          width: 52, height: 52, borderRadius: "50%",
          background: open ? C.dark : C.teal, color: "white",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          transition: "background 0.2s, transform 0.2s",
        }}
      >
        {open ? <X size={22} /> : <MessageSquare size={22} />}
      </button>

      {/* Nudge animation */}
      <style>{`
        @keyframes nudgeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
