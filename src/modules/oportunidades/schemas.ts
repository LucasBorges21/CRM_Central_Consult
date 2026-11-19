import { z } from "zod";
import {
  enumObrigatorio,
  idObrigatorio,
  idOpcional,
  textoObrigatorio,
  textoOpcional,
  valorEmCentavos,
} from "@/shared/validacao";
import { ETAPAS, STATUS_PAGAMENTO, TIPOS_VENDA } from "./dominio";

/** Dados comerciais da oportunidade (criação e edição). */
export const oportunidadeSchema = z.object({
  titulo: textoObrigatorio("o título"),
  eventoId: idObrigatorio("o evento"),
  tipoVenda: enumObrigatorio(TIPOS_VENDA, "Selecione o tipo de venda."),
  empresaId: idOpcional,
  contatoId: idObrigatorio("o contato principal"),
  origemLead: textoObrigatorio("a origem do lead", 80),
  responsavelId: idObrigatorio("o responsável comercial"),
  valorEstimado: valorEmCentavos("o valor estimado"),
});
export type DadosOportunidade = z.infer<typeof oportunidadeSchema>;

export const mudancaEtapaSchema = z.object({
  etapa: enumObrigatorio(ETAPAS, "Selecione a etapa."),
  motivoPerda: textoOpcional(500),
  valorFinal: valorEmCentavos("o valor final", { obrigatorio: false }),
});

export const pagamentoSchema = z.object({
  statusPagamento: enumObrigatorio(STATUS_PAGAMENTO, "Selecione o status do pagamento."),
});
