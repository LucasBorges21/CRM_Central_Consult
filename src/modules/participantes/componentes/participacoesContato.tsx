/** Participações do contato em eventos, agrupadas por série (ex.: COMSAÚDE 2026 e 2027). Sem estado. */
import Link from "next/link";
import { formatarPeriodo } from "@/shared/datas";
import { cx, Etiqueta } from "@/shared/ui/componentes";
import { ROTULO_MODALIDADE, ROTULO_PRESENCA, rotulo, ROTULO_TIPO_INSCRICAO } from "../dominio";
import type { ParticipacaoContato } from "../servico";

type Grupo = { serie: string; itens: ParticipacaoContato[] };

export function ParticipacoesPorSerie({ grupos, compacto }: { grupos: Grupo[]; compacto?: boolean }) {
  if (grupos.length === 0) return <p className="text-sm text-suave">Ainda não participou de nenhum evento cadastrado.</p>;
  return (
    <div className={cx("flex flex-col", compacto ? "gap-3" : "gap-4")} data-testid="participacoes-contato">
      {grupos.map((g) => (
        <section key={g.serie} aria-label={`Participações em ${g.serie}`}>
          <h3 className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-marca-700">
            {g.serie}
            <span className="font-medium normal-case tracking-normal text-suave">· {g.itens.length} edição(ões)</span>
          </h3>
          <ul className="flex flex-col gap-1.5">
            {g.itens.map((p) => (
              <li key={p.id} className={cx("flex flex-wrap items-center justify-between gap-2", !compacto && "rounded-xl border border-[#EEF1F3] px-3 py-2")}>
                <span className="min-w-0">
                  <Link href={`/cadastros/eventos/${p.evento.id}`} className="font-semibold text-tinta hover:text-marca-700">
                    {p.evento.edicao && p.evento.serie ? p.evento.edicao : p.evento.nome}
                  </Link>
                  {!compacto && (
                    <span className="block text-[13px] text-suave">
                      {p.evento.nome} · {formatarPeriodo(p.evento.dataInicio, p.evento.dataFim)}
                    </span>
                  )}
                </span>
                <span className="flex flex-wrap gap-1">
                  {!compacto && <Etiqueta pilula>{rotulo(ROTULO_TIPO_INSCRICAO, p.tipoInscricao)}</Etiqueta>}
                  <Etiqueta pilula tom={p.presenca === "CANCELADA" ? "perigo" : p.presenca === "CONFIRMADA" ? "sucesso" : "neutro"}>
                    {p.presenca === "PENDENTE" ? rotulo(ROTULO_MODALIDADE, p.modalidade) : rotulo(ROTULO_PRESENCA, p.presenca)}
                  </Etiqueta>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
