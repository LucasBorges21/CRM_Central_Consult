import Link from "next/link";
import { agendaPorContato } from "@/modules/agenda/servico";
import { BotaoContato } from "@/modules/cadastros/componentes/formularios";
import { BarraBuscaContatos, CardContato } from "@/modules/cadastros/componentes/lista";
import { ROTULO_CAMPO_BUSCA, ROTULO_ESCOPO_BUSCA } from "@/modules/cadastros/dominio";
import { buscarContatos, contarVisoesDeContatos, obterTag, tagsMaisUsadas } from "@/modules/cadastros/servico";
import { contatosComNegociosEmAndamento, negociosPorContato } from "@/modules/oportunidades/servico";
import { CabecalhoPagina, Cartao, cx, TituloSecao, Vazio } from "@/shared/ui/componentes";

type Parametros = { q?: string; campo?: string; pessoa?: string; tag?: string; filtro?: string; pagina?: string };

const ROTULO_FILTRO: Record<string, string> = {
  COM_NEGOCIOS: "Com negócios em andamento",
  SEM_NEGOCIOS: "Sem negócios em andamento",
  SEM_EMPRESA: "Pessoas físicas (sem empresa)",
};

/**
 * Contatos: compõe Cadastros (busca e dados), Oportunidades (negócios por contato)
 * e Agenda (tarefas pendentes e próxima ação por contato).
 */
export default async function PaginaContatos({ searchParams }: { searchParams: Promise<Parametros> }) {
  const sp = await searchParams;
  const comNegocios = await contatosComNegociosEmAndamento();
  const restricoes =
    sp.filtro === "COM_NEGOCIOS" ? { incluirIds: comNegocios } : sp.filtro === "SEM_NEGOCIOS" ? { excluirIds: comNegocios } : {};
  const [resultado, tags, tagAtual, visoes] = await Promise.all([
    buscarContatos({ termo: sp.q, campo: sp.campo, escopo: sp.pessoa, tagId: sp.tag, filtro: sp.filtro, pagina: sp.pagina }, restricoes),
    tagsMaisUsadas(),
    sp.tag ? obterTag(sp.tag) : Promise.resolve(null),
    contarVisoesDeContatos(comNegocios),
  ]);
  const ids = resultado.contatos.map((c) => c.id);
  const [negocios, agenda] = await Promise.all([negociosPorContato(ids), agendaPorContato(ids)]);
  const p = resultado.parametros;
  const filtrando = !!(p.termo || sp.tag || sp.filtro);

  const urlPagina = (n: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && k !== "pagina") qs.set(k, v);
    qs.set("pagina", String(n));
    return `/cadastros/contatos?${qs}`;
  };
  const listaVisoes = [
    { href: "/cadastros/contatos", rotulo: "Todos os contatos", qtd: visoes.todos, ativo: !filtrando },
    { href: "/cadastros/contatos?filtro=COM_NEGOCIOS", rotulo: ROTULO_FILTRO.COM_NEGOCIOS, qtd: visoes.comNegocios, ativo: sp.filtro === "COM_NEGOCIOS" },
    { href: "/cadastros/contatos?filtro=SEM_NEGOCIOS", rotulo: ROTULO_FILTRO.SEM_NEGOCIOS, qtd: visoes.semNegocios, ativo: sp.filtro === "SEM_NEGOCIOS" },
    { href: "/cadastros/contatos?filtro=SEM_EMPRESA", rotulo: ROTULO_FILTRO.SEM_EMPRESA, qtd: visoes.semEmpresa, ativo: sp.filtro === "SEM_EMPRESA" },
  ];

  return (
    <div>
      <CabecalhoPagina
        titulo="Contatos"
        descricao="Pessoas, empresas e tudo o que já foi conversado"
        acoes={<BotaoContato abrirFichaAoCriar />}
      />
      <BarraBuscaContatos termo={p.termo} campo={p.campo} escopo={p.escopo} />

      <div className="mt-5 flex flex-wrap items-start gap-5">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-tinta-2">
            <span>
              {filtrando ? (
                <>
                  Resultado
                  {p.termo && (
                    <>
                      {" "}
                      para <strong className="text-tinta">“{p.termo}”</strong> em {ROTULO_CAMPO_BUSCA[p.campo]} ({ROTULO_ESCOPO_BUSCA[p.escopo].toLowerCase()})
                    </>
                  )}
                  {tagAtual && (
                    <>
                      {" "}
                      · tag <strong className="text-tinta">{tagAtual.nome}</strong>
                    </>
                  )}
                  {sp.filtro && ROTULO_FILTRO[sp.filtro] && (
                    <>
                      {" "}
                      · <strong className="text-tinta">{ROTULO_FILTRO[sp.filtro]}</strong>
                    </>
                  )}{" "}
                  <Link href="/cadastros/contatos" className="ml-1 font-semibold text-marca-700 hover:underline">
                    Limpar
                  </Link>
                </>
              ) : (
                "Todos os contatos"
              )}
            </span>
            <span data-testid="total-contatos" className="text-suave">
              Foram encontrados {resultado.total} {resultado.total === 1 ? "contato" : "contatos"}
            </span>
          </div>
          {resultado.aviso && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{resultado.aviso}</p>}

          {resultado.contatos.length === 0 ? (
            <Vazio>Nenhum contato encontrado.</Vazio>
          ) : (
            <ul className="flex flex-col gap-3">
              {resultado.contatos.map((c) => (
                <CardContato
                  key={c.id}
                  contato={c}
                  negocios={negocios.get(c.id) ?? { total: 0, abertos: 0, valorAbertoCentavos: 0 }}
                  agenda={agenda.get(c.id) ?? null}
                />
              ))}
            </ul>
          )}

          {resultado.paginas > 1 && (
            <nav aria-label="Páginas" className="mt-2 flex items-center justify-center gap-2 text-sm">
              {resultado.pagina > 1 && (
                <Link href={urlPagina(resultado.pagina - 1)} className="rounded-lg border border-borda bg-white px-3 py-1.5 hover:bg-[#F4F6FB]">
                  ← Anterior
                </Link>
              )}
              <span className="text-suave">
                Página {resultado.pagina} de {resultado.paginas}
              </span>
              {resultado.pagina < resultado.paginas && (
                <Link href={urlPagina(resultado.pagina + 1)} className="rounded-lg border border-borda bg-white px-3 py-1.5 hover:bg-[#F4F6FB]">
                  Próxima →
                </Link>
              )}
            </nav>
          )}
        </div>

        <aside className="flex w-full flex-col gap-4 lg:w-[280px] lg:shrink-0">
          <Cartao className="p-4">
            <TituloSecao rotulo>Visões</TituloSecao>
            <ul className="-mt-1 flex flex-col gap-0.5">
              {listaVisoes.map((v) => (
                <li key={v.href}>
                  <Link
                    href={v.href}
                    aria-current={v.ativo ? "page" : undefined}
                    className={cx(
                      "flex min-h-[38px] items-center gap-2 rounded-lg px-2.5",
                      v.ativo ? "bg-marca-50 font-semibold text-marca-700" : "font-medium text-tinta-2 hover:bg-[#F4F6FB]",
                    )}
                  >
                    <span className="flex-1">{v.rotulo}</span>
                    <span className="text-xs text-suave">{v.qtd}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Cartao>
          <Cartao className="p-4">
            <TituloSecao rotulo>Tags</TituloSecao>
            {tags.length === 0 ? (
              <p className="-mt-1 text-sm text-suave">Nenhuma tag em uso.</p>
            ) : (
              <div className="-mt-1 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <Link
                    key={t.id}
                    href={`/cadastros/contatos?tag=${t.id}`}
                    aria-current={sp.tag === t.id ? "true" : undefined}
                    className={cx(
                      "rounded-full px-3 py-1 text-[13px] font-semibold",
                      sp.tag === t.id ? "bg-marca-600 text-white" : "bg-marca-50 text-marca-800 hover:bg-marca-100",
                    )}
                  >
                    {t.nome} <span className="font-medium opacity-75">{t._count.contatos}</span>
                  </Link>
                ))}
              </div>
            )}
          </Cartao>
        </aside>
      </div>
    </div>
  );
}
