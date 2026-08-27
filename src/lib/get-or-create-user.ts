import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * Ambil user dari DB berdasarkan clerkId.
 * Jika belum ada (user baru, webhook belum jalan), buat dulu dari data Clerk.
 * Menggunakan upsert & fallback try-catch untuk menangani race condition
 * saat layout dan page dieksekusi secara paralel di Server Components.
 */
export async function getOrCreateUser(clerkId: string) {
  const existing = await prisma.user.findUnique({ where: { clerkId } });
  if (existing) return existing;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const fullName =
    clerkUser.fullName ||
    `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() ||
    "User";

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? null;
  const avatarUrl = clerkUser.imageUrl ?? null;
  const firstName = clerkUser.firstName ?? null;
  const lastName = clerkUser.lastName ?? null;

  try {
    return await prisma.user.upsert({
      where: { clerkId },
      update: {},
      create: {
        clerkId,
        fullName,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        email: email || undefined,
        avatarUrl: avatarUrl || undefined,
      },
    });
  } catch (error) {
    // Jika terjadi race condition (misal layout & page create bersamaan), ambil data yang sudah tersimpan
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (user) return user;
    throw error;
  }
}
