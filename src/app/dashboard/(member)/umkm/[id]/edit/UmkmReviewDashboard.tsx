"use client";

import { useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Star, MessageSquare, RefreshCw, Loader2, Send, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  ownerReply: string | null;
  ownerRepliedAt: string | null;
  createdAt: string;
  reviewer: { fullName: string; avatarUrl: string | null };
}

interface Props {
  umkmId: string;
  initialReviews: Review[];
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn("h-3.5 w-3.5", s <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20")}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review, umkmId, onUpdated }: { review: Review; umkmId: string; onUpdated: (r: Review) => void }) {
  const [replyMode, setReplyMode] = useState(false);
  const [replyText, setReplyText] = useState(review.ownerReply ?? "");
  const [loading, setLoading] = useState(false);

  async function saveReply() {
    setLoading(true);
    try {
      const res = await fetch(`/api/umkm/${umkmId}/review?reviewId=${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerReply: replyText.trim() || null }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      onUpdated({ ...review, ownerReply: updated.ownerReply, ownerRepliedAt: updated.ownerRepliedAt });
      toast.success(replyText.trim() ? "Balasan disimpan" : "Balasan dihapus");
      setReplyMode(false);
    } catch {
      toast.error("Gagal menyimpan balasan");
    } finally {
      setLoading(false);
    }
  }

  async function deleteReply() {
    setReplyText("");
    setLoading(true);
    try {
      const res = await fetch(`/api/umkm/${umkmId}/review?reviewId=${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerReply: null }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      onUpdated({ ...review, ownerReply: updated.ownerReply, ownerRepliedAt: updated.ownerRepliedAt });
      toast.success("Balasan dihapus");
      setReplyMode(false);
    } catch {
      toast.error("Gagal menghapus balasan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border rounded-lg p-3 bg-background space-y-2">
      {/* Reviewer info */}
      <div className="flex items-start gap-2.5">
        <div className="h-8 w-8 rounded-full bg-muted overflow-hidden shrink-0">
          {review.reviewer.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={review.reviewer.avatarUrl} alt={review.reviewer.fullName} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xs font-semibold text-muted-foreground">
              {review.reviewer.fullName[0]}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-sm truncate">{review.reviewer.fullName}</p>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true, locale: idLocale })}
            </span>
          </div>
          <StarDisplay rating={review.rating} />
        </div>
      </div>

      {/* Comment */}
      {review.comment && (
        <p className="text-sm text-muted-foreground pl-10">{review.comment}</p>
      )}

      {/* Owner reply display */}
      {review.ownerReply && !replyMode && (
        <div className="ml-10 pl-3 border-l-2 border-primary/30 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3 text-primary" />
              <span className="text-xs font-medium text-primary">Balasan Anda</span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => { setReplyText(review.ownerReply ?? ""); setReplyMode(true); }}
                className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                onClick={deleteReply}
                disabled={loading}
                className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
              </button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{review.ownerReply}</p>
        </div>
      )}

      {/* Reply form */}
      {replyMode ? (
        <div className="ml-10 space-y-2">
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Tulis balasan Anda..."
            rows={2}
            maxLength={500}
            className="text-sm resize-none"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={saveReply}
              disabled={loading || !replyText.trim()}
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              Kirim
            </button>
            <button
              onClick={() => { setReplyMode(false); setReplyText(review.ownerReply ?? ""); }}
              className="inline-flex items-center h-7 px-3 rounded-md text-xs font-medium border hover:bg-muted transition-colors text-muted-foreground"
            >
              Batal
            </button>
          </div>
        </div>
      ) : !review.ownerReply && (
        <div className="ml-10">
          <button
            onClick={() => { setReplyText(""); setReplyMode(true); }}
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-medium border hover:bg-muted transition-colors text-muted-foreground"
          >
            <MessageSquare className="h-3 w-3" />
            Balas
          </button>
        </div>
      )}
    </div>
  );
}

export function UmkmReviewDashboard({ umkmId, initialReviews }: Props) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/umkm/${umkmId}/review`);
      if (res.ok) setReviews(await res.json());
    } finally {
      setIsRefreshing(false);
    }
  }, [umkmId]);

  function handleUpdated(updated: Review) {
    setReviews(prev => prev.map(r => r.id === updated.id ? updated : r));
  }

  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-sm">Ulasan Pelanggan</h2>
          {avgRating !== null && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {avgRating.toFixed(1)} ★ · {reviews.length} ulasan
            </p>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={isRefreshing}
          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
          title="Refresh"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
        </button>
      </div>

      {reviews.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-10 text-muted-foreground">
          <Star className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-sm">Belum ada ulasan</p>
          <p className="text-xs mt-1">Ulasan dari pelanggan akan muncul di sini</p>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto flex-1">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              umkmId={umkmId}
              onUpdated={handleUpdated}
            />
          ))}
        </div>
      )}
    </div>
  );
}
