import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject"), reason: z.string().min(5, "Alasan penolakan wajib diisi") }),
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ umkmId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await prisma.user.findUnique({ where: { clerkId: userId }, select: { role: true } });
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { umkmId } = await params;
  const umkm = await prisma.umkm.findUnique({ where: { id: umkmId }, select: { id: true, marketplaceStatus: true } });
  if (!umkm) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.action === "approve") {
    const updated = await prisma.umkm.update({
      where: { id: umkmId },
      data: {
        marketplaceStatus: "APPROVED",
        marketplaceRejectedReason: null,
      },
    });
    return NextResponse.json(updated);
  } else {
    const updated = await prisma.umkm.update({
      where: { id: umkmId },
      data: {
        marketplaceStatus: "REJECTED",
        marketplaceRejectedReason: parsed.data.reason,
      },
    });
    return NextResponse.json(updated);
  }
}
