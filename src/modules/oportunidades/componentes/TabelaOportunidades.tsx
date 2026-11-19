import Link from "next/link";
import { formatarReais } from "@/shared/dinheiro";
import { nomeCompleto } from "@/modules/cadastros/dominio";
import { Vazio } from "@/shared/ui/componentes";
import { valorDeExibicao } from "../dominio";
import { EtiquetaEtapa, EtiquetaPagamento, EtiquetaTipo } from "./visuais";

type Linha = {
  id: string;
  titulo: string;
  etapa: string;
  tipoVenda: string;
  valorEstimadoCentavos: number;
  valorFinalCentavos: number | null;
  statusPagamento: string | null;
  evento: { nome: string };
  contato: { nome: string; sobrenome?: string | null };
  responsavel: { nome: string };
};

export function TabelaOportunidades({ oportunidades }: { oportunidades: Linha[] }) {
  if (oportunidades.length === 0) return <Vazio>Nenhuma oportunidade vinculada.</Vazio>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-borda text-xs uppercase tracking-wide text-suave">
          <tr>
            <th className="py-2 pr-4 font-medium">Oportunidade</th>
            <th className="py-2 pr-4 font-medium">Evento</th>
            <th className="py-2 pr-4 font-medium">Tipo</th>
            <th className="py-2 pr-4 font-medium">Contato</th>
            <th className="py-2 pr-4 font-medium">Etapa</th>
            <th className="py-2 pr-4 text-right font-medium">Valor</th>
            <th className="py-2 font-medium">Responsável</th>
          </tr>
        </thead>
        <tbody>
          {oportunidades.map((o) => (
            <tr key={o.id} className="border-b border-[#EEF1F3] last:border-0">
              <td className="py-2 pr-4">
                <Link href={`/oportunidades/${o.id}`} className="font-medium text-marca-700 hover:underline">
                  {o.titulo}
                </Link>
              </td>
              <td className="py-2 pr-4">{o.evento.nome}</td>
              <td className="py-2 pr-4">
                <EtiquetaTipo tipo={o.tipoVenda} />
              </td>
              <td className="py-2 pr-4">{nomeCompleto(o.contato)}</td>
              <td className="py-2 pr-4">
                <div className="flex flex-wrap gap-1">
                  <EtiquetaEtapa etapa={o.etapa} />
                  <EtiquetaPagamento status={o.statusPagamento} />
                </div>
              </td>
              <td className="py-2 pr-4 text-right tabular-nums">{formatarReais(valorDeExibicao(o).valor)}</td>
              <td className="py-2">{o.responsavel.nome}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
