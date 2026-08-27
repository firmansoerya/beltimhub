import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const applySchema = z.object({
  ktpName: z.string().min(3, "Nama sesuai KTP wajib diisi"),
  ktpNumber: z.string().min(10, "Nomor KTP wajib diisi"),
  ktpImageUrl: z.string().min(1, "Foto KTP wajib diupload"),
  nibNumber: z.string().optional(),
  nibImageUrl: z.string().optional(),
  bankName: z.string().min(2, "Nama bank wajib diisi"),
  bankAccountNumber: z.string().min(5, "Nomor rekening wajib diisi"),
  bankAccountName: z.string().min(3, "Nama pemilik rekening wajib diisi"),
  storePhotos: z.array(z.string()).min(1, "Upload minimal 1 foto toko/produk"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;
  const umkm = await prisma.umkm.findUnique({
    where: { id },
    select: { ownerId: true, marketplaceStatus: true },
  });
  if (!umkm) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (umkm.ownerId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (umkm.marketplaceStatus === "PENDING_REVIEW") {
    return NextResponse.json({ error: "Pengajuan sudah dalam proses review" }, { status: 400 });
  }
  if (umkm.marketplaceStatus === "APPROVED") {
    return NextResponse.json({ error: "Toko sudah aktif di Pasar Lokal" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = applySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;
  const updated = await prisma.umkm.update({
    where: { id },
    data: {
      marketplaceStatus: "PENDING_REVIEW",
      marketplaceAppliedAt: new Date(),
      marketplaceRejectedReason: null,
      verificationKtpName: d.ktpName,
      verificationKtpNumber: d.ktpNumber,
      verificationKtpImageUrl: d.ktpImageUrl,
      verificationNibNumber: d.nibNumber ?? null,
      verificationNibImageUrl: d.nibImageUrl ?? null,
      bankName: d.bankName,
      bankAccountNumber: d.bankAccountNumber,
      bankAccountName: d.bankAccountName,
      verificationStorePhotos: d.storePhotos,
    },
  });

  return NextResponse.json({ id: updated.id, marketplaceStatus: updated.marketplaceStatus });
}
