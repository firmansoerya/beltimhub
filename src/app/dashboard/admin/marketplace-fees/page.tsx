"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface FeeConfig {
  buyerFeePercent: number;
  sellerFeePercent: number;
  buyerFeeMinimum: number;
  sellerFeeMinimum: number;
}

function formatPrice(n: number) {
  return "Rp" + new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(n);
}

export default function MarketplaceFeesPage() {
  const router = useRouter();
  const [config, setConfig] = useState<FeeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/marketplace-fees")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setConfig)
      .catch(() => { toast.error("Gagal memuat data"); router.push("/dashboard/admin"); })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/marketplace-fees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) { toast.error("Gagal menyimpan"); return; }
      toast.success("Konfigurasi fee berhasil disimpan");
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Simulasi untuk preview
  const exampleSubtotal = 100000;
  const exBuyerFee = Math.max(Math.round(exampleSubtotal * config.buyerFeePercent / 100), config.buyerFeeMinimum);
  const exSellerFee = Math.max(Math.round(exampleSubtotal * config.sellerFeePercent / 100), config.sellerFeeMinimum);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/admin" className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Konfigurasi Fee Marketplace</h1>
          <p className="text-sm text-muted-foreground">Atur biaya layanan pembeli dan potongan penjual</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Fee Pembeli */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Fee Pembeli</CardTitle>
            <CardDescription className="text-xs">Biaya layanan yang ditambahkan ke total belanja pembeli</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Persentase (%)</Label>
              <Input
                type="number" step="0.1" min="0" max="20"
                value={config.buyerFeePercent}
                onChange={e => setConfig({ ...config, buyerFeePercent: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Minimum (Rp)</Label>
              <Input
                type="number" step="500" min="0"
                value={config.buyerFeeMinimum}
                onChange={e => setConfig({ ...config, buyerFeeMinimum: parseInt(e.target.value) || 0 })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Fee Penjual */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Fee Penjual</CardTitle>
            <CardDescription className="text-xs">Potongan dari pendapatan penjual per transaksi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Persentase (%)</Label>
              <Input
                type="number" step="0.1" min="0" max="20"
                value={config.sellerFeePercent}
                onChange={e => setConfig({ ...config, sellerFeePercent: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Minimum (Rp)</Label>
              <Input
                type="number" step="500" min="0"
                value={config.sellerFeeMinimum}
                onChange={e => setConfig({ ...config, sellerFeeMinimum: parseInt(e.target.value) || 0 })}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Simulasi */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Simulasi (Subtotal {formatPrice(exampleSubtotal)})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Pembeli bayar</p>
              <p className="font-bold text-primary">{formatPrice(exampleSubtotal + exBuyerFee)}</p>
              <p className="text-[10px] text-muted-foreground">+{formatPrice(exBuyerFee)} biaya layanan</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Penjual terima</p>
              <p className="font-bold">{formatPrice(exampleSubtotal - exSellerFee)}</p>
              <p className="text-[10px] text-muted-foreground">-{formatPrice(exSellerFee)} potongan</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Pendapatan platform</p>
              <p className="font-bold text-green-600">{formatPrice(exBuyerFee + exSellerFee)}</p>
              <p className="text-[10px] text-muted-foreground">sebelum fee Xendit</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan Konfigurasi
        </Button>
      </div>
    </div>
  );
}
