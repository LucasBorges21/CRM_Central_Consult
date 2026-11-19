-- CreateTable
CREATE TABLE "TelefoneContato" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contatoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "numeroDigitos" TEXT NOT NULL,
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "TelefoneContato_contatoId_fkey" FOREIGN KEY ("contatoId") REFERENCES "Contato" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "nomeNormalizado" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ContatoTag" (
    "contatoId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("contatoId", "tagId"),
    CONSTRAINT "ContatoTag_contatoId_fkey" FOREIGN KEY ("contatoId") REFERENCES "Contato" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContatoTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NotaContato" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contatoId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "responsavelId" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "NotaContato_contatoId_fkey" FOREIGN KEY ("contatoId") REFERENCES "Contato" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NotaContato_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Responsavel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ArquivoContato" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contatoId" TEXT NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "nomeArmazenado" TEXT NOT NULL,
    "tipoMime" TEXT NOT NULL,
    "tamanhoBytes" INTEGER NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArquivoContato_contatoId_fkey" FOREIGN KEY ("contatoId") REFERENCES "Contato" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContatoEvento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contatoId" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "papel" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "ContatoEvento_contatoId_fkey" FOREIGN KEY ("contatoId") REFERENCES "Contato" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContatoEvento_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
-- Preserva o telefone antigo de cada contato como telefone COMERCIAL principal.
-- (numeroDigitos e nomeBusca são normalizados em seguida por prisma/reindexar.ts)
INSERT INTO "TelefoneContato" ("id", "contatoId", "tipo", "numero", "numeroDigitos", "principal", "criadoEm", "atualizadoEm")
SELECT 'tel' || lower(hex(randomblob(10))), "id", 'COMERCIAL', "telefone", "telefone", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Contato" WHERE "telefone" IS NOT NULL AND trim("telefone") <> '';
CREATE TABLE "new_Contato" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "sobrenome" TEXT,
    "nomeBusca" TEXT NOT NULL DEFAULT '',
    "cpf" TEXT,
    "rg" TEXT,
    "dataNascimento" DATETIME,
    "cargo" TEXT,
    "departamento" TEXT,
    "setor" TEXT,
    "email" TEXT NOT NULL,
    "emailNormalizado" TEXT NOT NULL,
    "linkedin" TEXT,
    "recebeMalaDireta" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" TEXT,
    "empresaId" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "Contato_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Contato" ("atualizadoEm", "cargo", "criadoEm", "email", "emailNormalizado", "empresaId", "id", "nome") SELECT "atualizadoEm", "cargo", "criadoEm", "email", "emailNormalizado", "empresaId", "id", "nome" FROM "Contato";
DROP TABLE "Contato";
ALTER TABLE "new_Contato" RENAME TO "Contato";
CREATE INDEX "Contato_emailNormalizado_idx" ON "Contato"("emailNormalizado");
CREATE INDEX "Contato_nome_idx" ON "Contato"("nome");
CREATE INDEX "Contato_nomeBusca_idx" ON "Contato"("nomeBusca");
CREATE INDEX "Contato_cpf_idx" ON "Contato"("cpf");
CREATE INDEX "Contato_empresaId_idx" ON "Contato"("empresaId");
CREATE TABLE "new_Empresa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "nomeBusca" TEXT NOT NULL DEFAULT '',
    "cnpj" TEXT,
    "site" TEXT,
    "linkedin" TEXT,
    "telefone" TEXT,
    "telefoneDigitos" TEXT,
    "email" TEXT,
    "porte" TEXT,
    "ramo" TEXT,
    "setorAtividade" TEXT,
    "observacoes" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);
INSERT INTO "new_Empresa" ("atualizadoEm", "criadoEm", "id", "nome", "observacoes") SELECT "atualizadoEm", "criadoEm", "id", "nome", "observacoes" FROM "Empresa";
DROP TABLE "Empresa";
ALTER TABLE "new_Empresa" RENAME TO "Empresa";
CREATE INDEX "Empresa_nome_idx" ON "Empresa"("nome");
CREATE INDEX "Empresa_nomeBusca_idx" ON "Empresa"("nomeBusca");
CREATE INDEX "Empresa_cnpj_idx" ON "Empresa"("cnpj");
CREATE TABLE "new_Tarefa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "oportunidadeId" TEXT,
    "contatoId" TEXT,
    "descricao" TEXT NOT NULL,
    "prazo" DATETIME NOT NULL,
    "responsavelId" TEXT NOT NULL,
    "situacao" TEXT NOT NULL DEFAULT 'PENDENTE',
    "concluidaEm" DATETIME,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "Tarefa_oportunidadeId_fkey" FOREIGN KEY ("oportunidadeId") REFERENCES "Oportunidade" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Tarefa_contatoId_fkey" FOREIGN KEY ("contatoId") REFERENCES "Contato" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Tarefa_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Responsavel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Tarefa" ("atualizadoEm", "concluidaEm", "criadoEm", "descricao", "id", "oportunidadeId", "prazo", "responsavelId", "situacao") SELECT "atualizadoEm", "concluidaEm", "criadoEm", "descricao", "id", "oportunidadeId", "prazo", "responsavelId", "situacao" FROM "Tarefa";
DROP TABLE "Tarefa";
ALTER TABLE "new_Tarefa" RENAME TO "Tarefa";
CREATE INDEX "Tarefa_oportunidadeId_situacao_idx" ON "Tarefa"("oportunidadeId", "situacao");
CREATE INDEX "Tarefa_contatoId_situacao_idx" ON "Tarefa"("contatoId", "situacao");
CREATE INDEX "Tarefa_situacao_prazo_idx" ON "Tarefa"("situacao", "prazo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TelefoneContato_contatoId_idx" ON "TelefoneContato"("contatoId");

-- CreateIndex
CREATE INDEX "TelefoneContato_numeroDigitos_idx" ON "TelefoneContato"("numeroDigitos");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_nomeNormalizado_key" ON "Tag"("nomeNormalizado");

-- CreateIndex
CREATE INDEX "ContatoTag_tagId_idx" ON "ContatoTag"("tagId");

-- CreateIndex
CREATE INDEX "NotaContato_contatoId_idx" ON "NotaContato"("contatoId");

-- CreateIndex
CREATE INDEX "ArquivoContato_contatoId_idx" ON "ArquivoContato"("contatoId");

-- CreateIndex
CREATE INDEX "ContatoEvento_eventoId_idx" ON "ContatoEvento"("eventoId");

-- CreateIndex
CREATE UNIQUE INDEX "ContatoEvento_contatoId_eventoId_key" ON "ContatoEvento"("contatoId", "eventoId");

-- Valor inicial dos campos de busca (refinado por prisma/reindexar.ts: acentos e dígitos)
UPDATE "Contato" SET "nomeBusca" = lower("nome") WHERE "nomeBusca" = '';
UPDATE "Empresa" SET "nomeBusca" = lower("nome") WHERE "nomeBusca" = '';
