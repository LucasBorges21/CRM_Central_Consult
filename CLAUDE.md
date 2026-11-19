# CRM Central Consult — guia do projeto

CRM comercial da **Central Consult**, empresa que organiza eventos corporativos (ex.: COMSAÚDE 2027, IATECH RH 2027). A equipe acompanha a venda de **inscrições** e **patrocínios** por evento: do primeiro contato ao fechamento e ao pagamento. Ao abrir uma oportunidade, deve ficar claro quem é o cliente, o que já foi conversado, em que etapa está e qual é a próxima ação.

- Idioma: **português do Brasil** em tudo — interface, mensagens, nomes de código (variáveis, funções, arquivos), commits e respostas ao usuário.
- Estado atual: primeira versão local, com dados fictícios e **login simples** (responsáveis com e-mail/senha). Ainda **sem perfis/permissões, sem publicação e sem integrações**.
- Acesso de demonstração: `ana.ribeiro@centralconsult.example` / `demo1234` (também bruno.carvalho@… e carla.mendes@…).
- Detalhes de uso e comandos para pessoas: `README.md`.

## Comandos

```bash
npm install            # instala dependências e gera o cliente Prisma
npm run db:migrate     # aplica migrações em prisma/dev.db, gera o cliente Prisma e reindexa a busca
npm run db:seed        # APAGA os dados e recarrega a demonstração
npm run dev            # http://localhost:3000
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm test               # Vitest — regras e fluxos, banco prisma/test.db
npm run build          # build de produção (necessário antes do e2e)
npm run test:e2e       # Playwright — cenários de aceite (o 0 é o login; os demais entram antes com o acesso demo), banco prisma/e2e.db, porta 3100, Microsoft Edge
```

Depois de qualquer mudança, rode: `lint`, `typecheck`, `test`, `build` e `test:e2e`. Todos devem passar.

### Armadilhas do ambiente (Windows + OneDrive)

- **Pare o `npm run dev` antes de `npm install`, `prisma generate` ou migrações.** No Windows, o servidor trava o motor do Prisma (erro EPERM).
- **Não rode `prisma migrate reset` como agente.** O Prisma bloqueia esse comando e pede o consentimento explícito do usuário. Para criar uma migração: altere `schema.prisma`, gere o SQL com `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script` dentro de `prisma/migrations/<timestamp>_<nome>/migration.sql`, ajuste a cópia de dados se precisar, teste numa **cópia** do `dev.db` e aplique com `npm run db:migrate`. O `prisma migrate dev` não funciona em modo não interativo.
- O projeto fica numa pasta do OneDrive, com "Á" no caminho. Use caminhos entre aspas.
- O e2e usa `channel: "msedge"` (Edge instalado). Defina `PW_CHROMIUM=1` para usar o Chromium do Playwright.
- `dados/` (arquivos anexados) e `*.db` não vão para o git.

## Stack

Next.js 15 (App Router, Server Components + Server Actions) · TypeScript estrito · Prisma 6 · SQLite · Tailwind CSS 4 · Zod 3 · Vitest · Playwright. Fontes Inter e Plus Jakarta Sans via `@fontsource` (locais, sem Google Fonts). Versões fixadas (sem `^`).

## Arquitetura

**Uma aplicação, um banco**, organizados por módulo de negócio em `src/modules/<modulo>/`:

| Arquivo | Papel |
|---|---|
| `dominio.ts` | Constantes, rótulos e regras puras (sem banco). Pode ser importado pela interface. |
| `schemas.ts` | Validação Zod, sempre aplicada no servidor. |
| `repositorio.ts` | **Único** ponto de acesso ao Prisma do módulo. Aceita `db` opcional (`Db = PrismaClient \| Tx`) para participar de transações. |
| `servico.ts` | Operações do módulo. **É isto que outros módulos e telas chamam.** Nunca chame o repositório de outro módulo. |
| `acoes.ts` | Server Actions (`"use server"`) finas: chamam serviço ou fluxo, retornam `ResultadoAcao` via `executar()` e fazem `revalidatePath`. |
| `componentes/` | Interface do módulo. |

| Módulo | Responsabilidade | Pode importar |
|---|---|---|
| `cadastros` | Empresas (com sugestão por digitação e cadastro rápido), contatos (telefones, tags, notas, eventos associados, arquivos), eventos (série, edição, descrição, público-alvo), responsáveis; busca; validação de vínculos | nenhum módulo |
| `oportunidades` | Negociações, etapas, perda, valor final, pagamento | cadastros |
| `agenda` | Tarefas (de oportunidade e/ou de contato), prazos, fila de retornos | cadastros, oportunidades |
| `historico` | Interações e mudanças de etapa (linha do tempo) | nenhum módulo |
| `participantes` | Inscritos de cada evento (substitui a planilha "Lista de Inscritos e Participantes"): inscrição (cortesia/pagante, lote, desconto, valor), modalidade, confirmação enviada (canal/data), presença, histórico por participante, importação da planilha padrão (`importacao.ts`, exceljs) e exportações CSV | cadastros, acesso |
| `acesso` | Login: `autenticar`, `usuarioAtual`, sessão em cookie assinado (`sessao.ts`, Web Crypto — roda no middleware), senha `scrypt` (`senha.ts`) | nenhum módulo (lê a tabela `Responsavel`) |
| `painel` | Indicadores (só leitura) | oportunidades, agenda, historico, cadastros |

- **`src/fluxos/`** contém gravações que cruzam módulos, **sempre em `prisma.$transaction`**: `criarOportunidadeComPrimeiraTarefa`, `mudarEtapa` (etapa + histórico), `concluirTarefa` (+ próxima ação). Nenhum módulo importa `fluxos`.
- **Sem dependências circulares.** Quando um módulo precisa de dados de outro que o importaria de volta, **a tela compõe**: por exemplo, a lista de contatos busca `contatosComNegociosEmAndamento()` em Oportunidades e passa os ids para `cadastros.buscarContatos(..., { incluirIds })`.
- **`src/app/`** contém as rotas. As telas do CRM ficam no grupo **`src/app/(crm)/`**, cujo `layout.tsx` exige login (`usuarioAtual()`) e desenha o menu lateral com o usuário e o botão Sair. `src/app/login/` fica fora do grupo. `src/middleware.ts` barra tudo sem sessão (telas → `/login?proximo=…`, API → 401). Páginas são Server Components que **compõem leituras** de vários módulos. Componentes que combinam ações de vários módulos ficam na própria rota (ex.: `src/app/cadastros/contatos/[id]/Compositor.tsx`).
- **`src/shared/`** guarda só o que tem uso comum: `db.ts`, `datas.ts`, `dinheiro.ts`, `documentos.ts` (CPF/CNPJ/telefone), `texto.ts` (busca sem acento), `validacao.ts`, `resultado.ts`, `ui/`.

### Onde mexer

- **Regra do funil** (etapas, o que conta como aberta, exigências para Perdido/Fechado): `src/modules/oportunidades/dominio.ts` → `ETAPAS`, `ETAPAS_ABERTAS`, `validarMudancaEtapa`. Vale para todas as telas, porque cartão do Funil, barra de etapas e botões do detalhe usam o mesmo `SeletorEtapa` → `acaoMudarEtapa` → fluxo `mudarEtapa`.
- **Integração futura (WhatsApp/e-mail)**: chamar `registrarInteracao(oportunidadeId, { canal, resumo, combinado }, { data })` em `src/modules/historico/servico.ts`, a partir de uma rota de webhook nova.
- **Busca de contatos** (campo × pessoa física/jurídica): `buscarContatos` e `condicoesDoCampo` em `src/modules/cadastros/servico.ts`.
- **Indicadores do Painel**: `src/modules/painel/servico.ts`.
- **Campo de empresa** (digitação + "Cadastrar empresa"): `SeletorEmpresa.tsx` em `cadastros/componentes`, com `sugerirEmpresas` e `obterOuCriarEmpresaPorNome` no serviço. Não volte a usar `<select>` com todas as empresas.
- **Séries e público-alvo**: `SerieEvento` (achada pelo `nomeBusca`), `PublicoAlvo` + `EventoPublicoAlvo`; gravados com o evento em `salvarEvento` (transação) em `cadastros/servico.ts`. Edições anteriores e participantes recorrentes: `edicoesDaSerie` (cadastros) e `participacoesEmOutrasEdicoes` / `agruparPorSerie` (participantes).

## Convenções obrigatórias

- **Dinheiro em centavos (`Int`)**: `valorEstimadoCentavos`, `valorFinalCentavos`. Converta com `textoParaCentavos` e mostre com `formatarReais` (`src/shared/dinheiro.ts`). Nunca use float para dinheiro.
- **Datas no fuso `America/Sao_Paulo`**: datas de calendário (prazo, evento, nascimento) são gravadas como a meia-noite de SP do dia (`inicioDoDiaSP(chave)`) e manipuladas como chave `AAAA-MM-DD` (`chaveDataSP`, `hojeSP`, `somarDias`). Exibição em `dd/mm/aaaa` (`formatarData`). Não use `new Date().toISOString()` para decidir "hoje".
- **Validação no servidor** com Zod. Regra de negócio violada → `throw new ErroDeNegocio(mensagem, { campo: "erro" }, codigo?)`. A interface mostra o erro junto ao campo pela chave (para campos aninhados, use caminhos como `tarefa.descricao` ou `telefones.0.numero`).
- **Ações** retornam `ResultadoAcao` (`executar(fn, "mensagem de sucesso")`). No cliente, use `useAcao()` de `src/shared/ui/interativos.tsx`, que mostra o aviso e os erros por campo.
- **Campos normalizados para busca** (`nomeBusca`, `emailNormalizado`, `numeroDigitos`, `telefoneDigitos`, `cpf`/`cnpj` só com dígitos) são recalculados ao salvar. Se criar outro caminho de gravação, preencha esses campos ou rode `prisma/reindexar.ts`.
- **Enums** são `String` no SQLite, com lista e rótulos no `dominio.ts` e validação com `enumObrigatorio`/`enumOpcional`.
- **"Sem próxima ação" é calculado** (oportunidade aberta sem tarefa pendente). Não existe campo no banco.
- **ids HTML únicos**: quando dois formulários dividem a tela, use `id` prefixado em `Campo` e `Entrada` (ex.: `contato-nome`, `nova-tarefa-descricao`). Já houve bug real com isso.
- **Dados fictícios** no seed e no protótipo. Nunca use nomes ou dados reais de clientes.

## Interface (Opção A — SaaS moderno, marca Central Consult)

- Tokens em `src/app/globals.css`:
  - `marinho #1F2B7A`: estrutura e marca.
  - `marca-600 #3F63C7`: ações. É o azul royal `#5175D3` escurecido para dar contraste com texto branco.
  - `ouro #F2CE4E`: acento pontual (botão "Nova oportunidade", símbolo). **Nunca como cor de texto sobre branco.**
  - Neutros: `tinta`, `tinta-2`, `suave`, `borda`, `fundo`.
- Cores de status são semânticas, não de marca: vermelho = atrasada/perdida, âmbar = hoje/pendente, verde = fechada/paga, roxo = vínculo com contato.
- Componentes base em `src/shared/ui/componentes.tsx`: `Botao` (variantes `primario`, `secundario`, `perigo`, `fantasma`, `ouro`, `sucesso`), `LinkBotao`, `Campo`, `Entrada`, `Selecao`, `AreaTexto`, `Cartao`, `TituloSecao`, `CabecalhoPagina`, `Etiqueta`, `Avatar`, `Dado`, `DadoLinha`, `Vazio`. Ícones e símbolo da marca em `src/shared/ui/icones.tsx`. Modal, avisos e filtros por URL em `src/shared/ui/interativos.tsx`. Filtros em pílula em `src/shared/ui/Pilulas.tsx`.
- Cartões `rounded-2xl` com borda `borda` e sombra leve; botões e campos `rounded-[10px]`; títulos em `font-titulo`.
- Acessibilidade: `<button>`/`<a>` reais, `aria-label` em botões só de ícone, rótulos ligados aos campos, alvos de toque ≥ 40px.
- Tudo deve funcionar em celular (390 px), **sem rolagem horizontal da página**. Elementos `sr-only` dentro de contêineres roláveis precisam de um ancestral `relative`; já houve bug com isso.
- Protótipo de referência (privado): https://claude.ai/artifact/AwsrJfhh72RaNorwKmHasK

## Telas atuais

| Rota | Conteúdo |
|---|---|
| `/login` | Tela de login (painel da marca + formulário); mostra o acesso de demonstração só fora de produção |
| `/` Painel | Filtro de evento em menu suspenso (`MenuFiltro`: busca a partir de 7 eventos, grupos Próximos/Já realizados — são 10 a 12 eventos por ano) e filtro de tipo em pílulas; 4 indicadores da especificação (critérios fixos, não alterar sem pedido); pipeline por etapa; até 3 próximos eventos (ou só o filtrado); próximos retornos; atividade recente |
| `/funil` | 6 colunas; cartão com tipo, evento, cliente, valor, avatar do responsável, próxima ação/pagamento/motivo e seletor de etapa (Perdido exige motivo; Fechado exige valor final) |
| `/agenda` | Calendário do mês, filtro por responsável, Atrasadas/Hoje/Próximos dias; concluir (última tarefa de oportunidade aberta pede a próxima ação) e reagendar |
| `/cadastros/contatos` | Busca por Nome/Tag/E-mail/Telefone/CPF-CNPJ/RG × pessoa física/jurídica/ambas; cartões com atalhos e contadores; visões e tags |
| `/cadastros/contatos/[id]` | Ficha: cabeçalho com ações rápidas, resumo, dados, perfil da empresa; abas Atividades (linha do tempo unificada + compositor), Notas, Calendário, Negócios, Eventos, Arquivos |
| `/cadastros/empresas`, `/[id]`, `/cadastros/eventos` | Empresas (CNPJ, porte, ramo, setor de atividade) com ficha de contatos e oportunidades; eventos agrupados por série (edições da mais recente para a mais antiga, público-alvo em etiquetas) |
| `/cadastros/eventos/[id]` | Série/edição, descrição, público-alvo, edições da série e quem também se inscreveu em outra edição ("Também em: 2026", filtro `?recorrentes=1`). **Participantes do evento**: totais (inscritos, presencial/online, cortesias/pagantes, confirmação a enviar, presença), busca e filtros, cadastro (reaproveita o contato pelo e-mail), edição rápida de participação/confirmação/presença, ação em lote, importar planilha (prévia antes de gravar) e exportar Mailing/Crachás/Lista completa (`/api/eventos/[id]/participantes/{mailing,crachas,completa}`, CSV com ";" para Excel) |
| `/oportunidades/nova` | Oportunidade + primeira ação obrigatória, gravadas na mesma transação. Em desenvolvimento, há a opção "simular falha" (prova o rollback) |
| `/oportunidades/[id]` | Barra de etapas, Fechar venda/Marcar como perdida, métricas, próxima ação, tarefas, interação, linha do tempo filtrável, contato, empresa, dados comerciais, pagamento |
| `/api/contatos/[id]/arquivos/[arquivoId]` | Download de anexo (arquivos em `dados/arquivos/`, limite 10 MB, executáveis bloqueados) |

## Testes

- `tests/unit/*.test.ts`: 63 testes de serviço em `prisma/test.db` (limpo por `limparBanco()` em `tests/unit/apoio.ts`). Cubra toda regra nova aqui.
- `tests/e2e/aceite.spec.ts`: 12 cenários (0 = login; 10 = participantes; 11 = séries, público-alvo e empresa pela digitação), em série, sobre o seed. O cenário 10 espera 3 inscritos no IATECH RH 2027 e o 11 espera 2 recorrentes no COMSAÚDE 2027. O cenário 7 roda primeiro porque confere os números exatos da demonstração. Se mudar o seed, ajuste os números esperados. O cenário 8 reinicia o servidor.
- Nos seletores do e2e, prefira papéis e rótulos (`getByRole`, `getByLabel`) e restrinja ao modal (`getByRole("dialog", { name })`) quando houver rótulos repetidos na página.

## Próximos passos (prioridade sugerida)

**1. Antes de a equipe usar**
- Usuários e perfis: o login simples já existe. Faltam: tela para cadastrar usuário e trocar ou recuperar senha, perfis (vendedor/gestor) com permissões, "minhas oportunidades", autoria automática de notas e interações pelo usuário logado (hoje o autor é escolhido à mão), limite de tentativas de login e conferir a sessão também dentro das Server Actions.
- Publicação: servidor, PostgreSQL, HTTPS, backup automático (banco + `dados/arquivos`).
- Importar a base do sistema atual (planilha) com deduplicação; exportar CSV.
- Editar e excluir com regras (tarefa, oportunidade, contato, empresa); arquivar eventos encerrados.
- LGPD: consentimento de mala direta (data/origem), exclusão a pedido, restringir quem vê CPF/RG.
- Registro de alterações (quem mudou o quê). O histórico atual só cobre etapas e interações.

**2. Comercial**
- Mailing por público-alvo: montar a lista de contatos de um segmento (ex.: SST) a partir do público-alvo dos eventos e das participações anteriores da série; ligar contatos/empresas a segmentos.
- Participantes: ligar participante à venda fechada (oportunidade) e mostrar quantos faltam cadastrar; check-in no dia do evento (celular); histórico de participações na ficha do contato; envio real da confirmação (WhatsApp/e-mail) a partir da lista; registrar presença efetiva (compareceu/faltou) depois do evento.
- Catálogo por evento: lotes de inscrição e cotas de patrocínio com preço e quantidade disponível; itens na oportunidade (quantidade × preço, desconto); controle de cotas restantes.
- Metas por evento e vendedor (há o espaço `[META A DEFINIR]` no protótipo); previsão ponderada pela etapa; conversão entre etapas; tempo médio; ranking de motivos de perda.
- Propostas em PDF a partir de modelo, com validade e versões, registradas na linha do tempo.
- Pagamento completo: parcelas, forma, vencimentos, nota fiscal, alerta de atraso (hoje só Pendente/Pago).
- Participantes: nomes dos inscritos nas vendas para empresas, gerando a lista por evento.
- Contrapartidas de patrocínio (estande, logo, palestra) com checklist de entrega.
- Vários contatos por negociação (decisor, financeiro, participante); histórico de empresa do contato.
- Funil com arrastar e soltar, visão em lista, ações em lote e filtros salvos; busca global (Ctrl+K).
- Lembretes de tarefas (e-mail/navegador), resumo diário do gestor, menções @.
- Mesclar contatos duplicados, impedir CNPJ duplicado, campos personalizados.

**3. Integrações**
- WhatsApp (ponto de entrada pronto em `registrarInteracao`), e-mail (enviar e registrar automaticamente), Google Calendar/Outlook, plataforma de inscrições do evento, boleto/Pix e nota fiscal, formulário do site gerando contato + oportunidade.

**4. Técnico**
- Funil no celular; paginação do Funil; busca de eventos no banco (hoje filtra em memória); monitoramento; relatórios exportáveis (PDF/Excel) por evento.

## Ao implementar algo novo

1. Coloque a regra no módulo dono (`dominio.ts` / `servico.ts`) e a validação em `schemas.ts`. Escritas que cruzam módulos vão para um fluxo em transação.
2. Respeite o grafo de dependências acima. Se precisar de dados de outro módulo, componha na tela ou no serviço que já pode importá-lo.
3. Mudou o banco? Faça uma migração nova (veja as armadilhas), atualize o seed e o `limparBanco` dos testes.
4. Use os componentes e tokens existentes; não crie cores novas fora de `globals.css`.
5. Escreva testes (Vitest para a regra; e2e quando houver fluxo de tela novo), rode toda a bateria e atualize o `README.md` e este arquivo quando a arquitetura ou os comandos mudarem.
