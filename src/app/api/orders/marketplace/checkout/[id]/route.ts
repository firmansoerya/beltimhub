import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

  const { id } = await params;

  const session = await prisma.checkoutSession.findUnique({
    where: { id },
    include: {
      orders: {
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, images: true } },
            },
          },
          seller: { select: { fullName: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Checkout session tidak ditemukan" }, { status: 404 });
  }

  // Hanya buyer yang bisa lihat
  if (session.buyerId !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json(session);
}
