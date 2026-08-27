export interface FeatureItem {
  id: string; // e.g. "event", "pasar-lokal", "fjb", "loker", "umkm", "wisata", "berita", "info"
  label: string;
  href: string;
  iconName: string; // e.g. "Calendar", "ShoppingCart", "Megaphone", "Briefcase", "Store", "TreePalm", "Newspaper", "Info", "Globe", "Sparkles", "Compass"
  description?: string;
  enabled: boolean;
  isCustom?: boolean;
}

export const DEFAULT_FEATURES: FeatureItem[] = [
  {
    id: "event",
    label: "Event",
    href: "/event",
    iconName: "Calendar",
    description: "Kalender event daerah, pembelian tiket digital, dan check-in QR code.",
    enabled: true,
  },
  {
    id: "pasar-lokal",
    label: "Pasar Lokal",
    href: "/pasar-lokal",
    iconName: "ShoppingCart",
    description: "Marketplace produk lokal Belitung Timur dengan pembayaran online & checkout multi-toko.",
    enabled: true,
  },
  {
    id: "fjb",
    label: "FJB",
    href: "/fjb",
    iconName: "Megaphone",
    description: "Forum Jual Beli online antar warga Beltim (barang bekas, properti, kendaraan, dll).",
    enabled: true,
  },
  {
    id: "loker",
    label: "Loker",
    href: "/loker",
    iconName: "Briefcase",
    description: "Portal lowongan kerja dan peluang karir di Belitung Timur.",
    enabled: true,
  },
  {
    id: "umkm",
    label: "UMKM",
    href: "/umkm",
    iconName: "Store",
    description: "Direktori toko, warung, dan usaha lokal Belitung Timur terintegrasi Google Maps.",
    enabled: true,
  },
  {
    id: "wisata",
    label: "Wisata",
    href: "/wisata",
    iconName: "TreePalm",
    description: "Katalog destinasi wisata, pantai, geopark, dan kuliner khas Belitung Timur.",
    enabled: true,
  },
  {
    id: "berita",
    label: "Berita",
    href: "/berita",
    iconName: "Newspaper",
    description: "Agregator warta dan berita terkini seputar Belitung Timur.",
    enabled: true,
  },
  {
    id: "info",
    label: "Info",
    href: "/info",
    iconName: "Info",
    description: "Informasi kontak penting, nomor darurat, dan layanan publik Kabupaten Beltim.",
    enabled: true,
  },
];

export interface SiteSettings {
  // Brand
  brandName: string;
  brandWebsite: string;
  brandTagline: string;
  supportEmail: string;
  supportWhatsapp: string;
  // Social media
  socialFacebook: string;
  socialInstagram: string;
  socialYoutube: string;
  socialTiktok: string;
  // Page content
  pageTentang: string;
  pageSyarat: string;
  pagePrivasi: string;
  pageRefund: string;
}

export const SITE_SETTINGS_DEFAULTS: SiteSettings = {
  brandName: "BELTIMHUB",
  brandWebsite: "beltim.id",
  brandTagline: "Hub Digital Belitung Timur",
  supportEmail: "support@beltim.id",
  supportWhatsapp: "",
  socialFacebook: "",
  socialInstagram: "",
  socialYoutube: "",
  socialTiktok: "",
  pageTentang: "",
  pageSyarat: "",
  pagePrivasi: "",
  pageRefund: "",
};
