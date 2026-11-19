"use client";
import { useState, type ComponentProps, type ReactNode } from "react";
import { Botao } from "@/shared/ui/componentes";
import { FormOportunidade } from "./FormOportunidade";

/** Alterna entre a visualização dos dados comerciais e o formulário de edição. */
export function EdicaoOportunidade({
  visualizacao,
  ...form
}: Omit<ComponentProps<typeof FormOportunidade>, "aoSalvar"> & { visualizacao: ReactNode }) {
  const [editando, setEditando] = useState(false);
  if (editando) return <FormOportunidade {...form} aoSalvar={() => setEditando(false)} />;
  return (
    <div>
      {visualizacao}
      <div className="mt-4 flex justify-end">
        <Botao variante="secundario" onClick={() => setEditando(true)}>
          Editar dados comerciais
        </Botao>
      </div>
    </div>
  );
}
