import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseShippingConfig, type ShippingConfig } from "@/lib/constants";

// GET /api/marketplace/shipping?umkmIds=id1,id2,id3
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ids = searchParams.get("umkmIds")?.split(",").filter(Boolean) ?? [];

  if (ids.length === 0) {
    return NextResponse.json({});
  }

  const umkmList = await prisma.umkm.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      shippingConfig: true,
    },
  });

  const result: Record<string, ShippingConfig> = {};

  for (const u of umkmList) {
    result[u.id] = parseShippingConfig(u.shippingConfig);
  }

  return NextResponse.json(result);
}
