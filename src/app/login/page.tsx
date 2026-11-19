import type { Metadata } from "next";
import { SimboloCentralConsult } from "@/shared/ui/icones";
import { FormLogin } from "./FormLogin";

export const metadata: Metadata = { title: "Entrar · CRM Central Consult" };

const mostrarAcessoDemo = process.env.NODE_ENV !== "production" || process.env.CRM_MOSTRAR_ACESSO_DEMO === "1";

export default async function Login({ searchParams }: { searchParams: Promise<{ proximo?: string }> }) {
  const { proximo } = await searchParams;
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="relative hidden overflow-hidden bg-marinho p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <SimboloCentralConsult tamanho={40} />
          <span className="font-titulo text-xl font-bold leading-tight">
            Central
            <br />
            Consult
          </span>
        </div>
        <div className="relative z-10 max-w-md">
          <h2 className="font-titulo text-[34px] font-bold leading-tight">
            Cada inscrição e cada patrocínio, do primeiro contato ao pagamento.
          </h2>
          <p className="mt-4 text-base text-white/75">
            Funil por evento, agenda de retornos e o histórico completo de cada cliente em um só lugar.
          </p>
        </div>
        <p className="text-sm text-white/60">CRM Comercial · Central Consult</p>
        <span className="pointer-events-none absolute -bottom-24 -right-24 opacity-15" aria-hidden>
          <SimboloCentralConsult tamanho={420} espessura={1.4} />
        </span>
      </section>

      <main className="flex items-center justify-center bg-fundo px-4 py-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-marinho">
              <SimboloCentralConsult tamanho={26} />
            </span>
            <span className="font-titulo text-lg font-bold text-marinho">Central Consult</span>
          </div>
          <div className="rounded-[20px] border border-borda bg-white p-8 shadow-[0_8px_30px_rgba(31,43,122,0.08)]">
            <h1 className="font-titulo text-[26px] font-bold tracking-tight">Entrar no CRM</h1>
            <p className="mb-6 mt-1 text-sm text-suave">Use seu e-mail e senha da equipe comercial.</p>
            <FormLogin proximo={proximo} />
          </div>
          {mostrarAcessoDemo && (
            <div className="mt-4 rounded-xl border border-dashed border-marca-200 bg-white/70 p-4 text-[13px] text-tinta-2">
              <p className="font-semibold text-tinta">Acesso de demonstração{process.env.NODE_ENV !== "production" && " (somente desenvolvimento)"}</p>
              <p className="mt-1">
                <code>ana.ribeiro@centralconsult.example</code> · senha <code>demo1234</code>
              </p>
              <p className="mt-0.5 text-suave">Também: bruno.carvalho@… e carla.mendes@… com a mesma senha.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
