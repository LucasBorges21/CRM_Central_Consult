/** Lista de contatos: barra de busca e card horizontal (componentes de servidor). */
import Link from "next/link";
import { formatarData } from "@/shared/datas";
import { formatarReais } from "@/shared/dinheiro";
import { Avatar, cx, Etiqueta } from "@/shared/ui/componentes";
import { IconeBusca, IconeEmail } from "@/shared/ui/icones";
import {
  CAMPOS_BUSCA,
  ESCOPOS_BUSCA,
  nomeCompleto,
  ROTULO_CAMPO_BUSCA,
  ROTULO_PORTE,
  ROTULO_RAMO,
  type Porte,
  type Ramo,
} from "../dominio";
import { IconeLinkedin, Telefone } from "./visuais";

const ROTULO_ESCOPO_CURTO: Record<string, string> = { AMBOS: "Física e jurídica", FISICA: "Física", JURIDICA: "Jurídica" };

function Segmentos({ nome, legenda, opcoes, atual }: { nome: string; legenda: string; opcoes: { valor: string; rotulo: string }[]; atual: string }) {
  return (
    <fieldset className="flex flex-wrap gap-1 rounded-[10px] bg-[#F4F6FB] p-1">
      <legend className="sr-only">{legenda}</legend>
      {opcoes.map((o) => (
        <label
          key={o.valor}
          className="flex min-h-10 cursor-pointer items-center rounded-lg px-3 text-[13px] font-medium text-tinta-2 has-checked:bg-white has-checked:font-bold has-checked:text-marca-700 has-checked:shadow-sm has-focus-visible:ring-2 has-focus-visible:ring-marca-500"
        >
          <input type="radio" name={nome} value={o.valor} defaultChecked={o.valor === atual} className="sr-only" />
          {o.rotulo}
        </label>
      ))}
    </fieldset>
  );
}

/** Busca: termo + campo (Nome, Tag, E-mail, Telefone, CPF/CNPJ, RG) + pessoa física/jurídica. Funciona sem JavaScript. */
export function BarraBuscaContatos({ termo, campo, escopo }: { termo: string; campo: string; escopo: string }) {
  return (
    <form
      role="search"
      action="/cadastros/contatos"
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-borda bg-white p-2.5 shadow-[0_1px_2px_rgba(20,33,43,0.04)]"
    >
      <label className="flex min-h-12 min-w-0 flex-[1_1_260px] items-center gap-2.5 rounded-[10px] bg-[#F4F6FB] px-3.5 text-suave">
        <IconeBusca />
        <span className="sr-only">Termo da busca</span>
        <input
          type="search"
          name="q"
          defaultValue={termo}
          placeholder="Buscar contatos…"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-tinta outline-none placeholder:text-[#8A99A4]"
        />
      </label>
      <Segmentos nome="campo" legenda="Buscar por" atual={campo} opcoes={CAMPOS_BUSCA.map((c) => ({ valor: c, rotulo: ROTULO_CAMPO_BUSCA[c] }))} />
      <Segmentos
        nome="pessoa"
        legenda="Tipo de pessoa"
        atual={escopo}
        opcoes={ESCOPOS_BUSCA.map((e) => ({ valor: e, rotulo: ROTULO_ESCOPO_CURTO[e] }))}
      />
      <button type="submit" className="min-h-12 rounded-[10px] bg-marca-600 px-6 text-sm font-semibold text-white hover:bg-marca-700">
        Buscar
      </button>
    </form>
  );
}

export type CardContatoDados = {
  id: string;
  nome: string;
  sobrenome: string | null;
  cargo: string | null;
  departamento: string | null;
  email: string;
  linkedin: string | null;
  possivelDuplicidade: boolean;
  empresa: { id: string; nome: string; porte: string | null; ramo: string | null; setorAtividade: string | null } | null;
  telefones: { id: string; tipo: string; numero: string; principal: boolean }[];
  tags: { tag: { id: string; nome: string } }[];
  _count: { notas: number; arquivos: number };
};

function Atalho({ href, rotulo, quantidade }: { href: string; rotulo: string; quantidade?: number }) {
  const nomeAcessivel = quantidade === undefined ? rotulo : `${rotulo} (${quantidade})`;
  return (
    <Link
      href={href}
      aria-label={nomeAcessivel}
      className="flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-tinta-2 hover:bg-marca-50 hover:text-marca-700"
    >
      {rotulo}
      {quantidade !== undefined && (
        <span
          aria-hidden
          className={cx(
            "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
            quantidade > 0 ? "bg-marca-50 text-marca-700" : "bg-[#EEF1F3] text-suave",
          )}
        >
          {quantidade}
        </span>
      )}
    </Link>
  );
}

export function CardContato({
  contato: c,
  negocios,
  agenda,
}: {
  contato: CardContatoDados;
  negocios: { total: number; abertos: number; valorAbertoCentavos: number };
  agenda: { pendentes: number; proxima: { descricao: string; prazo: Date } } | null;
}) {
  const nome = nomeCompleto(c);
  const base = `/cadastros/contatos/${c.id}`;
  const perfil = [
    c.empresa?.porte ? ROTULO_PORTE[c.empresa.porte as Porte] : null,
    c.empresa?.ramo ? ROTULO_RAMO[c.empresa.ramo as Ramo] : null,
    c.empresa?.setorAtividade,
  ].filter((x): x is string => !!x);
  return (
    <li className="overflow-hidden rounded-2xl border border-borda bg-white shadow-[0_1px_2px_rgba(20,33,43,0.04)]" data-testid="card-contato">
      <div className="flex flex-wrap gap-5 px-5 py-4">
        <div className="flex min-w-0 flex-[999_1_380px] gap-3.5">
          <Avatar nome={nome} />
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={base} className="font-titulo text-[17px] font-bold text-tinta hover:text-marca-700">
                {nome}
              </Link>
              {c.linkedin && <IconeLinkedin url={c.linkedin} nome={nome} />}
              {c.possivelDuplicidade && <Etiqueta tom="alerta">Possível duplicidade</Etiqueta>}
            </div>
            <p className="text-tinta-2">
              {[c.cargo, c.departamento].filter(Boolean).join(" · ") || "Cargo não informado"}
              {c.empresa ? (
                <>
                  <span className="text-[#8A99A4]"> · </span>
                  <Link href={`/cadastros/empresas/${c.empresa.id}`} className="font-semibold text-marca-700 hover:underline">
                    {c.empresa.nome}
                  </Link>
                </>
              ) : (
                <span className="text-suave"> · Pessoa física</span>
              )}
            </p>
            {perfil.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {perfil.map((p) => (
                  <Etiqueta key={p}>{p}</Etiqueta>
                ))}
              </div>
            )}
            <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
              {c.telefones.slice(0, 3).map((t) => (
                <Telefone key={t.id} tipo={t.tipo} numero={t.numero} principal={t.principal} />
              ))}
              <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1.5 text-tinta hover:text-marca-700">
                <IconeEmail tamanho={15} className="text-marca-600" />
                {c.email}
              </a>
            </div>
          </div>
        </div>
        <div className="flex flex-[1_1_220px] flex-col gap-2.5 border-[#EEF1F3] sm:border-l sm:pl-5">
          <div>
            <p className="text-xs text-suave">Negócios em andamento</p>
            <p className="font-bold tabular-nums">
              {negocios.abertos ? `${negocios.abertos} · ${formatarReais(negocios.valorAbertoCentavos)}` : "Nenhum"}
            </p>
          </div>
          <div>
            <p className="text-xs text-suave">Próxima ação</p>
            <p className={cx("text-[13px] font-semibold", agenda ? "text-tinta" : "text-suave")}>
              {agenda ? `${agenda.proxima.descricao} · ${formatarData(agenda.proxima.prazo).slice(0, 5)}` : "Nenhuma agendada"}
            </p>
          </div>
          {c.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {c.tags.map(({ tag }) => (
                <Link
                  key={tag.id}
                  href={`/cadastros/contatos?tag=${tag.id}`}
                  className="rounded-full bg-marca-50 px-2.5 py-0.5 text-xs font-semibold text-marca-800 hover:bg-marca-100"
                >
                  {tag.nome}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <nav aria-label={`Atalhos de ${nome}`} className="flex flex-wrap gap-0.5 border-t border-[#EEF1F3] bg-[#FAFBFC] px-3 py-1.5">
        <Atalho href={base} rotulo="Ver e editar" />
        <Atalho href={`${base}?aba=notas`} rotulo="Notas" quantidade={c._count.notas} />
        <Atalho href={`${base}#tags`} rotulo="Tags" quantidade={c.tags.length} />
        <Atalho href={`${base}?aba=calendario`} rotulo="Calendário" quantidade={agenda?.pendentes ?? 0} />
        <Atalho href={`${base}?aba=negocios`} rotulo="Negócios" quantidade={negocios.total} />
        <Atalho href={`${base}?aba=arquivos`} rotulo="Arquivos" quantidade={c._count.arquivos} />
      </nav>
    </li>
  );
}
