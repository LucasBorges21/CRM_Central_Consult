/**
 * Regras do Funil Comercial — ÚNICO lugar para alterar etapas e exigências de mudança de etapa.
 * Tanto o cartão do Funil quanto a tela de detalhe passam por `validarMudancaEtapa`
 * (via fluxo `mudarEtapa` em src/fluxos/oportunidade.ts), então qualquer ajuste aqui vale para todas as telas.
 * Este arquivo não acessa o banco e pode ser importado por componentes de interface.
 */

export const ETAPAS = ["NOVO", "EM_ATENDIMENTO", "PROPOSTA_ENVIADA", "EM_NEGOCIACAO", "FECHADO", "PERDIDO"] as const;
export type Etapa = (typeof ETAPAS)[number];

export const ROTULO_ETAPA: Record<Etapa, string> = {
  NOVO: "Novo",
  EM_ATENDIMENTO: "Em atendimento",
  PROPOSTA_ENVIADA: "Proposta enviada",
  EM_NEGOCIACAO: "Em negociação",
  FECHADO: "Fechado",
  PERDIDO: "Perdido",
};

/** Etapas consideradas "oportunidade aberta" (indicadores, fila de retornos, "Sem próxima ação"). */
export const ETAPAS_ABERTAS: readonly Etapa[] = ["NOVO", "EM_ATENDIMENTO", "PROPOSTA_ENVIADA", "EM_NEGOCIACAO"];

export function estaAberta(etapa: string): boolean {
  return (ETAPAS_ABERTAS as readonly string[]).includes(etapa);
}

export function rotuloEtapa(etapa: string | null | undefined): string {
  return etapa && etapa in ROTULO_ETAPA ? ROTULO_ETAPA[etapa as Etapa] : "—";
}

export const TIPOS_VENDA = ["INSCRICAO", "PATROCINIO"] as const;
export type TipoVenda = (typeof TIPOS_VENDA)[number];
export const ROTULO_TIPO_VENDA: Record<TipoVenda, string> = { INSCRICAO: "Inscrição", PATROCINIO: "Patrocínio" };
export function rotuloTipoVenda(tipo: string): string {
  return ROTULO_TIPO_VENDA[tipo as TipoVenda] ?? tipo;
}

export const STATUS_PAGAMENTO = ["PENDENTE", "PAGO"] as const;
export type StatusPagamento = (typeof STATUS_PAGAMENTO)[number];
export const ROTULO_PAGAMENTO: Record<StatusPagamento, string> = { PENDENTE: "Pendente", PAGO: "Pago" };

export const ORIGENS_LEAD = [
  "Indicação",
  "Site",
  "Instagram",
  "LinkedIn",
  "E-mail marketing",
  "WhatsApp",
  "Evento anterior",
  "Prospecção ativa",
  "Outro",
] as const;

/** Campos de fechamento/perda gravados junto com a etapa. */
export type AlteracoesDeEtapa = {
  etapa: Etapa;
  valorFinalCentavos: number | null;
  motivoPerda: string | null;
  statusPagamento: StatusPagamento | null;
  fechadoEm: Date | null;
};

export type PedidoMudancaEtapa = {
  etapa: Etapa;
  motivoPerda?: string | null;
  valorFinalCentavos?: number | null;
};

export type ResultadoValidacaoEtapa =
  | { ok: true; alteracoes: AlteracoesDeEtapa }
  | { ok: false; erros: Record<string, string> };

/**
 * Regra do funil:
 * - Perdido exige motivo da perda.
 * - Fechado exige valor final maior que zero; o pagamento começa como Pendente.
 * - Ao voltar para uma etapa aberta, os dados de fechamento/perda são limpos.
 */
export function validarMudancaEtapa(
  etapaAtual: string,
  pedido: PedidoMudancaEtapa,
  agora: Date = new Date(),
): ResultadoValidacaoEtapa {
  const nova = pedido.etapa;
  if (nova === etapaAtual) {
    return { ok: false, erros: { etapa: "A oportunidade já está nesta etapa." } };
  }
  const limpo: AlteracoesDeEtapa = {
    etapa: nova,
    valorFinalCentavos: null,
    motivoPerda: null,
    statusPagamento: null,
    fechadoEm: null,
  };

  if (nova === "PERDIDO") {
    const motivo = pedido.motivoPerda?.trim();
    if (!motivo) return { ok: false, erros: { motivoPerda: "Informe o motivo da perda." } };
    return { ok: true, alteracoes: { ...limpo, motivoPerda: motivo } };
  }

  if (nova === "FECHADO") {
    const valor = pedido.valorFinalCentavos;
    if (valor === null || valor === undefined) {
      return { ok: false, erros: { valorFinal: "Informe o valor final da venda." } };
    }
    if (valor <= 0) return { ok: false, erros: { valorFinal: "O valor final deve ser maior que zero." } };
    return {
      ok: true,
      alteracoes: { ...limpo, valorFinalCentavos: valor, statusPagamento: "PENDENTE", fechadoEm: agora },
    };
  }

  return { ok: true, alteracoes: limpo };
}

/** Valor exibido no cartão: o final, quando fechado; senão o estimado. */
export function valorDeExibicao(o: { etapa: string; valorFinalCentavos: number | null; valorEstimadoCentavos: number }) {
  return o.etapa === "FECHADO" && o.valorFinalCentavos !== null
    ? { valor: o.valorFinalCentavos, rotulo: "Valor final" }
    : { valor: o.valorEstimadoCentavos, rotulo: "Valor estimado" };
}
