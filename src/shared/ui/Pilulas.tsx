/** Filtros em pílulas: cada opção é um link que troca um parâmetro da URL, mantendo os demais. */
import Link from "next/link";
import { cx } from "./componentes";

export function Pilulas({
  rotulo,
  nome,
  opcoes,
  valorAtual,
  parametros,
  caminho,
  escuro,
}: {
  rotulo: string;
  nome: string;
  opcoes: { valor: string; rotulo: string }[];
  valorAtual?: string;
  parametros: Record<string, string | undefined>;
  caminho: string;
  escuro?: boolean;
}) {
  const href = (valor: string) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(parametros)) if (v && k !== nome) qs.set(k, v);
    if (valor) qs.set(nome, valor);
    return `${caminho}${qs.size ? `?${qs}` : ""}`;
  };
  return (
    <nav aria-label={rotulo} className="flex flex-wrap gap-2">
      {opcoes.map((o) => {
        const ativo = (valorAtual ?? "") === o.valor;
        return (
          <Link
            key={o.valor || "todos"}
            href={href(o.valor)}
            scroll={false}
            aria-current={ativo ? "true" : undefined}
            className={cx(
              "inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm transition-colors",
              ativo
                ? escuro
                  ? "border-tinta bg-tinta font-semibold text-white"
                  : "border-marca-600 bg-marca-600 font-semibold text-white"
                : "border-[#D5DCE1] bg-white font-medium text-tinta-2 hover:border-marca-200",
            )}
          >
            {o.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
