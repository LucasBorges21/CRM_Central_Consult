import { buscarEventos, contatosParaOportunidade, listarResponsaveis, obterEmpresa } from "@/modules/cadastros/servico";
import { nomeCompleto } from "@/modules/cadastros/dominio";
import { FormOportunidade } from "@/modules/oportunidades/componentes/FormOportunidade";
import { hojeSP } from "@/shared/datas";
import { CabecalhoPagina, Cartao } from "@/shared/ui/componentes";

export default async function NovaOportunidade({ searchParams }: { searchParams: Promise<{ empresaId?: string; contatoId?: string }> }) {
  const { empresaId, contatoId } = await searchParams;
  const [eventos, empresa, responsaveis, contatos] = await Promise.all([
    buscarEventos(),
    empresaId ? obterEmpresa(empresaId) : null,
    listarResponsaveis(),
    contatosParaOportunidade(empresaId || null),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <CabecalhoPagina
        titulo="Nova oportunidade"
        descricao="A oportunidade e a primeira ação são gravadas juntas: se uma falhar, nenhuma é criada."
      />
      <Cartao>
        <FormOportunidade
          eventos={eventos.map((e) => ({ id: e.id, nome: e.nome }))}
          responsaveis={responsaveis}
          contatosIniciais={contatos.map((c) => ({ id: c.id, nome: nomeCompleto(c), email: c.email, cargo: c.cargo }))}
          empresaInicial={empresa ? { id: empresa.id, nome: empresa.nome } : null}
          contatoInicial={contatos.some((c) => c.id === contatoId) ? contatoId : null}
          hoje={hojeSP()}
          permitirSimulacao={process.env.NODE_ENV !== "production" || process.env.CRM_PERMITIR_SIMULACAO === "1"}
        />
      </Cartao>
    </div>
  );
}
