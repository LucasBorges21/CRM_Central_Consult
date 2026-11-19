/** Acesso ao banco do módulo Histórico. Registros são imutáveis (somente inclusão). */
import { prisma, type Db } from "@/shared/db";

export type NovoRegistro = {
  oportunidadeId: string;
  data?: Date;
  tipo: string;
  descricao: string;
  canal?: string | null;
  resumo?: string | null;
  combinado?: string | null;
  etapaAnterior?: string | null;
  etapaNova?: string | null;
};

export const repositorioHistorico = {
  criar: (registro: NovoRegistro, db: Db = prisma) => db.historico.create({ data: registro }),
  listarPorOportunidade: (oportunidadeId: string, db: Db = prisma) =>
    db.historico.findMany({
      where: { oportunidadeId },
      orderBy: [{ data: "desc" }, { criadoEm: "desc" }],
    }),
  listarPorOportunidades: (oportunidadeIds: string[], db: Db = prisma) =>
    db.historico.findMany({
      where: { oportunidadeId: { in: oportunidadeIds } },
      include: { oportunidade: { select: { id: true, titulo: true } } },
      orderBy: [{ data: "desc" }, { criadoEm: "desc" }],
    }),
  recentes: (limite: number, db: Db = prisma) =>
    db.historico.findMany({
      take: limite,
      include: {
        oportunidade: { select: { id: true, titulo: true, responsavel: { select: { nome: true } } } },
      },
      orderBy: [{ data: "desc" }, { criadoEm: "desc" }],
    }),
};
