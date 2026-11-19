import { z } from "zod";
import { enumObrigatorio, textoObrigatorio, textoOpcional } from "@/shared/validacao";
import { CANAIS } from "./dominio";

export const interacaoSchema = z.object({
  canal: enumObrigatorio(CANAIS, "Selecione o canal."),
  resumo: textoObrigatorio("o resumo da conversa", 2000),
  combinado: textoOpcional(2000),
});
export type DadosInteracao = z.infer<typeof interacaoSchema>;
