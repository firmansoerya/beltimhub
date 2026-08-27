"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, ImageIcon, X } from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";

const schema = z.object({
  title: z.string().min(5, "Minimal 5 karakter").max(100),
  description: z.string().min(10, "Minimal 10 karakter").max(50000),
  price: z.coerce.number().int().min(0, "Harga tidak boleh negatif"),
  category: z.string().min(1, "Pilih kategori"),
  location: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const CATEGORIES = [
  "Elektronik", "Kendaraan", "Properti", "Fashion",
  "Perabotan", "Makanan", "Jasa", "Lainnya",
];

export default function BuatIklanPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<FormData>({ resolver: zodResolver(schema) as any });

  function handleImageFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const remaining = 5 - images.length;
    const toProcess = files.slice(0, remaining);

    toProcess.forEach((file) => {
      if (file.size > 3 * 1024 * 1024) {
        toast.error(`${file.name}: maks 3MB`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setImages((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, images }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Gagal membuat iklan");
      }

      const listing = await res.json();
      toast.success("Iklan berhasil dipasang!");
      router.push(`/fjb/${listing.id}?new=1`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  }

  const price = watch("price");

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Pasang Iklan</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Jual barang Anda kepada warga Belitung Timur
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Foto */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Foto Produk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {images.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white hover:bg-black/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <label className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 flex flex-col items-center justify-center cursor-pointer transition-colors gap-1">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground text-center">
                    {images.length === 0 ? "Tambah foto" : `+${5 - images.length} lagi`}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={handleImageFiles}
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Maks. 5 foto, masing-masing 3MB. JPG/PNG/WebP.</p>
          </CardContent>
        </Card>

        {/* Detail */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detail Iklan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Judul Iklan *</Label>
              <Input id="title" placeholder="cth: Honda Beat 2020 mulus" className="mt-1.5" {...register("title")} />
              {errors.title && <p className="text-destructive text-xs mt-1">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Kategori *</Label>
                <Select onValueChange={(val: string | null) => val && setValue("category", val)}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Pilih kategori..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-destructive text-xs mt-1">{errors.category.message}</p>}
              </div>

              <div>
                <Label htmlFor="price">Harga (Rp) *</Label>
                <Input id="price" type="number" placeholder="0 = gratis/dicari" min={0} className="mt-1.5" {...register("price")} />
                {price > 0 && <p className="text-xs text-muted-foreground mt-1">Rp {Number(price).toLocaleString("id-ID")}</p>}
                {errors.price && <p className="text-destructive text-xs mt-1">{errors.price.message}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="location">Lokasi</Label>
              <Input id="location" placeholder="cth: Manggar, Beltim" className="mt-1.5" {...register("location")} />
            </div>

            <div>
              <Label className="mb-1.5 block">Deskripsi *</Label>
              <RichTextEditor
                onChange={(html) => setValue("description", html, { shouldValidate: true })}
                placeholder="Deskripsikan kondisi barang, kelengkapan, garansi, dll..."
              />
              {errors.description && <p className="text-destructive text-xs mt-1">{errors.description.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
          {isLoading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Memproses...</>
          ) : (
            "Pasang Iklan Sekarang"
          )}
        </Button>
      </form>
    </div>
  );
}
