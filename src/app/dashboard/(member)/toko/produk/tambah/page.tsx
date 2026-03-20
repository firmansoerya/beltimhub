import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AddProductForm } from "./AddProductForm";

export default async function TambahProdukPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!user) redirect("/sign-in");

  const umkmList = await prisma.umkm.findMany({
    where: { ownerId: user.id, isMarketplace: true, isVerified: true },
    select: { id: true, name: true },
  });

  if (umkmList.length === 0) redirect("/dashboard/toko");

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-bold mb-6">Tambah Produk Baru</h1>
      <AddProductForm umkmList={umkmList} />
    </div>
  );
}
