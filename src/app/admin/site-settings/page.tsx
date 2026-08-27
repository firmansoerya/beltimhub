import { Suspense } from "react";
import { getSiteSettings, getFeaturesConfig } from "@/lib/site-settings";
import { SiteSettingsForm } from "./SiteSettingsForm";

export default async function SiteSettingsPage() {
  const [settings, features] = await Promise.all([
    getSiteSettings(),
    getFeaturesConfig(),
  ]);

  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground animate-pulse">Memuat pengaturan...</div>}>
      <SiteSettingsForm initial={settings} initialFeatures={features} />
    </Suspense>
  );
}
