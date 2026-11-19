/**
 * Leitura da planilha padrão de inscritos (aba "Participantes"):
 * NOME | NOME PARA CRACHÁ | EMPRESA | CARGO | DDD | TELEFONE | DDD | CEL | EMAIL DO PARTICIPANTE |
 * PARTICIPAÇÃO | OBSERVAÇÕES | Confirmação LIGAÇÃO e/ou Whats e/ou email | Confirmação de presença
 * As colunas são localizadas pelo cabeçalho (a ordem pode variar); o DDD vale para a coluna à sua direita.
 */
import ExcelJS from "exceljs";
import { formatarTelefone, somenteDigitos, telefoneValido } from "@/shared/documentos";
import { normalizarBusca } from "@/shared/texto";
import { interpretarModalidade, interpretarObservacao, type Modalidade, type TipoInscricao } from "./dominio";

export type LinhaImportada = {
  linha: number;
  nomeCompleto: string;
  nomeCracha: string;
  empresa: string | null;
  cargo: string | null;
  telefone: string | null;
  celular: string | null;
  email: string;
  modalidade: Modalidade;
  tipoInscricao: TipoInscricao;
  cortesiaConcedidaPor: string | null;
  lote: string | null;
  descontoPercentual: number | null;
  valorTexto: string | null;
  observacoes: string | null;
  confirmacaoEnviada: boolean;
  presencaConfirmada: boolean;
  mudouParaOnline: boolean;
};

export type ResultadoLeitura = {
  aba: string;
  linhas: LinhaImportada[];
  problemas: { linha: number; motivo: string }[];
};

function texto(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    // Hiperlink: { text, hyperlink } — o texto pode ser simples ou formatado (richText).
    if ("text" in v) return texto(v.text as ExcelJS.CellValue);
    if ("hyperlink" in v && typeof v.hyperlink === "string") return v.hyperlink.replace(/^mailto:/i, "").trim();
    if ("richText" in v && Array.isArray(v.richText)) return v.richText.map((r) => r.text).join("").trim();
    if ("result" in v) return texto(v.result as ExcelJS.CellValue);
    if (v instanceof Date) return v.toISOString();
  }
  return String(v).trim();
}

function montarTelefone(ddd: string, numero: string): string | null {
  const d = somenteDigitos(ddd.replace(/\.0+$/, ""));
  const n = somenteDigitos(numero.replace(/\.0+$/, ""));
  if (!n) return null;
  const completo = n.length >= 10 ? n : `${d}${n}`;
  return telefoneValido(completo) ? formatarTelefone(completo) : null;
}

const COLUNAS: Record<string, (c: string) => boolean> = {
  nome: (c) => c === "nome" || c === "nome completo",
  cracha: (c) => c.includes("cracha"),
  empresa: (c) => c === "empresa",
  cargo: (c) => c === "cargo",
  telefone: (c) => c === "telefone" || c === "tel",
  celular: (c) => c === "cel" || c === "celular",
  email: (c) => c.includes("email") || c.includes("e-mail"),
  participacao: (c) => c.startsWith("participa") || c === "modalidade",
  observacoes: (c) => c.startsWith("observa"),
  confirmacao: (c) => c.startsWith("confirmacao") && (c.includes("ligacao") || c.includes("whats") || c.includes("email")),
  presenca: (c) => c.includes("presenca"),
};

/** Lê o arquivo .xlsx e devolve as linhas já normalizadas (sem gravar nada). */
export async function lerPlanilhaDeParticipantes(conteudo: ArrayBuffer | Buffer): Promise<ResultadoLeitura> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(conteudo as ArrayBuffer);
  // Prefere a aba "Participantes"; senão, a primeira com cabeçalho de NOME e E-MAIL.
  const candidatas = [...wb.worksheets].sort((a, b) => (normalizarBusca(a.name) === "participantes" ? -1 : normalizarBusca(b.name) === "participantes" ? 1 : 0));
  for (const ws of candidatas) {
    for (let linhaCab = 1; linhaCab <= Math.min(10, ws.rowCount); linhaCab++) {
      const cab: Record<string, number> = {};
      const dddAntes: Record<number, number> = {};
      const row = ws.getRow(linhaCab);
      let ultimaDdd = 0;
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        const c = normalizarBusca(texto(cell.value));
        if (!c) return;
        if (c === "ddd") {
          ultimaDdd = col;
          return;
        }
        for (const [chave, teste] of Object.entries(COLUNAS)) {
          if (!(chave in cab) && teste(c)) {
            cab[chave] = col;
            if (ultimaDdd === col - 1) dddAntes[col] = ultimaDdd;
            break;
          }
        }
      });
      if (!cab.nome || !cab.email) continue;

      const linhas: LinhaImportada[] = [];
      const problemas: ResultadoLeitura["problemas"] = [];
      for (let r = linhaCab + 1; r <= ws.rowCount; r++) {
        const rr = ws.getRow(r);
        const v = (chave: string) => (cab[chave] ? texto(rr.getCell(cab[chave]).value) : "");
        const ddd = (chave: string) => (cab[chave] && dddAntes[cab[chave]] ? texto(rr.getCell(dddAntes[cab[chave]]).value) : "");
        const nome = v("nome").replace(/\s+/g, " ");
        const emails = v("email").split(/[\s;,]+/).filter(Boolean);
        if (!nome && emails.length === 0) continue;
        if (!nome) {
          problemas.push({ linha: r, motivo: "Sem nome." });
          continue;
        }
        const email = emails.find((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
        if (!email) {
          problemas.push({ linha: r, motivo: `${nome}: sem e-mail válido.` });
          continue;
        }
        const obs = interpretarObservacao(v("observacoes"));
        const extras = [obs.observacoes, emails.length > 1 ? `Outros e-mails: ${emails.filter((e) => e !== email).join(", ")}` : null].filter(Boolean);
        const presencaTexto = normalizarBusca(v("presenca"));
        const modalidade = interpretarModalidade(v("participacao"));
        if (!modalidade) problemas.push({ linha: r, motivo: `${nome}: participação "${v("participacao") || "vazia"}" não reconhecida; considerada Presencial.` });
        const cracha = v("cracha").replace(/\s+/g, " ").trim();
        linhas.push({
          linha: r,
          nomeCompleto: nome,
          nomeCracha: cracha && normalizarBusca(cracha) !== "online" ? cracha.toUpperCase() : nome.split(" ").slice(0, 2).join(" ").toUpperCase(),
          empresa: v("empresa") || null,
          cargo: v("cargo") || null,
          telefone: montarTelefone(ddd("telefone"), v("telefone")),
          celular: montarTelefone(ddd("celular"), v("celular")),
          email,
          modalidade: presencaTexto.includes("online") ? "ONLINE" : (modalidade ?? "PRESENCIAL"),
          tipoInscricao: obs.tipoInscricao,
          cortesiaConcedidaPor: obs.cortesiaConcedidaPor,
          lote: obs.lote,
          descontoPercentual: obs.descontoPercentual,
          valorTexto: obs.valorTexto,
          observacoes: extras.length ? extras.join(" · ") : null,
          confirmacaoEnviada: normalizarBusca(v("confirmacao")).startsWith("envi"),
          presencaConfirmada: presencaTexto.startsWith("confirm"),
          mudouParaOnline: presencaTexto.includes("online"),
        });
      }
      return { aba: ws.name, linhas, problemas };
    }
  }
  throw new Error("Não encontrei na planilha um cabeçalho com as colunas NOME e E-MAIL.");
}
