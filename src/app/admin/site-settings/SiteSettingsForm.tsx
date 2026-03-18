"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { SiteSettings } from "@/lib/site-settings";

const RichTextEditor = dynamic(
  () => import("@/components/RichTextEditor").then(m => m.RichTextEditor),
  { ssr: false, loading: () => <div className="h-64 border rounded-md animate-pulse bg-muted" /> }
);

type FieldDef = {
  key: keyof SiteSettings;
  label: string;
  type?: "text" | "email" | "url" | "tel" | "rich" | "username";
  prefix?: string;
  hint?: string;
  validate?: (v: string) => string | null;
};

type Tab = { id: string; label: string; fields: FieldDef[] };

const TABS: Tab[] = [
  {
    id: "brand",
    label: "Brand & Kontak",
    fields: [
      { key: "brandName",    label: "Nama Brand",    validate: v => v.trim() ? null : "Nama brand wajib diisi" },
      { key: "brandWebsite", label: "Website",       hint: "Contoh: beltim.id" },
      { key: "brandTagline", label: "Tagline",       hint: "Teks di bawah logo pada footer" },
      {
        key: "supportEmail", label: "Email Support", type: "email",
        validate: v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "Format email tidak valid",
      },
      {
        key: "supportWhatsapp", label: "Nomor WhatsApp", type: "tel",
        hint: "Hanya angka, misal: 6281234567890",
        validate: v => !v || /^\d{8,15}$/.test(v) ? null : "Hanya angka, 8–15 digit",
      },
    ],
  },
  {
    id: "sosmed",
    label: "Media Sosial",
    fields: [
      { key: "socialFacebook",  label: "Facebook",  type: "username", prefix: "facebook.com/",  hint: "Contoh: BeltimHub" },
      { key: "socialInstagram", label: "Instagram", type: "username", prefix: "instagram.com/", hint: "Contoh: beltimhub" },
      { key: "socialYoutube",   label: "YouTube",   type: "username", prefix: "youtube.com/@",  hint: "Contoh: BeltimHub" },
      { key: "socialTiktok",    label: "TikTok",    type: "username", prefix: "tiktok.com/@",   hint: "Contoh: beltimhub" },
    ],
  },
  { id: "tentang", label: "Tentang",                fields: [{ key: "pageTentang", label: "Konten halaman /tentang",  type: "rich" }] },
  { id: "syarat",  label: "Syarat & Ketentuan",     fields: [{ key: "pageSyarat",  label: "Konten halaman /syarat",   type: "rich" }] },
  { id: "privasi", label: "Kebijakan Privasi",      fields: [{ key: "pagePrivasi", label: "Konten halaman /privasi",  type: "rich" }] },
  { id: "refund",  label: "Kebijakan Pengembalian", fields: [{ key: "pageRefund",  label: "Konten halaman /refund",   type: "rich" }] },
];

export function SiteSettingsForm({ initial }: { initial: SiteSettings }) {
  const [form, setForm]           = useState<SiteSettings>(initial);
  const [errors, setErrors]       = useState<Partial<Record<keyof SiteSettings, string>>>({});
  const [activeTab, setActiveTab] = useState("brand");
  const [saving, setSaving]       = useState(false);
  const [message, setMessage]     = useState<{ ok: boolean; text: string } | null>(null);

  function setField(key: keyof SiteSettings) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setForm(f => ({ ...f, [key]: value }));
      if (errors[key]) setErrors(er => ({ ...er, [key]: undefined }));
    };
  }

  function setFieldTelOnly(key: keyof SiteSettings) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/\D/g, "");
      setForm(f => ({ ...f, [key]: value }));
      if (errors[key]) setErrors(er => ({ ...er, [key]: undefined }));
    };
  }

  const setRich = (key: keyof SiteSettings) => (html: string) =>
    setForm(f => ({ ...f, [key]: html }));

  function validate(fields: FieldDef[]): boolean {
    const newErrors: Partial<Record<keyof SiteSettings, string>> = {};
    for (const f of fields) {
      if (f.validate) {
        const err = f.validate(form[f.key]);
        if (err) newErrors[f.key] = err;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const currentTab = TABS.find(t => t.id === activeTab)!;
    if (!validate(currentTab.fields)) return;

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) setMessage({ ok: true, text: "Pengaturan berhasil disimpan." });
      else setMessage({ ok: false, text: JSON.stringify(data.error) ?? "Gagal menyimpan." });
    } catch {
      setMessage({ ok: false, text: "Terjadi kesalahan jaringan." });
    } finally {
      setSaving(false);
    }
  }

  const currentTab = TABS.find(t => t.id === activeTab) ?? TABS[0];

  return (
    <div className="pb-20">
      {/* Sticky header: judul + tab bar */}
      <div className="sticky top-0 z-20 bg-muted/30 backdrop-blur-sm -mx-4 md:-mx-8 px-4 md:px-8 pt-6 pb-0 mb-8">
        <h1 className="text-xl font-bold mb-1">Pengaturan Situs</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Data brand, media sosial, dan konten halaman statis (Tentang, Syarat, Privasi, Refund).
        </p>
        {/* Tab bar */}
        <div className="flex gap-0 border-b w-full">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setActiveTab(tab.id); setMessage(null); setErrors({}); }}
              className={`shrink-0 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <form id="site-settings-form" onSubmit={handleSubmit} className="space-y-6">
        {currentTab.fields.map(f => {
          const isRich = f.type === "rich";
          const isTel  = f.type === "tel";
          const err    = errors[f.key];

          const isUsername = f.type === "username";

          return (
            <div key={f.key} className={isRich ? "w-full" : "max-w-xl"}>
              <label className="block text-sm font-medium mb-1.5">
                {f.label}
              </label>
              {isRich ? (
                <RichTextEditor
                  key={activeTab}
                  value={form[f.key]}
                  onChange={setRich(f.key)}
                  placeholder="Kosong = halaman menampilkan 'Konten belum tersedia'"
                  className="h-[420px]"
                />
              ) : isUsername ? (
                <div className={`flex items-center border rounded-lg overflow-hidden bg-background transition-colors ${err ? "border-red-400" : "border-input"}`}>
                  <span className="px-3 py-2 text-sm text-muted-foreground bg-muted border-r border-inherit whitespace-nowrap select-none">
                    {f.prefix}
                  </span>
                  <input
                    type="text"
                    value={form[f.key]}
                    onChange={setField(f.key)}
                    className="flex-1 px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500/40"
                  />
                </div>
              ) : (
                <input
                  type={isTel ? "text" : (f.type ?? "text")}
                  inputMode={isTel ? "numeric" : undefined}
                  value={form[f.key]}
                  onChange={isTel ? setFieldTelOnly(f.key) : setField(f.key)}
                  className={`w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 transition-colors ${
                    err
                      ? "border-red-400 focus:ring-red-300"
                      : "border-input focus:ring-teal-500/40"
                  }`}
                />
              )}
              {f.hint && !err && (
                <p className="text-xs text-muted-foreground mt-1">{f.hint}</p>
              )}
              {err && (
                <p className="text-xs text-red-500 mt-1">{err}</p>
              )}
            </div>
          );
        })}

      </form>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 right-0 left-0 md:left-56 z-40 flex items-center gap-6 px-8 py-4 bg-background border-t shadow-md">
        <button
          type="submit"
          form="site-settings-form"
          disabled={saving}
          className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-6 py-2 rounded-lg disabled:opacity-50 transition-colors shrink-0"
        >
          {saving ? "Menyimpan..." : "Simpan Pengaturan"}
        </button>
        <p className="text-sm text-muted-foreground">
          {message ? (
            <span className={message.ok ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
              {message.text}
            </span>
          ) : (
            "Perubahan akan diterapkan setelah disimpan."
          )}
        </p>
      </div>
    </div>
  );
}
