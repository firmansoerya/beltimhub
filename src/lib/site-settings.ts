import { prisma } from "@/lib/prisma";
import {
  type FeatureItem,
  DEFAULT_FEATURES,
  type SiteSettings,
  SITE_SETTINGS_DEFAULTS,
} from "@/types/site-settings";

export type { FeatureItem, SiteSettings };
export { DEFAULT_FEATURES, SITE_SETTINGS_DEFAULTS };

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

export async function getFeaturesConfig(): Promise<FeatureItem[]> {
  try {
    const row = await prisma.siteSetting.findUnique({
      where: { key: "features_config" },
    });

    if (!row || !row.value) {
      return DEFAULT_FEATURES;
    }

    const saved = JSON.parse(row.value) as FeatureItem[];
    if (!Array.isArray(saved)) return DEFAULT_FEATURES;

    // Gabungkan dengan default untuk memastikan fitur bawaan selalu ada
    const result: FeatureItem[] = [];
    const savedMap = new Map(saved.map(f => [f.id, f]));

    for (const def of DEFAULT_FEATURES) {
      const existing = savedMap.get(def.id);
      if (existing) {
        result.push({
          ...def,
          label: existing.label || def.label,
          href: existing.href || def.href,
          iconName: existing.iconName || def.iconName,
          enabled: typeof existing.enabled === "boolean" ? existing.enabled : def.enabled,
        });
        savedMap.delete(def.id);
      } else {
        result.push(def);
      }
    }

    // Tambahkan custom features yang dibuat admin
    for (const custom of savedMap.values()) {
      result.push({
        ...custom,
        isCustom: true,
      });
    }

    return result;
  } catch (error) {
    console.error("Error loading features_config:", error);
    return DEFAULT_FEATURES;
  }
}

export async function getActiveFeatures(): Promise<FeatureItem[]> {
  const all = await getFeaturesConfig();
  return all.filter(f => f.enabled);
}

export async function isFeatureEnabled(id: string): Promise<boolean> {
  const all = await getFeaturesConfig();
  const found = all.find(f => f.id === id);
  return found ? found.enabled : true;
}
