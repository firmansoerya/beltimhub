"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart";

export function FloatingCart() {
  const { totalItems } = useCart();

  return (
    <Link
      href="/pasar-lokal/keranjang"
      className="flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-5 py-3 shadow-lg hover:shadow-xl transition-all hover:scale-105 font-semibold text-sm md:hidden"
      style={{ position: "fixed", bottom: 24, right: 24, zIndex: 100 }}
    >
      <ShoppingCart className="h-5 w-5" />
      Keranjang
      {totalItems > 0 && (
        <span className="bg-destructive text-destructive-foreground rounded-full min-w-[20px] h-5 flex items-center justify-center text-xs font-bold px-1.5">
          {totalItems > 99 ? "99+" : totalItems}
        </span>
      )}
    </Link>
  );
}
