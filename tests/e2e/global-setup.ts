import { execSync } from "node:child_process";
import { ENV_E2E } from "./servidor";

/** Prepara prisma/e2e.db: aplica migrações e recarrega os dados de demonstração. */
export default function setup() {
  execSync("npx prisma migrate deploy", { env: ENV_E2E, stdio: "pipe" });
  execSync("npx prisma db seed", { env: ENV_E2E, stdio: "pipe" });
}
