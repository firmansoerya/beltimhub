import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EventForm } from "@/components/EventForm";
import type { CustomField } from "@/components/CustomFieldBuilder";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) redirect("/sign-in");

  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      organizerId: true,
      title: true,
      description: true,
      category: true,
      location: true,
      address: true,
      eventDate: true,
      registrationDeadline: true,
      price: true,
      quota: true,
      coverImage: true,
      customFields: true,
    },
  });

  if (!event) notFound();
  if (event.organizerId !== user.id && user.role !== "ADMIN") {
    redirect("/dashboard/organizer");
  }

  const eventType =
    event.price > 0
      ? "paid"
      : event.quota >= 999999
        ? "public"
        : "free_register";

  return (
    <EventForm
      mode="edit"
      eventId={id}
      backHref={`/dashboard/organizer/events/${id}`}
      defaultValues={{
        title: event.title,
        description: event.description,
        category: event.category,
        location: event.location,
        address: event.address ?? "",
        eventDate: event.eventDate.toISOString(),
        registrationDeadline: event.registrationDeadline?.toISOString() ?? "",
        price: event.price,
        quota: event.quota,
        coverImage: event.coverImage ?? "",
        eventType,
        customFields: Array.isArray(event.customFields)
          ? (event.customFields as unknown as CustomField[])
          : [],
      }}
    />
  );
}
