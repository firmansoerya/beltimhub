"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type FieldType = "text" | "number" | "textarea" | "select" | "checkbox" | "file";

export interface CustomField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: string[]; // untuk type "select"
  acceptedFileTypes?: string; // untuk type "file", e.g. "image/*,.pdf"
}

const FIELD_TYPES: { value: FieldType; label: string; desc: string }[] = [
  { value: "text", label: "Teks Singkat", desc: "Input satu baris" },
  { value: "number", label: "Angka", desc: "Input angka" },
  { value: "textarea", label: "Teks Panjang", desc: "Input multi-baris" },
  { value: "select", label: "Pilihan (Dropdown)", desc: "Peserta memilih dari opsi" },
  { value: "checkbox", label: "Centang (Ya/Tidak)", desc: "Konfirmasi atau persetujuan" },
  { value: "file", label: "Upload File/Foto", desc: "Upload dokumen atau foto (maks 2MB)" },
];

interface Props {
  value: CustomField[];
  onChange: (fields: CustomField[]) => void;
}

function generateId() {
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function CustomFieldBuilder({ value, onChange }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function addField() {
    const newField: CustomField = {
      id: generateId(),
      label: "",
      type: "text",
      required: false,
      placeholder: "",
    };
    const updated = [...value, newField];
    onChange(updated);
    setExpandedId(newField.id);
  }

  function removeField(id: string) {
    onChange(value.filter((f) => f.id !== id));
  }

  function updateField(id: string, patch: Partial<CustomField>) {
    onChange(value.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function updateOption(fieldId: string, index: number, val: string) {
    const field = value.find((f) => f.id === fieldId);
    if (!field) return;
    const options = [...(field.options ?? [])];
    options[index] = val;
    updateField(fieldId, { options });
  }

  function addOption(fieldId: string) {
    const field = value.find((f) => f.id === fieldId);
    if (!field) return;
    updateField(fieldId, { options: [...(field.options ?? []), ""] });
  }

  function removeOption(fieldId: string, index: number) {
    const field = value.find((f) => f.id === fieldId);
    if (!field) return;
    const options = (field.options ?? []).filter((_, i) => i !== index);
    updateField(fieldId, { options });
  }

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
          Belum ada atribut khusus. Klik tombol di bawah untuk menambahkan.
        </p>
      )}

      {value.map((field, idx) => (
        <div key={field.id} className="border rounded-lg overflow-hidden">
          {/* Header row */}
          <div
            className="flex items-center gap-2 px-3 py-2.5 bg-muted/40 cursor-pointer select-none"
            onClick={() => setExpandedId(expandedId === field.id ? null : field.id)}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="flex-1 text-sm font-medium truncate">
              {field.label || <span className="text-muted-foreground">Atribut #{idx + 1}</span>}
            </span>
            <span className="text-xs text-muted-foreground shrink-0">
              {FIELD_TYPES.find((t) => t.value === field.type)?.label ?? field.type}
            </span>
            {field.required && (
              <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded shrink-0">Wajib</span>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeField(field.id); }}
              className="p-1 hover:text-destructive text-muted-foreground transition-colors shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", expandedId === field.id && "rotate-180")} />
          </div>

          {/* Expanded form */}
          {expandedId === field.id && (
            <div className="px-3 py-3 space-y-3 border-t">
              {/* Label */}
              <div>
                <Label className="text-xs">Label / Pertanyaan *</Label>
                <Input
                  className="mt-1 h-8 text-sm"
                  placeholder="Contoh: Ukuran Jersey, Nama Tim, Upload KTP..."
                  value={field.label}
                  onChange={(e) => updateField(field.id, { label: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Tipe */}
                <div>
                  <Label className="text-xs">Tipe Input</Label>
                  <select
                    className="w-full mt-1 h-8 px-2 text-sm rounded-md border border-input bg-background focus:outline-none"
                    value={field.type}
                    onChange={(e) => updateField(field.id, { type: e.target.value as FieldType, options: e.target.value === "select" ? [""] : undefined })}
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Wajib diisi */}
                <div className="flex items-end pb-0.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded"
                      checked={field.required}
                      onChange={(e) => updateField(field.id, { required: e.target.checked })}
                    />
                    <span className="text-sm">Wajib diisi</span>
                  </label>
                </div>
              </div>

              {/* Placeholder (untuk text, number, textarea) */}
              {(field.type === "text" || field.type === "number" || field.type === "textarea") && (
                <div>
                  <Label className="text-xs">Placeholder (opsional)</Label>
                  <Input
                    className="mt-1 h-8 text-sm"
                    placeholder="Teks bantuan di dalam input"
                    value={field.placeholder ?? ""}
                    onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                  />
                </div>
              )}

              {/* Opsi untuk select */}
              {field.type === "select" && (
                <div>
                  <Label className="text-xs">Pilihan *</Label>
                  <div className="mt-1 space-y-1.5">
                    {(field.options ?? []).map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          className="h-8 text-sm flex-1"
                          placeholder={`Opsi ${i + 1}`}
                          value={opt}
                          onChange={(e) => updateOption(field.id, i, e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(field.id, i)}
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addOption(field.id)}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Tambah opsi
                    </button>
                  </div>
                </div>
              )}

              {/* File type hint */}
              {field.type === "file" && (
                <div>
                  <Label className="text-xs">Jenis file diterima</Label>
                  <Input
                    className="mt-1 h-8 text-sm"
                    placeholder="Contoh: image/* atau image/*,.pdf"
                    value={field.acceptedFileTypes ?? "image/*"}
                    onChange={(e) => updateField(field.id, { acceptedFileTypes: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    File akan disimpan sebagai Base64 (maks 2MB)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addField} className="w-full">
        <Plus className="h-4 w-4 mr-1.5" />
        Tambah Atribut Peserta
      </Button>
    </div>
  );
}
