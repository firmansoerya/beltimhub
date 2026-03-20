"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const NAV_LINKS = [
  { href: "/event", label: "Event" },
  { href: "/pasar-lokal", label: "Pasar Lokal" },
  { href: "/fjb", label: "FJB" },
  { href: "/loker", label: "Loker" },
  { href: "/umkm", label: "UMKM" },
  { href: "/wisata", label: "Wisata" },
  { href: "/berita", label: "Berita" },
  { href: "/info", label: "Info" },
];

const hasClerkKeys =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("xxxxx");

function AuthButtons() {
  const { t } = useLanguage();
  if (!hasClerkKeys) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/sign-in">
          <Button variant="ghost" size="sm">{t.nav.signIn}</Button>
        </Link>
        <Link href="/sign-up">
          <Button size="sm">{t.nav.signUp}</Button>
        </Link>
      </div>
    );
  }
  const ClerkAuth = require("./NavbarAuth").NavbarAuth;
  return <ClerkAuth />;
}

function LanguageToggle() {
  const { locale, setLocale } = useLanguage();
  return (
    <button
      onClick={() => setLocale(locale === "id" ? "en" : "id")}
      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
      title={locale === "id" ? "Switch to English" : "Ganti ke Indonesia"}
    >
      <span className="text-base leading-none">{locale === "id" ? "🇮🇩" : "🇬🇧"}</span>
      <span>{locale === "id" ? "ID" : "EN"}</span>
    </button>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 w-full items-center px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="font-bold text-xl">Beltim<span className="text-primary">Hub</span></span>
        </Link>

        {/* Nav links — tengah, hanya di luar homepage */}
        {!isHome && (
          <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {NAV_LINKS.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "text-primary bg-primary/8"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Auth + Language */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <LanguageToggle />
          <AuthButtons />
        </div>
      </div>
    </header>
  );
}
