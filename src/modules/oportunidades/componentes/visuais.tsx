/** Elementos visuais de Oportunidades sem estado (servidor ou cliente). */
import { Etiqueta } from "@/shared/ui/componentes";
import { rotuloEtapa, rotuloTipoVenda, ROTULO_PAGAMENTO, type StatusPagamento } from "../dominio";

const TOM_ETAPA: Record<string, "neutro" | "info" | "marca" | "alerta" | "sucesso" | "perigo"> = {
  NOVO: "neutro",
  EM_ATENDIMENTO: "info",
  PROPOSTA_ENVIADA: "marca",
  EM_NEGOCIACAO: "alerta",
  FECHADO: "sucesso",
  PERDIDO: "perigo",
};

export function EtiquetaEtapa({ etapa }: { etapa: string }) {
  return <Etiqueta tom={TOM_ETAPA[etapa] ?? "neutro"}>{rotuloEtapa(etapa)}</Etiqueta>;
}

export function EtiquetaTipo({ tipo }: { tipo: string }) {
  return <Etiqueta tom={tipo === "PATROCINIO" ? "info" : "neutro"}>{rotuloTipoVenda(tipo)}</Etiqueta>;
}

export function EtiquetaPagamento({ status }: { status: string | null }) {
  if (!status) return null;
  return (
    <Etiqueta tom={status === "PAGO" ? "sucesso" : "alerta"}>
      Pagamento {ROTULO_PAGAMENTO[status as StatusPagamento]?.toLowerCase() ?? status}
    </Etiqueta>
  );
}

export function EtiquetaSemProximaAcao() {
  return <Etiqueta tom="perigo">Sem próxima ação</Etiqueta>;
}
