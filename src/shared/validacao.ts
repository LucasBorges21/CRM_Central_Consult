import { z } from "zod";
import { chaveValida } from "./datas";
import { textoParaCentavos } from "./dinheiro";

/** Texto obrigatório (sem espaços nas extremidades). */
export const textoObrigatorio = (rotulo: string, max = 200) =>
  z
    .string({ required_error: `Informe ${rotulo}.`, invalid_type_error: `Informe ${rotulo}.` })
    .trim()
    .min(1, `Informe ${rotulo}.`)
    .max(max, `Use no máximo ${max} caracteres.`);

/** Texto opcional: vazio vira null. */
export const textoOpcional = (max = 2000) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (typeof v === "string" && v.trim() ? v.trim() : null))
    .refine((v) => v === null || v.length <= max, `Use no máximo ${max} caracteres.`);

/** Identificador opcional: vazio vira null. */
export const idOpcional = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (typeof v === "string" && v.trim() ? v.trim() : null));

export const idObrigatorio = (rotulo: string) =>
  z
    .string({ required_error: `Selecione ${rotulo}.`, invalid_type_error: `Selecione ${rotulo}.` })
    .trim()
    .min(1, `Selecione ${rotulo}.`);

/** Data "AAAA-MM-DD" (valor de <input type="date">). */
export const dataObrigatoria = (rotulo: string) =>
  z
    .string({ required_error: `Informe ${rotulo}.`, invalid_type_error: `Informe ${rotulo}.` })
    .trim()
    .min(1, `Informe ${rotulo}.`)
    .refine(chaveValida, "Data inválida.");

export const dataOpcional = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (typeof v === "string" && v.trim() ? v.trim() : null))
  .refine((v) => v === null || chaveValida(v), "Data inválida.");

/** Valor em reais digitado → centavos (inteiro). */
export const valorEmCentavos = (rotulo: string, { obrigatorio = true, positivo = false } = {}) =>
  z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((v, ctx) => {
    const vazio = v === null || v === undefined || (typeof v === "string" && !v.trim());
    if (vazio) {
      if (obrigatorio) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Informe ${rotulo}.` });
      return null;
    }
    const centavos = textoParaCentavos(v);
    if (centavos === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Valor inválido. Use o formato 1.234,56." });
      return null;
    }
    if (centavos < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "O valor não pode ser negativo." });
      return null;
    }
    if (positivo && centavos === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "O valor deve ser maior que zero." });
      return null;
    }
    return centavos;
  });

/** Lê um campo opcional de enum: vazio vira null; valor fora da lista gera erro. */
export function enumOpcional<T extends string>(valores: readonly T[], mensagem: string) {
  return z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (typeof v === "string" && v.trim() ? v.trim() : null))
    .refine((v): v is T | null => v === null || (valores as readonly string[]).includes(v), mensagem);
}

export function enumObrigatorio<T extends string>(valores: readonly T[], mensagem: string) {
  return z
    .string({ required_error: mensagem, invalid_type_error: mensagem })
    .refine((v): v is T => (valores as readonly string[]).includes(v), mensagem)
    .transform((v) => v as T);
}

/** Checkbox / booleano vindo de formulário: true, "on" ou "true". */
export const booleano = z
  .union([z.boolean(), z.string(), z.null(), z.undefined()])
  .transform((v) => v === true || v === "on" || v === "true");
