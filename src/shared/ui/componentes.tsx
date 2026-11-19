/** Componentes visuais básicos (sem estado), usados por todos os módulos. Estilo: Opção A — SaaS moderno. */
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export { cx };

type Variante = "primario" | "secundario" | "perigo" | "fantasma" | "ouro" | "escuro" | "sucesso";
const estiloBotao: Record<Variante, string> = {
  primario: "bg-marca-600 text-white hover:bg-marca-700 shadow-sm",
  secundario: "bg-white text-tinta border border-[#D5DCE1] hover:bg-[#F7F9FA]",
  perigo: "bg-white text-red-700 border border-red-200 hover:bg-red-50",
  fantasma: "text-marca-700 hover:bg-marca-50",
  ouro: "bg-ouro text-marinho font-bold hover:bg-ouro-escuro shadow-sm",
  escuro: "bg-tinta text-white hover:bg-black",
  sucesso: "bg-green-700 text-white hover:bg-green-800 shadow-sm",
};
const baseBotao =
  "inline-flex items-center justify-center gap-2 rounded-[10px] px-4 min-h-10 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";

export function Botao({
  variante = "primario",
  className,
  pequeno,
  ...props
}: ComponentProps<"button"> & { variante?: Variante; pequeno?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={cx(baseBotao, estiloBotao[variante], pequeno && "min-h-8! px-3 text-[13px]", className)}
    />
  );
}

export function LinkBotao({
  variante = "primario",
  pequeno,
  className,
  ...props
}: ComponentProps<typeof Link> & { variante?: Variante; pequeno?: boolean }) {
  return <Link {...props} className={cx(baseBotao, estiloBotao[variante], pequeno && "min-h-8! px-3 text-[13px]", className)} />;
}

/**
 * Rótulo + campo + mensagem de erro. `id` deve coincidir com o `id` do campo filho
 * (por padrão, o próprio `nome`); use ids prefixados quando dois formulários dividem a tela.
 */
export function Campo({
  rotulo,
  nome,
  id,
  erro,
  dica,
  children,
  className,
}: {
  rotulo: string;
  nome: string;
  id?: string;
  erro?: string;
  dica?: string;
  children: ReactNode;
  className?: string;
}) {
  const alvo = id ?? nome;
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={alvo} className="text-[13px] font-semibold text-tinta-2">
        {rotulo}
      </label>
      {children}
      {erro ? (
        <p id={`${alvo}-erro`} role="alert" className="text-xs font-medium text-red-700">
          {erro}
        </p>
      ) : dica ? (
        <p className="text-xs text-suave">{dica}</p>
      ) : null}
    </div>
  );
}

const baseEntrada =
  "w-full rounded-[10px] border bg-white px-3 py-2.5 text-sm text-tinta placeholder:text-[#8A99A4] focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-100";

export function Entrada({ erro, className, ...props }: ComponentProps<"input"> & { erro?: string }) {
  return (
    <input
      {...props}
      id={props.id ?? props.name}
      aria-invalid={erro ? true : undefined}
      aria-describedby={erro ? `${props.id ?? props.name}-erro` : undefined}
      className={cx(baseEntrada, erro ? "border-red-400" : "border-borda", className)}
    />
  );
}

export function Selecao({ erro, className, ...props }: ComponentProps<"select"> & { erro?: string }) {
  return (
    <select
      {...props}
      id={props.id ?? props.name}
      aria-invalid={erro ? true : undefined}
      aria-describedby={erro ? `${props.id ?? props.name}-erro` : undefined}
      className={cx(baseEntrada, erro ? "border-red-400" : "border-borda", className)}
    />
  );
}

export function AreaTexto({ erro, className, ...props }: ComponentProps<"textarea"> & { erro?: string }) {
  return (
    <textarea
      rows={3}
      {...props}
      id={props.id ?? props.name}
      aria-invalid={erro ? true : undefined}
      aria-describedby={erro ? `${props.id ?? props.name}-erro` : undefined}
      className={cx(baseEntrada, "bg-[#FAFBFC]", erro ? "border-red-400" : "border-borda", className)}
    />
  );
}

export function Cartao({ children, className, ...props }: ComponentProps<"section">) {
  return (
    <section
      {...props}
      className={cx("rounded-2xl border border-borda bg-white p-5 shadow-[0_1px_2px_rgba(20,33,43,0.04)]", className)}
    >
      {children}
    </section>
  );
}

export function TituloSecao({ children, acao, rotulo }: { children: ReactNode; acao?: ReactNode; rotulo?: boolean }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2
        className={
          rotulo
            ? "text-xs font-bold uppercase tracking-wider text-suave"
            : "font-titulo text-[16px] font-bold text-tinta"
        }
      >
        {children}
      </h2>
      {acao}
    </div>
  );
}

export function CabecalhoPagina({
  titulo,
  descricao,
  acoes,
  sobretitulo,
}: {
  titulo: string;
  descricao?: ReactNode;
  acoes?: ReactNode;
  sobretitulo?: string;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {sobretitulo && <p className="text-[13px] text-suave">{sobretitulo}</p>}
        <h1 className="font-titulo text-[28px] font-bold leading-tight tracking-tight text-tinta">{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-suave">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </header>
  );
}

type Tom = "neutro" | "marca" | "alerta" | "perigo" | "sucesso" | "info" | "roxo";
const estiloTom: Record<Tom, string> = {
  neutro: "bg-[#F1F4F6] text-tinta-2",
  marca: "bg-marca-50 text-marca-800",
  alerta: "bg-amber-100 text-amber-800",
  perigo: "bg-red-100 text-red-800",
  sucesso: "bg-green-100 text-green-800",
  info: "bg-blue-100 text-blue-800",
  roxo: "bg-violet-100 text-violet-800",
};

/** Etiqueta de status/categoria. `pilula` = cantos totalmente arredondados. */
export function Etiqueta({
  tom = "neutro",
  pilula,
  children,
  className,
}: {
  tom?: Tom;
  pilula?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center whitespace-nowrap px-2 py-0.5 text-xs font-semibold",
        pilula ? "rounded-full px-2.5" : "rounded-md",
        estiloTom[tom],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-[#D5DCE1] p-5 text-center text-sm text-suave">{children}</p>;
}

/** Par rótulo/valor empilhado. */
export function Dado({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-suave">{rotulo}</dt>
      <dd className="mt-0.5 text-sm font-medium text-tinta">{children || "—"}</dd>
    </div>
  );
}

/** Par rótulo/valor em linha (rótulo à esquerda, valor à direita). */
export function DadoLinha({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 text-[13px]">
      <dt className="shrink-0 whitespace-nowrap text-suave">{rotulo}</dt>
      <dd className="min-w-0 text-right font-semibold text-tinta [overflow-wrap:anywhere]">{children || "—"}</dd>
    </div>
  );
}

const CORES_AVATAR = [
  "bg-marca-100 text-marca-800",
  "bg-amber-100 text-amber-800",
  "bg-pink-100 text-pink-800",
  "bg-violet-100 text-violet-800",
  "bg-sky-100 text-sky-800",
  "bg-green-100 text-green-800",
];

export function iniciaisDe(nome: string) {
  const p = nome.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

/** Avatar com iniciais; a cor é estável para o mesmo nome. */
export function Avatar({ nome, tamanho = "m", className }: { nome: string; tamanho?: "p" | "m" | "g" | "xg"; className?: string }) {
  const cor = CORES_AVATAR[[...nome].reduce((s, c) => s + c.charCodeAt(0), 0) % CORES_AVATAR.length];
  const tam = { p: "h-7 w-7 text-[11px]", m: "h-12 w-12 text-base", g: "h-14 w-14 text-lg", xg: "h-[88px] w-[88px] text-[28px]" }[tamanho];
  return (
    <span
      aria-hidden
      className={cx("inline-flex shrink-0 items-center justify-center rounded-full font-titulo font-bold", tam, cor, className)}
    >
      {iniciaisDe(nome)}
    </span>
  );
}
