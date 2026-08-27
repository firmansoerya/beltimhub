"use client";

import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Check } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

interface Props {
  productId: string;
  name: string;
  price: number;
  image: string | null;
  stock: number;
  umkmId: string;
  umkmName: string;
}

export function AddToCartButton({ productId, name, price, image, stock, umkmId, umkmName }: Props) {
  const { addItem, items } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const inCart = items.find(i => i.productId === productId);

  useEffect(() => {
    if (justAdded) {
      const t = setTimeout(() => setJustAdded(false), 1500);
      return () => clearTimeout(t);
    }
  }, [justAdded]);

  function handleAdd() {
    addItem({ productId, name, price, image, stock, umkmId, umkmName });
    setJustAdded(true);
    toast.success(`${name} ditambah ke keranjang`);
  }

  return (
    <Button variant="outline" className="flex-1 gap-2" size="lg" onClick={handleAdd}>
      {justAdded ? (
        <>
          <Check className="h-4 w-4" />
          Ditambahkan{inCart ? ` (${inCart.qty})` : ""}
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4" />
          {inCart ? `Tambah Lagi (${inCart.qty} di keranjang)` : "Masukkan ke Keranjang"}
        </>
      )}
    </Button>
  );
}
