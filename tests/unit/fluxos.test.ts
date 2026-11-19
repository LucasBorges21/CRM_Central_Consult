import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/shared/db";
import { ErroDeNegocio } from "@/shared/resultado";
import { inicioDoDiaSP } from "@/shared/datas";
import * as fluxos from "@/fluxos/oportunidade";
import * as cadastros from "@/modules/cadastros/servico";
import * as agenda from "@/modules/agenda/servico";
import * as historico from "@/modules/historico/servico";
import * as oportunidades from "@/modules/oportunidades/servico";
import { indicadoresComerciais } from "@/modules/painel/servico";
import { basico, diaRelativo, entradaOportunidade, limparBanco } from "./apoio";

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

describe("criação de oportunidade com primeira tarefa", () => {
  it("grava oportunidade, tarefa e registro de criação", async () => {
    const o = await fluxos.criarOportunidadeComPrimeiraTarefa(entradaOportunidade(b));
    expect(o.etapa).toBe("NOVO");
    expect(o.valorEstimadoCentavos).toBe(150000);
    expect(await prisma.tarefa.count({ where: { oportunidadeId: o.id } })).toBe(1);
    expect(await prisma.historico.count({ where: { oportunidadeId: o.id } })).toBe(1);
  });

  it("se a gravação da tarefa falhar, a oportunidade não é criada", async () => {
    const e = await erroDe(
      fluxos.criarOportunidadeComPrimeiraTarefa(entradaOportunidade(b), { simularFalhaNaTarefa: true }),
    );
    expect(e.codigo).toBe("FALHA_TAREFA");
    expect(await prisma.oportunidade.count()).toBe(0);
    expect(await prisma.historico.count()).toBe(0);
    expect(await prisma.tarefa.count()).toBe(0);
  });

  it("exige a primeira ação", async () => {
    const e = await erroDe(fluxos.criarOportunidadeComPrimeiraTarefa(entradaOportunidade(b, { tarefa: {} })));
    expect(e).toBeTruthy();
    expect(await prisma.oportunidade.count()).toBe(0);
  });

  it("rejeita contato que não pertence à empresa", async () => {
    const e = await erroDe(
      fluxos.criarOportunidadeComPrimeiraTarefa(entradaOportunidade(b, { empresaId: b.outraEmpresa.id })),
    );
    expect(e.erros.contatoId).toMatch(/não pertence/);
  });

  it("permite inscrição individual com contato sem empresa", async () => {
    const o = await fluxos.criarOportunidadeComPrimeiraTarefa(
      entradaOportunidade(b, { empresaId: "", contatoId: b.individual.id }),
    );
    expect(o.empresaId).toBeNull();
  });
});

describe("mudança de etapa", () => {
  it("grava a etapa e o histórico juntos", async () => {
    const o = await fluxos.criarOportunidadeComPrimeiraTarefa(entradaOportunidade(b));
    await historico.registrarInteracao(o.id, { canal: "WHATSAPP", resumo: "Conversa inicial", combinado: "Enviar proposta" });
    await fluxos.mudarEtapa(o.id, { etapa: "PROPOSTA_ENVIADA" });
    const linha = await historico.linhaDoTempo(o.id);
    expect(linha[0].tipo).toBe("MUDANCA_ETAPA");
    expect(linha[0].etapaAnterior).toBe("NOVO");
    expect(linha[0].etapaNova).toBe("PROPOSTA_ENVIADA");
    expect(linha.some((h) => h.tipo === "INTERACAO" && h.canal === "WHATSAPP")).toBe(true);
  });

  it("Perdido sem motivo é rejeitado e nada muda", async () => {
    const o = await fluxos.criarOportunidadeComPrimeiraTarefa(entradaOportunidade(b));
    const e = await erroDe(fluxos.mudarEtapa(o.id, { etapa: "PERDIDO", motivoPerda: "" }));
    expect(e.erros.motivoPerda).toBeDefined();
    expect((await prisma.oportunidade.findUniqueOrThrow({ where: { id: o.id } })).etapa).toBe("NOVO");
    await fluxos.mudarEtapa(o.id, { etapa: "PERDIDO", motivoPerda: "Sem orçamento" });
    const atual = await prisma.oportunidade.findUniqueOrThrow({ where: { id: o.id } });
    expect(atual.etapa).toBe("PERDIDO");
    expect(atual.motivoPerda).toBe("Sem orçamento");
  });

  it("Fechado exige valor final; pagamento não altera o valor fechado", async () => {
    const o = await fluxos.criarOportunidadeComPrimeiraTarefa(entradaOportunidade(b));
    const e = await erroDe(fluxos.mudarEtapa(o.id, { etapa: "FECHADO", valorFinal: "" }));
    expect(e.erros.valorFinal).toBeDefined();
    await fluxos.mudarEtapa(o.id, { etapa: "FECHADO", valorFinal: "1.234,56" });
    let painel = await indicadoresComerciais();
    expect(painel.vendasFechadas).toEqual({ quantidade: 1, totalCentavos: 123456 });
    await oportunidades.atualizarPagamento(o.id, { statusPagamento: "PAGO" });
    const atual = await prisma.oportunidade.findUniqueOrThrow({ where: { id: o.id } });
    expect(atual.statusPagamento).toBe("PAGO");
    expect(atual.valorFinalCentavos).toBe(123456);
    painel = await indicadoresComerciais();
    expect(painel.vendasFechadas).toEqual({ quantidade: 1, totalCentavos: 123456 });
  });
});

describe("agenda", () => {
  it("concluir a última tarefa exige decidir a próxima ação", async () => {
    const o = await fluxos.criarOportunidadeComPrimeiraTarefa(entradaOportunidade(b));
    const [t] = await prisma.tarefa.findMany({ where: { oportunidadeId: o.id } });
    const e = await erroDe(fluxos.concluirTarefa(t.id, {}));
    expect(e.codigo).toBe("PRECISA_PROXIMA_ACAO");
    expect((await prisma.tarefa.findUniqueOrThrow({ where: { id: t.id } })).situacao).toBe("PENDENTE");

    const r = await fluxos.concluirTarefa(t.id, {
      agendarProxima: true,
      proxima: { descricao: "Enviar proposta", prazo: diaRelativo(3), responsavelId: b.responsavel.id },
    });
    expect(r.proximaAgendada).toBe(true);
    const tarefas = await agenda.tarefasDaOportunidade(o.id);
    expect(tarefas.concluidas).toHaveLength(1);
    expect(tarefas.concluidas[0].concluidaEm).toBeInstanceOf(Date);
    expect(tarefas.pendentes).toHaveLength(1);
  });

  it("concluir sem agendar sinaliza Sem próxima ação", async () => {
    const o = await fluxos.criarOportunidadeComPrimeiraTarefa(entradaOportunidade(b));
    const [t] = await prisma.tarefa.findMany({ where: { oportunidadeId: o.id } });
    const r = await fluxos.concluirTarefa(t.id, { semProximaAcao: true });
    expect(r.semProximaAcao).toBe(true);
  });

  it("fila agrupa por prazo e exclui oportunidades fechadas ou perdidas", async () => {
    const o1 = await fluxos.criarOportunidadeComPrimeiraTarefa(
      entradaOportunidade(b, { tarefa: { descricao: "Atrasada", prazo: diaRelativo(-2), responsavelId: b.responsavel.id } }),
    );
    await agenda.criarTarefa(o1.id, { descricao: "Hoje", prazo: diaRelativo(0), responsavelId: b.responsavel.id });
    await agenda.criarTarefa(o1.id, { descricao: "Futura", prazo: diaRelativo(4), responsavelId: b.responsavel.id });
    const o2 = await fluxos.criarOportunidadeComPrimeiraTarefa(
      entradaOportunidade(b, { tarefa: { descricao: "De perdida", prazo: diaRelativo(-1), responsavelId: b.responsavel.id } }),
    );
    await fluxos.mudarEtapa(o2.id, { etapa: "PERDIDO", motivoPerda: "Preço" });

    const fila = await agenda.filaDeRetornos();
    expect(fila.ATRASADA.map((t) => t.descricao)).toEqual(["Atrasada"]);
    expect(fila.HOJE.map((t) => t.descricao)).toEqual(["Hoje"]);
    expect(fila.FUTURA.map((t) => t.descricao)).toEqual(["Futura"]);

    const painel = await indicadoresComerciais();
    expect(painel.retornosAtrasados).toBe(1);
    expect(painel.oportunidadesAbertas).toBe(1);
  });

  it("reagenda o prazo", async () => {
    const o = await fluxos.criarOportunidadeComPrimeiraTarefa(entradaOportunidade(b));
    const [t] = await prisma.tarefa.findMany({ where: { oportunidadeId: o.id } });
    await agenda.reagendarTarefa(t.id, { prazo: diaRelativo(10) });
    const atual = await prisma.tarefa.findUniqueOrThrow({ where: { id: t.id } });
    expect(atual.prazo.getTime()).toBe(inicioDoDiaSP(diaRelativo(10)).getTime());
  });
});

describe("painel com filtros", () => {
  it("aplica evento e tipo de venda a todos os indicadores", async () => {
    await fluxos.criarOportunidadeComPrimeiraTarefa(entradaOportunidade(b));
    const o2 = await fluxos.criarOportunidadeComPrimeiraTarefa(
      entradaOportunidade(b, { eventoId: b.evento2.id, tipoVenda: "PATROCINIO" }),
    );
    await fluxos.mudarEtapa(o2.id, { etapa: "PROPOSTA_ENVIADA" });
    const evento2 = await indicadoresComerciais({ eventoId: b.evento2.id });
    expect(evento2.oportunidadesAbertas).toBe(1);
    expect(evento2.propostasEnviadas).toBe(1);
    const inscricao = await indicadoresComerciais({ tipoVenda: "INSCRICAO" });
    expect(inscricao.oportunidadesAbertas).toBe(1);
    expect(inscricao.propostasEnviadas).toBe(0);
  });
});

describe("cadastros", () => {
  it("sinaliza e-mail duplicado ignorando maiúsculas e espaços", async () => {
    const e = await erroDe(cadastros.criarContato({ nome: "Maria 2", email: "  MARIA@teste.example " }));
    expect(e.codigo).toBe("DUPLICIDADE_EMAIL");
    const c = await cadastros.criarContato({ nome: "Maria 2", email: "  MARIA@teste.example ", confirmarDuplicidade: true });
    expect(c.emailNormalizado).toBe("maria@teste.example");
    const lista = await cadastros.buscarContatos({ termo: "maria", campo: "EMAIL" });
    expect(lista.contatos.length).toBe(2);
    expect(lista.contatos.every((x) => x.possivelDuplicidade)).toBe(true);
  });

  it("permite contato sem empresa e busca sem acento", async () => {
    const c = await cadastros.criarContato({ nome: "Pessoa Física", email: "pf@teste.example", empresaId: "" });
    expect(c.empresaId).toBeNull();
    expect((await cadastros.buscarEventos("comsaude")).length).toBe(1);
  });

  it("evento não aceita término antes do início", async () => {
    const e = await erroDe(cadastros.criarEvento({ nome: "X", dataInicio: "2027-03-10", dataFim: "2027-03-09" }));
    expect(e).toBeTruthy();
  });
});
