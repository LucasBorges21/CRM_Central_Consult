"use client";
import { useRef } from "react";
import { AreaTexto, Botao, Campo, Selecao } from "@/shared/ui/componentes";
import { lerFormulario, useAcao } from "@/shared/ui/interativos";
import { acaoRegistrarInteracao } from "../acoes";
import { CANAIS, ROTULO_CANAL } from "../dominio";

export function FormInteracao({ oportunidadeId }: { oportunidadeId: string }) {
  const { erros, pendente, enviar } = useAcao();
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      noValidate
      className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]"
      onSubmit={(e) => {
        e.preventDefault();
        const dados = lerFormulario(e.currentTarget);
        enviar(() => acaoRegistrarInteracao(oportunidadeId, dados), { onSucesso: () => ref.current?.reset() });
      }}
    >
      <Campo rotulo="Canal" nome="canal" erro={erros.canal}>
        <Selecao name="canal" defaultValue="" erro={erros.canal}>
          <option value="">Selecione…</option>
          {CANAIS.map((c) => (
            <option key={c} value={c}>
              {ROTULO_CANAL[c]}
            </option>
          ))}
        </Selecao>
      </Campo>
      <Campo rotulo="Resumo da conversa" nome="resumo" erro={erros.resumo}>
        <AreaTexto name="resumo" rows={2} erro={erros.resumo} />
      </Campo>
      <Campo rotulo="O que ficou combinado" nome="combinado" erro={erros.combinado} className="sm:col-start-2">
        <AreaTexto name="combinado" rows={2} erro={erros.combinado} />
      </Campo>
      <div className="flex justify-end sm:col-span-2">
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Registrando…" : "Registrar interação"}
        </Botao>
      </div>
    </form>
  );
}
