import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Package, ShoppingBag, ShieldCheck, Truck, CheckCircle2, Clock } from "lucide-react";
import { ProductActions } from "./ProductActions";

function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
}

const orderStatusLabel: Record<string, string> = {
  WAITING_PAYMENT: "Menunggu Bayar",
  PAID: "Sudah Dibayar",
  PROCESSING: "Diproses",
  SHIPPED: "Dikirim",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};
const orderStatusColor: Record<string, string> = {
  WAITING_PAYMENT: "bg-yellow-100 text-yellow-700",
  PAID: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-indigo-100 text-indigo-700",
  SHIPPED: "bg-purple-100 text-purple-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-600",
};

export default async function TokoPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });
  if (!user) redirect("/sign-in");

  // Ambil semua UMKM milik user yang sudah join marketplace
  const umkmList = await prisma.umkm.findMany({
    where: { ownerId: user.id, isMarketplace: true, isVerified: true },
    select: { id: true, name: true },
  });

  // Ambil semua UMKM milik user (belum tentu marketplace)
  const allUmkm = await prisma.umkm.findMany({
    where: { ownerId: user.id },
    select: { id: true, name: true, isMarketplace: true, isVerified: true },
  });

  const umkmIds = umkmList.map((u) => u.id);

  const [products, orders] = await Promise.all([
    umkmIds.length > 0
      ? prisma.product.findMany({
          where: { umkmId: { in: umkmIds }, status: { not: "DELETED" } },
          orderBy: { createdAt: "desc" },
          include: { umkm: { select: { name: true } } },
        })
      : [],
    prisma.marketplaceOrder.findMany({
      where: { sellerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        items: { include: { product: { select: { name: true, images: true } } } },
        buyer: { select: { fullName: true } },
      },
    }),
  ]);

  const hasMarketplaceUmkm = umkmList.length > 0;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Dashboard Toko
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola produk dan pesanan Pasar Lokal</p>
        </div>
        {hasMarketplaceUmkm && (
          <Link href="/dashboard/toko/produk/tambah">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Tambah Produk
            </Button>
          </Link>
        )}
      </div>

      {/* Jika tidak ada UMKM sama sekali */}
      {allUmkm.length === 0 && (
        <div className="text-center py-16 border rounded-xl">
          <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <h2 className="font-semibold mb-2">Kamu belum punya UMKM</h2>
          <p className="text-sm text-muted-foreground mb-4">Daftar UMKM terlebih dahulu sebelum buka toko di Pasar Lokal.</p>
          <Link href="/umkm/tambah">
            <Button>Daftar UMKM</Button>
          </Link>
        </div>
      )}

      {/* Jika ada UMKM tapi belum join marketplace */}
      {allUmkm.length > 0 && !hasMarketplaceUmkm && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <ShieldCheck className="h-8 w-8 text-amber-600 shrink-0" />
            <div>
              <h2 className="font-semibold mb-1">Buka Toko di Pasar Lokal</h2>
              <p className="text-sm text-muted-foreground mb-3">
                UMKM kamu belum terdaftar di Pasar Lokal. Aktifkan untuk mulai menjual produk dengan perlindungan escrow.
              </p>
              <ul className="text-sm space-y-1 mb-4">
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-teal-600" />
                  Pembayaran aman via escrow BeltimHub
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-teal-600" />
                  Dana cair setelah pembeli konfirmasi terima barang
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-teal-600" />
                  Biaya platform hanya 3% per transaksi berhasil
                </li>
              </ul>
              <div className="flex flex-wrap gap-2">
                {allUmkm.map((u) => (
                  <Link key={u.id} href={`/dashboard/umkm/${u.id}/edit`}>
                    <Button size="sm" variant="outline">Aktifkan {u.name}</Button>
                  </Link>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Aktifkan lewat halaman edit UMKM, centang opsi &quot;Daftarkan ke Pasar Lokal&quot;</p>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard aktif */}
      {hasMarketplaceUmkm && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{products.filter((p) => p.status === "ACTIVE").length}</p>
                <p className="text-xs text-muted-foreground">Produk Aktif</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{orders.filter((o) => o.orderStatus === "PAID" || o.orderStatus === "PROCESSING").length}</p>
                <p className="text-xs text-muted-foreground">Pesanan Masuk</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{orders.filter((o) => o.orderStatus === "COMPLETED").length}</p>
                <p className="text-xs text-muted-foreground">Selesai</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="produk">
            <TabsList className="w-full justify-start mb-4">
              <TabsTrigger value="produk">Produk ({products.length})</TabsTrigger>
              <TabsTrigger value="pesanan">Pesanan ({orders.length})</TabsTrigger>
            </TabsList>

            {/* Tab Produk */}
            <TabsContent value="produk">
              {products.length === 0 ? (
                <div className="text-center py-12 border rounded-xl">
                  <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm text-muted-foreground mb-4">Belum ada produk. Tambahkan produk pertama kamu!</p>
                  <Link href="/dashboard/toko/produk/tambah">
                    <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />Tambah Produk</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {products.map((product) => (
                    <Card key={product.id}>
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-14 h-14 shrink-0 rounded-lg bg-muted overflow-hidden">
                          {product.images[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl">🛍️</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{product.name}</p>
                          <p className="text-primary font-semibold text-sm">{formatPrice(product.price)}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${product.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                              {product.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                            </span>
                            <span className="text-xs text-muted-foreground">Stok: {product.stock}</span>
                            <span className="text-xs text-muted-foreground">{product.umkm.name}</span>
                          </div>
                        </div>
                        <ProductActions productId={product.id} currentStatus={product.status} />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tab Pesanan */}
            <TabsContent value="pesanan">
              {orders.length === 0 ? (
                <div className="text-center py-12 border rounded-xl text-muted-foreground">
                  <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Belum ada pesanan masuk.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <Card key={order.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <p className="font-medium text-sm">{order.buyer.fullName}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </div>
                          <Badge className={`text-xs shrink-0 ${orderStatusColor[order.orderStatus]}`}>
                            {orderStatusLabel[order.orderStatus]}
                          </Badge>
                        </div>
                        <div className="space-y-1 mb-3">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex items-center gap-2 text-sm">
                              <div className="w-8 h-8 shrink-0 rounded bg-muted overflow-hidden">
                                {item.product.images[0] && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                                )}
                              </div>
                              <span className="truncate text-muted-foreground">{item.product.name}</span>
                              <span className="shrink-0 text-xs">×{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-sm">{formatPrice(order.sellerAmount)} <span className="text-xs text-muted-foreground font-normal">(setelah fee)</span></p>
                          {(order.orderStatus === "PAID" || order.orderStatus === "PROCESSING") && (
                            <Link href={`/orders/${order.id}`}>
                              <Button size="sm" className="gap-1.5 text-xs">
                                <Truck className="h-3.5 w-3.5" />
                                Proses Pengiriman
                              </Button>
                            </Link>
                          )}
                          {order.orderStatus === "SHIPPED" && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Truck className="h-3.5 w-3.5" />
                              Menunggu konfirmasi pembeli
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
