import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createDisbursement, BANK_NAME_TO_CODE } from "@/lib/xendit-disbursement";

const actionSchema = z.object({
  action: z.enum(["approve", "reject", "simulate_complete"]),
  reason: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await prisma.user.findUnique({ where: { clerkId: userId }, select: { role: true } });
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });

  const { action, reason } = parsed.data;

  const withdrawal = await prisma.sellerWithdrawal.findUnique({ where: { id } });
  if (!withdrawal) return NextResponse.json({ error: "Penarikan tidak ditemukan" }, { status: 404 });

  // Dev-only: simulate complete (skip Xendit disbursement)
  if (action === "simulate_complete") {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Not available in production" }, { status: 403 });
    }
    if (!["PENDING", "PROCESSING"].includes(withdrawal.status)) {
      return NextResponse.json({ error: `Tidak bisa simulate, status: ${withdrawal.status}` }, { status: 400 });
    }
    const now = new Date();
    await prisma.$transaction([
      prisma.sellerWithdrawal.update({
        where: { id },
        data: { status: "COMPLETED", processedAt: withdrawal.processedAt ?? now, completedAt: now },
      }),
      prisma.sellerBalance.update({
        where: { sellerId: withdrawal.sellerId },
        data: {
          totalPending: { decrement: withdrawal.amount },
          totalWithdrawn: { increment: withdrawal.netAmount },
        },
      }),
      prisma.balanceLedger.create({
        data: {
          sellerId: withdrawal.sellerId,
          type: "WITHDRAWAL_COMPLETED",
          amount: withdrawal.netAmount,
          referenceId: id,
          note: `Pencairan ${withdrawal.xenditExternalId ?? id} selesai (simulasi)`,
        },
      }),
    ]);
    return NextResponse.json({ success: true, status: "COMPLETED", method: "simulate" });
  }

  // Approve/reject hanya untuk PENDING
  if (withdrawal.status !== "PENDING") {
    return NextResponse.json({ error: `Penarikan sudah berstatus ${withdrawal.status}` }, { status: 400 });
  }

  if (action === "reject") {
    // Reject: refund balance back to seller
    await prisma.$transaction([
      prisma.sellerWithdrawal.update({
        where: { id },
        data: { status: "REJECTED", rejectedReason: reason, adminNote: reason },
      }),
      prisma.sellerBalance.update({
        where: { sellerId: withdrawal.sellerId },
        data: {
          availableBalance: { increment: withdrawal.amount },
          totalPending: { decrement: withdrawal.amount },
        },
      }),
      prisma.balanceLedger.create({
        data: {
          sellerId: withdrawal.sellerId,
          type: "WITHDRAWAL_REJECTED",
          amount: withdrawal.amount,
          referenceId: id,
          note: `Penarikan ditolak: ${reason ?? "Ditolak oleh admin"}`,
        },
      }),
    ]);
    return NextResponse.json({ success: true, status: "REJECTED" });
  }

  // Approve: send disbursement via Xendit
  const bankCode = BANK_NAME_TO_CODE[withdrawal.bankName];
  if (!bankCode) {
    return NextResponse.json({ error: `Kode bank tidak ditemukan untuk "${withdrawal.bankName}". Hubungi developer.` }, { status: 400 });
  }

  try {
    const disbursement = await createDisbursement({
      externalId: withdrawal.xenditExternalId!,
      bankCode,
      accountHolderName: withdrawal.bankAccountName,
      accountNumber: withdrawal.bankAccountNumber,
      amount: withdrawal.netAmount,
      description: `Pencairan dana BeltimHub - ${withdrawal.xenditExternalId}`,
    });

    await prisma.sellerWithdrawal.update({
      where: { id },
      data: {
        status: "PROCESSING",
        xenditDisbursementId: disbursement.id,
        processedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, status: "PROCESSING", xenditId: disbursement.id });
  } catch (err) {
    // Disbursement API failed — keep as PENDING so admin can retry
    return NextResponse.json({
      error: `Gagal mengirim ke Xendit: ${err instanceof Error ? err.message : "Unknown error"}`,
    }, { status: 500 });
  }
}
