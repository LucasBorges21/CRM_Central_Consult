"use client";
/**
 * Campo de empresa com digitação: busca no banco enquanto a pessoa escreve (serve para centenas de empresas)
 * e permite cadastrar a empresa ali mesmo quando ela ainda não existe.
 * Grava o id em um <input type="hidden" name={nome}>. Padrão "combobox" do WAI-ARIA (setas, Enter, Esc).
 */
import { useEffect, useId, useRef, useState } from "react";
import { cx } from "@/shared/ui/componentes";
import { useAvisos } from "@/shared/ui/interativos";
import { normalizarBusca } from "@/shared/texto";
import { formatarCnpj } from "@/shared/documentos";
import { acaoCriarEmpresaRapida, acaoSugerirEmpresas } from "../acoes";

export type EmpresaEscolhida = { id: string; nome: string };
type Sugestao = { id: string; nome: string; cnpj: string | null; ramo: string | null };

export function SeletorEmpresa({
  id,
  nome = "empresaId",
  inicial,
  erro,
  semEmpresaRotulo = "Sem empresa",
  aoMudar,
}: {
  id: string;
  nome?: string;
  inicial?: EmpresaEscolhida | null;
  erro?: string;
  semEmpresaRotulo?: string;
  aoMudar?: (empresa: EmpresaEscolhida | null) => void;
}) {
  const [escolhida, setEscolhida] = useState<EmpresaEscolhida | null>(inicial ?? null);
  const [texto, setTexto] = useState(inicial?.nome ?? "");
  const [aberto, setAberto] = useState(false);
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [ativo, setAtivo] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [criando, setCriando] = useState(false);
  const pedido = useRef(0);
  const listaId = useId();
  const { avisar } = useAvisos();

  const termo = texto.trim();
  const existeIgual = sugestoes.some((s) => normalizarBusca(s.nome) === normalizarBusca(termo));
  const podeCriar = !!termo && !existeIgual && !carregando;
  const total = sugestoes.length + (podeCriar ? 1 : 0);
  const pendenteDeEscolha = !!termo && !escolhida;

  // Busca com espera curta entre as teclas; ignora respostas que chegam fora de ordem
  useEffect(() => {
    if (!aberto) return;
    const n = ++pedido.current;
    setCarregando(true);
    const t = setTimeout(async () => {
      const r = await acaoSugerirEmpresas(termo);
      if (n !== pedido.current) return;
      setSugestoes(r);
      setAtivo(0);
      setCarregando(false);
    }, 180);
    return () => clearTimeout(t);
  }, [termo, aberto]);

  function escolher(e: EmpresaEscolhida | null) {
    setEscolhida(e);
    setTexto(e?.nome ?? "");
    setAberto(false);
    aoMudar?.(e);
  }

  async function criar() {
    if (!termo || criando) return;
    setCriando(true);
    const r = await acaoCriarEmpresaRapida(termo);
    setCriando(false);
    if (r.ok && r.dados) {
      avisar("sucesso", `Empresa “${r.dados.nome}” cadastrada.`);
      escolher(r.dados);
    } else if (!r.ok) {
      avisar("erro", r.mensagem);
    }
  }

  function confirmarAtivo() {
    if (ativo < sugestoes.length) escolher(sugestoes[ativo]);
    else if (podeCriar) void criar();
  }

  return (
    <div className="relative">
      <input type="hidden" name={nome} value={escolhida?.id ?? ""} />
      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={aberto}
          aria-controls={listaId}
          aria-activedescendant={aberto && total > 0 ? `${listaId}-${ativo}` : undefined}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? `${id}-erro` : undefined}
          placeholder={`Digite para buscar · vazio = ${semEmpresaRotulo.toLowerCase()}`}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setAberto(true);
            if (escolhida) {
              setEscolhida(null);
              aoMudar?.(null);
            }
          }}
          onFocus={() => setAberto(true)}
          onBlur={() => {
            setAberto(false);
            // Se o texto bate exatamente com uma sugestão, escolhe sozinho
            if (!escolhida && termo) {
              const igual = sugestoes.find((s) => normalizarBusca(s.nome) === normalizarBusca(termo));
              if (igual) escolher(igual);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              if (!aberto) setAberto(true);
              else if (total) setAtivo((a) => (a + 1) % total);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              if (total) setAtivo((a) => (a - 1 + total) % total);
            } else if (e.key === "Enter") {
              if (aberto && total > 0) {
                e.preventDefault();
                confirmarAtivo();
              }
            } else if (e.key === "Escape") {
              if (aberto) {
                e.preventDefault();
                e.stopPropagation(); // não fecha o modal
                setAberto(false);
              }
            }
          }}
          className={cx(
            "min-h-10 w-full rounded-[10px] border bg-white py-2 pl-3 pr-10 text-sm text-tinta placeholder:text-[#9AA6AF] focus:outline-none focus:ring-2",
            erro ? "border-red-400 focus:ring-red-100" : "border-borda focus:border-marca-500 focus:ring-marca-100",
          )}
        />
        {texto && (
          <button
            type="button"
            aria-label="Limpar empresa"
            onClick={() => escolher(null)}
            className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-suave hover:bg-[#F4F6FB] hover:text-tinta"
          >
            ×
          </button>
        )}
      </div>

      {aberto && (
        <ul
          id={listaId}
          role="listbox"
          aria-label="Empresas encontradas"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-borda bg-white p-1 shadow-lg"
        >
          {carregando && sugestoes.length === 0 && <li className="px-3 py-2 text-sm text-suave">Buscando…</li>}
          {!carregando && sugestoes.length === 0 && !podeCriar && <li className="px-3 py-2 text-sm text-suave">Digite o nome da empresa.</li>}
          {sugestoes.map((s, i) => (
            <li
              key={s.id}
              id={`${listaId}-${i}`}
              role="option"
              aria-selected={i === ativo}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setAtivo(i)}
              onClick={() => escolher(s)}
              className={cx("flex min-h-10 cursor-pointer flex-col justify-center rounded-lg px-3 py-1.5", i === ativo && "bg-marca-50")}
            >
              <span className="text-sm font-semibold text-tinta">{s.nome}</span>
              {(s.cnpj || s.ramo) && (
                <span className="text-xs text-suave">{[s.cnpj ? formatarCnpj(s.cnpj) : null, s.ramo].filter(Boolean).join(" · ")}</span>
              )}
            </li>
          ))}
          {podeCriar && (
            <li
              id={`${listaId}-${sugestoes.length}`}
              role="option"
              aria-selected={ativo === sugestoes.length}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setAtivo(sugestoes.length)}
              onClick={() => void criar()}
              className={cx(
                "flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border-t border-[#EEF1F3] px-3 text-sm font-semibold text-marca-700",
                ativo === sugestoes.length && "bg-marca-50",
              )}
            >
              {criando ? "Cadastrando…" : `+ Cadastrar empresa “${termo}”`}
            </li>
          )}
        </ul>
      )}

      {pendenteDeEscolha && !aberto && (
        <p className="mt-1 text-xs font-medium text-amber-800">Escolha uma empresa da lista ou cadastre “{termo}”. Sem escolha, o contato fica sem empresa.</p>
      )}
    </div>
  );
}
