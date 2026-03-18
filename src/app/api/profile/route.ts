import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().max(50).optional(),
  fullName: z.string().min(1).max(100).optional(),
  nickname: z.string().max(50).optional().nullable(),
  birthDate: z.string().datetime().optional().nullable(),
  newsletterEnabled: z.boolean().optional(),
  organizerPhone: z.string().max(20).optional().nullable(),
  organizerBio: z.string().optional().nullable(),
  organizerAddress: z.string().max(150).optional().nullable(),
  organizerBannerUrl: z.string().url().optional().nullable().or(z.literal("")),
  twitterUsername: z.string().max(50).optional().nullable(),
  instagramUsername: z.string().max(50).optional().nullable(),
  facebookUrl: z.string().max(100).optional().nullable(),
  tiktokUsername: z.string().max(50).optional().nullable(),
});

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { fullName: true, email: true, phoneNumber: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { firstName, lastName, fullName, birthDate, ...rest } = parsed.data;

  const data: Record<string, unknown> = { ...rest };
  if (firstName !== undefined) {
    data.firstName = firstName;
    data.lastName = lastName ?? null;
    data.fullName = [firstName, lastName].filter(Boolean).join(" ");
  } else if (fullName !== undefined) {
    data.fullName = fullName;
  }
  if (birthDate !== undefined) {
    data.birthDate = birthDate ? new Date(birthDate) : null;
  }

  const updated = await prisma.user.update({
    where: { clerkId: userId },
    data,
  });

  return NextResponse.json(updated);
}
