import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const VALID_ROLES = ["ADMIN", "MODERATOR", "ORGANIZER", "SELLER", "MEMBER"] as const;
type UserRole = (typeof VALID_ROLES)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  // Cegah admin men-demote dirinya sendiri
  if (id === admin.id && body.role && body.role !== "ADMIN") {
    return NextResponse.json({ error: "Tidak bisa mengubah role diri sendiri" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  if (typeof body.isVerified === "boolean") {
    data.isVerified = body.isVerified;
    data.verifiedAt = body.isVerified ? new Date() : null;
  }

  if (body.role && VALID_ROLES.includes(body.role as UserRole)) {
    data.role = body.role as UserRole;
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, fullName: true, role: true, isVerified: true },
  });

  return NextResponse.json(updated);
}
