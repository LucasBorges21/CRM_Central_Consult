"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { falha, type ResultadoAcao } from "@/shared/resultado";
import { autenticar } from "./servico";
import { COOKIE_SESSAO, criarToken, DURACAO_SESSAO_SEGUNDOS } from "./sessao";

/** Só aceita caminhos internos como destino após o login (evita redirecionamento aberto). */
function destinoSeguro(destino: unknown) {
  return typeof destino === "string" && destino.startsWith("/") && !destino.startsWith("//") && !destino.startsWith("/login")
    ? destino
    : "/";
}

export async function acaoEntrar(entrada: Record<string, unknown>): Promise<ResultadoAcao> {
  let usuario;
  try {
    usuario = await autenticar(entrada);
  } catch (erro) {
    return falha(erro);
  }
  (await cookies()).set(COOKIE_SESSAO, await criarToken({ sub: usuario.id, nome: usuario.nome }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.CRM_COOKIE_INSEGURO !== "1",
    path: "/",
    maxAge: DURACAO_SESSAO_SEGUNDOS,
  });
  redirect(destinoSeguro(entrada.proximo));
}

export async function acaoSair() {
  (await cookies()).delete(COOKIE_SESSAO);
  redirect("/login");
}
