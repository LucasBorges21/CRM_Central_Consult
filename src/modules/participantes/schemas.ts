import { z } from "zod";
import { telefoneValido } from "@/shared/documentos";
import { enumObrigatorio, textoObrigatorio, textoOpcional, valorEmCentavos } from "@/shared/validacao";
import { CANAIS_CONFIRMACAO, MODALIDADES, PRESENCAS, TIPOS_INSCRICAO } from "./dominio";

const telefoneOpcional = textoOpcional(30).refine((v) => v === null || telefoneValido(v), "Telefone inválido. Use DDD + número.");

/** Dados da inscrição (o que pertence ao participante no evento). */
export const inscricaoSchema = z
  .object({
    nomeCracha: textoObrigatorio("o nome para o crachá", 60),
    modalidade: enumObrigatorio(MODALIDADES, "Selecione a modalidade."),
    tipoInscricao: enumObrigatorio(TIPOS_INSCRICAO, "Selecione o tipo de inscrição."),
    cortesiaConcedidaPor: textoOpcional(120),
    lote: textoOpcional(60),
    descontoPercentual: z
      .union([z.string(), z.number(), z.null(), z.undefined()])
      .transform((v) => (v === null || v === undefined || v === "" ? null : Number(String(v).replace(",", "."))))
      .refine((v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 100), "Informe um percentual inteiro de 0 a 100."),
    valor: valorEmCentavos("o valor", { obrigatorio: false }),
    observacoes: textoOpcional(1000),
  })
  .transform((d) =>
    d.tipoInscricao === "CORTESIA" ? { ...d, lote: null, descontoPercentual: null, valor: null } : { ...d, cortesiaConcedidaPor: null },
  );

/** Novo participante: pessoa (vira/usa um Contato) + inscrição. */
export const novoParticipanteSchema = z
  .object({
    nomeCompleto: textoObrigatorio("o nome", 120),
    email: z.string({ required_error: "Informe o e-mail." }).trim().min(1, "Informe o e-mail.").email("E-mail inválido."),
    empresa: textoOpcional(120),
    cargo: textoOpcional(120),
    celular: telefoneOpcional,
    telefone: telefoneOpcional,
  })
  .and(inscricaoSchema);

export const presencaSchema = z.object({ presenca: enumObrigatorio(PRESENCAS, "Selecione a presença.") });
export const modalidadeSchema = z.object({ modalidade: enumObrigatorio(MODALIDADES, "Selecione a modalidade.") });
export const confirmacaoSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Selecione ao menos um participante."),
  canal: enumObrigatorio(CANAIS_CONFIRMACAO, "Selecione o canal."),
});
