"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Loader2, Users, UserCheck, CreditCard, ImageIcon, X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/RichTextEditor";
import { CustomFieldBuilder, type CustomField } from "@/components/CustomFieldBuilder";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "Lari", "Bersepeda", "Olahraga", "Musik", "Festival", "Hiburan",
  "Pameran", "Seminar", "Workshop", "Webinar", "Konferensi",
  "Komunitas", "Budaya", "Sosial", "Agama", "Lainnya",
];

const FACILITY_PRESETS = [
  "Parkir", "Toilet", "Warung Makan", "Wi-Fi", "Sound System", "Panggung",
  "Ambulans/P3K", "ATM", "Ruangan Ber-AC", "Area Indoor", "Area Outdoor",
  "Sertifikat", "Makan/Minum", "Medali", "Merchandise", "Dokumentasi Foto/Video",
];

type EventType = "public" | "free_register" | "paid";
type LineUpItem = { name: string; role: string };
type TicketCategoryItem = {
  name: string; description: string; price: number; quota: number;
  isPresale: boolean; isDiscount: boolean; originalPrice: number;
};

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
  description: z.string().min(1, "Deskripsi event wajib diisi").min(20, "Deskripsi minimal 20 karakter"),
  termsAndConditions: z.string().optional(),
  category: z.string().min(1, "Pilih kategori"),
  location: z.string().min(3, "Masukkan lokasi"),
  address: z.string().optional(),
  eventDate: z.string().min(1, "Pilih tanggal & waktu"),
  endDate: z.string().optional(),
  registrationDeadline: z.string().optional(),
  price: z.coerce.number().int().min(0),
  feeType: z.enum(["FEE_ON_TOP", "FEE_ABSORBED"]).default("FEE_ON_TOP"),
  quota: z.coerce.number().int().min(1, "Minimal 1"),
  coverImage: z.string().optional(),
  layoutImage: z.string().optional(),
});

export type EventFormData = z.infer<typeof schema>;

interface Props {
  mode: "create" | "edit";
  eventId?: string;
  defaultValues?: Partial<EventFormData> & {
    eventType?: EventType;
    customFields?: CustomField[];
    feeType?: string;
    facilities?: string[];
    lineUp?: LineUpItem[];
    endDate?: string;
    termsAndConditions?: string;
    maxPerPerson?: number | null;
    oneEmailOneTransaction?: boolean;
    uniqueParticipants?: boolean;
    ticketCategories?: TicketCategoryItem[];
    layoutImage?: string;
  };
  backHref: string;
}

function toLocalDatetime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STEP_LABELS = ["Tipe Event", "Info Dasar", "Waktu & Lokasi", "Konten", "Tiket & Kuota", "Data Pemesan"];

export function EventForm({ mode, eventId, defaultValues, backHref }: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const startStep = mode === "edit" ? 2 : 1;
  const [step, setStep] = useState(startStep);
  const [stepJustChanged, setStepJustChanged] = useState(false);
  const [eventType, setEventType] = useState<EventType | null>(defaultValues?.eventType ?? null);
  const [imagePreview, setImagePreview] = useState<string>(defaultValues?.coverImage ?? "");
  const [layoutImagePreview, setLayoutImagePreview] = useState<string>(defaultValues?.layoutImage ?? "");
  const [customFields, setCustomFields] = useState<CustomField[]>(defaultValues?.customFields ?? []);
  const [facilities, setFacilities] = useState<string[]>(defaultValues?.facilities ?? []);
  const [lineUp, setLineUp] = useState<LineUpItem[]>(defaultValues?.lineUp ?? []);
  const [customFacility, setCustomFacility] = useState("");
  const [maxPerPurchase, setMaxPerPurchase] = useState<number>(defaultValues?.maxPerPerson ?? 10);
  const [oneEmailOneTransaction, setOneEmailOneTransaction] = useState<boolean>(defaultValues?.oneEmailOneTransaction ?? false);
  const [uniqueParticipants, setUniqueParticipants] = useState<boolean>(defaultValues?.uniqueParticipants ?? false);
  const defaultCategories = defaultValues?.ticketCategories ?? [];
  const [useTicketCategories, setUseTicketCategories] = useState(defaultCategories.length > 0);
  const [ticketCategories, setTicketCategories] = useState<TicketCategoryItem[]>(
    defaultCategories.length > 0
      ? defaultCategories.map(c => ({
          name: c.name, description: c.description, price: c.price, quota: c.quota,
          isPresale: (c as TicketCategoryItem).isPresale ?? false,
          isDiscount: (c as TicketCategoryItem).isDiscount ?? false,
          originalPrice: (c as TicketCategoryItem).originalPrice ?? 0,
        }))
      : [{ name: "", description: "", price: 0, quota: 100, isPresale: false, isDiscount: false, originalPrice: 0 }]
  );

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EventFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      price: 0,
      feeType: "FEE_ON_TOP",
      quota: 100,
      description: "",
      termsAndConditions: "",
      ...defaultValues,
      eventDate: defaultValues?.eventDate ? toLocalDatetime(defaultValues.eventDate) : "",
      endDate: defaultValues?.endDate ? toLocalDatetime(defaultValues.endDate) : "",
      registrationDeadline: defaultValues?.registrationDeadline
        ? toLocalDatetime(defaultValues.registrationDeadline)
        : "",
    },
  });

  // Public events skip step 5 (ticketing) and step 6 (data pemesan)
  const totalSteps = eventType === "public" ? 4 : 6;

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
    if (file.size > 2 * 1024 * 1024) { toast.error("Ukuran foto maksimal 2MB"); return; }
    const reader = new FileReader();
    reader.onload = () => { setImagePreview(reader.result as string); setValue("coverImage", reader.result as string); };
    reader.readAsDataURL(file);
  }

  function handleLayoutImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error("Ukuran foto maksimal 3MB"); return; }
    const reader = new FileReader();
    reader.onload = () => { setLayoutImagePreview(reader.result as string); setValue("layoutImage", reader.result as string); };
    reader.readAsDataURL(file);
  }

  function toggleFacility(f: string) {
    setFacilities(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  }

  function addCustomFacility() {
    const trimmed = customFacility.trim();
    if (!trimmed || facilities.includes(trimmed)) return;
    setFacilities(prev => [...prev, trimmed]);
    setCustomFacility("");
  }

  async function nextStep() {
    if (step === 1) {
      if (!eventType) { toast.error("Pilih tipe event terlebih dahulu"); return; }
    } else if (step === 2) {
      const valid = await trigger(["title", "category", "description"]);
      if (!valid) return;
    } else if (step === 3) {
      const valid = await trigger(["eventDate", "location"]);
      if (!valid) return;
    }
    setStep(s => s + 1);
    setStepJustChanged(true);
    setTimeout(() => setStepJustChanged(false), 200);
  }

  async function onSubmit(data: EventFormData) {
    if (!eventType) { toast.error("Pilih tipe event terlebih dahulu"); return; }

    for (const field of customFields) {
      if (!field.label.trim()) { toast.error("Semua atribut harus memiliki label"); return; }
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
        endDate: data.endDate ? new Date(data.endDate).toISOString() : undefined,
        registrationDeadline: data.registrationDeadline
          ? new Date(data.registrationDeadline).toISOString()
          : undefined,
        customFields: mode === "edit" ? customFields : customFields.length > 0 ? customFields : undefined,
        facilities: facilities.length > 0 ? facilities : undefined,
        lineUp: lineUp.filter(l => l.name.trim()).length > 0
          ? lineUp.filter(l => l.name.trim())
          : undefined,
        maxPerPerson: maxPerPurchase,
        oneEmailOneTransaction,
        uniqueParticipants,
        ticketCategories: useTicketCategories && eventType === "paid"
          ? ticketCategories.filter(c => c.name.trim())
          : undefined,
        layoutImage: layoutImagePreview || undefined,
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
  const feeType = watch("feeType");
  const descriptionValue = watch("description");
  const termsValue = watch("termsAndConditions");

  return (
    <div className="pb-20">
      {/* Sticky header: back + title + step bar */}
      <div className="sticky top-0 z-20 bg-background -mx-6 md:-mx-8 px-6 md:px-8 py-5 mb-6 border-b">
        <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-3">
          {mode === "edit" ? "Edit Event" : "Buat Event Baru"}
        </h1>
        {/* Step progress */}
        <div className="flex items-center">
          {Array.from({ length: totalSteps - startStep + 1 }).map((_, i) => {
            const s = startStep + i;
            const isDone = step > s;
            const isActive = step === s;
            const isLast = i === totalSteps - startStep;
            return (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all shrink-0",
                      isDone
                        ? "bg-primary border-primary text-primary-foreground"
                        : isActive
                          ? "bg-background border-primary text-primary"
                          : "bg-background border-muted-foreground/30 text-muted-foreground"
                    )}
                  >
                    {isDone ? (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7l4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : s}
                  </div>
                  <span
                    className={cn(
                      "text-[9px] leading-tight text-center whitespace-nowrap",
                      isActive ? "text-primary font-medium" : "text-muted-foreground"
                    )}
                  >
                    {STEP_LABELS[s - 1]}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "flex-1 h-px mx-1 mb-4 transition-all",
                      isDone ? "bg-primary" : "bg-muted-foreground/20"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
      <form id="event-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Step 1: Tipe Event ── */}
        {step === 1 && (
          <section className="space-y-3">
            <div>
              <h2 className="font-semibold text-base">Pilih Tipe Event</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Menentukan cara peserta mengikuti event Anda.</p>
            </div>
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
        )}

        {/* ── Step 2: Info Dasar ── */}
        {step === 2 && (
          <section className="space-y-5">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Informasi Dasar</h2>

            {/* Banner */}
            {imagePreview ? (
              <div>
                <div className="relative rounded-xl overflow-hidden border aspect-[16/9]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Banner preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImagePreview(""); setValue("coverImage", ""); }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">Ukuran ideal: 1200 × 675 px (rasio 16:9). Ditampilkan di halaman detail event dan halaman pembelian tiket.</p>
              </div>
            ) : (
              <div>
                <label className="flex flex-col items-center justify-center gap-3 h-36 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition-colors">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Klik untuk upload foto banner</p>
                    <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, WebP — maks. 2MB</p>
                  </div>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageFile} />
                </label>
                <p className="text-xs text-muted-foreground mt-1.5">Ukuran ideal: <span className="font-medium text-foreground">1200 × 675 px</span> (rasio 16:9). Ditampilkan di halaman detail event dan halaman pembelian tiket.</p>
              </div>
            )}

            <div>
              <Label htmlFor="title">Nama Event *</Label>
              <Input id="title" placeholder="Contoh: Beltim Run 2025" className="mt-1.5" {...register("title")} />
              {errors.title && <p className="text-destructive text-xs mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <Label htmlFor="category">Kategori *</Label>
              <select
                id="category"
                className="w-full mt-1.5 px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                {...register("category")}
              >
                <option value="">Pilih kategori...</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <p className="text-destructive text-xs mt-1">{errors.category.message}</p>}
            </div>

            <div>
              <Label className="mb-1.5 block">Deskripsi Event *</Label>
              <RichTextEditor
                value={descriptionValue}
                onChange={(html) => setValue("description", html, { shouldValidate: true })}
                placeholder="Jelaskan detail event: konsep, jadwal kegiatan, persyaratan, dll."
              />
              {errors.description && <p className="text-destructive text-xs mt-1">{errors.description.message}</p>}
            </div>
          </section>
        )}

        {/* ── Step 3: Waktu & Lokasi ── */}
        {step === 3 && (
          <section className="space-y-5">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Waktu & Lokasi</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="eventDate">Waktu Mulai *</Label>
                <Input id="eventDate" type="datetime-local" className="mt-1.5" {...register("eventDate")} />
                {errors.eventDate && <p className="text-destructive text-xs mt-1">{errors.eventDate.message}</p>}
              </div>
              <div>
                <Label htmlFor="endDate">Waktu Selesai</Label>
                <Input id="endDate" type="datetime-local" className="mt-1.5" {...register("endDate")} />
                <p className="text-xs text-muted-foreground mt-1">Opsional</p>
              </div>
            </div>

            {eventType !== "public" && (
              <div className="max-w-xs">
                <Label htmlFor="registrationDeadline">Batas Pendaftaran</Label>
                <Input id="registrationDeadline" type="datetime-local" className="mt-1.5" {...register("registrationDeadline")} />
                <p className="text-xs text-muted-foreground mt-1">Opsional — kosongkan jika tidak ada batas</p>
              </div>
            )}

            <div>
              <Label htmlFor="location">Nama Lokasi *</Label>
              <Input id="location" placeholder="Contoh: Pantai Burong Mandi, Manggar" className="mt-1.5" {...register("location")} />
              {errors.location && <p className="text-destructive text-xs mt-1">{errors.location.message}</p>}
            </div>

            <div>
              <Label htmlFor="address">Alamat Lengkap</Label>
              <Input id="address" placeholder="Alamat detail (opsional)" className="mt-1.5" {...register("address")} />
            </div>
          </section>
        )}

        {/* ── Step 4: Konten Tambahan ── */}
        {step === 4 && (
          <section className="space-y-6">
            <div>
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Konten Tambahan</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Semua bagian ini opsional namun membuat halaman event lebih informatif.</p>
            </div>

            {/* Syarat & Ketentuan */}
            <div>
              <Label className="mb-1.5 block">
                Syarat & Ketentuan <span className="text-muted-foreground font-normal text-xs">(opsional)</span>
              </Label>
              <RichTextEditor
                value={termsValue}
                onChange={(html) => setValue("termsAndConditions", html)}
                placeholder="Tuliskan syarat dan ketentuan event, larangan, kebijakan refund, dll."
              />
            </div>

            {/* Fasilitas */}
            <div>
              <Label className="mb-2 block">
                Fasilitas <span className="text-muted-foreground font-normal text-xs">(opsional)</span>
              </Label>
              <div className="flex flex-wrap gap-2 mb-3">
                {FACILITY_PRESETS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFacility(f)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                      facilities.includes(f)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:border-primary/50"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Tambah fasilitas lain..."
                  value={customFacility}
                  onChange={(e) => setCustomFacility(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomFacility(); } }}
                  className="text-sm"
                />
                <Button type="button" variant="outline" size="sm" onClick={addCustomFacility}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {facilities.filter(f => !FACILITY_PRESETS.includes(f)).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {facilities.filter(f => !FACILITY_PRESETS.includes(f)).map((f) => (
                    <span key={f} className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground">
                      {f}
                      <button type="button" onClick={() => toggleFacility(f)} className="hover:opacity-70">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Line-up */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>
                  Narasumber / Talent / Line-up{" "}
                  <span className="text-muted-foreground font-normal text-xs">(opsional)</span>
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLineUp(prev => [...prev, { name: "", role: "" }])}
                >
                  <Plus className="h-4 w-4 mr-1" />Tambah
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Misalnya: artis, pembicara, narasumber, MC, atau tamu undangan.
              </p>
              {lineUp.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Belum ada entri — klik Tambah.</p>
              ) : (
                <div className="space-y-2">
                  {lineUp.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input
                        placeholder="Nama"
                        value={item.name}
                        onChange={(e) => setLineUp(prev => prev.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))}
                        className="text-sm"
                      />
                      <Input
                        placeholder="Peran — artis, pembicara, MC..."
                        value={item.role}
                        onChange={(e) => setLineUp(prev => prev.map((x, i) => i === idx ? { ...x, role: e.target.value } : x))}
                        className="text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setLineUp(prev => prev.filter((_, i) => i !== idx))}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Step 5: Tiket & Peserta (skip for public events) ── */}
        {step === 5 && eventType !== "public" && (
          <section className="space-y-6">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              {eventType === "paid" ? "Tiket & Kuota" : "Kuota Peserta"}
            </h2>

            {/* Kuota (untuk event non-paid atau saat tidak pakai multi-kategori) */}
            {(eventType !== "paid" || !useTicketCategories) && (
              <div className={cn("grid gap-4", eventType === "paid" ? "grid-cols-2" : "grid-cols-1 max-w-xs")}>
                {eventType === "paid" && (
                  <div>
                    <Label htmlFor="price">Harga Tiket (Rp) *</Label>
                    <Input id="price" type="number" min={1000} step={1000} className="mt-1.5" {...register("price")} />
                    <p className="text-xs text-muted-foreground mt-1">
                      {price > 0 ? `Rp ${Number(price).toLocaleString("id-ID")}` : "Masukkan harga"}
                    </p>
                    {errors.price && <p className="text-destructive text-xs mt-1">{errors.price.message}</p>}
                  </div>
                )}
                <div>
                  <Label htmlFor="quota">Kuota Peserta *</Label>
                  <Input id="quota" type="number" min={1} className="mt-1.5" {...register("quota")} />
                  {errors.quota && <p className="text-destructive text-xs mt-1">{errors.quota.message}</p>}
                </div>
              </div>
            )}

            {/* Toggle multi-kategori (paid only) */}
            {eventType === "paid" && (
              <div className="border rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Beberapa kategori tiket</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Aktifkan jika event memiliki beberapa tipe tiket
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseTicketCategories(v => !v)}
                    className={cn(
                      "relative w-11 h-6 rounded-full transition-colors shrink-0",
                      useTicketCategories ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                  >
                    <span className={cn(
                      "absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform",
                      useTicketCategories ? "translate-x-5" : "translate-x-0"
                    )} />
                  </button>
                </div>

                {useTicketCategories && (
                  <div className="space-y-3">
                    {ticketCategories.map((cat, i) => (
                      <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            placeholder="Nama kategori *"
                            value={cat.name}
                            onChange={e => setTicketCategories(prev => prev.map((c, j) => j === i ? { ...c, name: e.target.value } : c))}
                            className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm bg-background outline-none focus:border-primary"
                          />
                          <button
                            type="button"
                            onClick={() => setTicketCategories(prev => prev.filter((_, j) => j !== i))}
                            className="text-destructive hover:bg-destructive/10 rounded p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {/* Presale / Diskon toggles */}
                        <div className="grid grid-cols-2 gap-2">
                          {(["isPresale", "isDiscount"] as const).map(field => (
                            <div key={field} className="flex items-center justify-between border border-border rounded-lg px-3 py-1.5 bg-background">
                              <span className="text-xs text-muted-foreground">{field === "isPresale" ? "Presale" : "Diskon"}</span>
                              <button
                                type="button"
                                onClick={() => setTicketCategories(prev => prev.map((c, j) => {
                                  if (j !== i) return c;
                                  const nextVal = !c[field];
                                  const newIsPresale = field === "isPresale" ? nextVal : c.isPresale;
                                  const newIsDiscount = field === "isDiscount" ? nextVal : c.isDiscount;
                                  // Saat keduanya off, kembalikan price ke originalPrice
                                  if (!newIsPresale && !newIsDiscount && c.originalPrice > 0) {
                                    return { ...c, [field]: nextVal, price: c.originalPrice, originalPrice: 0 };
                                  }
                                  return { ...c, [field]: nextVal };
                                }))}
                                className={cn(
                                  "relative w-9 h-5 rounded-full transition-colors shrink-0",
                                  cat[field] ? "bg-primary" : "bg-muted-foreground/30"
                                )}
                              >
                                <span className={cn(
                                  "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                                  cat[field] ? "translate-x-4" : "translate-x-0"
                                )} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {(cat.isPresale || cat.isDiscount) ? (
                            <>
                              <div>
                                <label className="text-xs text-muted-foreground">
                                  Harga Normal (Rp) <span className="text-muted-foreground/60">— dicoret</span>
                                </label>
                                <input
                                  type="number" min={0} step={1000}
                                  value={cat.originalPrice}
                                  onChange={e => setTicketCategories(prev => prev.map((c, j) => j === i ? { ...c, originalPrice: Number(e.target.value) } : c))}
                                  className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background outline-none focus:border-primary mt-0.5"
                                  placeholder="cth: 150000"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground">
                                  Harga {cat.isPresale ? "Presale" : "Diskon"} (Rp) <span className="text-muted-foreground/60">— dibebankan</span>
                                </label>
                                <input
                                  type="number" min={0} step={1000}
                                  value={cat.price}
                                  onChange={e => setTicketCategories(prev => prev.map((c, j) => j === i ? { ...c, price: Number(e.target.value) } : c))}
                                  className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background outline-none focus:border-primary mt-0.5"
                                  placeholder="cth: 100000"
                                />
                              </div>
                            </>
                          ) : (
                            <div>
                              <label className="text-xs text-muted-foreground">Harga (Rp)</label>
                              <input
                                type="number" min={0} step={1000}
                                value={cat.price}
                                onChange={e => setTicketCategories(prev => prev.map((c, j) => j === i ? { ...c, price: Number(e.target.value) } : c))}
                                className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background outline-none focus:border-primary mt-0.5"
                              />
                            </div>
                          )}
                          <div className={cat.isPresale || cat.isDiscount ? "hidden" : ""}>
                            <label className="text-xs text-muted-foreground">Kuota</label>
                            <input
                              type="number" min={1}
                              value={cat.quota}
                              onChange={e => setTicketCategories(prev => prev.map((c, j) => j === i ? { ...c, quota: Number(e.target.value) } : c))}
                              className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background outline-none focus:border-primary mt-0.5"
                            />
                          </div>
                        </div>
                        {(cat.isPresale || cat.isDiscount) && (
                          <div>
                            <label className="text-xs text-muted-foreground">Kuota</label>
                            <input
                              type="number" min={1}
                              value={cat.quota}
                              onChange={e => setTicketCategories(prev => prev.map((c, j) => j === i ? { ...c, quota: Number(e.target.value) } : c))}
                              className="w-28 border border-border rounded-lg px-3 py-1.5 text-sm bg-background outline-none focus:border-primary mt-0.5"
                            />
                          </div>
                        )}
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Benefit / Deskripsi Kategori</label>
                          <RichTextEditor
                            value={cat.description}
                            onChange={val => setTicketCategories(prev => prev.map((c, j) => j === i ? { ...c, description: val } : c))}
                            placeholder="Tuliskan benefit, ketentuan, atau informasi tambahan untuk kategori ini..."
                          />
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setTicketCategories(prev => [...prev, { name: "", description: "", price: 0, quota: 100, isPresale: false, isDiscount: false, originalPrice: 0 }])}
                      className="w-full border border-dashed border-border rounded-lg py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus className="h-4 w-4" /> Tambah Kategori
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Fee type (paid only) */}
            {eventType === "paid" && (
              <div>
                <Label className="mb-2 block">Penanganan Biaya Platform (5%)</Label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setValue("feeType", "FEE_ON_TOP")}
                    className={cn(
                      "rounded-lg border-2 p-3 text-left transition-colors",
                      feeType === "FEE_ON_TOP" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                    )}
                  >
                    <p className="font-medium text-sm">Ditanggung peserta</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Biaya 5% ditambahkan ke harga tiket. Peserta membayar lebih, Anda menerima penuh.
                    </p>
                    {price > 0 && (
                      <p className="text-xs font-semibold text-primary mt-1.5">
                        Peserta bayar: Rp {Math.round(price * 1.05).toLocaleString("id-ID")}
                      </p>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue("feeType", "FEE_ABSORBED")}
                    className={cn(
                      "rounded-lg border-2 p-3 text-left transition-colors",
                      feeType === "FEE_ABSORBED" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                    )}
                  >
                    <p className="font-medium text-sm">Ditanggung organiser</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Peserta bayar sesuai harga tiket. Biaya 5% dipotong dari hasil yang Anda terima.
                    </p>
                    {price > 0 && (
                      <p className="text-xs font-semibold text-primary mt-1.5">
                        Anda terima: Rp {Math.round(price * 0.95).toLocaleString("id-ID")}
                      </p>
                    )}
                  </button>
                </div>
              </div>
            )}


            {/* Layout / Info Tambahan */}
            <div>
              <p className="font-medium text-sm mb-0.5">Gambar Info Tambahan</p>
              <p className="text-xs text-muted-foreground mb-2">
                Opsional — layout venue, denah tempat duduk, tabel ukuran jersey, atau informasi lain yang ditampilkan di halaman pembelian tiket.
              </p>
              {layoutImagePreview ? (
                <div className="relative rounded-xl overflow-hidden border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={layoutImagePreview} alt="Layout preview" className="w-full object-contain max-h-64" />
                  <button
                    type="button"
                    onClick={() => { setLayoutImagePreview(""); setValue("layoutImage", ""); }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 h-28 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition-colors">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Klik untuk unggah gambar (maks. 3MB)</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLayoutImageFile} />
                </label>
              )}
            </div>

          </section>
        )}

        {/* ── Step 6: Data Pemesan & Pengaturan Tambahan ── */}
        {step === 6 && (
          <section className="space-y-6">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Data Pemesan
            </h2>

            <div className="space-y-3">
              <div>
                <p className="font-medium text-sm">Atribut Peserta</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tambahkan informasi tambahan yang perlu diisi peserta saat mendaftar (opsional).
                  Misalnya: ukuran jersey, nama tim, dsb.
                </p>
              </div>
              <CustomFieldBuilder value={customFields} onChange={setCustomFields} />
            </div>

            {/* Pengaturan Tambahan */}
            {eventType !== "public" && (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Pengaturan Tambahan
                </h3>

                {/* Maks. tiket per transaksi */}
                <div className="flex items-center justify-between gap-4 border rounded-xl p-4">
                  <div>
                    <p className="font-medium text-sm">Jumlah maks. tiket per transaksi</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Jumlah maksimal tiket yang dapat dibeli dalam 1 transaksi
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={maxPerPurchase}
                      onChange={e => setMaxPerPurchase(Math.max(1, Number(e.target.value)))}
                      className="w-20 border border-border rounded-lg px-3 py-1.5 text-sm bg-background outline-none focus:border-primary text-center"
                    />
                    <span className="text-sm text-muted-foreground">Tiket</span>
                  </div>
                </div>

                {/* 1 akun email 1 transaksi */}
                <div className="flex items-center justify-between gap-4 border rounded-xl p-4">
                  <div>
                    <p className="font-medium text-sm">1 akun email — 1 kali transaksi</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      1 akun email hanya dapat melakukan 1 kali transaksi pembelian tiket.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOneEmailOneTransaction(v => !v)}
                    className={cn(
                      "relative w-11 h-6 rounded-full transition-colors shrink-0",
                      oneEmailOneTransaction ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                  >
                    <span className={cn(
                      "absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform",
                      oneEmailOneTransaction ? "translate-x-5" : "translate-x-0"
                    )} />
                  </button>
                </div>

                {/* 1 tiket 1 data pemesan */}
                <div className="flex items-center justify-between gap-4 border rounded-xl p-4">
                  <div>
                    <p className="font-medium text-sm">1 tiket — 1 data pemesan</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      1 tiket hanya dapat digunakan untuk 1 data pemesan. No. KTP peserta wajib diisi dan harus unik.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUniqueParticipants(v => !v)}
                    className={cn(
                      "relative w-11 h-6 rounded-full transition-colors shrink-0",
                      uniqueParticipants ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                  >
                    <span className={cn(
                      "absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform",
                      uniqueParticipants ? "translate-x-5" : "translate-x-0"
                    )} />
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

      </form>
      </div>

      {/* Sticky Navigation */}
      <div className="fixed bottom-0 left-0 md:left-56 right-0 z-40 flex items-center justify-center gap-3 px-8 py-4 bg-background border-t shadow-md">
        {step > startStep && (
          <Button type="button" variant="outline" onClick={() => setStep(s => s - 1)} className="min-w-32">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Sebelumnya
          </Button>
        )}
        {step < totalSteps ? (
          <Button type="button" onClick={nextStep} className="min-w-32">
            Selanjutnya
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            type="submit"
            form="event-form"
            className="min-w-40"
            disabled={isLoading || stepJustChanged}
          >
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Menyimpan...</>
            ) : mode === "edit" ? "Simpan Perubahan" : "Buat Event"}
          </Button>
        )}
      </div>
    </div>
  );
}
