import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { acaoSair } from "@/modules/acesso/acoes";
import { usuarioAtual } from "@/modules/acesso/servico";
import { contarRetornosAtrasados } from "@/modules/agenda/servico";
import { ETAPAS_ABERTAS } from "@/modules/oportunidades/dominio";
import { contarOportunidades } from "@/modules/oportunidades/servico";
import { Avatar } from "@/shared/ui/componentes";
import { IconeMais, SimboloCentralConsult } from "@/shared/ui/icones";
import { Navegacao } from "@/shared/ui/Navegacao";

/** Layout das telas do CRM (exige login): menu lateral com marca, navegação e usuário logado. */
export default async function LayoutCrm({ children }: { children: ReactNode }) {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");
  const [abertas, atrasadas] = await Promise.all([contarOportunidades({}, ETAPAS_ABERTAS), contarRetornosAtrasados({})]);
  return (
    <div className="md:flex md:min-h-screen">
      <aside className="border-b border-borda bg-white px-4 py-3 md:w-[232px] md:shrink-0 md:border-r md:border-b-0 md:py-6">
        <div className="flex flex-col gap-3 md:sticky md:top-6 md:min-h-[calc(100vh-3rem)] md:gap-6">
          <Link href="/" className="flex items-center gap-2.5 px-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-marinho">
              <SimboloCentralConsult tamanho={24} />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="font-titulo text-[15px] font-bold text-marinho">Central Consult</span>
              <span className="text-xs text-suave">CRM Comercial</span>
            </span>
          </Link>
          <Link
            href="/oportunidades/nova"
            className="flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-ouro px-3 text-sm font-bold text-marinho shadow-sm hover:bg-ouro-escuro"
          >
            <IconeMais /> Nova oportunidade
          </Link>
          <Navegacao abertas={abertas} atrasadas={atrasadas} />
          <div className="flex items-center gap-2.5 border-t border-borda pt-3 md:mt-auto md:px-1 md:pt-4">
            <Avatar nome={usuario.nome} tamanho="p" className="h-8! w-8!" />
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate text-[13px] font-semibold" data-testid="usuario-logado">
                {usuario.nome}
              </span>
              <span className="truncate text-xs text-suave">{usuario.email}</span>
            </div>
            <form action={acaoSair}>
              <button type="submit" className="min-h-9 rounded-lg px-2 text-[13px] font-semibold text-marca-700 hover:bg-marca-50">
                Sair
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-7">{children}</main>
    </div>
  );
}
