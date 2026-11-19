-- CreateTable
CREATE TABLE "Participante" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventoId" TEXT NOT NULL,
    "contatoId" TEXT NOT NULL,
    "nomeCracha" TEXT NOT NULL,
    "modalidade" TEXT NOT NULL,
    "tipoInscricao" TEXT NOT NULL,
    "cortesiaConcedidaPor" TEXT,
    "lote" TEXT,
    "descontoPercentual" INTEGER,
    "valorCentavos" INTEGER,
    "confirmacaoEnviadaEm" DATETIME,
    "confirmacaoCanal" TEXT,
    "presenca" TEXT NOT NULL DEFAULT 'PENDENTE',
    "observacoes" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "Participante_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Participante_contatoId_fkey" FOREIGN KEY ("contatoId") REFERENCES "Contato" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RegistroParticipante" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "participanteId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "responsavelId" TEXT,
    "data" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RegistroParticipante_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "Participante" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RegistroParticipante_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Responsavel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Participante_eventoId_idx" ON "Participante"("eventoId");

-- CreateIndex
CREATE UNIQUE INDEX "Participante_eventoId_contatoId_key" ON "Participante"("eventoId", "contatoId");

-- CreateIndex
CREATE INDEX "RegistroParticipante_participanteId_data_idx" ON "RegistroParticipante"("participanteId", "data");

