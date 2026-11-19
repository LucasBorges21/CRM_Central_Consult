/**
 * Protege todas as rotas: sem sessão válida, redireciona para /login (páginas) ou responde 401 (API).
 * A sessão é um cookie assinado; ver src/modules/acesso/sessao.ts.
 */
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, verificarToken } from "@/modules/acesso/sessao";

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const sessao = await verificarToken(req.cookies.get(COOKIE_SESSAO)?.value);

  if (pathname === "/login") {
    // Já logado: não faz sentido ver o login de novo.
    return sessao ? NextResponse.redirect(new URL("/", req.url)) : NextResponse.next();
  }
  if (sessao) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }
  const destino = new URL("/login", req.url);
  if (pathname !== "/") destino.searchParams.set("proximo", pathname + search);
  return NextResponse.redirect(destino);
}

export const config = {
  // Tudo, exceto arquivos internos do Next e o ícone.
  matcher: ["/((?!_next/static|_next/image|icon.svg|favicon.ico).*)"],
};
