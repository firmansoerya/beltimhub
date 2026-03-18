"use client";

import { useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { MessageCircle, Check, X, Clock, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PriceOffer {
  id: string;
  buyerName: string;
  buyerPhone: string;
  offeredPrice: number;
  message: string | null;
  status: "PENDING" | "CONTACTED" | "REJECTED";
  createdAt: string;
}

interface Props {
  listingId: string;
  initialOffers: PriceOffer[];
  currentPrice: number;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Menunggu",
  CONTACTED: "Dihubungi",
  REJECTED: "Ditolak",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONTACTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-600",
};

export function PriceOfferList({ listingId, initialOffers, currentPrice }: Props) {
  const [offers, setOffers] = useState<PriceOffer[]>(initialOffers);
  const [loading, setLoading] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/offers`);
      if (res.ok) setOffers(await res.json());
    } finally {
      setIsRefreshing(false);
    }
  }, [listingId]);

  async function updateStatus(offerId: string, status: string) {
    setLoading(offerId + status);
    try {
      const res = await fetch(`/api/listings/${listingId}/offers?offerId=${offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Gagal memperbarui status");
      const updated = await res.json();
      setOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: updated.status } : o));
      toast.success("Status diperbarui");
    } catch {
      toast.error("Gagal memperbarui status");
    } finally {
      setLoading(null);
    }
  }

  const pendingCount = offers.filter(o => o.status === "PENDING").length;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-sm">Penawaran Masuk</h2>
          {pendingCount > 0 && (
            <p className="text-xs text-amber-600 mt-0.5">{pendingCount} penawaran baru</p>
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

      {offers.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-10 text-muted-foreground">
          <MessageCircle className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-sm">Belum ada penawaran</p>
          <p className="text-xs mt-1">Penawaran dari calon pembeli akan muncul di sini</p>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto flex-1">
          {offers.map((offer) => {
            const pct = Math.round(((offer.offeredPrice - currentPrice) / currentPrice) * 100);
            const waLink = `https://wa.me/62${offer.buyerPhone.replace(/^0/, "")}?text=Halo ${offer.buyerName}, saya penjual yang melihat penawaran harga Anda sebesar ${formatPrice(offer.offeredPrice)}. Apakah Anda masih tertarik?`;

            return (
              <div key={offer.id} className="border rounded-lg p-3 bg-background">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{offer.buyerName}</p>
                    <p className="text-xs text-muted-foreground">{offer.buyerPhone}</p>
                  </div>
                  <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0", STATUS_COLOR[offer.status])}>
                    {STATUS_LABEL[offer.status]}
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-bold text-base text-primary">{formatPrice(offer.offeredPrice)}</span>
                  <span className={cn("text-xs font-medium", pct < 0 ? "text-red-500" : "text-green-600")}>
                    {pct > 0 ? "+" : ""}{pct}% dari harga
                  </span>
                </div>

                {offer.message && (
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5 mb-2 italic">
                    &ldquo;{offer.message}&rdquo;
                  </p>
                )}

                <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(offer.createdAt), { addSuffix: true, locale: idLocale })}
                </p>

                <div className="flex gap-2 items-center">
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => offer.status === "PENDING" && updateStatus(offer.id, "CONTACTED")}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium bg-green-600 hover:bg-green-700 text-white transition-colors"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Hubungi WA
                  </a>

                  {offer.status === "PENDING" && (
                    <button
                      onClick={() => updateStatus(offer.id, "REJECTED")}
                      disabled={!!loading}
                      className="flex items-center justify-center gap-1 h-8 px-3 rounded-md text-xs font-medium border hover:bg-muted transition-colors text-muted-foreground"
                      title="Tolak penawaran"
                    >
                      {loading === offer.id + "REJECTED" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                    </button>
                  )}

                  {offer.status === "CONTACTED" && (
                    <button
                      onClick={() => updateStatus(offer.id, "PENDING")}
                      disabled={!!loading}
                      className="flex items-center justify-center gap-1 h-8 px-3 rounded-md text-xs font-medium border hover:bg-muted transition-colors text-muted-foreground"
                      title="Reset ke pending"
                    >
                      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    </button>
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
