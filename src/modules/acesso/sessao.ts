/**
 * Token de sessão assinado (HMAC-SHA256) guardado em cookie httpOnly.
 * Usa só Web Crypto, então funciona tanto no middleware (Edge) quanto no servidor (Node).
 * Formato: base64url(JSON {sub, nome, exp}) + "." + base64url(assinatura)
 */
export const COOKIE_SESSAO = "crm_sessao";
export const DURACAO_SESSAO_SEGUNDOS = 12 * 60 * 60;

export type DadosSessao = { sub: string; nome: string; exp: number };

const SEGREDO_DESENVOLVIMENTO = "crm-central-consult-somente-desenvolvimento";

function segredo(): string {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production" && process.env.CRM_PERMITIR_SEGREDO_PADRAO !== "1") {
    throw new Error("Defina AUTH_SECRET (mínimo de 32 caracteres) para rodar em produção.");
  }
  return SEGREDO_DESENVOLVIMENTO;
}

function paraBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deBase64Url(texto: string): Uint8Array<ArrayBuffer> {
  const b64 = texto.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((texto.length + 3) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function chave() {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(segredo()), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export async function criarToken(dados: { sub: string; nome: string }, agora = Date.now()): Promise<string> {
  const corpo: DadosSessao = { ...dados, exp: Math.floor(agora / 1000) + DURACAO_SESSAO_SEGUNDOS };
  const parte = paraBase64Url(new TextEncoder().encode(JSON.stringify(corpo)));
  const assinatura = await crypto.subtle.sign("HMAC", await chave(), new TextEncoder().encode(parte));
  return `${parte}.${paraBase64Url(new Uint8Array(assinatura))}`;
}

/** Devolve os dados da sessão se o token for autêntico e não tiver expirado; senão, null. */
export async function verificarToken(token: string | undefined | null, agora = Date.now()): Promise<DadosSessao | null> {
  if (!token) return null;
  const [parte, assinatura] = token.split(".");
  if (!parte || !assinatura) return null;
  try {
    const valida = await crypto.subtle.verify("HMAC", await chave(), deBase64Url(assinatura), new TextEncoder().encode(parte));
    if (!valida) return null;
    const dados = JSON.parse(new TextDecoder().decode(deBase64Url(parte))) as DadosSessao;
    if (typeof dados.sub !== "string" || typeof dados.exp !== "number") return null;
    if (dados.exp * 1000 <= agora) return null;
    return dados;
  } catch {
    return null;
  }
}
