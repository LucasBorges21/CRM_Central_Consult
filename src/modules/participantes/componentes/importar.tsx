"use client";
/** Importação da planilha padrão de inscritos: prévia (simulação) e depois confirmação. */
import { useRef, useState } from "react";
import { Botao, Campo } from "@/shared/ui/componentes";
import { Modal, useAcao } from "@/shared/ui/interativos";
import { acaoImportarPlanilha } from "../acoes";

type Previa = {
  aba: string;
  linhas: number;
  problemas: { linha: number; motivo: string }[];
  novos: number;
  jaInscritos: number;
  contatosNovos: number;
  contatosExistentes: number;
  duplicadosNaPlanilha: number;
};

export function BotaoImportarPlanilha({ eventoId, nomeEvento }: { eventoId: string; nomeEvento: string }) {
  const [aberto, setAberto] = useState(false);
  const [previa, setPrevia] = useState<Previa | null>(null);
  const arquivo = useRef<FormData | null>(null);
  const { erros, pendente, enviar } = useAcao();
  const fechar = () => {
    setAberto(false);
    setPrevia(null);
    arquivo.current = null;
  };

  return (
    <>
      <Botao variante="secundario" onClick={() => setAberto(true)}>
        Importar planilha
      </Botao>
      <Modal aberto={aberto} aoFechar={fechar} titulo={`Importar participantes · ${nomeEvento}`} largura="max-w-xl">
        {!previa ? (
          <form
            noValidate
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const dados = new FormData(e.currentTarget);
              arquivo.current = dados;
              enviar(() => acaoImportarPlanilha(eventoId, dados, false), { onSucesso: (d) => d && setPrevia(d as Previa) });
            }}
          >
            <p className="text-sm text-tinta-2">
              Use a planilha padrão de inscritos (aba <strong>Participantes</strong>: Nome, Nome para crachá, Empresa, Cargo, DDD/Telefone,
              DDD/Cel, E-mail, Participação, Observações, Confirmação e Presença). Nada é gravado antes da sua confirmação.
            </p>
            <Campo rotulo="Planilha (.xlsx)" nome="planilha" id="planilha-participantes" erro={erros.planilha}>
              <input
                type="file"
                name="planilha"
                id="planilha-participantes"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-marca-50 file:px-3 file:py-2 file:font-semibold file:text-marca-700"
              />
            </Campo>
            <div className="flex justify-end gap-2">
              <Botao variante="secundario" onClick={fechar}>
                Cancelar
              </Botao>
              <Botao type="submit" disabled={pendente}>
                {pendente ? "Lendo…" : "Pré-visualizar"}
              </Botao>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-tinta-2">
              Aba <strong>{previa.aba}</strong> · {previa.linhas} linha(s) válida(s).
            </p>
            <dl className="grid grid-cols-2 gap-3" aria-label="Prévia da importação">
              {[
                ["Serão inscritos", previa.novos],
                ["Já estavam inscritos", previa.jaInscritos],
                ["Contatos novos", previa.contatosNovos],
                ["Contatos já existentes", previa.contatosExistentes],
              ].map(([r, v]) => (
                <div key={r as string} className="rounded-xl bg-[#F4F6FB] p-3">
                  <dt className="text-xs text-suave">{r}</dt>
                  <dd className="font-titulo text-xl font-bold">{v}</dd>
                </div>
              ))}
            </dl>
            {(previa.problemas.length > 0 || previa.duplicadosNaPlanilha > 0) && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-900">
                <p className="font-semibold">
                  {previa.problemas.length} linha(s) com problema
                  {previa.duplicadosNaPlanilha > 0 && ` · ${previa.duplicadosNaPlanilha} e-mail(s) repetido(s) na planilha (considerado só o primeiro)`}
                </p>
                <ul className="mt-1 max-h-40 list-disc overflow-y-auto pl-5">
                  {previa.problemas.map((p, i) => (
                    <li key={i}>
                      Linha {p.linha}: {p.motivo}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Botao variante="secundario" onClick={() => setPrevia(null)}>
                Escolher outro arquivo
              </Botao>
              <Botao
                disabled={pendente || previa.novos === 0}
                onClick={() => arquivo.current && enviar(() => acaoImportarPlanilha(eventoId, arquivo.current!, true), { onSucesso: fechar })}
              >
                {pendente ? "Importando…" : `Importar ${previa.novos} participante(s)`}
              </Botao>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
