"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ImageUpload } from "@/components/ImageUpload";
import { Loader2, Camera } from "lucide-react";

interface Props {
  fullName: string;
  email: string;
  avatarUrl: string | null;
  organizerLogoUrl: string | null;
  organizerPhone: string | null;
  organizerBio: string | null;
  organizerAddress: string | null;
  organizerBannerUrl: string | null;
  twitterUsername: string | null;
  instagramUsername: string | null;
  facebookUrl: string | null;
  tiktokUsername: string | null;
}

export function OrganizerProfilForm({
  fullName,
  email,
  avatarUrl,
  organizerLogoUrl: initLogo,
  organizerPhone: initPhone,
  organizerBio,
  organizerAddress,
  organizerBannerUrl: initBanner,
  twitterUsername,
  instagramUsername,
  facebookUrl,
  tiktokUsername,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(initLogo);
  const [bannerUrl, setBannerUrl] = useState(initBanner);

  const [form, setForm] = useState({
    fullName,
    organizerPhone: initPhone ?? "",
    organizerBio: organizerBio ?? "",
    organizerAddress: organizerAddress ?? "",
    twitterUsername: twitterUsername ?? "",
    instagramUsername: instagramUsername ?? "",
    facebookUrl: facebookUrl ?? "",
    tiktokUsername: tiktokUsername ?? "",
  });

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          organizerPhone: form.organizerPhone || null,
          organizerBio: form.organizerBio,
          organizerAddress: form.organizerAddress,
          twitterUsername: form.twitterUsername || null,
          instagramUsername: form.instagramUsername || null,
          facebookUrl: form.facebookUrl || null,
          tiktokUsername: form.tiktokUsername || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Profil disimpan");
      router.refresh();
    } catch {
      toast.error("Gagal menyimpan profil");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Banner */}
      <div>
        <label className="block text-sm font-medium mb-2">Banner / Poster</label>
        <ImageUpload type="banner" currentUrl={bannerUrl} onUploaded={url => setBannerUrl(url)} />
      </div>

      {/* Logo + Basic Info */}
      <div className="flex gap-6 items-start">
        {/* Logo organizer */}
        <div className="shrink-0 flex flex-col items-center gap-1">
          <ImageUpload type="logo" currentUrl={logoUrl} onUploaded={url => setLogoUrl(url)}>
            {({ open, uploading }) => (
              <div className="relative">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-dashed border-primary/30">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
                  ) : avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-primary">{fullName[0]?.toUpperCase()}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={open}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-primary flex items-center justify-center shadow disabled:opacity-50"
                >
                  {uploading
                    ? <Loader2 className="h-3 w-3 text-primary-foreground animate-spin" />
                    : <Camera className="h-3 w-3 text-primary-foreground" />
                  }
                </button>
              </div>
            )}
          </ImageUpload>
          <p className="text-[10px] text-muted-foreground text-center max-w-[80px]">Logo Organizer</p>
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nama Organizer <span className="text-destructive">*</span></label>
            <input
              className="w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={form.fullName}
              onChange={set("fullName")}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Email{" "}
              <span className="text-[10px] font-normal text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full ml-1">
                Terverifikasi
              </span>
            </label>
            <input
              className="w-full text-sm border rounded-lg px-3 py-2 bg-muted/50 text-muted-foreground cursor-not-allowed"
              value={email}
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Nomor Ponsel Kreator</label>
            <input
              className="w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="08xxxxxxxxxx (nomor untuk urusan event)"
              value={form.organizerPhone}
              onChange={set("organizerPhone")}
            />
            <p className="text-xs text-muted-foreground mt-1">Nomor ini khusus untuk kegiatan kreator/event, terpisah dari nomor akun utama.</p>
          </div>
        </div>
      </div>

      {/* Alamat */}
      <div>
        <label className="block text-sm font-medium mb-1">Alamat</label>
        <textarea
          className="w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          rows={3}
          maxLength={150}
          placeholder="Alamat penyelenggara..."
          value={form.organizerAddress}
          onChange={set("organizerAddress")}
        />
        <p className="text-xs text-muted-foreground text-right mt-0.5">Sisa {150 - form.organizerAddress.length} karakter</p>
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-medium mb-1">Tentang Kami</label>
        <RichTextEditor
          value={form.organizerBio}
          onChange={v => setForm(prev => ({ ...prev, organizerBio: v }))}
          placeholder="Deskripsi singkat tentang penyelenggara..."
        />
      </div>

      {/* Social Media */}
      <div>
        <label className="block text-sm font-medium mb-3">Media Sosial</label>
        <div className="space-y-3">
          {[
            { label: "Username Instagram", key: "instagramUsername" as const, prefix: "@", placeholder: "username" },
            { label: "Username TikTok", key: "tiktokUsername" as const, prefix: "@", placeholder: "username" },
            { label: "Username Twitter/X", key: "twitterUsername" as const, prefix: "@", placeholder: "username" },
            { label: "Facebook URL", key: "facebookUrl" as const, prefix: "fb.com/", placeholder: "halaman-facebook" },
          ].map(({ label, key, prefix, placeholder }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground w-32 shrink-0">{label}</span>
              <div className="flex-1 flex items-center border rounded-lg overflow-hidden bg-background">
                <span className="px-3 py-2 text-sm text-muted-foreground bg-muted/50 border-r text-xs">{prefix}</span>
                <input
                  className="flex-1 px-3 py-2 text-sm focus:outline-none"
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={set(key)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 md:left-56 right-0 z-40 flex items-center gap-6 px-8 py-4 bg-background border-t shadow-md">
        <Button onClick={handleSave} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Simpan
        </Button>
      </div>
    </div>
  );
}
