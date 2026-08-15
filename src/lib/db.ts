import { PrismaClient } from "@prisma/client";

const PRISMA_CLIENT_STAMP = "year-sortorder-1";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaStamp?: string;
};

if (globalForPrisma.prisma && globalForPrisma.prismaStamp !== PRISMA_CLIENT_STAMP) {
  void globalForPrisma.prisma.$disconnect();
  globalForPrisma.prisma = undefined;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaStamp = PRISMA_CLIENT_STAMP;
}
