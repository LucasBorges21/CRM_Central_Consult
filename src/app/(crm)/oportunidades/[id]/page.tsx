import Link from "next/link";
import { notFound } from "next/navigation";
import { tarefasDaOportunidade } from "@/modules/agenda/servico";
import { classificarPrazo } from "@/modules/agenda/dominio";
import { FormNovaTarefa, ItemTarefa } from "@/modules/agenda/componentes/tarefas";
import { nomeCompleto, ROTULO_PORTE, ROTULO_RAMO, type Porte, type Ramo } from "@/modules/cadastros/dominio";
import { buscarEventos, contatosParaOportunidade, listarResponsaveis } from "@/modules/cadastros/servico";
import { IconeLinkedin, rotuloTipoTelefone } from "@/modules/cadastros/componentes/visuais";
import { linhaDoTempo } from "@/modules/historico/servico";
import { FormInteracao } from "@/modules/historico/componentes/FormInteracao";
import { LinhaDoTempo } from "@/modules/historico/componentes/LinhaDoTempo";
import { ETAPAS_ABERTAS, estaAberta, type Etapa } from "@/modules/oportunidades/dominio";
import { listarOportunidadesDaEmpresa, obterOportunidade } from "@/modules/oportunidades/servico";
import { EdicaoOportunidade } from "@/modules/oportunidades/componentes/EdicaoOportunidade";
import { FormPagamento } from "@/modules/oportunidades/componentes/FormPagamento";
import { SeletorEtapa } from "@/modules/oportunidades/componentes/SeletorEtapa";
import {
  EtiquetaEtapa,
  EtiquetaPagamento,
  EtiquetaSemProximaAcao,
  EtiquetaTipo,
} from "@/modules/oportunidades/componentes/visuais";
import { chaveDataSP, formatarData, formatarDataHora, formatarPeriodo, hojeSP } from "@/shared/datas";
import { formatarReais } from "@/shared/dinheiro";
import { formatarCnpj, formatarTelefone, somenteDigitos } from "@/shared/documentos";
import { Avatar, Cartao, cx, Dado, DadoLinha, Etiqueta, TituloSecao } from "@/shared/ui/componentes";
import { IconeAlerta, IconeEmail, IconeMensagem, IconeTelefone, IconeVoltar } from "@/shared/ui/icones";

function diasEntre(inicio: Date, fimChave: string) {
  const [a, m, d] = chaveDataSP(inicio).split("-").map(Number);
  const [a2, m2, d2] = fimChave.split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a, m - 1, d)) / 86_400_000);
}

const FILTROS_LINHA = [
  { valor: "", rotulo: "Tudo" },
  { valor: "interacoes", rotulo: "Interações" },
  { valor: "etapas", rotulo: "Etapas" },
];

const botaoContato =
  "inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-[#D5DCE1] bg-white px-2 text-[13px] font-semibold text-tinta hover:bg-[#F7F9FA]";

/**
 * Detalhe da oportunidade: tela de composição.
 * Lê Oportunidades, Agenda, Histórico e Cadastros; as gravações vão pelas ações de cada módulo ou fluxo.
 */
export default async function DetalheOportunidade({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ linha?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const o = await obterOportunidade(id);
  if (!o) notFound();

  const [tarefas, registros, responsaveis, eventos, contatos, daEmpresa] = await Promise.all([
    tarefasDaOportunidade(id),
    linhaDoTempo(id),
    listarResponsaveis(),
    buscarEventos(),
    contatosParaOportunidade(o.empresaId),
    o.empresaId ? listarOportunidadesDaEmpresa(o.empresaId) : Promise.resolve([]),
  ]);
  const hoje = hojeSP();
  const aberta = estaAberta(o.etapa);
  const semProximaAcao = aberta && tarefas.pendentes.length === 0;
  const proxima = tarefas.pendentes[0];
  const outrosNegocios = daEmpresa.filter((x) => x.id !== o.id);

  // Datas de entrada em cada etapa (o registro mais recente de cada uma)
  const entradaEtapa = new Map<string, Date>();
  for (const r of registros) if (r.tipo === "MUDANCA_ETAPA" && r.etapaNova && !entradaEtapa.has(r.etapaNova)) entradaEtapa.set(r.etapaNova, r.data);
  const infoEtapas: Partial<Record<Etapa, string>> = {};
  for (const e of ETAPAS_ABERTAS) {
    const d = entradaEtapa.get(e);
    if (d) infoEtapas[e] = e === o.etapa ? `desde ${formatarData(d).slice(0, 5)}` : formatarData(d).slice(0, 5);
  }
  const desdeEtapaAtual = entradaEtapa.get(o.etapa) ?? o.criadoEm;
  const diasNaEtapa = diasEntre(desdeEtapaAtual, hoje);
  const idade = diasEntre(o.criadoEm, hoje);
  const faltamEvento = diasEntre(new Date(), chaveDataSP(o.evento.dataInicio));

  const filtroLinha = sp.linha === "interacoes" || sp.linha === "etapas" ? sp.linha : "";
  const registrosFiltrados = registros.filter((r) =>
    filtroLinha === "interacoes" ? r.tipo === "INTERACAO" : filtroLinha === "etapas" ? r.tipo === "MUDANCA_ETAPA" : true,
  );
  const contatoNome = nomeCompleto(o.contato);
  const telWhats = o.contato.telefones.find((t) => t.tipo === "WHATSAPP") ?? o.contato.telefones.find((t) => t.tipo === "CELULAR");
  const telPrincipal = o.contato.telefones[0];

  const metricas = [
    o.etapa === "FECHADO"
      ? { rotulo: "Valor final", valor: formatarReais(o.valorFinalCentavos), destaque: true }
      : { rotulo: "Valor estimado", valor: formatarReais(o.valorEstimadoCentavos), destaque: true },
    { rotulo: "Dias na etapa", valor: `${diasNaEtapa} ${diasNaEtapa === 1 ? "dia" : "dias"}` },
    { rotulo: "Idade do negócio", valor: `${idade} ${idade === 1 ? "dia" : "dias"}` },
    {
      rotulo: "Evento",
      valor: faltamEvento > 0 ? `faltam ${faltamEvento} dias` : faltamEvento === 0 ? "acontece hoje" : "já realizado",
    },
    {
      rotulo: "Pagamento",
      valor: o.etapa === "FECHADO" ? (o.statusPagamento === "PAGO" ? "Pago" : "Pendente") : "—",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Link href="/funil" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-marca-700 hover:underline">
        <IconeVoltar tamanho={14} /> Funil
      </Link>

      <section className="flex flex-col gap-5 rounded-[20px] border border-borda bg-white px-7 py-6 shadow-[0_1px_2px_rgba(20,33,43,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap gap-1.5">
              <EtiquetaTipo tipo={o.tipoVenda} />
              <Etiqueta>
                {o.evento.nome} · {formatarPeriodo(o.evento.dataInicio, o.evento.dataFim)}
              </Etiqueta>
              <EtiquetaEtapa etapa={o.etapa} />
              <EtiquetaPagamento status={o.statusPagamento} />
              {semProximaAcao && <EtiquetaSemProximaAcao />}
            </div>
            <h1 className="font-titulo text-[26px] font-bold tracking-tight">{o.titulo}</h1>
            <p className="text-tinta-2">
              {o.empresa ? `${o.empresa.nome} · ` : ""}
              {contatoNome} · Responsável <strong>{o.responsavel.nome}</strong>
            </p>
          </div>
          <SeletorEtapa modo="acoes" oportunidadeId={o.id} titulo={o.titulo} etapaAtual={o.etapa} valorEstimadoCentavos={o.valorEstimadoCentavos} />
        </div>

        <SeletorEtapa
          modo="passos"
          oportunidadeId={o.id}
          titulo={o.titulo}
          etapaAtual={o.etapa}
          valorEstimadoCentavos={o.valorEstimadoCentavos}
          infoEtapas={infoEtapas}
        />

        <dl className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {metricas.map((m) => (
            <div key={m.rotulo} className="rounded-xl bg-[#F7F9FA] px-4 py-3.5">
              <dt className="text-xs text-suave">{m.rotulo}</dt>
              <dd className={cx("mt-1 font-bold tabular-nums", m.destaque ? "font-titulo text-xl" : "text-base")}>{m.valor}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="flex flex-wrap items-start gap-5">
        <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-4">
          {aberta && proxima && (
            <section
              className={cx(
                "flex flex-wrap items-center gap-3.5 rounded-2xl border px-5 py-4",
                classificarPrazo(chaveDataSP(proxima.prazo), hoje) === "ATRASADA" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50",
              )}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700" aria-hidden>
                <IconeAlerta />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  Próxima ação ·{" "}
                  {classificarPrazo(chaveDataSP(proxima.prazo), hoje) === "HOJE"
                    ? "hoje"
                    : classificarPrazo(chaveDataSP(proxima.prazo), hoje) === "ATRASADA"
                      ? `atrasada desde ${formatarData(proxima.prazo)}`
                      : formatarData(proxima.prazo)}
                </p>
                <p className="text-base font-semibold">{proxima.descricao}</p>
              </div>
              <span className="text-[13px] text-tinta-2">{proxima.responsavel.nome}</span>
            </section>
          )}
          {semProximaAcao && (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900">
              <strong>Sem próxima ação.</strong> Crie uma tarefa para não perder o retorno desta negociação.
            </p>
          )}

          <Cartao aria-labelledby="titulo-tarefas">
            <TituloSecao acao={<FormNovaTarefa oportunidadeId={o.id} responsaveis={responsaveis} responsavelPadrao={o.responsavelId} hoje={hoje} />}>
              <span id="titulo-tarefas">Tarefas</span>
            </TituloSecao>
            {tarefas.pendentes.length > 0 ? (
              <ul className="flex flex-col gap-2.5">
                {tarefas.pendentes.map((t) => {
                  const chave = chaveDataSP(t.prazo);
                  return (
                    <ItemTarefa
                      key={t.id}
                      hoje={hoje}
                      responsaveis={responsaveis}
                      tarefa={{
                        id: t.id,
                        descricao: t.descricao,
                        prazoChave: chave,
                        responsavelId: t.responsavelId,
                        responsavelNome: t.responsavel.nome,
                        grupo: classificarPrazo(chave, hoje),
                        exigeDecisao: aberta && tarefas.pendentes.length === 1,
                      }}
                    />
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-suave">Nenhuma tarefa pendente.</p>
            )}
            {tarefas.concluidas.length > 0 && (
              <details className="mt-4" open={tarefas.pendentes.length === 0}>
                <summary className="cursor-pointer text-sm font-semibold text-tinta-2">Concluídas ({tarefas.concluidas.length})</summary>
                <ul className="mt-2 flex flex-col gap-1">
                  {tarefas.concluidas.map((t) => (
                    <li key={t.id} className="flex flex-wrap justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-suave" data-testid="tarefa-concluida">
                      <span className="line-through decoration-slate-400">{t.descricao}</span>
                      <span className="text-xs">
                        Prazo {formatarData(t.prazo)} · concluída em {formatarDataHora(t.concluidaEm)} · {t.responsavel.nome}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Cartao>

          <Cartao>
            <TituloSecao>Registrar interação</TituloSecao>
            <FormInteracao oportunidadeId={o.id} />
          </Cartao>

          <Cartao>
            <TituloSecao
              acao={
                <nav aria-label="Filtrar linha do tempo" className="flex gap-1">
                  {FILTROS_LINHA.map((f) => (
                    <Link
                      key={f.valor || "tudo"}
                      href={`/oportunidades/${o.id}${f.valor ? `?linha=${f.valor}` : ""}`}
                      scroll={false}
                      aria-current={filtroLinha === f.valor ? "true" : undefined}
                      className={cx(
                        "flex min-h-8 items-center rounded-lg px-2.5 text-[13px]",
                        filtroLinha === f.valor ? "bg-marca-50 font-semibold text-marca-700" : "text-tinta-2 hover:bg-[#F4F6FB]",
                      )}
                    >
                      {f.rotulo}
                    </Link>
                  ))}
                </nav>
              }
            >
              Linha do tempo
            </TituloSecao>
            <LinhaDoTempo registros={registrosFiltrados} />
          </Cartao>
        </div>

        <aside className="flex w-full flex-col gap-4 lg:w-[340px] lg:shrink-0">
          {o.etapa === "FECHADO" && (
            <Cartao>
              <TituloSecao>Venda fechada</TituloSecao>
              <dl className="mb-4 grid grid-cols-2 gap-3">
                <Dado rotulo="Valor final">
                  <span className="font-titulo text-lg font-bold tabular-nums">{formatarReais(o.valorFinalCentavos)}</span>
                </Dado>
                <Dado rotulo="Fechada em">{formatarData(o.fechadoEm)}</Dado>
              </dl>
              <FormPagamento oportunidadeId={o.id} status={o.statusPagamento} />
            </Cartao>
          )}
          {o.etapa === "PERDIDO" && (
            <Cartao>
              <TituloSecao>Negociação perdida</TituloSecao>
              <dl>
                <Dado rotulo="Motivo da perda">{o.motivoPerda}</Dado>
              </dl>
            </Cartao>
          )}

          <Cartao>
            <TituloSecao
              acao={
                <Link href={`/cadastros/contatos/${o.contato.id}`} className="text-[13px] font-semibold text-marca-700 hover:underline">
                  Ver ficha
                </Link>
              }
            >
              Contato principal
            </TituloSecao>
            <div className="mb-3.5 flex items-center gap-3">
              <Avatar nome={contatoNome} tamanho="m" className="h-11! w-11!" />
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-semibold">
                  {contatoNome}
                  {o.contato.linkedin && <IconeLinkedin url={o.contato.linkedin} nome={contatoNome} />}
                </p>
                <p className="text-[13px] text-suave">{[o.contato.cargo, o.contato.departamento].filter(Boolean).join(" · ") || "Cargo não informado"}</p>
              </div>
            </div>
            <div className="mb-3.5 flex gap-1.5">
              {telPrincipal && (
                <a href={`tel:${somenteDigitos(telPrincipal.numero)}`} className={botaoContato}>
                  <IconeTelefone tamanho={15} className="text-marca-600" /> Ligar
                </a>
              )}
              {telWhats && (
                <a href={`https://wa.me/55${somenteDigitos(telWhats.numero)}`} target="_blank" rel="noopener noreferrer" className={botaoContato}>
                  <IconeMensagem tamanho={15} className="text-green-700" /> WhatsApp
                </a>
              )}
              <a href={`mailto:${o.contato.email}`} className={botaoContato}>
                <IconeEmail tamanho={15} className="text-blue-700" /> E-mail
              </a>
            </div>
            <dl className="flex flex-col gap-2.5">
              {o.contato.telefones.map((t) => (
                <DadoLinha key={t.id} rotulo={`${rotuloTipoTelefone(t.tipo)}${t.principal ? " ★" : ""}`}>
                  {formatarTelefone(t.numero)}
                </DadoLinha>
              ))}
              <DadoLinha rotulo="E-mail">{o.contato.email}</DadoLinha>
            </dl>
          </Cartao>

          <Cartao>
            {o.empresa ? (
              <>
                <TituloSecao
                  acao={
                    <Link href={`/cadastros/empresas/${o.empresa.id}`} className="text-[13px] font-semibold text-marca-700 hover:underline">
                      Abrir
                    </Link>
                  }
                >
                  {o.empresa.nome}
                </TituloSecao>
                <div className="-mt-1 mb-3 flex flex-wrap gap-1.5">
                  {[
                    o.empresa.porte ? ROTULO_PORTE[o.empresa.porte as Porte] : null,
                    o.empresa.ramo ? ROTULO_RAMO[o.empresa.ramo as Ramo] : null,
                    o.empresa.setorAtividade,
                  ]
                    .filter((x): x is string => !!x)
                    .map((x) => (
                      <Etiqueta key={x}>{x}</Etiqueta>
                    ))}
                </div>
                {outrosNegocios.length > 0 && (
                  <p className="mb-2 text-[13px] text-tinta-2">
                    Também negocia:{" "}
                    {outrosNegocios.map((n, i) => (
                      <span key={n.id}>
                        {i > 0 && ", "}
                        <Link href={`/oportunidades/${n.id}`} className="font-semibold text-marca-700 hover:underline">
                          {n.titulo}
                        </Link>{" "}
                        ({n.evento.nome})
                      </span>
                    ))}
                  </p>
                )}
                <p className="text-[13px] text-suave">
                  {[o.empresa.cnpj ? `CNPJ ${formatarCnpj(o.empresa.cnpj)}` : null, o.empresa.telefone ? formatarTelefone(o.empresa.telefone) : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </>
            ) : (
              <>
                <TituloSecao>Empresa</TituloSecao>
                <p className="-mt-1 text-sm text-suave">Compra individual (sem empresa).</p>
              </>
            )}
          </Cartao>

          <Cartao>
            <TituloSecao>Dados comerciais</TituloSecao>
            <EdicaoOportunidade
              oportunidade={{ ...o, empresaNome: o.empresa?.nome ?? null }}
              eventos={eventos.map((e) => ({ id: e.id, nome: e.nome }))}
              responsaveis={responsaveis}
              contatosIniciais={contatos.map((c) => ({ id: c.id, nome: nomeCompleto(c), email: c.email, cargo: c.cargo }))}
              hoje={hoje}
              visualizacao={
                <dl className="flex flex-col gap-2.5">
                  <DadoLinha rotulo="Evento">{o.evento.nome}</DadoLinha>
                  <DadoLinha rotulo="Tipo de venda">{o.tipoVenda === "PATROCINIO" ? "Patrocínio" : "Inscrição"}</DadoLinha>
                  <DadoLinha rotulo="Valor estimado">{formatarReais(o.valorEstimadoCentavos)}</DadoLinha>
                  <DadoLinha rotulo="Origem do lead">{o.origemLead}</DadoLinha>
                  <DadoLinha rotulo="Responsável">{o.responsavel.nome}</DadoLinha>
                  <DadoLinha rotulo="Criada em">{formatarData(o.criadoEm)}</DadoLinha>
                </dl>
              }
            />
          </Cartao>
        </aside>
      </div>
    </div>
  );
}
