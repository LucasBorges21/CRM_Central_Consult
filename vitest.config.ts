import { defineConfig } from "vitest/config";
import os from "node:os";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    globalSetup: ["tests/unit/global-setup.ts"],
    env: { DATABASE_URL: "file:./test.db", TZ: "UTC", CRM_PASTA_ARQUIVOS: path.join(os.tmpdir(), "crm-testes-arquivos") },
    fileParallelism: false,
  },
});
