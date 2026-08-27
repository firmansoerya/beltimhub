"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, Trash2, ShoppingCart, ArrowLeft, MessageSquare } from "lucide-react";
import { toast } from "sonner";

function formatPrice(price: number) {
  return "Rp" + new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(price);
}

export default function KeranjangPage() {
  const router = useRouter();
  const { items, updateQty, removeItem, removeItems } = useCart();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(items.map(i => i.productId)));
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [showNoteFor, setShowNoteFor] = useState<Set<string>>(new Set());

  // Group items by store
  const grouped = useMemo(() => {
    return items.reduce<Record<string, { umkmId: string; umkmName: string; items: typeof items }>>((acc, item) => {
      if (!acc[item.umkmId]) {
        acc[item.umkmId] = { umkmId: item.umkmId, umkmName: item.umkmName, items: [] };
      }
      acc[item.umkmId].items.push(item);
      return acc;
    }, {});
  }, [items]);

  const storeGroups = Object.values(grouped);

  // Toggle item selection
  function toggleItem(productId: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  // Toggle all items in a store
  function toggleStore(umkmId: string) {
    const storeItems = grouped[umkmId]?.items ?? [];
    const allSelected = storeItems.every(i => selected.has(i.productId));
    setSelected(prev => {
      const next = new Set(prev);
      storeItems.forEach(i => {
        if (allSelected) next.delete(i.productId);
        else next.add(i.productId);
      });
      return next;
    });
  }

  // Toggle select all
  function toggleAll() {
    const allSelected = items.length > 0 && items.every(i => selected.has(i.productId));
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map(i => i.productId)));
    }
  }

  // Delete selected items
  function deleteSelected() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    removeItems(ids);
    setSelected(new Set());
    toast.success(`${ids.length} produk dihapus dari keranjang`);
  }

  // Calculate selected totals
  const selectedItems = items.filter(i => selected.has(i.productId));
  const selectedCount = selectedItems.reduce((s, i) => s + i.qty, 0);
  const selectedTotal = selectedItems.reduce((s, i) => s + i.price * i.qty, 0);

  const allChecked = items.length > 0 && items.every(i => selected.has(i.productId));

  function handleCheckout() {
    if (selectedItems.length === 0) {
      toast.error("Pilih minimal 1 produk");
      return;
    }
    // Store selected items + notes in sessionStorage for checkout page
    sessionStorage.setItem("checkout_items", JSON.stringify(selectedItems.map(i => i.productId)));
    // Only save notes that have content
    const activeNotes: Record<string, string> = {};
    for (const item of selectedItems) {
      if (notes[item.productId]?.trim()) {
        activeNotes[item.productId] = notes[item.productId].trim();
      }
    }
    sessionStorage.setItem("checkout_notes", JSON.stringify(activeNotes));
    router.push("/pasar-lokal/checkout");
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16 text-center">
        <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
        <h1 className="text-xl font-bold mb-2">Keranjang Kosong</h1>
        <p className="text-sm text-muted-foreground mb-6">Belum ada produk di keranjang kamu.</p>
        <Link href="/pasar-lokal">
          <Button>Mulai Belanja</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/pasar-lokal" className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold">Keranjang</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Select all bar */}
          <div className="flex items-center justify-between bg-background border rounded-lg px-4 py-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox checked={allChecked} onCheckedChange={toggleAll} />
              <span className="text-sm font-medium">Pilih Semua ({items.length})</span>
            </label>
            {selected.size > 0 && (
              <button onClick={deleteSelected} className="text-sm text-destructive hover:underline">
                Hapus ({selected.size})
              </button>
            )}
          </div>

          {/* Store groups */}
          {storeGroups.map((store) => {
            const storeAllSelected = store.items.every(i => selected.has(i.productId));
            return (
              <Card key={store.umkmId}>
                <CardContent className="p-0">
                  {/* Store header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
                    <Checkbox
                      checked={storeAllSelected}
                      onCheckedChange={() => toggleStore(store.umkmId)}
                    />
                    <Link href={`/umkm/${store.umkmId}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                      <span className="font-semibold text-sm">{store.umkmName}</span>
                    </Link>
                  </div>

                  {/* Items */}
                  <div className="divide-y">
                    {store.items.map((item) => (
                      <div key={item.productId} className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selected.has(item.productId)}
                            onCheckedChange={() => toggleItem(item.productId)}
                          />

                          {/* Image */}
                          <Link href={`/pasar-lokal/${item.productId}`} className="shrink-0">
                            <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden">
                              {item.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xl">🛍️</div>
                              )}
                            </div>
                          </Link>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <Link href={`/pasar-lokal/${item.productId}`} className="hover:text-primary transition-colors">
                              <p className="text-sm font-medium line-clamp-2">{item.name}</p>
                            </Link>
                            <p className="text-sm font-bold text-primary mt-1">{formatPrice(item.price)}</p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-3 shrink-0">
                            <button
                              onClick={() => removeItem(item.productId)}
                              className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>

                            {/* Qty controls */}
                            <div className="flex items-center border rounded-lg">
                              <button
                                onClick={() => updateQty(item.productId, item.qty - 1)}
                                disabled={item.qty <= 1}
                                className="h-8 w-8 flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-colors rounded-l-lg"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-10 text-center text-sm font-medium border-x">{item.qty}</span>
                              <button
                                onClick={() => updateQty(item.productId, item.qty + 1)}
                                disabled={item.qty >= item.stock}
                                className="h-8 w-8 flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-colors rounded-r-lg"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Note toggle + input */}
                        <div className="ml-[28px] mt-2">
                          {showNoteFor.has(item.productId) || notes[item.productId] ? (
                            <input
                              type="text"
                              placeholder="Catatan: warna, ukuran, dll..."
                              value={notes[item.productId] ?? ""}
                              onChange={(e) => setNotes(prev => ({ ...prev, [item.productId]: e.target.value }))}
                              className="w-full text-xs border rounded-md px-3 py-1.5 outline-none focus:ring-1 focus:ring-ring"
                            />
                          ) : (
                            <button
                              onClick={() => setShowNoteFor(prev => { const n = new Set(prev); n.add(item.productId); return n; })}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <MessageSquare className="h-3 w-3" />
                              Tulis catatan
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Right: Summary */}
        <div>
          <Card className="sticky top-20">
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold text-sm">Ringkasan belanja</h3>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total ({selectedCount} barang)</span>
                <span className="font-bold">{formatPrice(selectedTotal)}</span>
              </div>

              <Separator />

              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                disabled={selectedItems.length === 0}
              >
                Beli ({selectedItems.length})
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
