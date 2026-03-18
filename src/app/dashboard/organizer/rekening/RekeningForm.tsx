"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard } from "lucide-react";

const BANKS = [
  { code: "BCA", name: "Bank Central Asia (BCA)" },
  { code: "BNI", name: "Bank Negara Indonesia (BNI)" },
  { code: "BRI", name: "Bank Rakyat Indonesia (BRI)" },
  { code: "MANDIRI", name: "Bank Mandiri" },
  { code: "PERMATA", name: "Bank Permata" },
  { code: "BSI", name: "Bank Syariah Indonesia (BSI)" },
  { code: "CIMB", name: "CIMB Niaga" },
  { code: "DANAMON", name: "Bank Danamon" },
  { code: "BTN", name: "Bank Tabungan Negara (BTN)" },
  { code: "MEGA", name: "Bank Mega" },
  { code: "BJB", name: "Bank BJB" },
  { code: "OTHER", name: "Bank Lainnya" },
];

interface Props {
  existing: {
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
  } | null;
}

export function RekeningForm({ existing }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    bankCode: existing?.bankCode ?? "",
    bankName: existing?.bankName ?? "",
    accountNumber: existing?.accountNumber ?? "",
    accountName: existing?.accountName ?? "",
  });

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));
  }

  function handleBankChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const code = e.target.value;
    const bank = BANKS.find(b => b.code === code);
    setForm(prev => ({ ...prev, bankCode: code, bankName: bank?.name ?? code }));
  }

  async function handleSave() {
    if (!form.bankCode || !form.accountNumber || !form.accountName) {
      toast.error("Isi semua field rekening");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/organizer/rekening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success("Rekening disimpan");
      router.refresh();
    } catch {
      toast.error("Gagal menyimpan rekening");
    } finally {
      setLoading(false);
    }
  }

  if (!existing) {
    return (
      <div>
        <div className="border-2 border-dashed rounded-2xl py-16 text-center text-muted-foreground mb-8">
          <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Silakan masukkan rekening kamu terlebih dahulu</p>
          <p className="text-xs mt-1">untuk dapat memproses penarikan penjualan.</p>
        </div>
        <RekeningFormFields form={form} set={set} handleBankChange={handleBankChange} loading={loading} handleSave={handleSave} />
      </div>
    );
  }

  return (
    <RekeningFormFields form={form} set={set} handleBankChange={handleBankChange} loading={loading} handleSave={handleSave} />
  );
}

function RekeningFormFields({
  form, set, handleBankChange, loading, handleSave,
}: {
  form: { bankCode: string; bankName: string; accountNumber: string; accountName: string };
  set: (key: "bankCode" | "bankName" | "accountNumber" | "accountName") => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleBankChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  loading: boolean;
  handleSave: () => void;
}) {
  return (
    <div className="space-y-5 bg-background border rounded-xl p-6 pb-20">
      <div>
        <label className="block text-sm font-medium mb-1">Bank <span className="text-destructive">*</span></label>
        <select
          className="w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          value={form.bankCode}
          onChange={handleBankChange}
        >
          <option value="">Pilih bank...</option>
          {BANKS.map(b => (
            <option key={b.code} value={b.code}>{b.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Nomor Rekening <span className="text-destructive">*</span></label>
        <input
          className="w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="Contoh: 1234567890"
          value={form.accountNumber}
          onChange={set("accountNumber")}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Nama Pemilik Rekening <span className="text-destructive">*</span></label>
        <input
          className="w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="Sesuai yang tertera di buku rekening"
          value={form.accountName}
          onChange={set("accountName")}
        />
      </div>

      <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-4 py-3">
        Rekening ini digunakan untuk proses payout hasil penjualan tiket setelah event selesai.
      </p>

      <div className="fixed bottom-0 left-0 md:left-56 right-0 z-40 flex items-center gap-6 px-8 py-4 bg-background border-t shadow-md">
        <Button onClick={handleSave} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {loading ? "Menyimpan..." : "Masukkan Rekening"}
        </Button>
      </div>
    </div>
  );
}
