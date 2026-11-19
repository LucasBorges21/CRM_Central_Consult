/** Ícones de traço (decorativos: aria-hidden). Use texto ou aria-label no elemento que os contém. */
import type { ReactNode } from "react";

function Icone({ children, tamanho = 18, className }: { children: ReactNode; tamanho?: number; className?: string }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

type P = { tamanho?: number; className?: string };

export const IconePainel = (p: P) => (
  <Icone {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </Icone>
);
export const IconeFunil = (p: P) => (
  <Icone {...p}>
    <rect x="3" y="4" width="5" height="16" rx="1.5" />
    <rect x="10" y="4" width="5" height="11" rx="1.5" />
    <rect x="17" y="4" width="4" height="7" rx="1.5" />
  </Icone>
);
export const IconeAgenda = (p: P) => (
  <Icone {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Icone>
);
export const IconeContatos = (p: P) => (
  <Icone {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" />
    <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.6c1.9.7 3.1 2.6 3.5 5.4" />
  </Icone>
);
export const IconeEmpresa = (p: P) => (
  <Icone {...p}>
    <path d="M4 21V7l8-4 8 4v14" />
    <path d="M9 21v-6h6v6M9 10h.01M15 10h.01" />
  </Icone>
);
export const IconeMais = (p: P) => (
  <Icone {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icone>
);
export const IconeBusca = (p: P) => (
  <Icone {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icone>
);
export const IconeTelefone = (p: P) => (
  <Icone {...p}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
  </Icone>
);
export const IconeEmail = (p: P) => (
  <Icone {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </Icone>
);
export const IconeMensagem = (p: P) => (
  <Icone {...p}>
    <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19.3L4 20" />
  </Icone>
);
export const IconeNota = (p: P) => (
  <Icone {...p}>
    <path d="M6 3h9l4 4v14H6z" />
    <path d="M14 3v5h5M9 13h6M9 17h4" />
  </Icone>
);
export const IconeCheck = (p: P) => (
  <Icone {...p}>
    <path d="m5 12 4.5 4.5L19 7" />
  </Icone>
);
export const IconeAlerta = (p: P) => (
  <Icone {...p}>
    <path d="M12 9v4M12 17h.01" />
    <path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0" />
  </Icone>
);
export const IconeSeta = (p: P) => (
  <Icone {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icone>
);
export const IconeVoltar = (p: P) => (
  <Icone {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Icone>
);
export const IconeClipe = (p: P) => (
  <Icone {...p}>
    <path d="m21 12-8.5 8.5a5 5 0 0 1-7-7L14 5a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 8" />
  </Icone>
);
export const IconeEtapa = (p: P) => (
  <Icone {...p}>
    <path d="M4 12h12M12 6l6 6-6 6" />
  </Icone>
);
export const IconeDinheiro = (p: P) => (
  <Icone {...p}>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
  </Icone>
);

/** Símbolo da Central Consult (três arcos em "C"). */
export function SimboloCentralConsult({ tamanho = 24, cor = "#F2CE4E", espessura = 2.6 }: { tamanho?: number; cor?: string; espessura?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 32 32" fill="none" stroke={cor} strokeWidth={espessura} aria-hidden="true">
      <path d="M28 5H16a11 11 0 0 0 0 22h12" />
      <path d="M28 10H16a8.5 8.5 0 0 0 0 17" />
      <path d="M28 15H16a6 6 0 0 0 0 12" />
    </svg>
  );
}
