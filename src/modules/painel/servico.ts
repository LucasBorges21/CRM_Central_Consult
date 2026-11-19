/**
 * Painel Comercial: somente leitura. Compõe indicadores consultando Oportunidades, Agenda, Histórico e Cadastros.
 * Todos os indicadores recebem os mesmos filtros (evento e tipo de venda).
 */
import { contarRetornosAtrasados, filaDeRetornos } from "@/modules/agenda/servico";
import { buscarEventos } from "@/modules/cadastros/servico";
import { atividadeRecente } from "@/modules/historico/servico";
import { ETAPAS_ABERTAS } from "@/modules/oportunidades/dominio";
import {
  contarOportunidades,
  resumoPagamentosPendentes,
  resumoPorEtapa,
  resumoPorEvento,
  resumoVendasFechadas,
  somarValorEstimado,
} from "@/modules/oportunidades/servico";

export type FiltrosPainel = { eventoId?: string | null; tipoVenda?: string | null };

function normalizar(filtros: FiltrosPainel) {
  return { eventoId: filtros.eventoId || null, tipoVenda: filtros.tipoVenda || null };
}

/** Os quatro indicadores da especificação (critérios inalterados). */
export async function indicadoresComerciais(filtros: FiltrosPainel = {}, agora: Date = new Date()) {
  const f = normalizar(filtros);
  const [abertas, propostas, atrasados, fechadas] = await Promise.all([
    contarOportunidades(f, ETAPAS_ABERTAS),
    contarOportunidades(f, ["PROPOSTA_ENVIADA"]),
    contarRetornosAtrasados(f, agora),
    resumoVendasFechadas(f),
  ]);
  return {
    oportunidadesAbertas: abertas,
    propostasEnviadas: propostas,
    retornosAtrasados: atrasados,
    vendasFechadas: fechadas,
  };
}

/** Contexto complementar dos indicadores e blocos do Painel. */
export async function detalhesDoPainel(filtros: FiltrosPainel = {}, agora: Date = new Date()) {
  const f = normalizar(filtros);
  const [valorAberto, valorPropostas, pagamentosPendentes, porEtapa, porEvento, eventos, fila, atividades] =
    await Promise.all([
      somarValorEstimado(f, ETAPAS_ABERTAS),
      somarValorEstimado(f, ["PROPOSTA_ENVIADA"]),
      resumoPagamentosPendentes(f),
      resumoPorEtapa(f),
      resumoPorEvento({ tipoVenda: f.tipoVenda }),
      buscarEventos(),
      filaDeRetornos({}, agora),
      atividadeRecente(6),
    ]);
  return {
    valorAbertoCentavos: valorAberto,
    valorPropostasCentavos: valorPropostas,
    pagamentosPendentes,
    porEtapa,
    eventos: eventos
      .filter((e) => !f.eventoId || e.id === f.eventoId)
      .map((e) => ({ ...e, ...(porEvento.get(e.id) ?? { abertas: 0, abertoCentavos: 0, fechadas: 0, fechadoCentavos: 0 }) })),
    retornos: [...fila.ATRASADA, ...fila.HOJE, ...fila.FUTURA].slice(0, 4),
    atividades,
  };
}
