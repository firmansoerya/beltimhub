"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useCart, type CartItem } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ArrowLeft, Loader2, ShieldCheck, MapPin, CreditCard,
  QrCode, Building2, Wallet, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  type ShippingConfig, type ShippingMethodKey,
  SHIPPING_METHOD_LABELS, parseShippingConfig,
} from "@/lib/constants";

function formatPrice(price: number) {
  return "Rp" + new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(price);
}

function formatAddress(addr: { recipient: string; phone: string; address: string; district?: string | null; city?: string | null; province?: string | null; postalCode?: string | null }) {
  const parts = [addr.address, addr.district, addr.city, addr.province, addr.postalCode].filter(Boolean);
  return `${addr.recipient}, ${addr.phone}, ${parts.join(", ")}`;
}

interface FeeConfig {
  buyerFeePercent: number;
  sellerFeePercent: number;
  buyerFeeMinimum: number;
  sellerFeeMinimum: number;
}

interface PaymentMethodOption {
  value: string;
  label: string;
}

const XENDIT_FEES: Record<string, { type: "percent" | "flat"; amount: number }> = {
  QRIS: { type: "percent", amount: 0.7 },
  BCA_VA: { type: "flat", amount: 5500 }, BNI_VA: { type: "flat", amount: 5500 },
  BRI_VA: { type: "flat", amount: 5500 }, MANDIRI_VA: { type: "flat", amount: 5500 },
  BSI_VA: { type: "flat", amount: 5500 }, PERMATA_VA: { type: "flat", amount: 5500 },
  OVO: { type: "percent", amount: 2.0 }, DANA: { type: "percent", amount: 1.5 },
  SHOPEEPAY: { type: "percent", amount: 2.0 }, LINKAJA: { type: "percent", amount: 2.0 },
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

// Group payment methods by type
function groupPaymentMethods(methods: PaymentMethodOption[]) {
  const groups: { label: string; icon: React.ReactNode; methods: PaymentMethodOption[] }[] = [];

  const qris = methods.filter(m => m.value === "QRIS");
  const va = methods.filter(m => m.value.endsWith("_VA"));
  const ewallet = methods.filter(m => ["OVO", "DANA", "SHOPEEPAY", "LINKAJA"].includes(m.value));

  if (qris.length) groups.push({ label: "QRIS", icon: <QrCode className="h-4 w-4" />, methods: qris });
  if (va.length) groups.push({ label: "Transfer Bank (Virtual Account)", icon: <Building2 className="h-4 w-4" />, methods: va });
  if (ewallet.length) groups.push({ label: "E-Wallet", icon: <Wallet className="h-4 w-4" />, methods: ewallet });

  return groups;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const { items, removeItems } = useCart();

  const [checkoutItemIds, setCheckoutItemIds] = useState<string[]>([]);
  const [buyerNotes, setBuyerNotes] = useState<Record<string, string>>({});

  // Manual address form
  interface AddressForm {
    label: string; recipient: string; phone: string; address: string;
    district: string; city: string; province: string; postalCode: string;
  }
  const emptyAddressForm: AddressForm = {
    label: "", recipient: "", phone: "", address: "",
    district: "", city: "", province: "", postalCode: "",
  };
  const [addressForm, setAddressForm] = useState<AddressForm>(emptyAddressForm);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [feeConfig, setFeeConfig] = useState<FeeConfig>({ buyerFeePercent: 3, sellerFeePercent: 2, buyerFeeMinimum: 1000, sellerFeeMinimum: 500 });
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([]);

  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Shipping config per umkm
  const [umkmShipping, setUmkmShipping] = useState<Record<string, ShippingConfig>>({});

  // Saved addresses
  interface SavedAddress {
    id: string; label: string; recipient: string; phone: string;
    address: string; district: string | null; city: string | null;
    province: string | null; postalCode: string | null; isDefault: boolean;
  }
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showManualAddress, setShowManualAddress] = useState(false);
  const [saveAddress, setSaveAddress] = useState(false);

  // Load selected items + notes from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem("checkout_items");
    if (!raw) {
      router.replace("/pasar-lokal/keranjang");
      return;
    }
    try {
      const ids = JSON.parse(raw) as string[];
      setCheckoutItemIds(ids);
    } catch {
      router.replace("/pasar-lokal/keranjang");
    }
    // Load buyer notes per item
    try {
      const notesRaw = sessionStorage.getItem("checkout_notes");
      if (notesRaw) setBuyerNotes(JSON.parse(notesRaw));
    } catch { /* ignore */ }
  }, [router]);

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  // Fetch fee config + payment methods + saved addresses
  useEffect(() => {
    fetch("/api/marketplace/fees").then(r => r.json()).then(d => {
      if (d.config) setFeeConfig(d.config);
      if (d.paymentMethods) setPaymentMethods(d.paymentMethods);
    }).catch(() => toast.error("Gagal memuat konfigurasi biaya"));

    fetch("/api/addresses").then(r => r.json()).then((addrs: SavedAddress[]) => {
      if (Array.isArray(addrs)) {
        setSavedAddresses(addrs);
        if (addrs.length === 0) {
          setShowManualAddress(true);
          setSaveAddress(true);
        } else {
          const def = addrs.find(a => a.isDefault);
          if (def) {
            setSelectedAddressId(def.id);
          }
        }
      }
    }).catch(() => toast.error("Gagal memuat daftar alamat"));
  }, []);

  // Filter cart items to only checkout items
  const checkoutItems = useMemo(() => {
    const idSet = new Set(checkoutItemIds);
    return items.filter(i => idSet.has(i.productId));
  }, [items, checkoutItemIds]);

  // Group by store
  const grouped = useMemo(() => {
    return checkoutItems.reduce<Record<string, { umkmId: string; umkmName: string; items: CartItem[] }>>((acc, item) => {
      if (!acc[item.umkmId]) {
        acc[item.umkmId] = { umkmId: item.umkmId, umkmName: item.umkmName, items: [] };
      }
      acc[item.umkmId].items.push(item);
      return acc;
    }, {});
  }, [checkoutItems]);

  const storeGroups = Object.values(grouped);

  // Fetch shipping config saat store groups berubah
  useEffect(() => {
    const umkmIds = Object.keys(grouped);
    if (umkmIds.length === 0) return;
    fetch(`/api/marketplace/shipping?umkmIds=${umkmIds.join(",")}`)
      .then(r => r.json())
      .then(data => setUmkmShipping(data))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutItemIds.join(",")]);

  // Auto-detect shipping zone dari alamat
  const LOCAL_KEYWORDS = ["belitung timur", "beltim", "manggar", "gantung", "dendang", "kelapa kampit", "simpang pesak", "simpang renggiang"];
  const BABEL_KEYWORDS = ["bangka", "belitung", "pangkal pinang", "pangkalpinang", "sungailiat", "tanjung pandan", "babel"];

  const detectedMethod: ShippingMethodKey = useMemo(() => {
    let cityStr = "";
    if (selectedAddressId) {
      const addr = savedAddresses.find(a => a.id === selectedAddressId);
      if (addr) cityStr = [addr.city, addr.district, addr.address, addr.province].filter(Boolean).join(" ");
    } else {
      cityStr = [addressForm.city, addressForm.district, addressForm.address, addressForm.province].filter(Boolean).join(" ");
    }
    const lower = cityStr.toLowerCase();

    if (!cityStr.trim()) return "LOCAL_COURIER"; // default jika kosong
    if (LOCAL_KEYWORDS.some(k => lower.includes(k))) return "LOCAL_COURIER";
    if (BABEL_KEYWORDS.some(k => lower.includes(k))) return "CROSS_DISTRICT";
    return "INTER_ISLAND";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddressId, savedAddresses, addressForm.city, addressForm.district, addressForm.address, addressForm.province]);

  // Hitung ongkir per toko berdasarkan detectedMethod + shippingConfig
  function getStoreShippingFee(umkmId: string): number {
    const cfg = umkmShipping[umkmId];
    if (!cfg) return 0;
    const methodCfg = cfg[detectedMethod];
    if (!methodCfg?.enabled) return 0;
    const storeItems = storeGroups.find(s => s.umkmId === umkmId)?.items ?? [];
    const storeSubtotal = storeItems.reduce((s, i) => s + i.price * i.qty, 0);
    if (methodCfg.freeMinimum > 0 && storeSubtotal >= methodCfg.freeMinimum) return 0;
    return methodCfg.fee;
  }

  // Cek toko yang tidak mendukung metode ini
  const unservicedStores = useMemo(() => {
    return storeGroups
      .filter(s => {
        const cfg = umkmShipping[s.umkmId];
        return cfg && !cfg[detectedMethod]?.enabled;
      })
      .map(s => s.umkmName);
  }, [detectedMethod, storeGroups, umkmShipping]);

  const subtotal = checkoutItems.reduce((s, i) => s + i.price * i.qty, 0);
  const totalQty = checkoutItems.reduce((s, i) => s + i.qty, 0);
  const totalShippingFee = storeGroups.reduce((s, store) => s + getStoreShippingFee(store.umkmId), 0);
  const buyerFee = paymentMethod ? calcBuyerFee(subtotal, paymentMethod, feeConfig) : Math.round(subtotal * feeConfig.buyerFeePercent / 100);
  const grandTotal = subtotal + totalShippingFee + buyerFee;

  const paymentGroups = useMemo(() => groupPaymentMethods(paymentMethods), [paymentMethods]);

  // Build shipping address string from selected or manual form
  function getShippingAddress(): string {
    if (selectedAddressId) {
      const addr = savedAddresses.find(a => a.id === selectedAddressId);
      if (addr) return formatAddress(addr);
    }
    const parts = [addressForm.address, addressForm.district, addressForm.city, addressForm.province, addressForm.postalCode].filter(Boolean);
    return `${addressForm.recipient}, ${addressForm.phone}, ${parts.join(", ")}`;
  }

  async function handleSubmit() {
    if (selectedAddressId) {
      // Validated by selection
    } else {
      if (!addressForm.recipient.trim() || !addressForm.phone.trim() || !addressForm.address.trim()) {
        setError("Isi nama penerima, nomor HP, dan alamat lengkap");
        return;
      }
      if (addressForm.address.trim().length < 10) {
        setError("Alamat lengkap minimal 10 karakter");
        return;
      }
    }
    if (!paymentMethod) {
      setError("Pilih metode pembayaran");
      return;
    }
    setError("");
    setLoading(true);

    const shippingAddress = getShippingAddress();

    try {
      // Simpan alamat baru jika diminta
      if (saveAddress && !selectedAddressId) {
        const saveRes = await fetch("/api/addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: addressForm.label.trim() || (savedAddresses.length === 0 ? "Rumah" : "Alamat Baru"),
            recipient: addressForm.recipient.trim(),
            phone: addressForm.phone.trim(),
            address: addressForm.address.trim(),
            district: addressForm.district.trim() || undefined,
            city: addressForm.city.trim() || undefined,
            province: addressForm.province.trim() || undefined,
            postalCode: addressForm.postalCode.trim() || undefined,
            isDefault: savedAddresses.length === 0,
          }),
        });
        if (!saveRes.ok) {
          toast.error("Gagal menyimpan alamat");
        }
      }

      // Kirim semua item dalam 1 request (unified checkout)
      const allItems = checkoutItems.map(i => ({
        productId: i.productId,
        quantity: i.qty,
        note: buyerNotes[i.productId]?.trim() || undefined,
      }));

      const res = await fetch("/api/orders/marketplace/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: allItems,
          shippingAddress: shippingAddress.trim(),
          paymentMethod,
          shippingMethod: detectedMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal membuat pesanan");
        setLoading(false);
        return;
      }

      removeItems(checkoutItemIds);
      sessionStorage.removeItem("checkout_items");

      // E-wallet: redirect ke halaman payment provider
      if (data.type === "EWALLET" && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        // VA/QRIS: redirect ke halaman detail checkout session
        router.push(`/orders/checkout/${data.checkoutSessionId}`);
      }
    } catch {
      setError("Terjadi kesalahan, coba lagi");
    } finally {
      setLoading(false);
    }
  }

  if (!isLoaded || checkoutItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/pasar-lokal/keranjang" className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold">Checkout</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Order details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Shipping address */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold text-sm">Alamat Pengiriman</h2>
                </div>
                <Link href="/dashboard/alamat" className="text-xs text-primary hover:underline">
                  Kelola Alamat
                </Link>
              </div>

              {savedAddresses.length > 0 && !showManualAddress ? (
                <div className="space-y-2">
                  {savedAddresses.map((addr) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => {
                        setSelectedAddressId(addr.id);
                      }}
                      className={`w-full text-left border rounded-lg p-3 transition-colors ${
                        selectedAddressId === addr.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold">{addr.label}</span>
                        {addr.isDefault && (
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Utama</span>
                        )}
                      </div>
                      <p className="text-sm font-medium">{addr.recipient} <span className="text-muted-foreground font-normal">({addr.phone})</span></p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[addr.address, addr.district, addr.city, addr.province, addr.postalCode].filter(Boolean).join(", ")}
                      </p>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => { setShowManualAddress(true); setSelectedAddressId(null); setAddressForm(emptyAddressForm); }}
                    className="text-xs text-primary hover:underline"
                  >
                    Gunakan alamat lain
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Label Alamat</Label>
                    <Input
                      placeholder='contoh: "Rumah", "Kantor"'
                      value={addressForm.label}
                      onChange={e => setAddressForm(f => ({ ...f, label: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nama Penerima *</Label>
                      <Input
                        placeholder="Nama lengkap"
                        value={addressForm.recipient}
                        onChange={e => setAddressForm(f => ({ ...f, recipient: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">No. HP Penerima *</Label>
                      <Input
                        placeholder="08xxxxxxxxx"
                        value={addressForm.phone}
                        onChange={e => setAddressForm(f => ({ ...f, phone: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Alamat Lengkap *</Label>
                    <Textarea
                      placeholder="Jalan, RT/RW, Kelurahan, No. Rumah..."
                      value={addressForm.address}
                      onChange={e => setAddressForm(f => ({ ...f, address: e.target.value }))}
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Kecamatan</Label>
                      <Input
                        placeholder="Kecamatan"
                        value={addressForm.district}
                        onChange={e => setAddressForm(f => ({ ...f, district: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Kota/Kabupaten</Label>
                      <Input
                        placeholder="Kota/Kabupaten"
                        value={addressForm.city}
                        onChange={e => setAddressForm(f => ({ ...f, city: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Provinsi</Label>
                      <Input
                        placeholder="Provinsi"
                        value={addressForm.province}
                        onChange={e => setAddressForm(f => ({ ...f, province: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Kode Pos</Label>
                      <Input
                        placeholder="Kode pos"
                        value={addressForm.postalCode}
                        onChange={e => setAddressForm(f => ({ ...f, postalCode: e.target.value }))}
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveAddress}
                      onChange={e => setSaveAddress(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-xs text-muted-foreground">Simpan alamat ini untuk checkout berikutnya</span>
                  </label>

                  {savedAddresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowManualAddress(false);
                        setSaveAddress(false);
                        setAddressForm(emptyAddressForm);
                        const def = savedAddresses.find(a => a.isDefault) ?? savedAddresses[0];
                        if (def) setSelectedAddressId(def.id);
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      Pilih dari alamat tersimpan
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order items per store */}
          {storeGroups.map((store, idx) => (
            <Card key={store.umkmId}>
              <CardContent className="p-0">
                <div className="px-4 py-3 border-b bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">
                      Pesanan {storeGroups.length > 1 ? idx + 1 : ""} — {store.umkmName}
                    </span>
                  </div>
                </div>

                <div className="divide-y">
                  {store.items.map((item) => (
                    <div key={item.productId} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden shrink-0">
                        {item.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">🛍️</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.qty} x {formatPrice(item.price)}</p>
                      </div>
                      <p className="text-sm font-bold shrink-0">{formatPrice(item.price * item.qty)}</p>
                    </div>
                  ))}
                </div>

                {/* Per-item notes preview */}
                {store.items.some(i => buyerNotes[i.productId]?.trim()) && (
                  <div className="px-4 py-3 border-t bg-muted/20">
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Catatan:</p>
                    {store.items.filter(i => buyerNotes[i.productId]?.trim()).map(i => (
                      <p key={i.productId} className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{i.name}:</span> {buyerNotes[i.productId]}
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Payment method */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-sm">Metode Pembayaran</h2>
              </div>

              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="space-y-2">
                  {paymentGroups.map((group) => {
                    const isOpen = expandedGroup === group.label;
                    const showToggle = group.methods.length > 1;
                    const selectedInGroup = group.methods.find(m => m.value === paymentMethod);

                    return (
                      <div key={group.label} className="border rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            if (showToggle) {
                              setExpandedGroup(isOpen ? null : group.label);
                            } else {
                              setPaymentMethod(group.methods[0].value);
                            }
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                        >
                          {group.icon}
                          <span className="flex-1 text-sm font-medium">{group.label}</span>
                          {selectedInGroup && !isOpen && (
                            <span className="text-xs text-primary font-medium">
                              {selectedInGroup.label}
                            </span>
                          )}
                          {showToggle && (
                            isOpen
                              ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>

                        {isOpen && showToggle && (
                          <div className="border-t px-4 py-2 space-y-1 bg-muted/20">
                            {group.methods.map((m) => (
                              <label key={m.value} className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted cursor-pointer transition-colors">
                                <RadioGroupItem value={m.value} />
                                <span className="text-sm">{m.label}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {!showToggle && (
                          <div className="sr-only">
                            <RadioGroupItem value={group.methods[0].value} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        </div>

        {/* Right: Summary */}
        <div>
          <Card className="sticky top-20">
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold text-sm">Ringkasan belanja</h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Total harga ({totalQty} barang)</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>Zona pengiriman</span>
                  <span className="font-medium text-foreground">{SHIPPING_METHOD_LABELS[detectedMethod].icon} {SHIPPING_METHOD_LABELS[detectedMethod].label}</span>
                </div>
                {storeGroups.map(store => {
                  const fee = getStoreShippingFee(store.umkmId);
                  const cfg = umkmShipping[store.umkmId];
                  const methodCfg = cfg?.[detectedMethod];
                  const storeSubtotal = store.items.reduce((s, i) => s + i.price * i.qty, 0);
                  const isFreePromo = methodCfg && methodCfg.freeMinimum > 0 && storeSubtotal >= methodCfg.freeMinimum;
                  return (
                    <div key={store.umkmId} className="flex justify-between text-muted-foreground">
                      <span className="truncate">Ongkir — {store.umkmName}</span>
                      {fee === 0 ? (
                        <span className="text-green-600 font-medium shrink-0">
                          Gratis{isFreePromo ? " ✓" : ""}
                        </span>
                      ) : (
                        <span className="shrink-0">{formatPrice(fee)}</span>
                      )}
                    </div>
                  );
                })}
                <div className="flex justify-between text-muted-foreground">
                  <span>Biaya layanan</span>
                  <span>{formatPrice(buyerFee)}</span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between font-bold">
                <span>Total Tagihan</span>
                <span className="text-primary text-lg">{formatPrice(grandTotal)}</span>
              </div>

              {/* Warning: toko tidak melayani luar kota */}
              {unservicedStores.length > 0 && (
                <div className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2.5">
                  <p className="font-semibold mb-0.5">Pengiriman {SHIPPING_METHOD_LABELS[detectedMethod].label} tidak tersedia:</p>
                  {unservicedStores.map(name => (
                    <p key={name}>• {name} tidak mendukung metode ini</p>
                  ))}
                </div>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button
                className="w-full gap-2"
                size="lg"
                onClick={handleSubmit}
                disabled={loading || unservicedStores.length > 0}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Bayar Sekarang
              </Button>

              <div className="flex items-center gap-1.5 text-xs text-teal-700 dark:text-teal-400 justify-center">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                <span>Dilindungi Escrow BeltimHub</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
