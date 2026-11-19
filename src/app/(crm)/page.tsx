import Link from "next/link";
import { chaveDataSP, formatarData, formatarDataHora, hojeSP, formatarPeriodo } from "@/shared/datas";
import { classificarPrazo } from "@/modules/agenda/dominio";
import { nomeCompleto } from "@/modules/cadastros/dominio";
import { buscarEventos } from "@/modules/cadastros/servico";
import { ROTULO_ETAPA, TIPOS_VENDA } from "@/modules/oportunidades/dominio";
import { detalhesDoPainel, indicadoresComerciais } from "@/modules/painel/servico";
import { formatarReais } from "@/shared/dinheiro";
import { Avatar, CabecalhoPagina, Cartao, cx, Etiqueta, TituloSecao, Vazio } from "@/shared/ui/componentes";
import { IconeAlerta, IconeCheck, IconeDinheiro, IconeFunil, IconeSeta } from "@/shared/ui/icones";
import { MenuFiltro } from "@/shared/ui/MenuFiltro";
import { Pilulas } from "@/shared/ui/Pilulas";

const COR_ETAPA: Record<string, string> = {
  NOVO: "#94A3B8",
  EM_ATENDIMENTO: "#5175D3",
  PROPOSTA_ENVIADA: "#2E4FAE",
  EM_NEGOCIACAO: "#D97706",
  FECHADO: "#15803D",
  PERDIDO: "#DC2626",
};

const DIAS_SEMANA = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function dataPorExtenso(chave: string) {
  const [a, m, d] = chave.split("-").map(Number);
  const dia = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return `${DIAS_SEMANA[dia]}, ${d} de ${MESES[m - 1]} de ${a}`;
}

function diasAte(chaveHoje: string, data: Date) {
  const [a, m, d] = chaveHoje.split("-").map(Number);
  const [a2, m2, d2] = chaveDataSP(data).split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a, m - 1, d)) / 86_400_000);
}

function Indicador({
  rotulo,
  valor,
  detalhe,
  icone,
  tom,
  href,
}: {
  rotulo: string;
  valor: string;
  detalhe: string;
  icone: React.ReactNode;
  tom: "marca" | "info" | "perigo" | "sucesso";
  href: string;
}) {
  const fundo = { marca: "bg-marca-50 text-marca-700", info: "bg-blue-100 text-blue-800", perigo: "bg-red-100 text-red-800", sucesso: "bg-green-100 text-green-800" }[tom];
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-2xl border border-borda bg-white p-5 shadow-[0_1px_2px_rgba(20,33,43,0.04)] transition-shadow hover:shadow-md"
    >
      <span className="flex items-center justify-between">
        <span className="font-semibold text-tinta-2">{rotulo}</span>
        <span className={cx("flex h-9 w-9 items-center justify-center rounded-[10px]", fundo)}>{icone}</span>
      </span>
      <span
        className={cx("font-titulo text-[30px] font-bold leading-none tracking-tight tabular-nums", tom === "perigo" && valor !== "0" ? "text-red-700" : "text-tinta")}
        data-testid={`indicador-${rotulo}`}
      >
        {valor}
      </span>
      <span className="text-[13px] text-suave group-hover:text-marca-700">{detalhe}</span>
    </Link>
  );
}

/** Painel Comercial: indicadores e blocos compostos a partir de Oportunidades, Agenda, Histórico e Cadastros. */
export default async function Painel({ searchParams }: { searchParams: Promise<{ evento?: string; tipo?: string }> }) {
  const f = await searchParams;
  const filtros = { eventoId: f.evento, tipoVenda: f.tipo };
  const [ind, det, todosEventos] = await Promise.all([
    indicadoresComerciais(filtros),
    detalhesDoPainel(filtros),
    buscarEventos(),
  ]);
  const hoje = hojeSP();
  const qs = new URLSearchParams();
  if (f.evento) qs.set("evento", f.evento);
  if (f.tipo) qs.set("tipo", f.tipo);
  const funil = `/funil${qs.size ? `?${qs}` : ""}`;
  const maxEtapa = Math.max(1, ...det.porEtapa.map((e) => e.valorCentavos));
  const atrasadoMaisAntigo = det.retornos.find((t) => classificarPrazo(chaveDataSP(t.prazo), hoje) === "ATRASADA");
  // Sem filtro: só os próximos 3 eventos (a agenda anual tem 10 a 12). Com filtro: só o escolhido.
  const futuros = det.eventos.filter((e) => chaveDataSP(e.dataFim ?? e.dataInicio) >= hoje);
  const eventosFuturos = futuros.length;
  const eventosVisiveis = f.evento ? det.eventos : futuros.slice(0, 3);

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoPagina sobretitulo={dataPorExtenso(hoje)} titulo="Painel comercial" descricao="Os filtros se aplicam a todos os indicadores." />

      <div className="-mt-2 flex flex-wrap items-center gap-3">
        <MenuFiltro
          rotulo="Evento"
          nome="evento"
          caminho="/"
          parametros={f}
          valorAtual={f.evento}
          rotuloTodos="Todos os eventos"
          grupos={[
            {
              titulo: "Próximos",
              opcoes: todosEventos
                .filter((e) => chaveDataSP(e.dataFim ?? e.dataInicio) >= hoje)
                .map((e) => ({ valor: e.id, rotulo: e.nome, detalhe: formatarPeriodo(e.dataInicio, e.dataFim) })),
            },
            {
              titulo: "Já realizados",
              opcoes: todosEventos
                .filter((e) => chaveDataSP(e.dataFim ?? e.dataInicio) < hoje)
                .reverse()
                .map((e) => ({ valor: e.id, rotulo: e.nome, detalhe: formatarPeriodo(e.dataInicio, e.dataFim) })),
            },
          ]}
        />
        <span className="hidden h-6 w-px bg-[#D5DCE1] sm:block" aria-hidden />
        <Pilulas
          rotulo="Filtrar por tipo de venda"
          nome="tipo"
          caminho="/"
          parametros={f}
          valorAtual={f.tipo}
          escuro
          opcoes={[
            { valor: "", rotulo: "Inscrições e patrocínios" },
            ...TIPOS_VENDA.map((t) => ({ valor: t, rotulo: t === "INSCRICAO" ? "Inscrições" : "Patrocínios" })),
          ]}
        />
      </div>

      <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador
          rotulo="Oportunidades abertas"
          valor={String(ind.oportunidadesAbertas)}
          detalhe={`${formatarReais(det.valorAbertoCentavos)} em pipeline estimado`}
          icone={<IconeFunil />}
          tom="marca"
          href={funil}
        />
        <Indicador
          rotulo="Propostas enviadas"
          valor={String(ind.propostasEnviadas)}
          detalhe={`${formatarReais(det.valorPropostasCentavos)} aguardando resposta`}
          icone={<IconeSeta />}
          tom="info"
          href={funil}
        />
        <Indicador
          rotulo="Retornos atrasados"
          valor={String(ind.retornosAtrasados)}
          detalhe={
            ind.retornosAtrasados > 0 && atrasadoMaisAntigo
              ? `Mais antigo: ${formatarData(atrasadoMaisAntigo.prazo)}`
              : "Nenhum retorno vencido"
          }
          icone={<IconeAlerta />}
          tom="perigo"
          href="/agenda"
        />
        <Indicador
          rotulo="Vendas fechadas"
          valor={formatarReais(ind.vendasFechadas.totalCentavos)}
          detalhe={`${ind.vendasFechadas.quantidade} ${ind.vendasFechadas.quantidade === 1 ? "venda fechada" : "vendas fechadas"} · ${det.pagamentosPendentes.quantidade} com pagamento pendente`}
          icone={<IconeDinheiro />}
          tom="sucesso"
          href={funil}
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Cartao>
          <TituloSecao
            acao={
              <Link href={funil} className="text-[13px] font-semibold text-marca-700 hover:underline">
                Abrir funil →
              </Link>
            }
          >
            Pipeline por etapa
          </TituloSecao>
          <ul className="flex flex-col gap-3.5">
            {det.porEtapa.map((e) => (
              <li key={e.etapa} className="grid grid-cols-[130px_1fr_110px] items-center gap-3 sm:grid-cols-[150px_1fr_120px]">
                <span className="text-[13px] text-tinta-2">
                  {ROTULO_ETAPA[e.etapa]} <span className="text-suave">· {e.quantidade}</span>
                </span>
                <span className="h-2.5 overflow-hidden rounded-full bg-[#F1F4F6]">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      background: COR_ETAPA[e.etapa],
                      width: `${e.valorCentavos ? Math.max(4, Math.round((e.valorCentavos / maxEtapa) * 100)) : 0}%`,
                    }}
                  />
                </span>
                <span className="text-right text-[13px] font-semibold tabular-nums">{formatarReais(e.valorCentavos)}</span>
              </li>
            ))}
          </ul>
        </Cartao>

        <Cartao>
          <TituloSecao
            acao={
              <Link href="/cadastros/eventos" className="text-[13px] font-semibold text-marca-700 hover:underline">
                Todos os eventos →
              </Link>
            }
          >
            {f.evento ? "Evento selecionado" : "Próximos eventos"}
          </TituloSecao>
          {eventosVisiveis.length === 0 ? (
            <Vazio>{f.evento ? "Evento não encontrado." : "Nenhum evento futuro cadastrado."}</Vazio>
          ) : (
            <ul className="flex flex-col gap-3">
              {eventosVisiveis.map((ev) => {
                const faltam = diasAte(hoje, ev.dataInicio);
                const filtrar = new URLSearchParams({ evento: ev.id, ...(f.tipo ? { tipo: f.tipo } : {}) });
                return (
                  <li key={ev.id}>
                    <Link
                      href={`/?${filtrar}`}
                      scroll={false}
                      aria-label={f.evento ? undefined : `Ver painel de ${ev.nome}`}
                      className={cx(
                        "flex flex-col gap-3 rounded-xl border border-borda p-4",
                        !f.evento && "transition-colors hover:border-marca-200 hover:bg-[#FAFBFE]",
                      )}
                    >
                    <div className="flex flex-wrap justify-between gap-2">
                      <div>
                        <p className="font-semibold">{ev.nome}</p>
                        <p className="text-[13px] text-suave">{formatarPeriodo(ev.dataInicio, ev.dataFim)}</p>
                      </div>
                      <Etiqueta tom={faltam < 0 ? "neutro" : "marca"} pilula className="self-start">
                        {faltam > 0 ? `faltam ${faltam} dias` : faltam === 0 ? "acontece hoje" : "realizado"}
                      </Etiqueta>
                    </div>
                    <dl className="grid grid-cols-3 gap-2">
                      <div>
                        <dt className="text-xs text-suave">Abertas</dt>
                        <dd className="font-semibold">{ev.abertas}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-suave">Em pipeline</dt>
                        <dd className="font-semibold tabular-nums">{formatarReais(ev.abertoCentavos)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-suave">Fechado</dt>
                        <dd className="font-semibold tabular-nums text-green-800">{formatarReais(ev.fechadoCentavos)}</dd>
                      </div>
                    </dl>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {!f.evento && eventosFuturos > eventosVisiveis.length && (
            <p className="mt-3 text-[13px] text-suave">
              + {eventosFuturos - eventosVisiveis.length} evento(s) futuro(s). Use o filtro Evento para ver cada um.
            </p>
          )}
        </Cartao>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Cartao>
          <TituloSecao
            acao={
              <Link href="/agenda" className="text-[13px] font-semibold text-marca-700 hover:underline">
                Ver agenda →
              </Link>
            }
          >
            Próximos retornos
          </TituloSecao>
          {det.retornos.length === 0 ? (
            <Vazio>Nenhum retorno pendente.</Vazio>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {det.retornos.map((t) => {
                const grupo = classificarPrazo(chaveDataSP(t.prazo), hoje);
                const href = t.oportunidade ? `/oportunidades/${t.oportunidade.id}` : t.contato ? `/cadastros/contatos/${t.contato.id}?aba=calendario` : "/agenda";
                const contexto = t.oportunidade ? t.oportunidade.titulo : t.contato ? nomeCompleto(t.contato) : "";
                return (
                  <li key={t.id}>
                    <Link href={href} className="flex items-center gap-3.5 rounded-xl border border-[#EEF1F3] bg-[#FAFBFC] p-3 hover:border-marca-200">
                      <span
                        className={cx(
                          "h-2.5 w-2.5 shrink-0 rounded-full",
                          grupo === "ATRASADA" ? "bg-red-600" : grupo === "HOJE" ? "bg-amber-600" : "bg-slate-400",
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-tinta">{t.descricao}</span>
                        <span className="block text-[13px] text-suave">
                          {contexto} · {t.responsavel.nome}
                        </span>
                      </span>
                      <Etiqueta pilula tom={grupo === "ATRASADA" ? "perigo" : grupo === "HOJE" ? "alerta" : "neutro"}>
                        {grupo === "ATRASADA" ? `Atrasada · ${formatarData(t.prazo).slice(0, 5)}` : grupo === "HOJE" ? "Hoje" : formatarData(t.prazo).slice(0, 5)}
                      </Etiqueta>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Cartao>

        <Cartao>
          <TituloSecao>Atividade recente</TituloSecao>
          {det.atividades.length === 0 ? (
            <Vazio>Nenhuma atividade registrada.</Vazio>
          ) : (
            <ol className="flex flex-col gap-4">
              {det.atividades.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <Avatar nome={a.oportunidade.responsavel.nome} tamanho="p" className="mt-0.5 h-8! w-8!" />
                  <div className="min-w-0">
                    <p className="text-tinta">
                      <Link href={`/oportunidades/${a.oportunidade.id}`} className="font-semibold hover:text-marca-700">
                        {a.oportunidade.titulo}
                      </Link>{" "}
                      <span className="text-tinta-2">· {a.tipo === "INTERACAO" ? (a.resumo ?? a.descricao) : a.descricao}</span>
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-suave">
                      {a.tipo === "INTERACAO" ? <IconeCheck tamanho={12} /> : null}
                      {formatarDataHora(a.data)} · {a.oportunidade.responsavel.nome}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Cartao>
      </div>
    </div>
  );
}

