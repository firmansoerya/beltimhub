import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { SITE_SETTINGS_DEFAULTS } from "@/lib/site-settings";
import { z } from "zod";

const schema = z.object({
  brandName: z.string().min(1),
  brandWebsite: z.string().min(1),
  brandTagline: z.string(),
  supportEmail: z.string().email(),
  supportWhatsapp: z.string(),
  socialFacebook: z.string(),
  socialInstagram: z.string(),
  socialYoutube: z.string(),
  socialTiktok: z.string(),
  pageTentang: z.string(),
  pageSyarat: z.string(),
  pagePrivasi: z.string(),
  pageRefund: z.string(),
});

async function requireAdmin() {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { role: true } });
  return user?.role === "ADMIN" ? user : null;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.siteSetting.findMany();
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  const settings = Object.fromEntries(
    Object.keys(SITE_SETTINGS_DEFAULTS).map(k => [k, map[k] ?? SITE_SETTINGS_DEFAULTS[k as keyof typeof SITE_SETTINGS_DEFAULTS]])
  );
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await Promise.all(
    Object.entries(parsed.data).map(([key, value]) =>
      prisma.siteSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
