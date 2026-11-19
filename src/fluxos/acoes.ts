"use server";
/** Ações da interface que disparam fluxos entre módulos. */
import { revalidatePath } from "next/cache";
import { executar } from "@/shared/resultado";
import * as fluxos from "./oportunidade";

function revalidarTudo() {
  revalidatePath("/", "layout");
}

export async function acaoCriarOportunidade(entrada: Record<string, unknown>) {
  const simular =
    process.env.NODE_ENV !== "production" || process.env.CRM_PERMITIR_SIMULACAO === "1"
      ? entrada.simularFalhaNaTarefa === true || entrada.simularFalhaNaTarefa === "on"
      : false;
  const r = await executar(async () => {
    const o = await fluxos.criarOportunidadeComPrimeiraTarefa(entrada, { simularFalhaNaTarefa: simular });
    return { id: o.id };
  }, "Oportunidade criada com a primeira tarefa.");
  if (r.ok) revalidarTudo();
  return r;
}

/** Usada pelo cartão do Funil e pela tela de detalhe. */
export async function acaoMudarEtapa(oportunidadeId: string, entrada: Record<string, unknown>) {
  const r = await executar(async () => {
    const o = await fluxos.mudarEtapa(oportunidadeId, entrada);
    return { etapa: o.etapa };
  }, "Etapa atualizada e registrada no histórico.");
  if (r.ok) revalidarTudo();
  return r;
}

export async function acaoConcluirTarefa(tarefaId: string, entrada: Record<string, unknown> = {}) {
  const r = await executar(() => fluxos.concluirTarefa(tarefaId, entrada), "Tarefa concluída.");
  if (r.ok) {
    if (r.dados?.proximaAgendada) r.mensagem = "Tarefa concluída e próxima ação agendada.";
    else if (r.dados?.semProximaAcao) r.mensagem = "Tarefa concluída. Oportunidade sinalizada como Sem próxima ação.";
    revalidarTudo();
  }
  return r;
}
