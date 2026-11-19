/**
 * Armazenamento local dos arquivos anexados aos contatos.
 * Pasta: CRM_PASTA_ARQUIVOS ou ./dados/arquivos/<contatoId>/ (fora do git).
 * O nome no disco é gerado pelo sistema (UUID), então o nome enviado pelo usuário nunca vira caminho.
 */
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export function pastaArquivos(): string {
  return process.env.CRM_PASTA_ARQUIVOS ?? path.join(process.cwd(), "dados", "arquivos");
}

function caminho(contatoId: string, nomeArmazenado: string) {
  const seguro = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, "");
  return path.join(pastaArquivos(), seguro(contatoId), seguro(nomeArmazenado));
}

export function extensao(nome: string): string {
  const e = path.extname(nome).slice(1).toLowerCase();
  return /^[a-z0-9]{1,10}$/.test(e) ? e : "";
}

export async function gravarNoDisco(contatoId: string, nomeOriginal: string, conteudo: Buffer) {
  const ext = extensao(nomeOriginal);
  const nomeArmazenado = `${randomUUID()}${ext ? `.${ext}` : ""}`;
  const destino = caminho(contatoId, nomeArmazenado);
  await mkdir(path.dirname(destino), { recursive: true });
  await writeFile(destino, conteudo);
  return nomeArmazenado;
}

export function lerDoDisco(contatoId: string, nomeArmazenado: string) {
  return readFile(caminho(contatoId, nomeArmazenado));
}

export async function apagarDoDisco(contatoId: string, nomeArmazenado: string) {
  await rm(caminho(contatoId, nomeArmazenado), { force: true });
}
