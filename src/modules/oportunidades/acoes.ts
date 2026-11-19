"use server";
/** Ações da interface de Oportunidades que só alteram este módulo. */
import { revalidatePath } from "next/cache";
import { executar } from "@/shared/resultado";
import * as oportunidades from "./servico";

export async function acaoAtualizarOportunidade(id: string, entrada: Record<string, unknown>) {
  const r = await executar(async () => {
    await oportunidades.atualizarDadosComerciais(id, entrada);
    return { id };
  }, "Dados comerciais atualizados.");
  if (r.ok) revalidatePath("/", "layout");
  return r;
}

/** Atualiza somente o status do pagamento; o valor final não é tocado. */
export async function acaoAtualizarPagamento(id: string, entrada: Record<string, unknown>) {
  const r = await executar(async () => {
    const o = await oportunidades.atualizarPagamento(id, entrada);
    return { statusPagamento: o.statusPagamento };
  }, "Status do pagamento atualizado.");
  if (r.ok) revalidatePath("/", "layout");
  return r;
}
