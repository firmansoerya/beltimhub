import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PostActions } from "./PostActions";
import { Plus, Package, Building2, Briefcase } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

export default async function DashboardSayaPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  let user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) {
    const clerkUser = await currentUser();
    if (!clerkUser) redirect("/sign-in");
    const fullName = clerkUser.fullName || `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || "User";
    user = await prisma.user.create({
      data: {
        clerkId: userId,
        fullName,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        avatarUrl: clerkUser.imageUrl,
      },
    });
  }

  const [listings, umkmList, lokerList] = await Promise.all([
    prisma.listing.findMany({
      where: { sellerId: user.id, status: { not: "DELETED" } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.umkm.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.jobListing.findMany({
      where: { posterId: user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const statusLabel: Record<string, string> = { ACTIVE: "Aktif", SOLD: "Terjual", EXPIRED: "Kadaluarsa" };
  const statusColor: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    SOLD: "bg-slate-100 text-slate-600",
    EXPIRED: "bg-red-100 text-red-600",
  };

  return (
    <div>
      <div className="sticky top-0 z-20 bg-background -mx-6 md:-mx-8 px-6 md:px-8 py-5 border-b mb-8">
        <h1 className="text-xl font-bold mb-0.5">Konten Saya</h1>
        <p className="text-sm text-muted-foreground">Kelola iklan, UMKM, dan lowongan yang kamu posting</p>
      </div>
      <div className="max-w-4xl mx-auto space-y-8">

      {/* FJB Listings */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Iklan FJB</h2>
            <span className="text-xs text-muted-foreground">({listings.length})</span>
          </div>
          <Link href="/fjb/buat" className="flex items-center gap-1 text-xs text-primary hover:underline">
            <Plus className="h-3.5 w-3.5" />Pasang iklan baru
          </Link>
        </div>

        <div className="bg-background border rounded-xl overflow-hidden">
          {listings.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Belum ada iklan. <Link href="/fjb/buat" className="text-primary hover:underline">Pasang iklan sekarang</Link>
            </div>
          ) : (
            <ul className="divide-y">
              {listings.map((item) => (
                <li key={item.id} className="flex items-center gap-4 px-4 py-3">
                  {/* Thumbnail */}
                  <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                    {item.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/fjb/${item.id}`} className="font-medium text-sm hover:text-primary transition-colors truncate block">
                      {item.title}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor[item.status] ?? "bg-muted text-muted-foreground"}`}>
                        {statusLabel[item.status] ?? item.status}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.price === 0 ? "Gratis" : `Rp ${item.price.toLocaleString("id-ID")}`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        · {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: id })}
                      </span>
                    </div>
                  </div>
                  <PostActions
                    type="listing"
                    id={item.id}
                    status={item.status}
                    extraActions={item.status === "ACTIVE" ? [{ label: "Tandai Terjual", action: "sold" }] : []}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* UMKM */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">UMKM Saya</h2>
            <span className="text-xs text-muted-foreground">({umkmList.length})</span>
          </div>
          <Link href="/umkm/tambah" className="flex items-center gap-1 text-xs text-primary hover:underline">
            <Plus className="h-3.5 w-3.5" />Daftarkan UMKM baru
          </Link>
        </div>

        <div className="bg-background border rounded-xl overflow-hidden">
          {umkmList.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Belum ada UMKM. <Link href="/umkm/tambah" className="text-primary hover:underline">Daftarkan sekarang</Link>
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
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{item.category}</span>
                      {item.isVerified && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 font-medium">✓ Terverifikasi</span>}
                      <span className="text-xs text-muted-foreground">
                        · {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: id })}
                      </span>
                    </div>
                  </div>
                  <PostActions type="umkm" id={item.id} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Loker */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Lowongan Saya</h2>
            <span className="text-xs text-muted-foreground">({lokerList.length})</span>
          </div>
          <Link href="/loker/buat" className="flex items-center gap-1 text-xs text-primary hover:underline">
            <Plus className="h-3.5 w-3.5" />Posting loker baru
          </Link>
        </div>

        <div className="bg-background border rounded-xl overflow-hidden">
          {lokerList.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Belum ada lowongan. <Link href="/loker/buat" className="text-primary hover:underline">Posting sekarang</Link>
            </div>
          ) : (
            <ul className="divide-y">
              {lokerList.map((item) => (
                <li key={item.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <Link href={`/loker/${item.id}`} className="font-medium text-sm hover:text-primary transition-colors truncate block">
                      {item.title}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{item.company}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${item.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                        {item.isActive ? "Aktif" : "Ditutup"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        · {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: id })}
                      </span>
                    </div>
                  </div>
                  <PostActions
                    type="loker"
                    id={item.id}
                    isActive={item.isActive}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      </div>
    </div>
  );
}
