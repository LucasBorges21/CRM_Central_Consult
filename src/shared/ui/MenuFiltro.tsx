"use client";
/**
 * Filtro em menu suspenso, para listas que crescem (ex.: eventos — 10 a 12 por ano).
 * Um botão mostra a opção atual; o painel traz busca e opções agrupadas. Cada opção é um link
 * que troca um parâmetro da URL e mantém os demais.
 */
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { normalizarBusca } from "@/shared/texto";
import { cx } from "./componentes";
import { IconeBusca, IconeCheck } from "./icones";

export type GrupoOpcoes = { titulo: string; opcoes: { valor: string; rotulo: string; detalhe?: string }[] };

export function MenuFiltro({
  rotulo,
  nome,
  rotuloTodos,
  grupos,
  valorAtual,
  parametros,
  caminho,
}: {
  rotulo: string;
  nome: string;
  rotuloTodos: string;
  grupos: GrupoOpcoes[];
  valorAtual?: string;
  parametros: Record<string, string | undefined>;
  caminho: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const raiz = useRef<HTMLDivElement>(null);
  const idPainel = useId();

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  const href = (valor: string) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(parametros)) if (v && k !== nome) qs.set(k, v);
    if (valor) qs.set(nome, valor);
    return `${caminho}${qs.size ? `?${qs}` : ""}`;
  };
  const todas = grupos.flatMap((g) => g.opcoes);
  const atual = todas.find((o) => o.valor === valorAtual);
  const termo = normalizarBusca(busca);
  const filtrados = grupos
    .map((g) => ({ ...g, opcoes: g.opcoes.filter((o) => !termo || normalizarBusca(o.rotulo).includes(termo)) }))
    .filter((g) => g.opcoes.length > 0);
  const fechar = () => {
    setAberto(false);
    setBusca("");
  };

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls={idPainel}
        onClick={() => setAberto((v) => !v)}
        className={cx(
          "inline-flex min-h-9 items-center gap-2 rounded-full border px-3.5 text-sm transition-colors",
          atual ? "border-marca-600 bg-marca-600 font-semibold text-white" : "border-[#D5DCE1] bg-white font-medium text-tinta-2 hover:border-marca-200",
        )}
      >
        <span className={atual ? "text-white/80" : "text-suave"}>{rotulo}:</span>
        <span className="font-semibold">{atual?.rotulo ?? rotuloTodos}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true" className={cx("transition-transform", aberto && "rotate-180")}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {aberto && (
        <div
          id={idPainel}
          className="animar-entrada absolute left-0 z-30 mt-2 w-[min(340px,calc(100vw-2rem))] rounded-2xl border border-borda bg-white p-2 shadow-xl"
        >
          {todas.length > 6 && (
            <label className="mb-2 flex min-h-10 items-center gap-2 rounded-[10px] bg-[#F4F6FB] px-3 text-suave">
              <IconeBusca tamanho={16} />
              <span className="sr-only">Buscar {rotulo.toLowerCase()}</span>
              <input
                autoFocus
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={`Buscar ${rotulo.toLowerCase()}…`}
                className="min-w-0 flex-1 bg-transparent text-sm text-tinta outline-none"
              />
            </label>
          )}
          <nav aria-label={`Filtrar por ${rotulo.toLowerCase()}`} className="flex max-h-[320px] flex-col overflow-y-auto">
            <Opcao href={href("")} rotulo={rotuloTodos} ativo={!atual} aoEscolher={fechar} />
            {filtrados.map((g) => (
              <div key={g.titulo} className="mt-1">
                <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-suave">{g.titulo}</p>
                {g.opcoes.map((o) => (
                  <Opcao key={o.valor} href={href(o.valor)} rotulo={o.rotulo} detalhe={o.detalhe} ativo={o.valor === valorAtual} aoEscolher={fechar} />
                ))}
              </div>
            ))}
            {filtrados.length === 0 && <p className="px-3 py-4 text-center text-sm text-suave">Nenhum resultado.</p>}
          </nav>
        </div>
      )}
    </div>
  );
}

function Opcao({ href, rotulo, detalhe, ativo, aoEscolher }: { href: string; rotulo: string; detalhe?: string; ativo: boolean; aoEscolher: () => void }) {
  return (
    <Link
      href={href}
      scroll={false}
      onClick={aoEscolher}
      aria-current={ativo ? "true" : undefined}
      className={cx("flex min-h-10 items-center gap-2 rounded-lg px-3 py-1.5", ativo ? "bg-marca-50 text-marca-800" : "text-tinta hover:bg-[#F4F6FB]")}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cx("text-sm", ativo && "font-semibold")}>{rotulo}</span>
        {detalhe && <span className="text-xs text-suave">{detalhe}</span>}
      </span>
      {ativo && <IconeCheck tamanho={16} className="shrink-0 text-marca-600" />}
    </Link>
  );
}
