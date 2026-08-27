import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { role: true } });
  return user?.role === "ADMIN" ? user : null;
}

// GET /api/admin/news-sources — list all sources
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sources = await prisma.newsSource.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { news: true } } },
  });

  return NextResponse.json(sources);
}

// POST /api/admin/news-sources — create new source
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, siteUrl, rssUrl, keywords } = body;

  if (!name?.trim() || !siteUrl?.trim()) {
    return NextResponse.json({ error: "Nama dan URL situs wajib diisi" }, { status: 400 });
  }

  const cleanKeywords = Array.isArray(keywords)
    ? keywords.map((k: string) => k.trim().toLowerCase()).filter(Boolean)
    : [];

  try {
    const source = await prisma.newsSource.create({
      data: {
        name: name.trim(),
        siteUrl: siteUrl.trim(),
        rssUrl: rssUrl?.trim() || "",
        keywords: cleanKeywords,
        isActive: true,
      },
    });
    return NextResponse.json(source, { status: 201 });
  } catch (e: unknown) {
    console.error("[POST /api/admin/news-sources Error]:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "Situs atau RSS URL sudah terdaftar" }, { status: 409 });
    }
    return NextResponse.json({ error: `Gagal menyimpan: ${msg}` }, { status: 500 });
  }
}
