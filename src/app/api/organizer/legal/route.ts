import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const {
    docType,
    ktpNumber, ktpName, ktpAddress, ktpImageUrl,
    npwpNumber, npwpName, npwpAddress, npwpImageUrl,
    adNumber, adName, adAddress, adImageUrl,
    nibNumber,
  } = body;

  const doc = await prisma.organizerLegalDoc.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      docType: docType ?? "INDIVIDU",
      ktpNumber, ktpName, ktpAddress, ktpImageUrl,
      npwpNumber, npwpName, npwpAddress, npwpImageUrl,
      adNumber, adName, adAddress, adImageUrl,
      nibNumber,
      status: "PENDING",
      submittedAt: new Date(),
    },
    update: {
      docType: docType ?? "INDIVIDU",
      ktpNumber, ktpName, ktpAddress, ktpImageUrl,
      npwpNumber, npwpName, npwpAddress, npwpImageUrl,
      adNumber, adName, adAddress, adImageUrl,
      nibNumber,
      status: "PENDING",
      submittedAt: new Date(),
    },
  });

  return NextResponse.json(doc);
}
