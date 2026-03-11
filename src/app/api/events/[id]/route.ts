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
  registrationDeadline: z.string().datetime().optional().nullable(),
  price: z.coerce.number().int().min(0).optional(),
  quota: z.coerce.number().int().min(1).optional(),
  coverImage: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ONGOING", "COMPLETED", "CANCELLED"]).optional(),
  customFields: z.array(customFieldSchema).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      price: true,
      quota: true,
      requiresJersey: true,
      requiresBib: true,
      location: true,
      eventDate: true,
      status: true,
      registrationDeadline: true,
      customFields: true,
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

  const data = parsed.data;
  const updated = await prisma.event.update({
    where: { id },
    data: {
      ...data,
      eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
      registrationDeadline:
        data.registrationDeadline === null
          ? null
          : data.registrationDeadline
            ? new Date(data.registrationDeadline)
            : undefined,
    },
  });

  return NextResponse.json(updated);
}
