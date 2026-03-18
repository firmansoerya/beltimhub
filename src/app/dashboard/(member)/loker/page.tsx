import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PostActions } from "../saya/PostActions";
import { Plus, Briefcase } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

export default async function LokerDashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!user) redirect("/sign-in");

  const lokerList = await prisma.jobListing.findMany({
    where: { posterId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="sticky top-0 z-20 bg-background -mx-6 md:-mx-8 px-6 md:px-8 py-5 border-b mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold mb-0.5">Lowongan Saya</h1>
            <p className="text-sm text-muted-foreground">Kelola lowongan kerja yang kamu pasang</p>
          </div>
          <Link
            href="/loker/buat"
            className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-3 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Posting Loker
          </Link>
        </div>
      </div>

      <div className="bg-background border rounded-xl overflow-hidden">
        {lokerList.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Belum ada lowongan yang dipasang.</p>
            <Link href="/loker/buat" className="text-primary hover:underline mt-1 inline-block">
              Posting lowongan sekarang
            </Link>
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
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      item.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                    }`}>
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
    </div>
  );
}
