import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TambahUmkmForm } from "./TambahUmkmForm";

export default async function TambahUmkmPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });
  if (!user) redirect("/sign-in");

  // 1 akun = 1 UMKM: redirect ke UMKM yang sudah ada
  const existing = await prisma.umkm.findFirst({
    where: { ownerId: user.id },
    select: { id: true },
  });

  if (existing) {
    redirect(`/umkm/${existing.id}`);
  }

  return <TambahUmkmForm />;
}
