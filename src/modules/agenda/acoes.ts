"use server";
import { revalidatePath } from "next/cache";
import { executar } from "@/shared/resultado";
import { criarTarefa, criarTarefaVinculada, reagendarTarefa } from "./servico";

export async function acaoCriarTarefa(oportunidadeId: string, entrada: Record<string, unknown>) {
  const r = await executar(async () => {
    const t = await criarTarefa(oportunidadeId, entrada);
    return { id: t.id };
  }, "Tarefa criada.");
  if (r.ok) revalidatePath("/", "layout");
  return r;
}

/** Tarefa criada pelo calendário do contato, com vínculo opcional a uma oportunidade dele. */
export async function acaoCriarTarefaDoContato(contatoId: string, entrada: Record<string, unknown>) {
  const r = await executar(async () => {
    const oportunidadeId = typeof entrada.oportunidadeId === "string" ? entrada.oportunidadeId : null;
    const t = await criarTarefaVinculada({ contatoId, oportunidadeId }, entrada);
    return { id: t.id };
  }, "Tarefa agendada.");
  if (r.ok) revalidatePath("/", "layout");
  return r;
}

export async function acaoReagendarTarefa(tarefaId: string, entrada: Record<string, unknown>) {
  const r = await executar(async () => {
    const t = await reagendarTarefa(tarefaId, entrada);
    return { id: t.id };
  }, "Prazo reagendado.");
  if (r.ok) revalidatePath("/", "layout");
  return r;
}
