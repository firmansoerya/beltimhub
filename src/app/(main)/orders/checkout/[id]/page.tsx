"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Loader2, Copy, CheckCircle2, Clock,
  Package, XCircle, QrCode, ShieldCheck, AlertTriangle, Store,
} from "lucide-react";
import { toast } from "sonner";
import { SHIPPING_METHOD_LABELS, type ShippingMethodKey } from "@/lib/constants";

function formatPrice(price: number) {
  return "Rp" + new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(price);
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function PaymentMethodLabel({ method }: { method: string | null }) {
  if (!method) return <span className="text-muted-foreground">-</span>;
  const labels: Record<string, string> = {
    QRIS: "QRIS",
    BCA_VA: "BCA Virtual Account", BNI_VA: "BNI Virtual Account",
    BRI_VA: "BRI Virtual Account", MANDIRI_VA: "Mandiri Virtual Account",
    BSI_VA: "BSI Virtual Account", PERMATA_VA: "Permata Virtual Account",
    OVO: "OVO", DANA: "DANA", SHOPEEPAY: "ShopeePay", LINKAJA: "LinkAja",
  };
  return <span>{labels[method] ?? method}</span>;
}

interface CheckoutSessionData {
  id: string;
  totalAmount: number;
  totalPlatformFee: number;
  totalShippingFee: number;
  paymentMethod: string | null;
  vaNumber: string | null;
  qrString: string | null;
  vaExpiry: string | null;
  paidAt: string | null;
  status: string;
  createdAt: string;
  orders: {
    id: string;
    invoiceNumber: string | null;
    orderStatus: string;
    totalAmount: number;
    sellerAmount: number;
    platformFee: number;
    shippingFee: number;
    shippingMethod: string | null;
    items: {
      id: string;
      quantity: number;
      price: number;
      product: { id: string; name: string; images: string[] };
    }[];
    seller: { fullName: string };
    _umkmName?: string;
  }[];
}

export default function CheckoutSessionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, isSignedIn } = useUser();
  const [session, setSession] = useState<CheckoutSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [justPaid, setJustPaid] = useState(searchParams.get("status") === "success");
  const [simulating, setSimulating] = useState(false);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/marketplace/checkout/${id}`);
      if (!res.ok) {
        toast.error("Gagal memuat data checkout");
        return;
      }
      const data = await res.json();
      setSession(prev => {
        if (prev?.status === "PENDING" && data.status === "PAID") {
          setJustPaid(true);
        }
        return data;
      });
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) { router.replace("/masuk-dulu"); return; }
    if (id) fetchSession();
  }, [id, isLoaded, isSignedIn, router, fetchSession]);

  // Polling saat menunggu pembayaran
  useEffect(() => {
    if (!session || session.status !== "PENDING") return;
    const interval = setInterval(fetchSession, 15000);
    return () => clearInterval(interval);
  }, [session, fetchSession]);

  async function handleSimulatePayment() {
    setSimulating(true);
    try {
      const res = await fetch(`/api/orders/marketplace/checkout/${id}/simulate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal simulasi");
      toast.success("Simulasi dikirim, menunggu konfirmasi...");
      setTimeout(() => fetchSession(), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal simulasi");
    } finally {
      setSimulating(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Disalin ke clipboard");
  }

  if (loading || !isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-muted-foreground">Checkout tidak ditemukan</p>
        <Link href="/pasar-lokal" className="text-sm text-primary hover:underline mt-2 inline-block">
          Kembali ke Pasar Lokal
        </Link>
      </div>
    );
  }

  const isWaiting = session.status === "PENDING";
  const isPaid = session.status === "PAID";
  const isVA = session.paymentMethod?.endsWith("_VA");
  const isQRIS = session.paymentMethod === "QRIS";
  const isExpired = session.vaExpiry ? new Date(session.vaExpiry) < new Date() : false;
  const totalShipping = session.totalShippingFee ?? 0;
  const subtotal = session.totalAmount - session.totalPlatformFee - totalShipping;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/pasar-lokal" className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Detail Pembayaran</h1>
          <p className="text-xs text-muted-foreground">{session.orders.length} pesanan dalam 1 pembayaran</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Payment instruction — only when waiting */}
        {isWaiting && !isExpired && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <h2 className="font-semibold text-sm text-amber-800">Selesaikan Pembayaran</h2>
              </div>

              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Metode Pembayaran</p>
                <p className="font-semibold"><PaymentMethodLabel method={session.paymentMethod} /></p>
              </div>

              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Total Pembayaran</p>
                <p className="text-2xl font-bold text-primary">{formatPrice(session.totalAmount)}</p>
              </div>

              {isVA && session.vaNumber && (
                <div className="bg-white rounded-lg p-3 border">
                  <p className="text-xs text-muted-foreground mb-1">Nomor Virtual Account</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-mono font-bold tracking-wider flex-1">{session.vaNumber}</span>
                    <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => copyToClipboard(session.vaNumber!)}>
                      <Copy className="h-3.5 w-3.5" />
                      Salin
                    </Button>
                  </div>
                </div>
              )}

              {isQRIS && session.qrString && (
                <div className="bg-white rounded-lg p-4 border flex flex-col items-center gap-3">
                  <QrCode className="h-5 w-5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground text-center">
                    Scan QR Code ini menggunakan aplikasi e-wallet atau mobile banking Anda
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(session.qrString)}`}
                    alt="QR Code"
                    className="w-48 h-48"
                  />
                  <p className="text-[10px] text-muted-foreground break-all text-center max-w-xs">{session.qrString}</p>
                </div>
              )}

              {session.vaExpiry && (
                <div className="text-xs text-amber-700 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Bayar sebelum {formatDate(session.vaExpiry)}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Pembayaran akan dikonfirmasi otomatis. Halaman ini akan diperbarui secara berkala.
              </p>

              {process.env.NODE_ENV !== "production" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 border-dashed border-amber-400 text-amber-700 hover:bg-amber-50"
                  onClick={handleSimulatePayment}
                  disabled={simulating}
                >
                  {simulating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  {simulating ? "Memproses simulasi..." : "⚡ Simulasi Pembayaran (Dev)"}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Expired warning */}
        {isWaiting && isExpired && (
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-700">
                <XCircle className="h-4 w-4" />
                <p className="text-sm font-medium">Batas waktu pembayaran telah lewat. Pesanan akan otomatis dibatalkan.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Just paid success */}
        {justPaid && isPaid && (
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800">Pembayaran Berhasil!</p>
                  {session.paidAt && <p className="text-xs text-green-700/70">Diterima pada {formatDate(session.paidAt)}</p>}
                </div>
              </div>
              <p className="text-xs text-green-700/80">
                Semua pesanan sedang menunggu konfirmasi dari masing-masing penjual.
              </p>
              <div className="flex gap-2 pt-1">
                <Link href="/pasar-lokal" className="flex-1">
                  <Button variant="outline" className="w-full gap-2 text-xs" size="sm">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Lanjut Belanja
                  </Button>
                </Link>
                <Link href="/dashboard/pesan?tab=pesanan" className="flex-1">
                  <Button className="w-full gap-2 text-xs" size="sm">
                    <Package className="h-3.5 w-3.5" />
                    Lihat Transaksi Saya
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order list per store */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Pesanan ({session.orders.length} toko)</h3>
          {session.orders.map((order, idx) => (
            <Card key={order.id}>
              <CardContent className="p-0">
                <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-semibold text-sm">
                      Pesanan {idx + 1} — {order.seller.fullName}
                    </span>
                  </div>
                  {isPaid && (
                    <Link
                      href={`/orders/${order.id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      Lihat Detail
                    </Link>
                  )}
                </div>

                <div className="divide-y">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">
                        {item.product.images?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm">🛍️</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">{item.quantity} x {formatPrice(item.price)}</p>
                      </div>
                      <p className="text-sm font-bold shrink-0">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>

                {order.invoiceNumber && (
                  <div className="px-4 py-2 border-t bg-muted/20 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Invoice:</span>
                    <span className="text-xs font-mono font-semibold">{order.invoiceNumber}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Payment summary */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold">Ringkasan Pembayaran</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {totalShipping > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Ongkir ({session.orders.length} toko)</span>
                  <span>{formatPrice(totalShipping)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Biaya layanan</span>
                <span>{formatPrice(session.totalPlatformFee)}</span>
              </div>
            </div>
            <Separator />
            <div className="flex justify-between font-bold">
              <span>Total Pembayaran</span>
              <span className="text-primary text-lg">{formatPrice(session.totalAmount)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-teal-700 dark:text-teal-400">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              <span>Dilindungi Escrow BeltimHub</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
