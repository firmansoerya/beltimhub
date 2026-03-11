"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, Users, UserCheck, CreditCard, ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/RichTextEditor";
import { CustomFieldBuilder, type CustomField } from "@/components/CustomFieldBuilder";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Lari", "Bersepeda", "Festival", "Olahraga", "Komunitas", "Musik", "Pameran", "Lainnya"];

type EventType = "public" | "free_register" | "paid";

const EVENT_TYPES: { key: EventType; icon: React.ElementType; label: string; desc: string }[] = [
  {
    key: "public",
    icon: Users,
    label: "Gratis & Terbuka",
    desc: "Siapapun bisa datang, tanpa pendaftaran. Cocok untuk event rakyat, konser publik, bazar.",
  },
  {
    key: "free_register",
    icon: UserCheck,
    label: "Gratis tapi Daftar",
    desc: "Gratis, tapi peserta perlu mendaftar. Cocok untuk seminar, webinar, workshop, gathering.",
  },
  {
    key: "paid",
    icon: CreditCard,
    label: "Berbayar",
    desc: "Peserta membayar tiket. Cocok untuk lomba, konser berbayar, kelas, atau wisata.",
  },
];

const schema = z.object({
  title: z.string().min(5, "Minimal 5 karakter").max(150),
  description: z.string().min(20, "Minimal 20 karakter"),
  category: z.string().min(1, "Pilih kategori"),
  location: z.string().min(3, "Masukkan lokasi"),
  address: z.string().optional(),
  eventDate: z.string().min(1, "Pilih tanggal & waktu"),
  registrationDeadline: z.string().optional(),
  price: z.coerce.number().int().min(0),
  quota: z.coerce.number().int().min(1, "Minimal 1"),
  coverImage: z.string().optional(),
});

export type EventFormData = z.infer<typeof schema>;

interface Props {
  mode: "create" | "edit";
  eventId?: string;
  defaultValues?: Partial<EventFormData> & { eventType?: EventType; customFields?: CustomField[] };
  backHref: string;
}

function toLocalDatetime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventForm({ mode, eventId, defaultValues, backHref }: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [eventType, setEventType] = useState<EventType | null>(defaultValues?.eventType ?? null);
  const [imagePreview, setImagePreview] = useState<string>(defaultValues?.coverImage ?? "");
  const [customFields, setCustomFields] = useState<CustomField[]>(defaultValues?.customFields ?? []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EventFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      price: 0,
      quota: 100,
      ...defaultValues,
      eventDate: defaultValues?.eventDate ? toLocalDatetime(defaultValues.eventDate) : "",
      registrationDeadline: defaultValues?.registrationDeadline
        ? toLocalDatetime(defaultValues.registrationDeadline)
        : "",
    },
  });

  function selectType(type: EventType) {
    setEventType(type);
    if (type === "public") {
      setValue("price", 0);
      setValue("quota", 999999);
    } else if (type === "free_register") {
      setValue("price", 0);
      if (!defaultValues?.quota) setValue("quota", 100);
    } else {
      if (!defaultValues?.quota) setValue("quota", 100);
    }
  }

  function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran foto maksimal 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setValue("coverImage", result);
    };
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImagePreview("");
    setValue("coverImage", "");
  }

  async function onSubmit(data: EventFormData) {
    if (!eventType) {
      toast.error("Pilih tipe event terlebih dahulu");
      return;
    }

    // Validasi custom fields
    for (const field of customFields) {
      if (!field.label.trim()) {
        toast.error("Semua atribut harus memiliki label");
        return;
      }
      if (field.type === "select" && (!field.options || field.options.some((o) => !o.trim()))) {
        toast.error(`Pilihan untuk "${field.label}" tidak boleh kosong`);
        return;
      }
    }

    setIsLoading(true);
    try {
      const payload = {
        ...data,
        eventDate: new Date(data.eventDate).toISOString(),
        registrationDeadline: data.registrationDeadline
          ? new Date(data.registrationDeadline).toISOString()
          : undefined,
        customFields: customFields.length > 0 ? customFields : undefined,
      };

      const url = mode === "edit" ? `/api/events/${eventId}` : "/api/events";
      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error?.formErrors?.[0] ?? result.error ?? "Gagal menyimpan event");

      toast.success(mode === "edit" ? "Event berhasil diperbarui!" : "Event berhasil dibuat!");
      router.push("/dashboard/organizer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  }

  const price = watch("price");
  const descriptionValue = watch("description");

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Link href={backHref} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />
        Kembali
      </Link>

      <h1 className="text-2xl font-bold mb-6">
        {mode === "edit" ? "Edit Event" : "Buat Event Baru"}
      </h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 [&_label+input]:mt-1.5 [&_label+select]:mt-1.5"
      >
        {/* Tipe Event */}
        <section className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Tipe Event *</h2>
          <div className="grid grid-cols-1 gap-3">
            {EVENT_TYPES.map(({ key, icon: Icon, label, desc }) => (
              <button
                key={key}
                type="button"
                onClick={() => selectType(key)}
                className={cn(
                  "flex items-start gap-4 px-4 py-4 rounded-xl border text-left transition-all",
                  eventType === key
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-muted-foreground/40 hover:bg-muted/30"
                )}
              >
                <div className={cn(
                  "mt-0.5 p-2 rounded-lg shrink-0",
                  eventType === key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {eventType && (
          <>
            {/* Banner foto */}
            <section className="space-y-3">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Foto Banner</h2>
              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden border aspect-[2/1]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Banner preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
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
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleImageFile}
                  />
                </label>
              )}
            </section>

            {/* Info Dasar */}
            <section className="space-y-4">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Informasi Event</h2>

              <div>
                <Label htmlFor="title">Nama Event *</Label>
                <Input id="title" placeholder="Contoh: Beltim Run 2025" {...register("title")} />
                {errors.title && <p className="text-destructive text-xs mt-1">{errors.title.message}</p>}
              </div>

              <div>
                <Label htmlFor="description" className="mb-1.5 block">Deskripsi *</Label>
                <RichTextEditor
                  value={descriptionValue}
                  onChange={(html) => setValue("description", html, { shouldValidate: true })}
                  placeholder="Jelaskan detail event, rundown, persyaratan, dll."
                />
                {errors.description && <p className="text-destructive text-xs mt-1">{errors.description.message}</p>}
              </div>

              <div>
                <Label htmlFor="category">Kategori *</Label>
                <select
                  id="category"
                  className="w-full mt-1.5 px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  {...register("category")}
                >
                  <option value="">Pilih kategori...</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {errors.category && <p className="text-destructive text-xs mt-1">{errors.category.message}</p>}
              </div>
            </section>

            {/* Waktu & Lokasi */}
            <section className="space-y-4">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Waktu & Lokasi</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="eventDate">Tanggal & Waktu *</Label>
                  <Input id="eventDate" type="datetime-local" {...register("eventDate")} />
                  {errors.eventDate && <p className="text-destructive text-xs mt-1">{errors.eventDate.message}</p>}
                </div>
                {eventType !== "public" && (
                  <div>
                    <Label htmlFor="registrationDeadline">Batas Pendaftaran</Label>
                    <Input id="registrationDeadline" type="datetime-local" {...register("registrationDeadline")} />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="location">Nama Lokasi *</Label>
                <Input id="location" placeholder="Contoh: Pantai Burong Mandi, Manggar" {...register("location")} />
                {errors.location && <p className="text-destructive text-xs mt-1">{errors.location.message}</p>}
              </div>

              <div>
                <Label htmlFor="address">Alamat Lengkap</Label>
                <Input id="address" placeholder="Alamat detail (opsional)" {...register("address")} />
              </div>
            </section>

            {/* Kuota & Harga */}
            {eventType !== "public" && (
              <section className="space-y-4">
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  {eventType === "paid" ? "Tiket & Kuota" : "Kuota Peserta"}
                </h2>
                <div className={cn("grid gap-4", eventType === "paid" ? "grid-cols-2" : "grid-cols-1 max-w-xs")}>
                  {eventType === "paid" && (
                    <div>
                      <Label htmlFor="price">Harga Tiket (Rp) *</Label>
                      <Input id="price" type="number" min={1000} step={1000} {...register("price")} />
                      <p className="text-xs text-muted-foreground mt-1">
                        {price > 0 ? `Rp ${Number(price).toLocaleString("id-ID")}` : "Masukkan harga"}
                      </p>
                      {errors.price && <p className="text-destructive text-xs mt-1">{errors.price.message}</p>}
                    </div>
                  )}
                  <div>
                    <Label htmlFor="quota">Kuota Peserta *</Label>
                    <Input id="quota" type="number" min={1} {...register("quota")} />
                    {errors.quota && <p className="text-destructive text-xs mt-1">{errors.quota.message}</p>}
                  </div>
                </div>
              </section>
            )}

            {/* Atribut Peserta Dinamis */}
            <section className="space-y-3">
              <div>
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Atribut Peserta</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tambahkan informasi tambahan yang perlu diisi peserta saat mendaftar (opsional).
                  Misalnya: ukuran jersey, upload KTP, nama tim, dsb.
                </p>
              </div>
              <CustomFieldBuilder value={customFields} onChange={setCustomFields} />
            </section>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Menyimpan...</>
              ) : mode === "edit" ? "Simpan Perubahan" : "Buat Event"}
            </Button>
          </>
        )}
      </form>
    </div>
  );
}
