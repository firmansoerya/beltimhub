import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createJobSchema = z.object({
  title: z.string().min(5, "Minimal 5 karakter").max(150),
  company: z.string().min(2, "Minimal 2 karakter").max(100),
  location: z.string().optional(),
  description: z.string().min(20).max(5000),
  salary: z.string().optional(),
  type: z.enum(["Full-time", "Part-time", "Freelance", "Magang"]),
  contact: z.string().min(5, "Masukkan kontak (HP/email)"),
  expiresAt: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const q = searchParams.get("q");

  const where = {
    isActive: true,
    ...(type && type !== "Semua" ? { type } : {}),
    ...(q ? {
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { company: { contains: q, mode: "insensitive" as const } },
        { description: { contains: q, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  const items = await prisma.jobListing.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { poster: { select: { id: true, fullName: true } } },
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getOrCreateUser(userId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();
  const parsed = createJobSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const job = await prisma.jobListing.create({
    data: {
      ...parsed.data,
      posterId: user.id,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
    },
  });

  return NextResponse.json(job, { status: 201 });
}
