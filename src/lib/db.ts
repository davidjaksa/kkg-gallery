import { PrismaClient } from "@prisma/client";

const PRISMA_CLIENT_STAMP = "nested-albums-1";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaStamp?: string;
};

if (globalForPrisma.prisma && globalForPrisma.prismaStamp !== PRISMA_CLIENT_STAMP) {
  void globalForPrisma.prisma.$disconnect();
  globalForPrisma.prisma = undefined;
}

function sqliteUrl(url: string | undefined) {
  if (!url?.startsWith("file:") || url.includes("connection_limit=")) return url;
  return url.includes("?") ? `${url}&connection_limit=1` : `${url}?connection_limit=1`;
}

const databaseUrl = sqliteUrl(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaStamp = PRISMA_CLIENT_STAMP;
}
