import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  isActive: z.boolean().optional(),
  title: z.string().min(5).max(150).optional(),
  company: z.string().min(2).max(100).optional(),
  type: z.enum(["Full-time", "Part-time", "Freelance", "Magang"]).optional(),
  description: z.string().min(20).optional(),
  salary: z.string().optional(),
  location: z.string().optional(),
  contact: z.string().min(5).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;
  const job = await prisma.jobListing.findUnique({ where: { id }, select: { posterId: true } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.posterId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.jobListing.update({ where: { id }, data: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;
  const job = await prisma.jobListing.findUnique({ where: { id }, select: { posterId: true } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.posterId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.jobListing.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
