import { execSync } from "node:child_process";

/**
 * Prepara o banco de testes (prisma/test.db, separado do dev.db) aplicando as migrações.
 * Os dados são limpos por cada teste (tests/unit/apoio.ts → limparBanco).
 */
export default function setup() {
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "pipe",
  });
}
