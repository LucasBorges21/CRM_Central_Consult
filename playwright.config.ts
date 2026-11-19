import { defineConfig } from "@playwright/test";

/**
 * Testes de aceite pela interface. Usam um banco próprio (prisma/e2e.db), recriado com os dados de demonstração,
 * e sobem a aplicação de produção (`npm run build` antes) na porta 3100 — ver tests/e2e/servidor.ts.
 * Navegador: Microsoft Edge instalado no Windows (channel "msedge"); para Chromium do Playwright,
 * rode `npx playwright install chromium` e defina PW_CHROMIUM=1.
 */
export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3100",
    channel: process.env.PW_CHROMIUM ? undefined : "msedge",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
  },
});
