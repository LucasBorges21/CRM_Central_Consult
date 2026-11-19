"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/shared/ui/componentes";

const ABAS = [
  { href: "/cadastros/empresas", rotulo: "Empresas" },
  { href: "/cadastros/eventos", rotulo: "Eventos" },
];

/** Cabeçalho da área Empresas e eventos, com abas. */
export function AbasCadastros() {
  const caminho = usePathname();
  return (
    <div className="mb-6">
      <h1 className="font-titulo text-[28px] font-bold tracking-tight text-tinta">Empresas e eventos</h1>
      <p className="mt-1 text-sm text-suave">Perfil das empresas clientes e calendário de eventos da Central Consult.</p>
      <nav aria-label="Cadastros" className="mt-4 inline-flex gap-1 rounded-xl border border-borda bg-white p-1">
        {ABAS.map((a) => {
          const ativo = caminho.startsWith(a.href);
          return (
            <Link
              key={a.href}
              href={a.href}
              aria-current={ativo ? "page" : undefined}
              className={cx(
                "flex min-h-9 items-center rounded-lg px-4 text-sm font-semibold",
                ativo ? "bg-marca-600 text-white" : "text-tinta-2 hover:bg-[#F4F6FB]",
              )}
            >
              {a.rotulo}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
