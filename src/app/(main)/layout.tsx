import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { NewPostHint } from "@/components/NewPostHint";
import { getSiteSettings, getFeaturesConfig } from "@/lib/site-settings";
import { CartProvider } from "@/lib/cart";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, features] = await Promise.all([
    getSiteSettings().catch(() => null),
    getFeaturesConfig().catch(() => []),
  ]);

  return (
    <LanguageProvider>
      <CartProvider>
      <div className="flex min-h-screen flex-col">
        <Navbar features={features} />
        <NewPostHint />
        <main className="flex-1">{children}</main>
        <Footer
          activeFeatures={features}
          socialFacebook={settings?.socialFacebook ? `https://facebook.com/${settings.socialFacebook}` : undefined}
          socialInstagram={settings?.socialInstagram ? `https://instagram.com/${settings.socialInstagram}` : undefined}
          socialYoutube={settings?.socialYoutube ? `https://youtube.com/@${settings.socialYoutube}` : undefined}
          socialTiktok={settings?.socialTiktok ? `https://tiktok.com/@${settings.socialTiktok}` : undefined}
        />
      </div>
      </CartProvider>
    </LanguageProvider>
  );
}
