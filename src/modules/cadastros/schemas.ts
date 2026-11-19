import { z } from "zod";
import { normalizarBusca } from "@/shared/texto";
import { cnpjValido, cpfValido, somenteDigitos, telefoneValido } from "@/shared/documentos";
import {
  booleano,
  dataObrigatoria,
  dataOpcional,
  enumObrigatorio,
  enumOpcional,
  idObrigatorio,
  idOpcional,
  textoObrigatorio,
  textoOpcional,
} from "@/shared/validacao";
import {
  CAMPOS_BUSCA,
  ESCOPOS_BUSCA,
  FILTROS_NEGOCIO,
  linkedinValido,
  normalizarUrl,
  PAPEIS_EVENTO,
  PORTES,
  RAMOS,
  TIPOS_TELEFONE,
} from "./dominio";

/** "SST, Saúde ocupacional; RH" → ["SST", "Saúde ocupacional", "RH"], sem repetir (ignora acento/maiúsculas). */
export function separarLista(v: string | string[] | null | undefined): string[] {
  const itens = (Array.isArray(v) ? v : (v ?? "").split(/[,;\n]/)).map((x) => x.trim().replace(/\s+/g, " ")).filter(Boolean);
  const vistos = new Set<string>();
  return itens.filter((x) => {
    const k = normalizarBusca(x);
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
}

const cpfOpcional = textoOpcional(20)
  .refine((v) => v === null || cpfValido(v), "CPF inválido.")
  .transform((v) => (v ? somenteDigitos(v) : null));

const cnpjOpcional = textoOpcional(20)
  .refine((v) => v === null || cnpjValido(v), "CNPJ inválido.")
  .transform((v) => (v ? somenteDigitos(v) : null));

const linkedinOpcional = textoOpcional(300)
  .refine((v) => v === null || linkedinValido(v), "Informe um endereço do LinkedIn (linkedin.com/...).")
  .transform((v) => (v ? normalizarUrl(v) : null));

const emailOpcional = textoOpcional(200).refine(
  (v) => v === null || z.string().email().safeParse(v).success,
  "E-mail inválido.",
);

const telefoneOpcional = textoOpcional(30).refine((v) => v === null || telefoneValido(v), "Telefone inválido. Use DDD + número.");

export const empresaSchema = z.object({
  nome: textoObrigatorio("o nome da empresa"),
  cnpj: cnpjOpcional,
  site: textoOpcional(300).transform((v) => (v ? normalizarUrl(v) : null)),
  linkedin: linkedinOpcional,
  telefone: telefoneOpcional,
  email: emailOpcional,
  porte: enumOpcional(PORTES, "Porte inválido."),
  ramo: enumOpcional(RAMOS, "Ramo inválido."),
  setorAtividade: textoOpcional(120),
  observacoes: textoOpcional(2000),
});
export type DadosEmpresa = z.infer<typeof empresaSchema>;

export const telefoneSchema = z.object({
  tipo: enumObrigatorio(TIPOS_TELEFONE, "Selecione o tipo."),
  numero: z
    .string({ required_error: "Informe o número.", invalid_type_error: "Informe o número." })
    .trim()
    .min(1, "Informe o número.")
    .refine(telefoneValido, "Telefone inválido. Use DDD + número."),
  principal: booleano,
});

export const contatoSchema = z.object({
  nome: textoObrigatorio("o nome do contato", 120),
  sobrenome: textoOpcional(120),
  cpf: cpfOpcional,
  rg: textoOpcional(20).transform((v) => (v ? v.replace(/[^0-9a-zA-Z]/g, "").toUpperCase() : null)),
  dataNascimento: dataOpcional,
  cargo: textoOpcional(120),
  departamento: textoOpcional(120),
  setor: textoOpcional(120),
  email: z
    .string({ required_error: "Informe o e-mail.", invalid_type_error: "Informe o e-mail." })
    .trim()
    .min(1, "Informe o e-mail.")
    .email("E-mail inválido."),
  linkedin: linkedinOpcional,
  recebeMalaDireta: booleano,
  observacoes: textoOpcional(2000),
  empresaId: idOpcional,
  telefones: z
    .array(telefoneSchema)
    .max(6, "Cadastre no máximo 6 telefones.")
    .default([])
    .refine((t) => t.filter((x) => x.principal).length <= 1, "Marque apenas um telefone como principal.")
    // Sem principal marcado, o primeiro vira o principal.
    .transform((t) => (t.length && !t.some((x) => x.principal) ? t.map((x, i) => ({ ...x, principal: i === 0 })) : t)),
  /** Quando já existe contato com o mesmo e-mail, o usuário precisa confirmar. */
  confirmarDuplicidade: booleano,
});
export type DadosContato = z.infer<typeof contatoSchema>;

export const eventoSchema = z
  .object({
    nome: textoObrigatorio("o nome do evento"),
    dataInicio: dataObrigatoria("a data de início"),
    dataFim: dataOpcional,
    serie: textoOpcional(80),
    edicao: z
      .union([z.string(), z.number(), z.null(), z.undefined()])
      .transform((v) => (v === null || v === undefined || String(v).trim() === "" ? null : Number(String(v).trim())))
      .refine((v) => v === null || (Number.isInteger(v) && v >= 1990 && v <= 2100), "Informe o ano da edição (ex.: 2027)."),
    descricao: textoOpcional(3000),
    // Lista separada por vírgula, ponto e vírgula ou quebra de linha
    publicoAlvo: z
      .union([z.string(), z.array(z.string()), z.null(), z.undefined()])
      .transform((v) => separarLista(v))
      .refine((l) => l.every((x) => x.length <= 60), "Cada público-alvo deve ter no máximo 60 caracteres.")
      .refine((l) => l.length <= 20, "Use no máximo 20 itens de público-alvo."),
  })
  .refine((d) => !d.dataFim || d.dataFim >= d.dataInicio, {
    path: ["dataFim"],
    message: "A data de término não pode ser anterior ao início.",
  });
export type DadosEvento = z.infer<typeof eventoSchema>;

export const notaSchema = z.object({
  texto: textoObrigatorio("o texto da nota", 5000),
  responsavelId: idOpcional,
});

export const tagSchema = z.object({ nome: textoObrigatorio("o nome da tag", 40) });

export const contatoEventoSchema = z.object({
  eventoId: idObrigatorio("o evento"),
  papel: enumObrigatorio(PAPEIS_EVENTO, "Selecione o papel."),
});

export const buscaContatosSchema = z.object({
  termo: z.string().optional().default(""),
  campo: z.enum(CAMPOS_BUSCA).catch("NOME").default("NOME"),
  escopo: z.enum(ESCOPOS_BUSCA).catch("AMBOS").default("AMBOS"),
  tagId: z.string().optional(),
  filtro: z.enum(FILTROS_NEGOCIO).optional().catch(undefined),
  pagina: z.coerce.number().int().min(1).catch(1).default(1),
});
export type BuscaContatos = z.input<typeof buscaContatosSchema>;
