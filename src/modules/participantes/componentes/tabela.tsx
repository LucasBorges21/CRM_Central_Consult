"use client";
/** Tabela de participantes com edição rápida (modalidade, presença, confirmação) e ações em lote. */
import Link from "next/link";
import { useState } from "react";
import { Avatar, Botao, cx, Etiqueta, Vazio } from "@/shared/ui/componentes";
import { useAcao } from "@/shared/ui/interativos";
import {
  acaoAlterarModalidade,
  acaoAlterarPresenca,
  acaoDesfazerConfirmacao,
  acaoMarcarConfirmacao,
  acaoRemoverParticipante,
} from "../acoes";
import {
  CANAIS_CONFIRMACAO,
  MODALIDADES,
  PRESENCAS,
  ROTULO_CANAL_CONFIRMACAO,
  ROTULO_MODALIDADE,
  ROTULO_PRESENCA,
  rotulo,
} from "../dominio";
import { BotaoEditarInscricao, type InscricaoEdicao } from "./formulario";

export type LinhaParticipante = InscricaoEdicao & {
  nome: string;
  contatoId: string;
  empresa: string | null;
  cargo: string | null;
  email: string;
  celular: string | null;
  inscricaoResumo: string;
  confirmacao: string | null; // "15/11/2026 · WhatsApp" ou null
  presenca: string;
  /** Outras edições da mesma série em que a pessoa se inscreveu (ex.: 2026). */
  outrasEdicoes: { eventoId: string; rotulo: string }[];
};

const corPresenca: Record<string, string> = {
  PENDENTE: "border-[#D5DCE1] bg-white text-tinta-2",
  CONFIRMADA: "border-green-200 bg-green-50 text-green-800",
  CANCELADA: "border-red-200 bg-red-50 text-red-800",
};

function SeletorCanal({ id, rotulo: r, aoEscolher, pequeno }: { id: string; rotulo: string; aoEscolher: (canal: string) => void; pequeno?: boolean }) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="sr-only">{r}</span>
      <select
        id={id}
        value=""
        onChange={(e) => e.target.value && aoEscolher(e.target.value)}
        className={cx(
          "rounded-lg border border-marca-200 bg-marca-50 font-semibold text-marca-700 hover:bg-marca-100",
          pequeno ? "min-h-8 px-2 text-xs" : "min-h-10 px-3 text-sm",
        )}
      >
        <option value="">{pequeno ? "Marcar enviada…" : "Marcar confirmação enviada…"}</option>
        {CANAIS_CONFIRMACAO.map((c) => (
          <option key={c} value={c}>
            por {ROTULO_CANAL_CONFIRMACAO[c]}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TabelaParticipantes({ eventoId, linhas }: { eventoId: string; linhas: LinhaParticipante[] }) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const { pendente, enviar } = useAcao();
  const todos = linhas.length > 0 && selecionados.size === linhas.length;
  const alternar = (id: string) =>
    setSelecionados((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  if (linhas.length === 0) return <Vazio>Nenhum participante encontrado.</Vazio>;

  return (
    <div className="flex flex-col gap-3">
      {selecionados.size > 0 && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center gap-3 rounded-xl border border-marca-200 bg-white p-3 shadow-lg" role="region" aria-label="Ações em lote">
          <span className="font-semibold">{selecionados.size} selecionado(s)</span>
          <SeletorCanal
            id="lote-canal"
            rotulo="Marcar confirmação enviada para os selecionados"
            aoEscolher={(canal) =>
              enviar(() => acaoMarcarConfirmacao(eventoId, [...selecionados], canal), { onSucesso: () => setSelecionados(new Set()) })
            }
          />
          <Botao variante="fantasma" pequeno onClick={() => setSelecionados(new Set())}>
            Limpar seleção
          </Botao>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-borda bg-white shadow-[0_1px_2px_rgba(20,33,43,0.04)]">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-borda bg-[#F7F9FA] text-xs uppercase tracking-wide text-suave">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Selecionar todos"
                  checked={todos}
                  onChange={() => setSelecionados(todos ? new Set() : new Set(linhas.map((l) => l.id)))}
                />
              </th>
              <th className="px-3 py-3 font-semibold">Participante</th>
              <th className="px-3 py-3 font-semibold">Participação</th>
              <th className="px-3 py-3 font-semibold">Inscrição</th>
              <th className="px-3 py-3 font-semibold">Confirmação</th>
              <th className="px-3 py-3 font-semibold">Presença</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {linhas.map((p) => (
              <tr key={p.id} data-testid="participante" className={cx("border-b border-[#EEF1F3] last:border-0", selecionados.has(p.id) && "bg-marca-50/50")}>
                <td className="px-4 py-3 align-top">
                  <input type="checkbox" aria-label={`Selecionar ${p.nome}`} checked={selecionados.has(p.id)} onChange={() => alternar(p.id)} />
                </td>
                <td className="w-[34%] px-3 py-3 align-top">
                  <div className="flex items-start gap-2.5">
                    <Avatar nome={p.nome} tamanho="p" className="mt-0.5" />
                    <div className="min-w-0 [overflow-wrap:anywhere]">
                      <Link href={`/cadastros/contatos/${p.contatoId}`} className="font-semibold text-tinta hover:text-marca-700">
                        {p.nome}
                      </Link>
                      <p className="text-xs font-semibold tracking-wide text-suave" title="Nome no crachá">
                        {p.nomeCracha}
                      </p>
                      {(p.empresa || p.cargo) && (
                        <p className="text-[13px] text-tinta-2">{[p.empresa, p.cargo].filter(Boolean).join(" · ")}</p>
                      )}
                      <p className="text-xs text-suave">{p.email}</p>
                      {p.celular && <p className="text-xs text-suave">{p.celular}</p>}
                      {p.outrasEdicoes.length > 0 && (
                        <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-tinta-2" data-testid="outras-edicoes">
                          <span className="font-semibold">Também em:</span>
                          {p.outrasEdicoes.map((e) => (
                            <Link
                              key={e.eventoId}
                              href={`/cadastros/eventos/${e.eventoId}`}
                              className="rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 font-semibold text-blue-800 hover:bg-blue-200"
                            >
                              {e.rotulo}
                            </Link>
                          ))}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 align-top">
                  <label>
                    <span className="sr-only">Participação de {p.nome}</span>
                    <select
                      value={p.modalidade}
                      disabled={pendente}
                      onChange={(e) => enviar(() => acaoAlterarModalidade(eventoId, p.id, e.target.value))}
                      className="min-h-8 rounded-lg border border-borda bg-[#F7F9FA] px-2 text-xs font-semibold"
                    >
                      {MODALIDADES.map((m) => (
                        <option key={m} value={m}>
                          {ROTULO_MODALIDADE[m]}
                        </option>
                      ))}
                    </select>
                  </label>
                </td>
                <td className="min-w-[190px] px-3 py-3 align-top">
                  <Etiqueta tom={p.tipoInscricao === "CORTESIA" ? "roxo" : "marca"} pilula className="max-w-[220px] whitespace-normal! rounded-lg! py-1">{/* quebra a linha em textos longos */}
                    {p.inscricaoResumo}
                  </Etiqueta>
                  {p.observacoes && <p className="mt-1 max-w-[220px] text-xs text-suave">{p.observacoes}</p>}
                </td>
                <td className="px-3 py-3 align-top">
                  {p.confirmacao ? (
                    <div className="flex flex-col items-start gap-1">
                      <Etiqueta tom="sucesso" pilula>
                        Enviada · {p.confirmacao}
                      </Etiqueta>
                      <button
                        type="button"
                        disabled={pendente}
                        onClick={() => enviar(() => acaoDesfazerConfirmacao(eventoId, p.id))}
                        className="text-xs font-medium text-suave hover:text-marca-700 hover:underline"
                      >
                        Desfazer
                      </button>
                    </div>
                  ) : (
                    <SeletorCanal
                      id={`canal-${p.id}`}
                      pequeno
                      rotulo={`Marcar confirmação enviada para ${p.nome}`}
                      aoEscolher={(canal) => enviar(() => acaoMarcarConfirmacao(eventoId, [p.id], canal))}
                    />
                  )}
                </td>
                <td className="px-3 py-3 align-top">
                  <label>
                    <span className="sr-only">Presença de {p.nome}</span>
                    <select
                      value={p.presenca}
                      disabled={pendente}
                      onChange={(e) => enviar(() => acaoAlterarPresenca(eventoId, p.id, e.target.value))}
                      className={cx("min-h-8 rounded-lg border px-2 text-xs font-semibold", corPresenca[p.presenca])}
                    >
                      {PRESENCAS.map((s) => (
                        <option key={s} value={s}>
                          {rotulo(ROTULO_PRESENCA, s)}
                        </option>
                      ))}
                    </select>
                  </label>
                </td>
                <td className="px-3 py-3 text-right align-top">
                  <div className="flex justify-end gap-1">
                    <BotaoEditarInscricao eventoId={eventoId} inscricao={p} nome={p.nome} />
                    <Botao
                      variante="fantasma"
                      pequeno
                      disabled={pendente}
                      aria-label={`Remover ${p.nome} do evento`}
                      onClick={() => {
                        if (confirm(`Remover ${p.nome} da lista de participantes? O contato continua no CRM.`)) enviar(() => acaoRemoverParticipante(eventoId, p.id));
                      }}
                      className="text-red-700 hover:bg-red-50"
                    >
                      Remover
                    </Botao>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
