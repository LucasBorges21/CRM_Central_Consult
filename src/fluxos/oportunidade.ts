/**
 * Fluxos que gravam em mais de um módulo. Cada fluxo roda em UMA transação:
 * se qualquer parte falhar, nada é gravado.
 *
 * Dependências: fluxos → oportunidades, agenda, historico (nenhum módulo importa fluxos).
 */
import { z } from "zod";
import { prisma } from "@/shared/db";
import { formatarReais } from "@/shared/dinheiro";
import { ErroDeNegocio } from "@/shared/resultado";
import * as agenda from "@/modules/agenda/servico";
import { tarefaSchema } from "@/modules/agenda/schemas";
import * as historico from "@/modules/historico/servico";
import * as oportunidades from "@/modules/oportunidades/servico";
import { oportunidadeSchema } from "@/modules/oportunidades/schemas";
import { rotuloEtapa, type AlteracoesDeEtapa } from "@/modules/oportunidades/dominio";

const novaOportunidadeSchema = oportunidadeSchema.extend({ tarefa: tarefaSchema });

export type OpcoesCriacao = {
  /** Somente desenvolvimento/testes: força a gravação da tarefa a falhar no banco para provar o rollback. */
  simularFalhaNaTarefa?: boolean;
};

/** Cria a oportunidade (etapa Novo), registra a criação no histórico e grava a primeira tarefa — tudo ou nada. */
export async function criarOportunidadeComPrimeiraTarefa(
  entrada: Record<string, unknown>,
  opcoes: OpcoesCriacao = {},
) {
  // Valida tudo antes de abrir a transação, para mostrar todos os erros de campo de uma vez.
  const { tarefa } = novaOportunidadeSchema.parse(entrada);

  return prisma.$transaction(async (tx) => {
    const dados = await oportunidades.prepararDadosOportunidade(entrada, tx);
    const criada = await oportunidades.gravarNovaOportunidade(dados, tx);
    await historico.registrarMudancaEtapa(
      { oportunidadeId: criada.id, etapaAnterior: null, etapaNova: "NOVO", descricao: "Oportunidade criada na etapa Novo." },
      tx,
    );
    try {
      // Na simulação, a tarefa aponta para uma oportunidade inexistente e o banco recusa a gravação (chave estrangeira).
      const destino = opcoes.simularFalhaNaTarefa ? "__falha_simulada__" : criada.id;
      await agenda.criarTarefa(destino, tarefa, tx);
    } catch (erro) {
      if (erro instanceof ErroDeNegocio && Object.keys(erro.erros).length) throw erro;
      throw new ErroDeNegocio(
        "Não foi possível gravar a primeira tarefa. A oportunidade não foi criada.",
        {},
        "FALHA_TAREFA",
      );
    }
    return criada;
  });
}

function descreverMudanca(anterior: string, a: AlteracoesDeEtapa) {
  let texto = `Etapa alterada de ${rotuloEtapa(anterior)} para ${rotuloEtapa(a.etapa)}.`;
  if (a.etapa === "PERDIDO" && a.motivoPerda) texto += ` Motivo da perda: ${a.motivoPerda}`;
  if (a.etapa === "FECHADO") texto += ` Valor final: ${formatarReais(a.valorFinalCentavos)}. Pagamento pendente.`;
  return texto;
}

/**
 * Mudança de etapa — a MESMA operação para o cartão do Funil e para a tela de detalhe.
 * A regra (motivo de perda, valor final) está em src/modules/oportunidades/dominio.ts.
 */
export async function mudarEtapa(oportunidadeId: string, entrada: unknown) {
  return prisma.$transaction(async (tx) => {
    const { etapaAnterior, alteracoes } = await oportunidades.prepararMudancaEtapa(oportunidadeId, entrada, tx);
    const atualizada = await oportunidades.aplicarMudancaEtapa(oportunidadeId, alteracoes, tx);
    await historico.registrarMudancaEtapa(
      {
        oportunidadeId,
        etapaAnterior,
        etapaNova: alteracoes.etapa,
        descricao: descreverMudanca(etapaAnterior, alteracoes),
      },
      tx,
    );
    return atualizada;
  });
}

const conclusaoSchema = z.object({
  agendarProxima: z
    .union([z.boolean(), z.string(), z.null(), z.undefined()])
    .transform((v) => v === true || v === "on" || v === "true"),
  semProximaAcao: z
    .union([z.boolean(), z.string(), z.null(), z.undefined()])
    .transform((v) => v === true || v === "on" || v === "true"),
  proxima: z.unknown().optional(),
});

/**
 * Conclui uma tarefa. Se for a última pendente de uma oportunidade aberta, exige uma decisão:
 * agendar a próxima ação (gravada na mesma transação) ou concluir sem agendar ("Sem próxima ação").
 */
export async function concluirTarefa(tarefaId: string, entrada: unknown = {}) {
  const pedido = conclusaoSchema.parse(entrada ?? {});
  const proxima = pedido.agendarProxima ? z.object({ proxima: tarefaSchema }).parse(entrada).proxima : null;

  return prisma.$transaction(async (tx) => {
    const tarefa = await agenda.concluirTarefa(tarefaId, tx);
    const vinculo = { oportunidadeId: tarefa.oportunidadeId, contatoId: tarefa.contatoId };

    if (proxima) {
      await agenda.criarTarefaVinculada(vinculo, proxima, tx);
      return { oportunidadeId: tarefa.oportunidadeId, semProximaAcao: false, proximaAgendada: true };
    }
    // Tarefa só de contato: não há regra de "próxima ação" (ela vale para oportunidades abertas).
    if (!tarefa.oportunidadeId) {
      return { oportunidadeId: null, semProximaAcao: false, proximaAgendada: false };
    }
    const aberta = await oportunidades.oportunidadeEstaAberta(tarefa.oportunidadeId, tx);
    const restantes = await agenda.contarPendentes(tarefa.oportunidadeId, tx);
    if (aberta && restantes === 0 && !pedido.semProximaAcao) {
      throw new ErroDeNegocio(
        "Esta é a última tarefa pendente. Agende a próxima ação ou confirme concluir sem agendar.",
        {},
        "PRECISA_PROXIMA_ACAO",
      );
    }
    return { oportunidadeId: tarefa.oportunidadeId, semProximaAcao: aberta && restantes === 0, proximaAgendada: false };
  });
}
