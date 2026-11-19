"use client";
import { useState } from "react";
import { acaoEntrar } from "@/modules/acesso/acoes";
import { Botao, Campo, Entrada } from "@/shared/ui/componentes";
import { lerFormulario, useAcao } from "@/shared/ui/interativos";

export function FormLogin({ proximo }: { proximo?: string }) {
  const { erros, pendente, enviar } = useAcao();
  const [mostrarSenha, setMostrarSenha] = useState(false);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const dados = lerFormulario(e.currentTarget);
        enviar(() => acaoEntrar({ ...dados, proximo }));
      }}
    >
      <Campo rotulo="E-mail" nome="email" id="login-email" erro={erros.email}>
        <Entrada name="email" id="login-email" type="email" autoComplete="username" autoFocus erro={erros.email} placeholder="seu.nome@centralconsult.com.br" />
      </Campo>
      <Campo rotulo="Senha" nome="senha" id="login-senha" erro={erros.senha}>
        <div className="relative">
          <Entrada
            name="senha"
            id="login-senha"
            type={mostrarSenha ? "text" : "password"}
            autoComplete="current-password"
            erro={erros.senha}
            className="pr-20"
          />
          <button
            type="button"
            onClick={() => setMostrarSenha((v) => !v)}
            aria-pressed={mostrarSenha}
            className="absolute inset-y-1 right-1 rounded-lg px-3 text-[13px] font-semibold text-marca-700 hover:bg-marca-50"
          >
            {mostrarSenha ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      </Campo>
      <Botao type="submit" disabled={pendente} className="mt-2 min-h-12 text-[15px]">
        {pendente ? "Entrando…" : "Entrar"}
      </Botao>
    </form>
  );
}
