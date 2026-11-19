/** Hash de senha com scrypt (Node). Formato: "scrypt$<sal base64>$<hash base64>". */
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const TAMANHO = 64;

function derivar(senha: string, sal: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(senha, sal, TAMANHO, { N: 16384, r: 8, p: 1 }, (erro, chave) => (erro ? reject(erro) : resolve(chave))),
  );
}

export async function gerarHashSenha(senha: string): Promise<string> {
  const sal = randomBytes(16);
  const hash = await derivar(senha, sal);
  return `scrypt$${sal.toString("base64")}$${hash.toString("base64")}`;
}

export async function conferirSenha(senha: string, armazenado: string | null | undefined): Promise<boolean> {
  if (!armazenado) return false;
  const [algoritmo, sal, hash] = armazenado.split("$");
  if (algoritmo !== "scrypt" || !sal || !hash) return false;
  const esperado = Buffer.from(hash, "base64");
  const obtido = await derivar(senha, Buffer.from(sal, "base64"));
  return esperado.length === obtido.length && timingSafeEqual(esperado, obtido);
}
