import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { tarefasDoContato } from "@/modules/agenda/servico";
import { classificarPrazo } from "@/modules/agenda/dominio";
import { FormTarefaContato, ItemTarefa } from "@/modules/agenda/componentes/tarefas";
import {
  nomeCompleto,
  ROTULO_PAPEL_EVENTO,
  ROTULO_PORTE,
  ROTULO_RAMO,
  type PapelEvento,
  type Porte,
  type Ramo,
} from "@/modules/cadastros/dominio";
import { buscarEventos, listarResponsaveis, obterFichaContato, tagsMaisUsadas } from "@/modules/cadastros/servico";
import { agruparPorSerie, participacoesDoContato } from "@/modules/participantes/servico";
import { ParticipacoesPorSerie } from "@/modules/participantes/componentes/participacoesContato";
import { ArquivosContato, EventosContato, NotasContato, TagsContato } from "@/modules/cadastros/componentes/ficha";
import { BotaoContato } from "@/modules/cadastros/componentes/formularios";
import { contatoParaEdicao, IconeLinkedin, rotuloTipoTelefone } from "@/modules/cadastros/componentes/visuais";
import { rotuloCanal } from "@/modules/historico/dominio";
import { linhaDoTempoDeOportunidades } from "@/modules/historico/servico";
import { estaAberta } from "@/modules/oportunidades/dominio";
import { listarOportunidadesDoContato } from "@/modules/oportunidades/servico";
import { TabelaOportunidades } from "@/modules/oportunidades/componentes/TabelaOportunidades";
import { EtiquetaEtapa } from "@/modules/oportunidades/componentes/visuais";
import { chaveDataSP, formatarData, formatarDataHora, formatarPeriodo, hojeSP } from "@/shared/datas";
import { formatarReais } from "@/shared/dinheiro";
import { formatarCnpj, formatarCpf, formatarTelefone, somenteDigitos } from "@/shared/documentos";
import { Avatar, Cartao, cx, DadoLinha, Etiqueta, LinkBotao, TituloSecao, Vazio } from "@/shared/ui/componentes";
import { IconeCheck, IconeEmail, IconeEtapa, IconeMais, IconeMensagem, IconeNota, IconeTelefone, IconeVoltar, SimboloCentralConsult } from "@/shared/ui/icones";
import { Compositor } from "./Compositor";

const ABAS = [
  { chave: "atividades", rotulo: "Atividades" },
  { chave: "notas", rotulo: "Notas" },
  { chave: "calendario", rotulo: "Calendário" },
  { chave: "negocios", rotulo: "Negócios" },
  { chave: "eventos", rotulo: "Eventos" },
  { chave: "arquivos", rotulo: "Arquivos" },
] as const;
type Aba = (typeof ABAS)[number]["chave"];

type ItemAtividade = {
  id: string;
  data: Date;
  tipo: "NOTA" | "INTERACAO" | "ETAPA" | "TAREFA";
  titulo: string;
  texto: string;
  combinado?: string | null;
  link?: { href: string; rotulo: string };
};

const ICONE_ATIVIDADE: Record<ItemAtividade["tipo"], { icone: ReactNode; cor: string }> = {
  NOTA: { icone: <IconeNota tamanho={16} />, cor: "bg-amber-100 text-amber-800" },
  INTERACAO: { icone: <IconeMensagem tamanho={16} />, cor: "bg-marca-50 text-marca-700" },
  ETAPA: { icone: <IconeEtapa tamanho={16} />, cor: "bg-blue-100 text-blue-800" },
  TAREFA: { icone: <IconeCheck tamanho={16} />, cor: "bg-green-100 text-green-800" },
};

const botaoAcao =
  "inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-[#D5DCE1] bg-white px-3.5 text-sm font-semibold text-tinta hover:bg-[#F7F9FA]";

/**
 * Ficha do contato: compõe Cadastros (dados, tags, notas, eventos, arquivos),
 * Agenda (calendário), Oportunidades (negócios) e Histórico (interações das negociações do contato).
 */
export default async function FichaContato({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const c = await obterFichaContato(id);
  if (!c) notFound();
  const aba: Aba = (ABAS.find((a) => a.chave === sp.aba)?.chave ?? "atividades") as Aba;

  const [negocios, tarefas, responsaveis, eventos, sugestoes, participacoes] = await Promise.all([
    listarOportunidadesDoContato(id),
    tarefasDoContato(id),
    listarResponsaveis(),
    buscarEventos(),
    tagsMaisUsadas(50),
    participacoesDoContato(id),
  ]);
  const gruposParticipacao = agruparPorSerie(participacoes);
  const historico = await linhaDoTempoDeOportunidades(negocios.map((o) => o.id));
  const nome = nomeCompleto(c);
  const hoje = hojeSP();
  const empresa = c.empresa;
  const abertos = negocios.filter((o) => estaAberta(o.etapa));
  const valorAberto = abertos.reduce((s, o) => s + o.valorEstimadoCentavos, 0);
  const proxima = tarefas.pendentes[0];
  const ultimaInteracao = historico.find((h) => h.tipo === "INTERACAO");
  const telPrincipal = c.telefones[0];
  const telWhats = c.telefones.find((t) => t.tipo === "WHATSAPP") ?? c.telefones.find((t) => t.tipo === "CELULAR");
  const pendentesPorOp = new Map<string, number>();
  for (const t of tarefas.pendentes) if (t.oportunidadeId) pendentesPorOp.set(t.oportunidadeId, (pendentesPorOp.get(t.oportunidadeId) ?? 0) + 1);

  const atividades: ItemAtividade[] = [
    ...c.notas.map((n) => ({
      id: `n${n.id}`,
      data: n.criadoEm,
      tipo: "NOTA" as const,
      titulo: n.responsavel ? `Nota de ${n.responsavel.nome}` : "Nota",
      texto: n.texto,
    })),
    ...historico.map((h) => ({
      id: `h${h.id}`,
      data: h.data,
      tipo: h.tipo === "INTERACAO" ? ("INTERACAO" as const) : ("ETAPA" as const),
      titulo: h.tipo === "INTERACAO" ? rotuloCanal(h.canal) : "Etapa da negociação",
      texto: h.tipo === "INTERACAO" ? (h.resumo ?? h.descricao) : h.descricao,
      combinado: h.combinado,
      link: { href: `/oportunidades/${h.oportunidade.id}`, rotulo: h.oportunidade.titulo },
    })),
    ...tarefas.concluidas.map((t) => ({
      id: `t${t.id}`,
      data: t.concluidaEm ?? t.atualizadoEm,
      tipo: "TAREFA" as const,
      titulo: `Tarefa concluída · ${t.responsavel.nome}`,
      texto: t.descricao,
      link: t.oportunidade ? { href: `/oportunidades/${t.oportunidade.id}`, rotulo: t.oportunidade.titulo } : undefined,
    })),
  ].sort((a, b) => b.data.getTime() - a.data.getTime());

  const contagem: Record<Aba, number> = {
    atividades: atividades.length,
    notas: c.notas.length,
    calendario: tarefas.pendentes.length,
    negocios: negocios.length,
    eventos: c.eventos.length + participacoes.length,
    arquivos: c.arquivos.length,
  };
  const linkNovaOportunidade = `/oportunidades/nova?${new URLSearchParams({ ...(empresa ? { empresaId: empresa.id } : {}), contatoId: c.id })}`;

  return (
    <div className="flex flex-col gap-5">
      <Link href="/cadastros/contatos" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-marca-700 hover:underline">
        <IconeVoltar tamanho={14} /> Contatos
      </Link>

      <section className="overflow-hidden rounded-[20px] border border-borda bg-white shadow-[0_1px_2px_rgba(20,33,43,0.04)]">
        <div className="flex h-[72px] items-center justify-end overflow-hidden bg-marinho px-7" aria-hidden>
          <span className="opacity-40">
            <SimboloCentralConsult tamanho={110} espessura={1.6} />
          </span>
        </div>
        <div className="-mt-9 flex flex-wrap items-start gap-5 px-7 pb-6">
          <Avatar nome={nome} tamanho="xg" className="border-4 border-white" />
          <div className="flex min-w-0 flex-[999_1_360px] flex-col gap-1.5 pt-12">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-titulo text-[26px] font-bold tracking-tight">{nome}</h1>
              {c.linkedin && <IconeLinkedin url={c.linkedin} nome={nome} />}
            </div>
            <p className="text-[15px] text-tinta-2">
              {[c.cargo, c.departamento, c.setor].filter(Boolean).join(" · ") || "Cargo não informado"}
              {empresa ? (
                <>
                  {" · "}
                  <Link href={`/cadastros/empresas/${empresa.id}`} className="font-semibold text-marca-700 hover:underline">
                    {empresa.nome}
                  </Link>
                </>
              ) : (
                <span className="text-suave"> · Pessoa física</span>
              )}
            </p>
            <div id="tags" className="mt-1">
              <TagsContato contatoId={c.id} tags={c.tags.map((t) => ({ id: t.tag.id, nome: t.tag.nome }))} sugestoes={sugestoes.map((s) => s.nome)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-12">
            {telPrincipal && (
              <a href={`tel:${somenteDigitos(telPrincipal.numero)}`} className={botaoAcao}>
                <IconeTelefone tamanho={16} className="text-marca-600" /> Ligar
              </a>
            )}
            {telWhats && (
              <a
                href={`https://wa.me/55${somenteDigitos(telWhats.numero)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={botaoAcao}
              >
                <IconeMensagem tamanho={16} className="text-green-700" /> WhatsApp
              </a>
            )}
            <a href={`mailto:${c.email}`} className={botaoAcao}>
              <IconeEmail tamanho={16} className="text-blue-700" /> E-mail
            </a>
            <BotaoContato contato={contatoParaEdicao(c)} variante="primario" />
          </div>
        </div>
        <dl className="grid border-t border-[#EEF1F3] sm:grid-cols-2 xl:grid-cols-4">
          {[
            { rotulo: "Negócios em andamento", valor: abertos.length ? `${abertos.length} · ${formatarReais(valorAberto)}` : "Nenhum" },
            { rotulo: "Próxima ação", valor: proxima ? `${formatarData(proxima.prazo)} · ${proxima.descricao}` : "Nenhuma agendada" },
            { rotulo: "Última interação", valor: ultimaInteracao ? `${formatarData(ultimaInteracao.data)} · ${rotuloCanal(ultimaInteracao.canal)}` : "Nenhuma registrada" },
            { rotulo: "Cliente desde", valor: formatarData(c.criadoEm) },
          ].map((r) => (
            <div key={r.rotulo} className="border-[#EEF1F3] px-7 py-4 sm:border-r">
              <dt className="text-xs text-suave">{r.rotulo}</dt>
              <dd className="mt-1 truncate text-[15px] font-bold" title={r.valor}>
                {r.valor}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="flex flex-wrap items-start gap-5">
        {/* Coluna de dados */}
        <div className="flex w-full flex-col gap-4 xl:w-[300px] xl:shrink-0">
          <Cartao>
            <TituloSecao rotulo>Contato</TituloSecao>
            <dl className="-mt-1 flex flex-col gap-3">
              <DadoLinha rotulo="E-mail">
                <a href={`mailto:${c.email}`} className="hover:text-marca-700">
                  {c.email}
                </a>
              </DadoLinha>
              {c.telefones.map((t) => (
                <DadoLinha key={t.id} rotulo={`${rotuloTipoTelefone(t.tipo)}${t.principal ? " ★" : ""}`}>
                  <a href={`tel:${somenteDigitos(t.numero)}`} className="hover:text-marca-700">
                    {formatarTelefone(t.numero)}
                  </a>
                </DadoLinha>
              ))}
              {c.linkedin && (
                <DadoLinha rotulo="LinkedIn">
                  <a href={c.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-marca-700">
                    {c.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com/, "")}
                  </a>
                </DadoLinha>
              )}
              {c.cpf && <DadoLinha rotulo="CPF">{formatarCpf(c.cpf)}</DadoLinha>}
              {c.rg && <DadoLinha rotulo="RG">{c.rg}</DadoLinha>}
              {c.dataNascimento && <DadoLinha rotulo="Nascimento">{formatarData(c.dataNascimento)}</DadoLinha>}
              <DadoLinha rotulo="Mala direta">{c.recebeMalaDireta ? "Sim" : "Não"}</DadoLinha>
            </dl>
            {c.observacoes && <p className="mt-4 rounded-lg bg-[#F7F9FA] p-3 text-[13px] text-tinta-2">{c.observacoes}</p>}
          </Cartao>
          <Cartao>
            <TituloSecao rotulo>Perfil profissional</TituloSecao>
            <dl className="-mt-1 flex flex-col gap-3">
              <DadoLinha rotulo="Cargo">{c.cargo}</DadoLinha>
              <DadoLinha rotulo="Departamento">{c.departamento}</DadoLinha>
              <DadoLinha rotulo="Setor">{c.setor}</DadoLinha>
            </dl>
          </Cartao>
          <Cartao>
            <TituloSecao
              rotulo
              acao={
                empresa ? (
                  <Link href={`/cadastros/empresas/${empresa.id}`} className="text-[13px] font-semibold text-marca-700 hover:underline">
                    Ver empresa
                  </Link>
                ) : undefined
              }
            >
              {empresa ? empresa.nome : "Empresa"}
            </TituloSecao>
            {empresa ? (
              <dl className="-mt-1 flex flex-col gap-3">
                <DadoLinha rotulo="Porte">{empresa.porte ? ROTULO_PORTE[empresa.porte as Porte] : null}</DadoLinha>
                <DadoLinha rotulo="Ramo">{empresa.ramo ? ROTULO_RAMO[empresa.ramo as Ramo] : null}</DadoLinha>
                <DadoLinha rotulo="Setor de atividade">{empresa.setorAtividade}</DadoLinha>
                <DadoLinha rotulo="CNPJ">{empresa.cnpj ? formatarCnpj(empresa.cnpj) : null}</DadoLinha>
                <DadoLinha rotulo="Telefone">{empresa.telefone ? formatarTelefone(empresa.telefone) : null}</DadoLinha>
                {empresa.site && (
                  <DadoLinha rotulo="Site">
                    <a href={empresa.site} target="_blank" rel="noopener noreferrer" className="hover:text-marca-700">
                      {empresa.site.replace(/^https?:\/\//, "")}
                    </a>
                  </DadoLinha>
                )}
              </dl>
            ) : (
              <p className="-mt-1 text-sm text-suave">Pessoa física, sem empresa vinculada.</p>
            )}
          </Cartao>
        </div>

        {/* Coluna central: abas */}
        <div className="flex min-w-0 flex-[999_1_480px] flex-col gap-4">
          <nav aria-label="Seções do contato" className="flex flex-wrap gap-1 rounded-xl border border-borda bg-white p-1">
            {ABAS.map((a) => (
              <Link
                key={a.chave}
                href={`/cadastros/contatos/${c.id}?aba=${a.chave}`}
                scroll={false}
                aria-current={aba === a.chave ? "page" : undefined}
                className={cx(
                  "flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 text-sm font-semibold",
                  aba === a.chave ? "bg-marca-600 text-white" : "text-tinta-2 hover:bg-[#F4F6FB]",
                )}
              >
                {a.rotulo} <span className="font-medium opacity-75">{contagem[a.chave]}</span>
              </Link>
            ))}
          </nav>

          {aba === "atividades" && (
            <>
              <Compositor
                contatoId={c.id}
                primeiroNome={c.nome}
                oportunidades={abertos.map((o) => ({ id: o.id, titulo: o.titulo }))}
                responsaveis={responsaveis}
                hoje={hoje}
              />
              {atividades.length === 0 ? (
                <Vazio>Nenhuma atividade registrada ainda.</Vazio>
              ) : (
                <ol aria-label="Atividades" className="flex flex-col gap-3">
                  {atividades.map((a) => (
                    <li key={a.id} className="flex gap-3.5" data-testid={a.tipo === "NOTA" ? "nota" : "atividade"}>
                      <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", ICONE_ATIVIDADE[a.tipo].cor)} aria-hidden>
                        {ICONE_ATIVIDADE[a.tipo].icone}
                      </span>
                      <article className="min-w-0 flex-1 rounded-[14px] border border-borda bg-white px-4 py-3.5">
                        <div className="mb-1 flex flex-wrap justify-between gap-2">
                          <span className="font-semibold">{a.titulo}</span>
                          <time className="text-xs text-suave">{formatarDataHora(a.data)}</time>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed text-tinta-2">{a.texto}</p>
                        {a.combinado && (
                          <p className="mt-2 rounded-lg bg-[#F4F6FB] px-2.5 py-2 text-[13px]">
                            <strong>Combinado:</strong> {a.combinado}
                          </p>
                        )}
                        {a.link && (
                          <Link href={a.link.href} className="mt-1.5 inline-block text-[13px] font-semibold text-marca-700 hover:underline">
                            {a.link.rotulo}
                          </Link>
                        )}
                      </article>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}

          {aba === "notas" && (
            <NotasContato
              contatoId={c.id}
              responsaveis={responsaveis}
              notas={c.notas.map((n) => ({ id: n.id, texto: n.texto, criadoEm: n.criadoEm, atualizadoEm: n.atualizadoEm, responsavel: n.responsavel }))}
            />
          )}

          {aba === "calendario" && (
            <div className="flex flex-col gap-4">
              <FormTarefaContato
                contatoId={c.id}
                hoje={hoje}
                responsaveis={responsaveis}
                oportunidades={abertos.map((o) => ({ id: o.id, titulo: o.titulo }))}
              />
              {tarefas.pendentes.length === 0 ? (
                <Vazio>Nenhuma tarefa pendente para este contato.</Vazio>
              ) : (
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
                          exigeDecisao: !!t.oportunidade && estaAberta(t.oportunidade.etapa) && (pendentesPorOp.get(t.oportunidade.id) ?? 0) <= 1,
                          oportunidade: t.oportunidade ? { id: t.oportunidade.id, titulo: t.oportunidade.titulo } : undefined,
                        }}
                      />
                    );
                  })}
                </ul>
              )}
              {tarefas.concluidas.length > 0 && (
                <details className="rounded-xl border border-borda bg-white p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-tinta-2">Concluídas ({tarefas.concluidas.length})</summary>
                  <ul className="mt-2 flex flex-col gap-1">
                    {tarefas.concluidas.map((t) => (
                      <li key={t.id} className="flex flex-wrap justify-between gap-2 py-1 text-sm text-suave">
                        <span className="line-through decoration-slate-400">{t.descricao}</span>
                        <span className="text-xs">
                          concluída em {formatarDataHora(t.concluidaEm)} · {t.responsavel.nome}
                          {t.oportunidade && ` · ${t.oportunidade.titulo}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          {aba === "negocios" && (
            <Cartao>
              <TituloSecao
                acao={
                  <LinkBotao href={linkNovaOportunidade} pequeno>
                    <IconeMais tamanho={16} /> Nova oportunidade
                  </LinkBotao>
                }
              >
                Negócios em que é contato principal
              </TituloSecao>
              <TabelaOportunidades oportunidades={negocios} />
            </Cartao>
          )}

          {aba === "eventos" && (
            <>
              <Cartao>
                <TituloSecao>Participações em eventos ({participacoes.length})</TituloSecao>
                <ParticipacoesPorSerie grupos={gruposParticipacao} />
              </Cartao>
              <Cartao>
                <TituloSecao>Interesse e outros vínculos com eventos</TituloSecao>
                <EventosContato contatoId={c.id} associacoes={c.eventos} eventos={eventos.map((e) => ({ id: e.id, nome: e.nome }))} />
              </Cartao>
            </>
          )}

          {aba === "arquivos" && <ArquivosContato contatoId={c.id} arquivos={c.arquivos} />}
        </div>

        {/* Coluna lateral: resumo */}
        <div className="flex w-full flex-col gap-4 xl:w-[300px] xl:shrink-0">
          <Cartao>
            <TituloSecao
              acao={
                <Link href={linkNovaOportunidade} className="text-[13px] font-semibold text-marca-700 hover:underline">
                  + Novo
                </Link>
              }
            >
              Negócios
            </TituloSecao>
            {negocios.length === 0 ? (
              <p className="-mt-1 text-sm text-suave">Nenhum negócio ainda.</p>
            ) : (
              <ul className="-mt-1 flex flex-col gap-2">
                {negocios.slice(0, 3).map((o) => (
                  <li key={o.id}>
                    <Link href={`/oportunidades/${o.id}`} className="block rounded-xl border border-borda p-3 hover:border-marca-200">
                      <p className="font-semibold leading-snug">{o.titulo}</p>
                      <p className="mb-2 mt-0.5 text-[13px] text-suave">{o.evento.nome}</p>
                      <span className="flex items-center justify-between gap-2">
                        <EtiquetaEtapa etapa={o.etapa} />
                        <span className="font-bold tabular-nums">
                          {formatarReais(o.etapa === "FECHADO" && o.valorFinalCentavos !== null ? o.valorFinalCentavos : o.valorEstimadoCentavos)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
          <Cartao>
            <TituloSecao
              acao={
                <Link href={`/cadastros/contatos/${c.id}?aba=calendario`} className="text-[13px] font-semibold text-marca-700 hover:underline">
                  + Agendar
                </Link>
              }
            >
              Próximas tarefas
            </TituloSecao>
            {tarefas.pendentes.length === 0 ? (
              <p className="-mt-1 text-sm text-suave">Nenhuma tarefa pendente.</p>
            ) : (
              <ul className="-mt-1 flex flex-col gap-3">
                {tarefas.pendentes.slice(0, 3).map((t) => {
                  const grupo = classificarPrazo(chaveDataSP(t.prazo), hoje);
                  return (
                    <li key={t.id} className="flex gap-2.5">
                      <span
                        className={cx("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", grupo === "ATRASADA" ? "bg-red-600" : grupo === "HOJE" ? "bg-amber-500" : "bg-slate-400")}
                        aria-hidden
                      />
                      <div>
                        <p className="font-semibold leading-snug">{t.descricao}</p>
                        <p className="text-[13px] text-suave">
                          {grupo === "HOJE" ? "Hoje" : formatarData(t.prazo)} · {t.responsavel.nome}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Cartao>
          <Cartao>
            <TituloSecao
              acao={
                <Link href={`/cadastros/contatos/${c.id}?aba=eventos`} className="text-[13px] font-semibold text-marca-700 hover:underline">
                  Gerenciar
                </Link>
              }
            >
              Eventos
            </TituloSecao>
            {gruposParticipacao.length > 0 && (
              <div className="-mt-1 mb-3 border-b border-[#EEF1F3] pb-3">
                <ParticipacoesPorSerie grupos={gruposParticipacao} compacto />
              </div>
            )}
            {c.eventos.length === 0 ? (
              <p className="-mt-1 text-sm text-suave">{gruposParticipacao.length ? "Sem outros vínculos com eventos." : "Nenhum evento associado."}</p>
            ) : (
              <ul className="-mt-1 flex flex-col gap-2.5">
                {c.eventos.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2">
                    <span>
                      <span className="block font-semibold">{e.evento.nome}</span>
                      <span className="text-[13px] text-suave">{formatarPeriodo(e.evento.dataInicio, e.evento.dataFim)}</span>
                    </span>
                    <Etiqueta pilula tom="roxo">
                      {ROTULO_PAPEL_EVENTO[e.papel as PapelEvento] ?? e.papel}
                    </Etiqueta>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
        </div>
      </div>
    </div>
  );
}
