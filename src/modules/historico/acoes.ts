"use server";
import { revalidatePath } from "next/cache";
import { executar } from "@/shared/resultado";
import { registrarInteracao } from "./servico";

/** Registro manual de interação pela tela de detalhe. */
export async function acaoRegistrarInteracao(oportunidadeId: string, entrada: Record<string, unknown>) {
  const r = await executar(async () => {
    await registrarInteracao(oportunidadeId, entrada);
    return { oportunidadeId };
  }, "Interação registrada na linha do tempo.");
  if (r.ok) revalidatePath(`/oportunidades/${oportunidadeId}`);
  return r;
}
