"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ShieldCheck } from "lucide-react";

const PAYMENT_METHODS = [
  { value: "QRIS", label: "QRIS (Scan QR)" },
  { value: "BCA_VA", label: "Transfer BCA" },
  { value: "BNI_VA", label: "Transfer BNI" },
  { value: "BRI_VA", label: "Transfer BRI" },
  { value: "MANDIRI_VA", label: "Transfer Mandiri" },
  { value: "BSI_VA", label: "Transfer BSI" },
  { value: "OVO", label: "OVO" },
  { value: "DANA", label: "DANA" },
  { value: "SHOPEEPAY", label: "ShopeePay" },
];

function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
}

interface Props {
  productId: string;
  productName: string;
  totalPrice: number;
}

export function CheckoutButton({ productId, productName, totalPrice }: Props) {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shippingAddress, setShippingAddress] = useState("");
  const [buyerNote, setBuyerNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [error, setError] = useState("");

  function handleClick() {
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }
    setOpen(true);
  }

  async function handleCheckout() {
    if (!shippingAddress.trim()) {
      setError("Alamat pengiriman wajib diisi");
      return;
    }
    if (!paymentMethod) {
      setError("Pilih metode pembayaran");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/orders/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId, quantity: 1 }],
          shippingAddress,
          buyerNote,
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal membuat order");
        return;
      }

      // Redirect ke halaman order
      router.push(`/orders/${data.orderId}`);
    } catch {
      setError("Terjadi kesalahan, coba lagi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button className="flex-1" size="lg" onClick={handleClick}>
        Beli Sekarang
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-teal-600" />
              Checkout Aman
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-muted rounded-lg p-3 text-sm">
              <p className="font-medium">{productName}</p>
              <p className="text-primary font-bold mt-1">{formatPrice(totalPrice)}</p>
              <p className="text-xs text-muted-foreground mt-1">Termasuk biaya layanan</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Alamat Pengiriman *</Label>
              <Textarea
                id="address"
                placeholder="Nama penerima, alamat lengkap, kode pos, kota..."
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Catatan untuk Penjual (opsional)</Label>
              <Textarea
                id="note"
                placeholder="Warna, ukuran, permintaan khusus..."
                value={buyerNote}
                onChange={(e) => setBuyerNote(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Metode Pembayaran *</Label>
              <Select value={paymentMethod} onValueChange={(v) => v && setPaymentMethod(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih metode bayar..." />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Batal
            </Button>
            <Button onClick={handleCheckout} disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Bayar {formatPrice(totalPrice)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
