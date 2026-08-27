"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface FeeConfig {
  buyerFeePercent: number;
  sellerFeePercent: number;
  buyerFeeMinimum: number;
  sellerFeeMinimum: number;
  withdrawalFee: number;
  withdrawalMinimum: number;
}

function formatPrice(n: number) {
  return "Rp" + new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(n);
}

export function MarketplaceFeeConfig() {
  const [config, setConfig] = useState<FeeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/marketplace-fees")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setConfig)
      .catch(() => toast.error("Gagal memuat konfigurasi fee"))
      .finally(() => setLoading(false));
  }, []);

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

  const exampleSubtotal = 100000;
  const exBuyerFee = Math.max(Math.round(exampleSubtotal * config.buyerFeePercent / 100), config.buyerFeeMinimum);
  const exSellerFee = Math.max(Math.round(exampleSubtotal * config.sellerFeePercent / 100), config.sellerFeeMinimum);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Fee Pembeli */}
        <div className="bg-background border rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Fee Pembeli</h3>
            <p className="text-xs text-muted-foreground">Biaya layanan ditambahkan ke total belanja</p>
          </div>
          <div className="space-y-3">
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
          </div>
        </div>

        {/* Fee Penjual */}
        <div className="bg-background border rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Fee Penjual</h3>
            <p className="text-xs text-muted-foreground">Potongan dari pendapatan penjual per transaksi</p>
          </div>
          <div className="space-y-3">
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
          </div>
        </div>
      </div>

      {/* Fee Penarikan */}
      <div className="bg-background border rounded-xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Fee Penarikan Dana</h3>
          <p className="text-xs text-muted-foreground">Biaya saat penjual menarik saldo ke rekening bank</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Biaya Penarikan (Rp)</Label>
            <Input
              type="number" step="500" min="0"
              value={config.withdrawalFee}
              onChange={e => setConfig({ ...config, withdrawalFee: parseInt(e.target.value) || 0 })}
            />
            <p className="text-[10px] text-muted-foreground">Flat fee per penarikan (termasuk biaya Xendit)</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Minimum Penarikan (Rp)</Label>
            <Input
              type="number" step="1000" min="0"
              value={config.withdrawalMinimum}
              onChange={e => setConfig({ ...config, withdrawalMinimum: parseInt(e.target.value) || 0 })}
            />
            <p className="text-[10px] text-muted-foreground">Jumlah minimum yang bisa ditarik</p>
          </div>
        </div>
      </div>

      {/* Simulasi */}
      <div className="bg-background border rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-3">Simulasi (Subtotal {formatPrice(exampleSubtotal)})</h3>
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
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan Konfigurasi
        </Button>
      </div>
    </div>
  );
}
