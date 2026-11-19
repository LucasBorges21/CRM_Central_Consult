import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/shared/db";
import type { ErroDeNegocio } from "@/shared/resultado";
import { interpretarModalidade, interpretarObservacao, resumoInscricao } from "@/modules/participantes/dominio";
import { lerPlanilhaDeParticipantes } from "@/modules/participantes/importacao";
import * as participantes from "@/modules/participantes/servico";
import { basico, limparBanco } from "./apoio";

let b: Awaited<ReturnType<typeof basico>>;
beforeEach(async () => {
  await limparBanco();
  b = await basico();
});

async function erroDe(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    return e as ErroDeNegocio;
  }
  throw new Error("Era esperado um erro.");
}

/** Planilha no formato padrão (dados fictícios), com as variações reais de digitação. */
async function planilhaExemplo() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Participantes");
  ws.addRow([null, "NOME", "NOME PARA CRACHÁ", "EMPRESA", "CARGO", "DDD", "TELEFONE", "DDD", "CEL", "EMAIL DO PARTICIPANTE", "PARTICIPAÇÃO", "OBSERVAÇÕES", "Confirmação LIGAÇÃO e/ou Whats e/ou email", "Confirmação de presença"]);
  ws.addRow([null, "Lia Teste Souza", "LIA SOUZA   ", "Empresa Alfa", "Gerente de RH", null, null, 11, "98888-1111", { text: "lia@alfa.example", hyperlink: "mailto:lia@alfa.example" }, "Presencial", "Cortesia - Evandro ", "Enviado ", "Confirmado"]);
  ws.addRow([null, "Beto Online", "ONLINE", "Empresa Beta", "Analista", 11, "3333-2222", 21, "97777-2222", "beto@beta.example", "Onilne", "Cotesia - GRTS", "Enviado", "Mudou para o Online"]);
  ws.addRow([null, "Caio Pagante", "CAIO P", "Empresa Alfa", "Diretor", null, null, 31, "96666-3333", "caio@alfa.example   caio.pessoal@mail.example", "Mista", "3ª Tabela c/ 40% desc", null, null]);
  ws.addRow([null, "Dora Valor", "DORA", null, null, null, null, null, null, "dora@gama.example", "Presencial", "R$ 500,00", null, null]);
  ws.addRow([null, "Sem Email", "SEM", "X", "Y", null, null, 11, "95555-4444", null, "Presencial", null, null, null]);
  ws.addRow([null, "Lia Repetida", "LIA", "Empresa Alfa", null, null, null, null, null, "LIA@alfa.example", "Presencial", null, null, null]);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

describe("interpretação da planilha", () => {
  it("normaliza participação e observações", () => {
    expect(interpretarModalidade("Onilne")).toBe("ONLINE");
    expect(interpretarModalidade("Mista")).toBe("HIBRIDA");
    expect(interpretarModalidade(" presencial ")).toBe("PRESENCIAL");
    expect(interpretarObservacao("Cotesia - Evando")).toMatchObject({ tipoInscricao: "CORTESIA", cortesiaConcedidaPor: "Evando" });
    expect(interpretarObservacao("3ª Tabela c/ 40% desc")).toMatchObject({ tipoInscricao: "PAGANTE", lote: "3ª Tabela", descontoPercentual: 40 });
    expect(interpretarObservacao("R$ 500,00")).toMatchObject({ tipoInscricao: "PAGANTE", valorTexto: "R$ 500,00" });
    expect(interpretarObservacao("Convidado do diretor")).toMatchObject({ observacoes: "Convidado do diretor" });
  });

  it("lê a planilha padrão (DDD separado, hiperlink, variações) e aponta problemas", async () => {
    const r = await lerPlanilhaDeParticipantes(await planilhaExemplo());
    expect(r.aba).toBe("Participantes");
    expect(r.linhas).toHaveLength(5);
    expect(r.problemas.map((p) => p.motivo)).toEqual(["Sem Email: sem e-mail válido."]);
    const [lia, beto, caio, dora] = r.linhas;
    expect(lia).toMatchObject({ email: "lia@alfa.example", celular: "(11) 98888-1111", nomeCracha: "LIA SOUZA", tipoInscricao: "CORTESIA", cortesiaConcedidaPor: "Evandro", confirmacaoEnviada: true, presencaConfirmada: true });
    expect(beto).toMatchObject({ modalidade: "ONLINE", telefone: "(11) 3333-2222", celular: "(21) 97777-2222", nomeCracha: "BETO ONLINE", mudouParaOnline: true });
    expect(caio).toMatchObject({ modalidade: "HIBRIDA", email: "caio@alfa.example", lote: "3ª Tabela", descontoPercentual: 40 });
    expect(caio.observacoes).toContain("caio.pessoal@mail.example");
    expect(dora).toMatchObject({ valorTexto: "R$ 500,00", empresa: null });
  });
});

describe("participantes", () => {
  const novo = (extra: Record<string, unknown> = {}) => ({
    nomeCompleto: "Nova Pessoa da Silva",
    email: "nova@empresa-nova.example",
    empresa: "Empresa Nova",
    cargo: "Coordenadora",
    celular: "(11) 91234-5678",
    nomeCracha: "nova pessoa",
    modalidade: "PRESENCIAL",
    tipoInscricao: "PAGANTE",
    lote: "1ª Tabela",
    descontoPercentual: "10",
    valor: "1.290,00",
    ...extra,
  });

  it("inscreve criando contato e empresa; reaproveita contato existente pelo e-mail", async () => {
    const p = await participantes.inscreverParticipante(b.evento.id, novo(), b.responsavel.id);
    expect(p.nomeCracha).toBe("NOVA PESSOA");
    expect(p.valorCentavos).toBe(129000);
    const contato = await prisma.contato.findUniqueOrThrow({ where: { id: p.contatoId }, include: { empresa: true, telefones: true } });
    expect(contato.nome).toBe("Nova");
    expect(contato.sobrenome).toBe("Pessoa da Silva");
    expect(contato.empresa?.nome).toBe("Empresa Nova");
    expect(contato.telefones[0].tipo).toBe("CELULAR");

    // Contato já existente (e-mail com maiúsculas): não duplica nem altera o contato
    const p2 = await participantes.inscreverParticipante(b.evento.id, novo({ email: " MARIA@teste.example ", nomeCompleto: "Outro Nome", tipoInscricao: "CORTESIA", cortesiaConcedidaPor: "Diretoria" }), null);
    expect(p2.contatoId).toBe(b.contato.id);
    expect(p2.lote).toBeNull();
    expect(p2.cortesiaConcedidaPor).toBe("Diretoria");
    expect((await prisma.contato.findUniqueOrThrow({ where: { id: b.contato.id } })).nome).toBe("Maria");
    expect(await prisma.registroParticipante.count()).toBe(2);
  });

  it("não deixa inscrever a mesma pessoa duas vezes no mesmo evento", async () => {
    await participantes.inscreverParticipante(b.evento.id, novo(), null);
    const e = await erroDe(participantes.inscreverParticipante(b.evento.id, novo(), null));
    expect(e.codigo).toBe("JA_INSCRITO");
    // Em outro evento, pode
    await participantes.inscreverParticipante(b.evento2.id, novo(), null);
  });

  it("confirmação em lote, modalidade e presença ficam no histórico; resumo conta tudo", async () => {
    const p1 = await participantes.inscreverParticipante(b.evento.id, novo(), b.responsavel.id);
    const p2 = await participantes.inscreverParticipante(b.evento.id, novo({ email: "dois@x.example", tipoInscricao: "CORTESIA" }), b.responsavel.id);
    expect(await participantes.marcarConfirmacaoEnviada({ ids: [p1.id, p2.id], canal: "WHATSAPP" }, b.responsavel.id)).toBe(2);
    await participantes.alterarModalidade(p2.id, { modalidade: "ONLINE" }, b.responsavel.id);
    await participantes.alterarPresenca(p1.id, { presenca: "CONFIRMADA" }, b.responsavel.id);
    const hist = await participantes.historicoDoParticipante(p2.id);
    expect(hist.map((h) => h.descricao)).toContain("Mudou de Presencial para Online.");
    expect(hist.map((h) => h.descricao)).toContain("Confirmação enviada por WhatsApp.");
    const r = await participantes.resumoDoEvento(b.evento.id);
    expect(r).toMatchObject({ total: 2, presencial: 1, online: 1, cortesias: 1, pagantes: 1, pendentesConfirmacao: 0, presencaConfirmada: 1 });
    expect((await participantes.listarParticipantes(b.evento.id, { confirmacao: "PENDENTE" })).length).toBe(0);
    expect((await participantes.listarParticipantes(b.evento.id, { busca: "DOIS@x" })).length).toBe(1);
    expect((await participantes.listarParticipantes(b.evento.id, { modalidade: "ONLINE" })).map((p) => p.id)).toEqual([p2.id]);
  });

  it("resumo da inscrição", () => {
    expect(resumoInscricao({ tipoInscricao: "CORTESIA", cortesiaConcedidaPor: "Evandro", lote: null, descontoPercentual: null })).toBe("Cortesia · Evandro");
    expect(resumoInscricao({ tipoInscricao: "PAGANTE", cortesiaConcedidaPor: null, lote: "3ª Tabela", descontoPercentual: 40 })).toBe("3ª Tabela · 40% desc.");
  });

  it("importação: prévia não grava; confirmação grava; reimportar não duplica", async () => {
    const leitura = await lerPlanilhaDeParticipantes(await planilhaExemplo());
    const previa = await participantes.importarParticipantes(b.evento.id, leitura.linhas, { simular: true, responsavelId: null });
    expect(previa).toMatchObject({ novos: 4, duplicadosNaPlanilha: 1, contatosNovos: 4, jaInscritos: 0 });
    expect(await prisma.participante.count()).toBe(0);
    expect(await prisma.contato.count({ where: { email: "lia@alfa.example" } })).toBe(0);

    const feito = await participantes.importarParticipantes(b.evento.id, leitura.linhas, { simular: false, responsavelId: b.responsavel.id });
    expect(feito.novos).toBe(4);
    const lista = await participantes.listarParticipantes(b.evento.id);
    const lia = lista.find((p) => p.contato.email === "lia@alfa.example")!;
    expect(lia.presenca).toBe("CONFIRMADA");
    expect(lia.confirmacaoEnviadaEm).not.toBeNull();
    const dora = lista.find((p) => p.contato.email === "dora@gama.example")!;
    expect(dora.valorCentavos).toBe(50000);
    // Empresa Alfa criada uma vez só, para Lia e Caio
    expect(await prisma.empresa.count({ where: { nome: "Empresa Alfa" } })).toBe(1);

    const de_novo = await participantes.importarParticipantes(b.evento.id, leitura.linhas, { simular: false, responsavelId: null });
    expect(de_novo).toMatchObject({ novos: 0, jaInscritos: 4 });
  });
});
