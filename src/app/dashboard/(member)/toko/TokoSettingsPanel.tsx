"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, MapPin, ImageIcon, X, Lock, Pencil } from "lucide-react";
import { BANK_LIST } from "@/lib/bank-list";
import { PhoneInput, normalizePhone } from "@/components/PhoneInput";
import { ImageCropper } from "@/components/ImageCropper";

interface UmkmSettingsData {
  id: string;
  name: string;
  category: string;
  description: string;
  address: string;
  phone: string;
  instagram: string;
  website: string;
  mapsUrl: string;
  imageUrl: string;
  shippingConfig: ShippingConfig;
  operatingHours: string;
  replyTime: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
}

interface Props {
  umkm: UmkmSettingsData;
}

import {
  UMKM_CATEGORIES,
  SHIPPING_METHOD_KEYS, SHIPPING_METHOD_LABELS,
  type ShippingConfig, type ShippingMethodKey,
} from "@/lib/constants";
const CATEGORIES = UMKM_CATEGORIES;

export function TokoSettingsPanel({ umkm }: Props) {
  const [saving, setSaving] = useState(false);

  // Info Usaha
  const [name, setName] = useState(umkm.name);
  const [category, setCategory] = useState(umkm.category);
  const [description, setDescription] = useState(umkm.description);
  const [address, setAddress] = useState(umkm.address);
  const [phone, setPhone] = useState(umkm.phone);
  const [instagram, setInstagram] = useState(umkm.instagram);
  const [website, setWebsite] = useState(umkm.website);
  const [mapsUrl, setMapsUrl] = useState(umkm.mapsUrl);
  const [imagePreview, setImagePreview] = useState(umkm.imageUrl);
  const [rawImage, setRawImage] = useState<string | null>(null); // for cropper

  // Pengaturan Toko
  const [shipConfig, setShipConfig] = useState<ShippingConfig>(umkm.shippingConfig);
  const [operatingHours, setOperatingHours] = useState(umkm.operatingHours);
  const [replyTime, setReplyTime] = useState(umkm.replyTime);

  // Rekening (read-only by default, needs verification to edit)
  const [bankName, setBankName] = useState(umkm.bankName);
  const [bankAccountNumber, setBankAccountNumber] = useState(umkm.bankAccountNumber);
  const [bankAccountName, setBankAccountName] = useState(umkm.bankAccountName);
  type BankStep = "idle" | "confirm-phone" | "entering-otp";
  const [bankStep, setBankStep] = useState<BankStep>("idle");
  const [bankPhoneInput, setBankPhoneInput] = useState("");
  const [verifyingBank, setVerifyingBank] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [savingBank, setSavingBank] = useState(false);

  function updateShipMethod(key: ShippingMethodKey, update: Partial<ShippingConfig[ShippingMethodKey]>) {
    setShipConfig(prev => ({ ...prev, [key]: { ...prev[key], ...update } }));
  }

  function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Maks 5MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setRawImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleSave() {
    if (!name.trim()) { toast.error("Nama usaha wajib diisi"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/umkm/${umkm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, category, description, address, phone, instagram, website, mapsUrl,
          imageUrl: imagePreview || undefined,
          shippingConfig: shipConfig,
          operatingHours: operatingHours || undefined,
          replyTime: replyTime || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Gagal menyimpan");
      toast.success("Pengaturan toko berhasil disimpan");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  }

  function handleRequestBankChange() {
    setBankPhoneInput("");
    setBankStep("confirm-phone");
  }

  async function handleSendBankOtp() {
    if (!bankPhoneInput.trim()) { toast.error("Masukkan nomor HP Anda"); return; }
    setVerifyingBank(true);
    try {
      const normalized = normalizePhone(bankPhoneInput);
      const res = await fetch(`/api/umkm/${umkm.id}/bank-change/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalized }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Gagal mengirim kode");
      toast.success("Kode verifikasi telah dikirim via WhatsApp");
      setBankStep("entering-otp");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setVerifyingBank(false);
    }
  }

  async function handleSaveBank() {
    if (!bankName.trim() || !bankAccountNumber.trim() || !bankAccountName.trim()) {
      toast.error("Semua field rekening wajib diisi");
      return;
    }
    if (!verificationCode.trim()) {
      toast.error("Masukkan kode verifikasi");
      return;
    }
    setSavingBank(true);
    try {
      const res = await fetch(`/api/umkm/${umkm.id}/bank-change/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verificationCode, bankName, bankAccountNumber, bankAccountName }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Gagal menyimpan");
      toast.success("Informasi rekening berhasil diperbarui");
      setBankStep("idle");
      setVerificationCode("");
      setBankPhoneInput("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSavingBank(false);
    }
  }

  function handleCancelBankEdit() {
    setBankName(umkm.bankName);
    setBankAccountNumber(umkm.bankAccountNumber);
    setBankAccountName(umkm.bankAccountName);
    setBankStep("idle");
    setVerificationCode("");
    setBankPhoneInput("");
  }

  const sectionStyle: React.CSSProperties = {
    background: "white", borderRadius: 12, border: "1px solid rgba(0,0,0,0.08)", padding: 20, marginBottom: 16,
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#0F1923", display: "block", marginBottom: 6 };
  const inputStyle: React.CSSProperties = {
    width: "100%", border: "1.5px solid rgba(0,0,0,0.1)", borderRadius: 8,
    padding: "8px 12px", fontSize: 13, outline: "none", boxSizing: "border-box",
  };
  const sectionTitle: React.CSSProperties = { fontWeight: 700, fontSize: 14, marginBottom: 14 };
  const sectionDesc: React.CSSProperties = { fontSize: 12, color: "#6B7D8F", marginTop: -8, marginBottom: 14 };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 24, background: "#F8F9FA" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <h2 style={{ fontWeight: 700, fontSize: 15 }}>Pengaturan Toko</h2>
          <p style={{ fontSize: 12, color: "#6B7D8F", marginTop: 2 }}>Kelola informasi usaha, pengiriman, dan rekening</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px",
            borderRadius: 8, background: saving ? "#ccc" : "#006D77", color: "white",
            border: "none", cursor: saving ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600,
          }}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Simpan
        </button>
      </div>

      {/* Logo Usaha */}
      <div style={sectionStyle}>
        <p style={sectionTitle}>Logo Usaha</p>
        <p style={sectionDesc}>Foto persegi yang mewakili usahamu. Geser dan zoom untuk menyesuaikan.</p>
        {rawImage ? (
          <div style={{ maxWidth: 360 }}>
            <ImageCropper
              imageSrc={rawImage}
              aspect={1}
              onCrop={(cropped) => { setImagePreview(cropped); setRawImage(null); }}
              onCancel={() => setRawImage(null)}
            />
          </div>
        ) : imagePreview ? (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
            <div style={{ position: "relative", width: 140, height: 140, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(0,0,0,0.08)", flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button
                type="button"
                onClick={() => setImagePreview("")}
                style={{ position: "absolute", top: 6, right: 6, padding: 3, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "white", border: "none", cursor: "pointer" }}
              >
                <X size={12} />
              </button>
            </div>
            <label style={{ fontSize: 12, color: "#006D77", fontWeight: 600, cursor: "pointer", paddingBottom: 4 }}>
              Ganti Logo
              <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleImageFile} />
            </label>
          </div>
        ) : (
          <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, width: 140, height: 140, borderRadius: 12, border: "2px dashed rgba(0,0,0,0.12)", cursor: "pointer" }}>
            <ImageIcon size={20} style={{ color: "#6B7D8F" }} />
            <span style={{ fontSize: 11, color: "#6B7D8F", textAlign: "center" }}>Upload logo</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleImageFile} />
          </label>
        )}
      </div>

      {/* Info Usaha */}
      <div style={sectionStyle}>
        <p style={sectionTitle}>Informasi Usaha</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Nama Usaha</label>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Kategori</label>
            <select style={inputStyle} value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Nomor HP / WhatsApp</label>
            <PhoneInput
              value={phone.replace(/\D/g, "").replace(/^62/, "")}
              onChange={(val) => setPhone(val ? normalizePhone(val) : "")}
            />
          </div>
          <div>
            <label style={labelStyle}>Instagram</label>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, color: "#6B7D8F" }}>@</span>
              <input style={{ ...inputStyle, flex: 1 }} value={instagram} onChange={e => setInstagram(e.target.value)} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Website</label>
            <input style={inputStyle} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://" />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Alamat / Lokasi</label>
            <input style={inputStyle} value={address} onChange={e => setAddress(e.target.value)} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Link Google Maps</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1.5px solid rgba(0,0,0,0.1)", borderRadius: 8, padding: "0 12px" }}>
              <MapPin size={14} style={{ color: "#6B7D8F", flexShrink: 0 }} />
              <input style={{ ...inputStyle, border: "none", padding: "8px 0" }} value={mapsUrl} onChange={e => setMapsUrl(e.target.value)} placeholder="https://maps.app.goo.gl/..." />
            </div>
          </div>
        </div>
      </div>

      {/* Pengiriman */}
      <div style={sectionStyle}>
        <p style={sectionTitle}>Metode Pengiriman</p>
        <p style={sectionDesc}>Aktifkan metode pengiriman yang tersedia dan atur biayanya. Ongkir diterima langsung oleh toko.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {SHIPPING_METHOD_KEYS.map(key => {
            const meta = SHIPPING_METHOD_LABELS[key];
            const method = shipConfig[key];
            const hasFee = key !== "PICKUP" && key !== "DIGITAL";
            return (
              <div
                key={key}
                style={{
                  padding: 14, borderRadius: 10,
                  border: method.enabled ? "1.5px solid #006D77" : "1.5px solid rgba(0,0,0,0.08)",
                  background: method.enabled ? "#006D7708" : "#FAFAFA",
                }}
              >
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={method.enabled}
                    onChange={e => updateShipMethod(key, { enabled: e.target.checked })}
                    style={{ width: 18, height: 18, accentColor: "#006D77", flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1F2937" }}>
                      {meta.icon} {meta.label}
                    </span>
                    <p style={{ fontSize: 11, color: "#6B7D8F", margin: "2px 0 0" }}>{meta.description}</p>
                  </div>
                </label>

                {method.enabled && hasFee && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12, paddingLeft: 28 }}>
                    <div>
                      <label style={labelStyle}>Biaya Ongkir</label>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#6B7D8F" }}>Rp</span>
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          style={{ ...inputStyle, paddingLeft: 36, margin: 0 }}
                          value={method.fee || ""}
                          onChange={e => updateShipMethod(key, { fee: parseInt(e.target.value) || 0 })}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Gratis Ongkir Min. Belanja</label>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#6B7D8F" }}>Rp</span>
                        <input
                          type="number"
                          min={0}
                          step={10000}
                          style={{ ...inputStyle, paddingLeft: 36, margin: 0 }}
                          value={method.freeMinimum || ""}
                          onChange={e => updateShipMethod(key, { freeMinimum: parseInt(e.target.value) || 0 })}
                          placeholder="0 (tidak ada)"
                        />
                      </div>
                      <p style={{ fontSize: 10, color: "#9CA3AF", marginTop: 3 }}>0 = tidak ada promo gratis ongkir</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

      {/* Jam Operasional */}
      <div style={sectionStyle}>
        <p style={sectionTitle}>Jam Operasional</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={labelStyle}>Jam Buka</label>
            <input style={inputStyle} value={operatingHours} onChange={e => setOperatingHours(e.target.value)} placeholder="cth: Senin–Sabtu, 08:00–17:00" />
          </div>
          <div>
            <label style={labelStyle}>Waktu Balas Pesan</label>
            <input style={inputStyle} value={replyTime} onChange={e => setReplyTime(e.target.value)} placeholder="cth: Dalam 1 jam" />
          </div>
        </div>
      </div>

      {/* Rekening */}
      <div style={sectionStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ ...sectionTitle, marginBottom: 2 }}>Informasi Rekening</p>
            <p style={{ fontSize: 12, color: "#6B7D8F", margin: 0 }}>Untuk pencairan dana dari penjualan</p>
          </div>
          {bankStep === "idle" && (
            <button
              type="button"
              onClick={handleRequestBankChange}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px",
                borderRadius: 8, background: "white", color: "#006D77",
                border: "1.5px solid #006D77", cursor: "pointer",
                fontSize: 12, fontWeight: 600,
              }}
            >
              <Pencil size={13} />
              Ubah Rekening
            </button>
          )}
        </div>

        {bankStep === "idle" && (
          /* Read-only view */
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Nama Bank</label>
              <div style={{ ...inputStyle, background: "#F3F4F6", color: "#374151", display: "flex", alignItems: "center", gap: 6 }}>
                <Lock size={12} style={{ color: "#9CA3AF", flexShrink: 0 }} />
                {bankName || <span style={{ color: "#9CA3AF" }}>Belum diatur</span>}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Nomor Rekening</label>
              <div style={{ ...inputStyle, background: "#F3F4F6", color: "#374151", display: "flex", alignItems: "center", gap: 6 }}>
                <Lock size={12} style={{ color: "#9CA3AF", flexShrink: 0 }} />
                {bankAccountNumber || <span style={{ color: "#9CA3AF" }}>Belum diatur</span>}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Nama Pemilik Rekening</label>
              <div style={{ ...inputStyle, background: "#F3F4F6", color: "#374151", display: "flex", alignItems: "center", gap: 6 }}>
                <Lock size={12} style={{ color: "#9CA3AF", flexShrink: 0 }} />
                {bankAccountName || <span style={{ color: "#9CA3AF" }}>Belum diatur</span>}
              </div>
            </div>
          </div>
        )}

        {bankStep === "confirm-phone" && (
          /* Step 1: Masukkan nomor HP untuk verifikasi */
          <div>
            <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#1E40AF" }}>
              Untuk keamanan, masukkan nomor HP yang terdaftar di akun Anda. Kode verifikasi akan dikirim via WhatsApp.
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Nomor HP Pemilik Akun</label>
              <PhoneInput
                value={bankPhoneInput}
                onChange={setBankPhoneInput}
                autoFocus
                disabled={verifyingBank}
                onKeyDown={e => e.key === "Enter" && handleSendBankOtp()}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={handleSendBankOtp}
                disabled={verifyingBank || !bankPhoneInput.trim()}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px",
                  borderRadius: 8, background: verifyingBank || !bankPhoneInput.trim() ? "#ccc" : "#006D77", color: "white",
                  border: "none", cursor: verifyingBank || !bankPhoneInput.trim() ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600,
                }}
              >
                {verifyingBank ? <Loader2 size={14} className="animate-spin" /> : null}
                Kirim Kode Verifikasi
              </button>
              <button
                type="button"
                onClick={handleCancelBankEdit}
                style={{
                  padding: "8px 16px", borderRadius: 8, background: "white",
                  border: "1.5px solid rgba(0,0,0,0.15)", cursor: "pointer", fontSize: 13, color: "#6B7D8F",
                }}
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {bankStep === "entering-otp" && (
          /* Step 2: Masukkan OTP + edit rekening */
          <div>
            <div style={{ background: "#FEF3C7", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#92400E" }}>
              Kode verifikasi telah dikirim ke WhatsApp <strong>+62 {bankPhoneInput}</strong>. Masukkan kode tersebut untuk mengubah informasi rekening.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Kode Verifikasi</label>
                <input
                  style={{ ...inputStyle, maxWidth: 200, letterSpacing: 4, fontWeight: 700, textAlign: "center" }}
                  value={verificationCode}
                  onChange={e => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Nama Bank</label>
                <input
                  style={inputStyle}
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  placeholder="Ketik untuk mencari bank..."
                  list="bank-list-settings"
                  autoComplete="off"
                />
                <datalist id="bank-list-settings">
                  {BANK_LIST.map(bank => <option key={bank} value={bank} />)}
                </datalist>
              </div>
              <div>
                <label style={labelStyle}>Nomor Rekening</label>
                <input style={inputStyle} value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Nama Pemilik Rekening</label>
                <input style={inputStyle} value={bankAccountName} onChange={e => setBankAccountName(e.target.value)} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button
                type="button"
                onClick={handleSaveBank}
                disabled={savingBank}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px",
                  borderRadius: 8, background: savingBank ? "#ccc" : "#006D77", color: "white",
                  border: "none", cursor: savingBank ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600,
                }}
              >
                {savingBank ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Simpan Rekening
              </button>
              <button
                type="button"
                onClick={handleCancelBankEdit}
                style={{
                  padding: "8px 16px", borderRadius: 8, background: "white",
                  border: "1.5px solid rgba(0,0,0,0.15)", cursor: "pointer", fontSize: 13, color: "#6B7D8F",
                }}
              >
                Batal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
