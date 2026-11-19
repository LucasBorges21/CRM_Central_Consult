/** Tipos e canais do Histórico (sem acesso ao banco; pode ser usado pela interface). */

export const TIPOS_HISTORICO = ["INTERACAO", "MUDANCA_ETAPA"] as const;
export type TipoHistorico = (typeof TIPOS_HISTORICO)[number];

export const CANAIS = ["WHATSAPP", "EMAIL", "TELEFONE", "REUNIAO"] as const;
export type Canal = (typeof CANAIS)[number];

export const ROTULO_CANAL: Record<Canal, string> = {
  WHATSAPP: "WhatsApp",
  EMAIL: "E-mail",
  TELEFONE: "Telefone",
  REUNIAO: "Reunião",
};

export function rotuloCanal(canal: string | null | undefined): string {
  return canal && canal in ROTULO_CANAL ? ROTULO_CANAL[canal as Canal] : "";
}
