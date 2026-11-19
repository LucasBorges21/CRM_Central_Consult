"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { acaoContatosParaOportunidade } from "@/modules/cadastros/acoes";
import { acaoCriarOportunidade } from "@/fluxos/acoes";
import { centavosParaCampo } from "@/shared/dinheiro";
import { SeletorEmpresa, type EmpresaEscolhida } from "@/modules/cadastros/componentes/SeletorEmpresa";
import { Botao, Campo, Entrada, Selecao } from "@/shared/ui/componentes";
import { lerFormulario, useAcao } from "@/shared/ui/interativos";
import { acaoAtualizarOportunidade } from "../acoes";
import { ORIGENS_LEAD, ROTULO_TIPO_VENDA, TIPOS_VENDA } from "../dominio";

type Opcao = { id: string; nome: string };
type ContatoOpcao = { id: string; nome: string; email: string; cargo: string | null };

export type ValoresOportunidade = {
  id: string;
  titulo: string;
  eventoId: string;
  tipoVenda: string;
  empresaId: string | null;
  empresaNome: string | null;
  contatoId: string;
  origemLead: string;
  responsavelId: string;
  valorEstimadoCentavos: number;
};

export function FormOportunidade({
  oportunidade,
  eventos,
  responsaveis,
  contatosIniciais,
  empresaInicial,
  contatoInicial,
  hoje,
  permitirSimulacao,
  aoSalvar,
}: {
  oportunidade?: ValoresOportunidade;
  eventos: Opcao[];
  responsaveis: Opcao[];
  contatosIniciais: ContatoOpcao[];
  empresaInicial?: EmpresaEscolhida | null;
  contatoInicial?: string | null;
  hoje: string;
  permitirSimulacao?: boolean;
  aoSalvar?: () => void;
}) {
  const criando = !oportunidade;
  const router = useRouter();
  const { erros, pendente, enviar } = useAcao();
  const [empresaId, setEmpresaId] = useState(oportunidade?.empresaId ?? empresaInicial?.id ?? "");
  const [contatos, setContatos] = useState(contatosIniciais);
  const [carregandoContatos, iniciar] = useTransition();

  function trocarEmpresa(novo: string) {
    setEmpresaId(novo);
    iniciar(async () => setContatos(await acaoContatosParaOportunidade(novo || null)));
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        const bruto = lerFormulario(e.currentTarget);
        const dados: Record<string, unknown> = {};
        const tarefa: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(bruto)) {
          if (k.startsWith("tarefa.")) tarefa[k.slice(7)] = v;
          else dados[k] = v;
        }
        if (criando) {
          enviar(() => acaoCriarOportunidade({ ...dados, tarefa }), {
            onSucesso: (d) => d && router.push(`/oportunidades/${d.id}`),
          });
        } else {
          enviar(() => acaoAtualizarOportunidade(oportunidade.id, dados), { onSucesso: () => aoSalvar?.() });
        }
      }}
    >
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-base font-semibold text-tinta">Dados comerciais</legend>
        <Campo rotulo="Título" nome="titulo" erro={erros.titulo} className="sm:col-span-2">
          <Entrada name="titulo" defaultValue={oportunidade?.titulo} erro={erros.titulo} placeholder="Ex.: Inscrições equipe comercial" />
        </Campo>
        <Campo rotulo="Evento" nome="eventoId" erro={erros.eventoId}>
          <Selecao name="eventoId" defaultValue={oportunidade?.eventoId ?? ""} erro={erros.eventoId}>
            <option value="">Selecione…</option>
            {eventos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Tipo de venda" nome="tipoVenda" erro={erros.tipoVenda}>
          <Selecao name="tipoVenda" defaultValue={oportunidade?.tipoVenda ?? ""} erro={erros.tipoVenda}>
            <option value="">Selecione…</option>
            {TIPOS_VENDA.map((t) => (
              <option key={t} value={t}>
                {ROTULO_TIPO_VENDA[t]}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo
          rotulo="Empresa"
          nome="empresaId"
          erro={erros.empresaId}
          id="empresaId"
          dica="Digite para buscar. Sem empresa = compra individual (lista contatos sem empresa)."
        >
          <SeletorEmpresa
            id="empresaId"
            inicial={
              oportunidade
                ? oportunidade.empresaId && oportunidade.empresaNome
                  ? { id: oportunidade.empresaId, nome: oportunidade.empresaNome }
                  : null
                : (empresaInicial ?? null)
            }
            erro={erros.empresaId}
            semEmpresaRotulo="Sem empresa (compra individual)"
            aoMudar={(e) => {
              if ((e?.id ?? "") !== empresaId) trocarEmpresa(e?.id ?? "");
            }}
          />
        </Campo>
        <Campo
          rotulo="Contato principal"
          nome="contatoId"
          erro={erros.contatoId}
          dica={carregandoContatos ? "Carregando contatos…" : contatos.length === 0 ? "Nenhum contato disponível — cadastre em Cadastros › Contatos." : undefined}
        >
          <Selecao
            key={empresaId}
            name="contatoId"
            defaultValue={
              oportunidade && oportunidade.empresaId === (empresaId || null)
                ? oportunidade.contatoId
                : !oportunidade && (empresaInicial?.id ?? "") === empresaId && contatoInicial
                  ? contatoInicial
                  : ""
            }
            erro={erros.contatoId}
            disabled={carregandoContatos}
          >
            <option value="">Selecione…</option>
            {contatos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} — {c.email}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Origem do lead" nome="origemLead" erro={erros.origemLead}>
          <Selecao name="origemLead" defaultValue={oportunidade?.origemLead ?? ""} erro={erros.origemLead}>
            <option value="">Selecione…</option>
            {ORIGENS_LEAD.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
            {oportunidade && !(ORIGENS_LEAD as readonly string[]).includes(oportunidade.origemLead) && (
              <option value={oportunidade.origemLead}>{oportunidade.origemLead}</option>
            )}
          </Selecao>
        </Campo>
        <Campo rotulo="Responsável comercial" nome="responsavelId" erro={erros.responsavelId}>
          <Selecao name="responsavelId" defaultValue={oportunidade?.responsavelId ?? ""} erro={erros.responsavelId}>
            <option value="">Selecione…</option>
            {responsaveis.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Valor estimado (R$)" nome="valorEstimado" erro={erros.valorEstimado}>
          <Entrada
            name="valorEstimado"
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={oportunidade ? centavosParaCampo(oportunidade.valorEstimadoCentavos) : ""}
            erro={erros.valorEstimado}
          />
        </Campo>
      </fieldset>

      {criando && (
        <fieldset className="grid gap-4 rounded-lg border border-marca-200 bg-marca-50/50 p-4 sm:grid-cols-2">
          <legend className="px-1 text-base font-semibold text-tinta">Primeira ação</legend>
          <Campo rotulo="Descrição" nome="tarefa.descricao" erro={erros["tarefa.descricao"]} className="sm:col-span-2">
            <Entrada name="tarefa.descricao" erro={erros["tarefa.descricao"]} placeholder="Ex.: Ligar para apresentar as condições" />
          </Campo>
          <Campo rotulo="Prazo" nome="tarefa.prazo" erro={erros["tarefa.prazo"]}>
            <Entrada name="tarefa.prazo" type="date" defaultValue={hoje} erro={erros["tarefa.prazo"]} />
          </Campo>
          <Campo rotulo="Responsável" nome="tarefa.responsavelId" erro={erros["tarefa.responsavelId"]}>
            <Selecao name="tarefa.responsavelId" defaultValue="" erro={erros["tarefa.responsavelId"]}>
              <option value="">Selecione…</option>
              {responsaveis.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome}
                </option>
              ))}
            </Selecao>
          </Campo>
        </fieldset>
      )}

      {criando && permitirSimulacao && (
        <label className="flex items-start gap-2 rounded-md border border-dashed border-[#D5DCE1] p-3 text-sm text-suave">
          <input type="checkbox" name="simularFalhaNaTarefa" className="mt-0.5" />
          <span>
            <strong>Teste (somente desenvolvimento):</strong> simular falha ao gravar a primeira tarefa. A oportunidade não deve ser criada.
          </span>
        </label>
      )}

      <div className="flex justify-end gap-2">
        {!criando && (
          <Botao variante="secundario" onClick={() => aoSalvar?.()}>
            Cancelar
          </Botao>
        )}
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : criando ? "Criar oportunidade" : "Salvar alterações"}
        </Botao>
      </div>
    </form>
  );
}
