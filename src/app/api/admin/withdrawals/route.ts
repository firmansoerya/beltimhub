import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { role: true } });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where = status && status !== "all" ? { status: status as "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "REJECTED" } : {};

  const withdrawals = await prisma.sellerWithdrawal.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      seller: { select: { fullName: true, email: true } },
      umkm: { select: { name: true } },
    },
  });

  // Summary stats
  const [pendingCount, totalDisbursed] = await Promise.all([
    prisma.sellerWithdrawal.count({ where: { status: "PENDING" } }),
    prisma.sellerWithdrawal.aggregate({ where: { status: "COMPLETED" }, _sum: { netAmount: true } }),
  ]);

  return NextResponse.json({
    withdrawals: withdrawals.map(w => ({
      ...w,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
      processedAt: w.processedAt?.toISOString() ?? null,
      completedAt: w.completedAt?.toISOString() ?? null,
      failedAt: w.failedAt?.toISOString() ?? null,
    })),
    stats: {
      pendingCount,
      totalDisbursed: totalDisbursed._sum.netAmount ?? 0,
    },
  });
}
