-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "observacoes" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Contato" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "cargo" TEXT,
    "email" TEXT NOT NULL,
    "emailNormalizado" TEXT NOT NULL,
    "telefone" TEXT,
    "empresaId" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "Contato_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Evento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "dataInicio" DATETIME NOT NULL,
    "dataFim" DATETIME,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Responsavel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Oportunidade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "tipoVenda" TEXT NOT NULL,
    "contatoId" TEXT NOT NULL,
    "empresaId" TEXT,
    "origemLead" TEXT NOT NULL,
    "responsavelId" TEXT NOT NULL,
    "valorEstimadoCentavos" INTEGER NOT NULL,
    "etapa" TEXT NOT NULL DEFAULT 'NOVO',
    "valorFinalCentavos" INTEGER,
    "motivoPerda" TEXT,
    "statusPagamento" TEXT,
    "fechadoEm" DATETIME,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "Oportunidade_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Oportunidade_contatoId_fkey" FOREIGN KEY ("contatoId") REFERENCES "Contato" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Oportunidade_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Oportunidade_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Responsavel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tarefa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "oportunidadeId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "prazo" DATETIME NOT NULL,
    "responsavelId" TEXT NOT NULL,
    "situacao" TEXT NOT NULL DEFAULT 'PENDENTE',
    "concluidaEm" DATETIME,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "Tarefa_oportunidadeId_fkey" FOREIGN KEY ("oportunidadeId") REFERENCES "Oportunidade" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Tarefa_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Responsavel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Historico" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "oportunidadeId" TEXT NOT NULL,
    "data" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "canal" TEXT,
    "resumo" TEXT,
    "combinado" TEXT,
    "etapaAnterior" TEXT,
    "etapaNova" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Historico_oportunidadeId_fkey" FOREIGN KEY ("oportunidadeId") REFERENCES "Oportunidade" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Empresa_nome_idx" ON "Empresa"("nome");

-- CreateIndex
CREATE INDEX "Contato_emailNormalizado_idx" ON "Contato"("emailNormalizado");

-- CreateIndex
CREATE INDEX "Contato_nome_idx" ON "Contato"("nome");

-- CreateIndex
CREATE INDEX "Contato_empresaId_idx" ON "Contato"("empresaId");

-- CreateIndex
CREATE INDEX "Evento_nome_idx" ON "Evento"("nome");

-- CreateIndex
CREATE INDEX "Oportunidade_eventoId_idx" ON "Oportunidade"("eventoId");

-- CreateIndex
CREATE INDEX "Oportunidade_etapa_idx" ON "Oportunidade"("etapa");

-- CreateIndex
CREATE INDEX "Oportunidade_empresaId_idx" ON "Oportunidade"("empresaId");

-- CreateIndex
CREATE INDEX "Oportunidade_contatoId_idx" ON "Oportunidade"("contatoId");

-- CreateIndex
CREATE INDEX "Oportunidade_responsavelId_idx" ON "Oportunidade"("responsavelId");

-- CreateIndex
CREATE INDEX "Tarefa_oportunidadeId_situacao_idx" ON "Tarefa"("oportunidadeId", "situacao");

-- CreateIndex
CREATE INDEX "Tarefa_situacao_prazo_idx" ON "Tarefa"("situacao", "prazo");

-- CreateIndex
CREATE INDEX "Historico_oportunidadeId_data_idx" ON "Historico"("oportunidadeId", "data");
