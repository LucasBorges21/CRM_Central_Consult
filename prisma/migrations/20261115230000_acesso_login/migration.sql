-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Responsavel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "senhaHash" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);
INSERT INTO "new_Responsavel" ("atualizadoEm", "criadoEm", "id", "nome") SELECT "atualizadoEm", "criadoEm", "id", "nome" FROM "Responsavel";
DROP TABLE "Responsavel";
ALTER TABLE "new_Responsavel" RENAME TO "Responsavel";
CREATE UNIQUE INDEX "Responsavel_email_key" ON "Responsavel"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

