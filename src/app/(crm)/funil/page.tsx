import Link from "next/link";
import { proximasTarefas } from "@/modules/agenda/servico";
import { classificarPrazo } from "@/modules/agenda/dominio";
import { nomeCompleto } from "@/modules/cadastros/dominio";
import { buscarEventos, listarResponsaveis } from "@/modules/cadastros/servico";
import {
  ETAPAS,
  estaAberta,
  ROTULO_ETAPA,
  ROTULO_TIPO_VENDA,
  TIPOS_VENDA,
  valorDeExibicao,
} from "@/modules/oportunidades/dominio";
import { listarOportunidades } from "@/modules/oportunidades/servico";
import { SeletorEtapa } from "@/modules/oportunidades/componentes/SeletorEtapa";
import { EtiquetaTipo } from "@/modules/oportunidades/componentes/visuais";
import { chaveDataSP, formatarData, hojeSP } from "@/shared/datas";
import { formatarReais } from "@/shared/dinheiro";
import { Avatar, CabecalhoPagina, cx, Etiqueta, LinkBotao } from "@/shared/ui/componentes";
import { IconeMais } from "@/shared/ui/icones";
import { FiltrosUrl } from "@/shared/ui/interativos";

type Filtros = { evento?: string; tipo?: string; responsavel?: string };

const COR_ETAPA: Record<string, string> = {
  NOVO: "#94A3B8",
  EM_ATENDIMENTO: "#5175D3",
  PROPOSTA_ENVIADA: "#2E4FAE",
  EM_NEGOCIACAO: "#D97706",
  FECHADO: "#15803D",
  PERDIDO: "#DC2626",
};

/** Funil: compõe Oportunidades (cartões) com Agenda (próxima tarefa pendente). */
export default async function Funil({ searchParams }: { searchParams: Promise<Filtros> }) {
  const f = await searchParams;
  const [oportunidades, eventos, responsaveis] = await Promise.all([
    listarOportunidades({ eventoId: f.evento, tipoVenda: f.tipo, responsavelId: f.responsavel }),
    buscarEventos(),
    listarResponsaveis(),
  ]);
  const proximas = await proximasTarefas(oportunidades.map((o) => o.id));
  const hoje = hojeSP();
  const abertas = oportunidades.filter((o) => estaAberta(o.etapa));
  const totalAberto = abertas.reduce((s, o) => s + o.valorEstimadoCentavos, 0);
  const totalFechado = oportunidades.filter((o) => o.etapa === "FECHADO").reduce((s, o) => s + (o.valorFinalCentavos ?? 0), 0);
  const colunas = ETAPAS.map((etapa) => {
    const cartoes = oportunidades.filter((o) => o.etapa === etapa);
    return { etapa, cartoes, soma: cartoes.reduce((s, o) => s + valorDeExibicao(o).valor, 0) };
  });
  const maxColuna = Math.max(1, ...colunas.map((c) => c.soma));

  return (
    <div>
      <CabecalhoPagina
        titulo="Funil comercial"
        descricao={`${oportunidades.length} oportunidades · ${formatarReais(totalAberto)} em aberto · ${formatarReais(totalFechado)} fechado`}
        acoes={
          <LinkBotao href="/oportunidades/nova">
            <IconeMais /> Nova oportunidade
          </LinkBotao>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <FiltrosUrl
          filtros={[
            { nome: "evento", rotulo: "Evento", opcoes: eventos.map((e) => ({ valor: e.id, rotulo: e.nome })) },
            { nome: "tipo", rotulo: "Tipo de venda", opcoes: TIPOS_VENDA.map((t) => ({ valor: t, rotulo: ROTULO_TIPO_VENDA[t] })) },
            { nome: "responsavel", rotulo: "Responsável", opcoes: responsaveis.map((r) => ({ valor: r.id, rotulo: r.nome })) },
          ]}
        />
        <span className="text-[13px] text-suave md:ml-auto">Mude a etapa pelo seletor no rodapé do cartão.</span>
      </div>

      <div className="relative -mx-4 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
        <div className="grid min-w-max auto-cols-[16.5rem] grid-flow-col gap-3.5 2xl:min-w-0 2xl:auto-cols-fr">
          {colunas.map(({ etapa, cartoes, soma }) => (
            <section
              key={etapa}
              aria-label={ROTULO_ETAPA[etapa]}
              data-etapa={etapa}
              className="flex min-h-[640px] flex-col gap-2.5 rounded-2xl bg-[#EBEFF5] p-3"
            >
              <header className="flex flex-col gap-2 px-1 pb-1.5 pt-1">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: COR_ETAPA[etapa] }} aria-hidden />
                  <h2 className="text-sm font-semibold">{ROTULO_ETAPA[etapa]}</h2>
                  <span className="rounded-full bg-white px-2 text-xs font-semibold text-tinta-2">{cartoes.length}</span>
                </div>
                <span className="text-[13px] font-semibold tabular-nums text-tinta-2">{formatarReais(soma)}</span>
                <span className="h-[3px] rounded-full bg-[#D8DEE7]">
                  <span
                    className="block h-full rounded-full"
                    style={{ background: COR_ETAPA[etapa], width: `${soma ? Math.max(3, Math.round((soma / maxColuna) * 100)) : 0}%` }}
                  />
                </span>
              </header>
              <ul className="flex flex-col gap-2.5">
                {cartoes.map((o) => {
                  const proxima = proximas.get(o.id);
                  const valor = valorDeExibicao(o);
                  const grupo = proxima ? classificarPrazo(chaveDataSP(proxima.prazo), hoje) : null;
                  const cliente = o.empresa ? `${o.empresa.nome} · ${nomeCompleto(o.contato)}` : `${nomeCompleto(o.contato)} · pessoa física`;
                  let rodape: { rotulo: string; texto: string; tom: string };
                  if (o.etapa === "FECHADO") {
                    rodape = {
                      rotulo: o.statusPagamento === "PAGO" ? "Pagamento recebido" : "Pagamento pendente",
                      texto: o.fechadoEm ? `Fechado em ${formatarData(o.fechadoEm)}` : "Venda fechada",
                      tom: o.statusPagamento === "PAGO" ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900",
                    };
                  } else if (o.etapa === "PERDIDO") {
                    rodape = { rotulo: "Motivo", texto: o.motivoPerda ?? "—", tom: "bg-[#F1F4F6] text-tinta-2" };
                  } else if (proxima) {
                    rodape = {
                      rotulo: grupo === "ATRASADA" ? `Atrasada · ${formatarData(proxima.prazo)}` : grupo === "HOJE" ? "Hoje" : `Próxima · ${formatarData(proxima.prazo)}`,
                      texto: proxima.descricao,
                      tom: grupo === "ATRASADA" ? "bg-red-50 text-red-800" : grupo === "HOJE" ? "bg-amber-50 text-amber-900" : "bg-[#F7F9FA] text-tinta-2",
                    };
                  } else {
                    rodape = { rotulo: "Sem próxima ação", texto: "Agende um retorno para não perder o contato.", tom: "bg-rose-50 text-rose-800" };
                  }
                  return (
                    <li
                      key={o.id}
                      data-testid="cartao-oportunidade"
                      className="flex flex-col gap-2.5 rounded-xl border border-[#E3E8EC] bg-white p-3.5 shadow-[0_1px_2px_rgba(20,33,43,0.05)]"
                    >
                      <div className="flex flex-wrap gap-1.5">
                        <EtiquetaTipo tipo={o.tipoVenda} />
                        <Etiqueta>{o.evento.nome}</Etiqueta>
                      </div>
                      <Link href={`/oportunidades/${o.id}`} className="font-semibold leading-snug text-tinta hover:text-marca-700">
                        {o.titulo}
                      </Link>
                      <p className="-mt-1 text-[13px] text-suave">{cliente}</p>
                      <div className="flex items-center justify-between">
                        <span className="font-titulo text-base font-bold tabular-nums" title={valor.rotulo}>
                          {formatarReais(valor.valor)}
                        </span>
                        <span title={o.responsavel.nome}>
                          <Avatar nome={o.responsavel.nome} tamanho="p" />
                        </span>
                      </div>
                      <div className={cx("flex flex-col gap-0.5 rounded-lg px-2.5 py-2 text-xs", rodape.tom)}>
                        <span className="font-semibold">{rodape.rotulo}</span>
                        <span>{rodape.texto}</span>
                      </div>
                      <SeletorEtapa
                        compacto
                        oportunidadeId={o.id}
                        titulo={o.titulo}
                        etapaAtual={o.etapa}
                        valorEstimadoCentavos={o.valorEstimadoCentavos}
                      />
                    </li>
                  );
                })}
                {cartoes.length === 0 && <li className="px-1 py-6 text-center text-xs text-suave">Nenhuma oportunidade.</li>}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
