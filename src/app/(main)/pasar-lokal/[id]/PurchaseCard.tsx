"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, ShoppingCart, ShieldCheck, MessageSquare, Heart, Share2 } from "lucide-react";
import { toast } from "sonner";

function formatPrice(price: number) {
  return "Rp" + new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(price);
}

interface Props {
  productId: string;
  name: string;
  price: number;
  image: string | null;
  stock: number;
  umkmId: string;
  umkmName: string;
}

export function PurchaseCard({ productId, name, price, image, stock, umkmId, umkmName }: Props) {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);

  const [favorited, setFavorited] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  // Cek status favorit saat mount
  useEffect(() => {
    if (!isSignedIn) return;
    fetch(`/api/products/${productId}/favorite`).then(r => r.json()).then(d => setFavorited(d.favorited)).catch(() => {});
  }, [isSignedIn, productId]);

  async function toggleFavorite() {
    if (!isSignedIn) { router.push("/sign-in"); return; }
    setFavLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}/favorite`, { method: "POST" });
      const data = await res.json();
      setFavorited(data.favorited);
      toast.success(data.favorited ? "Ditambahkan ke favorit" : "Dihapus dari favorit");
    } catch { toast.error("Gagal memproses"); }
    finally { setFavLoading(false); }
  }

  function openChatAboutProduct() {
    if (!isSignedIn) { router.push("/sign-in"); return; }
    window.dispatchEvent(new CustomEvent("open-floating-chat", {
      detail: { umkmId, prefill: `Halo, saya ingin bertanya tentang produk "${name}"` },
    }));
  }

  const subtotal = price * qty;

  function handleAddToCart() {
    addItem({ productId, name, price, image, stock, umkmId, umkmName }, qty);
    toast.success(`${qty}x ${name} ditambah ke keranjang`);
  }

  function handleBuyNow() {
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }
    // Add to cart, then go to checkout with this item selected
    addItem({ productId, name, price, image, stock, umkmId, umkmName }, qty);
    sessionStorage.setItem("checkout_items", JSON.stringify([productId]));
    router.push("/pasar-lokal/checkout");
  }

  if (stock === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">Stok Habis</p>
          <p>Produk ini sedang tidak tersedia.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="sticky top-20">
      <CardContent className="p-4 space-y-4">
        <h3 className="font-semibold text-sm">Atur jumlah</h3>

        {/* Qty selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center border rounded-lg">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              className="p-2 hover:bg-muted disabled:opacity-30 transition-colors rounded-l-lg"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-10 text-center text-sm font-medium">{qty}</span>
            <button
              onClick={() => setQty((q) => Math.min(stock, q + 1))}
              disabled={qty >= stock}
              className="p-2 hover:bg-muted disabled:opacity-30 transition-colors rounded-r-lg"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <span className="text-xs text-muted-foreground">
            Stok Total: <span className="font-semibold text-foreground">{stock}</span>
          </span>
        </div>

        <Separator />

        {/* Subtotal */}
        <div className="flex justify-between font-bold text-sm">
          <span>Subtotal ({qty} barang)</span>
          <span className="text-primary">{formatPrice(subtotal)}</span>
        </div>

        {/* Buttons */}
        <div className="space-y-2">
          <Button className="w-full gap-2" onClick={handleAddToCart}>
            <ShoppingCart className="h-4 w-4" />
            + Keranjang
          </Button>
          <Button variant="outline" className="w-full" onClick={handleBuyNow}>
            Beli Langsung
          </Button>
        </div>

        {/* Escrow badge */}
        <div className="flex items-center gap-1.5 text-xs text-teal-700 dark:text-teal-400">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          <span>Dilindungi Escrow BeltimHub</span>
        </div>

        <Separator />

        {/* Chat, Favorite & Share */}
        <div className="flex items-center gap-2">
          <button
            onClick={openChatAboutProduct}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            Chat
          </button>
          <button
            onClick={toggleFavorite}
            disabled={favLoading}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
          >
            <Heart className={`h-4 w-4 ${favorited ? "fill-red-500 text-red-500" : ""}`} />
            {favorited ? "Difavoritkan" : "Favorit"}
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: name, url: window.location.href }).catch(() => {});
              } else {
                navigator.clipboard.writeText(window.location.href).then(() => toast.success("Link disalin!")).catch(() => {});
              }
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
