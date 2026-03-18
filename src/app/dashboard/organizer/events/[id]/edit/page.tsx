import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EventForm } from "@/components/EventForm";
import type { CustomField } from "@/components/CustomFieldBuilder";

interface TCategory {
  name: string;
  description: string | null;
  price: number;
  quota: number;
  sortOrder: number;
  isPresale: boolean;
  isDiscount: boolean;
  originalPrice: number | null;
}

interface EventEditData {
  id: string;
  organizerId: string;
  title: string;
  description: string;
  category: string;
  location: string;
  address: string | null;
  eventDate: Date;
  endDate: Date | null;
  registrationDeadline: Date | null;
  price: number;
  feeType: string;
  quota: number;
  maxPerPerson: number | null;
  oneEmailOneTransaction: boolean;
  uniqueParticipants: boolean;
  coverImage: string | null;
  layoutImage: string | null;
  customFields: unknown;
  termsAndConditions: string | null;
  facilities: string[];
  lineUp: unknown;
  ticketCategories: TCategory[];
}

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const event = (await (prisma.event.findUnique as any)({
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
      endDate: true,
      registrationDeadline: true,
      price: true,
      feeType: true,
      quota: true,
      maxPerPerson: true,
      oneEmailOneTransaction: true,
      uniqueParticipants: true,
      coverImage: true,
      layoutImage: true,
      customFields: true,
      termsAndConditions: true,
      facilities: true,
      lineUp: true,
      ticketCategories: {
        select: { name: true, description: true, price: true, quota: true, sortOrder: true, isPresale: true, isDiscount: true, originalPrice: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  })) as EventEditData | null;

  if (!event) notFound();
  if (event.organizerId !== user.id && user.role !== "ADMIN") {
    redirect("/dashboard/organizer");
  }

  const hasCategories = event.ticketCategories.length > 0;
  const eventType =
    event.price > 0 || hasCategories
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
        endDate: event.endDate?.toISOString() ?? "",
        registrationDeadline: event.registrationDeadline?.toISOString() ?? "",
        price: event.price,
        feeType: event.feeType as "FEE_ON_TOP" | "FEE_ABSORBED" | undefined,
        quota: event.quota,
        coverImage: event.coverImage ?? "",
        layoutImage: event.layoutImage ?? "",
        termsAndConditions: event.termsAndConditions ?? "",
        eventType,
        customFields: Array.isArray(event.customFields)
          ? (event.customFields as unknown as CustomField[])
          : [],
        facilities: Array.isArray(event.facilities) ? event.facilities : [],
        lineUp: Array.isArray(event.lineUp)
          ? (event.lineUp as { name: string; role: string }[])
          : [],
        maxPerPerson: event.maxPerPerson ?? undefined,
        oneEmailOneTransaction: event.oneEmailOneTransaction,
        uniqueParticipants: event.uniqueParticipants,
        ticketCategories: event.ticketCategories.map((c) => ({
          name: c.name,
          description: c.description ?? "",
          price: c.price,
          quota: c.quota,
          isPresale: c.isPresale,
          isDiscount: c.isDiscount,
          originalPrice: c.originalPrice ?? 0,
        })),
      }}
    />
  );
}
