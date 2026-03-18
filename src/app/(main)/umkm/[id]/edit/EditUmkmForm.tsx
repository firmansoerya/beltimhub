"use client";

import { useState } from "react";
import { LocationPickerDynamic } from "@/components/LocationPickerDynamic";
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
import { Loader2, ArrowLeft, ImageIcon, X, MapPin } from "lucide-react";

const CATEGORIES = ["Kuliner", "Fashion", "Kerajinan", "Pertanian", "Perikanan", "Jasa", "Teknologi", "Lainnya"];

const schema = z.object({
  name: z.string().min(3, "Minimal 3 karakter").max(100),
  category: z.string().min(1, "Pilih kategori"),
  description: z.string().min(10, "Minimal 10 karakter").max(2000),
  address: z.string().optional(),
  mapsUrl: z.string().optional(),
  gallery: z.array(z.string()).optional(),
  phone: z.string().optional(),
  instagram: z.string().optional(),
  website: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  id: string;
  defaultValues: FormData;
  defaultImageUrl: string;
  defaultGallery: string[];
  formId?: string;
  backHref?: string;
}

export function EditUmkmForm({ id, defaultValues, defaultImageUrl, defaultGallery, formId, backHref }: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(defaultImageUrl);
  const [gallery, setGallery] = useState<string[]>(defaultGallery);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<FormData>({ resolver: zodResolver(schema) as any, defaultValues });

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
      const res = await fetch(`/api/umkm/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, imageUrl: imagePreview || undefined, gallery }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Gagal menyimpan");
      toast.success("UMKM berhasil diperbarui!");
      router.push(formId ? "/dashboard/umkm" : `/umkm/${id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={formId ? "space-y-5" : "container mx-auto max-w-2xl px-4 py-8"}>
      {!formId && (
        <>
          <Link href="/dashboard/umkm" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke UMKM Saya
          </Link>
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Edit UMKM</h1>
            <p className="text-muted-foreground text-sm mt-1">Perbarui informasi usaha Anda</p>
          </div>
        </>
      )}

      {formId && (
        <div className="flex justify-end">
          <Button type="submit" form={formId} size="default" disabled={isLoading}>
            {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Menyimpan...</> : "Simpan Perubahan"}
          </Button>
        </div>
      )}

      <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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

        <Card>
          <CardHeader><CardTitle className="text-base">Informasi Usaha</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Nama Usaha *</Label>
              <Input id="name" className="mt-1.5" {...register("name")} />
              {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <Label>Kategori *</Label>
              <Select defaultValue={defaultValues.category} onValueChange={(val: string | null) => val && setValue("category", val)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
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
                value={defaultValues.description}
                onChange={(html) => setValue("description", html, { shouldValidate: true })}
              />
              {errors.description && <p className="text-destructive text-xs mt-1">{errors.description.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Galeri Foto */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Galeri Foto
              <span className="text-muted-foreground font-normal text-sm ml-1">({gallery.length}/20)</span>
            </CardTitle>
          </CardHeader>
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
            {gallery.length < 20 && (
              <label className="flex items-center justify-center gap-2 h-20 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition-colors">
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Tambah foto ({gallery.length}/20)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    const remaining = 20 - gallery.length;
                    const toProcess = files.slice(0, remaining);
                    toProcess.forEach((file) => {
                      if (file.size > 2 * 1024 * 1024) { toast.error(`${file.name}: Maks 2MB per foto`); return; }
                      const reader = new FileReader();
                      reader.onload = () => setGallery(g => [...g, reader.result as string]);
                      reader.readAsDataURL(file);
                    });
                    e.target.value = "";
                  }}
                />
              </label>
            )}
            <p className="text-xs text-muted-foreground mt-2">Bisa upload beberapa foto sekaligus. Maks. 20 foto, 2MB per foto.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Kontak & Sosial Media</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="phone">Nomor HP / WhatsApp</Label>
              <Input id="phone" className="mt-1.5" {...register("phone")} />
            </div>
            <div>
              <Label htmlFor="instagram">Instagram</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-sm text-muted-foreground">@</span>
                <Input id="instagram" {...register("instagram")} />
              </div>
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input id="website" type="url" className="mt-1.5" {...register("website")} />
            </div>
          </CardContent>
        </Card>

        {!formId && (
          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Menyimpan...</> : "Simpan Perubahan"}
          </Button>
        )}
      </form>

    </div>
  );
}
