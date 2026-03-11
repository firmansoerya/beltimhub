import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * Ambil user dari DB berdasarkan clerkId.
 * Jika belum ada (user baru, webhook belum jalan), buat dulu dari data Clerk.
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

  return prisma.user.create({
    data: {
      clerkId,
      fullName,
      email: clerkUser.emailAddresses[0]?.emailAddress,
      avatarUrl: clerkUser.imageUrl,
    },
  });
}
