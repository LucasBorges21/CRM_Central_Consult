/**
 * Módulo Acesso: login dos responsáveis comerciais.
 * Os usuários são os próprios Responsáveis (tabela Responsavel com e-mail e senha).
 */
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/shared/db";
import { ErroDeNegocio } from "@/shared/resultado";
import { conferirSenha } from "./senha";
import { COOKIE_SESSAO, verificarToken } from "./sessao";

export const loginSchema = z.object({
  email: z.string({ required_error: "Informe o e-mail." }).trim().min(1, "Informe o e-mail.").email("E-mail inválido."),
  senha: z.string({ required_error: "Informe a senha." }).min(1, "Informe a senha."),
});

/** Mensagem única para e-mail inexistente e senha errada (não revela quais e-mails existem). */
const CREDENCIAIS_INVALIDAS = "E-mail ou senha incorretos.";

export async function autenticar(entrada: unknown) {
  const { email, senha } = loginSchema.parse(entrada);
  const usuario = await prisma.responsavel.findUnique({ where: { email: email.toLowerCase() } });
  const ok = await conferirSenha(senha, usuario?.senhaHash);
  if (!usuario || !ok || !usuario.ativo) {
    throw new ErroDeNegocio(CREDENCIAIS_INVALIDAS, { senha: CREDENCIAIS_INVALIDAS }, "CREDENCIAIS_INVALIDAS");
  }
  return { id: usuario.id, nome: usuario.nome, email: usuario.email };
}

/** Usuário logado (lido do cookie assinado e confirmado no banco), ou null. */
export async function usuarioAtual() {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  const sessao = await verificarToken(token);
  if (!sessao) return null;
  const usuario = await prisma.responsavel.findUnique({ where: { id: sessao.sub }, select: { id: true, nome: true, email: true, ativo: true } });
  return usuario?.ativo ? usuario : null;
}
