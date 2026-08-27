import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl || databaseUrl.includes("randompassword")) {
    const adapter = new PrismaPg({ connectionString: "postgresql://localhost/dev" });
    return new PrismaClient({ adapter, log: ["error"] });
  }

  // PrismaPg menerima PoolConfig — pool-nya dikelola internal oleh adapter
  const adapter = new PrismaPg({
    connectionString: databaseUrl,
    max: 5,
    idleTimeoutMillis: 60_000,
    connectionTimeoutMillis: 15_000,
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

// Re-instantiate if global.prisma is outdated (e.g. after prisma generate during dev)
const existing = global.prisma;
export const prisma =
  existing && "newsSource" in existing
    ? existing
    : createPrismaClient();

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
