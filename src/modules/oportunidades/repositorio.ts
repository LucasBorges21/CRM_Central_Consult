/** Acesso ao banco do módulo Oportunidades. */
import type { Prisma } from "@prisma/client";
import { prisma, type Db } from "@/shared/db";
import type { AlteracoesDeEtapa } from "./dominio";

export type FiltrosOportunidade = {
  eventoId?: string | null;
  tipoVenda?: string | null;
  responsavelId?: string | null;
};

export function whereFiltros(f: FiltrosOportunidade = {}): Prisma.OportunidadeWhereInput {
  return {
    ...(f.eventoId ? { eventoId: f.eventoId } : {}),
    ...(f.tipoVenda ? { tipoVenda: f.tipoVenda } : {}),
    ...(f.responsavelId ? { responsavelId: f.responsavelId } : {}),
  };
}

const incluirResumo = {
  evento: { select: { id: true, nome: true } },
  responsavel: { select: { id: true, nome: true } },
  contato: { select: { id: true, nome: true, sobrenome: true } },
  empresa: { select: { id: true, nome: true } },
} satisfies Prisma.OportunidadeInclude;

export type DadosGravacaoOportunidade = {
  titulo: string;
  eventoId: string;
  tipoVenda: string;
  empresaId: string | null;
  contatoId: string;
  origemLead: string;
  responsavelId: string;
  valorEstimadoCentavos: number;
};

export const repositorioOportunidades = {
  criar: (dados: DadosGravacaoOportunidade & { etapa: string }, db: Db = prisma) =>
    db.oportunidade.create({ data: dados }),

  atualizarDados: (id: string, dados: DadosGravacaoOportunidade, db: Db = prisma) =>
    db.oportunidade.update({ where: { id }, data: dados }),

  aplicarEtapa: (id: string, alteracoes: AlteracoesDeEtapa, db: Db = prisma) =>
    db.oportunidade.update({ where: { id }, data: alteracoes }),

  atualizarPagamento: (id: string, statusPagamento: string, db: Db = prisma) =>
    db.oportunidade.update({ where: { id }, data: { statusPagamento } }),

  obterBasico: (id: string, db: Db = prisma) => db.oportunidade.findUnique({ where: { id } }),

  obterDetalhe: (id: string, db: Db = prisma) =>
    db.oportunidade.findUnique({
      where: { id },
      include: {
        evento: true,
        responsavel: true,
        contato: {
          include: {
            empresa: { select: { id: true, nome: true } },
            telefones: { orderBy: [{ principal: "desc" }, { criadoEm: "asc" }] },
          },
        },
        empresa: true,
      },
    }),

  listar: (filtros: FiltrosOportunidade, db: Db = prisma) =>
    db.oportunidade.findMany({
      where: whereFiltros(filtros),
      include: incluirResumo,
      orderBy: { atualizadoEm: "desc" },
    }),

  listarPorEmpresa: (empresaId: string, db: Db = prisma) =>
    db.oportunidade.findMany({
      where: { empresaId },
      include: incluirResumo,
      orderBy: { criadoEm: "desc" },
    }),

  listarPorContato: (contatoId: string, db: Db = prisma) =>
    db.oportunidade.findMany({
      where: { contatoId },
      include: incluirResumo,
      orderBy: { criadoEm: "desc" },
    }),

  porContato: (contatoIds: string[], db: Db = prisma) =>
    db.oportunidade.findMany({
      where: { contatoId: { in: contatoIds } },
      select: { contatoId: true, etapa: true, valorEstimadoCentavos: true },
    }),

  contatosComEtapas: (etapas: readonly string[], db: Db = prisma) =>
    db.oportunidade.findMany({ where: { etapa: { in: [...etapas] } }, select: { contatoId: true }, distinct: ["contatoId"] }),

  contar: (filtros: FiltrosOportunidade, etapas: readonly string[], db: Db = prisma) =>
    db.oportunidade.count({ where: { ...whereFiltros(filtros), etapa: { in: [...etapas] } } }),

  resumoFechadas: (filtros: FiltrosOportunidade, db: Db = prisma) =>
    db.oportunidade.aggregate({
      where: { ...whereFiltros(filtros), etapa: "FECHADO" },
      _count: { _all: true },
      _sum: { valorFinalCentavos: true },
    }),

  agruparPorEtapa: (filtros: FiltrosOportunidade, db: Db = prisma) =>
    db.oportunidade.groupBy({
      by: ["etapa"],
      where: whereFiltros(filtros),
      _count: { _all: true },
      _sum: { valorEstimadoCentavos: true, valorFinalCentavos: true },
    }),

  agruparPorEventoEtapa: (filtros: FiltrosOportunidade, db: Db = prisma) =>
    db.oportunidade.groupBy({
      by: ["eventoId", "etapa"],
      where: whereFiltros(filtros),
      _count: { _all: true },
      _sum: { valorEstimadoCentavos: true, valorFinalCentavos: true },
    }),

  somarEstimado: (filtros: FiltrosOportunidade, etapas: readonly string[], db: Db = prisma) =>
    db.oportunidade.aggregate({
      where: { ...whereFiltros(filtros), etapa: { in: [...etapas] } },
      _sum: { valorEstimadoCentavos: true },
    }),

  pagamentosPendentes: (filtros: FiltrosOportunidade, db: Db = prisma) =>
    db.oportunidade.aggregate({
      where: { ...whereFiltros(filtros), etapa: "FECHADO", statusPagamento: "PENDENTE" },
      _count: { _all: true },
      _sum: { valorFinalCentavos: true },
    }),
};
