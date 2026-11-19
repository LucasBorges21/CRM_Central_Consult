/**
 * Recalcula os campos normalizados usados na busca (nome sem acento, e-mail, dígitos de telefone).
 * Idempotente. Roda automaticamente em `npm run db:migrate`.
 */
import { PrismaClient } from "@prisma/client";
import { chaveBuscaNome, normalizarEmail } from "../src/modules/cadastros/dominio";
import { somenteDigitos } from "../src/shared/documentos";
import { normalizarBusca } from "../src/shared/texto";

const prisma = new PrismaClient();

async function main() {
  const contatos = await prisma.contato.findMany({ select: { id: true, nome: true, sobrenome: true, email: true } });
  for (const c of contatos) {
    await prisma.contato.update({
      where: { id: c.id },
      data: { nomeBusca: chaveBuscaNome(c.nome, c.sobrenome), emailNormalizado: normalizarEmail(c.email) },
    });
  }
  const telefones = await prisma.telefoneContato.findMany({ select: { id: true, numero: true } });
  for (const t of telefones) {
    await prisma.telefoneContato.update({ where: { id: t.id }, data: { numeroDigitos: somenteDigitos(t.numero) } });
  }
  const empresas = await prisma.empresa.findMany({ select: { id: true, nome: true, telefone: true } });
  for (const e of empresas) {
    await prisma.empresa.update({
      where: { id: e.id },
      data: { nomeBusca: normalizarBusca(e.nome), telefoneDigitos: e.telefone ? somenteDigitos(e.telefone) : null },
    });
  }
  console.log(`Busca reindexada: ${contatos.length} contatos, ${telefones.length} telefones, ${empresas.length} empresas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
