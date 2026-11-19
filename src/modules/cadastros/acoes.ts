"use server";
/** Ações chamadas pela interface de Cadastros. Apenas delegam ao serviço e revalidam as telas. */
import { revalidatePath } from "next/cache";
import { ErroDeNegocio, executar } from "@/shared/resultado";
import { nomeCompleto } from "./dominio";
import * as cadastros from "./servico";

function revalidar() {
  revalidatePath("/", "layout");
}

export async function acaoSalvarEmpresa(id: string | null, entrada: Record<string, unknown>) {
  const r = await executar(async () => {
    const e = id ? await cadastros.atualizarEmpresa(id, entrada) : await cadastros.criarEmpresa(entrada);
    return { id: e.id };
  }, id ? "Empresa atualizada." : "Empresa criada.");
  if (r.ok) revalidar();
  return r;
}

export async function acaoSalvarContato(id: string | null, entrada: Record<string, unknown>) {
  const r = await executar(async () => {
    const c = id ? await cadastros.atualizarContato(id, entrada) : await cadastros.criarContato(entrada);
    return { id: c.id, nome: c.nome, empresaId: c.empresaId };
  }, id ? "Contato atualizado." : "Contato criado.");
  if (r.ok) revalidar();
  return r;
}

export async function acaoSalvarEvento(id: string | null, entrada: Record<string, unknown>) {
  const r = await executar(async () => {
    const e = id ? await cadastros.atualizarEvento(id, entrada) : await cadastros.criarEvento(entrada);
    return { id: e.id };
  }, id ? "Evento atualizado." : "Evento criado.");
  if (r.ok) revalidar();
  return r;
}

/** Sugestões do campo de empresa (digitação). */
export async function acaoSugerirEmpresas(termo: string) {
  return cadastros.sugerirEmpresas(String(termo ?? "").slice(0, 100));
}

/** Cadastro rápido de empresa pelo nome digitado no campo de empresa. */
export async function acaoCriarEmpresaRapida(nome: string) {
  const r = await executar(async () => {
    const e = await cadastros.obterOuCriarEmpresaPorNome(nome);
    return { id: e.id, nome: e.nome };
  }, "Empresa cadastrada.");
  if (r.ok) revalidar();
  return r;
}

/** Leitura usada pelo formulário de oportunidade ao trocar a empresa. */
export async function acaoContatosParaOportunidade(empresaId: string | null) {
  const contatos = await cadastros.contatosParaOportunidade(empresaId);
  return contatos.map((c) => ({ id: c.id, nome: nomeCompleto(c), email: c.email, cargo: c.cargo }));
}

// ---------- Tags ----------

export async function acaoAdicionarTag(contatoId: string, entrada: Record<string, unknown>) {
  const r = await executar(async () => {
    const t = await cadastros.adicionarTag(contatoId, entrada);
    return { id: t.id };
  }, "Tag adicionada.");
  if (r.ok) revalidar();
  return r;
}

export async function acaoRemoverTag(contatoId: string, tagId: string) {
  const r = await executar(() => cadastros.removerTag(contatoId, tagId), "Tag removida.");
  if (r.ok) revalidar();
  return r;
}

// ---------- Notas ----------

export async function acaoCriarNota(contatoId: string, entrada: Record<string, unknown>) {
  const r = await executar(async () => {
    const n = await cadastros.criarNota(contatoId, entrada);
    return { id: n.id };
  }, "Nota registrada.");
  if (r.ok) revalidar();
  return r;
}

export async function acaoAtualizarNota(notaId: string, entrada: Record<string, unknown>) {
  const r = await executar(async () => {
    await cadastros.atualizarNota(notaId, entrada);
    return { id: notaId };
  }, "Nota atualizada.");
  if (r.ok) revalidar();
  return r;
}

export async function acaoExcluirNota(notaId: string) {
  const r = await executar(async () => {
    await cadastros.excluirNota(notaId);
    return { id: notaId };
  }, "Nota excluída.");
  if (r.ok) revalidar();
  return r;
}

// ---------- Arquivos ----------

export async function acaoAnexarArquivo(contatoId: string, formulario: FormData) {
  const r = await executar(async () => {
    const arquivo = formulario.get("arquivo");
    if (!(arquivo instanceof File) || arquivo.size === 0) {
      throw new ErroDeNegocio("Selecione um arquivo.", { arquivo: "Selecione um arquivo." });
    }
    const a = await cadastros.anexarArquivo(contatoId, {
      nome: arquivo.name,
      tipo: arquivo.type,
      conteudo: Buffer.from(await arquivo.arrayBuffer()),
    });
    return { id: a.id };
  }, "Arquivo anexado.");
  if (r.ok) revalidar();
  return r;
}

export async function acaoExcluirArquivo(arquivoId: string) {
  const r = await executar(async () => {
    await cadastros.excluirArquivo(arquivoId);
    return { id: arquivoId };
  }, "Arquivo excluído.");
  if (r.ok) revalidar();
  return r;
}

// ---------- Eventos associados ----------

export async function acaoAssociarEvento(contatoId: string, entrada: Record<string, unknown>) {
  const r = await executar(async () => {
    const a = await cadastros.associarEvento(contatoId, entrada);
    return { id: a.id };
  }, "Evento associado ao contato.");
  if (r.ok) revalidar();
  return r;
}

export async function acaoDesassociarEvento(associacaoId: string) {
  const r = await executar(async () => {
    await cadastros.desassociarEvento(associacaoId);
    return { id: associacaoId };
  }, "Associação removida.");
  if (r.ok) revalidar();
  return r;
}
