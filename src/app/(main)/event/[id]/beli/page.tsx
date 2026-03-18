"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Check, Loader2, Ticket, Copy, RefreshCw, Plus, Minus, LayoutGrid, User, LogIn,
} from "lucide-react";
import { useUser, SignInButton } from "@clerk/nextjs";
import type { CustomField } from "@/components/CustomFieldBuilder";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TicketCategory {
  id: string; name: string; description: string | null; price: number; quota: number;
  isPresale?: boolean; isDiscount?: boolean; originalPrice?: number | null;
  _count?: { tickets: number };
}
interface EventInfo {
  id: string; title: string; price: number; feeType: string;
  location: string; eventDate: string; coverImage: string | null;
  layoutImage?: string | null;
  requiresJersey: boolean; requiresBib: boolean;
  maxPerPerson?: number | null;
  oneEmailOneTransaction?: boolean;
  uniqueParticipants?: boolean;
  customFields?: CustomField[] | null;
  ticketCategories: TicketCategory[];
}
interface PaymentResult {
  type: "VA" | "QRIS" | "EWALLET";
  vaNumber?: string; vaBank?: string; qrString?: string; checkoutUrl?: string;
  expiryDate?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: number) {
  if (price === 0) return "Gratis";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
}

const PLATFORM_FEE_PCT = 5;

function calcUnitTotal(price: number, feeType: string) {
  if (price === 0) return 0;
  return feeType === "FEE_ABSORBED" ? price : Math.round(price * (1 + PLATFORM_FEE_PCT / 100));
}

// ─── Payment Methods ──────────────────────────────────────────────────────────

const BANK_METHODS = [
  { key: "BCA_VA",     label: "BCA",     logo: "/images/payment/bca.svg" },
  { key: "BNI_VA",     label: "BNI",     logo: "/images/payment/bni.svg" },
  { key: "BRI_VA",     label: "BRI",     logo: "/images/payment/bri.svg" },
  { key: "MANDIRI_VA", label: "Mandiri", logo: "/images/payment/mandiri.svg" },
  { key: "BSI_VA",     label: "BSI",     logo: "/images/payment/bsi.svg" },
  { key: "PERMATA_VA", label: "Permata", logo: "/images/payment/permata.svg" },
] as const;

const EWALLET_METHODS = [
  { key: "QRIS",      label: "QRIS",      logo: "/images/payment/qris.svg" },
  { key: "OVO",       label: "OVO",       logo: "/images/payment/ovo.svg" },
  { key: "DANA",      label: "Dana",      logo: "/images/payment/dana.svg" },
  { key: "SHOPEEPAY", label: "ShopeePay", logo: "/images/payment/shopeepay.svg" },
  { key: "LINKAJA",   label: "LinkAja",   logo: "/images/payment/linkaja.svg" },
] as const;

type PaymentMethodKey = (typeof BANK_METHODS)[number]["key"] | (typeof EWALLET_METHODS)[number]["key"];

// ─── Step Progress Bar ────────────────────────────────────────────────────────

const STEPS_PAID = ["Pilih Tiket", "Detail Pesanan", "Metode Bayar", "Pembayaran"];
const STEPS_FREE = ["Pilih Tiket", "Detail Pesanan"];

function StepBar({ step, isFree }: { step: number; isFree: boolean }) {
  const labels = isFree ? STEPS_FREE : STEPS_PAID;
  return (
    <div className="mb-8">
      <div className="flex items-center gap-0">
        {labels.map((label, i) => {
          const idx = i + 1;
          const done = step > idx;
          const active = step === idx;
          return (
            <div key={idx} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
                  done ? "bg-primary text-primary-foreground"
                    : active ? "bg-primary/20 text-primary border-2 border-primary"
                    : "bg-muted text-muted-foreground"
                )}>
                  {done ? <Check className="h-3.5 w-3.5" /> : idx}
                </div>
                <span className={cn("text-[10px] whitespace-nowrap", active ? "text-primary font-medium" : "text-muted-foreground")}>
                  {label}
                </span>
              </div>
              {i < labels.length - 1 && (
                <div className={cn("flex-1 h-0.5 mx-1 mb-4", done ? "bg-primary" : "bg-muted")} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Per-ticket entry ─────────────────────────────────────────────────────────

interface TicketEntry {
  categoryId: string;
  categoryName: string;
  name: string;
  phone: string;
  email: string;
  ktp: string;
  customData: Record<string, string>;
  sameAsPemesan: boolean;
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function BeliTiketPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const { isSignedIn, user: clerkUser } = useUser();

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);

  const [step, setStep] = useState(1);
  // categoryId -> quantity
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodKey | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [createdTicketIds, setCreatedTicketIds] = useState<string[]>([]);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"PENDING" | "PAID" | "FAILED" | "EXPIRED">("PENDING");
  const [polling, setPolling] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Data pemesan
  const [orderer, setOrderer] = useState({ name: "", phone: "", email: "", ktp: "" });
  const [ordererErrors, setOrdererErrors] = useState({ name: "", phone: "", email: "", ktp: "" });

  // Per-ticket entries (initialized when entering step 2)
  const [ticketEntries, setTicketEntries] = useState<TicketEntry[]>([]);

  // Konfirmasi modal sebelum submit
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // ── Auto-fill data pemesan dari profil login ──────────────────────────────────
  useEffect(() => {
    if (!isSignedIn || !clerkUser) return;
    const email = clerkUser.primaryEmailAddress?.emailAddress ?? "";
    const fullName = clerkUser.fullName ?? "";
    // Fetch phoneNumber dari DB (tidak tersedia di Clerk client)
    fetch("/api/profile")
      .then(r => r.ok ? r.json() : null)
      .then(profile => {
        setOrderer(prev => ({
          ...prev,
          name: prev.name || fullName,
          email: prev.email || email,
          phone: prev.phone || (profile?.phoneNumber ?? ""),
        }));
      })
      .catch(() => {
        setOrderer(prev => ({
          ...prev,
          name: prev.name || fullName,
          email: prev.email || email,
        }));
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);
  // ─────────────────────────────────────────────────────────────────────────────

  // ── Persist & restore state agar tidak hilang saat Clerk login reload ────────
  const [hasRestored, setHasRestored] = useState(false);
  const SESSION_KEY = `beli-state-${eventId}`;

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        const p = JSON.parse(saved);
        // Hanya restore step 2-3 (step 4 = payment, tidak boleh di-restore karena butuh payment baru)
        if (p.step >= 2 && p.step <= 3) {
          setStep(p.step);
          setSelectedItems(p.selectedItems ?? {});
          setOrderer(p.orderer ?? { name: "", phone: "", email: "" });
          setTicketEntries(p.ticketEntries ?? []);
        }
      } catch { /* abaikan */ }
      sessionStorage.removeItem(SESSION_KEY);
    }
    setHasRestored(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  useEffect(() => {
    if (!hasRestored) return;
    // Simpan hanya step 2-3 agar survive Clerk login redirect
    // Step 4 (payment) tidak disimpan karena harus dimulai ulang
    if (step >= 2 && step <= 3) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ step, selectedItems, orderer, ticketEntries }));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedItems, orderer, ticketEntries, hasRestored]);
  // ─────────────────────────────────────────────────────────────────────────────

  // Load event
  useEffect(() => {
    fetch(`/api/events/${eventId}`)
      .then(r => r.json())
      .then(data => { setEvent(data); setLoadingEvent(false); })
      .catch(() => { toast.error("Gagal memuat data event"); setLoadingEvent(false); });
  }, [eventId]);

  // Timer countdown
  useEffect(() => {
    if (!paymentResult?.expiryDate) return;
    const expiry = new Date(paymentResult.expiryDate).getTime();
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [paymentResult?.expiryDate]);

  // Poll payment status
  const checkPaymentStatus = useCallback(async () => {
    if (!ticketId || polling) return;
    setPolling(true);
    try {
      const res = await fetch(`/api/payments/${ticketId}`);
      const data = await res.json();
      if (data.status === "PAID") {
        setPaymentStatus("PAID");
        toast.success("Pembayaran berhasil!");
        setTimeout(() => router.push(`/tiket/${ticketId}`), 1500);
      } else if (data.status === "FAILED" || data.status === "EXPIRED") {
        setPaymentStatus(data.status);
      }
    } finally {
      setPolling(false);
    }
  }, [ticketId, polling, router]);

  // Auto-poll every 5s on step 4
  useEffect(() => {
    if (step !== 4 || paymentStatus !== "PENDING") return;
    const interval = setInterval(checkPaymentStatus, 5000);
    return () => clearInterval(interval);
  }, [step, paymentStatus, checkPaymentStatus]);

  if (loadingEvent) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container max-w-xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">Event tidak ditemukan.</p>
        <Link href="/event" className="text-primary text-sm underline mt-2 inline-block">Kembali ke daftar event</Link>
      </div>
    );
  }

  // Build unified category list
  const categories = event.ticketCategories ?? [];
  const allCategories: TicketCategory[] = categories.length > 0 ? categories : [{
    id: "__default__",
    name: "Tiket " + event.title,
    description: null,
    price: event.price,
    quota: 9999,
  }];

  // Computed order summary
  const orderItems = allCategories
    .filter(c => (selectedItems[c.id] ?? 0) > 0)
    .map(c => ({
      category: c,
      quantity: selectedItems[c.id],
      lineTotal: calcUnitTotal(c.price, event.feeType) * selectedItems[c.id],
    }));

  const totalQty = orderItems.reduce((s, i) => s + i.quantity, 0);
  const grandTotal = orderItems.reduce((s, i) => s + i.lineTotal, 0);
  const isFree = totalQty > 0 && grandTotal === 0;
  const platformFee = event.feeType !== "FEE_ABSORBED"
    ? orderItems.reduce((s, i) => s + Math.round(i.category.price * PLATFORM_FEE_PCT / 100) * i.quantity, 0)
    : 0;
  const baseTotal = grandTotal - platformFee;

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── Quantity helpers ────────────────────────────────────────────────────────

  const eventMaxPerPurchase = event?.maxPerPerson ?? 999;

  function adjustQty(catId: string, delta: number) {
    setSelectedItems(prev => {
      const current = prev[catId] ?? 0;
      const next = current + delta;
      if (next <= 0) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [catId]: _removed, ...rest } = prev;
        return rest;
      }
      const cat = allCategories.find(c => c.id === catId);
      const totalOther = Object.entries(prev).filter(([k]) => k !== catId).reduce((s, [, v]) => s + v, 0);
      const maxFromEvent = eventMaxPerPurchase - totalOther;
      const maxAllowed = Math.min(maxFromEvent, cat?.quota ?? 10);
      return { ...prev, [catId]: Math.min(next, maxAllowed) };
    });
  }

  function goStep1to2() {
    if (totalQty === 0) { toast.error("Pilih minimal 1 tiket terlebih dahulu"); return; }
    if (totalQty > eventMaxPerPurchase) { toast.error(`Maksimal ${eventMaxPerPurchase} tiket per pembelian`); return; }

    // Build flat list of ticket entries
    const entries: TicketEntry[] = [];
    for (const item of orderItems) {
      for (let i = 0; i < item.quantity; i++) {
        entries.push({
          categoryId: item.category.id,
          categoryName: item.category.id === "__default__" ? event!.title : item.category.name,
          name: "", phone: "", email: "", ktp: "",
          customData: {},
          sameAsPemesan: false,
        });
      }
    }
    setTicketEntries(entries);
    setStep(2);
  }

  // ── Step 2: Create tickets ──────────────────────────────────────────────────

  function onSubmitStep2() {
    // Validate orderer
    const errs = { name: "", phone: "", email: "", ktp: "" };
    if (!orderer.name.trim() || orderer.name.trim().length < 2) errs.name = "Nama minimal 2 karakter";
    if (!orderer.phone.trim() || orderer.phone.trim().length < 10) errs.phone = "Nomor HP tidak valid";
    if (!orderer.email.trim()) errs.email = "Email wajib diisi";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orderer.email.trim())) errs.email = "Format email tidak valid";
    if (event?.uniqueParticipants && !orderer.ktp.trim()) errs.ktp = "No. KTP wajib diisi untuk event ini";
    setOrdererErrors(errs);
    if (errs.name || errs.phone || errs.email || errs.ktp) return;

    // Validate non-sameAsPemesan entries
    for (let i = 0; i < ticketEntries.length; i++) {
      const e = ticketEntries[i];
      if (!e.sameAsPemesan) {
        if (!e.name.trim() || e.name.trim().length < 2) {
          toast.error(`Tiket ${i + 1}: Nama minimal 2 karakter`); return;
        }
      }
    }

    // Tampilkan modal konfirmasi
    setShowConfirmModal(true);
  }

  async function doSubmitStep2() {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    try {
      const allIds: string[] = [];
      let needsPayment = false;
      const checkoutOrderId = crypto.randomUUID();

      for (const entry of ticketEntries) {
        const pData = entry.sameAsPemesan ? orderer : entry;
        const res = await fetch("/api/tickets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId,
            ticketCategoryId: entry.categoryId !== "__default__" ? entry.categoryId : undefined,
            orderId: checkoutOrderId,
            participantName: pData.name,
            participantPhone: pData.phone || undefined,
            participantEmail: pData.email || undefined,
            participantKtp: orderer.ktp || undefined,
            ordererPhone: orderer.phone || undefined,
            ordererEmail: orderer.email || undefined,
            customData: Object.keys(entry.customData).length > 0 ? entry.customData : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.formErrors?.[0] ?? data.error ?? "Gagal mendaftar");
        allIds.push(data.ticket.id);
        if (data.requiresPayment) needsPayment = true;
      }

      setCreatedTicketIds(allIds);
      setTicketId(allIds[0]);
      sessionStorage.removeItem(SESSION_KEY);

      if (!needsPayment) {
        // For free events, trigger order-level confirmation (e-voucher + invoice) once
        fetch("/api/tickets/send-confirmation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketIds: allIds }),
        }).catch(console.error);
        toast.success("Pendaftaran berhasil!");
        router.push(`/tiket/${allIds[0]}`);
        return;
      }
      setStep(3);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Step 3: Create payment ──────────────────────────────────────────────────

  async function handleCreatePayment() {
    if (!selectedPaymentMethod || createdTicketIds.length === 0) {
      toast.error("Pilih metode pembayaran terlebih dahulu");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: createdTicketIds[0],
          ticketIds: createdTicketIds,
          paymentMethod: selectedPaymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal membuat pembayaran");

      setPaymentResult(data);

      if (data.type === "EWALLET" && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setStep(4);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Dev: simulate payment ───────────────────────────────────────────────────

  async function handleSimulatePayment() {
    if (!ticketId) return;
    setSimulating(true);
    try {
      const res = await fetch(`/api/payments/${ticketId}/simulate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal simulasi");
      toast.success("Simulasi dikirim, menunggu konfirmasi...");
      setTimeout(() => checkPaymentStatus(), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal simulasi");
    } finally {
      setSimulating(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <Link href={`/event/${eventId}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Kembali ke detail event
      </Link>

      <h1 className="text-xl font-bold mb-1">{event.title}</h1>
      <p className="text-sm text-muted-foreground mb-6">{event.location}</p>

      <StepBar step={step} isFree={isFree || totalQty === 0} />

      {/* ── Modal Konfirmasi Pesanan ───────────────────────────────────── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-semibold">Konfirmasi Pesanan</h2>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-muted-foreground hover:text-foreground text-lg leading-none"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Pastikan data sebelum melanjutkan</p>

            {/* Data pemesan */}
            <div className="flex flex-col gap-2 mb-5">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{orderer.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <svg className="h-4 w-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0l-9.75 6.75L2.25 6.75" />
                </svg>
                <span>{orderer.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <svg className="h-4 w-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 8.25h3" />
                </svg>
                <span>{orderer.phone}</span>
              </div>
            </div>

            {/* Informasi penting */}
            <div className="bg-muted/50 rounded-lg p-3 mb-5 text-sm space-y-1.5 text-muted-foreground">
              <p className="font-medium text-foreground">Informasi Penting :</p>
              <p>1. Invoice dan E-Tiket akan dikirim ke email berikut <span className="text-primary font-medium">{orderer.email}</span></p>
              <p>2. E-Tiket juga akan dikirim melalui WhatsApp ke nomor berikut <span className="text-primary font-medium">{orderer.phone}</span></p>
              <p>3. Jika belum menerima notifikasi email setelah pembayaran:</p>
              <ul className="pl-4 space-y-0.5">
                <li>- Cari "BeltimHub" pada kolom pencarian email</li>
                <li>- Periksa folder spam/promosi pada email</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowConfirmModal(false)}>
                Edit Data
              </Button>
              <Button className="flex-1" onClick={doSubmitStep2}>
                Saya Mengerti
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 1: Pilih Tiket ────────────────────────────────────── */}
      {step === 1 && (
        <div className="grid md:grid-cols-5 gap-6 items-start">

          {/* Left: Banner + Category List */}
          <div className="md:col-span-3 space-y-4">
            {/* Banner */}
            <div className="rounded-xl overflow-hidden bg-muted" style={{ height: "200px" }}>
              {event.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={event.coverImage} alt={event.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 via-purple-100 to-purple-200 flex items-center justify-center">
                  <Ticket className="h-12 w-12 text-primary/30" />
                </div>
              )}
            </div>

            {/* Category list */}
            <div>
              <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Ticket className="h-4 w-4 text-muted-foreground" />
                Kategori Tiket
              </h2>
              <div className="space-y-3">
                {allCategories.map(cat => {
                  const qty = selectedItems[cat.id] ?? 0;
                  const isSelected = qty > 0;
                  const unitTotal = calcUnitTotal(cat.price, event.feeType);
                  return (
                    <div
                      key={cat.id}
                      className={cn(
                        "border rounded-xl p-4 transition-all",
                        isSelected ? "border-primary bg-primary/5" : "border-border bg-card"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-semibold text-sm">{cat.name}</p>
                            {(() => {
                              const remaining = cat.id === "__default__" ? cat.quota : cat.quota - (cat._count?.tickets ?? 0);
                              if (remaining <= 0) return (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Habis</span>
                              );
                              return (
                                <>
                                  {cat.isPresale && (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Presale</span>
                                  )}
                                  {cat.isDiscount && !cat.isPresale && (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Diskon</span>
                                  )}
                                  {!cat.isPresale && !cat.isDiscount && (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">On Sale</span>
                                  )}
                                  {remaining <= 10 && (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                      Sisa {remaining} tiket
                                    </span>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                          {cat.description && (
                            cat.description.startsWith("<") ? (
                              <div
                                className="text-xs text-muted-foreground mb-2 leading-relaxed prose prose-sm max-w-none [&_p]:my-0.5 [&_ul]:my-1 [&_li]:my-0 [&_strong]:text-foreground"
                                // eslint-disable-next-line react/no-danger
                                dangerouslySetInnerHTML={{ __html: cat.description }}
                              />
                            ) : (
                              <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{cat.description}</p>
                            )
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            {(cat.isPresale || cat.isDiscount) && cat.originalPrice && cat.originalPrice > 0 && (
                              <span className="text-sm text-muted-foreground line-through">
                                {formatPrice(cat.originalPrice)}
                              </span>
                            )}
                            <p className={cn("font-bold text-sm", cat.price === 0 ? "text-green-600" : (cat.isPresale || cat.isDiscount) ? "text-orange-600" : "text-primary")}>
                              {formatPrice(cat.price)}
                            </p>
                            {cat.price > 0 && event.feeType !== "FEE_ABSORBED" && (
                              <span className="text-xs text-muted-foreground">+ biaya platform 5%</span>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0">
                          {(() => {
                            const remaining = cat.id === "__default__" ? cat.quota : cat.quota - (cat._count?.tickets ?? 0);
                            if (remaining <= 0 && !isSelected) return (
                              <Button size="sm" variant="outline" disabled className="text-xs">Habis</Button>
                            );
                          })()}
                          {!isSelected && (cat.id === "__default__" || (cat.quota - (cat._count?.tickets ?? 0)) > 0) ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                              onClick={() => adjustQty(cat.id, 1)}
                            >
                              Pilih Tiket
                            </Button>
                          ) : (
                            <div className="flex items-center gap-0 border border-primary rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={() => adjustQty(cat.id, -1)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-primary/10 transition-colors text-primary"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="text-sm font-bold w-7 text-center text-primary">{qty}</span>
                              <button
                                type="button"
                                onClick={() => adjustQty(cat.id, 1)}
                                disabled={qty >= cat.quota || totalQty >= eventMaxPerPurchase}
                                className="w-8 h-8 flex items-center justify-center hover:bg-primary/10 transition-colors text-primary disabled:opacity-40"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Venue Placeholder + Order Summary */}
          <div className="md:col-span-2 space-y-4">
            {/* Venue / Seating layout */}
            {event.layoutImage ? (
              <div className="border rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={event.layoutImage} alt="Info layout" className="w-full object-contain" />
              </div>
            ) : (
              <div className="border rounded-xl overflow-hidden">
                <div
                  className="flex flex-col items-center justify-center gap-2"
                  style={{ height: "180px", background: "linear-gradient(160deg, #3b1e6e 0%, #6d28d9 50%, #7c3aed 100%)" }}
                >
                  <LayoutGrid className="h-8 w-8 text-white/40" />
                  <p className="text-white/50 text-xs font-medium tracking-wide">Layout Venue</p>
                </div>
              </div>
            )}

            {/* Order summary */}
            <div className="border rounded-xl p-4 space-y-3 sticky top-4">
              <p className="font-semibold text-sm">Rincian Pesanan</p>

              {orderItems.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Belum ada tiket dipilih</p>
              ) : (
                <div className="space-y-1.5">
                  {orderItems.map(item => (
                    <div key={item.category.id} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        {item.category.id === "__default__" ? "Tiket" : item.category.name}
                        <span className="font-medium text-foreground ml-1">× {item.quantity}</span>
                      </span>
                      <span className="font-medium">
                        {formatPrice(item.category.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                  {platformFee > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Biaya platform (5%)</span>
                      <span>{formatPrice(platformFee)}</span>
                    </div>
                  )}
                  {event.feeType === "FEE_ABSORBED" && totalQty > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Biaya platform</span>
                      <span className="text-green-600">Ditanggung penyelenggara</span>
                    </div>
                  )}
                  <div className="border-t pt-2 mt-2 space-y-1">
                    {platformFee > 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Subtotal harga tiket</span>
                        <span>{formatPrice(baseTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold">
                      <span>Total {totalQty} Tiket</span>
                      <span className="text-primary">{isFree ? "Gratis" : formatPrice(grandTotal)}</span>
                    </div>
                  </div>
                </div>
              )}

              <Button className="w-full" onClick={goStep1to2} disabled={totalQty === 0}>
                {totalQty === 0
                  ? "Pilih Tiket Dulu"
                  : <>{isFree ? "Daftar Gratis" : "Lanjutkan"} ({totalQty} tiket)</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Detail Pesanan ─────────────────────────────────── */}
      {step === 2 && (
        <div className="grid md:grid-cols-5 gap-6 items-start">

          {/* Left: Forms */}
          <div className="md:col-span-3 space-y-4">

            {/* Banner login prompt — hanya tampil jika belum login */}
            {!isSignedIn && (
              <div className="border border-primary/20 bg-primary/5 rounded-xl p-4 flex items-start gap-3">
                <LogIn className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Sudah punya akun?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Login untuk menyimpan tiket ke dashboard dan melihat riwayat pembelianmu.
                  </p>
                </div>
                <SignInButton mode="modal">
                  <button className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0">
                    Login
                  </button>
                </SignInButton>
              </div>
            )}

            {/* Data Pemesan */}
            <div className="border rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold text-sm">Data Pemesan</h2>
              </div>
              <div>
                <Label htmlFor="ordererName">Nama Lengkap *</Label>
                <Input
                  id="ordererName" className="mt-1.5" placeholder="Masukkan nama lengkap"
                  value={orderer.name}
                  onChange={e => setOrderer(p => ({ ...p, name: e.target.value }))}
                />
                {ordererErrors.name && <p className="text-destructive text-xs mt-1">{ordererErrors.name}</p>}
              </div>
              <div>
                <Label htmlFor="ordererPhone">No. WhatsApp *</Label>
                <Input
                  id="ordererPhone" className="mt-1.5" placeholder="08xxxxxxxxxx"
                  value={orderer.phone}
                  onChange={e => setOrderer(p => ({ ...p, phone: e.target.value }))}
                />
                {ordererErrors.phone && <p className="text-destructive text-xs mt-1">{ordererErrors.phone}</p>}
              </div>
              <div>
                <Label htmlFor="ordererEmail">Email *</Label>
                <Input
                  id="ordererEmail" type="email" className="mt-1.5" placeholder="email@contoh.com"
                  value={orderer.email}
                  onChange={e => setOrderer(p => ({ ...p, email: e.target.value }))}
                />
                {ordererErrors.email && <p className="text-destructive text-xs mt-1">{ordererErrors.email}</p>}
                <p className="text-xs text-muted-foreground mt-1">Invoice & e-tiket akan dikirim ke email ini.</p>
              </div>
              <div>
                <Label htmlFor="ordererKtp">
                  No. KTP {event.uniqueParticipants ? <span className="text-destructive">*</span> : <span className="text-muted-foreground font-normal">(opsional)</span>}
                </Label>
                <Input
                  id="ordererKtp" className="mt-1.5" placeholder="16 digit nomor KTP"
                  maxLength={16}
                  value={orderer.ktp}
                  onChange={e => setOrderer(p => ({ ...p, ktp: e.target.value.replace(/\D/g, "") }))}
                />
                {ordererErrors.ktp && <p className="text-destructive text-xs mt-1">{ordererErrors.ktp}</p>}
              </div>
            </div>

            {/* Per-ticket data */}
            {ticketEntries.map((entry, idx) => {
              const customFields = event.customFields ?? [];
              return (
                <div key={idx} className="border rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-semibold text-sm">
                        Tiket {idx + 1}
                        {ticketEntries.length > 1 && <span className="text-muted-foreground font-normal"> — {entry.categoryName}</span>}
                      </span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <span className="text-xs text-muted-foreground">Sama dengan data pemesan</span>
                      <button
                        type="button"
                        onClick={() => setTicketEntries(prev => prev.map((e, i) => i === idx ? { ...e, sameAsPemesan: !e.sameAsPemesan } : e))}
                        className={cn(
                          "relative w-9 h-5 rounded-full transition-colors shrink-0",
                          entry.sameAsPemesan ? "bg-primary" : "bg-muted-foreground/30"
                        )}
                      >
                        <span className={cn(
                          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                          entry.sameAsPemesan ? "translate-x-4" : "translate-x-0"
                        )} />
                      </button>
                    </label>
                  </div>

                  {/* Peserta identity fields — hidden if sameAsPemesan */}
                  {!entry.sameAsPemesan && (
                    <div className="space-y-3">
                      <div>
                        <Label>Nama Lengkap *</Label>
                        <Input
                          className="mt-1.5" placeholder="Nama peserta"
                          value={entry.name}
                          onChange={e => setTicketEntries(prev => prev.map((te, i) => i === idx ? { ...te, name: e.target.value } : te))}
                        />
                      </div>
                      <div>
                        <Label>No. WhatsApp</Label>
                        <Input
                          className="mt-1.5" placeholder="08xxxxxxxxxx"
                          value={entry.phone}
                          onChange={e => setTicketEntries(prev => prev.map((te, i) => i === idx ? { ...te, phone: e.target.value } : te))}
                        />
                      </div>
                      <div>
                        <Label>Email <span className="text-muted-foreground font-normal">(opsional)</span></Label>
                        <Input
                          type="email" className="mt-1.5" placeholder="email@contoh.com"
                          value={entry.email}
                          onChange={e => setTicketEntries(prev => prev.map((te, i) => i === idx ? { ...te, email: e.target.value } : te))}
                        />
                      </div>
                    </div>
                  )}

                  {/* Custom fields (atribut peserta) — always shown per ticket */}
                  {customFields.length > 0 && (
                    <div className="space-y-3 border-t pt-3">
                      {customFields.map(field => (
                        <div key={field.id}>
                          <Label>{field.label}{field.required && " *"}</Label>
                          {field.type === "textarea" ? (
                            <textarea
                              className="w-full border border-border rounded-lg px-3 py-2 text-sm mt-1.5 outline-none focus:border-primary"
                              rows={3} placeholder={field.placeholder} required={field.required}
                              value={entry.customData[field.id] ?? ""}
                              onChange={e => setTicketEntries(prev => prev.map((te, i) => i === idx ? { ...te, customData: { ...te.customData, [field.id]: e.target.value } } : te))}
                            />
                          ) : field.type === "select" ? (
                            <select
                              className="w-full border border-border rounded-lg px-3 py-2 text-sm mt-1.5 outline-none focus:border-primary bg-background"
                              required={field.required}
                              value={entry.customData[field.id] ?? ""}
                              onChange={e => setTicketEntries(prev => prev.map((te, i) => i === idx ? { ...te, customData: { ...te.customData, [field.id]: e.target.value } } : te))}
                            >
                              <option value="">-- Pilih --</option>
                              {(field.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <Input
                              type={field.type === "number" ? "number" : "text"}
                              className="mt-1.5" placeholder={field.placeholder} required={field.required}
                              value={entry.customData[field.id] ?? ""}
                              onChange={e => setTicketEntries(prev => prev.map((te, i) => i === idx ? { ...te, customData: { ...te.customData, [field.id]: e.target.value } } : te))}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

          </div>

          {/* Right: Sticky order summary + actions */}
          <div className="md:col-span-2">
            <div className="border rounded-xl p-4 space-y-3 sticky top-4">
              <p className="font-semibold text-sm">Ringkasan Pesanan</p>
              <div className="space-y-1.5">
                {orderItems.map(item => (
                  <div key={item.category.id} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {item.category.id === "__default__" ? "Tiket" : item.category.name}
                      <span className="font-medium text-foreground ml-1">× {item.quantity}</span>
                    </span>
                    <span className="font-medium">
                      {formatPrice(calcUnitTotal(item.category.price, event.feeType) * item.quantity)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Biaya platform (5%)</span>
                  <span>{event.feeType === "FEE_ABSORBED" ? "Rp 0" : "sudah termasuk"}</span>
                </div>
                <div className="border-t pt-2 mt-1 flex justify-between text-sm font-bold">
                  <span>Total {totalQty} Tiket</span>
                  <span className="text-primary">{isFree ? "Gratis" : formatPrice(grandTotal)}</span>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" size="icon" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button className="flex-1" onClick={onSubmitStep2} disabled={isSubmitting}>
                  {isSubmitting
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Memproses...</>
                    : isFree
                      ? <>Daftar Gratis</>
                      : <>Lanjutkan</>}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Metode Pembayaran ──────────────────────────────── */}
      {step === 3 && (
        <div className="grid md:grid-cols-5 gap-6 items-start">

          {/* Left: Payment method picker */}
          <div className="md:col-span-3 space-y-5">
            <h2 className="font-semibold">Metode Pembayaran</h2>

            {[
              { title: "Transfer Bank", methods: BANK_METHODS },
              { title: "E-Wallet / QRIS", methods: EWALLET_METHODS },
            ].map(({ title, methods }) => (
              <div key={title} className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                <div className="grid grid-cols-3 gap-2">
                  {methods.map(m => {
                    const isActive = selectedPaymentMethod === m.key;
                    return (
                      <button key={m.key} type="button" onClick={() => setSelectedPaymentMethod(m.key)}
                        className={cn(
                          "border rounded-xl py-3 px-2 flex flex-col items-center gap-2 transition-all",
                          isActive ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"
                        )}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={m.logo} alt={m.label} className="h-7 w-auto object-contain rounded" />
                        <span className={cn("text-[11px] font-medium leading-tight text-center", isActive ? "text-primary" : "text-foreground")}>
                          {m.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Right: Order summary + action */}
          <div className="md:col-span-2">
            <div className="border rounded-xl p-4 space-y-3 sticky top-4">
              <p className="font-semibold text-sm">Ringkasan Pesanan</p>
              <div className="space-y-1.5">
                {orderItems.map(item => (
                  <div key={item.category.id} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {item.category.id === "__default__" ? "Tiket" : item.category.name}
                      <span className="font-medium text-foreground ml-1">× {item.quantity}</span>
                    </span>
                    <span className="font-medium">
                      {formatPrice(calcUnitTotal(item.category.price, event.feeType) * item.quantity)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Biaya platform (5%)</span>
                  <span>{event.feeType === "FEE_ABSORBED" ? "Rp 0" : "sudah termasuk"}</span>
                </div>
                <div className="border-t pt-2 mt-1 flex justify-between text-sm font-bold">
                  <span>Total Bayar</span>
                  <span className="text-primary">{formatPrice(grandTotal)}</span>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" size="icon" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button className="flex-1" onClick={handleCreatePayment} disabled={!selectedPaymentMethod || isSubmitting}>
                  {isSubmitting
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Memproses...</>
                    : <>Proses Pembayaran</>}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 4: Instruksi Pembayaran ───────────────────────────── */}
      {step === 4 && paymentResult && (
        <div className="max-w-xl space-y-5">
          {paymentStatus === "PAID" && (
            <div className="border border-green-300 bg-green-50 rounded-xl p-5 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <p className="font-semibold text-green-700">Pembayaran Berhasil!</p>
              <p className="text-sm text-green-600">Mengalihkan ke halaman tiket...</p>
            </div>
          )}

          {paymentStatus !== "PAID" && paymentResult.type === "VA" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Instruksi Transfer</h2>
                {timeLeft !== null && timeLeft > 0 && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-mono">{formatTime(timeLeft)}</span>
                )}
              </div>
              <div className="border rounded-xl p-5 space-y-4 bg-muted/20">
                <div>
                  <p className="text-xs text-muted-foreground">Bank</p>
                  <p className="font-bold text-lg">{paymentResult.vaBank?.replace("_VA", "")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nomor Virtual Account</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="font-mono font-bold text-xl tracking-wider">{paymentResult.vaNumber}</p>
                    <button type="button" onClick={() => { navigator.clipboard.writeText(paymentResult.vaNumber ?? ""); toast.success("Disalin!"); }} className="text-primary hover:bg-primary/10 rounded p-1">
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Pembayaran</p>
                  <p className="font-bold text-primary text-lg">{formatPrice(grandTotal)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Transfer tepat sesuai nominal agar otomatis terverifikasi</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1 bg-muted/30 rounded-xl p-3">
                <p className="font-medium text-foreground mb-1">Cara Pembayaran</p>
                <p>1. Buka aplikasi mobile banking atau ATM {paymentResult.vaBank?.replace("_VA", "")}</p>
                <p>2. Pilih menu Transfer / Virtual Account</p>
                <p>3. Masukkan nomor VA di atas</p>
                <p>4. Masukkan nominal <strong>{formatPrice(grandTotal)}</strong> dan konfirmasi</p>
                <p>5. Tiket akan terkirim via WhatsApp setelah pembayaran terverifikasi</p>
              </div>
            </div>
          )}

          {paymentStatus !== "PAID" && paymentResult.type === "QRIS" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Scan QRIS</h2>
                {timeLeft !== null && timeLeft > 0 && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-mono">{formatTime(timeLeft)}</span>
                )}
              </div>
              <div className="border rounded-xl p-5 flex flex-col items-center gap-3 bg-muted/20">
                {paymentResult.qrString && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentResult.qrString)}`}
                    alt="QRIS" width={200} height={200} className="rounded-lg border"
                  />
                )}
                <p className="font-bold text-primary text-lg">{formatPrice(grandTotal)}</p>
                <p className="text-xs text-muted-foreground text-center">
                  Scan dengan aplikasi apapun yang mendukung QRIS (GoPay, OVO, Dana, ShopeePay, dll.)
                </p>
              </div>
            </div>
          )}

          {paymentStatus === "FAILED" && (
            <div className="border border-destructive/30 bg-destructive/5 rounded-xl p-4 text-center">
              <p className="text-destructive font-medium">Pembayaran gagal atau kedaluwarsa</p>
              <button type="button" onClick={() => setStep(3)} className="text-primary text-sm underline mt-1">Coba lagi</button>
            </div>
          )}

          {paymentStatus === "PENDING" && (
            <div className="space-y-2">
              <Button variant="outline" className="w-full" onClick={checkPaymentStatus} disabled={polling}>
                {polling ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Mengecek...</> : <><RefreshCw className="h-4 w-4 mr-2" />Cek Status Pembayaran</>}
              </Button>
              {process.env.NODE_ENV !== "production" && (
                <Button
                  variant="outline"
                  className="w-full border-dashed border-amber-400 text-amber-600 hover:bg-amber-50 hover:text-amber-700 text-xs"
                  onClick={handleSimulatePayment}
                  disabled={simulating || polling}
                >
                  {simulating
                    ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Mensimulasi...</>
                    : "⚡ [Dev] Simulasi Pembayaran Berhasil"
                  }
                </Button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-xl p-3">
            <Ticket className="h-4 w-4 shrink-0" />
            <span>Tiket akan dikirim ke WhatsApp Anda setelah pembayaran terverifikasi secara otomatis.</span>
          </div>
        </div>
      )}
    </div>
  );
}
