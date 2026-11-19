/**
 * Dados de demonstração (fictícios). Apaga os dados existentes e recria tudo.
 * Prazos são relativos ao dia de hoje em São Paulo, para que sempre existam
 * tarefas atrasadas, de hoje e futuras.
 *
 *   npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import { hojeSP, inicioDoDiaSP, somarDias } from "../src/shared/datas";
import { chaveBuscaNome, normalizarEmail } from "../src/modules/cadastros/dominio";
import { somenteDigitos } from "../src/shared/documentos";
import { normalizarBusca } from "../src/shared/texto";
import { gerarHashSenha } from "../src/modules/acesso/senha";

const prisma = new PrismaClient();
const hoje = hojeSP();
const dia = (deslocamento: number) => inicioDoDiaSP(somarDias(hoje, deslocamento));
/** Instante no passado, às 10h do dia relativo. */
const momento = (deslocamento: number, hora = 10) => new Date(dia(deslocamento).getTime() + hora * 3600_000);

/** Completa os dígitos verificadores de um CPF (9 dígitos) ou CNPJ (12 dígitos) fictício. */
function comDigitos(base: string): string {
  const dv = (b: string) => {
    if (b.length < 11) {
      const soma = [...b].reduce((s, n, i) => s + Number(n) * (b.length + 1 - i), 0);
      const r = (soma * 10) % 11;
      return r === 10 ? 0 : r;
    }
    const pesos = b.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const r = [...b].reduce((s, n, i) => s + Number(n) * pesos[i], 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = base + dv(base);
  return d1 + dv(d1);
}

async function limpar() {
  await prisma.registroParticipante.deleteMany();
  await prisma.participante.deleteMany();
  await prisma.contatoTag.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.notaContato.deleteMany();
  await prisma.arquivoContato.deleteMany();
  await prisma.contatoEvento.deleteMany();
  await prisma.telefoneContato.deleteMany();
  await prisma.historico.deleteMany();
  await prisma.tarefa.deleteMany();
  await prisma.oportunidade.deleteMany();
  await prisma.contato.deleteMany();
  await prisma.empresa.deleteMany();
  await prisma.eventoPublicoAlvo.deleteMany();
  await prisma.evento.deleteMany();
  await prisma.serieEvento.deleteMany();
  await prisma.publicoAlvo.deleteMany();
  await prisma.responsavel.deleteMany();
}

async function main() {
  await limpar();

  const [ana, bruno, carla] = await Promise.all(
    // Acesso de demonstração: <nome.sobrenome>@centralconsult.example, senha demo1234 (somente desenvolvimento).
    ["Ana Ribeiro", "Bruno Carvalho", "Carla Mendes"].map(async (nome) =>
      prisma.responsavel.create({
        data: {
          nome,
          email: `${normalizarBusca(nome).replace(/\s+/g, ".")}@centralconsult.example`,
          senhaHash: await gerarHashSenha("demo1234"),
        },
      }),
    ),
  );

  // Séries de eventos (cada ano é uma edição) e públicos-alvo reaproveitáveis
  const serie = (nome: string) => prisma.serieEvento.create({ data: { nome, nomeBusca: normalizarBusca(nome) } });
  const [serieComsaude, serieIatech, serieConartes] = [await serie("COMSAÚDE"), await serie("IATECH RH"), await serie("CONARTES")];
  const publicos = new Map<string, string>();
  for (const nome of ["Saúde ocupacional", "SST", "Medicina do trabalho", "RH", "Gestão de pessoas", "Tecnologia", "Benefícios corporativos"]) {
    publicos.set(nome, (await prisma.publicoAlvo.create({ data: { nome, nomeNormalizado: normalizarBusca(nome) } })).id);
  }
  const evento = async (d: { nome: string; serieId: string; edicao: number; inicio: string; fim?: string; descricao?: string; publico?: string[] }) =>
    prisma.evento.create({
      data: {
        nome: d.nome,
        serieId: d.serieId,
        edicao: d.edicao,
        dataInicio: inicioDoDiaSP(d.inicio),
        dataFim: d.fim ? inicioDoDiaSP(d.fim) : null,
        descricao: d.descricao ?? null,
        publicoAlvo: { create: (d.publico ?? []).map((n) => ({ publicoAlvoId: publicos.get(n)! })) },
      },
    });
  const comsaudeDescricao =
    "Congresso de saúde corporativa: saúde ocupacional, segurança do trabalho e bem-estar nas empresas. Dois dias de palestras, painéis e exposição de patrocinadores.";
  const comsaude = await evento({
    nome: "COMSAÚDE 2027",
    serieId: serieComsaude.id,
    edicao: 2027,
    inicio: "2027-03-16",
    fim: "2027-03-17",
    descricao: comsaudeDescricao,
    publico: ["Saúde ocupacional", "SST", "Medicina do trabalho", "RH"],
  });
  const iatech = await evento({
    nome: "IATECH RH 2027",
    serieId: serieIatech.id,
    edicao: 2027,
    inicio: "2027-05-20",
    descricao: "Encontro sobre inteligência artificial e tecnologia aplicadas à gestão de pessoas.",
    publico: ["RH", "Gestão de pessoas", "Tecnologia"],
  });
  // Edições anteriores (já realizadas), para mostrar o histórico por série
  const comsaude2026 = await evento({
    nome: "COMSAÚDE 2026",
    serieId: serieComsaude.id,
    edicao: 2026,
    inicio: "2026-03-17",
    fim: "2026-03-18",
    descricao: comsaudeDescricao,
    publico: ["Saúde ocupacional", "SST", "RH"],
  });
  const iatech2026 = await evento({ nome: "IATECH RH 2026", serieId: serieIatech.id, edicao: 2026, inicio: "2026-05-21", publico: ["RH", "Tecnologia"] });
  const conartes2026 = await evento({ nome: "CONARTES 2026", serieId: serieConartes.id, edicao: 2026, inicio: "2026-09-24" });

  type DadosEmpresa = {
    nome: string;
    cnpjBase?: string;
    site?: string;
    linkedin?: string;
    telefone?: string;
    email?: string;
    porte?: string;
    ramo?: string;
    setorAtividade?: string;
    observacoes?: string;
  };
  const empresa = ({ cnpjBase, ...e }: DadosEmpresa) =>
    prisma.empresa.create({
      data: {
        ...e,
        nomeBusca: normalizarBusca(e.nome),
        cnpj: cnpjBase ? comDigitos(cnpjBase) : null,
        telefoneDigitos: e.telefone ? somenteDigitos(e.telefone) : null,
      },
    });

  const vidaPlena = await empresa({
    nome: "Hospital Vida Plena",
    cnpjBase: "123456780001",
    site: "https://vidaplena.example",
    linkedin: "https://www.linkedin.com/company/hospital-vida-plena-exemplo",
    telefone: "(11) 3333-1000",
    email: "contato@vidaplena.example",
    porte: "GRANDE",
    ramo: "SAUDE",
    setorAtividade: "Hospital geral",
    observacoes: "Empresa fictícia. Negocia inscrições no COMSAÚDE e patrocínio no IATECH RH com contatos diferentes.",
  });
  const talento = await empresa({
    nome: "TalentoPro Consultoria de RH",
    cnpjBase: "234567890001",
    site: "https://talentopro.example",
    telefone: "(21) 2222-2000",
    porte: "PEQUENO",
    ramo: "SERVICOS",
    setorAtividade: "Consultoria de recursos humanos",
  });
  const bemEstar = await empresa({
    nome: "Grupo Bem-Estar Seguros",
    cnpjBase: "345678900001",
    site: "https://bemestar.example",
    telefone: "(31) 3111-3000",
    porte: "GRANDE",
    ramo: "SERVICOS",
    setorAtividade: "Seguros e planos de saúde",
  });
  const horizonte = await empresa({
    nome: "Clínica Horizonte",
    cnpjBase: "456789010001",
    porte: "MEDIO",
    ramo: "SAUDE",
    setorAtividade: "Clínica médica",
  });

  type DadosContato = {
    nome: string;
    sobrenome: string;
    email: string;
    empresaId: string | null;
    cargo?: string;
    departamento?: string;
    setor?: string;
    cpfBase?: string;
    rg?: string;
    linkedin?: string;
    malaDireta?: boolean;
    telefones?: { tipo: string; numero: string }[];
    tags?: string[];
  };
  const contato = async (c: DadosContato) => {
    const criado = await prisma.contato.create({
      data: {
        nome: c.nome,
        sobrenome: c.sobrenome,
        nomeBusca: chaveBuscaNome(c.nome, c.sobrenome),
        email: c.email,
        emailNormalizado: normalizarEmail(c.email),
        empresaId: c.empresaId,
        cargo: c.cargo ?? null,
        departamento: c.departamento ?? null,
        setor: c.setor ?? null,
        cpf: c.cpfBase ? comDigitos(c.cpfBase) : null,
        rg: c.rg ?? null,
        linkedin: c.linkedin ?? null,
        recebeMalaDireta: c.malaDireta ?? false,
        telefones: {
          create: (c.telefones ?? []).map((t, i) => ({
            tipo: t.tipo,
            numero: t.numero,
            numeroDigitos: somenteDigitos(t.numero),
            principal: i === 0,
          })),
        },
      },
    });
    for (const nome of c.tags ?? []) {
      const tag = await prisma.tag.upsert({
        where: { nomeNormalizado: normalizarBusca(nome) },
        update: {},
        create: { nome, nomeNormalizado: normalizarBusca(nome) },
      });
      await prisma.contatoTag.create({ data: { contatoId: criado.id, tagId: tag.id } });
    }
    return criado;
  };

  const mariana = await contato({
    nome: "Mariana",
    sobrenome: "Lopes",
    email: "mariana.lopes@vidaplena.example",
    empresaId: vidaPlena.id,
    cargo: "Gerente de Educação Corporativa",
    departamento: "Recursos Humanos",
    setor: "Educação continuada",
    linkedin: "https://www.linkedin.com/in/mariana-lopes-exemplo",
    malaDireta: true,
    telefones: [
      { tipo: "COMERCIAL", numero: "(11) 3333-1001" },
      { tipo: "CELULAR", numero: "(11) 98888-1001" },
    ],
    tags: ["Decisor", "Saúde", "Mala direta"],
  });
  const rafael = await contato({
    nome: "Rafael",
    sobrenome: "Souza",
    email: "rafael.souza@vidaplena.example",
    empresaId: vidaPlena.id,
    cargo: "Diretor de Marketing",
    departamento: "Marketing",
    setor: "Marca e eventos",
    linkedin: "https://www.linkedin.com/in/rafael-souza-exemplo",
    telefones: [
      { tipo: "CELULAR", numero: "(11) 98888-1002" },
      { tipo: "WHATSAPP", numero: "(11) 98888-1002" },
    ],
    tags: ["Decisor", "Patrocinador 2026"],
  });
  const juliana = await contato({
    nome: "Juliana",
    sobrenome: "Prado",
    email: "juliana.prado@talentopro.example",
    empresaId: talento.id,
    cargo: "Analista de RH",
    departamento: "Recursos Humanos",
    setor: "Treinamento e desenvolvimento",
    malaDireta: true,
    telefones: [{ tipo: "COMERCIAL", numero: "(21) 97777-2001" }],
    tags: ["Mala direta"],
  });
  const fernanda = await contato({
    nome: "Fernanda",
    sobrenome: "Costa",
    email: "fernanda.costa@bemestar.example",
    empresaId: bemEstar.id,
    cargo: "Gerente Comercial",
    departamento: "Comercial",
    setor: "Parcerias",
    linkedin: "https://www.linkedin.com/in/fernanda-costa-exemplo",
    telefones: [{ tipo: "COMERCIAL", numero: "(31) 96666-3001" }],
    tags: ["Decisor", "Patrocinador 2026"],
  });
  const pedro = await contato({
    nome: "Pedro",
    sobrenome: "Almeida",
    email: "pedro.almeida@horizonte.example",
    empresaId: horizonte.id,
    cargo: "Coordenador de Enfermagem",
    departamento: "Assistencial",
    setor: "Enfermagem",
    tags: ["Saúde"],
  });
  const thiago = await contato({
    nome: "Thiago",
    sobrenome: "Martins",
    email: "thiago.martins@email.example",
    empresaId: null,
    cargo: "Enfermeiro",
    cpfBase: "123456789",
    rg: "123456789",
    malaDireta: true,
    telefones: [{ tipo: "WHATSAPP", numero: "(11) 95555-4001" }],
    tags: ["Saúde", "Pessoa física"],
  });
  const camila = await contato({
    nome: "Camila",
    sobrenome: "Rocha",
    email: "camila.rocha@email.example",
    empresaId: null,
    cargo: "Psicóloga organizacional",
    cpfBase: "987654321",
    rg: "MG1234567",
    linkedin: "https://www.linkedin.com/in/camila-rocha-exemplo",
    telefones: [{ tipo: "CELULAR", numero: "(41) 94444-5001" }],
    tags: ["Pessoa física"],
  });

  type Hist = {
    dias: number;
    tipo: "INTERACAO" | "MUDANCA_ETAPA";
    descricao: string;
    canal?: string;
    resumo?: string;
    combinado?: string;
    de?: string | null;
    para?: string;
  };
  type Tar = { descricao: string; prazo: number; resp: string; concluida?: number };

  async function oportunidade(o: {
    titulo: string;
    eventoId: string;
    tipoVenda: "INSCRICAO" | "PATROCINIO";
    contatoId: string;
    empresaId: string | null;
    origemLead: string;
    responsavelId: string;
    estimado: number;
    etapa: string;
    criadaHaDias: number;
    valorFinal?: number;
    motivoPerda?: string;
    statusPagamento?: string;
    historico: Hist[];
    tarefas: Tar[];
  }) {
    const criada = await prisma.oportunidade.create({
      data: {
        titulo: o.titulo,
        eventoId: o.eventoId,
        tipoVenda: o.tipoVenda,
        contatoId: o.contatoId,
        empresaId: o.empresaId,
        origemLead: o.origemLead,
        responsavelId: o.responsavelId,
        valorEstimadoCentavos: o.estimado,
        etapa: o.etapa,
        valorFinalCentavos: o.valorFinal ?? null,
        motivoPerda: o.motivoPerda ?? null,
        statusPagamento: o.statusPagamento ?? null,
        fechadoEm: o.etapa === "FECHADO" ? momento(-1, 15) : null,
        criadoEm: momento(-o.criadaHaDias, 9),
      },
    });
    await prisma.historico.create({
      data: {
        oportunidadeId: criada.id,
        data: momento(-o.criadaHaDias, 9),
        tipo: "MUDANCA_ETAPA",
        descricao: "Oportunidade criada na etapa Novo.",
        etapaAnterior: null,
        etapaNova: "NOVO",
      },
    });
    for (const h of o.historico) {
      await prisma.historico.create({
        data: {
          oportunidadeId: criada.id,
          data: momento(-h.dias, 11),
          tipo: h.tipo,
          descricao: h.descricao,
          canal: h.canal ?? null,
          resumo: h.resumo ?? null,
          combinado: h.combinado ?? null,
          etapaAnterior: h.de ?? null,
          etapaNova: h.para ?? null,
        },
      });
    }
    for (const t of o.tarefas) {
      await prisma.tarefa.create({
        data: {
          oportunidadeId: criada.id,
          descricao: t.descricao,
          prazo: dia(t.prazo),
          responsavelId: t.resp,
          situacao: t.concluida !== undefined ? "CONCLUIDA" : "PENDENTE",
          concluidaEm: t.concluida !== undefined ? momento(-t.concluida, 16) : null,
          criadoEm: momento(-o.criadaHaDias, 9),
        },
      });
    }
    return criada;
  }

  // 1. Vida Plena — inscrições no COMSAÚDE (contato Mariana, prazo futuro)
  await oportunidade({
    titulo: "Inscrições equipe de enfermagem — Vida Plena",
    eventoId: comsaude.id,
    tipoVenda: "INSCRICAO",
    contatoId: mariana.id,
    empresaId: vidaPlena.id,
    origemLead: "Evento anterior",
    responsavelId: ana.id,
    estimado: 1_548_000,
    etapa: "EM_ATENDIMENTO",
    criadaHaDias: 10,
    historico: [
      {
        dias: 8,
        tipo: "INTERACAO",
        canal: "TELEFONE",
        resumo: "Mariana quer inscrever 12 enfermeiros da educação continuada.",
        combinado: "Enviar condições para grupo até sexta.",
        descricao: "Telefone: Mariana quer inscrever 12 enfermeiros da educação continuada.",
      },
      { dias: 8, tipo: "MUDANCA_ETAPA", descricao: "Etapa alterada de Novo para Em atendimento.", de: "NOVO", para: "EM_ATENDIMENTO" },
    ],
    tarefas: [
      { descricao: "Ligar para Mariana", prazo: -8, resp: ana.id, concluida: 8 },
      { descricao: "Enviar proposta para 12 inscrições com desconto de grupo", prazo: 5, resp: ana.id },
    ],
  });

  // 2. Vida Plena — patrocínio no IATECH RH (contato Rafael, prazo hoje)
  await oportunidade({
    titulo: "Patrocínio cota Ouro — Vida Plena",
    eventoId: iatech.id,
    tipoVenda: "PATROCINIO",
    contatoId: rafael.id,
    empresaId: vidaPlena.id,
    origemLead: "Prospecção ativa",
    responsavelId: bruno.id,
    estimado: 4_500_000,
    etapa: "PROPOSTA_ENVIADA",
    criadaHaDias: 15,
    historico: [
      {
        dias: 12,
        tipo: "INTERACAO",
        canal: "REUNIAO",
        resumo: "Apresentação das cotas de patrocínio para o marketing.",
        combinado: "Enviar proposta da cota Ouro com estande 3x3.",
        descricao: "Reunião: Apresentação das cotas de patrocínio para o marketing.",
      },
      { dias: 12, tipo: "MUDANCA_ETAPA", descricao: "Etapa alterada de Novo para Em atendimento.", de: "NOVO", para: "EM_ATENDIMENTO" },
      { dias: 6, tipo: "MUDANCA_ETAPA", descricao: "Etapa alterada de Em atendimento para Proposta enviada.", de: "EM_ATENDIMENTO", para: "PROPOSTA_ENVIADA" },
      {
        dias: 6,
        tipo: "INTERACAO",
        canal: "EMAIL",
        resumo: "Proposta da cota Ouro enviada por e-mail.",
        combinado: "Rafael retorna após reunião de diretoria.",
        descricao: "E-mail: Proposta da cota Ouro enviada por e-mail.",
      },
    ],
    tarefas: [{ descricao: "Ligar para Rafael sobre a decisão da diretoria", prazo: 0, resp: bruno.id }],
  });

  // 3. Inscrição individual (contato sem empresa)
  await oportunidade({
    titulo: "Inscrição individual — Thiago Martins",
    eventoId: comsaude.id,
    tipoVenda: "INSCRICAO",
    contatoId: thiago.id,
    empresaId: null,
    origemLead: "Instagram",
    responsavelId: carla.id,
    estimado: 129_000,
    etapa: "NOVO",
    criadaHaDias: 1,
    historico: [
      {
        dias: 1,
        tipo: "INTERACAO",
        canal: "WHATSAPP",
        resumo: "Pediu informações sobre lote e parcelamento.",
        combinado: "Enviar link de inscrição com 3x sem juros.",
        descricao: "WhatsApp: Pediu informações sobre lote e parcelamento.",
      },
    ],
    tarefas: [{ descricao: "Enviar link de inscrição pelo WhatsApp", prazo: 2, resp: carla.id }],
  });

  // 4. Tarefa atrasada
  await oportunidade({
    titulo: "Inscrições time de RH — TalentoPro",
    eventoId: iatech.id,
    tipoVenda: "INSCRICAO",
    contatoId: juliana.id,
    empresaId: talento.id,
    origemLead: "LinkedIn",
    responsavelId: ana.id,
    estimado: 960_000,
    etapa: "EM_NEGOCIACAO",
    criadaHaDias: 20,
    historico: [
      { dias: 18, tipo: "MUDANCA_ETAPA", descricao: "Etapa alterada de Novo para Em atendimento.", de: "NOVO", para: "EM_ATENDIMENTO" },
      { dias: 12, tipo: "MUDANCA_ETAPA", descricao: "Etapa alterada de Em atendimento para Proposta enviada.", de: "EM_ATENDIMENTO", para: "PROPOSTA_ENVIADA" },
      { dias: 7, tipo: "MUDANCA_ETAPA", descricao: "Etapa alterada de Proposta enviada para Em negociação.", de: "PROPOSTA_ENVIADA", para: "EM_NEGOCIACAO" },
      {
        dias: 7,
        tipo: "INTERACAO",
        canal: "WHATSAPP",
        resumo: "Juliana pediu 15% de desconto para 8 inscrições.",
        combinado: "Consultar a diretoria e retornar.",
        descricao: "WhatsApp: Juliana pediu 15% de desconto para 8 inscrições.",
      },
    ],
    tarefas: [{ descricao: "Retornar à Juliana sobre o desconto para grupo", prazo: -3, resp: ana.id }],
  });

  // 5. Venda fechada com pagamento pendente
  await oportunidade({
    titulo: "Patrocínio cota Prata — Bem-Estar Seguros",
    eventoId: comsaude.id,
    tipoVenda: "PATROCINIO",
    contatoId: fernanda.id,
    empresaId: bemEstar.id,
    origemLead: "Indicação",
    responsavelId: bruno.id,
    estimado: 3_000_000,
    etapa: "FECHADO",
    valorFinal: 2_850_000,
    statusPagamento: "PENDENTE",
    criadaHaDias: 30,
    historico: [
      { dias: 25, tipo: "MUDANCA_ETAPA", descricao: "Etapa alterada de Novo para Proposta enviada.", de: "NOVO", para: "PROPOSTA_ENVIADA" },
      { dias: 10, tipo: "MUDANCA_ETAPA", descricao: "Etapa alterada de Proposta enviada para Em negociação.", de: "PROPOSTA_ENVIADA", para: "EM_NEGOCIACAO" },
      {
        dias: 1,
        tipo: "MUDANCA_ETAPA",
        descricao: "Etapa alterada de Em negociação para Fechado. Valor final: R$ 28.500,00. Pagamento pendente.",
        de: "EM_NEGOCIACAO",
        para: "FECHADO",
      },
    ],
    tarefas: [{ descricao: "Enviar contrato para assinatura", prazo: -2, resp: bruno.id, concluida: 1 }],
  });

  // 6. Oportunidade perdida
  await oportunidade({
    titulo: "Inscrições enfermagem — Clínica Horizonte",
    eventoId: comsaude.id,
    tipoVenda: "INSCRICAO",
    contatoId: pedro.id,
    empresaId: horizonte.id,
    origemLead: "Site",
    responsavelId: carla.id,
    estimado: 645_000,
    etapa: "PERDIDO",
    motivoPerda: "Orçamento de treinamento do ano já comprometido.",
    criadaHaDias: 25,
    historico: [
      { dias: 20, tipo: "MUDANCA_ETAPA", descricao: "Etapa alterada de Novo para Em atendimento.", de: "NOVO", para: "EM_ATENDIMENTO" },
      {
        dias: 4,
        tipo: "MUDANCA_ETAPA",
        descricao: "Etapa alterada de Em atendimento para Perdido. Motivo da perda: Orçamento de treinamento do ano já comprometido.",
        de: "EM_ATENDIMENTO",
        para: "PERDIDO",
      },
    ],
    tarefas: [{ descricao: "Confirmar interesse de Pedro", prazo: -5, resp: carla.id, concluida: 4 }],
  });

  // 7. Outra inscrição individual, proposta enviada
  await oportunidade({
    titulo: "Inscrição individual — Camila Rocha",
    eventoId: iatech.id,
    tipoVenda: "INSCRICAO",
    contatoId: camila.id,
    empresaId: null,
    origemLead: "Site",
    responsavelId: carla.id,
    estimado: 89_000,
    etapa: "PROPOSTA_ENVIADA",
    criadaHaDias: 5,
    historico: [
      { dias: 3, tipo: "MUDANCA_ETAPA", descricao: "Etapa alterada de Novo para Proposta enviada.", de: "NOVO", para: "PROPOSTA_ENVIADA" },
    ],
    tarefas: [{ descricao: "Confirmar pagamento da inscrição", prazo: 7, resp: carla.id }],
  });

  // Notas dos contatos
  const nota = (contatoId: string, texto: string, responsavelId: string, diasAtras: number) =>
    prisma.notaContato.create({
      data: { contatoId, texto, responsavelId, criadoEm: momento(-diasAtras, 14), atualizadoEm: momento(-diasAtras, 14) },
    });
  await nota(mariana.id, "Prefere contato por e-mail pela manhã. Decide junto com a diretoria de RH.", ana.id, 9);
  await nota(rafael.id, "Interesse em ativação de marca no estande; pediu mídia kit atualizado.", bruno.id, 12);
  await nota(pedro.id, "Orçamento de 2027 abre em março. Retomar contato para a próxima edição.", carla.id, 4);

  // Tarefa só do contato (sem oportunidade): aparece no calendário do contato e na Agenda
  await prisma.tarefa.create({
    data: {
      contatoId: pedro.id,
      descricao: "Reapresentar o COMSAÚDE para o orçamento do próximo ano",
      prazo: dia(20),
      responsavelId: carla.id,
    },
  });

  // Eventos associados aos contatos
  await prisma.contatoEvento.createMany({
    data: [
      { contatoId: mariana.id, eventoId: comsaude.id, papel: "PARTICIPANTE" },
      { contatoId: rafael.id, eventoId: iatech.id, papel: "PATROCINADOR" },
      { contatoId: fernanda.id, eventoId: comsaude.id, papel: "PATROCINADOR" },
      { contatoId: juliana.id, eventoId: iatech.id, papel: "INTERESSADO" },
      { contatoId: camila.id, eventoId: iatech.id, papel: "PALESTRANTE" },
    ],
  });

  // Participantes (inscritos) dos eventos — substituem a antiga planilha de inscritos
  const participante = async (
    eventoId: string,
    contatoId: string,
    d: {
      cracha: string;
      modalidade: string;
      tipo: "CORTESIA" | "PAGANTE";
      cortesia?: string;
      lote?: string;
      desconto?: number;
      valor?: number;
      confirmacao?: { canal: string; dias: number };
      presenca?: string;
      historico: string[];
    },
  ) => {
    const p = await prisma.participante.create({
      data: {
        eventoId,
        contatoId,
        nomeCracha: d.cracha,
        modalidade: d.modalidade,
        tipoInscricao: d.tipo,
        cortesiaConcedidaPor: d.cortesia ?? null,
        lote: d.lote ?? null,
        descontoPercentual: d.desconto ?? null,
        valorCentavos: d.valor ?? null,
        confirmacaoEnviadaEm: d.confirmacao ? momento(-d.confirmacao.dias, 15) : null,
        confirmacaoCanal: d.confirmacao?.canal ?? null,
        presenca: d.presenca ?? "PENDENTE",
      },
    });
    for (const [i, texto] of d.historico.entries()) {
      await prisma.registroParticipante.create({ data: { participanteId: p.id, descricao: texto, responsavelId: carla.id, data: momento(-(d.historico.length - i) * 2, 10) } });
    }
  };
  await participante(comsaude.id, fernanda.id, {
    cracha: "FERNANDA COSTA",
    modalidade: "PRESENCIAL",
    tipo: "CORTESIA",
    cortesia: "Cota Prata — Bem-Estar Seguros",
    confirmacao: { canal: "EMAIL", dias: 1 },
    presenca: "CONFIRMADA",
    historico: ["Inscrição registrada.", "Confirmação enviada por E-mail.", "Presença: Confirmada."],
  });
  await participante(comsaude.id, mariana.id, {
    cracha: "MARIANA LOPES",
    modalidade: "PRESENCIAL",
    tipo: "PAGANTE",
    lote: "1ª Tabela",
    valor: 129_000,
    confirmacao: { canal: "WHATSAPP", dias: 2 },
    historico: ["Inscrição registrada.", "Confirmação enviada por WhatsApp."],
  });
  await participante(iatech.id, camila.id, {
    cracha: "CAMILA ROCHA",
    modalidade: "ONLINE",
    tipo: "CORTESIA",
    cortesia: "Palestrante",
    historico: ["Inscrição registrada.", "Mudou de Presencial para Online."],
  });
  await participante(iatech.id, juliana.id, {
    cracha: "JULIANA PRADO",
    modalidade: "PRESENCIAL",
    tipo: "PAGANTE",
    lote: "3ª Tabela",
    desconto: 40,
    historico: ["Inscrição registrada."],
  });
  await participante(iatech.id, rafael.id, {
    cracha: "RAFAEL SOUZA",
    modalidade: "HIBRIDA",
    tipo: "CORTESIA",
    cortesia: "Cota Ouro (em negociação)",
    confirmacao: { canal: "TELEFONE", dias: 3 },
    historico: ["Inscrição registrada.", "Confirmação enviada por Telefone."],
  });

  // Edições anteriores: quem participou em 2026 aparece marcado na lista de 2027
  const passado = { modalidade: "PRESENCIAL", presenca: "CONFIRMADA", historico: ["Inscrição registrada.", "Presença: Confirmada."] };
  await participante(comsaude2026.id, fernanda.id, { ...passado, cracha: "FERNANDA COSTA", tipo: "CORTESIA", cortesia: "Patrocinador" });
  await participante(comsaude2026.id, mariana.id, { ...passado, cracha: "MARIANA LOPES", tipo: "PAGANTE", lote: "2ª Tabela", valor: 119_000 });
  await participante(comsaude2026.id, pedro.id, { ...passado, cracha: "PEDRO ALMEIDA", tipo: "PAGANTE", lote: "1ª Tabela", valor: 99_000 });
  await participante(iatech2026.id, juliana.id, { ...passado, cracha: "JULIANA PRADO", tipo: "PAGANTE", lote: "1ª Tabela", valor: 89_000 });
  await participante(iatech2026.id, camila.id, { ...passado, cracha: "CAMILA ROCHA", tipo: "CORTESIA", cortesia: "Palestrante" });
  await participante(conartes2026.id, rafael.id, { ...passado, cracha: "RAFAEL SOUZA", tipo: "CORTESIA", cortesia: "Convidado" });

  console.log("Dados de demonstração carregados (hoje em São Paulo: %s).", hoje);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
