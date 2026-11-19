"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cx } from "./componentes";
import { IconeAgenda, IconeContatos, IconeEmpresa, IconeFunil, IconePainel } from "./icones";

type Item = { href: string; rotulo: string; icone: ReactNode; ativo: (c: string) => boolean; contador?: number; alerta?: boolean };

export function Navegacao({ abertas, atrasadas }: { abertas: number; atrasadas: number }) {
  const caminho = usePathname();
  const itens: Item[] = [
    { href: "/", rotulo: "Painel", icone: <IconePainel />, ativo: (c) => c === "/" },
    {
      href: "/funil",
      rotulo: "Funil",
      icone: <IconeFunil />,
      ativo: (c) => c.startsWith("/funil") || c.startsWith("/oportunidades"),
      contador: abertas,
    },
    { href: "/agenda", rotulo: "Agenda", icone: <IconeAgenda />, ativo: (c) => c.startsWith("/agenda"), contador: atrasadas || undefined, alerta: true },
    { href: "/cadastros/contatos", rotulo: "Contatos", icone: <IconeContatos />, ativo: (c) => c.startsWith("/cadastros/contatos") },
    {
      href: "/cadastros/empresas",
      rotulo: "Empresas e eventos",
      icone: <IconeEmpresa />,
      ativo: (c) => c.startsWith("/cadastros/empresas") || c.startsWith("/cadastros/eventos"),
    },
  ];
  return (
    <nav aria-label="Principal" className="flex gap-1 overflow-x-auto md:flex-col">
      {itens.map((i) => {
        const ativo = i.ativo(caminho);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={ativo ? "page" : undefined}
            className={cx(
              "flex min-h-11 shrink-0 items-center gap-3 whitespace-nowrap rounded-[10px] px-3 text-sm transition-colors",
              ativo ? "bg-marca-50 font-semibold text-marca-700" : "font-medium text-tinta-2 hover:bg-[#F4F6FB]",
            )}
          >
            {i.icone}
            {i.rotulo}
            {i.contador ? (
              <span
                className={cx(
                  "ml-auto rounded-full px-2 py-0.5 text-xs font-semibold",
                  i.alerta ? "bg-red-100 text-red-800" : ativo ? "bg-white text-marca-700" : "bg-[#F1F4F6] text-tinta-2",
                )}
                aria-label={i.alerta ? `${i.contador} atrasada(s)` : `${i.contador} em aberto`}
              >
                {i.contador}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
