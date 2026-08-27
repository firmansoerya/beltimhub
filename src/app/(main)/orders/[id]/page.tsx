"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Loader2, Copy, CheckCircle2, Clock, Truck,
  Package, XCircle, QrCode, ShieldCheck, AlertTriangle, MessageSquare,
  Printer, User, MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { SHIPPING_METHOD_LABELS, type ShippingMethodKey } from "@/lib/constants";

function formatPrice(price: number) {
  return "Rp" + new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(price);
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: { id: string; name: string; images: string[]; price: number; umkmId: string; umkm: { name: string } };
}

interface Order {
  id: string;
  invoiceNumber: string | null;
  buyerId: string;
  sellerId: string;
  totalAmount: number;
  platformFee: number;
  shippingFee: number;
  shippingMethod: string | null;
  sellerAmount: number;
  paymentStatus: string;
  orderStatus: string;
  paymentMethod: string | null;
  vaNumber: string | null;
  qrString: string | null;
  vaExpiry: string | null;
  paidAt: string | null;
  shippedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  shippingAddress: string | null;
  shippingNote: string | null;
  trackingNumber: string | null;
  courier: string | null;
  buyerNote: string | null;
  createdAt: string;
  items: OrderItem[];
  buyer: { fullName: string; avatarUrl: string | null; email: string | null; phoneNumber: string | null };
  seller: { fullName: string; avatarUrl: string | null };
  viewerRole: "buyer" | "seller" | "admin";
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  WAITING_PAYMENT: { label: "Menunggu Pembayaran", color: "text-amber-600 bg-amber-50", icon: Clock },
  PAID: { label: "Sudah Dibayar", color: "text-blue-600 bg-blue-50", icon: CheckCircle2 },
  PROCESSING: { label: "Diproses", color: "text-blue-600 bg-blue-50", icon: Package },
  SHIPPED: { label: "Dikirim", color: "text-purple-600 bg-purple-50", icon: Truck },
  COMPLETED: { label: "Selesai", color: "text-green-600 bg-green-50", icon: CheckCircle2 },
  CANCELLED: { label: "Dibatalkan", color: "text-red-600 bg-red-50", icon: XCircle },
  REFUNDED: { label: "Dikembalikan", color: "text-gray-600 bg-gray-50", icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "text-gray-600 bg-gray-50", icon: Clock };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${cfg.color}`}>
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
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

function TimelineStep({ done, active, label, sublabel, date, icon, isLast, children }: {
  done?: boolean; active?: boolean; label: string; sublabel?: string;
  date?: string | null; icon: React.ReactNode; isLast?: boolean;
  children?: React.ReactNode;
}) {
  const dotColor = done ? "bg-primary text-white" : active ? "bg-blue-100 text-blue-600 ring-2 ring-blue-300" : "bg-muted text-muted-foreground";
  const lineColor = done ? "bg-primary" : "bg-muted";
  return (
    <div className="relative">
      {!isLast && (
        <div className={`absolute left-[-16px] top-6 w-0.5 h-full ${lineColor}`} />
      )}
      <div className={`absolute left-[-22px] top-0.5 w-5 h-5 rounded-full flex items-center justify-center ${dotColor}`}>
        <div className="scale-[0.6]">{icon}</div>
      </div>
      <div className="pb-1">
        <p className={`text-sm ${done || active ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
          {label}
        </p>
        {date && done && <p className="text-xs text-muted-foreground mt-0.5">{formatDate(date)}</p>}
        {sublabel && <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>}
        {children}
      </div>
    </div>
  );
}

function PrintAddressLabel({ order }: { order: Order }) {
  function handlePrint() {
    const itemList = order.items.map(i => `${i.product.name} x${i.quantity}`).join("\n");
    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Label Pengiriman</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: sans-serif; padding: 16px; font-size: 12px; }
  .label { border: 2px solid #000; padding: 16px; max-width: 360px; }
  .header { font-size: 14px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; text-align: center; }
  .section { margin-bottom: 12px; }
  .section-title { font-size: 10px; text-transform: uppercase; color: #666; margin-bottom: 4px; letter-spacing: 0.5px; }
  .name { font-size: 14px; font-weight: bold; }
  .address { margin-top: 4px; line-height: 1.5; }
  .note { font-style: italic; color: #666; margin-top: 4px; }
  .items { border-top: 1px dashed #ccc; padding-top: 8px; margin-top: 8px; }
  .item { margin-bottom: 2px; }
  .invoice { font-family: monospace; font-weight: bold; }
  @media print { body { padding: 0; } }
</style></head><body>
<div class="label">
  <div class="header">LABEL PENGIRIMAN</div>
  <div class="section">
    <div class="section-title">Penerima</div>
    <div class="name">${order.buyer.fullName}</div>
    ${order.buyer.phoneNumber ? `<div>${order.buyer.phoneNumber}</div>` : ""}
    <div class="address">${order.shippingAddress ?? "-"}</div>
    ${order.shippingNote ? `<div class="note">Catatan: ${order.shippingNote}</div>` : ""}
  </div>
  <div class="section">
    <div class="section-title">Pengirim</div>
    <div class="name">${order.items[0]?.product?.umkm?.name ?? order.seller.fullName}</div>
  </div>
  <div class="section items">
    <div class="section-title">Isi Paket</div>
    ${itemList.split("\n").map(l => `<div class="item">${l}</div>`).join("")}
  </div>
  ${order.invoiceNumber ? `<div class="section" style="border-top:1px dashed #ccc;padding-top:8px;margin-top:8px">
    <div class="section-title">Invoice</div>
    <div class="invoice">${order.invoiceNumber}</div>
  </div>` : ""}
</div>
<script>window.onload=function(){window.print();}</script>
</body></html>`);
    w.document.close();
  }

  return (
    <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handlePrint}>
      <Printer className="h-3.5 w-3.5" />
      Cetak Label
    </Button>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, isSignedIn } = useUser();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [justPaid, setJustPaid] = useState(searchParams.get("status") === "success");
  const confirm = useConfirm();
  const [showShipForm, setShowShipForm] = useState(false);
  const [shipCourier, setShipCourier] = useState("");
  const [shipTracking, setShipTracking] = useState("");
  const shipFormRef = useRef<HTMLDivElement>(null);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/marketplace/${id}`);
      if (!res.ok) {
        toast.error("Gagal memuat pesanan");
        return;
      }
      const data = await res.json();
      setOrder(prev => {
        if (prev?.orderStatus === "WAITING_PAYMENT" && data.orderStatus === "PAID") {
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
    if (id) fetchOrder();
  }, [id, isLoaded, isSignedIn, router, fetchOrder]);

  useEffect(() => {
    if (!order || order.orderStatus !== "WAITING_PAYMENT") return;
    const interval = setInterval(fetchOrder, 15000);
    return () => clearInterval(interval);
  }, [order, fetchOrder]);

  async function handleAction(action: string, extra?: Record<string, string>) {
    if (action === "accept_order") {
      const ok = await confirm({ description: "Terima dan proses pesanan ini?", confirmLabel: "Terima" });
      if (!ok) return;
    }
    if (action === "confirm_received") {
      const ok = await confirm({ description: "Konfirmasi barang sudah diterima? Dana akan diteruskan ke penjual.", confirmLabel: "Konfirmasi" });
      if (!ok) return;
    }
    if (action === "cancel") {
      const ok = await confirm({ description: "Batalkan pesanan ini?", variant: "destructive", confirmLabel: "Batalkan" });
      if (!ok) return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/marketplace/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Gagal memproses");
        return;
      }
      toast.success("Berhasil!");
      setShowShipForm(false);
      fetchOrder();
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmShipped() {
    if (!shipCourier.trim()) {
      toast.error("Masukkan nama kurir");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/marketplace/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_shipped",
          courier: shipCourier.trim(),
          trackingNumber: shipTracking.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Gagal memproses");
        return;
      }
      toast.success("Pesanan dikonfirmasi sudah dikirim!");
      setShowShipForm(false);
      fetchOrder();
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSimulatePayment() {
    setSimulating(true);
    try {
      const res = await fetch(`/api/orders/marketplace/${id}/simulate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal simulasi");
      toast.success("Simulasi dikirim, menunggu konfirmasi...");
      setTimeout(() => fetchOrder(), 2000);
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

  if (!order) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-muted-foreground">Pesanan tidak ditemukan</p>
        <Link href="/pasar-lokal" className="text-sm text-primary hover:underline mt-2 inline-block">
          Kembali ke Pasar Lokal
        </Link>
      </div>
    );
  }

  const isSeller = order.viewerRole === "seller";
  const isBuyer = order.viewerRole === "buyer";
  const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const isWaiting = order.orderStatus === "WAITING_PAYMENT";
  const isVA = order.paymentMethod?.endsWith("_VA");
  const isQRIS = order.paymentMethod === "QRIS";
  const isExpired = order.vaExpiry ? new Date(order.vaExpiry) < new Date() : false;
  const backUrl = isSeller ? "/dashboard/toko?tab=pesanan" : "/dashboard/pesan?tab=pesanan";

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href={backUrl} className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Detail Pesanan</h1>
        </div>
        <StatusBadge status={order.orderStatus} />
      </div>

      {/* Invoice info card */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              {order.invoiceNumber && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">No. Invoice</span>
                  <span className="text-sm font-mono font-bold text-primary">{order.invoiceNumber}</span>
                  <button onClick={() => copyToClipboard(order.invoiceNumber!)} className="text-muted-foreground hover:text-primary">
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{isSeller ? "Tanggal Pesanan" : "Tanggal Pembelian"}: {formatDate(order.createdAt)}</span>
              </div>
              {order.paymentMethod && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Pembayaran: <PaymentMethodLabel method={order.paymentMethod} /></span>
                </div>
              )}
            </div>
            {/* Chat Penjual — buyer PAID→SHIPPED */}
            {isBuyer && ["PAID", "PROCESSING", "SHIPPED"].includes(order.orderStatus) && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs shrink-0"
                onClick={async () => {
                  const umkmId = order.items[0]?.product?.umkmId;
                  if (!umkmId) return;
                  try {
                    const res = await fetch("/api/chat/conversations", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ umkmId }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                      const itemNames = order.items.map(i => i.product.name).join(", ");
                      const prefill = `Halo, saya mau tanya soal pesanan ${order.invoiceNumber ?? order.id} (${itemNames})`;
                      router.push(`/dashboard/pesan?tab=chat&conv=${data.conversationId}&prefill=${encodeURIComponent(prefill)}`);
                    } else {
                      toast.error(data.error ?? "Gagal membuka chat");
                    }
                  } catch {
                    toast.error("Gagal membuka chat");
                  }
                }}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Chat Penjual
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Seller: Buyer info card */}
      {isSeller && !isWaiting && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{order.buyer.fullName}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {order.buyer.phoneNumber && <span>{order.buyer.phoneNumber}</span>}
                  {order.buyer.email && <span>{order.buyer.email}</span>}
                </div>
              </div>
              {/* Chat Pembeli for seller */}
              {["PAID", "PROCESSING", "SHIPPED"].includes(order.orderStatus) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs shrink-0"
                  onClick={() => {
                    router.push(`/dashboard/toko?tab=chat`);
                  }}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Chat
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {/* Payment instruction — only when waiting (buyer only) */}
        {isWaiting && isBuyer && !isExpired && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <h2 className="font-semibold text-sm text-amber-800">Selesaikan Pembayaran</h2>
              </div>

              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Metode Pembayaran</p>
                <p className="font-semibold"><PaymentMethodLabel method={order.paymentMethod} /></p>
              </div>

              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Total Pembayaran</p>
                <p className="text-2xl font-bold text-primary">{formatPrice(order.totalAmount)}</p>
              </div>

              {isVA && order.vaNumber && (
                <div className="bg-white rounded-lg p-3 border">
                  <p className="text-xs text-muted-foreground mb-1">Nomor Virtual Account</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-mono font-bold tracking-wider flex-1">{order.vaNumber}</span>
                    <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => copyToClipboard(order.vaNumber!)}>
                      <Copy className="h-3.5 w-3.5" />
                      Salin
                    </Button>
                  </div>
                </div>
              )}

              {isQRIS && order.qrString && (
                <div className="bg-white rounded-lg p-4 border flex flex-col items-center gap-3">
                  <QrCode className="h-5 w-5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground text-center">
                    Scan QR Code ini menggunakan aplikasi e-wallet atau mobile banking Anda
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(order.qrString)}`}
                    alt="QR Code"
                    className="w-48 h-48"
                  />
                  <p className="text-[10px] text-muted-foreground break-all text-center max-w-xs">{order.qrString}</p>
                </div>
              )}

              {order.vaExpiry && (
                <div className="text-xs text-amber-700 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Bayar sebelum {formatDate(order.vaExpiry)}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Pembayaran akan dikonfirmasi otomatis. Halaman ini akan diperbarui secara berkala.
              </p>

              {process.env.NODE_ENV !== "production" && (
                <Button
                  variant="outline"
                  className="w-full border-dashed border-amber-400 text-amber-600 hover:bg-amber-50 hover:text-amber-700 text-xs"
                  onClick={handleSimulatePayment}
                  disabled={simulating}
                >
                  {simulating
                    ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Mensimulasi...</>
                    : "⚡ [Dev] Simulasi Pembayaran Berhasil"
                  }
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Seller sees waiting payment notice */}
        {isWaiting && isSeller && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-amber-700">
                <Clock className="h-4 w-4" />
                <p className="text-sm font-medium">Pembeli belum menyelesaikan pembayaran.</p>
              </div>
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

        {/* Just paid success — buyer only, right after payment */}
        {justPaid && isBuyer && order.paidAt && order.orderStatus !== "CANCELLED" && (
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800">Pembayaran Berhasil!</p>
                  <p className="text-xs text-green-700/70">Diterima pada {formatDate(order.paidAt)}</p>
                </div>
              </div>
              <p className="text-xs text-green-700/80">
                Pesananmu sedang menunggu konfirmasi dari penjual.
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

        {/* Order Progress Timeline */}
        {order.paidAt && order.orderStatus !== "CANCELLED" && !(justPaid && isBuyer) && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="text-sm font-semibold">Status Pesanan</h3>
              <div className="relative pl-6 space-y-4">
                {/* Step 1: Pembayaran */}
                <TimelineStep
                  done
                  label="Pembayaran Diterima"
                  date={order.paidAt}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                />
                {/* Step 2: Dikonfirmasi Seller */}
                <TimelineStep
                  done={["PROCESSING", "SHIPPED", "COMPLETED"].includes(order.orderStatus)}
                  active={order.orderStatus === "PAID"}
                  label={order.orderStatus === "PAID"
                    ? (isSeller ? "Menunggu kamu konfirmasi pesanan" : "Menunggu konfirmasi penjual")
                    : "Pesanan Dikonfirmasi"
                  }
                  icon={<Package className="h-4 w-4" />}
                >
                  {/* Seller action: Terima Pesanan */}
                  {order.orderStatus === "PAID" && isSeller && (
                    <div className="mt-2">
                      <Button
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => handleAction("accept_order")}
                        disabled={actionLoading}
                      >
                        {actionLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                        <Package className="h-3.5 w-3.5" />
                        Terima & Proses Pesanan
                      </Button>
                    </div>
                  )}
                  {/* Buyer action: Cancel */}
                  {order.orderStatus === "PAID" && isBuyer && (
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs text-destructive hover:text-destructive"
                        onClick={() => handleAction("cancel")}
                        disabled={actionLoading}
                      >
                        {actionLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                        Batalkan Pesanan
                      </Button>
                    </div>
                  )}
                </TimelineStep>

                {/* Step 3: Pesanan Diproses */}
                <TimelineStep
                  done={["SHIPPED", "COMPLETED"].includes(order.orderStatus)}
                  active={order.orderStatus === "PROCESSING"}
                  label={order.orderStatus === "PROCESSING"
                    ? (isSeller ? "Sedang kamu siapkan" : "Penjual sedang menyiapkan pesanan")
                    : "Pesanan Diproses"
                  }
                  icon={<Package className="h-4 w-4" />}
                >
                  {/* Seller action: Konfirmasi Pengiriman */}
                  {order.orderStatus === "PROCESSING" && isSeller && (
                    <div className="mt-2 space-y-2">
                      {!showShipForm ? (
                        <Button
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => {
                            setShowShipForm(true);
                            setTimeout(() => shipFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
                          }}
                        >
                          <Truck className="h-3.5 w-3.5" />
                          Konfirmasi Pengiriman
                        </Button>
                      ) : (
                        <div ref={shipFormRef} className="bg-muted/50 rounded-lg p-3 border space-y-2">
                          <p className="text-xs font-semibold">Info Pengiriman</p>
                          <input
                            type="text"
                            placeholder="Nama kurir (wajib) — cth: JNE, J&T, Kurir Toko"
                            value={shipCourier}
                            onChange={(e) => setShipCourier(e.target.value)}
                            className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                          />
                          <input
                            type="text"
                            placeholder="Nomor resi (opsional)"
                            value={shipTracking}
                            onChange={(e) => setShipTracking(e.target.value)}
                            className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="gap-1.5 text-xs"
                              onClick={handleConfirmShipped}
                              disabled={actionLoading}
                            >
                              {actionLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                              Kirim Sekarang
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              onClick={() => setShowShipForm(false)}
                              disabled={actionLoading}
                            >
                              Batal
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </TimelineStep>

                {/* Step 4: Dikirim */}
                <TimelineStep
                  done={["SHIPPED", "COMPLETED"].includes(order.orderStatus)}
                  label="Pesanan Dikirim"
                  sublabel={order.shippedAt ? `${order.courier ? order.courier + " · " : ""}${formatDate(order.shippedAt)}` : undefined}
                  icon={<Truck className="h-4 w-4" />}
                />
                {/* Tracking info */}
                {["SHIPPED", "COMPLETED"].includes(order.orderStatus) && order.trackingNumber && (
                  <div className="ml-1 -mt-2 mb-1 bg-purple-50 rounded-lg p-3 border border-purple-100">
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                      {order.courier && <span className="text-muted-foreground">Kurir: <span className="font-medium text-foreground">{order.courier}</span></span>}
                      <span className="text-muted-foreground">Resi: <span className="font-mono font-medium text-foreground">{order.trackingNumber}</span></span>
                      <button onClick={() => copyToClipboard(order.trackingNumber!)} className="text-primary hover:underline text-xs">Salin</button>
                    </div>
                  </div>
                )}

                {/* Step 5: Selesai */}
                <TimelineStep
                  done={order.orderStatus === "COMPLETED"}
                  active={order.orderStatus === "SHIPPED"}
                  label={order.orderStatus === "SHIPPED"
                    ? (isBuyer ? "Konfirmasi jika barang sudah diterima" : "Menunggu konfirmasi pembeli")
                    : "Pesanan Selesai"
                  }
                  sublabel={order.completedAt ? formatDate(order.completedAt) : undefined}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  isLast
                >
                  {/* Buyer action: Confirm received */}
                  {order.orderStatus === "SHIPPED" && isBuyer && (
                    <div className="mt-2">
                      <Button
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => handleAction("confirm_received")}
                        disabled={actionLoading}
                      >
                        {actionLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Konfirmasi Diterima
                      </Button>
                    </div>
                  )}
                </TimelineStep>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order items */}
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b bg-muted/30">
              <span className="font-semibold text-sm">Produk yang Dipesan</span>
            </div>
            <div className="divide-y">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden shrink-0">
                    {item.product.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg">🛍️</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/pasar-lokal/${item.product.id}`} className="text-sm font-medium line-clamp-1 hover:text-primary">
                      {item.product.name}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.quantity} x {formatPrice(item.price)}</p>
                  </div>
                  <p className="text-sm font-bold shrink-0">{formatPrice(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>

            {order.buyerNote && (
              <div className="px-4 py-3 border-t bg-muted/20">
                <p className="text-xs font-medium text-muted-foreground mb-1">Catatan {isSeller ? "Pembeli" : ""}:</p>
                <p className="text-xs text-muted-foreground whitespace-pre-line">{order.buyerNote}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Address */}
        {order.shippingAddress && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  Alamat Pengiriman
                </h3>
                {/* Cetak Label — seller only, from PROCESSING onwards */}
                {isSeller && ["PROCESSING", "SHIPPED", "COMPLETED"].includes(order.orderStatus) && (
                  <PrintAddressLabel order={order} />
                )}
              </div>
              <p className="text-sm text-muted-foreground">{order.shippingAddress}</p>
              {order.shippingNote && (
                <p className="text-xs text-muted-foreground italic">Catatan: {order.shippingNote}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment summary */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold">{isSeller ? "Ringkasan Pendapatan" : "Ringkasan Pembayaran"}</h3>
            {isSeller ? (() => {
              const shippingFee = order.shippingFee ?? 0;
              const sellerFee = subtotal + shippingFee - order.sellerAmount;
              return (
                <>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal ({order.items.reduce((s, i) => s + i.quantity, 0)} barang)</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    {shippingFee > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Ongkir{order.shippingMethod ? ` (${SHIPPING_METHOD_LABELS[order.shippingMethod as ShippingMethodKey]?.label ?? order.shippingMethod})` : ""}</span>
                        <span>{formatPrice(shippingFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-muted-foreground">
                      <span>Komisi platform</span>
                      <span>-{formatPrice(sellerFee)}</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Pendapatan Bersih</span>
                    <span className="text-primary text-lg">{formatPrice(order.sellerAmount)}</span>
                  </div>
                  {order.orderStatus === "COMPLETED" && (
                    <div className="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      <span>Dana akan diteruskan ke rekening Anda</span>
                    </div>
                  )}
                  {["PAID", "PROCESSING", "SHIPPED"].includes(order.orderStatus) && (
                    <div className="flex items-center gap-1.5 text-xs text-teal-700 dark:text-teal-400">
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                      <span>Dana ditahan Escrow sampai pesanan selesai</span>
                    </div>
                  )}
                </>
              );
            })() : (
              <>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal ({order.items.reduce((s, i) => s + i.quantity, 0)} barang)</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  {(order.shippingFee ?? 0) > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Ongkir{order.shippingMethod ? ` (${SHIPPING_METHOD_LABELS[order.shippingMethod as ShippingMethodKey]?.label ?? order.shippingMethod})` : ""}</span>
                      <span>{formatPrice(order.shippingFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground">
                    <span>Biaya layanan</span>
                    <span>{formatPrice(order.platformFee)}</span>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary text-lg">{formatPrice(order.totalAmount)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-teal-700 dark:text-teal-400">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  <span>Dilindungi Escrow BeltimHub</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Completed */}
        {order.orderStatus === "COMPLETED" && (
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800">Pesanan Selesai</p>
                  {order.completedAt && (
                    <p className="text-xs text-green-700/70">Selesai pada {formatDate(order.completedAt)}</p>
                  )}
                </div>
              </div>
              {isSeller ? (
                <div className="flex gap-2 pt-1">
                  <Link href="/dashboard/toko?tab=pesanan" className="flex-1">
                    <Button className="w-full gap-2 text-xs" size="sm">
                      <Package className="h-3.5 w-3.5" />
                      Kembali ke Toko
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex gap-2 pt-1">
                  <Link href="/pasar-lokal" className="flex-1">
                    <Button variant="outline" className="w-full gap-2 text-xs" size="sm">
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Belanja Lagi
                    </Button>
                  </Link>
                  <Link href="/dashboard/pesan?tab=pesanan" className="flex-1">
                    <Button className="w-full gap-2 text-xs" size="sm">
                      <Package className="h-3.5 w-3.5" />
                      Lihat Transaksi Saya
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Cancelled */}
        {order.orderStatus === "CANCELLED" && (
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-800">Pesanan Dibatalkan</p>
                  {order.cancelledAt && (
                    <p className="text-xs text-red-700/70">Dibatalkan pada {formatDate(order.cancelledAt)}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Link href={isSeller ? "/dashboard/toko" : "/pasar-lokal"} className="flex-1">
                  <Button variant="outline" className="w-full gap-2 text-xs" size="sm">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {isSeller ? "Kembali ke Toko" : "Kembali"}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Buyer: Batalkan saat WAITING_PAYMENT (belum bayar) */}
        {isBuyer && order.orderStatus === "WAITING_PAYMENT" && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => handleAction("cancel")}
              disabled={actionLoading}
              className="gap-2 text-destructive hover:text-destructive"
            >
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Batalkan Pesanan
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
