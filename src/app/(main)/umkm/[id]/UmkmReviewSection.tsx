"use client";

import { useState } from "react";
import { Star, Pencil, Trash2, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

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
  reviews: Review[];
  myReview: { id: string; rating: number; comment: string | null } | null;
  isOwner: boolean;
  isLoggedIn: boolean;
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
        >
          <Star
            className={`h-7 w-7 transition-colors ${
              s <= (hovered || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${s <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"}`}
        />
      ))}
    </div>
  );
}

export function UmkmReviewSection({ umkmId, reviews, myReview, isOwner, isLoggedIn }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(!myReview && isLoggedIn && !isOwner);
  const [rating, setRating] = useState(myReview?.rating ?? 0);
  const [comment, setComment] = useState(myReview?.comment ?? "");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (rating === 0) { toast.error("Pilih rating bintang terlebih dahulu"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/umkm/${umkmId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Gagal menyimpan ulasan");
      }
      toast.success(myReview ? "Ulasan diperbarui" : "Ulasan berhasil dikirim");
      setEditing(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  async function deleteReview() {
    setLoading(true);
    try {
      await fetch(`/api/umkm/${umkmId}/review`, { method: "DELETE" });
      toast.success("Ulasan dihapus");
      setRating(0);
      setComment("");
      setEditing(false);
      router.refresh();
    } catch {
      toast.error("Gagal menghapus ulasan");
    } finally {
      setLoading(false);
    }
  }

  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">
          Ulasan{" "}
          {avgRating !== null && (
            <span className="text-base font-normal text-muted-foreground">
              · {avgRating.toFixed(1)} <span className="text-yellow-400">★</span> ({reviews.length})
            </span>
          )}
        </h2>
        {!isOwner && isLoggedIn && myReview && !editing && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
            <Button variant="outline" size="sm" className="text-destructive" onClick={deleteReview} disabled={loading}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Form tulis ulasan */}
      {!isOwner && isLoggedIn && (editing || !myReview) && (
        <div className="border rounded-xl p-4 mb-6 space-y-3 bg-muted/30">
          <p className="text-sm font-medium">{myReview ? "Edit ulasan Anda" : "Tulis ulasan"}</p>
          <StarPicker value={rating} onChange={setRating} />
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ceritakan pengalaman Anda... (opsional)"
            rows={3}
            maxLength={500}
          />
          <div className="flex gap-2">
            <Button onClick={submit} disabled={loading || rating === 0}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kirim Ulasan"}
            </Button>
            {(myReview || editing) && (
              <Button variant="outline" onClick={() => setEditing(false)} disabled={loading}>
                Batal
              </Button>
            )}
          </div>
        </div>
      )}

      {!isLoggedIn && (
        <p className="text-sm text-muted-foreground mb-6">
          <a href="/sign-in" className="text-primary hover:underline">Masuk</a> untuk menulis ulasan.
        </p>
      )}

      {/* Daftar ulasan */}
      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Belum ada ulasan. Jadilah yang pertama!</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="flex gap-3">
              <div className="h-9 w-9 rounded-full bg-muted overflow-hidden shrink-0">
                {r.reviewer.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.reviewer.avatarUrl} alt={r.reviewer.fullName} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
                    {r.reviewer.fullName[0]}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{r.reviewer.fullName}</span>
                  <StarDisplay rating={r.rating} />
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true, locale: id })}
                  </span>
                </div>
                {r.comment && (
                  <p className="text-sm text-muted-foreground mt-1">{r.comment}</p>
                )}
                {r.ownerReply && (
                  <div className="mt-2 ml-2 pl-3 border-l-2 border-primary/30">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <MessageSquare className="h-3 w-3 text-primary" />
                      <span className="text-xs font-medium text-primary">Balasan Pemilik</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{r.ownerReply}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
