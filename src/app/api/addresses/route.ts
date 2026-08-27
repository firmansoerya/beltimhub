import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const addressSchema = z.object({
  label: z.string().min(1).max(50),
  recipient: z.string().min(2).max(100),
  phone: z.string().min(8).max(20),
  address: z.string().min(10).max(500),
  district: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  province: z.string().max(100).optional(),
  postalCode: z.string().max(10).optional(),
  isDefault: z.boolean().optional(),
});

async function getUser() {
  const { userId } = await auth();
  if (!userId) return null;
  return prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
}

// GET — list all addresses
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const addresses = await prisma.shippingAddress.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json(addresses);
}

// POST — create new address
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { isDefault, ...data } = parsed.data;

  // If this is the first address or marked as default, set it as default
  const count = await prisma.shippingAddress.count({ where: { userId: user.id } });
  const shouldBeDefault = isDefault || count === 0;

  if (shouldBeDefault) {
    // Unset other defaults
    await prisma.shippingAddress.updateMany({
      where: { userId: user.id, isDefault: true },
      data: { isDefault: false },
    });
  }

  const address = await prisma.shippingAddress.create({
    data: { ...data, isDefault: shouldBeDefault, userId: user.id },
  });

  return NextResponse.json(address, { status: 201 });
}
