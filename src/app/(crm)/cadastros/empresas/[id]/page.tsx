import Link from "next/link";
import { notFound } from "next/navigation";
import { obterEmpresa } from "@/modules/cadastros/servico";
import { BotaoContato, FormEmpresa } from "@/modules/cadastros/componentes/formularios";
import { Avatar, IconeLinkedin, Telefone } from "@/modules/cadastros/componentes/visuais";
import { nomeCompleto } from "@/modules/cadastros/dominio";
import { listarOportunidadesDaEmpresa } from "@/modules/oportunidades/servico";
import { TabelaOportunidades } from "@/modules/oportunidades/componentes/TabelaOportunidades";
import { Cartao, LinkBotao, TituloSecao, Vazio } from "@/shared/ui/componentes";

/** Ficha da empresa: compõe Cadastros (dados e contatos) com Oportunidades (negociações vinculadas). */
export default async function FichaEmpresa({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const empresa = await obterEmpresa(id);
  if (!empresa) notFound();
  const oportunidades = await listarOportunidadesDaEmpresa(id);
  const fixa = { id: empresa.id, nome: empresa.nome };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/cadastros/empresas" className="text-sm text-marca-700 hover:underline">
            ← Empresas
          </Link>
          <h2 className="text-xl font-semibold text-tinta">{empresa.nome}</h2>
        </div>
        <LinkBotao href={`/oportunidades/nova?empresaId=${empresa.id}`}>+ Nova oportunidade</LinkBotao>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Cartao>
          <TituloSecao>Dados da empresa</TituloSecao>
          <FormEmpresa empresa={empresa} />
        </Cartao>

        <Cartao>
          <TituloSecao acao={<BotaoContato empresaFixa={fixa} variante="secundario" />}>Contatos ({empresa.contatos.length})</TituloSecao>
          {empresa.contatos.length === 0 ? (
            <Vazio>Nenhum contato cadastrado para esta empresa.</Vazio>
          ) : (
            <ul className="divide-y divide-[#EEF1F3]">
              {empresa.contatos.map((c) => (
                <li key={c.id} className="flex items-start gap-3 py-3">
                  <Avatar nome={nomeCompleto(c)} />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="flex items-center gap-2">
                      <Link href={`/cadastros/contatos/${c.id}`} className="font-medium text-marca-700 hover:underline">
                        {nomeCompleto(c)}
                      </Link>
                      {c.linkedin && <IconeLinkedin url={c.linkedin} nome={nomeCompleto(c)} />}
                    </p>
                    <p className="text-suave">{[c.cargo, c.departamento].filter(Boolean).join(" · ")}</p>
                    <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      {c.telefones.slice(0, 2).map((t) => (
                        <Telefone key={t.id} tipo={t.tipo} numero={t.numero} principal={t.principal} />
                      ))}
                      <span className="text-tinta-2">{c.email}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </div>

      <Cartao>
        <TituloSecao>Oportunidades ({oportunidades.length})</TituloSecao>
        <TabelaOportunidades oportunidades={oportunidades} />
      </Cartao>
    </div>
  );
}
