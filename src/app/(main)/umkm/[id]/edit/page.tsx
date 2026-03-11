import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EditUmkmForm } from "./EditUmkmForm";

export default async function EditUmkmPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;

  const [umkm, currentUser] = await Promise.all([
    prisma.umkm.findUnique({ where: { id } }),
    prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } }),
  ]);

  if (!umkm) notFound();
  if (!currentUser || umkm.ownerId !== currentUser.id) redirect(`/umkm/${id}`);

  return (
    <EditUmkmForm
      id={id}
      defaultValues={{
        name: umkm.name,
        category: umkm.category,
        description: umkm.description,
        address: umkm.address ?? "",
        phone: umkm.phone ?? "",
        instagram: umkm.instagram ?? "",
        website: umkm.website ?? "",
      }}
      defaultImageUrl={umkm.imageUrl ?? ""}
    />
  );
}
