import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PostActions } from "../saya/PostActions";
import { Plus, Store, ShoppingBag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

export default async function UmkmDashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!user) redirect("/sign-in");

  const umkmList = await prisma.umkm.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
  });

  // 1 akun = 1 UMKM: langsung redirect ke detail jika sudah punya
  if (umkmList.length === 1) {
    redirect(`/umkm/${umkmList[0].id}`);
  }

  const hasUmkm = umkmList.length > 0;

  return (
    <div>
      <div className="sticky top-0 z-20 bg-background -mx-6 md:-mx-8 px-6 md:px-8 py-5 border-b mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold mb-0.5">UMKM Saya</h1>
            <p className="text-sm text-muted-foreground">Kelola daftar UMKM yang kamu daftarkan</p>
          </div>
          {!hasUmkm && (
            <Link
              href="/umkm/tambah"
              className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-3 py-2 rounded-md hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Daftarkan UMKM
            </Link>
          )}
        </div>
      </div>

      <div className="bg-background border rounded-xl overflow-hidden">
        {umkmList.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            <Store className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Belum ada UMKM yang terdaftar.</p>
            <Link href="/umkm/tambah" className="text-primary hover:underline mt-1 inline-block">
              Daftarkan sekarang
            </Link>
          </div>
        ) : (
          <ul className="divide-y">
            {umkmList.map((item) => (
              <li key={item.id} className="flex items-center gap-4 px-4 py-3">
                <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl">🏪</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/umkm/${item.id}`} className="font-medium text-sm hover:text-primary transition-colors truncate block">
                    {item.name}
                  </Link>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-muted-foreground">{item.category}</span>
                    {item.isVerified && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 font-medium">
                        ✓ Terverifikasi
                      </span>
                    )}
                    {item.marketplaceStatus === "APPROVED" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium flex items-center gap-1">
                        <ShoppingBag className="h-2.5 w-2.5" /> Pasar Lokal
                      </span>
                    )}
                    {item.marketplaceStatus === "PENDING_REVIEW" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                        Menunggu Review
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      · {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: id })}
                    </span>
                  </div>
                </div>
                {item.marketplaceStatus === "APPROVED" ? (
                  <Link
                    href="/dashboard/toko"
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline shrink-0"
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    Kelola Toko
                  </Link>
                ) : (
                  <PostActions type="umkm" id={item.id} />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
