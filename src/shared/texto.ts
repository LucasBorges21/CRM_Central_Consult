/** Normaliza texto para busca: minúsculas, sem acentos e sem espaços nas extremidades. */
export function normalizarBusca(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function correspondeBusca(busca: string | undefined, ...campos: (string | null | undefined)[]): boolean {
  const termo = normalizarBusca(busca ?? "");
  if (!termo) return true;
  return campos.some((c) => c && normalizarBusca(c).includes(termo));
}
