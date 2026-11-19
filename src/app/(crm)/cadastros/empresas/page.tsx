import Link from "next/link";
import { buscarEmpresas } from "@/modules/cadastros/servico";
import { BotaoNovaEmpresa } from "@/modules/cadastros/componentes/formularios";
import { Busca } from "@/shared/ui/Busca";
import { AbasCadastros } from "@/modules/cadastros/componentes/AbasCadastros";
import { Vazio } from "@/shared/ui/componentes";
import { formatarData } from "@/shared/datas";
import { formatarCnpj } from "@/shared/documentos";
import { ROTULO_PORTE, ROTULO_RAMO, type Porte, type Ramo } from "@/modules/cadastros/dominio";

export default async function PaginaEmpresas({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const empresas = await buscarEmpresas(q);
  return (
    <div>
      <AbasCadastros />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Busca valor={q} placeholder="Buscar empresa por nome ou CNPJ" rotulo="Buscar empresa" />
        <BotaoNovaEmpresa />
      </div>
      {empresas.length === 0 ? (
        <Vazio>Nenhuma empresa encontrada.</Vazio>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-borda bg-white shadow-[0_1px_2px_rgba(20,33,43,0.04)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-borda bg-[#F7F9FA] text-xs uppercase tracking-wide text-suave">
              <tr>
                <th className="px-4 py-3 font-semibold">Empresa</th>
                <th className="px-4 py-3 font-semibold">CNPJ</th>
                <th className="px-4 py-3 font-semibold">Perfil</th>
                <th className="px-4 py-3 font-semibold">Contatos</th>
                <th className="px-4 py-3 font-semibold">Cadastrada em</th>
              </tr>
            </thead>
            <tbody>
              {empresas.map((e) => (
                <tr key={e.id} className="border-b border-[#EEF1F3] last:border-0 hover:bg-[#F7F9FA]">
                  <td className="px-4 py-3">
                    <Link href={`/cadastros/empresas/${e.id}`} className="font-medium text-marca-700 hover:underline">
                      {e.nome}
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-suave">{e.cnpj ? formatarCnpj(e.cnpj) : "—"}</td>
                  <td className="px-4 py-3 text-suave">
                    {[e.porte && ROTULO_PORTE[e.porte as Porte], e.ramo && ROTULO_RAMO[e.ramo as Ramo], e.setorAtividade]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3">{e._count.contatos}</td>
                  <td className="px-4 py-3 text-suave">{formatarData(e.criadoEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
