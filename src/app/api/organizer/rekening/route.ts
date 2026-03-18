import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { bankName, bankCode, accountNumber, accountName } = await req.json();

  if (!bankName || !bankCode || !accountNumber || !accountName) {
    return NextResponse.json({ error: "Semua field wajib diisi" }, { status: 400 });
  }

  const account = await prisma.organizerBankAccount.upsert({
    where: { userId: user.id },
    create: { userId: user.id, bankName, bankCode, accountNumber, accountName },
    update: { bankName, bankCode, accountNumber, accountName },
  });

  return NextResponse.json(account);
}
