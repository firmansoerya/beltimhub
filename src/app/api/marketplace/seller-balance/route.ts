import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

  // Source of truth: hitung actual earnings dari semua order COMPLETED
  const result = await prisma.marketplaceOrder.aggregate({
    where: { sellerId: user.id, orderStatus: "COMPLETED" },
    _sum: { sellerAmount: true },
  });
  const actualEarnings = result._sum.sellerAmount ?? 0;

  let balance = await prisma.sellerBalance.findUnique({ where: { sellerId: user.id } });

  // Sync: pastikan totalEarnings = actual, dan recalculate availableBalance
  if (actualEarnings > 0 && (!balance || balance.totalEarnings !== actualEarnings)) {
    const withdrawn = balance?.totalWithdrawn ?? 0;
    const pending = balance?.totalPending ?? 0;
    const available = actualEarnings - withdrawn - pending;

    balance = await prisma.sellerBalance.upsert({
      where: { sellerId: user.id },
      create: {
        sellerId: user.id,
        totalEarnings: actualEarnings,
        availableBalance: actualEarnings,
        totalWithdrawn: 0,
        totalPending: 0,
      },
      update: {
        totalEarnings: actualEarnings,
        availableBalance: available,
      },
    });
  }

  return NextResponse.json({
    totalEarnings: balance?.totalEarnings ?? 0,
    totalWithdrawn: balance?.totalWithdrawn ?? 0,
    totalPending: balance?.totalPending ?? 0,
    availableBalance: balance?.availableBalance ?? 0,
  });
}
