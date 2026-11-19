"use client";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { AreaTexto, Botao, Campo, cx, Entrada, Selecao } from "@/shared/ui/componentes";
import { normalizarBusca } from "@/shared/texto";
import { lerFormulario, Modal, useAcao } from "@/shared/ui/interativos";
import { acaoSalvarContato, acaoSalvarEmpresa, acaoSalvarEvento } from "../acoes";
import { SeletorEmpresa } from "./SeletorEmpresa";
import { PORTES, RAMOS, ROTULO_PORTE, ROTULO_RAMO, ROTULO_TIPO_TELEFONE, TIPOS_TELEFONE } from "../dominio";

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
      <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-marca-700">{titulo}</legend>
      {children}
    </fieldset>
  );
}

// ---------- Empresa ----------

export type EmpresaEdicao = {
  id: string;
  nome: string;
  cnpj: string | null;
  site: string | null;
  linkedin: string | null;
  telefone: string | null;
  email: string | null;
  porte: string | null;
  ramo: string | null;
  setorAtividade: string | null;
  observacoes: string | null;
};

export function FormEmpresa({ empresa, aoSalvar }: { empresa?: EmpresaEdicao; aoSalvar?: (id: string) => void }) {
  const { erros, pendente, enviar } = useAcao();
  const c = (nome: string, rotulo: string, props: Record<string, unknown> = {}, extra?: { dica?: string; largo?: boolean }) => (
    <Campo rotulo={rotulo} nome={nome} id={`empresa-${nome}`} erro={erros[nome]} dica={extra?.dica} className={extra?.largo ? "sm:col-span-2" : undefined}>
      <Entrada
        name={nome}
        id={`empresa-${nome}`}
        defaultValue={(empresa?.[nome as keyof EmpresaEdicao] as string | null) ?? ""}
        erro={erros[nome]}
        {...props}
      />
    </Campo>
  );
  return (
    <form
      noValidate
      className="grid gap-5 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const dados = lerFormulario(e.currentTarget);
        enviar(() => acaoSalvarEmpresa(empresa?.id ?? null, dados), { onSucesso: (d) => d && aoSalvar?.(d.id) });
      }}
    >
      <Secao titulo="Identificação">
        {c("nome", "Nome da empresa", {}, { largo: true })}
        {c("cnpj", "CNPJ", { inputMode: "numeric", placeholder: "00.000.000/0000-00" })}
        {c("site", "Site", { placeholder: "empresa.com.br" })}
      </Secao>
      <Secao titulo="Contato da empresa">
        {c("telefone", "Telefone", { inputMode: "tel", placeholder: "(11) 3333-0000" })}
        {c("email", "E-mail geral", { type: "email" })}
        {c("linkedin", "LinkedIn da empresa", { placeholder: "linkedin.com/company/..." }, { largo: true })}
      </Secao>
      <Secao titulo="Perfil">
        <Campo rotulo="Porte" nome="porte" id="empresa-porte" erro={erros.porte}>
          <Selecao name="porte" id="empresa-porte" defaultValue={empresa?.porte ?? ""} erro={erros.porte}>
            <option value="">Não informado</option>
            {PORTES.map((p) => (
              <option key={p} value={p}>
                {ROTULO_PORTE[p]}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Ramo" nome="ramo" id="empresa-ramo" erro={erros.ramo}>
          <Selecao name="ramo" id="empresa-ramo" defaultValue={empresa?.ramo ?? ""} erro={erros.ramo}>
            <option value="">Não informado</option>
            {RAMOS.map((r) => (
              <option key={r} value={r}>
                {ROTULO_RAMO[r]}
              </option>
            ))}
          </Selecao>
        </Campo>
        {c("setorAtividade", "Setor de atividade", { placeholder: "Ex.: Farmácia/Medicamentos" }, { largo: true })}
      </Secao>
      <Campo rotulo="Observações" nome="observacoes" id="empresa-observacoes" erro={erros.observacoes} className="sm:col-span-2">
        <AreaTexto name="observacoes" id="empresa-observacoes" defaultValue={empresa?.observacoes ?? ""} erro={erros.observacoes} />
      </Campo>
      <div className="flex justify-end sm:col-span-2">
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar empresa"}
        </Botao>
      </div>
    </form>
  );
}

export function BotaoNovaEmpresa() {
  const [aberto, setAberto] = useState(false);
  const router = useRouter();
  return (
    <>
      <Botao onClick={() => setAberto(true)}>+ Nova empresa</Botao>
      <Modal aberto={aberto} aoFechar={() => setAberto(false)} titulo="Nova empresa" largura="max-w-2xl">
        <FormEmpresa
          aoSalvar={(id) => {
            setAberto(false);
            router.push(`/cadastros/empresas/${id}`);
          }}
        />
      </Modal>
    </>
  );
}

// ---------- Contato ----------

export type TelefoneEdicao = { tipo: string; numero: string; principal: boolean };

export type ContatoEdicao = {
  id: string;
  nome: string;
  sobrenome: string | null;
  cpf: string | null;
  rg: string | null;
  dataNascimento: string | null; // AAAA-MM-DD
  cargo: string | null;
  departamento: string | null;
  setor: string | null;
  email: string;
  linkedin: string | null;
  recebeMalaDireta: boolean;
  observacoes: string | null;
  empresaId: string | null;
  empresaNome: string | null;
  telefones: TelefoneEdicao[];
};

type LinhaTelefone = TelefoneEdicao & { chave: number };
let proximaChave = 1;

export function FormContato({
  contato,
  empresaFixa,
  aoSalvar,
}: {
  contato?: ContatoEdicao;
  empresaFixa?: { id: string; nome: string };
  aoSalvar?: (id: string) => void;
}) {
  const { erros, pendente, enviar } = useAcao();
  const [pedirConfirmacao, setPedirConfirmacao] = useState(false);
  const [telefones, setTelefones] = useState<LinhaTelefone[]>(() =>
    (contato?.telefones.length ? contato.telefones : [{ tipo: "CELULAR", numero: "", principal: true }]).map((t) => ({
      ...t,
      chave: proximaChave++,
    })),
  );

  const id = (n: string) => `contato-${n}`;
  const texto = (nome: keyof ContatoEdicao & string, rotulo: string, props: Record<string, unknown> = {}, largo = false) => (
    <Campo rotulo={rotulo} nome={nome} id={id(nome)} erro={erros[nome]} className={largo ? "sm:col-span-2" : undefined}>
      <Entrada name={nome} id={id(nome)} defaultValue={(contato?.[nome] as string | null) ?? ""} erro={erros[nome]} {...props} />
    </Campo>
  );

  return (
    <form
      noValidate
      className="grid gap-5 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const bruto = lerFormulario(e.currentTarget);
        const principal = Number(bruto.telefonePrincipal ?? 0);
        const dados: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(bruto)) if (!k.startsWith("telefones.") && k !== "telefonePrincipal") dados[k] = v;
        dados.telefones = telefones
          .map((t, i) => ({ tipo: bruto[`telefones.${i}.tipo`], numero: String(bruto[`telefones.${i}.numero`] ?? ""), principal: i === principal }))
          .filter((t) => t.numero.trim());
        if (empresaFixa) dados.empresaId = empresaFixa.id;
        enviar(() => acaoSalvarContato(contato?.id ?? null, dados), {
          onSucesso: (d) => d && aoSalvar?.(d.id),
          onFalha: (f) => {
            if (f.codigo === "DUPLICIDADE_EMAIL") setPedirConfirmacao(true);
          },
        });
      }}
    >
      <Secao titulo="Dados pessoais">
        {texto("nome", "Nome")}
        {texto("sobrenome", "Sobrenome")}
        {texto("cpf", "CPF", { inputMode: "numeric", placeholder: "000.000.000-00" })}
        {texto("rg", "RG")}
        {texto("dataNascimento", "Data de nascimento", { type: "date" })}
      </Secao>

      <Secao titulo="Contato">
        <Campo rotulo="E-mail" nome="email" id={id("email")} erro={erros.email} className="sm:col-span-2">
          <Entrada
            name="email"
            id={id("email")}
            type="email"
            defaultValue={contato?.email}
            erro={erros.email}
            onChange={() => setPedirConfirmacao(false)}
          />
        </Campo>
        {pedirConfirmacao && (
          <label className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 sm:col-span-2">
            <input type="checkbox" name="confirmarDuplicidade" className="mt-0.5" />
            Confirmo que é outra pessoa (ou um cadastro necessário) e quero salvar mesmo com o e-mail repetido.
          </label>
        )}
        <div className="flex flex-col gap-2 sm:col-span-2" role="group" aria-label="Telefones">
          <span className="text-sm font-medium text-tinta-2">Telefones</span>
          {erros.telefones && <p className="text-xs font-medium text-red-700">{erros.telefones}</p>}
          {telefones.map((t, i) => (
            <div key={t.chave} className="flex flex-wrap items-start gap-2">
              <div className="w-36 shrink-0">
                <Selecao
                  name={`telefones.${i}.tipo`}
                  id={id(`telefone-tipo-${i}`)}
                  aria-label={`Tipo do telefone ${i + 1}`}
                  defaultValue={t.tipo}
                >
                  {TIPOS_TELEFONE.map((tp) => (
                    <option key={tp} value={tp}>
                      {ROTULO_TIPO_TELEFONE[tp]}
                    </option>
                  ))}
                </Selecao>
              </div>
              <div className="min-w-40 flex-1">
                <Entrada
                  name={`telefones.${i}.numero`}
                  id={id(`telefone-numero-${i}`)}
                  aria-label={`Número do telefone ${i + 1}`}
                  inputMode="tel"
                  placeholder="(11) 99999-0000"
                  defaultValue={t.numero}
                  erro={erros[`telefones.${i}.numero`]}
                />
                {erros[`telefones.${i}.numero`] && (
                  <p className="mt-1 text-xs font-medium text-red-700">{erros[`telefones.${i}.numero`]}</p>
                )}
              </div>
              <label className="flex items-center gap-1 py-2 text-xs text-suave">
                <input type="radio" name="telefonePrincipal" value={i} defaultChecked={t.principal} /> Principal
              </label>
              <Botao
                variante="fantasma"
                pequeno
                className="mt-1"
                aria-label={`Remover telefone ${i + 1}`}
                onClick={() => setTelefones((ts) => ts.filter((x) => x.chave !== t.chave))}
              >
                Remover
              </Botao>
            </div>
          ))}
          {telefones.length < 6 && (
            <Botao
              variante="secundario"
              pequeno
              className="self-start"
              onClick={() => setTelefones((ts) => [...ts, { tipo: "CELULAR", numero: "", principal: ts.length === 0, chave: proximaChave++ }])}
            >
              + Adicionar telefone
            </Botao>
          )}
        </div>
        {texto("linkedin", "LinkedIn", { placeholder: "linkedin.com/in/..." }, true)}
      </Secao>

      <Secao titulo="Profissional">
        {empresaFixa ? (
          <p className="text-sm text-suave sm:col-span-2">
            Empresa: <strong>{empresaFixa.nome}</strong>
          </p>
        ) : (
          <Campo
            rotulo="Empresa"
            nome="empresaId"
            id={id("empresaId")}
            erro={erros.empresaId}
            dica="Digite parte do nome ou do CNPJ. Se não existir, cadastre na hora. Vazio = pessoa física."
            className="sm:col-span-2"
          >
            <SeletorEmpresa
              id={id("empresaId")}
              inicial={contato?.empresaId && contato.empresaNome ? { id: contato.empresaId, nome: contato.empresaNome } : null}
              erro={erros.empresaId}
              semEmpresaRotulo="Sem empresa (pessoa física)"
            />
          </Campo>
        )}
        {texto("cargo", "Cargo")}
        {texto("departamento", "Departamento")}
        {texto("setor", "Setor")}
      </Secao>

      <Secao titulo="Preferências">
        <label className="flex items-center gap-2 text-sm text-tinta-2 sm:col-span-2">
          <input type="checkbox" name="recebeMalaDireta" defaultChecked={contato?.recebeMalaDireta} />
          Deseja receber mala direta
        </label>
        <Campo rotulo="Observações" nome="observacoes" id={id("observacoes")} erro={erros.observacoes} className="sm:col-span-2">
          <AreaTexto name="observacoes" id={id("observacoes")} defaultValue={contato?.observacoes ?? ""} erro={erros.observacoes} />
        </Campo>
      </Secao>

      <div className="flex justify-end sm:col-span-2">
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar contato"}
        </Botao>
      </div>
    </form>
  );
}

/** Abre o formulário de contato em um modal (novo ou edição). */
export function BotaoContato({
  contato,
  empresaFixa,
  rotulo,
  abrirFichaAoCriar,
  variante,
}: {
  contato?: ContatoEdicao;
  empresaFixa?: { id: string; nome: string };
  rotulo?: string;
  abrirFichaAoCriar?: boolean;
  variante?: "primario" | "secundario" | "fantasma";
}) {
  const [aberto, setAberto] = useState(false);
  const router = useRouter();
  return (
    <>
      <Botao
        variante={variante ?? (contato ? "secundario" : "primario")}
        pequeno={variante === "fantasma"}
        onClick={() => setAberto(true)}
      >
        {rotulo ?? (contato ? "Editar contato" : "+ Adicionar contato")}
      </Botao>
      <Modal
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        titulo={contato ? "Editar contato" : "Adicionar contato"}
        largura="max-w-3xl"
      >
        <FormContato
          contato={contato}
          empresaFixa={empresaFixa}
          aoSalvar={(id) => {
            setAberto(false);
            if (!contato && abrirFichaAoCriar) router.push(`/cadastros/contatos/${id}`);
          }}
        />
      </Modal>
    </>
  );
}

// ---------- Evento ----------

export type EventoEdicao = {
  id: string;
  nome: string;
  serie: string | null;
  edicao: number | null;
  descricao: string | null;
  publicoAlvo: string[];
  dataInicio: string;
  dataFim: string | null;
};

/** Sugestões dos campos do evento: séries e públicos-alvo já usados. */
export type SugestoesEvento = { series: string[]; publicos: string[] };

/** Lista em etiquetas: Enter ou vírgula adiciona; sugere valores já usados. Envia "a, b, c" no campo `nome`. */
function CampoEtiquetas({ id, nome, inicial, sugestoes, erro }: { id: string; nome: string; inicial: string[]; sugestoes: string[]; erro?: string }) {
  const [itens, setItens] = useState(inicial);
  const [texto, setTexto] = useState("");
  const chave = (v: string) => normalizarBusca(v);
  const adicionar = (bruto: string) => {
    const novos = bruto.split(/[,;\n]/).map((v) => v.trim().replace(/\s+/g, " ")).filter(Boolean);
    if (novos.length === 0) return;
    setItens((atual) => {
      const r = [...atual];
      for (const n of novos) if (!r.some((x) => chave(x) === chave(n))) r.push(n);
      return r;
    });
    setTexto("");
  };
  const listaId = `${id}-sugestoes`;
  return (
    <div
      className={cx(
        "flex min-h-10 flex-wrap items-center gap-1.5 rounded-[10px] border bg-white px-2 py-1.5 focus-within:ring-2",
        erro ? "border-red-400 focus-within:ring-red-100" : "border-borda focus-within:border-marca-500 focus-within:ring-marca-100",
      )}
    >
      <input type="hidden" name={nome} value={itens.join(", ")} />
      <ul className="contents" aria-label="Itens adicionados">
        {itens.map((item) => (
          <li key={item} className="inline-flex items-center gap-1 rounded-full bg-marca-50 py-0.5 pl-2.5 pr-1 text-[13px] font-semibold text-marca-700">
            {item}
            <button
              type="button"
              aria-label={`Remover ${item}`}
              onClick={() => setItens((a) => a.filter((x) => x !== item))}
              className="flex size-6 items-center justify-center rounded-full hover:bg-marca-100"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <input
        id={id}
        list={listaId}
        value={texto}
        aria-invalid={erro ? true : undefined}
        placeholder={itens.length ? "Adicionar outro…" : "Ex.: Saúde ocupacional, SST, RH"}
        onChange={(e) => {
          const v = e.target.value;
          if (/[,;]/.test(v)) adicionar(v);
          else setTexto(v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            adicionar(texto);
          } else if (e.key === "Backspace" && !texto && itens.length) {
            setItens((a) => a.slice(0, -1));
          }
        }}
        onBlur={() => adicionar(texto)}
        className="min-h-8 min-w-40 flex-1 border-0 bg-transparent px-1 text-sm focus:outline-none"
      />
      <datalist id={listaId}>
        {sugestoes
          .filter((s) => !itens.some((x) => chave(x) === chave(s)))
          .map((s) => (
            <option key={s} value={s} />
          ))}
      </datalist>
    </div>
  );
}

export function FormEvento({ evento, sugestoes, aoSalvar }: { evento?: EventoEdicao; sugestoes: SugestoesEvento; aoSalvar?: () => void }) {
  const { erros, pendente, enviar } = useAcao();
  const prefixo = evento ? `evento-${evento.id}` : "evento-novo";
  const id = (n: string) => `${prefixo}-${n}`;
  return (
    <form
      noValidate
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const dados = lerFormulario(e.currentTarget);
        enviar(() => acaoSalvarEvento(evento?.id ?? null, dados), { onSucesso: () => aoSalvar?.() });
      }}
    >
      <Campo rotulo="Nome do evento" nome="nome" id={id("nome")} erro={erros.nome} className="sm:col-span-2">
        <Entrada name="nome" id={id("nome")} defaultValue={evento?.nome} erro={erros.nome} placeholder="Ex.: COMSAÚDE 2027" />
      </Campo>
      <Campo
        rotulo="Série do evento"
        nome="serie"
        id={id("serie")}
        erro={erros.serie}
        dica="Agrupa as edições de cada ano (ex.: COMSAÚDE). Escolha uma existente ou digite uma nova."
      >
        <Entrada name="serie" id={id("serie")} list={id("series")} defaultValue={evento?.serie ?? ""} erro={erros.serie} autoComplete="off" />
        <datalist id={id("series")}>
          {sugestoes.series.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </Campo>
      <Campo rotulo="Edição (ano)" nome="edicao" id={id("edicao")} erro={erros.edicao} dica="Em branco, usa o ano da data de início.">
        <Entrada name="edicao" id={id("edicao")} inputMode="numeric" defaultValue={evento?.edicao ?? ""} erro={erros.edicao} placeholder="Ex.: 2027" />
      </Campo>
      <Campo rotulo="Data de início" nome="dataInicio" id={id("dataInicio")} erro={erros.dataInicio}>
        <Entrada name="dataInicio" id={id("dataInicio")} type="date" defaultValue={evento?.dataInicio} erro={erros.dataInicio} />
      </Campo>
      <Campo rotulo="Data de término" nome="dataFim" id={id("dataFim")} erro={erros.dataFim} dica="Opcional, para eventos de mais de um dia.">
        <Entrada name="dataFim" id={id("dataFim")} type="date" defaultValue={evento?.dataFim ?? ""} erro={erros.dataFim} />
      </Campo>
      <Campo
        rotulo="Público-alvo"
        nome="publicoAlvo"
        id={id("publicoAlvo")}
        erro={erros.publicoAlvo}
        dica="Enter ou vírgula para adicionar. Servirá para montar o mailing do público do evento."
        className="sm:col-span-2"
      >
        <CampoEtiquetas id={id("publicoAlvo")} nome="publicoAlvo" inicial={evento?.publicoAlvo ?? []} sugestoes={sugestoes.publicos} erro={erros.publicoAlvo} />
      </Campo>
      <Campo rotulo="Descrição" nome="descricao" id={id("descricao")} erro={erros.descricao} className="sm:col-span-2">
        <AreaTexto
          name="descricao"
          id={id("descricao")}
          rows={4}
          defaultValue={evento?.descricao ?? ""}
          erro={erros.descricao}
          placeholder="Tema, formato, local, palestrantes, diferenciais…"
        />
      </Campo>
      <div className="flex justify-end sm:col-span-2">
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar evento"}
        </Botao>
      </div>
    </form>
  );
}

export function BotaoEvento({ evento, sugestoes, rotulo }: { evento?: EventoEdicao; sugestoes: SugestoesEvento; rotulo?: string }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      {evento ? (
        <Botao variante={rotulo ? "secundario" : "fantasma"} pequeno={!rotulo} onClick={() => setAberto(true)} aria-label={rotulo ? undefined : `Editar ${evento.nome}`}>
          {rotulo ?? "Editar"}
        </Botao>
      ) : (
        <Botao onClick={() => setAberto(true)}>+ Novo evento</Botao>
      )}
      <Modal aberto={aberto} aoFechar={() => setAberto(false)} titulo={evento ? "Editar evento" : "Novo evento"} largura="max-w-2xl">
        <FormEvento evento={evento} sugestoes={sugestoes} aoSalvar={() => setAberto(false)} />
      </Modal>
    </>
  );
}
