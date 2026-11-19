import { lerArquivo } from "@/modules/cadastros/servico";

/** Download de um arquivo anexado ao contato. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; arquivoId: string }> }) {
  const { id, arquivoId } = await params;
  const arquivo = await lerArquivo(id, arquivoId);
  if (!arquivo) return new Response("Arquivo não encontrado.", { status: 404 });
  const nome = arquivo.registro.nomeOriginal;
  const ascii = nome.normalize("NFD").replace(/[^\x20-\x7e]/g, "").replace(/["\\]/g, "") || "arquivo";
  return new Response(new Uint8Array(arquivo.conteudo), {
    headers: {
      "Content-Type": arquivo.registro.tipoMime || "application/octet-stream",
      "Content-Length": String(arquivo.conteudo.length),
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nome)}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
