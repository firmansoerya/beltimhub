import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PostActions } from "../saya/PostActions";
import { Plus, Package } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

const statusLabel: Record<string, string> = { ACTIVE: "Aktif", SOLD: "Terjual", EXPIRED: "Kadaluarsa" };
const statusColor: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  SOLD: "bg-slate-100 text-slate-600",
  EXPIRED: "bg-red-100 text-red-600",
};

export default async function IklanPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!user) redirect("/sign-in");

  const { tab } = await searchParams;
  const isInaktif = tab === "inaktif";

  const listings = await prisma.listing.findMany({
    where: { sellerId: user.id, status: { not: "DELETED" } },
    orderBy: { createdAt: "desc" },
  });

  const aktif = listings.filter(l => l.status === "ACTIVE");
  const inaktif = listings.filter(l => l.status !== "ACTIVE");
  const displayed = isInaktif ? inaktif : aktif;

  return (
    <div>
      <div className="sticky top-0 z-20 bg-background -mx-6 md:-mx-8 px-6 md:px-8 pt-5 pb-0 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold mb-0.5">Iklan Saya</h1>
            <p className="text-sm text-muted-foreground">Kelola iklan FJB yang kamu pasang</p>
          </div>
          <Link
            href="/fjb/buat"
            className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-3 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Pasang Iklan
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b">
        <Link
          href="/dashboard/iklan"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            !isInaktif
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Aktif
          {aktif.length > 0 && (
            <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
              {aktif.length}
            </span>
          )}
        </Link>
        <Link
          href="/dashboard/iklan?tab=inaktif"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            isInaktif
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Tidak Aktif
          {inaktif.length > 0 && (
            <span className="ml-2 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
              {inaktif.length}
            </span>
          )}
        </Link>
        </div>
      </div>

      <div className="bg-background border rounded-xl overflow-hidden">
        {displayed.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>{isInaktif ? "Tidak ada iklan tidak aktif." : "Belum ada iklan aktif."}</p>
            {!isInaktif && (
              <Link href="/fjb/buat" className="text-primary hover:underline mt-1 inline-block">
                Pasang iklan sekarang
              </Link>
            )}
          </div>
        ) : (
          <ul className="divide-y">
            {displayed.map((item) => (
              <li key={item.id} className="flex items-center gap-4 px-4 py-3">
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
    </div>
  );
}
