/**
 * Operações do módulo Histórico.
 *
 * PONTO DE INTEGRAÇÃO FUTURA (WhatsApp, e-mail etc.):
 * um webhook/rota de integração deve identificar a oportunidade e chamar
 * `registrarInteracao(oportunidadeId, { canal: "WHATSAPP", resumo, combinado }, { data })`.
 * A validação, a gravação e a ordem da linha do tempo ficam todas aqui.
 */
import { Prisma } from "@prisma/client";
import { prisma, type Db } from "@/shared/db";
import { ErroDeNegocio } from "@/shared/resultado";
import { rotuloCanal } from "./dominio";
import { repositorioHistorico as repo } from "./repositorio";
import { interacaoSchema } from "./schemas";

function traduzirErroDeVinculo(erro: unknown): never {
  if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2003") {
    throw new ErroDeNegocio("Oportunidade não encontrada.");
  }
  throw erro;
}

/** Registra uma interação (WhatsApp, e-mail, telefone ou reunião) na linha do tempo. */
export async function registrarInteracao(
  oportunidadeId: string,
  entrada: unknown,
  opcoes: { data?: Date; db?: Db } = {},
) {
  const d = interacaoSchema.parse(entrada);
  try {
    return await repo.criar(
      {
        oportunidadeId,
        data: opcoes.data ?? new Date(),
        tipo: "INTERACAO",
        descricao: `${rotuloCanal(d.canal)}: ${d.resumo}`,
        canal: d.canal,
        resumo: d.resumo,
        combinado: d.combinado,
      },
      opcoes.db ?? prisma,
    );
  } catch (erro) {
    traduzirErroDeVinculo(erro);
  }
}

/** Registra uma mudança de etapa. Chamado pelo fluxo `mudarEtapa`, na mesma transação da alteração. */
export function registrarMudancaEtapa(
  r: { oportunidadeId: string; etapaAnterior: string | null; etapaNova: string; descricao: string; data?: Date },
  db: Db,
) {
  return repo.criar(
    {
      oportunidadeId: r.oportunidadeId,
      data: r.data ?? new Date(),
      tipo: "MUDANCA_ETAPA",
      descricao: r.descricao,
      etapaAnterior: r.etapaAnterior,
      etapaNova: r.etapaNova,
    },
    db,
  );
}

/** Linha do tempo da oportunidade, do mais recente para o mais antigo. */
export const linhaDoTempo = (oportunidadeId: string) => repo.listarPorOportunidade(oportunidadeId);

/** Registros de várias oportunidades (ex.: todas as de um contato), do mais recente para o mais antigo. */
export const linhaDoTempoDeOportunidades = (oportunidadeIds: string[]) =>
  oportunidadeIds.length ? repo.listarPorOportunidades(oportunidadeIds) : Promise.resolve([]);

/** Últimos registros de todo o CRM (Painel › Atividade recente). */
export const atividadeRecente = (limite = 6) => repo.recentes(limite);
