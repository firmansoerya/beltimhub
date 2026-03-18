"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Ticket, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { CustomField } from "@/components/CustomFieldBuilder";

const schema = z.object({
  participantName: z.string().min(2, "Nama minimal 2 karakter"),
  participantPhone: z.string().min(10, "Nomor HP tidak valid").optional().or(z.literal("")),
  participantEmail: z.string().email("Email tidak valid").optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

interface EventInfo {
  id: string;
  title: string;
  price: number;
  feeType: string;
  requiresJersey: boolean;
  requiresBib: boolean;
  location: string;
  customFields?: CustomField[] | null;
}

function formatPrice(price: number) {
  if (price === 0) return "Gratis";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

export default function DaftarEventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Dynamic custom field values: { [fieldId]: string }
  const [customData, setCustomData] = useState<Record<string, string>>({});
  const [customErrors, setCustomErrors] = useState<Record<string, string>>({});
  const PLATFORM_FEE = 0.05;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    fetch(`/api/events/${eventId}`)
      .then((r) => r.json())
      .then(setEvent)
      .catch(() => toast.error("Gagal memuat data event"));
  }, [eventId]);

  function validateCustomFields(): boolean {
    if (!event?.customFields) return true;
    const errs: Record<string, string> = {};
    for (const field of event.customFields) {
      if (field.required && !customData[field.id]?.trim()) {
        errs[field.id] = `${field.label} wajib diisi`;
      }
    }
    setCustomErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function onSubmit(data: FormData) {
    if (!validateCustomFields()) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          ...data,
          customData: Object.keys(customData).length > 0 ? customData : undefined,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error ?? "Gagal mendaftar");
      }

      if (result.isFree || !result.paymentUrl) {
        toast.success("Pendaftaran berhasil!");
        router.push(`/tiket/${result.ticket.id}`);
      } else {
        window.location.href = result.paymentUrl;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  }

  function handleFileField(fieldId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCustomData((prev) => ({ ...prev, [fieldId]: reader.result as string }));
      setCustomErrors((prev) => ({ ...prev, [fieldId]: "" }));
    };
    reader.readAsDataURL(file);
  }

  const totalFee = event ? Math.round(event.price * PLATFORM_FEE) : 0;
  const isFeeOnTop = !event || event.feeType !== "FEE_ABSORBED";
  const total = event ? (isFeeOnTop ? event.price + totalFee : event.price) : 0;

  // Merge legacy requiresJersey into customFields display if no custom fields exist
  const legacyJerseyField: CustomField | null =
    event?.requiresJersey && !event.customFields?.some((f) => f.label.toLowerCase().includes("jersey"))
      ? {
          id: "__legacy_jersey",
          label: "Ukuran Jersey",
          type: "select",
          required: true,
          options: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"],
        }
      : null;

  const allCustomFields: CustomField[] = [
    ...(event?.customFields ?? []),
    ...(legacyJerseyField ? [legacyJerseyField] : []),
  ];

  return (
    <div className="container mx-auto max-w-xl px-4 py-8">
      <Link
        href={`/event/${eventId}`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke detail event
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Ticket className="h-5 w-5 text-primary" />
          Form Pendaftaran
        </h1>
        {event && (
          <p className="text-muted-foreground text-sm mt-1">{event.title}</p>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Data Peserta */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Data Peserta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="participantName">Nama Lengkap *</Label>
              <Input
                id="participantName"
                placeholder="Nama sesuai identitas"
                {...register("participantName")}
              />
              {errors.participantName && (
                <p className="text-destructive text-xs mt-1">
                  {errors.participantName.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="participantPhone">Nomor HP / WhatsApp</Label>
              <Input
                id="participantPhone"
                placeholder="08xxxxxxxxxx"
                {...register("participantPhone")}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tiket akan dikirim ke nomor ini
              </p>
              {errors.participantPhone && (
                <p className="text-destructive text-xs mt-1">
                  {errors.participantPhone.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="participantEmail">Email (opsional)</Label>
              <Input
                id="participantEmail"
                type="email"
                placeholder="email@example.com"
                {...register("participantEmail")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Custom Fields Dinamis */}
        {allCustomFields.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Informasi Tambahan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {allCustomFields.map((field) => (
                <div key={field.id}>
                  <Label htmlFor={`cf_${field.id}`}>
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>

                  {field.type === "text" && (
                    <Input
                      id={`cf_${field.id}`}
                      className="mt-1.5"
                      placeholder={field.placeholder}
                      value={customData[field.id] ?? ""}
                      onChange={(e) => {
                        setCustomData((prev) => ({ ...prev, [field.id]: e.target.value }));
                        setCustomErrors((prev) => ({ ...prev, [field.id]: "" }));
                      }}
                    />
                  )}

                  {field.type === "number" && (
                    <Input
                      id={`cf_${field.id}`}
                      type="number"
                      className="mt-1.5"
                      placeholder={field.placeholder}
                      value={customData[field.id] ?? ""}
                      onChange={(e) => {
                        setCustomData((prev) => ({ ...prev, [field.id]: e.target.value }));
                        setCustomErrors((prev) => ({ ...prev, [field.id]: "" }));
                      }}
                    />
                  )}

                  {field.type === "textarea" && (
                    <Textarea
                      id={`cf_${field.id}`}
                      className="mt-1.5"
                      placeholder={field.placeholder}
                      rows={3}
                      value={customData[field.id] ?? ""}
                      onChange={(e) => {
                        setCustomData((prev) => ({ ...prev, [field.id]: e.target.value }));
                        setCustomErrors((prev) => ({ ...prev, [field.id]: "" }));
                      }}
                    />
                  )}

                  {field.type === "select" && (
                    <Select
                      value={customData[field.id] ?? ""}
                      onValueChange={(val) => {
                        if (!val) return;
                        setCustomData((prev) => ({ ...prev, [field.id]: val }));
                        setCustomErrors((prev) => ({ ...prev, [field.id]: "" }));
                      }}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Pilih..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(field.options ?? []).map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {field.type === "checkbox" && (
                    <label className="mt-1.5 flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded"
                        checked={customData[field.id] === "true"}
                        onChange={(e) => {
                          setCustomData((prev) => ({ ...prev, [field.id]: e.target.checked ? "true" : "" }));
                          setCustomErrors((prev) => ({ ...prev, [field.id]: "" }));
                        }}
                      />
                      <span className="text-sm text-muted-foreground">Ya, saya setuju</span>
                    </label>
                  )}

                  {field.type === "file" && (
                    <div className="mt-1.5">
                      <input
                        id={`cf_${field.id}`}
                        type="file"
                        accept={field.acceptedFileTypes ?? "image/*"}
                        className="w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-muted file:text-foreground hover:file:bg-muted/80 cursor-pointer"
                        onChange={(e) => {
                          handleFileField(field.id, e);
                          setCustomErrors((prev) => ({ ...prev, [field.id]: "" }));
                        }}
                      />
                      {customData[field.id] && (
                        <p className="text-xs text-green-600 mt-1">File berhasil dipilih</p>
                      )}
                    </div>
                  )}

                  {customErrors[field.id] && (
                    <p className="text-destructive text-xs mt-1">{customErrors[field.id]}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Rincian Pembayaran */}
        {event && event.price > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Rincian Pembayaran</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Harga Tiket</span>
                <span>{formatPrice(event.price)}</span>
              </div>
              {isFeeOnTop ? (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Biaya Platform (5%)</span>
                  <span>+{formatPrice(totalFee)}</span>
                </div>
              ) : (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Biaya Platform</span>
                  <span>Ditanggung organiser</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-primary">{formatPrice(total)}</span>
              </div>
              <div className="flex gap-1 flex-wrap pt-1">
                <Badge variant="outline" className="text-xs">QRIS</Badge>
                <Badge variant="outline" className="text-xs">Transfer Bank</Badge>
                <Badge variant="outline" className="text-xs">E-Wallet</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={isLoading || !event}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Memproses...
            </>
          ) : event?.price === 0 ? (
            "Daftar Gratis"
          ) : (
            "Lanjut ke Pembayaran"
          )}
        </Button>
      </form>
    </div>
  );
}
