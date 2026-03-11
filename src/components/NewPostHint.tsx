"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { X, LayoutDashboard } from "lucide-react";

const STORAGE_KEY = "dashboard_hint_seen";

function HintInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isNew = searchParams.get("new") === "1";
    const alreadySeen = localStorage.getItem(STORAGE_KEY) === "1";

    if (isNew && !alreadySeen) {
      setShow(true);
      // Hapus ?new=1 dari URL tanpa reload
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, router, pathname]);

  function dismiss() {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, "1");
  }

  if (!show) return null;

  return (
    <>
      {/* Backdrop transparan untuk dismiss saat klik di luar */}
      <div className="fixed inset-0 z-40" onClick={dismiss} />

      {/* Tooltip */}
      <div className="fixed top-16 right-4 z-50 w-72 bg-primary text-primary-foreground rounded-xl shadow-2xl p-4 animate-in slide-in-from-top-3 duration-300">
        {/* Panah ke atas mengarah ke tombol Dashboard */}
        <div className="absolute -top-2 right-20 w-4 h-4 bg-primary rotate-45 rounded-sm" />

        <div className="flex items-start gap-3">
          <div className="shrink-0 p-1.5 rounded-lg bg-primary-foreground/20 mt-0.5">
            <LayoutDashboard className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Postingan berhasil dibuat!</p>
            <p className="text-xs mt-1 opacity-90 leading-relaxed">
              Gunakan tombol <strong>Dashboard</strong> di atas untuk mengelola profil dan semua postingan Anda kapan saja.
            </p>
          </div>
          <button
            onClick={dismiss}
            className="shrink-0 opacity-70 hover:opacity-100 transition-opacity mt-0.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <button
          onClick={dismiss}
          className="mt-3 w-full text-xs font-medium py-1.5 rounded-lg bg-primary-foreground/20 hover:bg-primary-foreground/30 transition-colors"
        >
          Mengerti
        </button>
      </div>
    </>
  );
}

export function NewPostHint() {
  return (
    <Suspense>
      <HintInner />
    </Suspense>
  );
}
