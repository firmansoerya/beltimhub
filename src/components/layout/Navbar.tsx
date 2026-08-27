"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu, Calendar, ShoppingCart, Megaphone, Briefcase, Store,
  TreePalm, Newspaper, Info, Globe, Sparkles, MessageSquare,
  Heart, Star, Compass, Tag, FileText, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import { NavbarCart } from "./NavbarCart";
import { NotificationBell } from "./NotificationBell";
import { DEFAULT_FEATURES, type FeatureItem } from "@/types/site-settings";

const ICON_MAP: Record<string, React.ElementType> = {
  Calendar,
  ShoppingCart,
  Megaphone,
  Briefcase,
  Store,
  TreePalm,
  Newspaper,
  Info,
  Globe,
  Sparkles,
  MessageSquare,
  Heart,
  Star,
  Compass,
  Tag,
  FileText,
};

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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ClerkAuth = require("./NavbarAuth").NavbarAuth;
  return <ClerkAuth />;
}

export function Navbar({ features }: { features?: FeatureItem[] }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeFeatures = (features && features.length > 0 ? features : DEFAULT_FEATURES).filter(f => f.enabled);

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-colors ${
        isHome
          ? "bg-teal-700/95 backdrop-blur supports-[backdrop-filter]:bg-teal-700/80 border-teal-600/30"
          : "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      }`}
    >
      <div className="flex h-14 w-full items-center px-4 md:px-6">
        {/* Mobile hamburger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            className={`md:hidden mr-2 p-1.5 rounded-md transition-colors ${
              isHome ? "text-white/80 hover:text-white hover:bg-white/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
            aria-label="Menu navigasi"
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <Link href="/" onClick={() => setMobileOpen(false)}>
                <span className="font-bold text-lg">Beltim<span className="text-primary">Hub</span></span>
              </Link>
            </div>
            <nav className="flex flex-col py-2 overflow-y-auto max-h-[calc(100vh-60px)]">
              {activeFeatures.map((item) => {
                const IconComp = ICON_MAP[item.iconName] || Sparkles;
                const isExternal = item.href.startsWith("http");
                const active = !isExternal && pathname.startsWith(item.href);

                if (isExternal) {
                  return (
                    <a
                      key={item.id}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <IconComp className="h-4 w-4" />
                        {item.label}
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                    </a>
                  );
                }

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                      active
                        ? "text-primary bg-primary/8 border-r-2 border-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    <IconComp className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className={`font-bold text-xl ${isHome ? "text-white" : ""}`}>
            Beltim<span className={isHome ? "text-amber-300" : "text-primary"}>Hub</span>
          </span>
        </Link>

        {/* Desktop nav links — center */}
        <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2 overflow-x-auto max-w-[55vw] scrollbar-none py-1">
          {activeFeatures.map((item) => {
            const isExternal = item.href.startsWith("http");
            const active = !isExternal && pathname.startsWith(item.href);

            if (isExternal) {
              return (
                <a
                  key={item.id}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors inline-flex items-center gap-1 ${
                    isHome
                      ? "text-white/70 hover:text-white hover:bg-white/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  {item.label}
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              );
            }

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0 ${
                  isHome
                    ? active
                      ? "text-white bg-white/15"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                    : active
                      ? "text-primary bg-primary/8"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <NotificationBell isHome={isHome} />
          {(pathname.startsWith("/pasar-lokal") || pathname.startsWith("/umkm")) && <NavbarCart />}
          <AuthButtons />
        </div>
      </div>
    </header>
  );
}
