"use client";

import { useState } from "react";
import { LocationPickerDynamic } from "@/components/LocationPickerDynamic";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Loader2, ImageIcon, X, MapPin } from "lucide-react";
import { PhoneInput, normalizePhone } from "@/components/PhoneInput";

import { UMKM_CATEGORIES } from "@/lib/constants";

const schema = z.object({
  name: z.string().min(3, "Minimal 3 karakter").max(100),
  category: z.string().min(1, "Pilih kategori"),
  description: z.string().min(10, "Minimal 10 karakter").max(2000),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  mapsUrl: z.string().optional(),
  gallery: z.array(z.string()).optional(),
  phone: z.string().optional(),
  instagram: z.string().optional(),
  website: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function TambahUmkmForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [gallery, setGallery] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<FormData>({ resolver: zodResolver(schema) as any });

  const mapsUrl = watch("mapsUrl") ?? "";

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
        body: JSON.stringify({ ...data, imageUrl: imagePreview || undefined, gallery }),
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Daftarkan UMKM</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Promosikan usaha Anda kepada warga Belitung Timur
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Foto usaha */}
        <Card>
          <CardHeader><CardTitle className="text-base">Logo Usaha</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              {imagePreview ? (
                <div className="relative w-28 h-28 rounded-xl overflow-hidden border shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImagePreview("")}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-28 h-28 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition-colors shrink-0">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground mt-1">Upload</p>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageFile} />
                </label>
              )}
              <div className="text-xs text-muted-foreground pt-1">
                <p className="font-medium text-foreground text-sm mb-1">Logo / Foto Profil Usaha</p>
                <p>Disarankan gambar persegi (1:1). Format JPG, PNG, WebP — maks. 2MB</p>
              </div>
            </div>
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
                  {UMKM_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-destructive text-xs mt-1">{errors.category.message}</p>}
            </div>

            <div>
              <Label htmlFor="mapsUrl">Link Google Maps</Label>
              <div className="flex items-center gap-2 mt-1.5 border rounded-md px-2.5">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  id="mapsUrl"
                  placeholder="https://maps.app.goo.gl/..."
                  className="border-0 p-0 h-9 focus-visible:ring-0 text-sm"
                  {...register("mapsUrl")}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Punya link Google Maps sendiri? Tempel di sini. Atau pilih dari peta di bawah.</p>
            </div>

            <div>
              <Label>Tandai Lokasi dari Peta</Label>
              <div className="mt-1.5">
                <LocationPickerDynamic
                  onSelect={(loc) => {
                    setValue("address", loc.address);
                    setValue("latitude", loc.lat);
                    setValue("longitude", loc.lng);
                    if (!mapsUrl.trim()) setValue("mapsUrl", loc.mapsUrl);
                  }}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Alamat / Lokasi</Label>
              <Input id="address" placeholder="Terisi otomatis dari peta, atau ketik manual" className="mt-1.5" {...register("address")} />
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

        {/* Galeri Foto */}
        <Card>
          <CardHeader><CardTitle className="text-base">Galeri Foto <span className="text-muted-foreground font-normal text-sm">(maks. 5)</span></CardTitle></CardHeader>
          <CardContent>
            {gallery.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {gallery.map((img, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt={`Galeri ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setGallery(g => g.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {gallery.length < 5 && (
              <label className="flex items-center justify-center gap-2 h-20 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition-colors">
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Tambah foto</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) { toast.error("Maks 2MB per foto"); return; }
                    const reader = new FileReader();
                    reader.onload = () => setGallery(g => [...g, reader.result as string]);
                    reader.readAsDataURL(file);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </CardContent>
        </Card>

        {/* Kontak */}
        <Card>
          <CardHeader><CardTitle className="text-base">Kontak & Sosial Media</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nomor HP / WhatsApp</Label>
              <div className="mt-1.5">
                <PhoneInput
                  value={watch("phone") ?? ""}
                  onChange={(val) => setValue("phone", val ? normalizePhone(val) : "")}
                />
              </div>
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
