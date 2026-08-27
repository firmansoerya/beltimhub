"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { X, Minus, Plus, Trash2, ShoppingCart, Loader2 } from "lucide-react";
import { toast } from "sonner";

function formatPrice(price: number) {
  return "Rp" + new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(price);
}

interface FeeConfig {
  buyerFeePercent: number;
  buyerFeeMinimum: number;
}

const XENDIT_FEES: Record<string, { type: "percent" | "flat"; amount: number }> = {
  QRIS: { type: "percent", amount: 0.7 },
  BCA_VA: { type: "flat", amount: 5500 }, BNI_VA: { type: "flat", amount: 5500 },
  BRI_VA: { type: "flat", amount: 5500 }, BSI_VA: { type: "flat", amount: 5500 },
};

function calcBuyerFee(subtotal: number, method: string, config: FeeConfig): number {
  const baseFee = Math.round(subtotal * config.buyerFeePercent / 100);
  const xendit = XENDIT_FEES[method];
  let xenditCost = 0;
  if (xendit) {
    xenditCost = xendit.type === "percent"
      ? Math.round((subtotal + baseFee) * xendit.amount / 100)
      : xendit.amount;
  }
  return Math.max(baseFee, xenditCost, config.buyerFeeMinimum);
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: Props) {
  const { items, updateQty, removeItem, clearCart, totalItems, totalPrice } = useCart();
  const router = useRouter();
  const { isSignedIn } = useUser();

  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [payMethod, setPayMethod] = useState("QRIS");
  const [loading, setLoading] = useState(false);
  const [feeConfig, setFeeConfig] = useState<FeeConfig>({ buyerFeePercent: 3, buyerFeeMinimum: 1000 });

  useEffect(() => {
    if (!open) return;
    fetch("/api/marketplace/fees").then(r => r.json()).then(d => {
      if (d.config) setFeeConfig({ buyerFeePercent: d.config.buyerFeePercent, buyerFeeMinimum: d.config.buyerFeeMinimum });
    }).catch(() => {});
  }, [open]);

  const PLATFORM_FEE = calcBuyerFee(totalPrice, payMethod, feeConfig);
  const SHIPPING = 15000;
  const grandTotal = totalPrice + PLATFORM_FEE + SHIPPING;

  // Group items by store
  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    if (!acc[item.umkmId]) acc[item.umkmId] = [];
    acc[item.umkmId].push(item);
    return acc;
  }, {});

  async function handleCheckout() {
    if (!isSignedIn) { router.push("/sign-in"); onClose(); return; }
    if (!address.trim()) { toast.error("Isi alamat pengiriman"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/orders/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(i => ({ productId: i.productId, quantity: i.qty })),
          shippingAddress: address,
          buyerNote: note,
          paymentMethod: payMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Gagal membuat order"); return; }
      clearCart();
      onClose();
      router.push(`/orders/${data.orderId}`);
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex justify-end" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-background h-full overflow-y-auto animate-in slide-in-from-right duration-200 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <h2 className="font-bold text-base">Keranjang ({totalItems})</h2>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
            <ShoppingCart className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Keranjang masih kosong</p>
            <Button variant="outline" size="sm" onClick={onClose}>Lanjut Belanja</Button>
          </div>
        ) : (
          <>
            {/* Items grouped by store */}
            <div className="flex-1 p-4 space-y-4">
              {Object.entries(grouped).map(([umkmId, storeItems]) => (
                <div key={umkmId} className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground">
                    {storeItems[0].umkmName}
                  </div>
                  <div className="divide-y">
                    {storeItems.map(item => (
                      <div key={item.productId} className="flex items-center gap-3 p-3">
                        <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden shrink-0">
                          {item.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl">🛍️</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-sm font-bold text-primary">{formatPrice(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-0 border rounded-md shrink-0">
                          <button onClick={() => item.qty === 1 ? removeItem(item.productId) : updateQty(item.productId, item.qty - 1)}
                            className="h-7 w-7 flex items-center justify-center hover:bg-muted">
                            {item.qty === 1 ? <Trash2 className="h-3 w-3 text-muted-foreground" /> : <Minus className="h-3 w-3" />}
                          </button>
                          <span className="h-7 w-8 flex items-center justify-center text-xs font-bold border-x">{item.qty}</span>
                          <button onClick={() => updateQty(item.productId, item.qty + 1)}
                            className="h-7 w-7 flex items-center justify-center hover:bg-muted">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Alamat Pengiriman *</label>
                <textarea value={address} onChange={e => setAddress(e.target.value)}
                  placeholder="Nama penerima, alamat lengkap, kode pos, kota..."
                  rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-none outline-none focus:ring-2 focus:ring-ring" />
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Catatan (opsional)</label>
                <textarea value={note} onChange={e => setNote(e.target.value)}
                  placeholder="Warna, ukuran, permintaan khusus..."
                  rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-none outline-none focus:ring-2 focus:ring-ring" />
              </div>

              {/* Payment */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Metode Pembayaran</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "QRIS", label: "QRIS", icon: "📱" },
                    { value: "BCA_VA", label: "Transfer Bank", icon: "🏦" },
                    { value: "BNI_VA", label: "BNI VA", icon: "🧾" },
                    { value: "BSI_VA", label: "BSI VA", icon: "🏦" },
                  ].map(m => (
                    <button key={m.value} onClick={() => setPayMethod(m.value)}
                      className={`border rounded-lg px-3 py-2.5 text-xs font-medium text-center transition-colors ${payMethod === m.value ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}>
                      <span className="block text-base mb-0.5">{m.icon}</span>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-background border-t p-4 space-y-3">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span><span>{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Biaya layanan</span><span>{formatPrice(PLATFORM_FEE)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Estimasi ongkir</span><span>{formatPrice(SHIPPING)}</span>
                </div>
                <div className="flex justify-between font-bold pt-1 border-t">
                  <span>Total</span><span className="text-primary">{formatPrice(grandTotal)}</span>
                </div>
              </div>
              <Button className="w-full gap-2" onClick={handleCheckout} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                Bayar Sekarang
              </Button>
              <p className="text-[10px] text-center text-muted-foreground">
                Dilindungi Escrow BeltimHub — dana ditahan sampai barang diterima
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
