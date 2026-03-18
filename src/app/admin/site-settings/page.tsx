import { getSiteSettings } from "@/lib/site-settings";
import { SiteSettingsForm } from "./SiteSettingsForm";

export default async function SiteSettingsPage() {
  const settings = await getSiteSettings();

  return <SiteSettingsForm initial={settings} />;
}
