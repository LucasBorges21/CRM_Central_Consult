import { formatarDataHora } from "@/shared/datas";
import { Etiqueta, Vazio } from "@/shared/ui/componentes";
import { rotuloCanal } from "../dominio";

type Registro = {
  id: string;
  data: Date;
  tipo: string;
  descricao: string;
  canal: string | null;
  resumo: string | null;
  combinado: string | null;
};

/** Linha do tempo (mais recente primeiro), com interações e mudanças de etapa. */
export function LinhaDoTempo({ registros }: { registros: Registro[] }) {
  if (registros.length === 0) return <Vazio>Nenhum registro ainda.</Vazio>;
  return (
    <ol className="relative flex flex-col gap-4 border-l border-borda pl-5" aria-label="Linha do tempo">
      {registros.map((r) => {
        const interacao = r.tipo === "INTERACAO";
        return (
          <li key={r.id} className="relative" data-tipo={r.tipo}>
            <span
              aria-hidden
              className={`absolute -left-[1.6rem] top-1 h-3 w-3 rounded-full border-2 border-white ${interacao ? "bg-marca-500" : "bg-slate-400"}`}
            />
            <div className="flex flex-wrap items-center gap-2 text-xs text-suave">
              <time>{formatarDataHora(r.data)}</time>
              {interacao ? <Etiqueta tom="marca">{rotuloCanal(r.canal)}</Etiqueta> : <Etiqueta>Mudança de etapa</Etiqueta>}
            </div>
            {interacao ? (
              <div className="mt-1 text-sm">
                <p className="text-tinta">{r.resumo}</p>
                {r.combinado && (
                  <p className="mt-1 text-suave">
                    <span className="font-medium text-tinta-2">Combinado:</span> {r.combinado}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-1 text-sm text-tinta">{r.descricao}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
