/** Participantes de eventos: listas e regras puras (sem banco; usáveis pela interface). */

export const MODALIDADES = ["PRESENCIAL", "ONLINE", "HIBRIDA"] as const;
export type Modalidade = (typeof MODALIDADES)[number];
export const ROTULO_MODALIDADE: Record<Modalidade, string> = { PRESENCIAL: "Presencial", ONLINE: "Online", HIBRIDA: "Híbrida" };

export const TIPOS_INSCRICAO = ["CORTESIA", "PAGANTE"] as const;
export type TipoInscricao = (typeof TIPOS_INSCRICAO)[number];
export const ROTULO_TIPO_INSCRICAO: Record<TipoInscricao, string> = { CORTESIA: "Cortesia", PAGANTE: "Pagante" };

export const PRESENCAS = ["PENDENTE", "CONFIRMADA", "CANCELADA"] as const;
export type Presenca = (typeof PRESENCAS)[number];
export const ROTULO_PRESENCA: Record<Presenca, string> = { PENDENTE: "A confirmar", CONFIRMADA: "Confirmada", CANCELADA: "Cancelada" };

export const CANAIS_CONFIRMACAO = ["WHATSAPP", "EMAIL", "TELEFONE"] as const;
export type CanalConfirmacao = (typeof CANAIS_CONFIRMACAO)[number];
export const ROTULO_CANAL_CONFIRMACAO: Record<CanalConfirmacao, string> = { WHATSAPP: "WhatsApp", EMAIL: "E-mail", TELEFONE: "Telefone" };

export function rotulo<T extends string>(mapa: Record<T, string>, valor: string | null | undefined) {
  return valor && valor in mapa ? mapa[valor as T] : (valor ?? "");
}

/** Texto curto da inscrição: "Cortesia · Evandro", "1ª Tabela · 40% desc.", "Pagante · R$ 500,00". */
export function resumoInscricao(
  p: { tipoInscricao: string; cortesiaConcedidaPor: string | null; lote: string | null; descontoPercentual: number | null },
  valorFormatado?: string | null,
) {
  if (p.tipoInscricao === "CORTESIA") return p.cortesiaConcedidaPor ? `Cortesia · ${p.cortesiaConcedidaPor}` : "Cortesia";
  const partes = [p.lote ?? "Pagante"];
  if (p.descontoPercentual) partes.push(`${p.descontoPercentual}% desc.`);
  if (valorFormatado) partes.push(valorFormatado);
  return partes.join(" · ");
}

/** Interpreta a coluna "Participação" da planilha (aceita variações como "Onilne" e "Mista"). */
export function interpretarModalidade(texto: string | null | undefined): Modalidade | null {
  const t = (texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  if (!t) return null;
  if (t.startsWith("pres")) return "PRESENCIAL";
  if (t.startsWith("onl") || t.startsWith("onil") || t.includes("online")) return "ONLINE";
  if (t.startsWith("mist") || t.startsWith("hibr")) return "HIBRIDA";
  return null;
}

/**
 * Interpreta a coluna "Observações" da planilha:
 * "Cortesia - Evandro" → cortesia concedida por Evandro; "1ª Tabela", "3ª Tabela c/ 40% desc" → pagante com lote/desconto;
 * "R$ 500,00" → pagante com valor. Qualquer outro texto vira observação.
 */
export function interpretarObservacao(texto: string | null | undefined): {
  tipoInscricao: TipoInscricao;
  cortesiaConcedidaPor: string | null;
  lote: string | null;
  descontoPercentual: number | null;
  valorTexto: string | null;
  observacoes: string | null;
} {
  const original = (texto ?? "").trim();
  const base = { tipoInscricao: "PAGANTE" as TipoInscricao, cortesiaConcedidaPor: null, lote: null, descontoPercentual: null, valorTexto: null, observacoes: null };
  if (!original) return base;
  const sem = original.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (/^co[r]?tesia/.test(sem)) {
    const quem = original.split(/\s[-–]\s?|[-–]/).slice(1).join("-").trim();
    return { ...base, tipoInscricao: "CORTESIA", cortesiaConcedidaPor: quem || null };
  }
  const tabela = /(\d+)\s*[ªaº°o]?\s*tabela/i.exec(sem);
  if (tabela) {
    const desconto = /(\d{1,2})\s*%/.exec(sem);
    return { ...base, lote: `${tabela[1]}ª Tabela`, descontoPercentual: desconto ? Number(desconto[1]) : null };
  }
  if (/^(r\$)?\s*\d[\d.]*(,\d{1,2})?$/.test(sem)) return { ...base, valorTexto: original };
  return { ...base, observacoes: original };
}
