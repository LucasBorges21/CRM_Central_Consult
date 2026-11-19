/** Elementos visuais de contatos (sem estado; servidor ou cliente). */
import { chaveDataSP } from "@/shared/datas";
import { formatarTelefone } from "@/shared/documentos";
import { Avatar as AvatarBase } from "@/shared/ui/componentes";
import { ROTULO_TIPO_TELEFONE, type TipoTelefone } from "../dominio";
import type { ContatoEdicao, EventoEdicao } from "./formularios";

export function Avatar({ nome, grande }: { nome: string; grande?: boolean }) {
  return <AvatarBase nome={nome} tamanho={grande ? "g" : "m"} />;
}

export function IconeLinkedin({ url, nome }: { url: string; nome: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`LinkedIn de ${nome}`}
      title="Abrir LinkedIn"
      className="inline-flex h-6 w-6 items-center justify-center rounded bg-[#0a66c2] text-[11px] font-bold text-white hover:opacity-90"
    >
      in
    </a>
  );
}

export function rotuloTipoTelefone(tipo: string) {
  return ROTULO_TIPO_TELEFONE[tipo as TipoTelefone] ?? tipo;
}

export function Telefone({ tipo, numero, principal }: { tipo: string; numero: string; principal: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      {principal ? (
        <span className="text-amber-500" title="Telefone principal" aria-label="Principal">
          ★
        </span>
      ) : null}
      <span className="text-suave">{rotuloTipoTelefone(tipo)}</span>
      <a href={`tel:${numero.replace(/\D/g, "")}`} className="font-medium text-tinta hover:text-marca-700">
        {formatarTelefone(numero)}
      </a>
    </span>
  );
}

/** Converte o registro do banco para o formato do formulário de edição. */
export function contatoParaEdicao(c: {
  id: string;
  nome: string;
  sobrenome: string | null;
  cpf: string | null;
  rg: string | null;
  dataNascimento: Date | null;
  cargo: string | null;
  departamento: string | null;
  setor: string | null;
  email: string;
  linkedin: string | null;
  recebeMalaDireta: boolean;
  observacoes: string | null;
  empresaId: string | null;
  empresa?: { nome: string } | null;
  telefones: { tipo: string; numero: string; principal: boolean }[];
}): ContatoEdicao {
  return {
    id: c.id,
    nome: c.nome,
    sobrenome: c.sobrenome,
    cpf: c.cpf,
    rg: c.rg,
    dataNascimento: c.dataNascimento ? chaveDataSP(c.dataNascimento) : null,
    cargo: c.cargo,
    departamento: c.departamento,
    setor: c.setor,
    email: c.email,
    linkedin: c.linkedin,
    recebeMalaDireta: c.recebeMalaDireta,
    observacoes: c.observacoes,
    empresaId: c.empresaId,
    empresaNome: c.empresa?.nome ?? null,
    telefones: c.telefones.map((t) => ({ tipo: t.tipo, numero: t.numero, principal: t.principal })),
  };
}

/** Evento do banco → valores do formulário de evento. */
export function eventoParaEdicao(e: {
  id: string;
  nome: string;
  serie: { nome: string } | null;
  edicao: number | null;
  descricao: string | null;
  publicoAlvo: { publicoAlvo: { nome: string } }[];
  dataInicio: Date;
  dataFim: Date | null;
}): EventoEdicao {
  return {
    id: e.id,
    nome: e.nome,
    serie: e.serie?.nome ?? null,
    edicao: e.edicao,
    descricao: e.descricao,
    publicoAlvo: e.publicoAlvo.map((p) => p.publicoAlvo.nome),
    dataInicio: chaveDataSP(e.dataInicio),
    dataFim: e.dataFim ? chaveDataSP(e.dataFim) : null,
  };
}
