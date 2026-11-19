import { PrismaClient, type Prisma } from "@prisma/client";

/** Conexão única com o banco, compartilhada por todos os módulos. */
const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalParaPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalParaPrisma.prisma = prisma;

/** Cliente de transação (recebido em `prisma.$transaction(async (tx) => ...)`). */
export type Tx = Prisma.TransactionClient;
/** Qualquer cliente: o global ou o de uma transação em andamento. */
export type Db = PrismaClient | Tx;
