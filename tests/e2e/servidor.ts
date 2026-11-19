import { execSync, spawn, type ChildProcess } from "node:child_process";
import path from "node:path";

export const PORTA = 3100;
export const ENV_E2E = {
  ...process.env,
  DATABASE_URL: "file:./e2e.db",
  CRM_PERMITIR_SIMULACAO: "1",
  CRM_PASTA_ARQUIVOS: path.join(process.cwd(), "test-results", "arquivos-e2e"),
  NEXT_TELEMETRY_DISABLED: "1",
  // http://localhost: cookie de sessão sem a flag Secure no teste
  CRM_COOKIE_INSEGURO: "1",
};

let processo: ChildProcess | null = null;

/** Sobe `next start` (build de produção) apontando para o banco de e2e e espera responder. */
export async function iniciarServidor() {
  const next = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
  processo = spawn(process.execPath, [next, "start", "-p", String(PORTA)], { env: ENV_E2E, stdio: "ignore" });
  const limite = Date.now() + 60_000;
  while (Date.now() < limite) {
    try {
      const r = await fetch(`http://localhost:${PORTA}/`);
      if (r.ok) return;
    } catch {
      /* ainda subindo */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Servidor não respondeu em 60s. Rode `npm run build` antes dos testes e2e.");
}

/** Encerra o servidor (reinício real da aplicação). */
export async function pararServidor() {
  if (!processo?.pid) return;
  const pid = processo.pid;
  if (process.platform === "win32") {
    try {
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: "ignore" });
    } catch {
      /* já encerrado */
    }
  } else {
    processo.kill("SIGTERM");
  }
  processo = null;
  // espera a porta liberar
  const limite = Date.now() + 15_000;
  while (Date.now() < limite) {
    try {
      await fetch(`http://localhost:${PORTA}/`);
      await new Promise((r) => setTimeout(r, 300));
    } catch {
      return;
    }
  }
}
