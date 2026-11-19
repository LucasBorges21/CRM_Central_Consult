"use client";
import { useState } from "react";
import { centavosParaCampo } from "@/shared/dinheiro";
import { AreaTexto, Botao, Campo, cx, Entrada } from "@/shared/ui/componentes";
import { lerFormulario, Modal, useAcao } from "@/shared/ui/interativos";
import { IconeMais } from "@/shared/ui/icones";
import { acaoAtualizarInscricao, acaoInscreverParticipante } from "../acoes";
import { MODALIDADES, ROTULO_MODALIDADE, ROTULO_TIPO_INSCRICAO, TIPOS_INSCRICAO } from "../dominio";

export type InscricaoEdicao = {
  id: string;
  nomeCracha: string;
  modalidade: string;
  tipoInscricao: string;
  cortesiaConcedidaPor: string | null;
  lote: string | null;
  descontoPercentual: number | null;
  valorCentavos: number | null;
  observacoes: string | null;
};

function Segmentado({ nome, legenda, opcoes, valor, aoMudar }: { nome: string; legenda: string; opcoes: { valor: string; rotulo: string }[]; valor: string; aoMudar?: (v: string) => void }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-[13px] font-semibold text-tinta-2">{legenda}</legend>
      <div className="flex flex-wrap gap-1 rounded-[10px] bg-[#F4F6FB] p-1">
        {opcoes.map((o) => (
          <label
            key={o.valor}
            className="flex min-h-9 flex-1 cursor-pointer items-center justify-center rounded-lg px-3 text-[13px] font-medium text-tinta-2 has-checked:bg-white has-checked:font-bold has-checked:text-marca-700 has-checked:shadow-sm has-focus-visible:ring-2 has-focus-visible:ring-marca-500"
          >
            <input type="radio" name={nome} value={o.valor} defaultChecked={o.valor === valor} onChange={() => aoMudar?.(o.valor)} className="sr-only" />
            {o.rotulo}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Campos da inscrição (crachá, modalidade, cortesia/pagante). */
function CamposInscricao({ inscricao, erros, prefixo }: { inscricao?: InscricaoEdicao; erros: Record<string, string>; prefixo: string }) {
  const [tipo, setTipo] = useState(inscricao?.tipoInscricao ?? "CORTESIA");
  const id = (n: string) => `${prefixo}-${n}`;
  return (
    <>
      <Campo rotulo="Nome para o crachá" nome="nomeCracha" id={id("nomeCracha")} erro={erros.nomeCracha} dica="Como deve sair impresso. Ex.: ANA RIBEIRO" className="sm:col-span-2">
        <Entrada name="nomeCracha" id={id("nomeCracha")} defaultValue={inscricao?.nomeCracha} erro={erros.nomeCracha} className="uppercase" />
      </Campo>
      <Segmentado
        nome="modalidade"
        legenda="Participação"
        valor={inscricao?.modalidade ?? "PRESENCIAL"}
        opcoes={MODALIDADES.map((m) => ({ valor: m, rotulo: ROTULO_MODALIDADE[m] }))}
      />
      <Segmentado
        nome="tipoInscricao"
        legenda="Tipo de inscrição"
        valor={tipo}
        aoMudar={setTipo}
        opcoes={TIPOS_INSCRICAO.map((t) => ({ valor: t, rotulo: ROTULO_TIPO_INSCRICAO[t] }))}
      />
      {tipo === "CORTESIA" ? (
        <Campo rotulo="Cortesia concedida por" nome="cortesiaConcedidaPor" id={id("cortesia")} erro={erros.cortesiaConcedidaPor} dica="Quem ofereceu a cortesia (pessoa, parceiro ou patrocinador)." className="sm:col-span-2">
          <Entrada name="cortesiaConcedidaPor" id={id("cortesia")} defaultValue={inscricao?.cortesiaConcedidaPor ?? ""} erro={erros.cortesiaConcedidaPor} />
        </Campo>
      ) : (
        <div className="grid gap-3 sm:col-span-2 sm:grid-cols-3">
          <Campo rotulo="Lote / tabela" nome="lote" id={id("lote")} erro={erros.lote}>
            <Entrada name="lote" id={id("lote")} defaultValue={inscricao?.lote ?? ""} placeholder="Ex.: 1ª Tabela" erro={erros.lote} />
          </Campo>
          <Campo rotulo="Desconto (%)" nome="descontoPercentual" id={id("desconto")} erro={erros.descontoPercentual}>
            <Entrada name="descontoPercentual" id={id("desconto")} inputMode="numeric" defaultValue={inscricao?.descontoPercentual ?? ""} erro={erros.descontoPercentual} />
          </Campo>
          <Campo rotulo="Valor (R$)" nome="valor" id={id("valor")} erro={erros.valor}>
            <Entrada name="valor" id={id("valor")} inputMode="decimal" defaultValue={centavosParaCampo(inscricao?.valorCentavos)} erro={erros.valor} />
          </Campo>
        </div>
      )}
      <Campo rotulo="Observações" nome="observacoes" id={id("observacoes")} erro={erros.observacoes} className="sm:col-span-2">
        <AreaTexto name="observacoes" id={id("observacoes")} rows={2} defaultValue={inscricao?.observacoes ?? ""} erro={erros.observacoes} />
      </Campo>
    </>
  );
}

export function BotaoNovoParticipante({ eventoId }: { eventoId: string }) {
  const [aberto, setAberto] = useState(false);
  const { erros, pendente, enviar } = useAcao();
  return (
    <>
      <Botao onClick={() => setAberto(true)}>
        <IconeMais tamanho={16} /> Adicionar participante
      </Botao>
      <Modal aberto={aberto} aoFechar={() => setAberto(false)} titulo="Adicionar participante" largura="max-w-2xl">
        <form
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const dados = lerFormulario(e.currentTarget);
            enviar(() => acaoInscreverParticipante(eventoId, dados), {
              onSucesso: () => setAberto(false),
            });
          }}
        >
          <p className="text-[13px] text-suave sm:col-span-2">
            Se o e-mail já existir em Contatos, a pessoa é reaproveitada (com empresa e histórico). Senão, o contato e a empresa são criados.
          </p>
          <Campo rotulo="Nome completo" nome="nomeCompleto" id="part-nome" erro={erros.nomeCompleto} className="sm:col-span-2">
            <Entrada
              name="nomeCompleto"
              id="part-nome"
              erro={erros.nomeCompleto}
              onBlur={(e) => {
                const crachaInput = e.currentTarget.form?.elements.namedItem("nomeCracha") as HTMLInputElement | null;
                if (crachaInput && !crachaInput.value) {
                  const sugestao = e.currentTarget.value.trim().split(/\s+/).slice(0, 2).join(" ").toUpperCase();
                  crachaInput.value = sugestao;
                }
              }}
            />
          </Campo>
          <Campo rotulo="E-mail" nome="email" id="part-email" erro={erros.email}>
            <Entrada name="email" id="part-email" type="email" erro={erros.email} />
          </Campo>
          <Campo rotulo="Celular / WhatsApp" nome="celular" id="part-celular" erro={erros.celular}>
            <Entrada name="celular" id="part-celular" inputMode="tel" placeholder="(11) 99999-0000" erro={erros.celular} />
          </Campo>
          <Campo rotulo="Empresa" nome="empresa" id="part-empresa" erro={erros.empresa}>
            <Entrada name="empresa" id="part-empresa" erro={erros.empresa} />
          </Campo>
          <Campo rotulo="Cargo" nome="cargo" id="part-cargo" erro={erros.cargo}>
            <Entrada name="cargo" id="part-cargo" erro={erros.cargo} />
          </Campo>
          <Campo rotulo="Telefone fixo" nome="telefone" id="part-telefone" erro={erros.telefone} className="sm:col-span-2">
            <Entrada name="telefone" id="part-telefone" inputMode="tel" erro={erros.telefone} />
          </Campo>
          <div className="border-t border-[#EEF1F3] sm:col-span-2" aria-hidden />
          <CamposInscricao erros={erros} prefixo="part" />
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Botao variante="secundario" onClick={() => setAberto(false)}>
              Cancelar
            </Botao>
            <Botao type="submit" disabled={pendente}>
              {pendente ? "Salvando…" : "Inscrever"}
            </Botao>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function BotaoEditarInscricao({ eventoId, inscricao, nome }: { eventoId: string; inscricao: InscricaoEdicao; nome: string }) {
  const [aberto, setAberto] = useState(false);
  const { erros, pendente, enviar } = useAcao();
  return (
    <>
      <Botao variante="fantasma" pequeno onClick={() => setAberto(true)} aria-label={`Editar inscrição de ${nome}`}>
        Editar
      </Botao>
      <Modal aberto={aberto} aoFechar={() => setAberto(false)} titulo={`Inscrição de ${nome}`} largura="max-w-2xl">
        <form
          noValidate
          className={cx("grid gap-4 sm:grid-cols-2")}
          onSubmit={(e) => {
            e.preventDefault();
            const dados = lerFormulario(e.currentTarget);
            enviar(() => acaoAtualizarInscricao(eventoId, inscricao.id, dados), { onSucesso: () => setAberto(false) });
          }}
        >
          <CamposInscricao inscricao={inscricao} erros={erros} prefixo={`edit-${inscricao.id}`} />
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Botao variante="secundario" onClick={() => setAberto(false)}>
              Cancelar
            </Botao>
            <Botao type="submit" disabled={pendente}>
              Salvar inscrição
            </Botao>
          </div>
        </form>
      </Modal>
    </>
  );
}
