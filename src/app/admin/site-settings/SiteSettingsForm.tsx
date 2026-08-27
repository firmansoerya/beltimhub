"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { SiteSettings, FeatureItem } from "@/types/site-settings";
import {
  Calendar, ShoppingCart, Megaphone, Briefcase, Store, TreePalm,
  Newspaper, Info, Globe, Sparkles, MessageSquare, Heart, Star,
  Compass, Tag, FileText, Plus, Trash2, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const RichTextEditor = dynamic(
  () => import("@/components/RichTextEditor").then(m => m.RichTextEditor),
  { ssr: false, loading: () => <div className="h-64 border rounded-md animate-pulse bg-muted" /> }
);

const ICON_MAP: Record<string, React.ElementType> = {
  Calendar,
  ShoppingCart,
  Megaphone,
  Briefcase,
  Store,
  TreePalm,
  Newspaper,
  Info,
  Globe,
  Sparkles,
  MessageSquare,
  Heart,
  Star,
  Compass,
  Tag,
  FileText,
};

type FieldDef = {
  key: keyof SiteSettings;
  label: string;
  type?: "text" | "email" | "url" | "tel" | "rich" | "username";
  prefix?: string;
  hint?: string;
  validate?: (v: string) => string | null;
};

type Tab = { id: string; label: string; desc?: string; fields?: FieldDef[] };

const TABS: Tab[] = [
  {
    id: "features",
    label: "Modul & Fitur",
    desc: "Atur aktif/non-aktif modul utama platform dan tambahkan menu navigasi kustom baru.",
  },
  {
    id: "brand",
    label: "Brand & Kontak",
    desc: "Informasi identitas brand, tagline, email dukungan, dan nomor WhatsApp resmi.",
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
    desc: "Tautan akun media sosial resmi BeltimHub yang ditampilkan di footer.",
    fields: [
      { key: "socialFacebook",  label: "Facebook",  type: "username", prefix: "facebook.com/",  hint: "Contoh: BeltimHub" },
      { key: "socialInstagram", label: "Instagram", type: "username", prefix: "instagram.com/", hint: "Contoh: beltimhub" },
      { key: "socialYoutube",   label: "YouTube",   type: "username", prefix: "youtube.com/@",  hint: "Contoh: BeltimHub" },
      { key: "socialTiktok",    label: "TikTok",    type: "username", prefix: "tiktok.com/@",   hint: "Contoh: beltimhub" },
    ],
  },
  { id: "tentang", label: "Halaman Tentang", desc: "Konten penjelasan platform yang ditampilkan di /tentang", fields: [{ key: "pageTentang", label: "Konten halaman /tentang",  type: "rich" }] },
  { id: "syarat",  label: "Syarat & Ketentuan", desc: "Ketentuan layanan penggunaan platform di /syarat", fields: [{ key: "pageSyarat",  label: "Konten halaman /syarat",   type: "rich" }] },
  { id: "privasi", label: "Kebijakan Privasi", desc: "Pernyataan perlindungan data & privasi di /privasi", fields: [{ key: "pagePrivasi", label: "Konten halaman /privasi",  type: "rich" }] },
  { id: "refund",  label: "Kebijakan Refund", desc: "Kebijakan pengembalian dana tiket/pesanan di /refund", fields: [{ key: "pageRefund",  label: "Konten halaman /refund",   type: "rich" }] },
];

export function SiteSettingsForm({
  initial,
  initialFeatures = [],
}: {
  initial: SiteSettings;
  initialFeatures?: FeatureItem[];
}) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [form, setForm]               = useState<SiteSettings>(initial);
  const [features, setFeatures]       = useState<FeatureItem[]>(initialFeatures);
  const [errors, setErrors]           = useState<Partial<Record<keyof SiteSettings, string>>>({});
  const [activeTab, setActiveTab]     = useState(tabParam && TABS.some(t => t.id === tabParam) ? tabParam : "features");
  const [saving, setSaving]           = useState(false);
  const [message, setMessage]         = useState<{ ok: boolean; text: string } | null>(null);

  // Sync state if URL query param changes from sidebar navigation
  useEffect(() => {
    if (tabParam && TABS.some(t => t.id === tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
      setMessage(null);
      setErrors({});
    }
  }, [tabParam, activeTab]);

  // New Custom Feature State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLabel, setNewLabel]       = useState("");
  const [newHref, setNewHref]         = useState("");
  const [newIcon, setNewIcon]         = useState("Sparkles");
  const [newDesc, setNewDesc]         = useState("");
  const [newError, setNewError]       = useState("");

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

  function toggleFeature(id: string) {
    setFeatures(prev =>
      prev.map(f => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    );
    setMessage(null);
  }

  function removeCustomFeature(id: string) {
    if (confirm("Apakah Anda yakin ingin menghapus menu fitur ini?")) {
      setFeatures(prev => prev.filter(f => f.id !== id));
      setMessage(null);
    }
  }

  function handleAddFeature() {
    if (!newLabel.trim()) {
      setNewError("Nama menu wajib diisi");
      return;
    }
    if (!newHref.trim()) {
      setNewError("URL / Path wajib diisi");
      return;
    }

    const id = newLabel.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    if (features.some(f => f.id === id || f.href === newHref.trim())) {
      setNewError("Menu atau Path URL sudah terdaftar");
      return;
    }

    const newItem: FeatureItem = {
      id: id || `custom-${Date.now()}`,
      label: newLabel.trim(),
      href: newHref.trim().startsWith("/") || newHref.trim().startsWith("http") ? newHref.trim() : `/${newHref.trim()}`,
      iconName: newIcon,
      description: newDesc.trim() || undefined,
      enabled: true,
      isCustom: true,
    };

    setFeatures(prev => [...prev, newItem]);
    setNewLabel("");
    setNewHref("");
    setNewIcon("Sparkles");
    setNewDesc("");
    setNewError("");
    setShowAddModal(false);
    setMessage(null);
  }

  function validate(fields?: FieldDef[]): boolean {
    if (!fields) return true;
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
    if (currentTab.fields && !validate(currentTab.fields)) return;

    setSaving(true);
    setMessage(null);

    // Kirim HANYA data yang relevan dengan menu / halaman yang sedang aktif
    const payload: Record<string, unknown> = {};
    if (activeTab === "features") {
      payload.featuresConfig = features;
    } else if (currentTab.fields) {
      for (const field of currentTab.fields) {
        payload[field.key] = form[field.key];
      }
    }

    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ ok: true, text: `Pengaturan "${currentTab.label}" berhasil disimpan.` });
      } else {
        setMessage({ ok: false, text: JSON.stringify(data.error) ?? "Gagal menyimpan." });
      }
    } catch {
      setMessage({ ok: false, text: "Terjadi kesalahan jaringan." });
    } finally {
      setSaving(false);
    }
  }

  const currentTab = TABS.find(t => t.id === activeTab) ?? TABS[0];

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 pb-28">
      {/* Clean, well-spaced header */}
      <div className="mb-8 pb-5 border-b">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-1.5">
              <span>Pengaturan Situs</span>
              <span>/</span>
              <span className="text-primary font-semibold">{currentTab.label}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{currentTab.label}</h1>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {currentTab.desc}
            </p>
          </div>
        </div>
      </div>

      <form id="site-settings-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Tab: Modul & Navigasi Fitur */}
        {activeTab === "features" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-teal-50/80 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900/50 rounded-2xl p-5">
              <div>
                <h2 className="text-sm font-bold text-teal-950 dark:text-teal-200">Kontrol Visibilitas Fitur</h2>
                <p className="text-xs text-teal-700 dark:text-teal-400 mt-1">
                  Menu yang dinonaktifkan akan otomatis disembunyikan dari Navbar, Footer, dan Homepage.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => setShowAddModal(true)}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs px-4 py-2 rounded-xl shadow-sm flex items-center gap-2 shrink-0 self-start sm:self-auto transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tambah Menu Baru
              </Button>
            </div>

            {/* Grid List of Features with comfortable padding & spacing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((f) => {
                const IconComponent = ICON_MAP[f.iconName] || Sparkles;
                return (
                  <div
                    key={f.id}
                    className={`flex items-start justify-between p-5 rounded-2xl border transition-all ${
                      f.enabled
                        ? "bg-card border-border shadow-xs hover:border-primary/50"
                        : "bg-muted/40 border-dashed border-muted-foreground/30 opacity-75"
                    }`}
                  >
                    <div className="flex items-start gap-4 min-w-0 pr-3">
                      <div
                        className={`p-3 rounded-xl shrink-0 ${
                          f.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{f.label}</span>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            {f.href}
                          </span>
                          {f.isCustom && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold">
                              Kustom
                            </span>
                          )}
                        </div>
                        {f.description && (
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                            {f.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-1">
                      {/* Toggle switch button */}
                      <button
                        type="button"
                        onClick={() => toggleFeature(f.id)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          f.enabled ? "bg-primary" : "bg-muted-foreground/30"
                        }`}
                        role="switch"
                        aria-checked={f.enabled}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            f.enabled ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>

                      {f.isCustom && (
                        <button
                          type="button"
                          onClick={() => removeCustomFeature(f.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive rounded-md transition-colors cursor-pointer"
                          title="Hapus Menu Kustom"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal / Form Tambah Menu Baru */}
            {showAddModal && (
              <div className="bg-card border-2 border-primary/40 rounded-2xl p-6 shadow-md space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4 text-primary" />
                    Tambah Fitur / Menu Navigasi Baru
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Batal
                  </button>
                </div>

                {newError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive">
                    {newError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5">Nama Menu</label>
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => { setNewLabel(e.target.value); setNewError(""); }}
                      placeholder="Contoh: Forum Warga"
                      className="w-full h-11 border rounded-xl px-4 py-2.5 text-sm bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5">URL / Path Tujuan</label>
                    <input
                      type="text"
                      value={newHref}
                      onChange={(e) => { setNewHref(e.target.value); setNewError(""); }}
                      placeholder="Contoh: /forum atau https://..."
                      className="w-full h-11 border rounded-xl px-4 py-2.5 text-sm bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5">Pilihan Ikon</label>
                    <select
                      value={newIcon}
                      onChange={(e) => setNewIcon(e.target.value)}
                      className="w-full h-11 border rounded-xl px-4 py-2.5 text-sm bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none cursor-pointer"
                    >
                      {Object.keys(ICON_MAP).map(iconName => (
                        <option key={iconName} value={iconName}>
                          {iconName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5">Deskripsi Singkat (Opsional)</label>
                    <input
                      type="text"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="Deskripsi fitur untuk panduan"
                      className="w-full h-11 border rounded-xl px-4 py-2.5 text-sm bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddModal(false)}
                    className="cursor-pointer"
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddFeature}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer font-medium"
                  >
                    Tambahkan Menu
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab Standard: Brand, Media Sosial, Halaman Statis */}
        {currentTab.fields && (
          <div className="space-y-6">
            {currentTab.fields.map(f => {
              const isRich = f.type === "rich";
              const isTel  = f.type === "tel";
              const err    = errors[f.key];
              const isUsername = f.type === "username";

              return (
                <div key={f.key} className={isRich ? "w-full" : "max-w-2xl"}>
                  <label className="block text-sm font-semibold mb-2 text-foreground">
                    {f.label}
                  </label>
                  {isRich ? (
                    <RichTextEditor
                      key={activeTab}
                      value={form[f.key]}
                      onChange={setRich(f.key)}
                      placeholder="Kosong = halaman menampilkan 'Konten belum tersedia'"
                      className="h-[440px]"
                    />
                  ) : isUsername ? (
                    <div className={`flex items-center border rounded-xl overflow-hidden bg-card shadow-xs transition-colors ${err ? "border-destructive ring-1 ring-destructive" : "border-input hover:border-primary/50 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"}`}>
                      <span className="px-4 py-2.5 text-sm text-muted-foreground bg-muted/70 border-r border-inherit whitespace-nowrap select-none font-mono">
                        {f.prefix}
                      </span>
                      <input
                        type="text"
                        value={form[f.key]}
                        onChange={setField(f.key)}
                        className="flex-1 h-11 px-4 py-2.5 text-sm bg-transparent outline-none"
                      />
                    </div>
                  ) : (
                    <input
                      type={isTel ? "text" : (f.type ?? "text")}
                      inputMode={isTel ? "numeric" : undefined}
                      value={form[f.key]}
                      onChange={isTel ? setFieldTelOnly(f.key) : setField(f.key)}
                      className={`w-full h-11 border rounded-xl px-4 py-2.5 text-sm bg-card shadow-xs outline-none transition-all ${
                        err
                          ? "border-destructive ring-1 ring-destructive focus:ring-destructive/30"
                          : "border-input hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      }`}
                    />
                  )}
                  {f.hint && !err && (
                    <p className="text-xs text-muted-foreground mt-1.5">{f.hint}</p>
                  )}
                  {err && (
                    <p className="text-xs text-destructive mt-1.5 font-medium">{err}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </form>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 right-0 left-0 md:left-56 z-40 flex items-center justify-between gap-4 px-6 md:px-10 py-4 bg-background/95 backdrop-blur border-t shadow-md">
        <div className="flex items-center gap-4">
          <Button
            type="submit"
            form="site-settings-form"
            disabled={saving}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-6 py-2.5 rounded-xl disabled:opacity-50 transition-all shrink-0 shadow-sm cursor-pointer"
          >
            {saving ? "Menyimpan..." : `Simpan ${currentTab.label}`}
          </Button>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {message ? (
              <span className={message.ok ? "text-emerald-600 font-medium flex items-center gap-1.5" : "text-destructive font-medium"}>
                {message.ok && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                {message.text}
              </span>
            ) : (
              `Menyimpan perubahan khusus untuk bagian "${currentTab.label}".`
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
