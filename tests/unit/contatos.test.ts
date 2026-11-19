import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/shared/db";
import { cnpjValido, cpfValido, formatarTelefone } from "@/shared/documentos";
import { ErroDeNegocio } from "@/shared/resultado";
import * as cadastros from "@/modules/cadastros/servico";
import { TAMANHO_MAXIMO_ARQUIVO } from "@/modules/cadastros/dominio";
import * as agenda from "@/modules/agenda/servico";
import * as fluxos from "@/fluxos/oportunidade";
import { indicadoresComerciais } from "@/modules/painel/servico";
import { basico, diaRelativo, entradaOportunidade, limparBanco } from "./apoio";

const CPF = "52998224725"; // CPF de teste válido
const CNPJ = "11222333000181"; // CNPJ de teste válido

let b: Awaited<ReturnType<typeof basico>>;
let empresaId: string;
let joseId: string;
let anaId: string;

async function erroDe(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    return e as ErroDeNegocio;
  }
  throw new Error("Era esperado um erro.");
}

beforeEach(async () => {
  await limparBanco();
  b = await basico();
  const empresa = await cadastros.criarEmpresa({
    nome: "Drogaria São José",
    cnpj: "11.222.333/0001-81",
    telefone: "(19) 3429-1200",
    email: "contato@saojose.example",
    porte: "MEDIO",
    ramo: "COMERCIO",
    setorAtividade: "Farmácia/Medicamentos",
  });
  empresaId = empresa.id;
  const jose = await cadastros.criarContato({
    nome: "José",
    sobrenome: "Ávila",
    email: "jose@saojose.example",
    empresaId,
    cargo: "Gerente Financeiro",
    departamento: "Financeiro",
    telefones: [
      { tipo: "COMERCIAL", numero: "(19) 3429-1201", principal: false },
      { tipo: "CELULAR", numero: "(19) 99999-0001", principal: true },
    ],
  });
  joseId = jose.id;
  const ana = await cadastros.criarContato({
    nome: "Ana",
    sobrenome: "Lucas",
    email: "ana.lucas@email.example",
    cpf: "529.982.247-25",
    rg: "12.345.678-9",
    telefones: [{ tipo: "WHATSAPP", numero: "11 98888-7777" }],
  });
  anaId = ana.id;
});

describe("documentos", () => {
  it("valida CPF e CNPJ e formata telefone", () => {
    expect(cpfValido(CPF)).toBe(true);
    expect(cpfValido("111.111.111-11")).toBe(false);
    expect(cnpjValido(CNPJ)).toBe(true);
    expect(cnpjValido("11.222.333/0001-82")).toBe(false);
    expect(formatarTelefone("19999990001")).toBe("(19) 99999-0001");
  });

  it("rejeita CPF, CNPJ e LinkedIn inválidos com erro no campo", async () => {
    const e1 = await erroDe(cadastros.criarContato({ nome: "X", email: "x@x.example", cpf: "123.456.789-00" }));
    expect((e1 as unknown as { issues: { path: string[] }[] }).issues?.[0].path).toEqual(["cpf"]);
    const e2 = await erroDe(cadastros.criarEmpresa({ nome: "Y", cnpj: "00.000.000/0000-00" }));
    expect(e2).toBeTruthy();
    const e3 = await erroDe(cadastros.criarContato({ nome: "Z", email: "z@z.example", linkedin: "https://facebook.com/z" }));
    expect(e3).toBeTruthy();
  });
});

describe("telefones", () => {
  it("guarda vários telefones com um único principal, primeiro na lista", async () => {
    const ficha = await cadastros.obterFichaContato(joseId);
    expect(ficha?.telefones.map((t) => [t.tipo, t.principal])).toEqual([
      ["CELULAR", true],
      ["COMERCIAL", false],
    ]);
    // sem principal marcado → o primeiro vira principal
    const ana = await cadastros.obterFichaContato(anaId);
    expect(ana?.telefones[0].principal).toBe(true);
  });

  it("rejeita dois telefones principais", async () => {
    const e = await erroDe(
      cadastros.criarContato({
        nome: "Dois",
        email: "dois@x.example",
        telefones: [
          { tipo: "CELULAR", numero: "11999990000", principal: true },
          { tipo: "COMERCIAL", numero: "1133330000", principal: true },
        ],
      }),
    );
    expect(e).toBeTruthy();
  });

  it("editar substitui a lista de telefones", async () => {
    await cadastros.atualizarContato(joseId, {
      nome: "José",
      sobrenome: "Ávila",
      email: "jose@saojose.example",
      empresaId,
      telefones: [{ tipo: "WHATSAPP", numero: "(19) 97777-0000", principal: true }],
    });
    const ficha = await cadastros.obterFichaContato(joseId);
    expect(ficha?.telefones).toHaveLength(1);
    expect(ficha?.telefones[0].numeroDigitos).toBe("19977770000");
  });
});

describe("busca de contatos", () => {
  const nomes = async (p: Parameters<typeof cadastros.buscarContatos>[0]) =>
    (await cadastros.buscarContatos(p)).contatos.map((c) => c.nome).sort();

  it("Nome: pessoa física ignora acentos e maiúsculas; jurídica busca pelo nome da empresa", async () => {
    expect(await nomes({ termo: "JOSE AVILA", campo: "NOME", escopo: "FISICA" })).toEqual(["José"]);
    expect(await nomes({ termo: "lucas", campo: "NOME", escopo: "FISICA" })).toEqual(["Ana"]);
    expect(await nomes({ termo: "sao jose", campo: "NOME", escopo: "JURIDICA" })).toEqual(["José"]);
    expect(await nomes({ termo: "sao jose", campo: "NOME", escopo: "FISICA" })).toEqual([]);
    expect(await nomes({ termo: "jos", campo: "NOME", escopo: "AMBOS" })).toEqual(["José"]);
  });

  it("Telefone: ignora máscara; jurídica usa o telefone da empresa", async () => {
    expect(await nomes({ termo: "(19) 99999-0001", campo: "TELEFONE", escopo: "FISICA" })).toEqual(["José"]);
    expect(await nomes({ termo: "988887777", campo: "TELEFONE" })).toEqual(["Ana"]);
    expect(await nomes({ termo: "3429-1200", campo: "TELEFONE", escopo: "JURIDICA" })).toEqual(["José"]);
  });

  it("CPF/CNPJ e RG ignoram pontuação", async () => {
    expect(await nomes({ termo: "529.982.247-25", campo: "DOCUMENTO", escopo: "FISICA" })).toEqual(["Ana"]);
    expect(await nomes({ termo: "11.222.333/0001-81", campo: "DOCUMENTO", escopo: "JURIDICA" })).toEqual(["José"]);
    expect(await nomes({ termo: "12345678-9", campo: "RG" })).toEqual(["Ana"]);
  });

  it("E-mail e Tag", async () => {
    await cadastros.adicionarTag(joseId, { nome: "Decisor" });
    expect(await nomes({ termo: "ANA.LUCAS@", campo: "EMAIL" })).toEqual(["Ana"]);
    expect(await nomes({ termo: "@saojose.example", campo: "EMAIL", escopo: "JURIDICA" })).toEqual(["José"]);
    expect(await nomes({ termo: "decis", campo: "TAG" })).toEqual(["José"]);
  });

  it("Tag em pessoa jurídica avisa que a tag é da pessoa", async () => {
    const r = await cadastros.buscarContatos({ termo: "x", campo: "TAG", escopo: "JURIDICA" });
    expect(r.total).toBe(0);
    expect(r.aviso).toMatch(/pertencem à pessoa/);
  });

  it("filtros por tag, sem empresa e restrição por ids", async () => {
    const tag = await cadastros.adicionarTag(anaId, { nome: "Mala direta" });
    expect(await nomes({ tagId: tag.id })).toEqual(["Ana"]);
    expect(await nomes({ filtro: "SEM_EMPRESA" })).toContain("Ana");
    expect((await cadastros.buscarContatos({}, { incluirIds: [joseId] })).contatos.map((c) => c.id)).toEqual([joseId]);
  });
});

describe("tags, notas, eventos e arquivos", () => {
  it("tag não duplica (ignora acentos e maiúsculas) e pode ser removida", async () => {
    const t1 = await cadastros.adicionarTag(joseId, { nome: "Saúde" });
    const t2 = await cadastros.adicionarTag(anaId, { nome: "  SAUDE " });
    expect(t2.id).toBe(t1.id);
    await cadastros.adicionarTag(joseId, { nome: "saúde" });
    expect(await prisma.contatoTag.count({ where: { contatoId: joseId } })).toBe(1);
    const mais = await cadastros.tagsMaisUsadas();
    expect(mais[0]._count.contatos).toBe(2);
    await cadastros.removerTag(joseId, t1.id);
    expect(await prisma.contatoTag.count({ where: { contatoId: joseId } })).toBe(0);
  });

  it("notas: criar, editar e excluir", async () => {
    const n = await cadastros.criarNota(joseId, { texto: "Prefere ligação à tarde.", responsavelId: b.responsavel.id });
    await cadastros.atualizarNota(n.id, { texto: "Prefere WhatsApp." });
    expect((await cadastros.obterFichaContato(joseId))?.notas[0].texto).toBe("Prefere WhatsApp.");
    await cadastros.excluirNota(n.id);
    expect((await cadastros.obterFichaContato(joseId))?.notas).toHaveLength(0);
    expect(await erroDe(cadastros.criarNota(joseId, { texto: " " }))).toBeTruthy();
  });

  it("eventos: associa com papel e atualiza sem duplicar", async () => {
    await cadastros.associarEvento(joseId, { eventoId: b.evento.id, papel: "INTERESSADO" });
    await cadastros.associarEvento(joseId, { eventoId: b.evento.id, papel: "PARTICIPANTE" });
    const ficha = await cadastros.obterFichaContato(joseId);
    expect(ficha?.eventos.map((e) => e.papel)).toEqual(["PARTICIPANTE"]);
  });

  it("arquivos: grava, lê, rejeita executável e > 10 MB, exclui", async () => {
    const a = await cadastros.anexarArquivo(joseId, { nome: "proposta.pdf", tipo: "application/pdf", conteudo: Buffer.from("%PDF-1.4 teste") });
    const lido = await cadastros.lerArquivo(joseId, a.id);
    expect(lido?.conteudo.toString()).toBe("%PDF-1.4 teste");
    expect(await cadastros.lerArquivo(anaId, a.id)).toBeNull(); // arquivo de outro contato
    const exe = await erroDe(cadastros.anexarArquivo(joseId, { nome: "virus.exe", tipo: "", conteudo: Buffer.from("x") }));
    expect(exe.erros.arquivo).toMatch(/executáveis/);
    const grande = await erroDe(
      cadastros.anexarArquivo(joseId, { nome: "grande.pdf", tipo: "", conteudo: Buffer.alloc(TAMANHO_MAXIMO_ARQUIVO + 1) }),
    );
    expect(grande.erros.arquivo).toMatch(/10 MB/);
    await cadastros.excluirArquivo(a.id);
    expect(await cadastros.lerArquivo(joseId, a.id)).toBeNull();
  });
});

describe("calendário do contato (Agenda)", () => {
  it("tarefa exige contato ou oportunidade", async () => {
    const e = await erroDe(
      agenda.criarTarefaVinculada({}, { descricao: "X", prazo: diaRelativo(1), responsavelId: b.responsavel.id }),
    );
    expect(e.message).toMatch(/contato ou a uma oportunidade/);
  });

  it("tarefa só de contato aparece no calendário e na fila, sem contar nos retornos atrasados", async () => {
    await agenda.criarTarefaVinculada(
      { contatoId: joseId },
      { descricao: "Ligar para José", prazo: diaRelativo(-1), responsavelId: b.responsavel.id },
    );
    const cal = await agenda.tarefasDoContato(joseId);
    expect(cal.pendentes.map((t) => t.descricao)).toEqual(["Ligar para José"]);
    const fila = await agenda.filaDeRetornos();
    expect(fila.ATRASADA.map((t) => t.descricao)).toContain("Ligar para José");
    expect((await indicadoresComerciais()).retornosAtrasados).toBe(0);
    expect((await agenda.pendentesPorContato([joseId])).get(joseId)).toBe(1);
  });

  it("calendário inclui tarefas das oportunidades do contato; vínculo exige oportunidade do próprio contato", async () => {
    const o = await fluxos.criarOportunidadeComPrimeiraTarefa(entradaOportunidade(b));
    const cal = await agenda.tarefasDoContato(b.contato.id);
    expect(cal.pendentes).toHaveLength(1);
    const e = await erroDe(
      agenda.criarTarefaVinculada(
        { contatoId: joseId, oportunidadeId: o.id },
        { descricao: "Errada", prazo: diaRelativo(1), responsavelId: b.responsavel.id },
      ),
    );
    expect(e.erros.oportunidadeId).toBeDefined();
  });

  it("concluir tarefa só de contato não exige próxima ação", async () => {
    const t = await agenda.criarTarefaVinculada(
      { contatoId: joseId },
      { descricao: "Enviar material", prazo: diaRelativo(0), responsavelId: b.responsavel.id },
    );
    const r = await fluxos.concluirTarefa(t.id, {});
    expect(r.semProximaAcao).toBe(false);
    expect((await agenda.tarefasDoContato(joseId)).concluidas).toHaveLength(1);
  });
});
