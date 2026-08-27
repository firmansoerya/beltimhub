import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getMarketplaceFeeConfig } from "@/lib/marketplace-fees";

const createSchema = z.object({
  amount: z.number().int().positive(),
  umkmId: z.string(),
});

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

  const withdrawals = await prisma.sellerWithdrawal.findMany({
    where: { sellerId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { umkm: { select: { name: true } } },
  });

  return NextResponse.json(withdrawals.map(w => ({
    ...w,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
    processedAt: w.processedAt?.toISOString() ?? null,
    completedAt: w.completedAt?.toISOString() ?? null,
    failedAt: w.failedAt?.toISOString() ?? null,
  })));
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });

  const { amount, umkmId } = parsed.data;

  // Verify UMKM belongs to user and has bank info
  const umkm = await prisma.umkm.findFirst({
    where: { id: umkmId, ownerId: user.id, marketplaceStatus: "APPROVED" },
    select: { id: true, name: true, bankName: true, bankAccountNumber: true, bankAccountName: true },
  });
  if (!umkm) return NextResponse.json({ error: "UMKM tidak ditemukan atau belum disetujui" }, { status: 404 });
  if (!umkm.bankName || !umkm.bankAccountNumber || !umkm.bankAccountName) {
    return NextResponse.json({ error: "Info bank belum lengkap. Atur di pengaturan toko." }, { status: 400 });
  }

  // Get fee config
  const feeConfig = await getMarketplaceFeeConfig();

  if (amount < feeConfig.withdrawalMinimum) {
    return NextResponse.json({ error: `Minimum penarikan Rp${feeConfig.withdrawalMinimum.toLocaleString("id-ID")}` }, { status: 400 });
  }

  const withdrawalFee = feeConfig.withdrawalFee;
  const netAmount = amount - withdrawalFee;

  if (netAmount <= 0) {
    return NextResponse.json({ error: "Jumlah penarikan harus lebih besar dari biaya penarikan" }, { status: 400 });
  }

  // Check available balance
  const balance = await prisma.sellerBalance.findUnique({ where: { sellerId: user.id } });
  if (!balance || balance.availableBalance < amount) {
    return NextResponse.json({ error: "Saldo tidak mencukupi" }, { status: 400 });
  }

  // Check no pending withdrawal (prevent spam)
  const pendingCount = await prisma.sellerWithdrawal.count({
    where: { sellerId: user.id, status: { in: ["PENDING", "PROCESSING"] } },
  });
  if (pendingCount > 0) {
    return NextResponse.json({ error: "Masih ada penarikan yang sedang diproses. Tunggu hingga selesai." }, { status: 400 });
  }

  // Create withdrawal in transaction
  const withdrawal = await prisma.$transaction(async (tx) => {
    // Decrement available balance, increment pending
    await tx.sellerBalance.update({
      where: { sellerId: user.id },
      data: {
        availableBalance: { decrement: amount },
        totalPending: { increment: amount },
      },
    });

    const wd = await tx.sellerWithdrawal.create({
      data: {
        sellerId: user.id,
        umkmId,
        amount,
        withdrawalFee,
        netAmount,
        status: "PENDING",
        bankName: umkm.bankName!,
        bankAccountNumber: umkm.bankAccountNumber!,
        bankAccountName: umkm.bankAccountName!,
        xenditExternalId: `WD-${Date.now()}-${user.id.slice(-6)}`,
      },
    });

    await tx.balanceLedger.create({
      data: {
        sellerId: user.id,
        type: "WITHDRAWAL_CREATED",
        amount: -amount,
        referenceId: wd.id,
        note: `Penarikan Rp${amount.toLocaleString("id-ID")} ke ${umkm.bankName} (fee: Rp${withdrawalFee.toLocaleString("id-ID")})`,
      },
    });

    return wd;
  });

  return NextResponse.json(withdrawal);
}
