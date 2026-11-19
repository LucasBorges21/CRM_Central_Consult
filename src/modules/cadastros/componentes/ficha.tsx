"use client";
/** Partes interativas da ficha do contato: tags, notas, eventos associados e arquivos. */
import { useRef, useState } from "react";
import { formatarDataHora, formatarPeriodo } from "@/shared/datas";
import { AreaTexto, Botao, Campo, Selecao, Vazio } from "@/shared/ui/componentes";
import { lerFormulario, useAcao } from "@/shared/ui/interativos";
import {
  acaoAdicionarTag,
  acaoAnexarArquivo,
  acaoAssociarEvento,
  acaoAtualizarNota,
  acaoCriarNota,
  acaoDesassociarEvento,
  acaoExcluirArquivo,
  acaoExcluirNota,
  acaoRemoverTag,
} from "../acoes";
import { PAPEIS_EVENTO, ROTULO_PAPEL_EVENTO, type PapelEvento } from "../dominio";

// ---------- Tags ----------

export function TagsContato({
  contatoId,
  tags,
  sugestoes,
}: {
  contatoId: string;
  tags: { id: string; nome: string }[];
  sugestoes: string[];
}) {
  const { erros, pendente, enviar } = useAcao();
  const ref = useRef<HTMLFormElement>(null);
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Tags do contato">
      {tags.map((t) => (
        <span key={t.id} className="inline-flex items-center gap-1 rounded-full bg-marca-50 py-0.5 pl-2.5 pr-1 text-xs font-medium text-marca-700">
          {t.nome}
          <button
            type="button"
            aria-label={`Remover tag ${t.nome}`}
            disabled={pendente}
            onClick={() => enviar(() => acaoRemoverTag(contatoId, t.id))}
            className="rounded-full px-1 text-marca-700 hover:bg-marca-100"
          >
            ✕
          </button>
        </span>
      ))}
      <form
        ref={ref}
        noValidate
        className="inline-flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          const dados = lerFormulario(e.currentTarget);
          enviar(() => acaoAdicionarTag(contatoId, dados), { onSucesso: () => ref.current?.reset() });
        }}
      >
        <input
          name="nome"
          list={`tags-${contatoId}`}
          aria-label="Nova tag"
          placeholder="+ tag"
          className="w-28 rounded-full border border-dashed border-[#D5DCE1] bg-white px-2.5 py-0.5 text-xs focus:border-marca-500 focus:outline-none"
        />
        <datalist id={`tags-${contatoId}`}>
          {sugestoes.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <Botao type="submit" variante="fantasma" pequeno disabled={pendente}>
          Adicionar
        </Botao>
      </form>
      {erros.nome && <p className="w-full text-xs text-red-700">{erros.nome}</p>}
    </div>
  );
}

// ---------- Notas ----------

type Nota = { id: string; texto: string; criadoEm: Date; atualizadoEm: Date; responsavel: { nome: string } | null };

function ItemNota({ nota }: { nota: Nota }) {
  const [editando, setEditando] = useState(false);
  const { erros, pendente, enviar } = useAcao();
  return (
    <li className="rounded-md border border-borda bg-white p-3" data-testid="nota">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs text-suave">
        <span>
          {formatarDataHora(nota.criadoEm)}
          {nota.responsavel && ` · ${nota.responsavel.nome}`}
          {nota.atualizadoEm.getTime() - nota.criadoEm.getTime() > 1000 && " · editada"}
        </span>
        {!editando && (
          <span className="flex gap-1">
            <Botao variante="fantasma" pequeno onClick={() => setEditando(true)}>
              Editar
            </Botao>
            <Botao
              variante="fantasma"
              pequeno
              disabled={pendente}
              onClick={() => {
                if (confirm("Excluir esta nota?")) enviar(() => acaoExcluirNota(nota.id));
              }}
            >
              Excluir
            </Botao>
          </span>
        )}
      </div>
      {editando ? (
        <form
          noValidate
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const dados = lerFormulario(e.currentTarget);
            enviar(() => acaoAtualizarNota(nota.id, dados), { onSucesso: () => setEditando(false) });
          }}
        >
          <AreaTexto name="texto" id={`nota-${nota.id}`} aria-label="Texto da nota" defaultValue={nota.texto} erro={erros.texto} />
          {erros.texto && <p className="text-xs text-red-700">{erros.texto}</p>}
          <div className="flex justify-end gap-2">
            <Botao variante="secundario" pequeno onClick={() => setEditando(false)}>
              Cancelar
            </Botao>
            <Botao type="submit" pequeno disabled={pendente}>
              Salvar nota
            </Botao>
          </div>
        </form>
      ) : (
        <p className="whitespace-pre-wrap text-sm text-tinta">{nota.texto}</p>
      )}
    </li>
  );
}

export function NotasContato({
  contatoId,
  notas,
  responsaveis,
}: {
  contatoId: string;
  notas: Nota[];
  responsaveis: { id: string; nome: string }[];
}) {
  const { erros, pendente, enviar } = useAcao();
  const ref = useRef<HTMLFormElement>(null);
  return (
    <div className="flex flex-col gap-4">
      <form
        ref={ref}
        noValidate
        className="grid gap-3 rounded-md border border-borda bg-[#F7F9FA] p-3 sm:grid-cols-[minmax(0,1fr)_14rem]"
        onSubmit={(e) => {
          e.preventDefault();
          const dados = lerFormulario(e.currentTarget);
          enviar(() => acaoCriarNota(contatoId, dados), { onSucesso: () => ref.current?.reset() });
        }}
      >
        <Campo rotulo="Nova nota" nome="texto" id="nova-nota-texto" erro={erros.texto} className="sm:row-span-2">
          <AreaTexto name="texto" id="nova-nota-texto" erro={erros.texto} placeholder="Observações sobre o contato, preferências, contexto…" />
        </Campo>
        <Campo rotulo="Autor" nome="responsavelId" id="nova-nota-responsavel" erro={erros.responsavelId}>
          <Selecao name="responsavelId" id="nova-nota-responsavel" defaultValue="">
            <option value="">Não informado</option>
            {responsaveis.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome}
              </option>
            ))}
          </Selecao>
        </Campo>
        <div className="flex items-end justify-end">
          <Botao type="submit" disabled={pendente}>
            Salvar nota
          </Botao>
        </div>
      </form>
      {notas.length === 0 ? (
        <Vazio>Nenhuma nota registrada.</Vazio>
      ) : (
        <ul className="flex flex-col gap-2">
          {notas.map((n) => (
            <ItemNota key={n.id} nota={n} />
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------- Eventos associados ----------

export function EventosContato({
  contatoId,
  associacoes,
  eventos,
}: {
  contatoId: string;
  associacoes: { id: string; papel: string; evento: { id: string; nome: string; dataInicio: Date; dataFim: Date | null } }[];
  eventos: { id: string; nome: string }[];
}) {
  const { erros, pendente, enviar } = useAcao();
  return (
    <div className="flex flex-col gap-4">
      <form
        noValidate
        className="flex flex-wrap items-end gap-3 rounded-md border border-borda bg-[#F7F9FA] p-3"
        onSubmit={(e) => {
          e.preventDefault();
          const dados = lerFormulario(e.currentTarget);
          enviar(() => acaoAssociarEvento(contatoId, dados));
        }}
      >
        <Campo rotulo="Evento" nome="eventoId" id="associar-evento" erro={erros.eventoId} className="min-w-48 flex-1">
          <Selecao name="eventoId" id="associar-evento" defaultValue="" erro={erros.eventoId}>
            <option value="">Selecione…</option>
            {eventos.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.nome}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Papel" nome="papel" id="associar-papel" erro={erros.papel} className="w-44">
          <Selecao name="papel" id="associar-papel" defaultValue="INTERESSADO" erro={erros.papel}>
            {PAPEIS_EVENTO.map((p) => (
              <option key={p} value={p}>
                {ROTULO_PAPEL_EVENTO[p]}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Botao type="submit" disabled={pendente}>
          Associar evento
        </Botao>
      </form>
      {associacoes.length === 0 ? (
        <Vazio>Nenhum evento associado.</Vazio>
      ) : (
        <ul className="divide-y divide-[#EEF1F3] rounded-md border border-borda bg-white">
          {associacoes.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <span>
                <strong className="text-tinta">{a.evento.nome}</strong>{" "}
                <span className="text-suave">· {formatarPeriodo(a.evento.dataInicio, a.evento.dataFim)}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs font-medium text-sky-800">
                  {ROTULO_PAPEL_EVENTO[a.papel as PapelEvento] ?? a.papel}
                </span>
                <Botao variante="fantasma" pequeno disabled={pendente} onClick={() => enviar(() => acaoDesassociarEvento(a.id))}>
                  Remover
                </Botao>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------- Arquivos ----------

function tamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

export function ArquivosContato({
  contatoId,
  arquivos,
}: {
  contatoId: string;
  arquivos: { id: string; nomeOriginal: string; tamanhoBytes: number; criadoEm: Date }[];
}) {
  const { erros, pendente, enviar } = useAcao();
  const ref = useRef<HTMLFormElement>(null);
  return (
    <div className="flex flex-col gap-4">
      <form
        ref={ref}
        noValidate
        className="flex flex-wrap items-end gap-3 rounded-md border border-borda bg-[#F7F9FA] p-3"
        onSubmit={(e) => {
          e.preventDefault();
          const dados = new FormData(e.currentTarget);
          enviar(() => acaoAnexarArquivo(contatoId, dados), { onSucesso: () => ref.current?.reset() });
        }}
      >
        <Campo rotulo="Anexar arquivo" nome="arquivo" id="arquivo-contato" erro={erros.arquivo} dica="Até 10 MB. PDF, imagens, planilhas, documentos." className="min-w-56 flex-1">
          <input
            type="file"
            name="arquivo"
            id="arquivo-contato"
            className="block w-full text-sm text-tinta-2 file:mr-3 file:rounded-md file:border-0 file:bg-marca-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-marca-700 hover:file:bg-marca-100"
          />
        </Campo>
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Enviando…" : "Enviar arquivo"}
        </Botao>
      </form>
      {arquivos.length === 0 ? (
        <Vazio>Nenhum arquivo anexado.</Vazio>
      ) : (
        <ul className="divide-y divide-[#EEF1F3] rounded-md border border-borda bg-white" aria-label="Arquivos do contato">
          {arquivos.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="min-w-0">
                <a
                  href={`/api/contatos/${contatoId}/arquivos/${a.id}`}
                  download={a.nomeOriginal}
                  className="break-all font-medium text-marca-700 hover:underline"
                >
                  {a.nomeOriginal}
                </a>
                <span className="text-xs text-suave">
                  {" "}
                  · {tamanho(a.tamanhoBytes)} · {formatarDataHora(a.criadoEm)}
                </span>
              </span>
              <Botao
                variante="fantasma"
                pequeno
                disabled={pendente}
                aria-label={`Excluir ${a.nomeOriginal}`}
                onClick={() => {
                  if (confirm(`Excluir o arquivo ${a.nomeOriginal}?`)) enviar(() => acaoExcluirArquivo(a.id));
                }}
              >
                Excluir
              </Botao>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
