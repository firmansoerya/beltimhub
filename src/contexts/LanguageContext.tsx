"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { type Locale, translations } from "@/lib/i18n";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (typeof translations)["id"];
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: "id",
  setLocale: () => {},
  t: translations["id"],
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("id");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("locale") as Locale | null;
    if (saved === "id" || saved === "en") setLocaleState(saved);
    setMounted(true);
  }, []);

  function setLocale(next: Locale) {
    setLocaleState(next);
    localStorage.setItem("locale", next);
  }

  // Sebelum mount, selalu gunakan "id" agar server & client render sama
  const activeLocale = mounted ? locale : "id";

  return (
    <LanguageContext.Provider value={{ locale: activeLocale, setLocale, t: translations[activeLocale] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
