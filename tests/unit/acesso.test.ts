import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/shared/db";
import type { ErroDeNegocio } from "@/shared/resultado";
import { conferirSenha, gerarHashSenha } from "@/modules/acesso/senha";
import { criarToken, DURACAO_SESSAO_SEGUNDOS, verificarToken } from "@/modules/acesso/sessao";
import { autenticar } from "@/modules/acesso/servico";
import { limparBanco } from "./apoio";

describe("senha", () => {
  it("gera hash com sal e confere só a senha certa", async () => {
    const h1 = await gerarHashSenha("segredo123");
    const h2 = await gerarHashSenha("segredo123");
    expect(h1).not.toBe(h2);
    expect(h1).not.toContain("segredo123");
    expect(await conferirSenha("segredo123", h1)).toBe(true);
    expect(await conferirSenha("Segredo123", h1)).toBe(false);
    expect(await conferirSenha("segredo123", null)).toBe(false);
    expect(await conferirSenha("segredo123", "formato-invalido")).toBe(false);
  });
});

describe("token de sessão", () => {
  it("aceita token válido e recusa adulterado ou expirado", async () => {
    const token = await criarToken({ sub: "u1", nome: "Ana" });
    expect((await verificarToken(token))?.sub).toBe("u1");

    const [corpo, assinatura] = token.split(".");
    const outroCorpo = Buffer.from(JSON.stringify({ sub: "admin", nome: "X", exp: 9999999999 })).toString("base64url");
    expect(await verificarToken(`${outroCorpo}.${assinatura}`)).toBeNull();
    expect(await verificarToken(`${corpo}.x${assinatura}`)).toBeNull();
    expect(await verificarToken("lixo")).toBeNull();
    expect(await verificarToken(undefined)).toBeNull();

    const depois = Date.now() + (DURACAO_SESSAO_SEGUNDOS + 1) * 1000;
    expect(await verificarToken(token, depois)).toBeNull();
  });
});

describe("autenticação", () => {
  beforeEach(async () => {
    await limparBanco();
    await prisma.responsavel.create({
      data: { nome: "Ana Ribeiro", email: "ana@central.example", senhaHash: await gerarHashSenha("demo1234") },
    });
    await prisma.responsavel.create({
      data: { nome: "Inativo", email: "inativo@central.example", senhaHash: await gerarHashSenha("demo1234"), ativo: false },
    });
  });

  async function erroDe(p: Promise<unknown>) {
    try {
      await p;
    } catch (e) {
      return e as ErroDeNegocio;
    }
    throw new Error("Era esperado um erro.");
  }

  it("entra com e-mail (sem diferenciar maiúsculas) e senha corretos", async () => {
    const u = await autenticar({ email: "  ANA@central.example ", senha: "demo1234" });
    expect(u.nome).toBe("Ana Ribeiro");
  });

  it("mesma mensagem para senha errada e e-mail inexistente; usuário inativo não entra", async () => {
    const e1 = await erroDe(autenticar({ email: "ana@central.example", senha: "errada" }));
    const e2 = await erroDe(autenticar({ email: "ninguem@central.example", senha: "demo1234" }));
    const e3 = await erroDe(autenticar({ email: "inativo@central.example", senha: "demo1234" }));
    expect(e1.message).toBe("E-mail ou senha incorretos.");
    expect(e2.message).toBe(e1.message);
    expect(e3.message).toBe(e1.message);
  });
});
