/**
 * Minimal Prisma client stub for Phase 1.
 * Real Prisma schema, migrations, and generated client will be established in the dedicated backend phase.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PrismaClientStub = any;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientStub | undefined;
};

export const prisma = globalForPrisma.prisma ?? null;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
