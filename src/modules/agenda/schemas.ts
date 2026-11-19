import { z } from "zod";
import { dataObrigatoria, idObrigatorio, textoObrigatorio } from "@/shared/validacao";

export const tarefaSchema = z.object({
  descricao: textoObrigatorio("a descrição da tarefa", 500),
  prazo: dataObrigatoria("o prazo"),
  responsavelId: idObrigatorio("o responsável"),
});
export type DadosTarefa = z.infer<typeof tarefaSchema>;

export const reagendarSchema = z.object({
  prazo: dataObrigatoria("o novo prazo"),
});
