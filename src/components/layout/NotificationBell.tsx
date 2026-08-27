"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Bell, MessageSquare, Package, Ticket, Star, ShoppingBag } from "lucide-react";

interface NotifItem {
  type: string;
  label: string;
  href: string;
  count: number;
}

const ICON_MAP: Record<string, React.ElementType> = {
  message: MessageSquare,
  order: Package,
  seller_order: ShoppingBag,
  ticket: Ticket,
  review: Star,
};

const COLOR_MAP: Record<string, string> = {
  message: "text-green-600 bg-green-50",
  order: "text-blue-600 bg-blue-50",
  seller_order: "text-orange-600 bg-orange-50",
  ticket: "text-purple-600 bg-purple-50",
  review: "text-amber-600 bg-amber-50",
};

export function NotificationBell({ isHome }: { isHome?: boolean }) {
  const [items, setItems] = useState<NotifItem[]>([]);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifs = useCallback(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        setItems(data.items || []);
        setTotal(data.total || 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`relative flex items-center justify-center h-9 w-9 rounded-md transition-colors ${
          isHome
            ? "text-white/70 hover:text-white hover:bg-white/10"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        }`}
        aria-label="Notifikasi"
      >
        <Bell className="h-5 w-5" />
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed sm:absolute top-14 sm:top-full sm:mt-2 right-2 sm:right-0 w-[calc(100vw-1rem)] sm:w-72 max-w-72 bg-background border rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2.5 border-b">
            <p className="text-sm font-semibold">Notifikasi</p>
          </div>
          {items.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <p className="text-sm text-muted-foreground">Tidak ada notifikasi</p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {items.map((item) => {
                const Icon = ICON_MAP[item.type] || Bell;
                const color = COLOR_MAP[item.type] || "text-gray-600 bg-gray-50";
                return (
                  <Link
                    key={item.type}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors"
                  >
                    <div className={`p-1.5 rounded-lg ${color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm flex-1">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
          <div className="px-3 py-2 border-t">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="text-xs text-primary hover:text-primary/80 font-medium"
            >
              Lihat Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
