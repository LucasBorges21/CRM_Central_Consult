import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/inter";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import { ProvedorAvisos } from "@/shared/ui/interativos";
import "./globals.css";

// Todas as telas leem o banco local a cada requisição.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CRM Central Consult",
  description: "Acompanhamento comercial de inscrições e patrocínios por evento.",
};

/** Layout raiz: só documento, fontes e avisos. O menu lateral fica em app/(crm)/layout.tsx. */
export default function LayoutRaiz({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen font-sans text-sm antialiased">
        <ProvedorAvisos>{children}</ProvedorAvisos>
      </body>
    </html>
  );
}
