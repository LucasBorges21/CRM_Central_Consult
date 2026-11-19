"use client";
/**
 * Mudança de etapa — usada pelo cartão do Funil e pela tela de detalhe.
 * Ambos chamam a mesma ação (acaoMudarEtapa → fluxo mudarEtapa), que aplica a regra do funil no servidor.
 */
import { useState } from "react";
import { acaoMudarEtapa } from "@/fluxos/acoes";
import { centavosParaCampo } from "@/shared/dinheiro";
import { AreaTexto, Botao, Campo, cx, Entrada } from "@/shared/ui/componentes";
import { IconeCheck } from "@/shared/ui/icones";
import { lerFormulario, Modal, useAcao } from "@/shared/ui/interativos";
import { ETAPAS, ETAPAS_ABERTAS, estaAberta, ROTULO_ETAPA, type Etapa } from "../dominio";

/**
 * modo "seletor" (padrão): select — cartão do Funil.
 * modo "passos": barra com as etapas abertas, clicáveis — detalhe da oportunidade.
 * modo "acoes": botões Fechar venda / Marcar como perdida (ou Reabrir) — detalhe da oportunidade.
 */
export function SeletorEtapa({
  oportunidadeId,
  titulo,
  etapaAtual,
  valorEstimadoCentavos,
  compacto,
  modo = "seletor",
  infoEtapas = {},
}: {
  oportunidadeId: string;
  titulo: string;
  etapaAtual: string;
  valorEstimadoCentavos: number;
  compacto?: boolean;
  modo?: "seletor" | "passos" | "acoes";
  /** Texto curto exibido sob cada etapa no modo "passos" (ex.: data de entrada). */
  infoEtapas?: Partial<Record<Etapa, string>>;
}) {
  const [pedido, setPedido] = useState<Etapa | null>(null);
  const { erros, setErros, pendente, enviar } = useAcao();

  function escolher(etapa: Etapa) {
    if (etapa === etapaAtual) return;
    setErros({});
    if (etapa === "PERDIDO" || etapa === "FECHADO") {
      setPedido(etapa);
      return;
    }
    enviar(() => acaoMudarEtapa(oportunidadeId, { etapa }));
  }

  const aberta = estaAberta(etapaAtual);
  const indiceAtual = ETAPAS_ABERTAS.indexOf(etapaAtual as Etapa);

  return (
    <>
      {modo === "seletor" && (
        <>
          <label className={compacto ? "sr-only" : "mb-1 block text-sm font-medium text-tinta-2"} htmlFor={`etapa-${oportunidadeId}`}>
            {compacto ? `Mudar etapa de ${titulo}` : "Etapa"}
          </label>
          <select
            id={`etapa-${oportunidadeId}`}
            value={etapaAtual}
            disabled={pendente}
            onChange={(e) => escolher(e.target.value as Etapa)}
            className={
              compacto
                ? "w-full rounded-lg border border-borda bg-[#F7F9FA] px-2 py-1.5 text-xs font-medium text-tinta-2"
                : "w-full rounded-[10px] border border-borda bg-white px-3 py-2.5 text-sm font-semibold"
            }
          >
            {ETAPAS.map((e) => (
              <option key={e} value={e}>
                {ROTULO_ETAPA[e]}
              </option>
            ))}
          </select>
        </>
      )}

      {modo === "passos" && (
        <ol aria-label="Etapas da negociação" className="grid gap-1.5 sm:grid-cols-4">
          {ETAPAS_ABERTAS.map((e, i) => {
            const estado = !aberta ? "feito" : i < indiceAtual ? "feito" : i === indiceAtual ? "atual" : "futuro";
            return (
              <li key={e}>
                <button
                  type="button"
                  disabled={pendente || e === etapaAtual}
                  aria-current={estado === "atual" ? "step" : undefined}
                  onClick={() => escolher(e)}
                  className={cx(
                    "flex w-full items-center gap-2.5 rounded-xl px-3.5 py-3 text-left transition-colors disabled:cursor-default",
                    estado === "feito" && "bg-marca-50 text-marca-800 hover:bg-marca-100",
                    estado === "atual" && "bg-marca-600 text-white shadow-[0_4px_12px_rgba(63,99,199,0.25)]",
                    estado === "futuro" && "border border-dashed border-[#D5DCE1] bg-[#F7F9FA] text-tinta-2 hover:border-marca-200",
                  )}
                >
                  <span
                    className={cx(
                      "flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      estado === "feito" && "bg-marca-600 text-white",
                      estado === "atual" && "bg-white text-marca-700",
                      estado === "futuro" && "border border-[#D5DCE1] bg-white text-suave",
                    )}
                    aria-hidden
                  >
                    {estado === "feito" ? <IconeCheck tamanho={14} /> : i + 1}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-semibold">{ROTULO_ETAPA[e]}</span>
                    <span className="truncate text-xs opacity-85">
                      {infoEtapas[e] ?? (estado === "futuro" ? "Mover para esta etapa" : "")}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {modo === "acoes" && (
        <div className="flex flex-wrap gap-2">
          {aberta ? (
            <>
              <Botao variante="perigo" disabled={pendente} onClick={() => escolher("PERDIDO")}>
                Marcar como perdida
              </Botao>
              <Botao variante="sucesso" disabled={pendente} onClick={() => escolher("FECHADO")}>
                Fechar venda
              </Botao>
            </>
          ) : (
            <Botao variante="secundario" disabled={pendente} onClick={() => escolher("EM_NEGOCIACAO")}>
              Reabrir negociação
            </Botao>
          )}
        </div>
      )}

      <Modal
        aberto={pedido !== null}
        aoFechar={() => setPedido(null)}
        titulo={pedido === "PERDIDO" ? "Marcar como perdida" : "Fechar venda"}
      >
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const dados = lerFormulario(e.currentTarget);
            enviar(() => acaoMudarEtapa(oportunidadeId, { ...dados, etapa: pedido }), {
              onSucesso: () => setPedido(null),
            });
          }}
        >
          <p className="text-sm text-suave">{titulo}</p>
          {pedido === "PERDIDO" ? (
            <Campo rotulo="Motivo da perda" nome="motivoPerda" erro={erros.motivoPerda}>
              <AreaTexto name="motivoPerda" erro={erros.motivoPerda} placeholder="Ex.: orçamento já comprometido" />
            </Campo>
          ) : (
            <Campo
              rotulo="Valor final (R$)"
              nome="valorFinal"
              erro={erros.valorFinal}
              dica="O pagamento começa como Pendente e pode ser atualizado depois."
            >
              <Entrada
                name="valorFinal"
                inputMode="decimal"
                defaultValue={centavosParaCampo(valorEstimadoCentavos)}
                erro={erros.valorFinal}
              />
            </Campo>
          )}
          {erros.etapa && <p className="text-sm text-red-700">{erros.etapa}</p>}
          <div className="flex justify-end gap-2">
            <Botao variante="secundario" onClick={() => setPedido(null)}>
              Cancelar
            </Botao>
            <Botao type="submit" variante={pedido === "PERDIDO" ? "perigo" : "primario"} disabled={pendente}>
              {pedido === "PERDIDO" ? "Confirmar perda" : "Confirmar fechamento"}
            </Botao>
          </div>
        </form>
      </Modal>
    </>
  );
}
