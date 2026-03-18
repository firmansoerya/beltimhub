"use client";

import { useState } from "react";
import type { SiteSettings } from "@/lib/site-settings";

type Section = {
  title: string;
  fields: { key: keyof SiteSettings; label: string; type?: "text" | "email" | "url" | "textarea" }[];
};

const SECTIONS: Section[] = [
  {
    title: "Identitas Brand & Kontak",
    fields: [
      { key: "brandName",       label: "Nama Brand" },
      { key: "brandWebsite",    label: "Website" },
      { key: "brandTagline",    label: "Tagline" },
      { key: "supportEmail",    label: "Email Support",  type: "email" },
      { key: "supportWhatsapp", label: "Nomor WhatsApp" },
    ],
  },
  {
    title: "Media Sosial",
    fields: [
      { key: "socialFacebook",  label: "URL Facebook",  type: "url" },
      { key: "socialInstagram", label: "URL Instagram", type: "url" },
      { key: "socialYoutube",   label: "URL YouTube",   type: "url" },
    ],
  },
  {
    title: "Halaman Statis",
    fields: [
      { key: "pageTentang", label: "Tentang Kami (/tentang)",           type: "textarea" },
      { key: "pageSyarat",  label: "Syarat & Ketentuan (/syarat)",      type: "textarea" },
      { key: "pagePrivasi", label: "Kebijakan Privasi (/privasi)",      type: "textarea" },
      { key: "pageRefund",  label: "Kebijakan Pengembalian (/refund)",  type: "textarea" },
    ],
  },
];

export function SiteSettingsForm({ initial }: { initial: SiteSettings }) {
  const [form, setForm] = useState<SiteSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const setField = (key: keyof SiteSettings) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {SECTIONS.map(section => (
        <div key={section.title}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            {section.title}
          </h2>
          <div className="space-y-4">
            {section.fields.map(f => (
              <div key={f.key} className="space-y-1">
                <label className="text-sm font-medium">{f.label}</label>
                {f.type === "textarea" ? (
                  <textarea
                    value={form[f.key]}
                    onChange={setField(f.key)}
                    rows={8}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono resize-y"
                    placeholder="Kosong = halaman tidak menampilkan konten"
                  />
                ) : (
                  <input
                    type={f.type ?? "text"}
                    value={form[f.key]}
                    onChange={setField(f.key)}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {message && (
        <p className={`text-sm ${message.ok ? "text-green-600" : "text-red-600"}`}>
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-5 py-2 rounded-md disabled:opacity-50"
      >
        {saving ? "Menyimpan..." : "Simpan Semua Pengaturan"}
      </button>
    </form>
  );
}
