"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart";

function formatPrice(price: number) {
  return "Rp" + new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(price);
}

export function NavbarCart() {
  const { items, totalItems } = useCart();
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  function handleEnter() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  }

  function handleLeave() {
    timeoutRef.current = setTimeout(() => setOpen(false), 200);
  }

  // Tampilkan max 5 item terakhir
  const previewItems = items.slice(-5).reverse();

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <Link
        href="/pasar-lokal/keranjang"
        className="relative flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent transition-colors"
      >
        <ShoppingCart className="h-5 w-5" />
        {totalItems > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground rounded-full min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold px-1">
            {totalItems > 99 ? "99+" : totalItems}
          </span>
        )}
      </Link>

      {/* Popup dropdown */}
      {open && items.length > 0 && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-background border rounded-lg shadow-xl z-[100] animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <span className="font-semibold text-sm">Keranjang ({totalItems})</span>
          </div>

          <div className="max-h-[320px] overflow-y-auto">
            {previewItems.map((item) => (
              <div key={item.productId} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50">
                <div className="w-10 h-10 rounded bg-muted overflow-hidden shrink-0">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm">🛍️</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.qty} x {formatPrice(item.price)}</p>
                </div>
                <p className="text-xs font-semibold shrink-0">{formatPrice(item.price * item.qty)}</p>
              </div>
            ))}
            {items.length > 5 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                +{items.length - 5} produk lainnya
              </p>
            )}
          </div>

          <div className="px-4 py-3 border-t">
            <Link
              href="/pasar-lokal/keranjang"
              className="block w-full text-center bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
              onClick={() => setOpen(false)}
            >
              Lihat Keranjang
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
