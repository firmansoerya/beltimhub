import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { role: true } });
  return user?.role === "ADMIN" ? user : null;
}

// PATCH /api/admin/news-sources/[id] — update source
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { name, siteUrl, rssUrl, keywords, isActive } = body;

  try {
    const updated = await prisma.newsSource.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(siteUrl !== undefined && { siteUrl: siteUrl.trim() }),
        ...(rssUrl !== undefined && { rssUrl: rssUrl ? rssUrl.trim() : "" }),
        ...(keywords !== undefined && {
          keywords: (keywords as string[]).map((k: string) => k.trim().toLowerCase()).filter(Boolean),
        }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Gagal mengupdate" }, { status: 500 });
  }
}

// DELETE /api/admin/news-sources/[id] — delete source
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.newsSource.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 });
  }
}
