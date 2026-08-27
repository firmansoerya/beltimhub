// ─── Kategori UMKM ───
export const UMKM_CATEGORIES = [
  "Kuliner",
  "Fashion",
  "Kerajinan",
  "Pertanian",
  "Perikanan",
  "Kecantikan & Kesehatan",
  "Otomotif",
  "Elektronik",
  "Percetakan & ATK",
  "Fotografi & Videografi",
  "Desain & Kreatif",
  "Pendidikan & Kursus",
  "Travel & Wisata",
  "Properti",
  "Jasa Konstruksi",
  "Jasa Kebersihan",
  "Jasa Pengiriman",
  "Jasa Digital & IT",
  "Event Organizer",
  "Konten Kreator",
  "Teknologi",
  "Jasa Lainnya",
  "Lainnya",
];

// ─── Kecamatan Belitung Timur ───
export const KECAMATAN_BELTIM = [
  "Manggar",
  "Gantung",
  "Dendang",
  "Kelapa Kampit",
  "Damar",
  "Simpang Pesak",
  "Simpang Renggiang",
];

// ─── Kategori Produk ───
export const PRODUCT_CATEGORIES = [
  "Makanan & Minuman",
  "Fashion & Aksesoris",
  "Kerajinan & Handmade",
  "Pertanian & Perkebunan",
  "Perikanan & Kelautan",
  "Kecantikan & Perawatan",
  "Kesehatan",
  "Elektronik & Gadget",
  "Perlengkapan Rumah",
  "Perlengkapan Bayi & Anak",
  "Olahraga & Outdoor",
  "Otomotif & Sparepart",
  "ATK & Perlengkapan Kantor",
  "Buku & Edukasi",
  "Seni & Koleksi",
  "Produk Digital",
  "Jasa & Layanan",
  "Voucher & Tiket",
  "Lainnya",
];

// ─── Metode Pengiriman (legacy, untuk backward compat) ───
export const SHIPPING_OPTIONS = [
  "Ambil di Toko",
  "Kurir Toko (COD)",
  "JNE",
  "J&T Express",
  "SiCepat",
  "Pos Indonesia",
  "Anteraja",
  "Ninja Express",
  "Grab Express",
  "Gojek (GoSend)",
  "Google Drive / Cloud",
  "Email / WhatsApp",
  "Link Download",
];

// ─── Metode Pengiriman Marketplace ───
export type ShippingMethodKey = "PICKUP" | "LOCAL_COURIER" | "CROSS_DISTRICT" | "INTER_ISLAND" | "DIGITAL";

export interface ShippingMethodOption {
  enabled: boolean;
  fee: number;        // 0 untuk PICKUP & DIGITAL
  freeMinimum: number; // min belanja untuk gratis ongkir, 0 = tidak ada
}

export type ShippingConfig = Record<ShippingMethodKey, ShippingMethodOption>;

export const SHIPPING_METHOD_LABELS: Record<ShippingMethodKey, { label: string; description: string; icon: string }> = {
  PICKUP: {
    label: "Ambil di Toko",
    description: "Pembeli datang langsung ke toko",
    icon: "🏪",
  },
  LOCAL_COURIER: {
    label: "Kurir Toko",
    description: "Diantar langsung oleh kurir dari toko",
    icon: "🛵",
  },
  CROSS_DISTRICT: {
    label: "Lintas Kabupaten",
    description: "Pengiriman dalam Kepulauan Bangka Belitung",
    icon: "🚚",
  },
  INTER_ISLAND: {
    label: "Luar Pulau",
    description: "Pengiriman ke luar Bangka Belitung via ekspedisi",
    icon: "📦",
  },
  DIGITAL: {
    label: "Produk Digital",
    description: "Dikirim via link download, email, atau chat",
    icon: "💾",
  },
};

export const SHIPPING_METHOD_KEYS: ShippingMethodKey[] = [
  "PICKUP", "LOCAL_COURIER", "CROSS_DISTRICT", "INTER_ISLAND", "DIGITAL",
];

export const DEFAULT_SHIPPING_CONFIG: ShippingConfig = {
  PICKUP: { enabled: false, fee: 0, freeMinimum: 0 },
  LOCAL_COURIER: { enabled: false, fee: 0, freeMinimum: 0 },
  CROSS_DISTRICT: { enabled: false, fee: 0, freeMinimum: 0 },
  INTER_ISLAND: { enabled: false, fee: 0, freeMinimum: 0 },
  DIGITAL: { enabled: false, fee: 0, freeMinimum: 0 },
};

/** Parse shippingConfig JSON dari database, merge dengan default */
export function parseShippingConfig(raw: unknown): ShippingConfig {
  const config = { ...DEFAULT_SHIPPING_CONFIG };
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const key of SHIPPING_METHOD_KEYS) {
      const val = (raw as Record<string, unknown>)[key];
      if (val && typeof val === "object") {
        const v = val as Record<string, unknown>;
        config[key] = {
          enabled: typeof v.enabled === "boolean" ? v.enabled : false,
          fee: typeof v.fee === "number" ? v.fee : 0,
          freeMinimum: typeof v.freeMinimum === "number" ? v.freeMinimum : 0,
        };
      }
    }
  }
  return config;
}
