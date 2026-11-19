/** Valores monetários são sempre guardados em centavos (inteiro). */

const formatoReais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarReais(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return "—";
  return formatoReais.format(centavos / 100).replace(/ /g, " ");
}

/** Valor para preencher um campo de edição: 123450 → "1234,50". */
export function centavosParaCampo(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return "";
  return (centavos / 100).toFixed(2).replace(".", ",");
}

/**
 * Converte o texto digitado em centavos. Aceita "1.234,56", "1234,56", "1234.56",
 * "R$ 1.234" e "1234". Retorna null quando não é um número válido.
 */
export function textoParaCentavos(texto: string | number | null | undefined): number | null {
  if (texto === null || texto === undefined) return null;
  if (typeof texto === "number") return Number.isFinite(texto) ? Math.round(texto * 100) : null;
  let t = texto.replace(/R\$/gi, "").replace(/\s/g, "");
  if (!t) return null;
  if (t.includes(",")) {
    t = t.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, "");
  }
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  const valor = Number(t);
  if (!Number.isFinite(valor)) return null;
  return Math.round(valor * 100);
}
