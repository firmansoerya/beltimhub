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
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const JOB_TYPES = ["Full-time", "Part-time", "Freelance", "Magang"] as const;

const schema = z.object({
  title: z.string().min(5, "Minimal 5 karakter").max(150),
  company: z.string().min(2, "Minimal 2 karakter").max(100),
  type: z.enum(JOB_TYPES, { message: "Pilih tipe pekerjaan" }),
  location: z.string().optional(),
  salary: z.string().optional(),
  contact: z.string().min(5, "Masukkan kontak (HP atau email)"),
  description: z.string().min(20, "Minimal 20 karakter").max(5000),
  expiresAt: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function BuatLokerPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<FormData>({ resolver: zodResolver(schema) as any });

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    try {
      const payload = {
        ...data,
        expiresAt: data.expiresAt
          ? new Date(data.expiresAt).toISOString()
          : undefined,
      };

      const res = await fetch("/api/loker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.formErrors?.[0] ?? err.error ?? "Gagal memposting lowongan");
      }

      const job = await res.json();
      toast.success("Lowongan berhasil diposting!");
      router.push(`/loker/${job.id}?new=1`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Posting Lowongan</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Cari kandidat terbaik dari warga Belitung Timur
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Info Lowongan */}
        <Card>
          <CardHeader><CardTitle className="text-base">Informasi Lowongan</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Posisi / Jabatan *</Label>
              <Input id="title" placeholder="cth: Kasir, Driver Ojol, Sales Marketing..." className="mt-1.5" {...register("title")} />
              {errors.title && <p className="text-destructive text-xs mt-1">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company">Nama Perusahaan / Usaha *</Label>
                <Input id="company" placeholder="cth: Toko Maju Jaya" className="mt-1.5" {...register("company")} />
                {errors.company && <p className="text-destructive text-xs mt-1">{errors.company.message}</p>}
              </div>
              <div>
                <Label>Tipe Pekerjaan *</Label>
                <Select onValueChange={(val: string | null) => val && setValue("type", val as FormData["type"])}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Pilih tipe..." />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.type && <p className="text-destructive text-xs mt-1">{errors.type.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location">Lokasi</Label>
                <Input id="location" placeholder="cth: Manggar, Beltim" className="mt-1.5" {...register("location")} />
              </div>
              <div>
                <Label htmlFor="salary">Gaji / Upah</Label>
                <Input id="salary" placeholder="cth: Rp 2.000.000 / bulan" className="mt-1.5" {...register("salary")} />
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block">Deskripsi & Persyaratan *</Label>
              <RichTextEditor
                onChange={(html) => setValue("description", html, { shouldValidate: true })}
                placeholder="Jelaskan tugas, kualifikasi, jam kerja, benefit, dan syarat lainnya..."
              />
              {errors.description && <p className="text-destructive text-xs mt-1">{errors.description.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Kontak & Batas Waktu */}
        <Card>
          <CardHeader><CardTitle className="text-base">Kontak & Batas Waktu</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="contact">Kontak Lamaran *</Label>
              <Input
                id="contact"
                placeholder="cth: 08123456789 atau hrd@perusahaan.com"
                className="mt-1.5"
                {...register("contact")}
              />
              <p className="text-xs text-muted-foreground mt-1">Pelamar akan diarahkan ke nomor/email ini</p>
              {errors.contact && <p className="text-destructive text-xs mt-1">{errors.contact.message}</p>}
            </div>

            <div>
              <Label htmlFor="expiresAt">Batas Waktu Lamaran (opsional)</Label>
              <Input id="expiresAt" type="date" className="mt-1.5" {...register("expiresAt")} />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
          {isLoading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Memposting...</>
          ) : (
            "Posting Lowongan"
          )}
        </Button>
      </form>
    </div>
  );
}
