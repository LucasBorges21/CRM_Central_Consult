"use client";
/**
 * Compositor da ficha do contato: registra nota (Cadastros), interação (Histórico, numa oportunidade do contato)
 * ou tarefa (Agenda). Fica na rota porque compõe ações de três módulos.
 */
import { useRef, useState } from "react";
import { acaoCriarTarefaDoContato } from "@/modules/agenda/acoes";
import { acaoCriarNota } from "@/modules/cadastros/acoes";
import { acaoRegistrarInteracao } from "@/modules/historico/acoes";
import { CANAIS, ROTULO_CANAL } from "@/modules/historico/dominio";
import { AreaTexto, Botao, Campo, cx, Entrada, Selecao } from "@/shared/ui/componentes";
import { lerFormulario, useAcao } from "@/shared/ui/interativos";

type Modo = "nota" | "interacao" | "tarefa";

export function Compositor({
  contatoId,
  primeiroNome,
  oportunidades,
  responsaveis,
  hoje,
}: {
  contatoId: string;
  primeiroNome: string;
  oportunidades: { id: string; titulo: string }[];
  responsaveis: { id: string; nome: string }[];
  hoje: string;
}) {
  const [modo, setModo] = useState<Modo>("nota");
  const { erros, setErros, pendente, enviar } = useAcao();
  const ref = useRef<HTMLFormElement>(null);
  const modos: { valor: Modo; rotulo: string; desabilitado?: boolean }[] = [
    { valor: "nota", rotulo: "Nota" },
    { valor: "interacao", rotulo: "Interação", desabilitado: oportunidades.length === 0 },
    { valor: "tarefa", rotulo: "Tarefa" },
  ];

  return (
    <section className="rounded-2xl border border-borda bg-white p-4 shadow-[0_1px_2px_rgba(20,33,43,0.04)]">
      <div role="group" aria-label="O que registrar" className="mb-3 flex flex-wrap gap-1.5">
        {modos.map((m) => (
          <button
            key={m.valor}
            type="button"
            aria-pressed={modo === m.valor}
            disabled={m.desabilitado}
            title={m.desabilitado ? "Interações são registradas em uma negociação; este contato ainda não tem negócios." : undefined}
            onClick={() => {
              setModo(m.valor);
              setErros({});
            }}
            className={cx(
              "min-h-9 rounded-full px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              modo === m.valor ? "bg-tinta text-white" : "border border-[#D5DCE1] bg-white text-tinta-2 hover:border-marca-200",
            )}
          >
            {m.rotulo}
          </button>
        ))}
      </div>

      <form
        ref={ref}
        noValidate
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const dados = lerFormulario(e.currentTarget);
          const limpar = { onSucesso: () => ref.current?.reset() };
          if (modo === "nota") enviar(() => acaoCriarNota(contatoId, dados), limpar);
          else if (modo === "tarefa") enviar(() => acaoCriarTarefaDoContato(contatoId, dados), limpar);
          else {
            const oportunidadeId = String(dados.oportunidadeId ?? "");
            if (!oportunidadeId) {
              setErros({ oportunidadeId: "Selecione a negociação." });
              return;
            }
            enviar(() => acaoRegistrarInteracao(oportunidadeId, dados), limpar);
          }
        }}
      >
        {modo === "nota" && (
          <>
            <Campo rotulo="Nova nota" nome="texto" id="compositor-texto" erro={erros.texto}>
              <AreaTexto
                name="texto"
                id="compositor-texto"
                erro={erros.texto}
                placeholder={`Escreva uma nota sobre ${primeiroNome}: preferências, contexto, decisões…`}
              />
            </Campo>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <Campo rotulo="Autor" nome="responsavelId" id="compositor-autor" className="w-56">
                <Selecao name="responsavelId" id="compositor-autor" defaultValue="">
                  <option value="">Não informado</option>
                  {responsaveis.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nome}
                    </option>
                  ))}
                </Selecao>
              </Campo>
              <Botao type="submit" disabled={pendente}>
                Salvar nota
              </Botao>
            </div>
          </>
        )}

        {modo === "interacao" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Negociação" nome="oportunidadeId" id="compositor-oportunidade" erro={erros.oportunidadeId}>
              <Selecao name="oportunidadeId" id="compositor-oportunidade" defaultValue={oportunidades[0]?.id ?? ""} erro={erros.oportunidadeId}>
                {oportunidades.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.titulo}
                  </option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Canal" nome="canal" id="compositor-canal" erro={erros.canal}>
              <Selecao name="canal" id="compositor-canal" defaultValue="" erro={erros.canal}>
                <option value="">Selecione…</option>
                {CANAIS.map((c) => (
                  <option key={c} value={c}>
                    {ROTULO_CANAL[c]}
                  </option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Resumo da conversa" nome="resumo" id="compositor-resumo" erro={erros.resumo}>
              <AreaTexto name="resumo" id="compositor-resumo" rows={2} erro={erros.resumo} />
            </Campo>
            <Campo rotulo="O que ficou combinado" nome="combinado" id="compositor-combinado" erro={erros.combinado}>
              <AreaTexto name="combinado" id="compositor-combinado" rows={2} erro={erros.combinado} />
            </Campo>
            <div className="flex justify-end sm:col-span-2">
              <Botao type="submit" disabled={pendente}>
                Registrar interação
              </Botao>
            </div>
          </div>
        )}

        {modo === "tarefa" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Descrição" nome="descricao" id="compositor-descricao" erro={erros.descricao} className="sm:col-span-2">
              <Entrada name="descricao" id="compositor-descricao" erro={erros.descricao} placeholder="Ex.: Ligar para apresentar as cotas" />
            </Campo>
            <Campo rotulo="Prazo" nome="prazo" id="compositor-prazo" erro={erros.prazo}>
              <Entrada name="prazo" id="compositor-prazo" type="date" defaultValue={hoje} erro={erros.prazo} />
            </Campo>
            <Campo rotulo="Responsável" nome="responsavelId" id="compositor-responsavel" erro={erros.responsavelId}>
              <Selecao name="responsavelId" id="compositor-responsavel" defaultValue="" erro={erros.responsavelId}>
                <option value="">Selecione…</option>
                {responsaveis.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome}
                  </option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Vincular a negócio" nome="oportunidadeId" id="compositor-tarefa-oportunidade" erro={erros.oportunidadeId} className="sm:col-span-2">
              <Selecao name="oportunidadeId" id="compositor-tarefa-oportunidade" defaultValue="">
                <option value="">Somente o contato</option>
                {oportunidades.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.titulo}
                  </option>
                ))}
              </Selecao>
            </Campo>
            <div className="flex justify-end sm:col-span-2">
              <Botao type="submit" disabled={pendente}>
                Agendar tarefa
              </Botao>
            </div>
          </div>
        )}
      </form>
    </section>
  );
}
