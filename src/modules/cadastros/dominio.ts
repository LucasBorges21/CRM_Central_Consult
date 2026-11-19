/** Regras puras e listas do módulo Cadastros (sem banco; podem ser usadas pela interface). */
import { normalizarBusca } from "@/shared/texto";

/** E-mail usado para detectar duplicidade: sem espaços nas extremidades e em minúsculas. */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function nomeCompleto(c: { nome: string; sobrenome?: string | null }): string {
  return [c.nome, c.sobrenome].filter((p) => p && p.trim()).join(" ");
}

/** Chave de busca por nome (minúsculas, sem acento). */
export function chaveBuscaNome(nome: string, sobrenome?: string | null): string {
  return normalizarBusca(nomeCompleto({ nome, sobrenome }));
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

export function linkedinValido(url: string): boolean {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    return /(^|\.)linkedin\.com$/i.test(u.hostname);
  } catch {
    return false;
  }
}

export function normalizarUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

// ---------- Telefones ----------
export const TIPOS_TELEFONE = ["COMERCIAL", "CELULAR", "WHATSAPP", "RESIDENCIAL", "OUTRO"] as const;
export type TipoTelefone = (typeof TIPOS_TELEFONE)[number];
export const ROTULO_TIPO_TELEFONE: Record<TipoTelefone, string> = {
  COMERCIAL: "Comercial",
  CELULAR: "Celular",
  WHATSAPP: "WhatsApp",
  RESIDENCIAL: "Residencial",
  OUTRO: "Outro",
};

// ---------- Perfil da empresa ----------
export const PORTES = ["MEI", "PEQUENO", "MEDIO", "GRANDE"] as const;
export type Porte = (typeof PORTES)[number];
export const ROTULO_PORTE: Record<Porte, string> = {
  MEI: "MEI",
  PEQUENO: "Pequeno porte",
  MEDIO: "Médio porte",
  GRANDE: "Grande porte",
};

export const RAMOS = ["INDUSTRIA", "COMERCIO", "SERVICOS", "SAUDE", "EDUCACAO", "GOVERNO", "TERCEIRO_SETOR", "OUTRO"] as const;
export type Ramo = (typeof RAMOS)[number];
export const ROTULO_RAMO: Record<Ramo, string> = {
  INDUSTRIA: "Indústria",
  COMERCIO: "Comércio",
  SERVICOS: "Serviços",
  SAUDE: "Saúde",
  EDUCACAO: "Educação",
  GOVERNO: "Governo",
  TERCEIRO_SETOR: "Terceiro setor",
  OUTRO: "Outro",
};

// ---------- Eventos associados ----------
export const PAPEIS_EVENTO = ["INTERESSADO", "PARTICIPANTE", "PALESTRANTE", "PATROCINADOR"] as const;
export type PapelEvento = (typeof PAPEIS_EVENTO)[number];
export const ROTULO_PAPEL_EVENTO: Record<PapelEvento, string> = {
  INTERESSADO: "Interessado",
  PARTICIPANTE: "Participante",
  PALESTRANTE: "Palestrante",
  PATROCINADOR: "Patrocinador",
};

// ---------- Busca de contatos ----------
export const CAMPOS_BUSCA = ["NOME", "TAG", "EMAIL", "TELEFONE", "DOCUMENTO", "RG"] as const;
export type CampoBusca = (typeof CAMPOS_BUSCA)[number];
export const ROTULO_CAMPO_BUSCA: Record<CampoBusca, string> = {
  NOME: "Nome",
  TAG: "Tag",
  EMAIL: "E-mail",
  TELEFONE: "Telefone",
  DOCUMENTO: "CPF / CNPJ",
  RG: "RG",
};

/** Física = dados da pessoa; Jurídica = dados da empresa (lista os contatos dela). */
export const ESCOPOS_BUSCA = ["AMBOS", "FISICA", "JURIDICA"] as const;
export type EscopoBusca = (typeof ESCOPOS_BUSCA)[number];
export const ROTULO_ESCOPO_BUSCA: Record<EscopoBusca, string> = {
  AMBOS: "Física e Jurídica",
  FISICA: "Pessoa física",
  JURIDICA: "Pessoa jurídica",
};

/** Atalhos da coluna lateral. */
export const FILTROS_NEGOCIO = ["COM_NEGOCIOS", "SEM_NEGOCIOS", "SEM_EMPRESA"] as const;
export type FiltroNegocio = (typeof FILTROS_NEGOCIO)[number];

/** Arquivos anexados ao contato. */
export const TAMANHO_MAXIMO_ARQUIVO = 10 * 1024 * 1024;
export const EXTENSOES_BLOQUEADAS = ["exe", "bat", "cmd", "com", "msi", "ps1", "sh", "js", "vbs", "scr", "dll", "jar"];
