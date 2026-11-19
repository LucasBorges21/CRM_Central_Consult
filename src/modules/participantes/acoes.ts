"use server";
/** Ações da tela de participantes. O usuário logado fica registrado no histórico de cada alteração. */
import { revalidatePath } from "next/cache";
import { usuarioAtual } from "@/modules/acesso/servico";
import { ErroDeNegocio, executar } from "@/shared/resultado";
import { lerPlanilhaDeParticipantes } from "./importacao";
import * as participantes from "./servico";

const TAMANHO_MAXIMO_PLANILHA = 5 * 1024 * 1024;

async function quem() {
  const u = await usuarioAtual();
  if (!u) throw new ErroDeNegocio("Sua sessão expirou. Entre novamente.");
  return u.id;
}

function revalidar(eventoId?: string) {
  revalidatePath(eventoId ? `/cadastros/eventos/${eventoId}` : "/cadastros/eventos", "layout");
}

export async function acaoInscreverParticipante(eventoId: string, entrada: Record<string, unknown>) {
  const r = await executar(async () => {
    const p = await participantes.inscreverParticipante(eventoId, entrada, await quem());
    return { id: p.id };
  }, "Participante inscrito.");
  if (r.ok) revalidar(eventoId);
  return r;
}

export async function acaoAtualizarInscricao(eventoId: string, id: string, entrada: Record<string, unknown>) {
  const r = await executar(async () => {
    await participantes.atualizarInscricao(id, entrada, await quem());
    return { id };
  }, "Inscrição atualizada.");
  if (r.ok) revalidar(eventoId);
  return r;
}

export async function acaoAlterarModalidade(eventoId: string, id: string, modalidade: string) {
  const r = await executar(async () => {
    await participantes.alterarModalidade(id, { modalidade }, await quem());
    return { id };
  }, "Modalidade atualizada.");
  if (r.ok) revalidar(eventoId);
  return r;
}

export async function acaoAlterarPresenca(eventoId: string, id: string, presenca: string) {
  const r = await executar(async () => {
    await participantes.alterarPresenca(id, { presenca }, await quem());
    return { id };
  }, "Presença atualizada.");
  if (r.ok) revalidar(eventoId);
  return r;
}

export async function acaoMarcarConfirmacao(eventoId: string, ids: string[], canal: string) {
  const r = await executar(async () => {
    const n = await participantes.marcarConfirmacaoEnviada({ ids, canal }, await quem());
    return { quantidade: n };
  }, ids.length === 1 ? "Confirmação marcada como enviada." : `Confirmação marcada como enviada para ${ids.length} participantes.`);
  if (r.ok) revalidar(eventoId);
  return r;
}

export async function acaoDesfazerConfirmacao(eventoId: string, id: string) {
  const r = await executar(async () => {
    await participantes.desfazerConfirmacao(id, await quem());
    return { id };
  }, "Confirmação desmarcada.");
  if (r.ok) revalidar(eventoId);
  return r;
}

export async function acaoRemoverParticipante(eventoId: string, id: string) {
  const r = await executar(async () => {
    await participantes.removerParticipante(id);
    return { id };
  }, "Participante removido do evento.");
  if (r.ok) revalidar(eventoId);
  return r;
}

/** Lê a planilha e simula (prévia) ou grava (confirmar) a importação. */
export async function acaoImportarPlanilha(eventoId: string, formulario: FormData, confirmar: boolean) {
  const r = await executar(async () => {
    const arquivo = formulario.get("planilha");
    if (!(arquivo instanceof File) || arquivo.size === 0) {
      throw new ErroDeNegocio("Selecione a planilha.", { planilha: "Selecione um arquivo .xlsx." });
    }
    if (!/\.xlsx$/i.test(arquivo.name)) throw new ErroDeNegocio("Formato não suportado.", { planilha: "Use um arquivo .xlsx (Excel)." });
    if (arquivo.size > TAMANHO_MAXIMO_PLANILHA) throw new ErroDeNegocio("Planilha muito grande.", { planilha: "O limite é 5 MB." });
    let leitura;
    try {
      leitura = await lerPlanilhaDeParticipantes(Buffer.from(await arquivo.arrayBuffer()));
    } catch (e) {
      throw new ErroDeNegocio(e instanceof Error ? e.message : "Não foi possível ler a planilha.", { planilha: "Não foi possível ler a planilha." });
    }
    const resumo = await participantes.importarParticipantes(eventoId, leitura.linhas, { simular: !confirmar, responsavelId: await quem() });
    return { aba: leitura.aba, linhas: leitura.linhas.length, problemas: leitura.problemas, ...resumo };
  }, confirmar ? "Planilha importada." : "Prévia pronta. Confira antes de importar.");
  if (r.ok && confirmar) revalidar(eventoId);
  return r;
}
