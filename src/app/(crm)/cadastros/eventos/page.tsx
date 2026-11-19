import Link from "next/link";
import { buscarEventos, listarPublicosAlvo, listarSeries } from "@/modules/cadastros/servico";
import { contarPorEvento } from "@/modules/participantes/servico";
import { BotaoEvento } from "@/modules/cadastros/componentes/formularios";
import { eventoParaEdicao } from "@/modules/cadastros/componentes/visuais";
import { Busca } from "@/shared/ui/Busca";
import { AbasCadastros } from "@/modules/cadastros/componentes/AbasCadastros";
import { Etiqueta, Vazio } from "@/shared/ui/componentes";
import { chaveDataSP, formatarPeriodo, hojeSP } from "@/shared/datas";

type EventoLista = Awaited<ReturnType<typeof buscarEventos>>[number];

/** Eventos agrupados por série (COMSAÚDE, IATECH RH…): cada grupo mostra as edições, da mais recente para a mais antiga. */
export default async function PaginaEventos({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const [eventos, participantes, series, publicos] = await Promise.all([buscarEventos(q), contarPorEvento(), listarSeries(), listarPublicosAlvo()]);
  const sugestoes = { series: series.map((s) => s.nome), publicos: publicos.map((p) => p.nome) };
  const hoje = hojeSP();

  const grupos = new Map<string, { titulo: string; avulsos: boolean; eventos: EventoLista[] }>();
  for (const e of eventos) {
    const chave = e.serie?.id ?? "_avulsos";
    if (!grupos.has(chave)) grupos.set(chave, { titulo: e.serie?.nome ?? "Eventos sem série", avulsos: !e.serie, eventos: [] });
    grupos.get(chave)!.eventos.push(e);
  }
  const lista = [...grupos.values()]
    .map((g) => ({ ...g, eventos: [...g.eventos].sort((a, b) => b.dataInicio.getTime() - a.dataInicio.getTime()) }))
    .sort((a, b) => Number(a.avulsos) - Number(b.avulsos) || b.eventos[0].dataInicio.getTime() - a.eventos[0].dataInicio.getTime());

  return (
    <div>
      <AbasCadastros />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Busca valor={q} placeholder="Buscar evento ou série" rotulo="Buscar evento" />
        <BotaoEvento sugestoes={sugestoes} />
      </div>
      {lista.length === 0 ? (
        <Vazio>Nenhum evento encontrado.</Vazio>
      ) : (
        <div className="flex flex-col gap-5">
          {lista.map((g) => {
            const inscritos = g.eventos.reduce((s, e) => s + (participantes.get(e.id) ?? 0), 0);
            return (
              <section
                key={g.titulo}
                aria-label={g.avulsos ? g.titulo : `Série ${g.titulo}`}
                data-testid="serie-eventos"
                className="overflow-hidden rounded-2xl border border-borda bg-white shadow-[0_1px_2px_rgba(20,33,43,0.04)]"
              >
                <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-borda bg-[#F7F9FA] px-4 py-3">
                  <h2 className="font-titulo text-lg font-bold text-tinta">{g.titulo}</h2>
                  <p className="text-[13px] text-suave">
                    {g.eventos.length} {g.avulsos ? "evento(s)" : "edição(ões)"} · {inscritos} inscrito(s) no total
                  </p>
                </header>
                <ul>
                  {g.eventos.map((e) => {
                    const realizado = chaveDataSP(e.dataFim ?? e.dataInicio) < hoje;
                    return (
                      <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#EEF1F3] px-4 py-3 last:border-0">
                        <div className="min-w-0 flex-1 basis-64">
                          <div className="flex flex-wrap items-center gap-2">
                            {e.edicao && !g.avulsos && (
                              <span className="rounded-md bg-marinho px-2 py-0.5 font-titulo text-xs font-bold text-white">{e.edicao}</span>
                            )}
                            <Link href={`/cadastros/eventos/${e.id}`} className="font-semibold text-marca-700 hover:underline">
                              {e.nome}
                            </Link>
                            {realizado && <Etiqueta pilula>realizado</Etiqueta>}
                          </div>
                          <p className="mt-0.5 text-[13px] text-suave">{formatarPeriodo(e.dataInicio, e.dataFim)}</p>
                          {e.publicoAlvo.length > 0 && (
                            <ul className="mt-1.5 flex flex-wrap gap-1" aria-label={`Público-alvo de ${e.nome}`}>
                              {e.publicoAlvo.map((p) => (
                                <li key={p.publicoAlvoId}>
                                  <Etiqueta pilula tom="info">
                                    {p.publicoAlvo.nome}
                                  </Etiqueta>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <Link
                          href={`/cadastros/eventos/${e.id}`}
                          className="inline-flex min-h-10 items-center rounded-lg bg-marca-50 px-3 text-[13px] font-semibold text-marca-700 hover:bg-marca-100"
                        >
                          {participantes.get(e.id) ?? 0} inscrito(s) · ver lista
                        </Link>
                        <BotaoEvento evento={eventoParaEdicao(e)} sugestoes={sugestoes} />
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
