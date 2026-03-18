import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { NewPostHint } from "@/components/NewPostHint";
import { getSiteSettings } from "@/lib/site-settings";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSiteSettings().catch(() => null);

  return (
    <LanguageProvider>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <NewPostHint />
        <main className="flex-1">{children}</main>
        <Footer
          socialFacebook={settings?.socialFacebook ? `https://facebook.com/${settings.socialFacebook}` : undefined}
          socialInstagram={settings?.socialInstagram ? `https://instagram.com/${settings.socialInstagram}` : undefined}
          socialYoutube={settings?.socialYoutube ? `https://youtube.com/@${settings.socialYoutube}` : undefined}
          socialTiktok={settings?.socialTiktok ? `https://tiktok.com/@${settings.socialTiktok}` : undefined}
        />
      </div>
    </LanguageProvider>
  );
}
