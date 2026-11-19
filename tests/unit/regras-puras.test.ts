import { describe, expect, it } from "vitest";
import { classificarPrazo } from "@/modules/agenda/dominio";
import { normalizarEmail } from "@/modules/cadastros/dominio";
import { validarMudancaEtapa } from "@/modules/oportunidades/dominio";
import { chaveDataSP, formatarData, hojeSP, inicioDoDiaSP } from "@/shared/datas";
import { formatarReais, textoParaCentavos } from "@/shared/dinheiro";

describe("dinheiro", () => {
  it("converte texto em centavos", () => {
    expect(textoParaCentavos("1.234,56")).toBe(123456);
    expect(textoParaCentavos("1234,5")).toBe(123450);
    expect(textoParaCentavos("1234.56")).toBe(123456);
    expect(textoParaCentavos("R$ 1.500")).toBe(150000);
    expect(textoParaCentavos("0,10")).toBe(10);
    expect(textoParaCentavos("abc")).toBeNull();
  });
  it("formata em reais", () => {
    expect(formatarReais(2850000)).toBe("R$ 28.500,00");
  });
});

describe("datas em São Paulo", () => {
  it("meia-noite de SP e formato dd/mm/aaaa", () => {
    const d = inicioDoDiaSP("2027-03-16");
    expect(d.toISOString()).toBe("2027-03-16T03:00:00.000Z");
    expect(chaveDataSP(d)).toBe("2027-03-16");
    expect(formatarData(d)).toBe("16/03/2027");
  });
  it("hoje em SP difere do UTC perto da meia-noite", () => {
    expect(hojeSP(new Date("2026-11-16T01:30:00Z"))).toBe("2026-11-15");
  });
  it("classifica prazos", () => {
    expect(classificarPrazo("2026-11-14", "2026-11-15")).toBe("ATRASADA");
    expect(classificarPrazo("2026-11-15", "2026-11-15")).toBe("HOJE");
    expect(classificarPrazo("2026-11-16", "2026-11-15")).toBe("FUTURA");
  });
});

describe("regra do funil", () => {
  it("Perdido exige motivo", () => {
    const r = validarMudancaEtapa("NOVO", { etapa: "PERDIDO", motivoPerda: "  " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.motivoPerda).toBeDefined();
  });
  it("Fechado exige valor final positivo e começa com pagamento pendente", () => {
    expect(validarMudancaEtapa("EM_NEGOCIACAO", { etapa: "FECHADO" }).ok).toBe(false);
    expect(validarMudancaEtapa("EM_NEGOCIACAO", { etapa: "FECHADO", valorFinalCentavos: 0 }).ok).toBe(false);
    const r = validarMudancaEtapa("EM_NEGOCIACAO", { etapa: "FECHADO", valorFinalCentavos: 1000 });
    expect(r.ok && r.alteracoes.statusPagamento).toBe("PENDENTE");
  });
  it("reabrir limpa dados de fechamento", () => {
    const r = validarMudancaEtapa("FECHADO", { etapa: "EM_NEGOCIACAO" });
    expect(r.ok && r.alteracoes.valorFinalCentavos).toBeNull();
  });
  it("mesma etapa é rejeitada", () => {
    expect(validarMudancaEtapa("NOVO", { etapa: "NOVO" }).ok).toBe(false);
  });
});

it("normaliza e-mail ignorando maiúsculas e espaços", () => {
  expect(normalizarEmail("  Maria@Teste.Example ")).toBe("maria@teste.example");
});
