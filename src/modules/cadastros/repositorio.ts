/** Acesso ao banco do módulo Cadastros (Empresa, Contato e dados do contato, Evento, Responsável). */
import type { Prisma } from "@prisma/client";
import { prisma, type Db } from "@/shared/db";

export type GravacaoEmpresa = {
  nome: string;
  nomeBusca: string;
  cnpj: string | null;
  site: string | null;
  linkedin: string | null;
  telefone: string | null;
  telefoneDigitos: string | null;
  email: string | null;
  porte: string | null;
  ramo: string | null;
  setorAtividade: string | null;
  observacoes: string | null;
};

export type GravacaoContato = {
  nome: string;
  sobrenome: string | null;
  nomeBusca: string;
  cpf: string | null;
  rg: string | null;
  dataNascimento: Date | null;
  cargo: string | null;
  departamento: string | null;
  setor: string | null;
  email: string;
  emailNormalizado: string;
  linkedin: string | null;
  recebeMalaDireta: boolean;
  observacoes: string | null;
  empresaId: string | null;
};

export type GravacaoTelefone = { tipo: string; numero: string; numeroDigitos: string; principal: boolean };

const ordemTelefones = [{ principal: "desc" }, { criadoEm: "asc" }] satisfies Prisma.TelefoneContatoOrderByWithRelationInput[];

/** Dados exibidos no card da lista de contatos. */
export const incluirCardContato = {
  empresa: { select: { id: true, nome: true, porte: true, ramo: true, setorAtividade: true } },
  telefones: { orderBy: ordemTelefones },
  tags: { include: { tag: true }, orderBy: { criadoEm: "asc" } },
  _count: { select: { notas: true, arquivos: true } },
} satisfies Prisma.ContatoInclude;

const incluirEvento = {
  serie: true,
  publicoAlvo: { include: { publicoAlvo: true }, orderBy: { publicoAlvo: { nome: "asc" } } },
} satisfies Prisma.EventoInclude;

type GravacaoEvento = {
  nome: string;
  dataInicio: Date;
  dataFim: Date | null;
  serieId: string | null;
  edicao: number | null;
  descricao: string | null;
};

export const repositorioCadastros = {
  // ---------- Empresas ----------
  buscarEmpresas: (where: Prisma.EmpresaWhereInput, db: Db = prisma) =>
    db.empresa.findMany({ where, orderBy: { nome: "asc" }, include: { _count: { select: { contatos: true } } } }),
  obterEmpresa: (id: string, db: Db = prisma) =>
    db.empresa.findUnique({
      where: { id },
      include: { contatos: { orderBy: { nome: "asc" }, include: { telefones: { orderBy: ordemTelefones } } } },
    }),
  criarEmpresa: (dados: GravacaoEmpresa, db: Db = prisma) => db.empresa.create({ data: dados }),
  atualizarEmpresa: (id: string, dados: GravacaoEmpresa, db: Db = prisma) =>
    db.empresa.update({ where: { id }, data: dados }),

  // ---------- Contatos ----------
  contarContatos: (where: Prisma.ContatoWhereInput, db: Db = prisma) => db.contato.count({ where }),
  buscarContatos: (where: Prisma.ContatoWhereInput, pular: number, quantidade: number, db: Db = prisma) =>
    db.contato.findMany({
      where,
      include: incluirCardContato,
      orderBy: [{ nomeBusca: "asc" }],
      skip: pular,
      take: quantidade,
    }),
  obterContato: (id: string, db: Db = prisma) =>
    db.contato.findUnique({ where: { id }, include: { empresa: { select: { id: true, nome: true } } } }),
  obterFichaContato: (id: string, db: Db = prisma) =>
    db.contato.findUnique({
      where: { id },
      include: {
        empresa: true,
        telefones: { orderBy: ordemTelefones },
        tags: { include: { tag: true }, orderBy: { criadoEm: "asc" } },
        notas: { orderBy: { criadoEm: "desc" }, include: { responsavel: { select: { id: true, nome: true } } } },
        arquivos: { orderBy: { criadoEm: "desc" } },
        eventos: { include: { evento: true }, orderBy: { criadoEm: "asc" } },
      },
    }),
  contatosDaEmpresa: (empresaId: string, db: Db = prisma) =>
    db.contato.findMany({ where: { empresaId }, orderBy: { nomeBusca: "asc" } }),
  contatosSemEmpresa: (db: Db = prisma) => db.contato.findMany({ where: { empresaId: null }, orderBy: { nomeBusca: "asc" } }),
  contatosPorEmailNormalizado: (emailNormalizado: string, db: Db = prisma) =>
    db.contato.findMany({ where: { emailNormalizado }, include: { empresa: { select: { nome: true } } } }),
  emailsDuplicados: async (emails: string[], db: Db = prisma) => {
    if (emails.length === 0) return new Set<string>();
    const grupos = await db.contato.groupBy({
      by: ["emailNormalizado"],
      where: { emailNormalizado: { in: emails } },
      _count: { _all: true },
      having: { emailNormalizado: { _count: { gt: 1 } } },
    });
    return new Set(grupos.map((g) => g.emailNormalizado));
  },
  criarContato: (dados: GravacaoContato, db: Db = prisma) => db.contato.create({ data: dados }),
  atualizarContato: (id: string, dados: GravacaoContato, db: Db = prisma) =>
    db.contato.update({ where: { id }, data: dados }),
  substituirTelefones: async (contatoId: string, telefones: GravacaoTelefone[], db: Db = prisma) => {
    await db.telefoneContato.deleteMany({ where: { contatoId } });
    if (telefones.length) await db.telefoneContato.createMany({ data: telefones.map((t) => ({ ...t, contatoId })) });
  },

  // ---------- Tags ----------
  obterOuCriarTag: (nome: string, nomeNormalizado: string, db: Db = prisma) =>
    db.tag.upsert({ where: { nomeNormalizado }, update: {}, create: { nome, nomeNormalizado } }),
  vincularTag: (contatoId: string, tagId: string, db: Db = prisma) =>
    db.contatoTag.upsert({
      where: { contatoId_tagId: { contatoId, tagId } },
      update: {},
      create: { contatoId, tagId },
    }),
  desvincularTag: (contatoId: string, tagId: string, db: Db = prisma) =>
    db.contatoTag.deleteMany({ where: { contatoId, tagId } }),
  tagsMaisUsadas: (limite: number, db: Db = prisma) =>
    db.tag.findMany({
      where: { contatos: { some: {} } },
      include: { _count: { select: { contatos: true } } },
      orderBy: [{ contatos: { _count: "desc" } }, { nome: "asc" }],
      take: limite,
    }),
  obterTag: (id: string, db: Db = prisma) => db.tag.findUnique({ where: { id } }),

  // ---------- Notas ----------
  criarNota: (dados: { contatoId: string; texto: string; responsavelId: string | null }, db: Db = prisma) =>
    db.notaContato.create({ data: dados }),
  obterNota: (id: string, db: Db = prisma) => db.notaContato.findUnique({ where: { id } }),
  atualizarNota: (id: string, texto: string, db: Db = prisma) => db.notaContato.update({ where: { id }, data: { texto } }),
  excluirNota: (id: string, db: Db = prisma) => db.notaContato.delete({ where: { id } }),

  // ---------- Arquivos ----------
  criarArquivo: (
    dados: { contatoId: string; nomeOriginal: string; nomeArmazenado: string; tipoMime: string; tamanhoBytes: number },
    db: Db = prisma,
  ) => db.arquivoContato.create({ data: dados }),
  obterArquivo: (id: string, db: Db = prisma) => db.arquivoContato.findUnique({ where: { id } }),
  excluirArquivo: (id: string, db: Db = prisma) => db.arquivoContato.delete({ where: { id } }),

  // ---------- Eventos associados ----------
  associarEvento: (contatoId: string, eventoId: string, papel: string, db: Db = prisma) =>
    db.contatoEvento.upsert({
      where: { contatoId_eventoId: { contatoId, eventoId } },
      update: { papel },
      create: { contatoId, eventoId, papel },
    }),
  obterAssociacaoEvento: (id: string, db: Db = prisma) => db.contatoEvento.findUnique({ where: { id } }),
  desassociarEvento: (id: string, db: Db = prisma) => db.contatoEvento.delete({ where: { id } }),

  // ---------- Eventos ----------
  listarEventos: (db: Db = prisma) => db.evento.findMany({ orderBy: { dataInicio: "asc" }, include: incluirEvento }),
  obterEvento: (id: string, db: Db = prisma) => db.evento.findUnique({ where: { id }, include: incluirEvento }),
  eventosDaSerie: (serieId: string, db: Db = prisma) =>
    db.evento.findMany({ where: { serieId }, orderBy: { dataInicio: "desc" }, include: incluirEvento }),
  criarEvento: (dados: GravacaoEvento, db: Db = prisma) => db.evento.create({ data: dados }),
  atualizarEvento: (id: string, dados: GravacaoEvento, db: Db = prisma) => db.evento.update({ where: { id }, data: dados }),
  obterOuCriarSerie: (nome: string, nomeBusca: string, db: Db = prisma) =>
    db.serieEvento.upsert({ where: { nomeBusca }, update: {}, create: { nome, nomeBusca } }),
  listarSeries: (db: Db = prisma) => db.serieEvento.findMany({ orderBy: { nome: "asc" }, include: { _count: { select: { eventos: true } } } }),
  obterOuCriarPublicoAlvo: (nome: string, nomeNormalizado: string, db: Db = prisma) =>
    db.publicoAlvo.upsert({ where: { nomeNormalizado }, update: {}, create: { nome, nomeNormalizado } }),
  listarPublicosAlvo: (db: Db = prisma) => db.publicoAlvo.findMany({ orderBy: { nome: "asc" } }),
  definirPublicoAlvo: async (eventoId: string, ids: string[], db: Db = prisma) => {
    await db.eventoPublicoAlvo.deleteMany({ where: { eventoId } });
    for (const publicoAlvoId of ids) await db.eventoPublicoAlvo.create({ data: { eventoId, publicoAlvoId } });
  },
  sugerirEmpresas: (where: Prisma.EmpresaWhereInput, limite: number, db: Db = prisma) =>
    db.empresa.findMany({ where, orderBy: { nome: "asc" }, take: limite, select: { id: true, nome: true, cnpj: true, ramo: true } }),
  empresaPorNomeBusca: (nomeBusca: string, db: Db = prisma) => db.empresa.findFirst({ where: { nomeBusca } }),

  // ---------- Responsáveis ----------
  listarResponsaveis: (db: Db = prisma) => db.responsavel.findMany({ orderBy: { nome: "asc" } }),
  obterResponsavel: (id: string, db: Db = prisma) => db.responsavel.findUnique({ where: { id } }),
};
