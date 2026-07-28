import { PrismaClient } from "@prisma/client";

export * from "@prisma/client";

export type { PrismaClient };

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * Singleton de PrismaClient. En dev, Nest recarga módulos y crearía una
 * conexión nueva por cada hot-reload si no se guarda en global.
 */
export const prisma = globalThis.__prisma ?? new PrismaClient();

if (process.env["NODE_ENV"] !== "production") {
  globalThis.__prisma = prisma;
}
