-- CreateTable
CREATE TABLE "SerieEvento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "nomeBusca" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PublicoAlvo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "nomeNormalizado" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EventoPublicoAlvo" (
    "eventoId" TEXT NOT NULL,
    "publicoAlvoId" TEXT NOT NULL,

    PRIMARY KEY ("eventoId", "publicoAlvoId"),
    CONSTRAINT "EventoPublicoAlvo_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventoPublicoAlvo_publicoAlvoId_fkey" FOREIGN KEY ("publicoAlvoId") REFERENCES "PublicoAlvo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Evento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "serieId" TEXT,
    "edicao" INTEGER,
    "descricao" TEXT,
    "dataInicio" DATETIME NOT NULL,
    "dataFim" DATETIME,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "Evento_serieId_fkey" FOREIGN KEY ("serieId") REFERENCES "SerieEvento" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Evento" ("atualizadoEm", "criadoEm", "dataFim", "dataInicio", "id", "nome") SELECT "atualizadoEm", "criadoEm", "dataFim", "dataInicio", "id", "nome" FROM "Evento";
DROP TABLE "Evento";
ALTER TABLE "new_Evento" RENAME TO "Evento";
CREATE INDEX "Evento_nome_idx" ON "Evento"("nome");
CREATE INDEX "Evento_serieId_idx" ON "Evento"("serieId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "SerieEvento_nomeBusca_key" ON "SerieEvento"("nomeBusca");

-- CreateIndex
CREATE UNIQUE INDEX "PublicoAlvo_nomeNormalizado_key" ON "PublicoAlvo"("nomeNormalizado");

-- CreateIndex
CREATE INDEX "EventoPublicoAlvo_publicoAlvoId_idx" ON "EventoPublicoAlvo"("publicoAlvoId");

