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
import { Loader2, ArrowLeft } from "lucide-react";

const JOB_TYPES = ["Full-time", "Part-time", "Freelance", "Magang"] as const;

const schema = z.object({
  title: z.string().min(5, "Minimal 5 karakter").max(150),
  company: z.string().min(2, "Minimal 2 karakter").max(100),
  type: z.enum(JOB_TYPES, { message: "Pilih tipe pekerjaan" }),
  location: z.string().optional(),
  salary: z.string().optional(),
  contact: z.string().min(5, "Masukkan kontak (HP atau email)"),
  description: z.string().min(20, "Minimal 20 karakter").max(5000),
});

type FormData = z.infer<typeof schema>;

interface Props {
  id: string;
  defaultValues: FormData;
}

export function EditLokerForm({ id, defaultValues }: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<FormData>({ resolver: zodResolver(schema) as any, defaultValues });

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/loker/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Gagal menyimpan");
      toast.success("Lowongan berhasil diperbarui!");
      router.push(`/loker/${id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Link href={`/loker/${id}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Lowongan
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Lowongan</h1>
        <p className="text-muted-foreground text-sm mt-1">Perbarui informasi lowongan Anda</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Card>
          <CardHeader><CardTitle className="text-base">Informasi Lowongan</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Posisi / Jabatan *</Label>
              <Input id="title" className="mt-1.5" {...register("title")} />
              {errors.title && <p className="text-destructive text-xs mt-1">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company">Nama Perusahaan / Usaha *</Label>
                <Input id="company" className="mt-1.5" {...register("company")} />
                {errors.company && <p className="text-destructive text-xs mt-1">{errors.company.message}</p>}
              </div>
              <div>
                <Label>Tipe Pekerjaan *</Label>
                <Select defaultValue={defaultValues.type} onValueChange={(val: string | null) => val && setValue("type", val as FormData["type"])}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {JOB_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.type && <p className="text-destructive text-xs mt-1">{errors.type.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location">Lokasi</Label>
                <Input id="location" className="mt-1.5" {...register("location")} />
              </div>
              <div>
                <Label htmlFor="salary">Gaji / Upah</Label>
                <Input id="salary" className="mt-1.5" {...register("salary")} />
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block">Deskripsi & Persyaratan *</Label>
              <RichTextEditor
                value={defaultValues.description}
                onChange={(html) => setValue("description", html, { shouldValidate: true })}
              />
              {errors.description && <p className="text-destructive text-xs mt-1">{errors.description.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Kontak Lamaran</CardTitle></CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="contact">Kontak Lamaran *</Label>
              <Input id="contact" className="mt-1.5" {...register("contact")} />
              <p className="text-xs text-muted-foreground mt-1">Pelamar akan diarahkan ke nomor/email ini</p>
              {errors.contact && <p className="text-destructive text-xs mt-1">{errors.contact.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
          {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Menyimpan...</> : "Simpan Perubahan"}
        </Button>
      </form>
    </div>
  );
}
