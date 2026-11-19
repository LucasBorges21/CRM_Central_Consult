/** Operações do módulo Agenda (tarefas vinculadas a oportunidades e/ou contatos). */
import { Prisma } from "@prisma/client";
import { prisma, type Db } from "@/shared/db";
import { chaveDataSP, hojeSP, inicioDoDiaSP } from "@/shared/datas";
import { ErroDeNegocio } from "@/shared/resultado";
import { validarContato, validarResponsavel } from "@/modules/cadastros/servico";
import { obterOportunidadeOuFalhar } from "@/modules/oportunidades/servico";
import { classificarPrazo, type GrupoPrazo } from "./dominio";
import { repositorioAgenda as repo, type FiltrosTarefaPorOportunidade } from "./repositorio";
import { reagendarSchema, tarefaSchema } from "./schemas";

export type VinculoTarefa = { oportunidadeId?: string | null; contatoId?: string | null };

/** Valida os dados de uma tarefa (sem gravar). */
export function validarDadosTarefa(entrada: unknown) {
  return tarefaSchema.parse(entrada);
}

/**
 * Cria uma tarefa pendente vinculada a uma oportunidade, a um contato, ou aos dois
 * (nesse caso, o contato precisa ser o contato principal da oportunidade).
 * Aceita `db` para participar da transação de um fluxo.
 */
export async function criarTarefaVinculada(vinculo: VinculoTarefa, entrada: unknown, db: Db = prisma) {
  const d = tarefaSchema.parse(entrada);
  const oportunidadeId = vinculo.oportunidadeId || null;
  const contatoId = vinculo.contatoId || null;
  if (!oportunidadeId && !contatoId) {
    throw new ErroDeNegocio("A tarefa precisa estar vinculada a um contato ou a uma oportunidade.");
  }
  await validarResponsavel(d.responsavelId, db);
  if (contatoId) await validarContato(contatoId, db);
  if (oportunidadeId && contatoId) {
    const o = await obterOportunidadeOuFalhar(oportunidadeId, db);
    if (o.contatoId !== contatoId) {
      throw new ErroDeNegocio("Escolha uma oportunidade deste contato.", {
        oportunidadeId: "Esta oportunidade não é deste contato.",
      });
    }
  }
  try {
    return await repo.criar(
      { oportunidadeId, contatoId, descricao: d.descricao, prazo: inicioDoDiaSP(d.prazo), responsavelId: d.responsavelId },
      db,
    );
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2003") {
      throw new ErroDeNegocio("Não foi possível gravar a tarefa: vínculo inválido.");
    }
    throw erro;
  }
}

/** Atalho: tarefa de uma oportunidade. */
export function criarTarefa(oportunidadeId: string, entrada: unknown, db: Db = prisma) {
  return criarTarefaVinculada({ oportunidadeId }, entrada, db);
}

export async function obterTarefaOuFalhar(id: string, db: Db = prisma) {
  const t = await repo.obter(id, db);
  if (!t) throw new ErroDeNegocio("Tarefa não encontrada.");
  return t;
}

/** Marca a tarefa como concluída e registra a data de conclusão. */
export async function concluirTarefa(id: string, db: Db = prisma, agora: Date = new Date()) {
  const t = await obterTarefaOuFalhar(id, db);
  if (t.situacao === "CONCLUIDA") throw new ErroDeNegocio("Esta tarefa já foi concluída.");
  return repo.concluir(id, agora, db);
}

export async function reagendarTarefa(id: string, entrada: unknown) {
  const { prazo } = reagendarSchema.parse(entrada);
  const t = await obterTarefaOuFalhar(id);
  if (t.situacao !== "PENDENTE") throw new ErroDeNegocio("Só é possível reagendar tarefas pendentes.");
  return repo.reagendar(id, inicioDoDiaSP(prazo));
}

export const contarPendentes = (oportunidadeId: string, db: Db = prisma) => repo.contarPendentes(oportunidadeId, db);

/**
 * Fila de retornos agrupada em Atrasadas / Hoje / Futuras (fuso de São Paulo).
 * Inclui tarefas de oportunidades abertas e tarefas só de contato.
 */
export async function filaDeRetornos(filtros: { responsavelId?: string | null } = {}, agora: Date = new Date()) {
  const tarefas = await repo.listarFila(filtros.responsavelId ?? null);
  const ids = [...new Set(tarefas.map((t) => t.oportunidadeId).filter((x): x is string => !!x))];
  const contagem = await repo.pendentesPorOportunidade(ids);
  const pendentesPorOp = new Map(contagem.map((c) => [c.oportunidadeId, c._count._all]));
  const hoje = hojeSP(agora);
  const grupos: Record<GrupoPrazo, (typeof tarefas[number] & { ultimaPendente: boolean })[]> = {
    ATRASADA: [],
    HOJE: [],
    FUTURA: [],
  };
  for (const t of tarefas) {
    grupos[classificarPrazo(chaveDataSP(t.prazo), hoje)].push({
      ...t,
      ultimaPendente: !!t.oportunidadeId && (pendentesPorOp.get(t.oportunidadeId) ?? 0) <= 1,
    });
  }
  return grupos;
}

function separar<T extends { situacao: string; concluidaEm: Date | null }>(todas: T[]) {
  return {
    pendentes: todas.filter((t) => t.situacao === "PENDENTE"),
    concluidas: todas
      .filter((t) => t.situacao === "CONCLUIDA")
      .sort((a, b) => (b.concluidaEm?.getTime() ?? 0) - (a.concluidaEm?.getTime() ?? 0)),
  };
}

/** Tarefas da oportunidade: pendentes (por prazo) e concluídas (mais recentes primeiro). */
export async function tarefasDaOportunidade(oportunidadeId: string) {
  return separar(await repo.daOportunidade(oportunidadeId));
}

/** Calendário do contato: tarefas diretas e das oportunidades em que ele é o contato principal. */
export async function tarefasDoContato(contatoId: string) {
  return separar(await repo.doContato(contatoId));
}

/** Quantidade de tarefas pendentes por contato (diretas + das oportunidades dele). */
export async function pendentesPorContato(contatoIds: string[]) {
  const mapa = new Map<string, number>();
  for (const [id, r] of await agendaPorContato(contatoIds)) mapa.set(id, r.pendentes);
  return mapa;
}

/** Por contato: quantidade de tarefas pendentes e a próxima delas (menor prazo). */
export async function agendaPorContato(contatoIds: string[]) {
  const mapa = new Map<string, { pendentes: number; proxima: { descricao: string; prazo: Date } }>();
  if (contatoIds.length === 0) return mapa;
  for (const t of await repo.pendentesDosContatos(contatoIds)) {
    const id = t.contatoId ?? t.oportunidade?.contatoId;
    if (!id) continue;
    const atual = mapa.get(id);
    if (atual) atual.pendentes += 1;
    else mapa.set(id, { pendentes: 1, proxima: { descricao: t.descricao, prazo: t.prazo } });
  }
  return mapa;
}

/** Próxima tarefa pendente de cada oportunidade (para os cartões do Funil). */
export async function proximasTarefas(oportunidadeIds: string[]) {
  const tarefas = await repo.proximasPendentes(oportunidadeIds);
  const mapa = new Map<string, (typeof tarefas)[number]>();
  for (const t of tarefas) if (t.oportunidadeId && !mapa.has(t.oportunidadeId)) mapa.set(t.oportunidadeId, t);
  return mapa;
}

/** Retornos atrasados: pendentes com prazo anterior a hoje (SP), de oportunidades abertas. */
export function contarRetornosAtrasados(filtros: FiltrosTarefaPorOportunidade, agora: Date = new Date()) {
  return repo.contarAtrasadas(filtros, inicioDoDiaSP(hojeSP(agora)));
}
