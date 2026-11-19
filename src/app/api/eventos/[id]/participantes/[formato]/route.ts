/**
 * Exportações da lista de participantes em CSV (separador ";" e BOM UTF-8, para abrir direto no Excel em português).
 *   mailing  → contatos para disparos (exclui cancelados)
 *   crachas  → nome do crachá e empresa (só presencial/híbrida, exclui cancelados)
 *   completa → todas as colunas, no formato da antiga planilha de inscritos
 */
import { obterEvento } from "@/modules/cadastros/servico";
import { nomeCompleto } from "@/modules/cadastros/dominio";
import {
  ROTULO_CANAL_CONFIRMACAO,
  ROTULO_MODALIDADE,
  ROTULO_PRESENCA,
  resumoInscricao,
  rotulo,
} from "@/modules/participantes/dominio";
import { listarParticipantes } from "@/modules/participantes/servico";
import { formatarData } from "@/shared/datas";
import { formatarReais } from "@/shared/dinheiro";
import { formatarTelefone } from "@/shared/documentos";

function csv(linhas: (string | null | undefined)[][]) {
  const celula = (v: string | null | undefined) => {
    const t = (v ?? "").replace(/\r?\n/g, " ");
    return /[";]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return "﻿" + linhas.map((l) => l.map(celula).join(";")).join("\r\n");
}

function nomeArquivo(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; formato: string }> }) {
  const { id, formato } = await params;
  const evento = await obterEvento(id);
  if (!evento) return new Response("Evento não encontrado.", { status: 404 });
  const lista = await listarParticipantes(id);
  const tel = (p: (typeof lista)[number], tipo: "CELULAR" | "OUTRO") => {
    const t = tipo === "CELULAR" ? p.contato.telefones.find((x) => ["CELULAR", "WHATSAPP"].includes(x.tipo)) : p.contato.telefones.find((x) => !["CELULAR", "WHATSAPP"].includes(x.tipo));
    return t ? formatarTelefone(t.numero) : "";
  };
  const ativos = lista.filter((p) => p.presenca !== "CANCELADA");

  let linhas: (string | null | undefined)[][];
  let sufixo: string;
  if (formato === "mailing") {
    sufixo = "mailing";
    linhas = [
      ["Nome", "Empresa", "Cargo", "E-mail", "Celular", "Telefone", "Participação"],
      ...ativos.map((p) => [nomeCompleto(p.contato), p.contato.empresa?.nome, p.contato.cargo, p.contato.email, tel(p, "CELULAR"), tel(p, "OUTRO"), rotulo(ROTULO_MODALIDADE, p.modalidade)]),
    ];
  } else if (formato === "crachas") {
    sufixo = "crachas";
    linhas = [
      ["Nome no crachá", "Empresa", "Cargo", "Participação"],
      ...ativos
        .filter((p) => p.modalidade !== "ONLINE")
        .map((p) => [p.nomeCracha, p.contato.empresa?.nome, p.contato.cargo, rotulo(ROTULO_MODALIDADE, p.modalidade)]),
    ];
  } else if (formato === "completa") {
    sufixo = "inscritos";
    linhas = [
      ["Nome", "Nome para crachá", "Empresa", "Cargo", "Telefone", "Celular", "E-mail", "Participação", "Inscrição", "Confirmação enviada", "Presença", "Observações"],
      ...lista.map((p) => [
        nomeCompleto(p.contato),
        p.nomeCracha,
        p.contato.empresa?.nome,
        p.contato.cargo,
        tel(p, "OUTRO"),
        tel(p, "CELULAR"),
        p.contato.email,
        rotulo(ROTULO_MODALIDADE, p.modalidade),
        resumoInscricao(p, p.valorCentavos ? formatarReais(p.valorCentavos) : null),
        p.confirmacaoEnviadaEm
          ? `${formatarData(p.confirmacaoEnviadaEm)}${p.confirmacaoCanal ? ` · ${rotulo(ROTULO_CANAL_CONFIRMACAO, p.confirmacaoCanal)}` : ""}`
          : "Não enviada",
        rotulo(ROTULO_PRESENCA, p.presenca),
        p.observacoes,
      ]),
    ];
  } else {
    return new Response("Formato inválido.", { status: 404 });
  }

  const nome = `${nomeArquivo(evento.nome)}-${sufixo}.csv`;
  return new Response(csv(linhas), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Cache-Control": "no-store",
    },
  });
}
