import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

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
  const body: { action: "approve" | "reject"; notes?: string } = await req.json();

  const request = await prisma.verificationRequest.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.action === "approve") {
    await prisma.$transaction([
      prisma.verificationRequest.update({
        where: { id },
        data: { status: "APPROVED", reviewedAt: new Date(), adminNotes: null },
      }),
      prisma.user.update({
        where: { id: request.userId },
        data: { isVerified: true, verifiedAt: new Date() },
      }),
    ]);
  } else {
    await prisma.verificationRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewedAt: new Date(),
        adminNotes: body.notes ?? "Dokumen tidak valid",
      },
    });
  }

  return NextResponse.json({ ok: true });
}
