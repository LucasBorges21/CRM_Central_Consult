"use client";
/** Componentes com estado compartilhados: avisos (toast), modal, envio de ações e filtros. */
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import type { ErrosDeCampo, Falha, ResultadoAcao } from "@/shared/resultado";
import { cx } from "./componentes";

// ---------- Avisos ----------

type Aviso = { id: number; tipo: "sucesso" | "erro"; texto: string };
const ContextoAvisos = createContext<{ avisar: (tipo: Aviso["tipo"], texto: string) => void }>({ avisar: () => {} });

export function ProvedorAvisos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const avisar = useCallback((tipo: Aviso["tipo"], texto: string) => {
    const id = Date.now() + Math.random();
    setAvisos((a) => [...a, { id, tipo, texto }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), tipo === "erro" ? 7000 : 4000);
  }, []);
  return (
    <ContextoAvisos.Provider value={{ avisar }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {avisos.map((a) => (
          <div
            key={a.id}
            role={a.tipo === "erro" ? "alert" : "status"}
            className={cx(
              "animar-entrada pointer-events-auto rounded-md border px-4 py-3 text-sm font-medium shadow-lg",
              a.tipo === "sucesso" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900",
            )}
          >
            {a.texto}
          </div>
        ))}
      </div>
    </ContextoAvisos.Provider>
  );
}

export const useAvisos = () => useContext(ContextoAvisos);

// ---------- Envio de ações ----------

/** Lê os campos de um formulário como objeto (checkbox marcado → "on"). */
export function lerFormulario(form: HTMLFormElement): Record<string, unknown> {
  return Object.fromEntries(new FormData(form).entries());
}

/**
 * Executa uma ação do servidor, mostra erros por campo e um aviso de confirmação.
 * `onFalha` pode retornar true para suprimir o aviso de erro (quando a tela trata o caso).
 */
export function useAcao() {
  const [erros, setErros] = useState<ErrosDeCampo>({});
  const [pendente, iniciar] = useTransition();
  const { avisar } = useAvisos();

  function enviar<T>(
    acao: () => Promise<ResultadoAcao<T>>,
    opcoes: { onSucesso?: (dados: T | undefined) => void; onFalha?: (f: Falha) => boolean | void } = {},
  ) {
    iniciar(async () => {
      const r = await acao();
      if (!r) return; // a ação redirecionou (ex.: login) — não há resultado a mostrar
      if (r.ok) {
        setErros({});
        avisar("sucesso", r.mensagem);
        opcoes.onSucesso?.(r.dados);
      } else {
        setErros(r.erros);
        const tratado = opcoes.onFalha?.(r);
        if (!tratado) avisar("erro", r.mensagem);
      }
    });
  }

  return { erros, setErros, pendente, enviar };
}

// ---------- Modal ----------

export function Modal({
  aberto,
  aoFechar,
  titulo,
  children,
  largura = "max-w-lg",
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  children: ReactNode;
  largura?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", tecla);
    ref.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
    return () => document.removeEventListener("keydown", tecla);
  }, [aberto, aoFechar]);
  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-[#14212B]/40 p-4 pt-[8vh]" onMouseDown={aoFechar}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={cx("animar-entrada w-full rounded-2xl bg-white p-6 text-left shadow-xl", largura)}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-tinta">{titulo}</h2>
          <button type="button" onClick={aoFechar} aria-label="Fechar" className="rounded p-1 text-suave hover:bg-[#F1F4F6]">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------- Filtros por URL ----------

export type DefinicaoFiltro = {
  nome: string;
  rotulo: string;
  opcoes: { valor: string; rotulo: string }[];
  todos?: string;
};

/**
 * Conjunto de filtros que atualiza a URL (Painel, Funil, Agenda).
 * Os valores ficam em estado local, então trocar dois filtros em sequência rápida não perde nenhum.
 */
export function FiltrosUrl({ filtros }: { filtros: DefinicaoFiltro[] }) {
  const router = useRouter();
  const caminho = usePathname();
  const params = useSearchParams();
  const [, iniciar] = useTransition();
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(filtros.map((f) => [f.nome, params.get(f.nome) ?? ""])),
  );

  function trocar(nome: string, valor: string) {
    const novos = { ...valores, [nome]: valor };
    setValores(novos);
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(novos)) if (v) qs.set(k, v);
    iniciar(() => router.replace(`${caminho}${qs.size ? `?${qs}` : ""}`, { scroll: false }));
  }

  return (
    <div className="flex flex-wrap gap-2.5">
      {filtros.map((f) => (
        <label
          key={f.nome}
          className="flex min-h-10 items-center gap-2 rounded-[10px] border border-borda bg-white pl-3 pr-1 text-xs text-suave shadow-[0_1px_2px_rgba(20,33,43,0.04)]"
        >
          {f.rotulo}
          <select
            name={f.nome}
            aria-label={f.rotulo}
            value={valores[f.nome] ?? ""}
            onChange={(e) => trocar(f.nome, e.target.value)}
            className="min-h-9 rounded-md border-0 bg-transparent pr-2 text-sm font-semibold text-tinta focus:outline-none"
          >
            <option value="">{f.todos ?? "Todos"}</option>
            {f.opcoes.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
