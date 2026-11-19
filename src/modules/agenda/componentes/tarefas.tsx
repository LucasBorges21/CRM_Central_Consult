"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { acaoConcluirTarefa } from "@/fluxos/acoes";
import { formatarData } from "@/shared/datas";
import { Avatar, Botao, Campo, cx, Entrada, Etiqueta, Selecao } from "@/shared/ui/componentes";
import { IconeCheck } from "@/shared/ui/icones";
import { lerFormulario, Modal, useAcao } from "@/shared/ui/interativos";
import { acaoCriarTarefa, acaoCriarTarefaDoContato, acaoReagendarTarefa } from "../acoes";
import type { GrupoPrazo } from "../dominio";

type Opcao = { id: string; nome: string };

function CamposTarefa({
  prefixo = "",
  idPrefixo = "",
  erros,
  responsaveis,
  responsavelPadrao,
  hoje,
}: {
  prefixo?: string;
  /** Prefixo dos ids HTML, para não colidir com outros formulários da mesma tela. */
  idPrefixo?: string;
  erros: Record<string, string>;
  responsaveis: Opcao[];
  responsavelPadrao?: string;
  hoje: string;
}) {
  const n = (c: string) => `${prefixo}${c}`;
  const i = (c: string) => `${idPrefixo}${prefixo}${c}`;
  return (
    <>
      <Campo rotulo="Descrição" nome={n("descricao")} id={i("descricao")} erro={erros[n("descricao")]} className="sm:col-span-2">
        <Entrada name={n("descricao")} id={i("descricao")} erro={erros[n("descricao")]} placeholder="Ex.: Retornar sobre a proposta" />
      </Campo>
      <Campo rotulo="Prazo" nome={n("prazo")} id={i("prazo")} erro={erros[n("prazo")]}>
        <Entrada name={n("prazo")} id={i("prazo")} type="date" defaultValue={hoje} erro={erros[n("prazo")]} />
      </Campo>
      <Campo rotulo="Responsável" nome={n("responsavelId")} id={i("responsavelId")} erro={erros[n("responsavelId")]}>
        <Selecao name={n("responsavelId")} id={i("responsavelId")} defaultValue={responsavelPadrao ?? ""} erro={erros[n("responsavelId")]}>
          <option value="">Selecione…</option>
          {responsaveis.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nome}
            </option>
          ))}
        </Selecao>
      </Campo>
    </>
  );
}

/** Nova tarefa na tela de detalhe. */
export function FormNovaTarefa({
  oportunidadeId,
  responsaveis,
  responsavelPadrao,
  hoje,
}: {
  oportunidadeId: string;
  responsaveis: Opcao[];
  responsavelPadrao?: string;
  hoje: string;
}) {
  const { erros, pendente, enviar } = useAcao();
  const [aberto, setAberto] = useState(false);
  if (!aberto)
    return (
      <Botao variante="secundario" onClick={() => setAberto(true)}>
        + Nova tarefa
      </Botao>
    );
  return (
    <form
      noValidate
      className="grid gap-3 rounded-md border border-borda bg-[#F7F9FA] p-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const dados = lerFormulario(e.currentTarget);
        enviar(() => acaoCriarTarefa(oportunidadeId, dados), { onSucesso: () => setAberto(false) });
      }}
    >
      <CamposTarefa idPrefixo="nova-tarefa-" erros={erros} responsaveis={responsaveis} responsavelPadrao={responsavelPadrao} hoje={hoje} />
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Botao variante="secundario" onClick={() => setAberto(false)}>
          Cancelar
        </Botao>
        <Botao type="submit" disabled={pendente}>
          Salvar tarefa
        </Botao>
      </div>
    </form>
  );
}

/** Nova tarefa no calendário do contato, com vínculo opcional a uma oportunidade dele. */
export function FormTarefaContato({
  contatoId,
  oportunidades,
  responsaveis,
  hoje,
}: {
  contatoId: string;
  oportunidades: { id: string; titulo: string }[];
  responsaveis: Opcao[];
  hoje: string;
}) {
  const { erros, pendente, enviar } = useAcao();
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      noValidate
      className="grid gap-3 rounded-md border border-borda bg-[#F7F9FA] p-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const dados = lerFormulario(e.currentTarget);
        enviar(() => acaoCriarTarefaDoContato(contatoId, dados), { onSucesso: () => ref.current?.reset() });
      }}
    >
      <CamposTarefa idPrefixo="contato-tarefa-" erros={erros} responsaveis={responsaveis} hoje={hoje} />
      <Campo
        rotulo="Vincular a negócio"
        nome="oportunidadeId"
        id="contato-tarefa-oportunidadeId"
        erro={erros.oportunidadeId}
        dica="Opcional. Sem negócio, a tarefa fica só no contato."
        className="sm:col-span-2"
      >
        <Selecao name="oportunidadeId" id="contato-tarefa-oportunidadeId" defaultValue="" erro={erros.oportunidadeId}>
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
    </form>
  );
}

export type TarefaItem = {
  id: string;
  descricao: string;
  prazoChave: string;
  responsavelId: string;
  responsavelNome: string;
  grupo: GrupoPrazo;
  /** Última tarefa pendente de oportunidade aberta: a conclusão pede a próxima ação. */
  exigeDecisao: boolean;
  oportunidade?: { id: string; titulo: string; evento?: string; cliente?: string };
  /** Contato vinculado diretamente (tarefas do calendário do contato). */
  contato?: { id: string; nome: string; empresa?: string };
};

const TOM_GRUPO: Record<GrupoPrazo, { tom: "perigo" | "alerta" | "neutro"; rotulo: string }> = {
  ATRASADA: { tom: "perigo", rotulo: "Atrasada" },
  HOJE: { tom: "alerta", rotulo: "Hoje" },
  FUTURA: { tom: "neutro", rotulo: "Futura" },
};

/** Tarefa pendente com ações de concluir e reagendar (Agenda e detalhe da oportunidade). */
export function ItemTarefa({ tarefa, responsaveis, hoje }: { tarefa: TarefaItem; responsaveis: Opcao[]; hoje: string }) {
  const { erros, setErros, pendente, enviar } = useAcao();
  const [reagendando, setReagendando] = useState(false);
  const [decidindo, setDecidindo] = useState(false);
  const formProxima = useRef<HTMLFormElement>(null);

  function concluir() {
    setErros({});
    if (tarefa.exigeDecisao) {
      setDecidindo(true);
      return;
    }
    enviar(() => acaoConcluirTarefa(tarefa.id), {
      onFalha: (f) => {
        if (f.codigo === "PRECISA_PROXIMA_ACAO") {
          setDecidindo(true);
          return true;
        }
      },
    });
  }

  const grupo = TOM_GRUPO[tarefa.grupo];
  const dataPrazo = formatarData(new Date(`${tarefa.prazoChave}T12:00:00Z`));
  return (
    <li
      className={cx(
        "flex flex-col gap-3 rounded-[14px] border bg-white p-4 shadow-[0_1px_2px_rgba(20,33,43,0.04)] sm:flex-row sm:items-start",
        tarefa.grupo === "ATRASADA" ? "border-red-200" : "border-borda",
      )}
      data-testid="tarefa"
    >
      <button
        type="button"
        onClick={concluir}
        disabled={pendente}
        aria-hidden="true"
        tabIndex={-1}
        title="Concluir"
        className="mt-0.5 hidden h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[#A9B6BF] bg-white text-transparent hover:border-marca-600 hover:text-marca-600 sm:flex"
      >
        <IconeCheck tamanho={14} />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-tinta">{tarefa.descricao}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-suave">
          {tarefa.oportunidade && (
            <>
              <Etiqueta pilula>Negócio</Etiqueta>
              <Link href={`/oportunidades/${tarefa.oportunidade.id}`} className="font-semibold text-marca-700 hover:underline">
                {tarefa.oportunidade.titulo}
              </Link>
              {(tarefa.oportunidade.cliente || tarefa.oportunidade.evento) && (
                <span>· {[tarefa.oportunidade.cliente, tarefa.oportunidade.evento].filter(Boolean).join(" · ")}</span>
              )}
            </>
          )}
          {tarefa.contato && !tarefa.oportunidade && (
            <>
              <Etiqueta pilula tom="roxo">
                Contato
              </Etiqueta>
              <Link href={`/cadastros/contatos/${tarefa.contato.id}?aba=calendario`} className="font-semibold text-marca-700 hover:underline">
                {tarefa.contato.nome}
              </Link>
              {tarefa.contato.empresa && <span>· {tarefa.contato.empresa}</span>}
            </>
          )}
        </div>
        {reagendando && (
          <form
            noValidate
            className="mt-2 flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const dados = lerFormulario(e.currentTarget);
              enviar(() => acaoReagendarTarefa(tarefa.id, dados), { onSucesso: () => setReagendando(false) });
            }}
          >
            <Campo rotulo="Novo prazo" nome={`prazo-${tarefa.id}`} erro={erros.prazo}>
              <Entrada id={`prazo-${tarefa.id}`} name="prazo" type="date" defaultValue={tarefa.prazoChave} erro={erros.prazo} />
            </Campo>
            <Botao type="submit" pequeno disabled={pendente}>
              Salvar prazo
            </Botao>
            <Botao variante="secundario" pequeno onClick={() => setReagendando(false)}>
              Cancelar
            </Botao>
          </form>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
        <span className="flex items-center gap-2">
          <Etiqueta pilula tom={grupo.tom}>
            {tarefa.grupo === "HOJE" ? "Hoje" : tarefa.grupo === "ATRASADA" ? `Atrasada · ${dataPrazo}` : dataPrazo}
          </Etiqueta>
          <span title={tarefa.responsavelNome} className="flex items-center gap-1.5 text-xs text-suave">
            <Avatar nome={tarefa.responsavelNome} tamanho="p" />
            <span className="sr-only">{tarefa.responsavelNome}</span>
          </span>
        </span>
        <span className="flex gap-2">
          <Botao variante="secundario" pequeno onClick={() => setReagendando((v) => !v)} disabled={pendente}>
            Reagendar
          </Botao>
          <Botao pequeno onClick={concluir} disabled={pendente}>
            Concluir
          </Botao>
        </span>
      </div>

      <Modal aberto={decidindo} aoFechar={() => setDecidindo(false)} titulo="Concluir e agendar a próxima ação">
        <p className="mb-4 text-sm text-suave">
          Esta é a última tarefa pendente da oportunidade. Agende a próxima ação ou conclua sem agendar — nesse caso a
          oportunidade fica sinalizada como <strong>Sem próxima ação</strong>.
        </p>
        <form
          ref={formProxima}
          noValidate
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const bruto = lerFormulario(e.currentTarget);
            const proxima = Object.fromEntries(
              Object.entries(bruto).map(([k, v]) => [k.replace("proxima.", ""), v]),
            );
            enviar(() => acaoConcluirTarefa(tarefa.id, { agendarProxima: true, proxima }), {
              onSucesso: () => setDecidindo(false),
            });
          }}
        >
          <CamposTarefa
            prefixo="proxima."
            erros={erros}
            responsaveis={responsaveis}
            responsavelPadrao={tarefa.responsavelId}
            hoje={hoje}
          />
          <div className={cx("flex flex-wrap justify-end gap-2 sm:col-span-2")}>
            <Botao
              variante="secundario"
              disabled={pendente}
              onClick={() =>
                enviar(() => acaoConcluirTarefa(tarefa.id, { semProximaAcao: true }), { onSucesso: () => setDecidindo(false) })
              }
            >
              Concluir sem agendar
            </Botao>
            <Botao type="submit" disabled={pendente}>
              Concluir e agendar próxima
            </Botao>
          </div>
        </form>
      </Modal>
    </li>
  );
}
