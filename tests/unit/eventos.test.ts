import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/shared/db";
import { separarLista } from "@/modules/cadastros/schemas";
import * as cadastros from "@/modules/cadastros/servico";
import * as participantes from "@/modules/participantes/servico";
import { basico, limparBanco } from "./apoio";

let b: Awaited<ReturnType<typeof basico>>;
beforeEach(async () => {
  await limparBanco();
  b = await basico();
});

const nomesPublico = async (eventoId: string) =>
  (await cadastros.obterEvento(eventoId))!.publicoAlvo.map((p) => p.publicoAlvo.nome).sort();

describe("eventos: série, edição, descrição e público-alvo", () => {
  it("separa a lista de público-alvo sem repetir (acento/maiúsculas)", () => {
    expect(separarLista("SST, Saúde ocupacional; sst\nRH ,  ")).toEqual(["SST", "Saúde ocupacional", "RH"]);
    expect(separarLista(null)).toEqual([]);
  });

  it("cria a série pelo nome (reaproveitando sem acento/maiúsculas) e usa o ano do início como edição", async () => {
    const e1 = await cadastros.criarEvento({
      nome: "COMSAÚDE 2026",
      serie: "COMSAÚDE",
      dataInicio: "2026-03-17",
      descricao: "Congresso de saúde",
      publicoAlvo: "Saúde ocupacional, SST",
    });
    const e2 = await cadastros.criarEvento({ nome: "COMSAÚDE 2027", serie: " comsaude ", edicao: "2027", dataInicio: "2027-03-16", publicoAlvo: "sst, RH" });
    expect(e1.serieId).not.toBeNull();
    expect(e2.serieId).toBe(e1.serieId);
    expect(e1.edicao).toBe(2026);
    expect(e1.descricao).toBe("Congresso de saúde");
    expect(await prisma.serieEvento.count()).toBe(1);
    // "sst" reaproveita o público "SST" já existente
    expect(await prisma.publicoAlvo.count()).toBe(3);
    expect(await nomesPublico(e2.id)).toEqual(["RH", "SST"]);

    const edicoes = await cadastros.edicoesDaSerie(e1.id);
    expect(edicoes.map((e) => e.nome)).toEqual(["COMSAÚDE 2027", "COMSAÚDE 2026"]);
    expect(await cadastros.edicoesDaSerie(b.evento.id)).toEqual([]);
    // busca de eventos também encontra pelo nome da série
    expect((await cadastros.buscarEventos("comsaude")).map((e) => e.id)).toEqual(expect.arrayContaining([e1.id, e2.id]));
  });

  it("ao editar, troca o público-alvo e pode tirar o evento da série", async () => {
    const e = await cadastros.criarEvento({ nome: "IATECH RH 2027", serie: "IATECH RH", dataInicio: "2027-05-20", publicoAlvo: "RH, Tecnologia" });
    await cadastros.atualizarEvento(e.id, { nome: "IATECH RH 2027", serie: "", dataInicio: "2027-05-20", publicoAlvo: "Gestão de pessoas" });
    const atual = (await cadastros.obterEvento(e.id))!;
    expect(atual.serieId).toBeNull();
    expect(atual.edicao).toBeNull();
    expect(await nomesPublico(e.id)).toEqual(["Gestão de pessoas"]);
  });

  it("recusa edição inválida", async () => {
    await expect(cadastros.criarEvento({ nome: "X", serie: "X", edicao: "27", dataInicio: "2027-01-01" })).rejects.toMatchObject({
      issues: [expect.objectContaining({ path: ["edicao"] })],
    });
  });
});

describe("empresa com digitação", () => {
  it("sugere primeiro as que começam com o termo, também por CNPJ, com limite", async () => {
    await cadastros.criarEmpresa({ nome: "Clínica São Lucas" });
    await cadastros.criarEmpresa({ nome: "Hospital São Lucas" });
    await cadastros.criarEmpresa({ nome: "Saúde Mais", cnpj: "11.222.333/0001-81" });
    expect((await cadastros.sugerirEmpresas("sao lu")).map((e) => e.nome)).toEqual(["Clínica São Lucas", "Hospital São Lucas"]);
    expect((await cadastros.sugerirEmpresas("hosp")).map((e) => e.nome)).toEqual(["Hospital São Lucas"]);
    expect((await cadastros.sugerirEmpresas("saude")).map((e) => e.nome)[0]).toBe("Saúde Mais");
    expect((await cadastros.sugerirEmpresas("11222")).map((e) => e.nome)).toEqual(["Saúde Mais"]);
    expect(await cadastros.sugerirEmpresas("", 2)).toHaveLength(2);
  });

  it("cadastro rápido não duplica empresa com o mesmo nome", async () => {
    const a = await cadastros.obterOuCriarEmpresaPorNome("Clínica Bem Viver");
    const b2 = await cadastros.obterOuCriarEmpresaPorNome("  clinica bem viver ");
    expect(b2.id).toBe(a.id);
    expect(await prisma.empresa.count({ where: { nomeBusca: "clinica bem viver" } })).toBe(1);
    await expect(cadastros.obterOuCriarEmpresaPorNome("   ")).rejects.toBeTruthy();
  });
});

describe("participantes em várias edições", () => {
  it("marca quem esteve em outra edição da série e agrupa as participações do contato", async () => {
    const e26 = await cadastros.criarEvento({ nome: "COMSAÚDE 2026", serie: "COMSAÚDE", dataInicio: "2026-03-17" });
    const e27 = await cadastros.criarEvento({ nome: "COMSAÚDE 2027", serie: "COMSAÚDE", dataInicio: "2027-03-16" });
    const inscrever = (eventoId: string, email: string) =>
      participantes.inscreverParticipante(eventoId, { nomeCompleto: "Pessoa Teste", email, nomeCracha: "PESSOA", modalidade: "PRESENCIAL", tipoInscricao: "CORTESIA" }, null);
    const antiga = await inscrever(e26.id, "maria@teste.example");
    const cancelada = await inscrever(e26.id, "joao@teste.example");
    await participantes.alterarPresenca(cancelada.id, { presenca: "CANCELADA" }, null);
    await inscrever(e27.id, "maria@teste.example");
    await inscrever(e27.id, "joao@teste.example");
    await inscrever(e27.id, "nova@teste.example");
    await inscrever(b.evento2.id, "maria@teste.example"); // outra série: não conta

    const recorrentes = await participantes.participacoesEmOutrasEdicoes(e27.id);
    expect([...recorrentes.keys()]).toEqual([antiga.contatoId]);
    expect(recorrentes.get(antiga.contatoId)).toEqual([{ eventoId: e26.id, nome: "COMSAÚDE 2026", edicao: 2026 }]);
    expect((await participantes.participacoesEmOutrasEdicoes(b.evento2.id)).size).toBe(0);

    const grupos = participantes.agruparPorSerie(await participantes.participacoesDoContato(antiga.contatoId));
    expect(grupos.map((g) => [g.serie, g.itens.map((i) => i.evento.nome)])).toEqual([
      ["Outros eventos", ["IATECH RH 2027"]],
      ["COMSAÚDE", ["COMSAÚDE 2027", "COMSAÚDE 2026"]],
    ]);
  });
});
