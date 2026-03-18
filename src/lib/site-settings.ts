import { prisma } from "@/lib/prisma";

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

const KEYS = Object.keys(SITE_SETTINGS_DEFAULTS) as (keyof SiteSettings)[];

export async function getSiteSettings(): Promise<SiteSettings> {
  const rows = await prisma.siteSetting.findMany({ where: { key: { in: KEYS } } });
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  const result = {} as SiteSettings;
  for (const k of KEYS) {
    result[k] = (map[k] ?? SITE_SETTINGS_DEFAULTS[k]) as string;
  }
  return result;
}
