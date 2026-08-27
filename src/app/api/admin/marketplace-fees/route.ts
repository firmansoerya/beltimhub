import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getMarketplaceFeeConfig } from "@/lib/marketplace-fees";
import { z } from "zod";

async function requireAdmin() {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { role: true } });
  return user?.role === "ADMIN" ? user : null;
}

const schema = z.object({
  buyerFeePercent: z.number().min(0).max(20),
  sellerFeePercent: z.number().min(0).max(20),
  buyerFeeMinimum: z.number().int().min(0),
  sellerFeeMinimum: z.number().int().min(0),
  withdrawalFee: z.number().int().min(0).optional(),
  withdrawalMinimum: z.number().int().min(0).optional(),
});

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const config = await getMarketplaceFeeConfig();
  return NextResponse.json(config);
}

export async function PUT(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await Promise.all(
    Object.entries(parsed.data).map(([key, value]) =>
      prisma.siteSetting.upsert({
        where: { key: `marketplace_${key}` },
        update: { value: String(value) },
        create: { key: `marketplace_${key}`, value: String(value) },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
