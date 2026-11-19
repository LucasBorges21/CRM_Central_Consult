/** Acesso ao banco do módulo Agenda. */
import type { Prisma } from "@prisma/client";
import { prisma, type Db } from "@/shared/db";
import { ETAPAS_ABERTAS } from "@/modules/oportunidades/dominio";

/** Filtros pela oportunidade vinculada (usados pelo Painel). */
export type FiltrosTarefaPorOportunidade = { eventoId?: string | null; tipoVenda?: string | null };

function deOportunidadeAberta(f: FiltrosTarefaPorOportunidade = {}): Prisma.TarefaWhereInput {
  return {
    oportunidade: {
      is: {
        etapa: { in: [...ETAPAS_ABERTAS] },
        ...(f.eventoId ? { eventoId: f.eventoId } : {}),
        ...(f.tipoVenda ? { tipoVenda: f.tipoVenda } : {}),
      },
    },
  };
}

/** Fila de retornos: tarefas de oportunidades abertas ou tarefas só do contato (sem oportunidade). */
const naFilaDeRetornos: Prisma.TarefaWhereInput = {
  OR: [deOportunidadeAberta(), { oportunidadeId: null, contatoId: { not: null } }],
};

const contatoResumo = {
  select: { id: true, nome: true, sobrenome: true, empresa: { select: { nome: true } } },
} as const;

export const repositorioAgenda = {
  criar: (
    dados: { oportunidadeId: string | null; contatoId: string | null; descricao: string; prazo: Date; responsavelId: string },
    db: Db = prisma,
  ) => db.tarefa.create({ data: { ...dados, situacao: "PENDENTE" } }),

  obter: (id: string, db: Db = prisma) => db.tarefa.findUnique({ where: { id } }),

  concluir: (id: string, quando: Date, db: Db = prisma) =>
    db.tarefa.update({ where: { id }, data: { situacao: "CONCLUIDA", concluidaEm: quando } }),

  reagendar: (id: string, prazo: Date, db: Db = prisma) => db.tarefa.update({ where: { id }, data: { prazo } }),

  listarFila: (responsavelId: string | null, db: Db = prisma) =>
    db.tarefa.findMany({
      where: { situacao: "PENDENTE", ...naFilaDeRetornos, ...(responsavelId ? { responsavelId } : {}) },
      include: {
        responsavel: { select: { id: true, nome: true } },
        contato: contatoResumo,
        oportunidade: {
          select: {
            id: true,
            titulo: true,
            etapa: true,
            evento: { select: { nome: true } },
            contato: { select: { nome: true, sobrenome: true } },
            empresa: { select: { nome: true } },
          },
        },
      },
      orderBy: [{ prazo: "asc" }, { criadoEm: "asc" }],
    }),

  pendentesPorOportunidade: (ids: string[], db: Db = prisma) =>
    db.tarefa.groupBy({
      by: ["oportunidadeId"],
      where: { situacao: "PENDENTE", oportunidadeId: { in: ids } },
      _count: { _all: true },
    }),

  daOportunidade: (oportunidadeId: string, db: Db = prisma) =>
    db.tarefa.findMany({
      where: { oportunidadeId },
      include: { responsavel: { select: { id: true, nome: true } } },
      orderBy: [{ prazo: "asc" }, { criadoEm: "asc" }],
    }),

  /** Tarefas diretas do contato e das oportunidades em que ele é o contato principal. */
  doContato: (contatoId: string, db: Db = prisma) =>
    db.tarefa.findMany({
      where: { OR: [{ contatoId }, { oportunidade: { is: { contatoId } } }] },
      include: {
        responsavel: { select: { id: true, nome: true } },
        oportunidade: { select: { id: true, titulo: true, etapa: true } },
      },
      orderBy: [{ prazo: "asc" }, { criadoEm: "asc" }],
    }),

  pendentesDosContatos: (ids: string[], db: Db = prisma) =>
    db.tarefa.findMany({
      where: {
        situacao: "PENDENTE",
        OR: [{ contatoId: { in: ids } }, { oportunidade: { is: { contatoId: { in: ids } } } }],
      },
      select: { contatoId: true, descricao: true, prazo: true, oportunidade: { select: { contatoId: true } } },
      orderBy: [{ prazo: "asc" }, { criadoEm: "asc" }],
    }),

  contarPendentes: (oportunidadeId: string, db: Db = prisma) =>
    db.tarefa.count({ where: { oportunidadeId, situacao: "PENDENTE" } }),

  proximasPendentes: (ids: string[], db: Db = prisma) =>
    db.tarefa.findMany({
      where: { situacao: "PENDENTE", oportunidadeId: { in: ids } },
      include: { responsavel: { select: { nome: true } } },
      orderBy: [{ prazo: "asc" }, { criadoEm: "asc" }],
    }),

  contarAtrasadas: (filtros: FiltrosTarefaPorOportunidade, inicioDeHoje: Date, db: Db = prisma) =>
    db.tarefa.count({
      where: { situacao: "PENDENTE", prazo: { lt: inicioDeHoje }, ...deOportunidadeAberta(filtros) },
    }),
};
