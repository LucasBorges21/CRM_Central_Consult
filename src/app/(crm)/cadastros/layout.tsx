import type { ReactNode } from "react";

/** Cadastros: Contatos tem cabeçalho próprio; Empresas e Eventos usam o cabeçalho com abas (CabecalhoCadastros). */
export default function LayoutCadastros({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
