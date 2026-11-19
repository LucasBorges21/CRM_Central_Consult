/**
 * Datas no fuso de São Paulo.
 * Datas "de calendário" (prazo de tarefa, início/fim de evento) são guardadas como
 * o instante da meia-noite de São Paulo daquele dia e manipuladas como chave "AAAA-MM-DD".
 */
export const FUSO = "America/Sao_Paulo";

const formatoChave = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const formatoData = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const formatoDataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const REGEX_CHAVE = /^\d{4}-\d{2}-\d{2}$/;

/** "AAAA-MM-DD" do instante informado, no fuso de São Paulo. */
export function chaveDataSP(data: Date): string {
  return formatoChave.format(data);
}

/** Chave do dia atual em São Paulo. `agora` permite testes determinísticos. */
export function hojeSP(agora: Date = new Date()): string {
  return chaveDataSP(agora);
}

export function chaveValida(chave: string): boolean {
  if (!REGEX_CHAVE.test(chave)) return false;
  const [a, m, d] = chave.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Deslocamento (em minutos) do fuso de São Paulo em relação ao UTC no instante dado. */
function deslocamentoMinutos(instante: Date): number {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO,
    timeZoneName: "longOffset",
  }).formatToParts(instante);
  const nome = partes.find((p) => p.type === "timeZoneName")?.value ?? "GMT-03:00";
  const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(nome);
  if (!m) return 0;
  const sinal = m[1] === "-" ? -1 : 1;
  return sinal * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

/** Instante da meia-noite de São Paulo do dia `chave`. */
export function inicioDoDiaSP(chave: string): Date {
  const [a, m, d] = chave.split("-").map(Number);
  const utcMeiaNoite = Date.UTC(a, m - 1, d);
  const desloc = deslocamentoMinutos(new Date(utcMeiaNoite + 12 * 3600_000));
  return new Date(utcMeiaNoite - desloc * 60_000);
}

export function somarDias(chave: string, dias: number): string {
  const [a, m, d] = chave.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d + dias));
  return dt.toISOString().slice(0, 10);
}

/** dd/mm/aaaa */
export function formatarData(data: Date | null | undefined): string {
  return data ? formatoData.format(data) : "";
}

/** dd/mm/aaaa hh:mm */
export function formatarDataHora(data: Date | null | undefined): string {
  return data ? formatoDataHora.format(data).replace(",", "") : "";
}

/** Período de evento: "10/03/2027" ou "10/03/2027 a 11/03/2027". */
export function formatarPeriodo(inicio: Date, fim?: Date | null): string {
  if (!fim || chaveDataSP(fim) === chaveDataSP(inicio)) return formatarData(inicio);
  return `${formatarData(inicio)} a ${formatarData(fim)}`;
}
