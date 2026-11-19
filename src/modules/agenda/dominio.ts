/** Regras puras da Agenda. */

export const SITUACOES_TAREFA = ["PENDENTE", "CONCLUIDA"] as const;
export type SituacaoTarefa = (typeof SITUACOES_TAREFA)[number];

export type GrupoPrazo = "ATRASADA" | "HOJE" | "FUTURA";

/** Classifica um prazo ("AAAA-MM-DD" em São Paulo) em relação ao dia de hoje em São Paulo. */
export function classificarPrazo(prazoChave: string, hojeChave: string): GrupoPrazo {
  if (prazoChave < hojeChave) return "ATRASADA";
  if (prazoChave === hojeChave) return "HOJE";
  return "FUTURA";
}
