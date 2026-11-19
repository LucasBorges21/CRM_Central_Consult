import Link from "next/link";
import { filaDeRetornos } from "@/modules/agenda/servico";
import { ItemTarefa } from "@/modules/agenda/componentes/tarefas";
import type { GrupoPrazo } from "@/modules/agenda/dominio";
import { nomeCompleto } from "@/modules/cadastros/dominio";
import { listarResponsaveis } from "@/modules/cadastros/servico";
import { chaveDataSP, formatarData, hojeSP, inicioDoDiaSP } from "@/shared/datas";
import { Avatar, CabecalhoPagina, Cartao, cx, TituloSecao, Vazio } from "@/shared/ui/componentes";

const GRUPOS: { chave: GrupoPrazo; titulo: string; cor: string }[] = [
  { chave: "ATRASADA", titulo: "Atrasadas", cor: "text-red-700" },
  { chave: "HOJE", titulo: "Hoje", cor: "text-amber-800" },
  { chave: "FUTURA", titulo: "Próximos dias", cor: "text-tinta" },
];

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function mesValido(m?: string) {
  return m && /^\d{4}-\d{2}$/.test(m) ? m : null;
}
function deslocarMes(mes: string, n: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Fila de retornos: tarefas pendentes de oportunidades abertas e dos contatos, no fuso de São Paulo. */
export default async function Agenda({ searchParams }: { searchParams: Promise<{ responsavel?: string; mes?: string }> }) {
  const sp = await searchParams;
  const [todas, responsaveis] = await Promise.all([filaDeRetornos({}), listarResponsaveis()]);
  const hoje = hojeSP();
  const doResp = <T extends { responsavelId: string }>(l: T[]) => (sp.responsavel ? l.filter((t) => t.responsavelId === sp.responsavel) : l);
  const fila = { ATRASADA: doResp(todas.ATRASADA), HOJE: doResp(todas.HOJE), FUTURA: doResp(todas.FUTURA) };
  const pendentes = [...fila.ATRASADA, ...fila.HOJE, ...fila.FUTURA];
  const totalPorResp = new Map<string, number>();
  for (const t of [...todas.ATRASADA, ...todas.HOJE, ...todas.FUTURA]) totalPorResp.set(t.responsavelId, (totalPorResp.get(t.responsavelId) ?? 0) + 1);

  // Calendário do mês
  const mes = mesValido(sp.mes) ?? hoje.slice(0, 7);
  const [ano, mesNum] = mes.split("-").map(Number);
  const primeiroDiaSemana = new Date(Date.UTC(ano, mesNum - 1, 1)).getUTCDay();
  const diasNoMes = new Date(Date.UTC(ano, mesNum, 0)).getUTCDate();
  const marcados = new Map<string, "atrasada" | "tarefa">();
  for (const t of pendentes) {
    const chave = chaveDataSP(t.prazo);
    if (fila.ATRASADA.includes(t)) marcados.set(chave, "atrasada");
    else if (!marcados.has(chave)) marcados.set(chave, "tarefa");
  }
  const celulas: ({ dia: number; chave: string } | null)[] = [
    ...Array.from({ length: primeiroDiaSemana }, () => null),
    ...Array.from({ length: diasNoMes }, (_, i) => ({ dia: i + 1, chave: `${mes}-${String(i + 1).padStart(2, "0")}` })),
  ];
  const linkMes = (m: string) => {
    const qs = new URLSearchParams();
    if (sp.responsavel) qs.set("responsavel", sp.responsavel);
    qs.set("mes", m);
    return `/agenda?${qs}`;
  };
  const linkResp = (id?: string) => {
    const qs = new URLSearchParams();
    if (id) qs.set("responsavel", id);
    if (sp.mes) qs.set("mes", sp.mes);
    return `/agenda${qs.size ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <CabecalhoPagina
        titulo="Agenda de retornos"
        descricao={`Hoje é ${formatarData(inicioDoDiaSP(hoje))} · horário de São Paulo. Tarefas de oportunidades fechadas ou perdidas não aparecem aqui.`}
      />

      <div className="flex flex-wrap items-start gap-5">
        <div className="flex w-full flex-col gap-4 lg:w-[320px] lg:shrink-0">
          <Cartao>
            <div className="mb-3 flex items-center justify-between">
              <Link
                href={linkMes(deslocarMes(mes, -1))}
                aria-label="Mês anterior"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-borda hover:bg-[#F4F6FB]"
              >
                ‹
              </Link>
              <h2 className="text-[15px] font-semibold">
                {MESES[mesNum - 1]} de {ano}
              </h2>
              <Link
                href={linkMes(deslocarMes(mes, 1))}
                aria-label="Próximo mês"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-borda hover:bg-[#F4F6FB]"
              >
                ›
              </Link>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center" aria-label={`Calendário de ${MESES[mesNum - 1]}`}>
              {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                <span key={i} className="pb-1 text-[11px] font-semibold text-suave" aria-hidden>
                  {d}
                </span>
              ))}
              {celulas.map((c, i) =>
                c ? (
                  <span
                    key={c.chave}
                    className={cx(
                      "relative flex h-9 items-center justify-center rounded-lg text-[13px] tabular-nums",
                      c.chave === hoje ? "bg-marca-600 font-bold text-white" : "text-tinta",
                    )}
                  >
                    {c.dia}
                    {marcados.has(c.chave) && (
                      <span
                        className={cx(
                          "absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full",
                          c.chave === hoje ? "bg-white" : marcados.get(c.chave) === "atrasada" ? "bg-red-600" : "bg-marca-600",
                        )}
                        aria-hidden
                      />
                    )}
                  </span>
                ) : (
                  <span key={`v${i}`} aria-hidden />
                ),
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-suave">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-600" aria-hidden /> Atrasada
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-marca-600" aria-hidden /> Com tarefa
              </span>
            </div>
          </Cartao>

          <Cartao>
            <TituloSecao>Responsável</TituloSecao>
            <nav aria-label="Responsável" className="flex flex-col gap-1">
              {[{ id: "", nome: "Todos" }, ...responsaveis].map((r) => {
                const ativo = (sp.responsavel ?? "") === r.id;
                const qtd = r.id ? (totalPorResp.get(r.id) ?? 0) : [...totalPorResp.values()].reduce((a, b) => a + b, 0);
                return (
                  <Link
                    key={r.id || "todos"}
                    href={linkResp(r.id || undefined)}
                    aria-current={ativo ? "true" : undefined}
                    className={cx(
                      "flex min-h-10 items-center gap-2.5 rounded-lg px-2",
                      ativo ? "bg-marca-50 font-semibold text-marca-700" : "text-tinta-2 hover:bg-[#F4F6FB]",
                    )}
                  >
                    {r.id ? <Avatar nome={r.nome} tamanho="p" /> : <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F1F4F6] text-xs font-bold">·</span>}
                    <span className="flex-1">{r.nome}</span>
                    <span className="text-xs text-suave">{qtd}</span>
                  </Link>
                );
              })}
            </nav>
          </Cartao>
        </div>

        <div className="flex min-w-0 flex-1 basis-[480px] flex-col gap-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-[14px] border border-red-200 bg-white p-4">
              <p className="text-[13px] font-semibold text-red-800">Atrasadas</p>
              <p className="mt-1 font-titulo text-[26px] font-bold text-red-700">{fila.ATRASADA.length}</p>
            </div>
            <div className="rounded-[14px] border border-amber-200 bg-white p-4">
              <p className="text-[13px] font-semibold text-amber-800">Hoje</p>
              <p className="mt-1 font-titulo text-[26px] font-bold">{fila.HOJE.length}</p>
            </div>
            <div className="rounded-[14px] border border-borda bg-white p-4">
              <p className="text-[13px] font-semibold text-tinta-2">Próximas</p>
              <p className="mt-1 font-titulo text-[26px] font-bold">{fila.FUTURA.length}</p>
            </div>
          </div>

          {GRUPOS.map((g) => (
            <section key={g.chave} aria-labelledby={`grupo-${g.chave}`} data-grupo={g.chave} className="flex flex-col gap-2.5">
              <h2 id={`grupo-${g.chave}`} className={cx("text-[15px] font-bold", g.cor)}>
                {g.titulo} <span className="font-medium text-suave">· {fila[g.chave].length}</span>
              </h2>
              {fila[g.chave].length === 0 ? (
                <Vazio>Nenhuma tarefa.</Vazio>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {fila[g.chave].map((t) => (
                    <ItemTarefa
                      key={t.id}
                      hoje={hoje}
                      responsaveis={responsaveis}
                      tarefa={{
                        id: t.id,
                        descricao: t.descricao,
                        prazoChave: chaveDataSP(t.prazo),
                        responsavelId: t.responsavelId,
                        responsavelNome: t.responsavel.nome,
                        grupo: g.chave,
                        exigeDecisao: t.ultimaPendente,
                        oportunidade: t.oportunidade
                          ? {
                              id: t.oportunidade.id,
                              titulo: t.oportunidade.titulo,
                              evento: t.oportunidade.evento.nome,
                              cliente: t.oportunidade.empresa?.nome ?? nomeCompleto(t.oportunidade.contato),
                            }
                          : undefined,
                        contato: t.contato ? { id: t.contato.id, nome: nomeCompleto(t.contato), empresa: t.contato.empresa?.nome } : undefined,
                      }}
                    />
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
