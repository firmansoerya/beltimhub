import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EditListingForm } from "./EditListingForm";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;

  const [listing, currentUser] = await Promise.all([
    prisma.listing.findUnique({ where: { id } }),
    prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } }),
  ]);

  if (!listing || listing.status === "DELETED") notFound();
  if (!currentUser || listing.sellerId !== currentUser.id) redirect(`/fjb/${id}`);

  return (
    <EditListingForm
      id={id}
      defaultValues={{
        title: listing.title,
        description: listing.description,
        price: listing.price,
        category: listing.category,
        location: listing.location ?? "",
      }}
      defaultImages={listing.images ?? []}
    />
  );
}
