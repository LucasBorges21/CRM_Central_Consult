"use client";
import { Botao } from "@/shared/ui/componentes";
import { useAcao } from "@/shared/ui/interativos";
import { acaoAtualizarPagamento } from "../acoes";
import { ROTULO_PAGAMENTO, STATUS_PAGAMENTO } from "../dominio";

/** Atualiza somente o status do pagamento de uma venda fechada. */
export function FormPagamento({ oportunidadeId, status }: { oportunidadeId: string; status: string | null }) {
  const { erros, pendente, enviar } = useAcao();
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-tinta-2" id="rotulo-pagamento">
        Pagamento
      </p>
      <div role="group" aria-labelledby="rotulo-pagamento" className="flex gap-2">
        {STATUS_PAGAMENTO.map((s) => (
          <Botao
            key={s}
            variante={status === s ? "primario" : "secundario"}
            aria-pressed={status === s}
            disabled={pendente || status === s}
            onClick={() => enviar(() => acaoAtualizarPagamento(oportunidadeId, { statusPagamento: s }))}
            className="flex-1"
          >
            {ROTULO_PAGAMENTO[s]}
          </Botao>
        ))}
      </div>
      {erros.statusPagamento && <p className="mt-1 text-xs text-red-700">{erros.statusPagamento}</p>}
    </div>
  );
}
