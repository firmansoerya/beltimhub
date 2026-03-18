import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const customFieldSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  type: z.enum(["text", "number", "textarea", "select", "checkbox", "file"]),
  required: z.boolean(),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
  acceptedFileTypes: z.string().optional(),
});

const updateSchema = z.object({
  title: z.string().min(5).max(150).optional(),
  description: z.string().min(20).max(50000).optional(),
  category: z.string().min(1).optional(),
  location: z.string().min(3).optional(),
  address: z.string().optional(),
  eventDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional().nullable(),
  registrationDeadline: z.string().datetime().optional().nullable(),
  price: z.coerce.number().int().min(0).optional(),
  feeType: z.enum(["FEE_ON_TOP", "FEE_ABSORBED"]).optional(),
  quota: z.coerce.number().int().min(1).optional(),
  coverImage: z.string().optional(),
  layoutImage: z.string().optional().nullable(),
  termsAndConditions: z.string().optional(),
  facilities: z.array(z.string()).optional(),
  lineUp: z.array(z.object({ name: z.string(), role: z.string().optional() })).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ONGOING", "COMPLETED", "CANCELLED"]).optional(),
  customFields: z.array(customFieldSchema).optional(),
  maxPerPerson: z.coerce.number().int().min(1).optional().nullable(),
  oneEmailOneTransaction: z.boolean().optional(),
  uniqueParticipants: z.boolean().optional(),
  ticketCategories: z.array(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    price: z.coerce.number().int().min(0),
    quota: z.coerce.number().int().min(1),
    sortOrder: z.coerce.number().int().optional(),
    isPresale: z.boolean().optional(),
    isDiscount: z.boolean().optional(),
    originalPrice: z.coerce.number().int().min(0).optional(),
  })).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const event = await (prisma.event.findUnique as any)({
    where: { id },
    select: {
      id: true,
      title: true,
      price: true,
      feeType: true,
      quota: true,
      maxPerPerson: true,
      oneEmailOneTransaction: true,
      uniqueParticipants: true,
      requiresJersey: true,
      requiresBib: true,
      location: true,
      eventDate: true,
      endDate: true,
      status: true,
      registrationDeadline: true,
      customFields: true,
      termsAndConditions: true,
      coverImage: true,
      facilities: true,
      lineUp: true,
      layoutImage: true,
      ticketCategories: {
        select: {
          id: true, name: true, description: true, price: true, quota: true, sortOrder: true,
          isPresale: true, isDiscount: true, originalPrice: true,
          _count: { select: { tickets: { where: { paymentStatus: "PAID" } } } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(event);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id }, select: { organizerId: true } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (event.organizerId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { ticketCategories, maxPerPerson, ...data } = parsed.data;

  let updated;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updated = await (prisma.event.update as any)({
      where: { id },
      data: {
        ...data,
        maxPerPerson: maxPerPerson ?? null,
        eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
        endDate: data.endDate === null ? null : data.endDate ? new Date(data.endDate) : undefined,
        registrationDeadline:
          data.registrationDeadline === null
            ? null
            : data.registrationDeadline
              ? new Date(data.registrationDeadline)
              : undefined,
      },
    });
  } catch (err) {
    console.error("[PUT /api/events/[id]] update error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  // Replace ticket categories jika dikirim
  if (ticketCategories !== undefined) {
    await prisma.ticketCategory.deleteMany({ where: { eventId: id } });
    if (ticketCategories.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma.ticketCategory.createMany as any)({
        data: ticketCategories.map((c, i) => ({
          eventId: id,
          name: c.name,
          description: c.description,
          price: c.price,
          quota: c.quota,
          sortOrder: c.sortOrder ?? i,
          isPresale: c.isPresale ?? false,
          isDiscount: c.isDiscount ?? false,
          originalPrice: c.originalPrice ?? null,
        })),
      });
    }
  }

  return NextResponse.json(updated);
}
