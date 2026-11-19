/**
 * Operações do módulo Cadastros. Outros módulos devem usar estas funções
 * (nunca o repositório) para consultar ou validar empresas, contatos, eventos e responsáveis.
 */
import type { Prisma } from "@prisma/client";
import { prisma, type Db } from "@/shared/db";
import { inicioDoDiaSP } from "@/shared/datas";
import { somenteDigitos, telefoneValido } from "@/shared/documentos";
import { ErroDeNegocio } from "@/shared/resultado";
import { correspondeBusca, normalizarBusca } from "@/shared/texto";
import { apagarDoDisco, extensao, gravarNoDisco, lerDoDisco } from "./arquivos";
import {
  chaveBuscaNome,
  EXTENSOES_BLOQUEADAS,
  normalizarEmail,
  TAMANHO_MAXIMO_ARQUIVO,
  type CampoBusca,
} from "./dominio";
import { repositorioCadastros as repo } from "./repositorio";
import {
  buscaContatosSchema,
  contatoEventoSchema,
  contatoSchema,
  empresaSchema,
  eventoSchema,
  notaSchema,
  tagSchema,
  type BuscaContatos,
} from "./schemas";

export const CONTATOS_POR_PAGINA = 20;

// ---------- Empresas ----------

/** Busca empresas por nome (sem acento/maiúsculas) ou CNPJ. */
export async function buscarEmpresas(busca?: string) {
  const termo = normalizarBusca(busca ?? "");
  const digitos = somenteDigitos(busca);
  const where: Prisma.EmpresaWhereInput = termo
    ? { OR: [{ nomeBusca: { contains: termo } }, ...(digitos.length >= 3 ? [{ cnpj: { contains: digitos } }] : [])] }
    : {};
  return repo.buscarEmpresas(where);
}

/** Sugestões para o campo de empresa com digitação (poucos resultados, busca no banco; primeiro as que começam com o termo). */
export async function sugerirEmpresas(busca: string, limite = 8) {
  const termo = normalizarBusca(busca ?? "");
  const digitos = somenteDigitos(busca);
  if (!termo) return repo.sugerirEmpresas({}, limite);
  const comeca = await repo.sugerirEmpresas({ nomeBusca: { startsWith: termo } }, limite);
  if (comeca.length >= limite) return comeca;
  const resto = await repo.sugerirEmpresas(
    {
      id: { notIn: comeca.map((e) => e.id) },
      OR: [{ nomeBusca: { contains: termo } }, ...(digitos.length >= 3 ? [{ cnpj: { contains: digitos } }] : [])],
    },
    limite - comeca.length,
  );
  return [...comeca, ...resto];
}

/** Cadastro rápido a partir do nome digitado; se já existir empresa com o mesmo nome, devolve a existente. */
export async function obterOuCriarEmpresaPorNome(nome: string) {
  const dados = prepararEmpresa({ nome });
  const existente = await repo.empresaPorNomeBusca(dados.nomeBusca);
  return existente ?? repo.criarEmpresa(dados);
}

export const obterEmpresa = (id: string) => repo.obterEmpresa(id);

function prepararEmpresa(entrada: unknown) {
  const d = empresaSchema.parse(entrada);
  return {
    ...d,
    nomeBusca: normalizarBusca(d.nome),
    telefoneDigitos: d.telefone ? somenteDigitos(d.telefone) : null,
  };
}

export async function criarEmpresa(entrada: unknown) {
  return repo.criarEmpresa(prepararEmpresa(entrada));
}

export async function atualizarEmpresa(id: string, entrada: unknown) {
  const dados = prepararEmpresa(entrada);
  if (!(await repo.obterEmpresa(id))) throw new ErroDeNegocio("Empresa não encontrada.");
  return repo.atualizarEmpresa(id, dados);
}

// ---------- Busca de contatos ----------

/** Condição de busca para um campo, na pessoa (Física) e na empresa (Jurídica). */
type Condicoes = { fisica: Prisma.ContatoWhereInput | null; juridica: Prisma.ContatoWhereInput | null };

function condicoesDoCampo(campo: CampoBusca, termo: string): Condicoes {
  const texto = normalizarBusca(termo);
  const digitos = somenteDigitos(termo);
  const semDigitos: Condicoes = { fisica: null, juridica: null };
  switch (campo) {
    case "NOME":
      return {
        fisica: { nomeBusca: { contains: texto } },
        juridica: { empresa: { is: { nomeBusca: { contains: texto } } } },
      };
    case "TAG":
      return { fisica: { tags: { some: { tag: { nomeNormalizado: { contains: texto } } } } }, juridica: null };
    case "EMAIL":
      return {
        fisica: { emailNormalizado: { contains: termo.trim().toLowerCase() } },
        juridica: { empresa: { is: { email: { contains: termo.trim() } } } },
      };
    case "TELEFONE":
      if (!digitos) return semDigitos;
      return {
        fisica: { telefones: { some: { numeroDigitos: { contains: digitos } } } },
        juridica: { empresa: { is: { telefoneDigitos: { contains: digitos } } } },
      };
    case "DOCUMENTO":
      if (!digitos) return semDigitos;
      return {
        fisica: { cpf: { contains: digitos } },
        juridica: { empresa: { is: { cnpj: { contains: digitos } } } },
      };
    case "RG": {
      const rg = termo.replace(/[^0-9a-zA-Z]/g, "").toUpperCase();
      return { fisica: rg ? { rg: { contains: rg } } : null, juridica: null };
    }
  }
}

/**
 * Busca de contatos da aba Contatos.
 * - campo: Nome, Tag, E-mail, Telefone, CPF/CNPJ ou RG;
 * - escopo: FISICA (dados da pessoa), JURIDICA (dados da empresa → seus contatos) ou AMBOS;
 * - incluirIds/excluirIds: restrições compostas pela tela (ex.: contatos com negócios em andamento, vindos de Oportunidades).
 */
export async function buscarContatos(
  entrada: BuscaContatos = {},
  restricoes: { incluirIds?: string[]; excluirIds?: string[] } = {},
) {
  const p = buscaContatosSchema.parse(entrada);
  const termo = p.termo.trim();
  const condicoes: Prisma.ContatoWhereInput[] = [];
  let aviso: string | null = null;

  if (termo) {
    const c = condicoesDoCampo(p.campo, termo);
    const opcoes = [p.escopo !== "JURIDICA" ? c.fisica : null, p.escopo !== "FISICA" ? c.juridica : null].filter(
      (x): x is Prisma.ContatoWhereInput => x !== null,
    );
    if (opcoes.length === 0) {
      aviso =
        p.escopo === "JURIDICA" && (p.campo === "TAG" || p.campo === "RG")
          ? "Tag e RG pertencem à pessoa. Use “Pessoa física” ou “Física e Jurídica”."
          : "Digite números para buscar por telefone ou documento.";
      condicoes.push({ id: "__nenhum__" });
    } else {
      condicoes.push({ OR: opcoes });
    }
  }
  if (p.tagId) condicoes.push({ tags: { some: { tagId: p.tagId } } });
  if (p.filtro === "SEM_EMPRESA") condicoes.push({ empresaId: null });
  if (restricoes.incluirIds) condicoes.push({ id: { in: restricoes.incluirIds } });
  if (restricoes.excluirIds?.length) condicoes.push({ id: { notIn: restricoes.excluirIds } });

  const where: Prisma.ContatoWhereInput = condicoes.length ? { AND: condicoes } : {};
  const total = await repo.contarContatos(where);
  const paginas = Math.max(1, Math.ceil(total / CONTATOS_POR_PAGINA));
  const pagina = Math.min(p.pagina, paginas);
  const contatos = await repo.buscarContatos(where, (pagina - 1) * CONTATOS_POR_PAGINA, CONTATOS_POR_PAGINA);
  const duplicados = await repo.emailsDuplicados(contatos.map((c) => c.emailNormalizado));
  return {
    contatos: contatos.map((c) => ({ ...c, possivelDuplicidade: duplicados.has(c.emailNormalizado) })),
    total,
    pagina,
    paginas,
    aviso,
    parametros: p,
  };
}

/** Totais das visões da lista de contatos. `comNegocios` vem de Oportunidades (composição feita pela tela). */
export async function contarVisoesDeContatos(comNegocios: string[]) {
  const [todos, com, semEmpresa] = await Promise.all([
    repo.contarContatos({}),
    repo.contarContatos({ id: { in: comNegocios } }),
    repo.contarContatos({ empresaId: null }),
  ]);
  return { todos, comNegocios: com, semNegocios: todos - com, semEmpresa };
}

export const obterContato = (id: string) => repo.obterContato(id);
/** Ficha completa: empresa, telefones, tags, notas, arquivos e eventos associados. */
export const obterFichaContato = (id: string) => repo.obterFichaContato(id);

async function contatoOuFalhar(id: string, db: Db = prisma) {
  const c = await repo.obterContato(id, db);
  if (!c) throw new ErroDeNegocio("Contato não encontrado.");
  return c;
}

/** Contatos que podem ser contato principal: os da empresa, ou os sem empresa (compra individual). */
export function contatosParaOportunidade(empresaId: string | null) {
  return empresaId ? repo.contatosDaEmpresa(empresaId) : repo.contatosSemEmpresa();
}

/** Outros contatos com o mesmo e-mail (ignora maiúsculas e espaços nas extremidades). */
export async function verificarDuplicidadeEmail(email: string, ignorarId?: string) {
  const iguais = await repo.contatosPorEmailNormalizado(normalizarEmail(email));
  return iguais.filter((c) => c.id !== ignorarId);
}

async function prepararContato(entrada: unknown, ignorarId?: string) {
  const d = contatoSchema.parse(entrada);
  if (d.empresaId && !(await repo.obterEmpresa(d.empresaId))) {
    throw new ErroDeNegocio("Empresa não encontrada.", { empresaId: "Empresa não encontrada." });
  }
  const duplicados = await verificarDuplicidadeEmail(d.email, ignorarId);
  if (duplicados.length > 0 && !d.confirmarDuplicidade) {
    const nomes = duplicados.map((c) => (c.empresa ? `${c.nome} (${c.empresa.nome})` : c.nome)).join(", ");
    throw new ErroDeNegocio(
      "Possível contato duplicado. Confirme para salvar mesmo assim.",
      { email: `Já existe contato com este e-mail: ${nomes}.` },
      "DUPLICIDADE_EMAIL",
    );
  }
  return {
    contato: {
      nome: d.nome,
      sobrenome: d.sobrenome,
      nomeBusca: chaveBuscaNome(d.nome, d.sobrenome),
      cpf: d.cpf,
      rg: d.rg,
      dataNascimento: d.dataNascimento ? inicioDoDiaSP(d.dataNascimento) : null,
      cargo: d.cargo,
      departamento: d.departamento,
      setor: d.setor,
      email: d.email.trim(),
      emailNormalizado: normalizarEmail(d.email),
      linkedin: d.linkedin,
      recebeMalaDireta: d.recebeMalaDireta,
      observacoes: d.observacoes,
      empresaId: d.empresaId,
    },
    telefones: d.telefones.map((t) => ({
      tipo: t.tipo,
      numero: t.numero.trim(),
      numeroDigitos: somenteDigitos(t.numero),
      principal: t.principal,
    })),
  };
}

/** Cria o contato e seus telefones na mesma transação. */
export async function criarContato(entrada: unknown) {
  const { contato, telefones } = await prepararContato(entrada);
  return prisma.$transaction(async (tx) => {
    const c = await repo.criarContato(contato, tx);
    await repo.substituirTelefones(c.id, telefones, tx);
    return c;
  });
}

/** Atualiza o contato e substitui a lista de telefones na mesma transação. */
export async function atualizarContato(id: string, entrada: unknown) {
  await contatoOuFalhar(id);
  const { contato, telefones } = await prepararContato(entrada, id);
  return prisma.$transaction(async (tx) => {
    const c = await repo.atualizarContato(id, contato, tx);
    await repo.substituirTelefones(id, telefones, tx);
    return c;
  });
}

// ---------- Tags ----------

/** Adiciona uma tag ao contato; reaproveita a tag existente com o mesmo nome (ignora acentos/maiúsculas). */
export async function adicionarTag(contatoId: string, entrada: unknown) {
  const { nome } = tagSchema.parse(entrada);
  await contatoOuFalhar(contatoId);
  const tag = await repo.obterOuCriarTag(nome, normalizarBusca(nome));
  await repo.vincularTag(contatoId, tag.id);
  return tag;
}

export async function removerTag(contatoId: string, tagId: string) {
  await repo.desvincularTag(contatoId, tagId);
}

export const tagsMaisUsadas = (limite = 15) => repo.tagsMaisUsadas(limite);
export const obterTag = (id: string) => repo.obterTag(id);

// ---------- Notas ----------

export async function criarNota(contatoId: string, entrada: unknown) {
  const d = notaSchema.parse(entrada);
  await contatoOuFalhar(contatoId);
  if (d.responsavelId) await validarResponsavel(d.responsavelId);
  return repo.criarNota({ contatoId, texto: d.texto, responsavelId: d.responsavelId });
}

export async function atualizarNota(notaId: string, entrada: unknown) {
  const d = notaSchema.parse(entrada);
  if (!(await repo.obterNota(notaId))) throw new ErroDeNegocio("Nota não encontrada.");
  return repo.atualizarNota(notaId, d.texto);
}

export async function excluirNota(notaId: string) {
  const n = await repo.obterNota(notaId);
  if (!n) throw new ErroDeNegocio("Nota não encontrada.");
  await repo.excluirNota(notaId);
  return n;
}

// ---------- Arquivos ----------

/** Grava o arquivo no disco e o registro no banco; se o banco falhar, apaga o arquivo. */
export async function anexarArquivo(contatoId: string, arquivo: { nome: string; tipo: string; conteudo: Buffer }) {
  await contatoOuFalhar(contatoId);
  const nome = arquivo.nome.trim().slice(0, 200);
  if (!nome || arquivo.conteudo.length === 0) {
    throw new ErroDeNegocio("Selecione um arquivo.", { arquivo: "Selecione um arquivo." });
  }
  if (arquivo.conteudo.length > TAMANHO_MAXIMO_ARQUIVO) {
    throw new ErroDeNegocio("Arquivo maior que 10 MB.", { arquivo: "O limite é 10 MB por arquivo." });
  }
  if (EXTENSOES_BLOQUEADAS.includes(extensao(nome))) {
    throw new ErroDeNegocio("Tipo de arquivo não permitido.", { arquivo: "Arquivos executáveis não são permitidos." });
  }
  const nomeArmazenado = await gravarNoDisco(contatoId, nome, arquivo.conteudo);
  try {
    return await repo.criarArquivo({
      contatoId,
      nomeOriginal: nome,
      nomeArmazenado,
      tipoMime: arquivo.tipo || "application/octet-stream",
      tamanhoBytes: arquivo.conteudo.length,
    });
  } catch (erro) {
    await apagarDoDisco(contatoId, nomeArmazenado);
    throw erro;
  }
}

export async function lerArquivo(contatoId: string, arquivoId: string) {
  const a = await repo.obterArquivo(arquivoId);
  if (!a || a.contatoId !== contatoId) return null;
  try {
    return { registro: a, conteudo: await lerDoDisco(contatoId, a.nomeArmazenado) };
  } catch {
    return null;
  }
}

export async function excluirArquivo(arquivoId: string) {
  const a = await repo.obterArquivo(arquivoId);
  if (!a) throw new ErroDeNegocio("Arquivo não encontrado.");
  await repo.excluirArquivo(arquivoId);
  await apagarDoDisco(a.contatoId, a.nomeArmazenado);
  return a;
}

// ---------- Eventos associados ao contato ----------

export async function associarEvento(contatoId: string, entrada: unknown) {
  const d = contatoEventoSchema.parse(entrada);
  await contatoOuFalhar(contatoId);
  if (!(await repo.obterEvento(d.eventoId))) {
    throw new ErroDeNegocio("Evento não encontrado.", { eventoId: "Evento não encontrado." });
  }
  return repo.associarEvento(contatoId, d.eventoId, d.papel);
}

export async function desassociarEvento(associacaoId: string) {
  const a = await repo.obterAssociacaoEvento(associacaoId);
  if (!a) throw new ErroDeNegocio("Associação não encontrada.");
  await repo.desassociarEvento(associacaoId);
  return a;
}

// ---------- Eventos ----------

export async function buscarEventos(busca?: string) {
  const eventos = await repo.listarEventos();
  return eventos.filter((e) => correspondeBusca(busca, e.nome) || (!!e.serie && correspondeBusca(busca, e.serie.nome)));
}

export const obterEvento = (id: string) => repo.obterEvento(id);

export const listarSeries = () => repo.listarSeries();
export const listarPublicosAlvo = () => repo.listarPublicosAlvo();

/** Edições da mesma série (inclui o próprio evento), da mais recente para a mais antiga. */
export async function edicoesDaSerie(eventoId: string) {
  const e = await repo.obterEvento(eventoId);
  if (!e?.serieId) return [];
  return repo.eventosDaSerie(e.serieId);
}

/**
 * Grava evento, série e público-alvo na mesma transação.
 * A série é encontrada pelo nome (sem acento/maiúsculas) ou criada; sem edição informada, usa o ano do início.
 */
async function salvarEvento(id: string | null, entrada: unknown) {
  const d = eventoSchema.parse(entrada);
  return prisma.$transaction(async (tx) => {
    const serie = d.serie ? await repo.obterOuCriarSerie(d.serie, normalizarBusca(d.serie), tx) : null;
    const dados = {
      nome: d.nome,
      dataInicio: inicioDoDiaSP(d.dataInicio),
      dataFim: d.dataFim ? inicioDoDiaSP(d.dataFim) : null,
      serieId: serie?.id ?? null,
      edicao: serie ? (d.edicao ?? Number(d.dataInicio.slice(0, 4))) : d.edicao,
      descricao: d.descricao,
    };
    const evento = id ? await repo.atualizarEvento(id, dados, tx) : await repo.criarEvento(dados, tx);
    const publicos = [];
    for (const nome of d.publicoAlvo) publicos.push(await repo.obterOuCriarPublicoAlvo(nome, normalizarBusca(nome), tx));
    await repo.definirPublicoAlvo(evento.id, publicos.map((p) => p.id), tx);
    return evento;
  });
}

export async function criarEvento(entrada: unknown) {
  return salvarEvento(null, entrada);
}

export async function atualizarEvento(id: string, entrada: unknown) {
  if (!(await repo.obterEvento(id))) throw new ErroDeNegocio("Evento não encontrado.");
  return salvarEvento(id, entrada);
}

// ---------- Responsáveis ----------

export const listarResponsaveis = () => repo.listarResponsaveis();

// ---------- Validação de vínculos (usada por Oportunidades e Agenda) ----------

/**
 * Confere no servidor os vínculos de uma oportunidade: evento, responsável e contato existem;
 * o contato pertence à empresa escolhida; sem empresa, o contato precisa ser individual (sem empresa).
 */
export async function validarVinculosOportunidade(
  v: { eventoId: string; responsavelId: string; contatoId: string; empresaId: string | null },
  db: Db = prisma,
) {
  const erros: Record<string, string> = {};
  const [evento, responsavel, contato, empresa] = await Promise.all([
    repo.obterEvento(v.eventoId, db),
    repo.obterResponsavel(v.responsavelId, db),
    repo.obterContato(v.contatoId, db),
    v.empresaId ? repo.obterEmpresa(v.empresaId, db) : Promise.resolve(null),
  ]);
  if (!evento) erros.eventoId = "Evento não encontrado.";
  if (!responsavel) erros.responsavelId = "Responsável não encontrado.";
  if (v.empresaId && !empresa) erros.empresaId = "Empresa não encontrada.";
  if (!contato) {
    erros.contatoId = "Contato não encontrado.";
  } else if (v.empresaId && contato.empresaId !== v.empresaId) {
    erros.contatoId = "Este contato não pertence à empresa selecionada.";
  } else if (!v.empresaId && contato.empresaId) {
    erros.contatoId = "Para compra individual, escolha um contato sem empresa ou selecione a empresa do contato.";
  }
  if (Object.keys(erros).length) throw new ErroDeNegocio("Verifique os vínculos da oportunidade.", erros);
}

export async function validarResponsavel(responsavelId: string, db: Db = prisma) {
  if (!(await repo.obterResponsavel(responsavelId, db))) {
    throw new ErroDeNegocio("Responsável não encontrado.", { responsavelId: "Responsável não encontrado." });
  }
}

export async function validarContato(contatoId: string, db: Db = prisma) {
  await contatoOuFalhar(contatoId, db);
}

// ---------- Contato do participante (usado pelo módulo Participantes) ----------

export type DadosPessoaParticipante = {
  nomeCompleto: string;
  email: string;
  cargo?: string | null;
  empresa?: string | null;
  telefone?: string | null;
  celular?: string | null;
};

/**
 * Encontra o contato pelo e-mail (sem diferenciar maiúsculas/espaços) ou cria um novo,
 * criando também a empresa pelo nome quando ainda não existir. Contato existente não é alterado.
 */
export async function obterOuCriarContatoDeParticipante(d: DadosPessoaParticipante, db: Db = prisma) {
  const emailNormalizado = normalizarEmail(d.email);
  const existente = await db.contato.findFirst({ where: { emailNormalizado }, orderBy: { criadoEm: "asc" } });
  if (existente) return { contato: existente, criado: false };

  let empresaId: string | null = null;
  const nomeEmpresa = d.empresa?.trim();
  if (nomeEmpresa) {
    const chave = normalizarBusca(nomeEmpresa);
    const empresa =
      (await db.empresa.findFirst({ where: { nomeBusca: chave } })) ??
      (await repo.criarEmpresa(
        {
          nome: nomeEmpresa,
          nomeBusca: chave,
          cnpj: null,
          site: null,
          linkedin: null,
          telefone: null,
          telefoneDigitos: null,
          email: null,
          porte: null,
          ramo: null,
          setorAtividade: null,
          observacoes: null,
        },
        db,
      ));
    empresaId = empresa.id;
  }
  const partes = d.nomeCompleto.trim().split(/\s+/);
  const nome = partes[0];
  const sobrenome = partes.slice(1).join(" ") || null;
  const telefones = [
    d.celular ? { tipo: "CELULAR", numero: d.celular } : null,
    d.telefone ? { tipo: "COMERCIAL", numero: d.telefone } : null,
  ]
    .filter((t): t is { tipo: string; numero: string } => !!t && telefoneValido(t.numero))
    .map((t, i) => ({ ...t, numeroDigitos: somenteDigitos(t.numero), principal: i === 0 }));
  const contato = await repo.criarContato(
    {
      nome,
      sobrenome,
      nomeBusca: chaveBuscaNome(nome, sobrenome),
      cpf: null,
      rg: null,
      dataNascimento: null,
      cargo: d.cargo?.trim() || null,
      departamento: null,
      setor: null,
      email: d.email.trim(),
      emailNormalizado,
      linkedin: null,
      recebeMalaDireta: false,
      observacoes: null,
      empresaId,
    },
    db,
  );
  await repo.substituirTelefones(contato.id, telefones, db);
  return { contato, criado: true };
}
