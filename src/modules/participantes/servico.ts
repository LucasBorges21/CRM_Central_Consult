/**
 * Módulo Participantes: inscritos de cada evento (substitui a planilha "Lista de Inscritos e Participantes").
 * Cada participante é um Contato (Cadastros) inscrito em um Evento, com tipo de inscrição,
 * modalidade, confirmação enviada, presença e histórico de alterações.
 */
import type { Prisma } from "@prisma/client";
import { prisma, type Db } from "@/shared/db";
import { textoParaCentavos } from "@/shared/dinheiro";
import { ErroDeNegocio } from "@/shared/resultado";
import { normalizarBusca } from "@/shared/texto";
import { edicoesDaSerie, obterEvento, obterOuCriarContatoDeParticipante } from "@/modules/cadastros/servico";
import { nomeCompleto } from "@/modules/cadastros/dominio";
import { ROTULO_CANAL_CONFIRMACAO, ROTULO_MODALIDADE, ROTULO_PRESENCA, rotulo } from "./dominio";
import type { LinhaImportada } from "./importacao";
import { confirmacaoSchema, inscricaoSchema, modalidadeSchema, novoParticipanteSchema, presencaSchema } from "./schemas";

export type FiltrosParticipantes = {
  busca?: string;
  modalidade?: string;
  tipo?: string;
  presenca?: string;
  confirmacao?: "ENVIADA" | "PENDENTE" | string;
};

const incluir = {
  contato: {
    select: {
      id: true,
      nome: true,
      sobrenome: true,
      email: true,
      cargo: true,
      empresa: { select: { id: true, nome: true } },
      telefones: { orderBy: [{ principal: "desc" }, { criadoEm: "asc" }] },
    },
  },
} satisfies Prisma.ParticipanteInclude;

async function eventoOuFalhar(eventoId: string) {
  const e = await obterEvento(eventoId);
  if (!e) throw new ErroDeNegocio("Evento não encontrado.");
  return e;
}

// ---------- Leituras ----------

export async function listarParticipantes(eventoId: string, f: FiltrosParticipantes = {}) {
  const where: Prisma.ParticipanteWhereInput = {
    eventoId,
    ...(f.modalidade ? { modalidade: f.modalidade } : {}),
    ...(f.tipo ? { tipoInscricao: f.tipo } : {}),
    ...(f.presenca ? { presenca: f.presenca } : {}),
    ...(f.confirmacao === "ENVIADA" ? { confirmacaoEnviadaEm: { not: null } } : f.confirmacao === "PENDENTE" ? { confirmacaoEnviadaEm: null } : {}),
  };
  const todos = await prisma.participante.findMany({ where, include: incluir, orderBy: { contato: { nomeBusca: "asc" } } });
  const termo = normalizarBusca(f.busca ?? "");
  if (!termo) return todos;
  return todos.filter((p) =>
    [nomeCompleto(p.contato), p.nomeCracha, p.contato.email, p.contato.empresa?.nome, p.contato.cargo].some((x) => x && normalizarBusca(x).includes(termo)),
  );
}

export async function resumoDoEvento(eventoId: string) {
  const grupos = await prisma.participante.groupBy({
    by: ["modalidade", "tipoInscricao", "presenca"],
    where: { eventoId },
    _count: { _all: true },
  });
  const soma = (f: (g: (typeof grupos)[number]) => boolean) => grupos.filter(f).reduce((s, g) => s + g._count._all, 0);
  const pendentesConfirmacao = await prisma.participante.count({ where: { eventoId, confirmacaoEnviadaEm: null, presenca: { not: "CANCELADA" } } });
  return {
    total: soma(() => true),
    presencial: soma((g) => g.modalidade === "PRESENCIAL"),
    online: soma((g) => g.modalidade === "ONLINE"),
    hibrida: soma((g) => g.modalidade === "HIBRIDA"),
    cortesias: soma((g) => g.tipoInscricao === "CORTESIA"),
    pagantes: soma((g) => g.tipoInscricao === "PAGANTE"),
    presencaConfirmada: soma((g) => g.presenca === "CONFIRMADA"),
    cancelados: soma((g) => g.presenca === "CANCELADA"),
    pendentesConfirmacao,
  };
}

/** Quantidade de participantes por evento (lista de eventos). */
export async function contarPorEvento() {
  const g = await prisma.participante.groupBy({ by: ["eventoId"], _count: { _all: true } });
  return new Map(g.map((x) => [x.eventoId, x._count._all]));
}

export const historicoDoParticipante = (id: string) =>
  prisma.registroParticipante.findMany({
    where: { participanteId: id },
    include: { responsavel: { select: { nome: true } } },
    orderBy: { data: "desc" },
  });

/** Participações de um contato (ficha do contato), com a série de cada evento, da mais recente para a mais antiga. */
export const participacoesDoContato = (contatoId: string) =>
  prisma.participante.findMany({
    where: { contatoId },
    include: { evento: { include: { serie: true } } },
    orderBy: { evento: { dataInicio: "desc" } },
  });

export type ParticipacaoContato = Awaited<ReturnType<typeof participacoesDoContato>>[number];

/** Agrupa participações por série (eventos sem série ficam em "Outros eventos"), séries mais recentes primeiro. */
export function agruparPorSerie(lista: ParticipacaoContato[]) {
  const grupos = new Map<string, { serie: string; itens: ParticipacaoContato[] }>();
  for (const p of lista) {
    const chave = p.evento.serie?.id ?? "_avulsos";
    if (!grupos.has(chave)) grupos.set(chave, { serie: p.evento.serie?.nome ?? "Outros eventos", itens: [] });
    grupos.get(chave)!.itens.push(p);
  }
  return [...grupos.values()];
}

/**
 * Para cada pessoa inscrita no evento, as outras edições da mesma série em que ela também se inscreveu
 * (sem contar inscrições canceladas). Ex.: quem está no COMSAÚDE 2027 e esteve no COMSAÚDE 2026.
 */
export async function participacoesEmOutrasEdicoes(eventoId: string) {
  const resultado = new Map<string, { eventoId: string; nome: string; edicao: number | null }[]>();
  const outras = (await edicoesDaSerie(eventoId)).filter((e) => e.id !== eventoId);
  if (outras.length === 0) return resultado;
  const inscritos = await prisma.participante.findMany({ where: { eventoId }, select: { contatoId: true } });
  const anteriores = await prisma.participante.findMany({
    where: { eventoId: { in: outras.map((e) => e.id) }, contatoId: { in: inscritos.map((i) => i.contatoId) }, presenca: { not: "CANCELADA" } },
    select: { contatoId: true, eventoId: true },
  });
  const porId = new Map(outras.map((e) => [e.id, e]));
  for (const a of anteriores) {
    const e = porId.get(a.eventoId)!;
    const lista = resultado.get(a.contatoId) ?? [];
    lista.push({ eventoId: e.id, nome: e.nome, edicao: e.edicao });
    resultado.set(a.contatoId, lista);
  }
  for (const lista of resultado.values()) lista.sort((x, y) => (y.edicao ?? 0) - (x.edicao ?? 0));
  return resultado;
}

// ---------- Gravações ----------

function registrar(participanteId: string, descricao: string, responsavelId: string | null, db: Db) {
  return db.registroParticipante.create({ data: { participanteId, descricao, responsavelId } });
}

function dadosInscricao(d: ReturnType<typeof inscricaoSchema.parse>) {
  return {
    nomeCracha: d.nomeCracha.toUpperCase(),
    modalidade: d.modalidade,
    tipoInscricao: d.tipoInscricao,
    cortesiaConcedidaPor: d.cortesiaConcedidaPor,
    lote: d.lote,
    descontoPercentual: d.descontoPercentual,
    valorCentavos: d.valor,
    observacoes: d.observacoes,
  };
}

/** Inscreve uma pessoa no evento (reaproveita o contato pelo e-mail ou cria contato e empresa). */
export async function inscreverParticipante(eventoId: string, entrada: unknown, responsavelId: string | null) {
  await eventoOuFalhar(eventoId);
  const d = novoParticipanteSchema.parse(entrada);
  return prisma.$transaction(async (tx) => {
    const { contato } = await obterOuCriarContatoDeParticipante(d, tx);
    const ja = await tx.participante.findUnique({ where: { eventoId_contatoId: { eventoId, contatoId: contato.id } } });
    if (ja) {
      throw new ErroDeNegocio("Esta pessoa já está inscrita neste evento.", { email: "Já existe um participante com este e-mail neste evento." }, "JA_INSCRITO");
    }
    const p = await tx.participante.create({ data: { eventoId, contatoId: contato.id, ...dadosInscricao(inscricaoSchema.parse(entrada)) } });
    await registrar(p.id, "Inscrição registrada.", responsavelId, tx);
    return p;
  });
}

async function participanteOuFalhar(id: string, db: Db = prisma) {
  const p = await db.participante.findUnique({ where: { id } });
  if (!p) throw new ErroDeNegocio("Participante não encontrado.");
  return p;
}

export async function atualizarInscricao(id: string, entrada: unknown, responsavelId: string | null) {
  const atual = await participanteOuFalhar(id);
  const d = dadosInscricao(inscricaoSchema.parse(entrada));
  return prisma.$transaction(async (tx) => {
    const p = await tx.participante.update({ where: { id }, data: d });
    const mudancas = [
      atual.modalidade !== d.modalidade && `modalidade ${rotulo(ROTULO_MODALIDADE, atual.modalidade)} → ${rotulo(ROTULO_MODALIDADE, d.modalidade)}`,
      atual.tipoInscricao !== d.tipoInscricao && `inscrição passou a ${d.tipoInscricao === "CORTESIA" ? "cortesia" : "pagante"}`,
      atual.nomeCracha !== d.nomeCracha && "nome do crachá",
    ].filter(Boolean);
    await registrar(id, mudancas.length ? `Inscrição alterada: ${mudancas.join("; ")}.` : "Inscrição alterada.", responsavelId, tx);
    return p;
  });
}

export async function alterarModalidade(id: string, entrada: unknown, responsavelId: string | null) {
  const { modalidade } = modalidadeSchema.parse(entrada);
  const atual = await participanteOuFalhar(id);
  if (atual.modalidade === modalidade) return atual;
  return prisma.$transaction(async (tx) => {
    const p = await tx.participante.update({ where: { id }, data: { modalidade } });
    await registrar(id, `Mudou de ${rotulo(ROTULO_MODALIDADE, atual.modalidade)} para ${rotulo(ROTULO_MODALIDADE, modalidade)}.`, responsavelId, tx);
    return p;
  });
}

export async function alterarPresenca(id: string, entrada: unknown, responsavelId: string | null) {
  const { presenca } = presencaSchema.parse(entrada);
  const atual = await participanteOuFalhar(id);
  if (atual.presenca === presenca) return atual;
  return prisma.$transaction(async (tx) => {
    const p = await tx.participante.update({ where: { id }, data: { presenca } });
    await registrar(id, `Presença: ${rotulo(ROTULO_PRESENCA, presenca)}.`, responsavelId, tx);
    return p;
  });
}

/** Marca a confirmação (ligação/WhatsApp/e-mail) como enviada para um ou vários participantes. */
export async function marcarConfirmacaoEnviada(entrada: unknown, responsavelId: string | null, agora = new Date()) {
  const { ids, canal } = confirmacaoSchema.parse(entrada);
  return prisma.$transaction(async (tx) => {
    const r = await tx.participante.updateMany({ where: { id: { in: ids } }, data: { confirmacaoEnviadaEm: agora, confirmacaoCanal: canal } });
    for (const id of ids) await registrar(id, `Confirmação enviada por ${rotulo(ROTULO_CANAL_CONFIRMACAO, canal)}.`, responsavelId, tx);
    return r.count;
  });
}

export async function desfazerConfirmacao(id: string, responsavelId: string | null) {
  await participanteOuFalhar(id);
  return prisma.$transaction(async (tx) => {
    await tx.participante.update({ where: { id }, data: { confirmacaoEnviadaEm: null, confirmacaoCanal: null } });
    await registrar(id, "Confirmação marcada como não enviada.", responsavelId, tx);
  });
}

export async function removerParticipante(id: string) {
  await participanteOuFalhar(id);
  await prisma.participante.delete({ where: { id } });
}

// ---------- Importação de planilha ----------

export type ResumoImportacao = {
  novos: number;
  jaInscritos: number;
  contatosNovos: number;
  contatosExistentes: number;
  duplicadosNaPlanilha: number;
};

/**
 * Importa linhas já lidas da planilha. Tudo ou nada (uma transação).
 * Com `simular`, calcula o resumo e desfaz tudo — usado na prévia antes de confirmar.
 * Pessoas já inscritas no evento (mesmo e-mail) são mantidas como estão.
 */
export async function importarParticipantes(
  eventoId: string,
  linhas: LinhaImportada[],
  opcoes: { simular: boolean; responsavelId: string | null },
): Promise<ResumoImportacao> {
  await eventoOuFalhar(eventoId);
  const resumo: ResumoImportacao = { novos: 0, jaInscritos: 0, contatosNovos: 0, contatosExistentes: 0, duplicadosNaPlanilha: 0 };
  const SIMULACAO = "__simulacao__";
  try {
    await prisma.$transaction(
      async (tx) => {
        const vistos = new Set<string>();
        for (const l of linhas) {
          const chave = l.email.trim().toLowerCase();
          if (vistos.has(chave)) {
            resumo.duplicadosNaPlanilha++;
            continue;
          }
          vistos.add(chave);
          const { contato, criado } = await obterOuCriarContatoDeParticipante(l, tx);
          if (criado) resumo.contatosNovos++;
          else resumo.contatosExistentes++;
          const ja = await tx.participante.findUnique({ where: { eventoId_contatoId: { eventoId, contatoId: contato.id } } });
          if (ja) {
            resumo.jaInscritos++;
            continue;
          }
          const p = await tx.participante.create({
            data: {
              eventoId,
              contatoId: contato.id,
              nomeCracha: l.nomeCracha,
              modalidade: l.modalidade,
              tipoInscricao: l.tipoInscricao,
              cortesiaConcedidaPor: l.cortesiaConcedidaPor,
              lote: l.lote,
              descontoPercentual: l.descontoPercentual,
              valorCentavos: l.valorTexto ? textoParaCentavos(l.valorTexto) : null,
              observacoes: l.observacoes,
              confirmacaoEnviadaEm: l.confirmacaoEnviada ? new Date() : null,
              presenca: l.presencaConfirmada || l.mudouParaOnline ? "CONFIRMADA" : "PENDENTE",
            },
          });
          const notas = ["Importado da planilha."];
          if (l.confirmacaoEnviada) notas.push("Confirmação constava como enviada (canal e data não informados).");
          if (l.mudouParaOnline) notas.push("Constava como 'mudou para online'.");
          await registrar(p.id, notas.join(" "), opcoes.responsavelId, tx);
          resumo.novos++;
        }
        if (opcoes.simular) throw new Error(SIMULACAO);
      },
      { timeout: 60_000 },
    );
  } catch (erro) {
    if (!(erro instanceof Error && erro.message === SIMULACAO)) throw erro;
  }
  return resumo;
}
