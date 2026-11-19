/**
 * Operações do módulo Oportunidades. Gravações que envolvem outros módulos
 * (criar com primeira tarefa, mudar etapa + histórico) ficam em src/fluxos e chamam estas funções.
 */
import { prisma, type Db } from "@/shared/db";
import { ErroDeNegocio } from "@/shared/resultado";
import { validarVinculosOportunidade } from "@/modules/cadastros/servico";
import { ETAPAS, ETAPAS_ABERTAS, estaAberta, validarMudancaEtapa, type AlteracoesDeEtapa, type Etapa } from "./dominio";
import {
  repositorioOportunidades as repo,
  type DadosGravacaoOportunidade,
  type FiltrosOportunidade,
} from "./repositorio";
import { mudancaEtapaSchema, oportunidadeSchema, pagamentoSchema } from "./schemas";

export type { FiltrosOportunidade };

// ---------- Leituras ----------

export const obterOportunidade = (id: string) => repo.obterDetalhe(id);
export const listarOportunidades = (filtros: FiltrosOportunidade = {}) => repo.listar(filtros);
/** Usada pela ficha da empresa (Cadastros compõe a tela consultando Oportunidades). */
export const listarOportunidadesDaEmpresa = (empresaId: string) => repo.listarPorEmpresa(empresaId);
/** Usada pela ficha do contato (aba Negócios). */
export const listarOportunidadesDoContato = (contatoId: string) => repo.listarPorContato(contatoId);

/** Negócios por contato (total, em andamento e valor estimado em andamento), para os cards de contatos. */
export async function negociosPorContato(contatoIds: string[]) {
  const mapa = new Map<string, { total: number; abertos: number; valorAbertoCentavos: number }>();
  if (contatoIds.length === 0) return mapa;
  for (const o of await repo.porContato(contatoIds)) {
    const atual = mapa.get(o.contatoId) ?? { total: 0, abertos: 0, valorAbertoCentavos: 0 };
    atual.total += 1;
    if (estaAberta(o.etapa)) {
      atual.abertos += 1;
      atual.valorAbertoCentavos += o.valorEstimadoCentavos;
    }
    mapa.set(o.contatoId, atual);
  }
  return mapa;
}

/**
 * Totais por etapa do funil: quantidade e valor (estimado; nas fechadas, o valor final).
 * Usado pelo Painel ("pipeline por etapa") e pelo cabeçalho das colunas do Funil.
 */
export async function resumoPorEtapa(filtros: FiltrosOportunidade = {}) {
  const grupos = await repo.agruparPorEtapa(filtros);
  return ETAPAS.map((etapa) => {
    const g = grupos.find((x) => x.etapa === etapa);
    const valor = etapa === "FECHADO" ? (g?._sum.valorFinalCentavos ?? 0) : (g?._sum.valorEstimadoCentavos ?? 0);
    return { etapa, quantidade: g?._count._all ?? 0, valorCentavos: valor };
  });
}

/** Por evento: oportunidades abertas, valor em aberto e valor fechado. */
export async function resumoPorEvento(filtros: FiltrosOportunidade = {}) {
  const grupos = await repo.agruparPorEventoEtapa(filtros);
  const mapa = new Map<string, { abertas: number; abertoCentavos: number; fechadas: number; fechadoCentavos: number }>();
  for (const g of grupos) {
    const atual = mapa.get(g.eventoId) ?? { abertas: 0, abertoCentavos: 0, fechadas: 0, fechadoCentavos: 0 };
    if (estaAberta(g.etapa)) {
      atual.abertas += g._count._all;
      atual.abertoCentavos += g._sum.valorEstimadoCentavos ?? 0;
    } else if (g.etapa === "FECHADO") {
      atual.fechadas += g._count._all;
      atual.fechadoCentavos += g._sum.valorFinalCentavos ?? 0;
    }
    mapa.set(g.eventoId, atual);
  }
  return mapa;
}

/** Soma do valor estimado das oportunidades nas etapas informadas. */
export async function somarValorEstimado(filtros: FiltrosOportunidade, etapas: readonly Etapa[]) {
  return (await repo.somarEstimado(filtros, etapas))._sum.valorEstimadoCentavos ?? 0;
}

/** Vendas fechadas com pagamento pendente: quantidade e valor final. */
export async function resumoPagamentosPendentes(filtros: FiltrosOportunidade = {}) {
  const r = await repo.pagamentosPendentes(filtros);
  return { quantidade: r._count._all, totalCentavos: r._sum.valorFinalCentavos ?? 0 };
}

/** Contatos que são contato principal de alguma negociação em andamento. */
export async function contatosComNegociosEmAndamento() {
  return (await repo.contatosComEtapas(ETAPAS_ABERTAS)).map((o) => o.contatoId);
}

export async function contarOportunidades(filtros: FiltrosOportunidade, etapas: readonly Etapa[]) {
  return repo.contar(filtros, etapas);
}

export async function resumoVendasFechadas(filtros: FiltrosOportunidade) {
  const r = await repo.resumoFechadas(filtros);
  return { quantidade: r._count._all, totalCentavos: r._sum.valorFinalCentavos ?? 0 };
}

export async function obterOportunidadeOuFalhar(id: string, db: Db = prisma) {
  const o = await repo.obterBasico(id, db);
  if (!o) throw new ErroDeNegocio("Oportunidade não encontrada.");
  return o;
}

export async function oportunidadeEstaAberta(id: string, db: Db = prisma) {
  return estaAberta((await obterOportunidadeOuFalhar(id, db)).etapa);
}

// ---------- Gravações ----------

/** Valida os dados comerciais e os vínculos (sem gravar). */
export async function prepararDadosOportunidade(entrada: unknown, db: Db = prisma): Promise<DadosGravacaoOportunidade> {
  const d = oportunidadeSchema.parse(entrada);
  await validarVinculosOportunidade(d, db);
  return {
    titulo: d.titulo,
    eventoId: d.eventoId,
    tipoVenda: d.tipoVenda,
    empresaId: d.empresaId,
    contatoId: d.contatoId,
    origemLead: d.origemLead,
    responsavelId: d.responsavelId,
    valorEstimadoCentavos: d.valorEstimado ?? 0,
  };
}

/** Grava uma nova oportunidade na etapa Novo. Chamado pelo fluxo de criação, dentro da transação. */
export function gravarNovaOportunidade(dados: DadosGravacaoOportunidade, db: Db) {
  return repo.criar({ ...dados, etapa: "NOVO" }, db);
}

export async function atualizarDadosComerciais(id: string, entrada: unknown) {
  await obterOportunidadeOuFalhar(id);
  const dados = await prepararDadosOportunidade(entrada);
  return repo.atualizarDados(id, dados);
}

/** Valida a mudança de etapa pela regra do funil (dominio.ts) e devolve o que gravar. */
export async function prepararMudancaEtapa(id: string, entrada: unknown, db: Db = prisma) {
  const atual = await obterOportunidadeOuFalhar(id, db);
  const pedido = mudancaEtapaSchema.parse(entrada);
  const r = validarMudancaEtapa(atual.etapa, {
    etapa: pedido.etapa,
    motivoPerda: pedido.motivoPerda,
    valorFinalCentavos: pedido.valorFinal,
  });
  if (!r.ok) throw new ErroDeNegocio("Não foi possível mudar a etapa.", r.erros);
  return { etapaAnterior: atual.etapa, alteracoes: r.alteracoes };
}

export function aplicarMudancaEtapa(id: string, alteracoes: AlteracoesDeEtapa, db: Db) {
  return repo.aplicarEtapa(id, alteracoes, db);
}

/** Atualiza apenas o status do pagamento — nunca altera o valor final da venda. */
export async function atualizarPagamento(id: string, entrada: unknown) {
  const { statusPagamento } = pagamentoSchema.parse(entrada);
  const o = await obterOportunidadeOuFalhar(id);
  if (o.etapa !== "FECHADO") {
    throw new ErroDeNegocio("O pagamento só pode ser acompanhado em vendas fechadas.", {
      statusPagamento: "Feche a venda antes de registrar o pagamento.",
    });
  }
  return repo.atualizarPagamento(id, statusPagamento);
}
