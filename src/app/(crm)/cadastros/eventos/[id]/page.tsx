import Link from "next/link";
import { notFound } from "next/navigation";
import { nomeCompleto } from "@/modules/cadastros/dominio";
import { edicoesDaSerie, listarPublicosAlvo, listarSeries, obterEvento } from "@/modules/cadastros/servico";
import { BotaoEvento } from "@/modules/cadastros/componentes/formularios";
import { eventoParaEdicao } from "@/modules/cadastros/componentes/visuais";
import { BotaoNovoParticipante } from "@/modules/participantes/componentes/formulario";
import { BotaoImportarPlanilha } from "@/modules/participantes/componentes/importar";
import { TabelaParticipantes } from "@/modules/participantes/componentes/tabela";
import {
  MODALIDADES,
  PRESENCAS,
  ROTULO_CANAL_CONFIRMACAO,
  ROTULO_MODALIDADE,
  ROTULO_PRESENCA,
  ROTULO_TIPO_INSCRICAO,
  TIPOS_INSCRICAO,
  resumoInscricao,
  rotulo,
} from "@/modules/participantes/dominio";
import { contarPorEvento, listarParticipantes, participacoesEmOutrasEdicoes, resumoDoEvento } from "@/modules/participantes/servico";
import { chaveDataSP, formatarData, formatarPeriodo, hojeSP } from "@/shared/datas";
import { formatarReais } from "@/shared/dinheiro";
import { formatarTelefone } from "@/shared/documentos";
import { cx, Etiqueta } from "@/shared/ui/componentes";
import { IconeVoltar } from "@/shared/ui/icones";
import { FiltrosUrl } from "@/shared/ui/interativos";

type Parametros = { q?: string; modalidade?: string; tipo?: string; presenca?: string; confirmacao?: string; recorrentes?: string };

function diasAte(hoje: string, data: Date) {
  const [a, m, d] = hoje.split("-").map(Number);
  const [a2, m2, d2] = chaveDataSP(data).split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a, m - 1, d)) / 86_400_000);
}

/** Participantes do evento: substitui a planilha de inscritos (cadastro, confirmação, presença, exportações). */
export default async function ParticipantesDoEvento({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Parametros> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const evento = await obterEvento(id);
  if (!evento) notFound();
  const [todos, resumo, edicoes, outrasEdicoes, inscritosPorEvento, series, publicos] = await Promise.all([
    listarParticipantes(id, { busca: sp.q, modalidade: sp.modalidade, tipo: sp.tipo, presenca: sp.presenca, confirmacao: sp.confirmacao }),
    resumoDoEvento(id),
    edicoesDaSerie(id),
    participacoesEmOutrasEdicoes(id),
    contarPorEvento(),
    listarSeries(),
    listarPublicosAlvo(),
  ]);
  const lista = sp.recorrentes ? todos.filter((p) => outrasEdicoes.has(p.contato.id)) : todos;
  const hoje = hojeSP();
  const faltam = diasAte(hoje, evento.dataInicio);
  const filtrando = !!(sp.q || sp.modalidade || sp.tipo || sp.presenca || sp.confirmacao || sp.recorrentes);
  const sugestoes = { series: series.map((s) => s.nome), publicos: publicos.map((p) => p.nome) };
  const qsSemRecorrentes = new URLSearchParams(Object.entries(sp).filter(([k, v]) => k !== "recorrentes" && v) as [string, string][]);
  const qsRecorrentes = new URLSearchParams(qsSemRecorrentes);
  qsRecorrentes.set("recorrentes", "1");

  const cartoes = [
    { rotulo: "Inscritos", valor: resumo.total, detalhe: resumo.cancelados ? `${resumo.cancelados} cancelado(s)` : "no evento" },
    { rotulo: "Presencial · Online", valor: `${resumo.presencial} · ${resumo.online}`, detalhe: resumo.hibrida ? `+ ${resumo.hibrida} híbrida(s)` : "participação" },
    { rotulo: "Cortesias · Pagantes", valor: `${resumo.cortesias} · ${resumo.pagantes}`, detalhe: "tipo de inscrição" },
    { rotulo: "Confirmação a enviar", valor: resumo.pendentesConfirmacao, detalhe: "ligação, WhatsApp ou e-mail", alerta: resumo.pendentesConfirmacao > 0 },
    { rotulo: "Presença confirmada", valor: resumo.presencaConfirmada, detalhe: `de ${resumo.total - resumo.cancelados} ativos` },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Link href="/cadastros/eventos" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-marca-700 hover:underline">
        <IconeVoltar tamanho={14} /> Eventos
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {evento.serie && (
            <p className="text-xs font-semibold uppercase tracking-wide text-marca-700">
              Série {evento.serie.nome}
              {evento.edicao ? ` · edição ${evento.edicao}` : ""}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-titulo text-[28px] font-bold tracking-tight">{evento.nome}</h1>
            <Etiqueta pilula tom={faltam < 0 ? "neutro" : "marca"}>
              {faltam > 0 ? `faltam ${faltam} dias` : faltam === 0 ? "acontece hoje" : "realizado"}
            </Etiqueta>
          </div>
          <p className="mt-1 text-sm text-suave">{formatarPeriodo(evento.dataInicio, evento.dataFim)} · Lista de participantes</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BotaoEvento evento={eventoParaEdicao(evento)} sugestoes={sugestoes} rotulo="Editar evento" />
          <BotaoImportarPlanilha eventoId={id} nomeEvento={evento.nome} />
          <BotaoNovoParticipante eventoId={id} />
        </div>
      </header>

      {(evento.descricao || evento.publicoAlvo.length > 0 || edicoes.length > 1) && (
        <section aria-label="Sobre o evento" className="grid gap-4 rounded-2xl border border-borda bg-white p-5 lg:grid-cols-[1fr_minmax(260px,360px)]">
          <div className="flex min-w-0 flex-col gap-3">
            {evento.descricao && <p className="whitespace-pre-line text-sm leading-relaxed text-tinta-2">{evento.descricao}</p>}
            {evento.publicoAlvo.length > 0 && (
              <div>
                <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-suave">Público-alvo</h2>
                <ul className="flex flex-wrap gap-1.5" aria-label="Público-alvo">
                  {evento.publicoAlvo.map((p) => (
                    <li key={p.publicoAlvoId}>
                      <Etiqueta pilula tom="info">
                        {p.publicoAlvo.nome}
                      </Etiqueta>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!evento.descricao && evento.publicoAlvo.length === 0 && (
              <p className="text-sm text-suave">Sem descrição nem público-alvo. Use “Editar evento” para preencher.</p>
            )}
          </div>
          {edicoes.length > 1 && (
            <nav aria-label="Edições da série" className="flex flex-col gap-2 lg:border-l lg:border-[#EEF1F3] lg:pl-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-suave">Edições de {evento.serie?.nome}</h2>
              <ul className="flex flex-col gap-1">
                {edicoes.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/cadastros/eventos/${e.id}`}
                      aria-current={e.id === id ? "page" : undefined}
                      className={cx(
                        "flex min-h-10 items-center justify-between gap-3 rounded-lg px-3 text-sm",
                        e.id === id ? "bg-marca-50 font-bold text-marca-700" : "font-semibold text-tinta hover:bg-[#F7F9FA]",
                      )}
                    >
                      <span>{e.nome}</span>
                      <span className="text-xs font-medium text-suave">{inscritosPorEvento.get(e.id) ?? 0} inscrito(s)</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {outrasEdicoes.size > 0 && (
                <p className="text-[13px] text-tinta-2" data-testid="recorrentes">
                  <strong>{outrasEdicoes.size}</strong> pessoa(s) desta lista também se inscreveram em outra edição.{" "}
                  <Link href={`/cadastros/eventos/${id}?${qsRecorrentes}`} className="font-semibold text-marca-700 hover:underline">
                    Ver só essas
                  </Link>
                </p>
              )}
            </nav>
          )}
        </section>
      )}

      <section aria-label="Resumo dos participantes" className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {cartoes.map((c) => (
          <div key={c.rotulo} className={cx("rounded-2xl border bg-white p-4", c.alerta ? "border-amber-200" : "border-borda")}>
            <p className="text-[13px] font-semibold text-tinta-2">{c.rotulo}</p>
            <p className={cx("mt-1 font-titulo text-2xl font-bold tabular-nums", c.alerta && "text-amber-800")} data-testid={`resumo-${c.rotulo}`}>
              {c.valor}
            </p>
            <p className="text-xs text-suave">{c.detalhe}</p>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <form role="search" className="flex min-w-[240px] flex-1 gap-2">
          {Object.entries(sp).map(([k, v]) => (k !== "q" && v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
          <input
            type="search"
            name="q"
            defaultValue={sp.q}
            aria-label="Buscar participante"
            placeholder="Buscar por nome, crachá, e-mail ou empresa"
            className="min-h-10 w-full rounded-[10px] border border-borda bg-white px-3 text-sm focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-100"
          />
        </form>
        <FiltrosUrl
          filtros={[
            { nome: "modalidade", rotulo: "Participação", opcoes: MODALIDADES.map((m) => ({ valor: m, rotulo: ROTULO_MODALIDADE[m] })) },
            { nome: "tipo", rotulo: "Inscrição", opcoes: TIPOS_INSCRICAO.map((t) => ({ valor: t, rotulo: ROTULO_TIPO_INSCRICAO[t] })) },
            { nome: "confirmacao", rotulo: "Confirmação", opcoes: [{ valor: "PENDENTE", rotulo: "A enviar" }, { valor: "ENVIADA", rotulo: "Enviada" }] },
            { nome: "presenca", rotulo: "Presença", opcoes: PRESENCAS.map((p) => ({ valor: p, rotulo: ROTULO_PRESENCA[p] })) },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-tinta-2" data-testid="total-participantes">
          {filtrando ? `${lista.length} de ${resumo.total} participante(s)` : `${resumo.total} participante(s)`}
          {sp.recorrentes && (
            <>
              {" "}
              · só quem esteve em outras edições{" "}
              <Link href={`/cadastros/eventos/${id}${qsSemRecorrentes.size ? `?${qsSemRecorrentes}` : ""}`} className="font-semibold text-marca-700 hover:underline">
                (mostrar todos)
              </Link>
            </>
          )}
          {filtrando && (
            <Link href={`/cadastros/eventos/${id}`} className="ml-2 font-semibold text-marca-700 hover:underline">
              Limpar filtros
            </Link>
          )}
        </p>
        <nav aria-label="Exportar" className="flex flex-wrap items-center gap-1.5 text-[13px]">
          <span className="text-suave">Exportar:</span>
          {[
            ["mailing", "Mailing"],
            ["crachas", "Crachás"],
            ["completa", "Lista completa"],
          ].map(([f, r]) => (
            <a
              key={f}
              href={`/api/eventos/${id}/participantes/${f}`}
              download
              className="rounded-lg border border-borda bg-white px-2.5 py-1.5 font-semibold text-tinta-2 hover:border-marca-200 hover:text-marca-700"
            >
              {r} (CSV)
            </a>
          ))}
        </nav>
      </div>

      <TabelaParticipantes
        eventoId={id}
        linhas={lista.map((p) => {
          const cel = p.contato.telefones.find((t) => ["CELULAR", "WHATSAPP"].includes(t.tipo)) ?? p.contato.telefones[0];
          return {
            id: p.id,
            nome: nomeCompleto(p.contato),
            contatoId: p.contato.id,
            empresa: p.contato.empresa?.nome ?? null,
            cargo: p.contato.cargo,
            email: p.contato.email,
            celular: cel ? formatarTelefone(cel.numero) : null,
            nomeCracha: p.nomeCracha,
            modalidade: p.modalidade,
            tipoInscricao: p.tipoInscricao,
            cortesiaConcedidaPor: p.cortesiaConcedidaPor,
            lote: p.lote,
            descontoPercentual: p.descontoPercentual,
            valorCentavos: p.valorCentavos,
            observacoes: p.observacoes,
            inscricaoResumo: resumoInscricao(p, p.valorCentavos ? formatarReais(p.valorCentavos) : null),
            confirmacao: p.confirmacaoEnviadaEm
              ? `${formatarData(p.confirmacaoEnviadaEm).slice(0, 5)}${p.confirmacaoCanal ? ` · ${rotulo(ROTULO_CANAL_CONFIRMACAO, p.confirmacaoCanal)}` : ""}`
              : null,
            presenca: p.presenca,
            outrasEdicoes: (outrasEdicoes.get(p.contato.id) ?? []).map((e) => ({ eventoId: e.eventoId, rotulo: e.edicao ? String(e.edicao) : e.nome })),
          };
        })}
      />
    </div>
  );
}
