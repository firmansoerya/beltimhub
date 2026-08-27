"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MapPin, Plus, Pencil, Trash2, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";

interface Address {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  address: string;
  district: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  isDefault: boolean;
}

interface FormData {
  label: string;
  recipient: string;
  phone: string;
  address: string;
  district: string;
  city: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
}

const emptyForm: FormData = {
  label: "", recipient: "", phone: "", address: "",
  district: "", city: "", province: "", postalCode: "", isDefault: false,
};

export default function AlamatPage() {
  const confirm = useConfirm();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  async function loadAddresses() {
    try {
      const res = await fetch("/api/addresses");
      if (res.ok) setAddresses(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => { loadAddresses(); }, []);

  function openAdd() {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(addr: Address) {
    setEditId(addr.id);
    setForm({
      label: addr.label,
      recipient: addr.recipient,
      phone: addr.phone,
      address: addr.address,
      district: addr.district ?? "",
      city: addr.city ?? "",
      province: addr.province ?? "",
      postalCode: addr.postalCode ?? "",
      isDefault: addr.isDefault,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.label.trim() || !form.recipient.trim() || !form.phone.trim() || !form.address.trim()) {
      toast.error("Isi semua field wajib");
      return;
    }
    setSaving(true);
    try {
      const url = editId ? `/api/addresses/${editId}` : "/api/addresses";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          district: form.district || undefined,
          city: form.city || undefined,
          province: form.province || undefined,
          postalCode: form.postalCode || undefined,
        }),
      });
      if (!res.ok) { toast.error("Gagal menyimpan"); return; }
      toast.success(editId ? "Alamat diperbarui" : "Alamat ditambahkan");
      setDialogOpen(false);
      loadAddresses();
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ description: "Hapus alamat ini?", variant: "destructive", confirmLabel: "Hapus" });
    if (!ok) return;
    try {
      const res = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Alamat dihapus");
        loadAddresses();
      }
    } catch { toast.error("Gagal menghapus"); }
  }

  async function setDefault(id: string) {
    try {
      const res = await fetch(`/api/addresses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (res.ok) {
        toast.success("Alamat utama diperbarui");
        loadAddresses();
      }
    } catch { toast.error("Gagal mengubah"); }
  }

  function updateField(field: keyof FormData, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Alamat Pengiriman</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Kelola alamat untuk checkout lebih cepat</p>
        </div>
        <Button onClick={openAdd} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Tambah Alamat
        </Button>
      </div>

      {addresses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Belum ada alamat tersimpan.</p>
            <Button onClick={openAdd} variant="outline" size="sm" className="mt-4 gap-1.5">
              <Plus className="h-4 w-4" />
              Tambah Alamat Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <Card key={addr.id} className={addr.isDefault ? "border-primary" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{addr.label}</span>
                      {addr.isDefault && (
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Utama</span>
                      )}
                    </div>
                    <p className="text-sm font-medium">{addr.recipient}</p>
                    <p className="text-xs text-muted-foreground">{addr.phone}</p>
                    <p className="text-xs text-muted-foreground mt-1">{addr.address}</p>
                    {(addr.district || addr.city || addr.province) && (
                      <p className="text-xs text-muted-foreground">
                        {[addr.district, addr.city, addr.province, addr.postalCode].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!addr.isDefault && (
                      <button
                        onClick={() => setDefault(addr.id)}
                        className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                        title="Jadikan utama"
                      >
                        <Star className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(addr)}
                      className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(addr.id)}
                      className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Alamat" : "Tambah Alamat"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Label Alamat *</Label>
              <Input
                placeholder='contoh: "Rumah", "Kantor"'
                value={form.label}
                onChange={e => updateField("label", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nama Penerima *</Label>
                <Input
                  placeholder="Nama lengkap"
                  value={form.recipient}
                  onChange={e => updateField("recipient", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">No. HP Penerima *</Label>
                <Input
                  placeholder="08xxxxxxxxx"
                  value={form.phone}
                  onChange={e => updateField("phone", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Alamat Lengkap *</Label>
              <Textarea
                placeholder="Jalan, RT/RW, Kelurahan, No. Rumah..."
                value={form.address}
                onChange={e => updateField("address", e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Kecamatan</Label>
                <Input
                  placeholder="Kecamatan"
                  value={form.district}
                  onChange={e => updateField("district", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Kota/Kabupaten</Label>
                <Input
                  placeholder="Kota/Kabupaten"
                  value={form.city}
                  onChange={e => updateField("city", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Provinsi</Label>
                <Input
                  placeholder="Provinsi"
                  value={form.province}
                  onChange={e => updateField("province", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Kode Pos</Label>
                <Input
                  placeholder="Kode pos"
                  value={form.postalCode}
                  onChange={e => updateField("postalCode", e.target.value)}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={e => updateField("isDefault", e.target.checked)}
                className="rounded"
              />
              <span className="text-xs text-muted-foreground">Jadikan alamat utama</span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
