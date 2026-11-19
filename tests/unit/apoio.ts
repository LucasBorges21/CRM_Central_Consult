import { prisma } from "@/shared/db";
import { hojeSP, somarDias } from "@/shared/datas";

export async function limparBanco() {
  await prisma.registroParticipante.deleteMany();
  await prisma.participante.deleteMany();
  await prisma.contatoTag.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.notaContato.deleteMany();
  await prisma.arquivoContato.deleteMany();
  await prisma.contatoEvento.deleteMany();
  await prisma.telefoneContato.deleteMany();
  await prisma.historico.deleteMany();
  await prisma.tarefa.deleteMany();
  await prisma.oportunidade.deleteMany();
  await prisma.contato.deleteMany();
  await prisma.empresa.deleteMany();
  await prisma.eventoPublicoAlvo.deleteMany();
  await prisma.evento.deleteMany();
  await prisma.serieEvento.deleteMany();
  await prisma.publicoAlvo.deleteMany();
  await prisma.responsavel.deleteMany();
}

export const diaRelativo = (n: number) => somarDias(hojeSP(), n);

/** Cadastros mínimos para os testes. */
export async function basico() {
  const responsavel = await prisma.responsavel.create({ data: { nome: "Ana" } });
  const evento = await prisma.evento.create({ data: { nome: "COMSAÚDE 2027", dataInicio: new Date("2027-03-16T03:00:00Z") } });
  const evento2 = await prisma.evento.create({ data: { nome: "IATECH RH 2027", dataInicio: new Date("2027-05-20T03:00:00Z") } });
  const empresa = await prisma.empresa.create({ data: { nome: "Empresa Teste" } });
  const outraEmpresa = await prisma.empresa.create({ data: { nome: "Outra Empresa" } });
  const contato = await prisma.contato.create({
    data: { nome: "Maria", email: "maria@teste.example", emailNormalizado: "maria@teste.example", empresaId: empresa.id },
  });
  const individual = await prisma.contato.create({
    data: { nome: "João", email: "joao@teste.example", emailNormalizado: "joao@teste.example" },
  });
  return { responsavel, evento, evento2, empresa, outraEmpresa, contato, individual };
}

export function entradaOportunidade(b: Awaited<ReturnType<typeof basico>>, extra: Record<string, unknown> = {}) {
  return {
    titulo: "Inscrições teste",
    eventoId: b.evento.id,
    tipoVenda: "INSCRICAO",
    empresaId: b.empresa.id,
    contatoId: b.contato.id,
    origemLead: "Site",
    responsavelId: b.responsavel.id,
    valorEstimado: "1.500,00",
    tarefa: { descricao: "Ligar", prazo: diaRelativo(1), responsavelId: b.responsavel.id },
    ...extra,
  };
}
