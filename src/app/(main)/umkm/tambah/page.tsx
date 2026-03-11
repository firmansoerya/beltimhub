"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ImageIcon, X } from "lucide-react";

const CATEGORIES = ["Kuliner", "Fashion", "Kerajinan", "Pertanian", "Perikanan", "Jasa", "Teknologi", "Lainnya"];

const schema = z.object({
  name: z.string().min(3, "Minimal 3 karakter").max(100),
  category: z.string().min(1, "Pilih kategori"),
  description: z.string().min(10, "Minimal 10 karakter").max(2000),
  address: z.string().optional(),
  phone: z.string().optional(),
  instagram: z.string().optional(),
  website: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function TambahUmkmPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<FormData>({ resolver: zodResolver(schema) as any });

  function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Maks 2MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    try {
      const res = await fetch("/api/umkm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, imageUrl: imagePreview || undefined }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.formErrors?.[0] ?? err.error ?? "Gagal mendaftarkan UMKM");
      }

      const umkm = await res.json();
      toast.success("UMKM berhasil didaftarkan!");
      router.push(`/umkm/${umkm.id}?new=1`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Link href="/umkm" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />
        Kembali ke UMKM
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Daftarkan UMKM</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Promosikan usaha Anda kepada warga Belitung Timur
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Foto usaha */}
        <Card>
          <CardHeader><CardTitle className="text-base">Foto Usaha</CardTitle></CardHeader>
          <CardContent>
            {imagePreview ? (
              <div className="relative aspect-video rounded-xl overflow-hidden border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImagePreview("")}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-3 h-36 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition-colors">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium">Klik untuk upload foto</p>
                  <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, WebP — maks. 2MB</p>
                </div>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageFile} />
              </label>
            )}
          </CardContent>
        </Card>

        {/* Informasi Usaha */}
        <Card>
          <CardHeader><CardTitle className="text-base">Informasi Usaha</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Nama Usaha *</Label>
              <Input id="name" placeholder="cth: Warung Nasi Padang Bu Sari" className="mt-1.5" {...register("name")} />
              {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
            </div>

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
              <Label htmlFor="address">Alamat / Lokasi</Label>
              <Input id="address" placeholder="cth: Jl. Merdeka No. 12, Manggar" className="mt-1.5" {...register("address")} />
            </div>

            <div>
              <Label className="mb-1.5 block">Deskripsi Usaha *</Label>
              <RichTextEditor
                onChange={(html) => setValue("description", html, { shouldValidate: true })}
                placeholder="Ceritakan tentang usaha Anda: produk/layanan, keunggulan, jam buka, dll..."
              />
              {errors.description && <p className="text-destructive text-xs mt-1">{errors.description.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Kontak */}
        <Card>
          <CardHeader><CardTitle className="text-base">Kontak & Sosial Media</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="phone">Nomor HP / WhatsApp</Label>
              <Input id="phone" placeholder="08xxxxxxxxxx" className="mt-1.5" {...register("phone")} />
            </div>
            <div>
              <Label htmlFor="instagram">Instagram</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-sm text-muted-foreground">@</span>
                <Input id="instagram" placeholder="nama_akun" {...register("instagram")} />
              </div>
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input id="website" type="url" placeholder="https://..." className="mt-1.5" {...register("website")} />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
          {isLoading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Mendaftarkan...</>
          ) : (
            "Daftarkan UMKM"
          )}
        </Button>
      </form>
    </div>
  );
}
