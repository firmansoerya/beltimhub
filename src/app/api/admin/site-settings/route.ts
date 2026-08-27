import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { SITE_SETTINGS_DEFAULTS, getFeaturesConfig } from "@/lib/site-settings";
import { z } from "zod";

const featureItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  href: z.string().min(1),
  iconName: z.string().default("Sparkles"),
  description: z.string().optional(),
  enabled: z.boolean(),
  isCustom: z.boolean().optional(),
});

const schema = z.object({
  brandName: z.string().min(1).optional(),
  brandWebsite: z.string().min(1).optional(),
  brandTagline: z.string().optional(),
  supportEmail: z.string().email().optional(),
  supportWhatsapp: z.string().optional(),
  socialFacebook: z.string().optional(),
  socialInstagram: z.string().optional(),
  socialYoutube: z.string().optional(),
  socialTiktok: z.string().optional(),
  pageTentang: z.string().optional(),
  pageSyarat: z.string().optional(),
  pagePrivasi: z.string().optional(),
  pageRefund: z.string().optional(),
  featuresConfig: z.array(featureItemSchema).optional(),
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
  const featuresConfig = await getFeaturesConfig();

  return NextResponse.json({ ...settings, featuresConfig });
}

export async function PUT(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { featuresConfig, ...restSettings } = parsed.data;

  const upsertPromises: Promise<unknown>[] = [];

  // Update site settings key-values
  for (const [key, value] of Object.entries(restSettings)) {
    if (value !== undefined) {
      upsertPromises.push(
        prisma.siteSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      );
    }
  }

  // Update features_config JSON
  if (featuresConfig !== undefined) {
    upsertPromises.push(
      prisma.siteSetting.upsert({
        where: { key: "features_config" },
        update: { value: JSON.stringify(featuresConfig) },
        create: { key: "features_config", value: JSON.stringify(featuresConfig) },
      })
    );
  }

  await Promise.all(upsertPromises);

  return NextResponse.json({ ok: true });
}
