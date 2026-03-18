"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HandshakeIcon, X, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  listingId: string;
  listingTitle: string;
  currentPrice: number;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

export function PriceOfferButton({ listingId, listingTitle, currentPrice }: Props) {
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    buyerName: "",
    buyerPhone: "",
    offeredPrice: "",
    message: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.buyerName.trim() || !form.buyerPhone.trim() || !form.offeredPrice) return;

    const price = parseInt(form.offeredPrice.replace(/\D/g, ""), 10);
    if (!price || price <= 0) {
      toast.error("Masukkan harga penawaran yang valid");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerName: form.buyerName.trim(),
          buyerPhone: form.buyerPhone.trim(),
          offeredPrice: price,
          message: form.message.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Gagal mengirim penawaran");
      }
      setSuccess(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengirim penawaran");
    } finally {
      setIsLoading(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setTimeout(() => {
      setSuccess(false);
      setForm({ buyerName: "", buyerPhone: "", offeredPrice: "", message: "" });
    }, 300);
  }

  function formatInputPrice(value: string) {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    return parseInt(digits, 10).toLocaleString("id-ID");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full mt-2 flex items-center justify-center gap-2 h-10 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors"
      >
        <HandshakeIcon className="h-4 w-4" />
        Ajukan Penawaran Harga
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
          <div className="relative z-10 bg-background rounded-xl shadow-xl" style={{ width: "100%", maxWidth: "440px" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h2 className="font-semibold text-base">Ajukan Penawaran</h2>
                <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[260px]">{listingTitle}</p>
              </div>
              <button onClick={handleClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {success ? (
              <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <div>
                  <p className="font-semibold">Penawaran Terkirim!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Penjual akan menghubungi kamu via WhatsApp jika tertarik dengan penawaran kamu.
                  </p>
                </div>
                <Button onClick={handleClose} className="mt-2 w-full">Tutup</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
                <div className="bg-muted/50 rounded-lg px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Harga tercantum</span>
                  <span className="font-semibold text-base">{formatPrice(currentPrice)}</span>
                </div>

                <div>
                  <Label htmlFor="buyerName">Nama Lengkap *</Label>
                  <Input
                    id="buyerName"
                    className="mt-1.5"
                    placeholder="Nama kamu"
                    value={form.buyerName}
                    onChange={(e) => setForm(f => ({ ...f, buyerName: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="buyerPhone">Nomor WhatsApp *</Label>
                  <Input
                    id="buyerPhone"
                    className="mt-1.5"
                    placeholder="08xx-xxxx-xxxx"
                    value={form.buyerPhone}
                    onChange={(e) => setForm(f => ({ ...f, buyerPhone: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="offeredPrice">Harga Penawaran (Rp) *</Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                    <Input
                      id="offeredPrice"
                      className="pl-9"
                      placeholder="0"
                      value={form.offeredPrice}
                      onChange={(e) => setForm(f => ({ ...f, offeredPrice: formatInputPrice(e.target.value) }))}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="message">Pesan (opsional)</Label>
                  <Textarea
                    id="message"
                    className="mt-1.5 resize-none"
                    rows={3}
                    placeholder="Contoh: Apakah harga bisa nego? Saya serius mau beli."
                    value={form.message}
                    onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))}
                    maxLength={500}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Mengirim...</> : "Kirim Penawaran"}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
