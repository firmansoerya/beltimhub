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

const createEventSchema = z.object({
  title: z.string().min(5).max(150),
  description: z.string().min(20).max(50000),
  category: z.string().min(1),
  location: z.string().min(3),
  address: z.string().optional(),
  eventDate: z.string().datetime(),
  registrationDeadline: z.string().datetime().optional(),
  price: z.coerce.number().int().min(0),
  feeType: z.enum(["FEE_ON_TOP", "FEE_ABSORBED"]).default("FEE_ON_TOP"),
  quota: z.coerce.number().int().min(1),
  endDate: z.string().datetime().optional(),
  termsAndConditions: z.string().optional(),
  facilities: z.array(z.string()).optional(),
  lineUp: z.array(z.object({ name: z.string(), role: z.string().optional() })).optional(),
  coverImage: z.string().optional(),
  layoutImage: z.string().optional(),
  customFields: z.array(customFieldSchema).optional(),
  maxPerPerson: z.coerce.number().int().min(1).optional(),
  oneEmailOneTransaction: z.boolean().optional().default(false),
  uniqueParticipants: z.boolean().optional().default(false),
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "9"), 50);
  const category = searchParams.get("category");

  const now = new Date();
  const where = {
    status: "PUBLISHED" as const,
    eventDate: { gte: now },
    ...(category ? { category } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { eventDate: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        organizer: { select: { fullName: true, avatarUrl: true } },
        _count: { select: { tickets: { where: { paymentStatus: "PAID" } } } },
      },
    }),
    prisma.event.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();
  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { customFields, endDate, ticketCategories, ...rest } = parsed.data;
  const event = await prisma.event.create({
    data: {
      ...rest,
      organizerId: user.id,
      eventDate: new Date(rest.eventDate),
      endDate: endDate ? new Date(endDate) : undefined,
      registrationDeadline: rest.registrationDeadline
        ? new Date(rest.registrationDeadline)
        : undefined,
      customFields: customFields ?? [],
      ticketCategories: ticketCategories?.length
        ? { create: ticketCategories.map((c, i) => ({ ...c, sortOrder: c.sortOrder ?? i })) }
        : undefined,
    },
  });

  return NextResponse.json(event, { status: 201 });
}
