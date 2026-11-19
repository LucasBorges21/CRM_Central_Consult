import { ZodError } from "zod";

/** Erros de validação por campo (nome do campo → mensagem). */
export type ErrosDeCampo = Record<string, string>;

export type Falha = { ok: false; mensagem: string; erros: ErrosDeCampo; codigo?: string };

/** Resposta padrão das ações chamadas pela interface. */
export type ResultadoAcao<T = unknown> = { ok: true; mensagem: string; dados?: T } | Falha;

/** Violação de regra comercial detectada no servidor. */
export class ErroDeNegocio extends Error {
  constructor(
    mensagem: string,
    public readonly erros: ErrosDeCampo = {},
    public readonly codigo?: string,
  ) {
    super(mensagem);
    this.name = "ErroDeNegocio";
  }
}

export function errosDoZod(erro: ZodError): ErrosDeCampo {
  const erros: ErrosDeCampo = {};
  for (const issue of erro.issues) {
    const campo = issue.path.join(".") || "_";
    if (!erros[campo]) erros[campo] = issue.message;
  }
  return erros;
}

/** Converte qualquer erro em um resultado de falha legível pela interface. */
export function falha(erro: unknown): Falha {
  if (erro instanceof ErroDeNegocio) {
    return { ok: false, mensagem: erro.message, erros: erro.erros, codigo: erro.codigo };
  }
  if (erro instanceof ZodError) {
    return { ok: false, mensagem: "Verifique os campos destacados.", erros: errosDoZod(erro) };
  }
  console.error(erro);
  return { ok: false, mensagem: "Não foi possível salvar. Nada foi gravado; tente novamente.", erros: {} };
}

/** Executa a operação e devolve um ResultadoAcao, sem deixar exceções chegarem à interface. */
export async function executar<T>(operacao: () => Promise<T>, mensagem: string): Promise<ResultadoAcao<T>> {
  try {
    const dados = await operacao();
    return { ok: true, mensagem, dados };
  } catch (erro) {
    return falha(erro);
  }
}
