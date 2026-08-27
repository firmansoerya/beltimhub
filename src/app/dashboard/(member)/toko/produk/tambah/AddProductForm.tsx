"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ImagePlus, X } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/RichTextEditor";

import { PRODUCT_CATEGORIES } from "@/lib/constants";
const CATEGORIES = PRODUCT_CATEGORIES;

// Estimasi fee untuk simulasi pendapatan (client-side)
const SELLER_FEE_PERCENT = 2;
const SELLER_FEE_MINIMUM = 500;
const BUYER_FEE_PERCENT = 3;

interface Props {
  umkmList: { id: string; name: string }[];
}

export function AddProductForm({ umkmList }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImageFiles(files: FileList | null) {
    if (!files || images.length >= 5) return;
    setUploading(true);
    const remaining = 5 - images.length;
    const toUpload = Array.from(files).slice(0, remaining);
    const uploaded: string[] = [];
    for (const file of toUpload) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("type", "content");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (res.ok && data.url) uploaded.push(data.url);
        else toast.error(`Gagal upload: ${data.error ?? "Unknown error"}`);
      } catch {
        toast.error("Gagal upload gambar");
      }
    }
    setImages((prev) => [...prev, ...uploaded]);
    setUploading(false);
  }
  const [form, setForm] = useState({
    umkmId: umkmList[0]?.id ?? "",
    name: "",
    description: "",
    price: "",
    stock: "",
    category: "",
    weight: "",
  });

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.description || !form.price || !form.category || !form.umkmId) {
      toast.error("Isi semua field yang wajib");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          umkmId: form.umkmId,
          name: form.name,
          description: form.description,
          price: parseInt(form.price),
          stock: parseInt(form.stock || "0"),
          category: form.category,
          weight: form.weight ? parseInt(form.weight) : undefined,
          images,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.formErrors?.[0] ?? "Gagal menyimpan produk");
        return;
      }
      toast.success("Produk berhasil ditambahkan!");
      router.push("/dashboard/toko?tab=produk");
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {umkmList.length > 1 && (
        <div className="space-y-2">
          <Label>Toko *</Label>
          <Select value={form.umkmId} onValueChange={(v) => v && set("umkmId", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {umkmList.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Nama Produk *</Label>
        <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Contoh: Keripik Kelapa Beltim" required />
      </div>

      <div className="space-y-2">
        <Label>Deskripsi *</Label>
        <RichTextEditor
          value={form.description}
          onChange={(html) => set("description", html)}
          placeholder="Jelaskan produk, bahan, ukuran, dsb..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Harga *</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
            <Input
              id="price"
              type="text"
              inputMode="numeric"
              className="pl-9 [appearance:textfield]"
              value={form.price ? parseInt(form.price).toLocaleString("id-ID") : ""}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                set("price", raw);
              }}
              placeholder="50.000"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="stock">Stok</Label>
          <Input id="stock" type="number" min="0" value={form.stock} onChange={(e) => set("stock", e.target.value)} placeholder="0" />
        </div>
      </div>

      {/* Simulasi Pendapatan */}
      {(() => {
        const price = parseInt(form.price) || 0;
        if (price <= 0) return null;
        const sellerFeePercent = SELLER_FEE_PERCENT;
        const sellerFee = Math.max(
          Math.round(price * sellerFeePercent / 100),
          SELLER_FEE_MINIMUM,
        );
        const netIncome = price - sellerFee;
        const fmt = (n: number) => "Rp " + n.toLocaleString("id-ID");
        return (
          <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-3 space-y-1.5">
            <p className="text-xs font-semibold text-teal-800">Estimasi Pendapatan per Produk Terjual</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-muted-foreground">Harga Jual</p>
                <p className="text-sm font-bold">{fmt(price)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Komisi Platform</p>
                <p className="text-sm font-bold text-red-600">-{fmt(sellerFee)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Kamu Terima</p>
                <p className="text-sm font-bold text-teal-700">{fmt(netIncome)}</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Ongkir ditanggung pembeli dan diteruskan 100% ke kamu. Biaya layanan pembeli tidak mempengaruhi pendapatanmu.
            </p>
          </div>
        );
      })()}

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-2">
          <Label>Kategori *</Label>
          <Select value={form.category} onValueChange={(v) => v && set("category", v)}>
            <SelectTrigger><SelectValue placeholder="Pilih kategori..." /></SelectTrigger>
            <SelectContent className="w-auto min-w-[var(--anchor-width)]">
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="weight">Berat (gram)</Label>
          <Input id="weight" type="number" min="1" value={form.weight} onChange={(e) => set("weight", e.target.value)} placeholder="500" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Foto Produk (maks. 5)</Label>
        <div className="flex flex-wrap gap-2">
          {images.map((url, i) => (
            <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5"
              >
                <X className="h-3 w-3 text-white" />
              </button>
            </div>
          ))}
          {images.length < 5 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-20 h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary transition-colors disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
              <span className="text-xs">{uploading ? "Upload..." : "Foto"}</span>
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleImageFiles(e.target.files)}
        />
        <p className="text-xs text-muted-foreground">Format: JPG, PNG, WebP. Maks. 5 foto.</p>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => router.push("/dashboard/toko?tab=produk")} disabled={loading}>
          Batal
        </Button>
        <Button type="submit" disabled={loading} className="flex-1 gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Simpan Produk
        </Button>
      </div>
    </form>
  );
}
