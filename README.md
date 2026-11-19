# CRM Central Consult

Primeira versão do CRM comercial da Central Consult: vendas de **inscrições** e **patrocínios** por evento, do primeiro contato ao fechamento e ao acompanhamento do pagamento.

Stack: Next.js 15 (App Router) · TypeScript · Prisma 6 · SQLite · Tailwind CSS 4 · Zod. Roda 100% local, sem serviços externos.

## Como rodar

Requisitos: Node.js 20 ou superior (testado com 22.14) e npm.

```bash
npm install            # instala as dependências e gera o cliente Prisma
npm run db:migrate     # cria/atualiza o banco SQLite (prisma/dev.db) e reindexa a busca de contatos
npm run db:seed        # carrega os dados de demonstração (apaga e recria os dados)
npm run dev            # inicia em modo desenvolvimento
```

Abra **http://localhost:3000** e entre com um dos acessos de demonstração (somente desenvolvimento):

| Usuário | E-mail | Senha |
|---|---|---|
| Ana Ribeiro | `ana.ribeiro@centralconsult.example` | `demo1234` |
| Bruno Carvalho | `bruno.carvalho@centralconsult.example` | `demo1234` |
| Carla Mendes | `carla.mendes@centralconsult.example` | `demo1234` |

### Login

- Os usuários são os responsáveis comerciais (tabela `Responsavel`, com `email`, `senhaHash` e `ativo`). A senha é guardada com hash `scrypt`.
- A sessão é um cookie `httpOnly` assinado (HMAC-SHA256), válido por 12 horas. A assinatura usa `AUTH_SECRET` (no `.env`). **Em produção, defina um `AUTH_SECRET` aleatório com 32 caracteres ou mais**; sem ele, o servidor se recusa a assinar sessões.
- `src/middleware.ts` protege todas as rotas: sem sessão, as telas vão para `/login?proximo=<página>` e a API responde 401. Depois do login, o usuário volta para a página que pediu.
- Ainda não há: cadastro e troca de senha pela interface, recuperação de senha, perfis (vendedor/gestor) nem limite de tentativas de login.

Para rodar como produção local:

```bash
npm run build
npm start              # http://localhost:3000
```

Outros comandos:

| Comando | O que faz |
|---|---|
| `npm run setup` | `db:migrate` + `db:seed` de uma vez |
| `npm run db:reset` | Recria o banco do zero (pede confirmação do Prisma) e roda o seed |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verificação de tipos do TypeScript |
| `npm test` | Testes de regras e fluxos (Vitest) em um banco separado, `prisma/test.db` |
| `npm run test:e2e` | Os 8 cenários de aceite pela interface (Playwright). Rode `npm run build` antes. Usa o Microsoft Edge instalado e um banco separado, `prisma/e2e.db` |

> O Next.js envia telemetria anônima por padrão. Para desligar: `npx next telemetry disable`.
>
> O projeto está numa pasta do OneDrive. Se a sincronização travar o arquivo `prisma/dev.db`, pause a sincronização ou mova o projeto para uma pasta local.

### Dados de demonstração

- Eventos **COMSAÚDE 2027** (16 e 17/03/2027) e **IATECH RH 2027** (20/05/2027), com descrição e público-alvo.
- Séries **COMSAÚDE**, **IATECH RH** e **CONARTES**, com as edições de 2026 já realizadas e seus participantes (Fernanda e Mariana estiveram no COMSAÚDE 2026 e aparecem marcadas na lista de 2027).
- **Hospital Vida Plena** (fictícia) negocia **inscrições no COMSAÚDE** (contato Mariana, prazo futuro) e **patrocínio no IATECH RH** (contato Rafael, prazo hoje).
- Inscrição individual (contato sem empresa), tarefa atrasada (TalentoPro), venda fechada com pagamento pendente (Bem-Estar Seguros, R$ 28.500,00) e oportunidade perdida (Clínica Horizonte).
- Três responsáveis: Ana Ribeiro, Bruno Carvalho e Carla Mendes.

Os prazos são relativos ao dia em que o seed é executado, então sempre há tarefas atrasadas, de hoje e futuras.

### Demonstração online (Render)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/LucasBorges21/CRM_Central_Consult)

O `render.yaml` cria um serviço web gratuito a partir do `Dockerfile`:

- A cada início, o contêiner aplica as migrações e **recarrega os dados fictícios** (`prisma db seed`). O banco SQLite fica dentro do contêiner, então **o que for gravado se perde** quando o serviço reinicia ou "dorme" (plano gratuito: após 15 min sem acesso; o primeiro acesso depois disso leva cerca de 30 s).
- `AUTH_SECRET` é gerado pelo Render. `CRM_MOSTRAR_ACESSO_DEMO=1` mostra o acesso de demonstração na tela de login.
- Não use com dados reais: para isso falta a publicação de verdade (PostgreSQL, backup, perfis).

## Telas

| Menu | Rota | Conteúdo |
|---|---|---|
| Painel | `/` | Oportunidades abertas, propostas enviadas, retornos atrasados e vendas fechadas (quantidade + soma), com filtros de evento e tipo de venda |
| Funil | `/funil` | Colunas por etapa; cartão com evento, tipo, responsável, valor, próxima tarefa e seletor de etapa; filtros de evento, tipo e responsável |
| Agenda | `/agenda` | Tarefas pendentes em Atrasadas / Hoje / Futuras (fuso de São Paulo), filtro por responsável, concluir e reagendar |
| Cadastros › Contatos | `/cadastros/contatos` | Busca por Nome, Tag, E-mail, Telefone, CPF/CNPJ ou RG, como pessoa física, jurídica ou ambas; cards com telefones, e-mail, LinkedIn, tags e atalhos (Notas, Tags, Calendário, Negócios, Arquivos); filtros por tag e por negócios em andamento |
| — | `/cadastros/contatos/[id]` | Ficha do contato: dados pessoais, telefones, LinkedIn, perfil profissional, perfil da empresa, tags e abas Notas, Calendário, Negócios, Eventos e Arquivos |
| Cadastros › Empresas / Eventos | `/cadastros/empresas`, `/cadastros/eventos` | Empresas com CNPJ, site, porte, ramo e setor de atividade (ficha com contatos e oportunidades) e eventos agrupados por série |
| — | `/oportunidades/nova` | Nova oportunidade + primeira ação obrigatória |
| — | `/oportunidades/[id]` | Detalhe: dados comerciais, etapa, pagamento, contato, empresa, tarefas e linha do tempo |

## Eventos, séries e público-alvo

- **Série**: agrupa as edições anuais de um mesmo evento (COMSAÚDE, IATECH RH, CONARTES…). No formulário do evento, digite o nome da série: se já existir (sem diferença de acento ou maiúsculas), o evento entra nela; senão, ela é criada. A **edição** é o ano; em branco, usa o ano da data de início.
- **Descrição** livre e **público-alvo** em etiquetas (Enter ou vírgula para adicionar, com sugestões dos valores já usados). Os públicos ficam numa tabela própria (`PublicoAlvo`), reaproveitada entre eventos, para montar no futuro o mailing do público de cada evento.
- A lista de eventos mostra um bloco por série, com as edições da mais recente para a mais antiga. Na página do evento aparecem as outras edições da série e quem desta lista também se inscreveu em outra edição ("Também em: 2026"; filtro "Ver só essas").
- Na ficha do contato, as participações ficam agrupadas por série (aba Eventos e coluna lateral).

## Campo de empresa com digitação

Nos formulários de contato e de oportunidade, a empresa é escolhida digitando parte do nome (ou do CNPJ): as sugestões vêm do banco (`sugerirEmpresas`, até 8, primeiro as que começam com o texto), o que funciona com centenas de empresas. Se a empresa não existir, a opção **"+ Cadastrar empresa 'X'"** cria a empresa na hora (`obterOuCriarEmpresaPorNome`, sem duplicar nomes iguais). Funciona pelo teclado (setas, Enter, Esc). O componente é `src/modules/cadastros/componentes/SeletorEmpresa.tsx`.

## Participantes dos eventos

Em **Empresas e eventos › Eventos › (evento)** fica a lista de participantes, que substitui a planilha "Lista de Inscritos e Participantes":

- Cadastro do participante: pessoa (reaproveita o contato pelo e-mail ou cria contato e empresa), nome do crachá, participação (Presencial/Online/Híbrida), inscrição (cortesia com quem concedeu, ou pagante com lote, desconto e valor) e observações.
- Controles na própria lista: confirmação enviada (canal e data, também em lote), presença (A confirmar/Confirmada/Cancelada) e mudança de participação. Cada alteração fica no histórico do participante, com quem fez.
- **Importar planilha** (.xlsx no formato padrão): mostra uma prévia (novos, já inscritos, contatos novos/existentes, linhas com problema) antes de gravar; corrige variações como "Cotesia" e "Onilne"; não duplica quem já está inscrito.
- **Exportar** em CSV (abre no Excel): Mailing, Crachás (presencial/híbrida) e Lista completa.

## Identidade visual

O visual segue a "Opção A — SaaS moderno" aprovada no protótipo, com as cores da Central Consult:

| Token (Tailwind) | Cor | Uso |
|---|---|---|
| `marinho` | `#1F2B7A` | Logo, faixa da ficha do contato |
| `marca-600` | `#3F63C7` | Botões principais, links, item ativo (versão mais escura do azul royal `#5175D3`, para contraste com texto branco) |
| `ouro` | `#F2CE4E` | Botão "Nova oportunidade" e símbolo da marca (nunca como cor de texto sobre branco) |

- Tokens em `src/app/globals.css`; componentes base em `src/shared/ui/componentes.tsx`; ícones e símbolo da marca em `src/shared/ui/icones.tsx`.
- Fontes Inter e Plus Jakarta Sans empacotadas localmente (`@fontsource`), sem depender do Google Fonts.
- Cores de status são semânticas e independentes da marca: vermelho = atrasada/perdida, âmbar = hoje/pendente, verde = fechada/paga.

## Arquitetura

Uma única aplicação e um único banco, com o código organizado por módulo de negócio:

```
prisma/                 schema.prisma, migrations/, seed.ts
src/
  shared/               o que tem uso comum: db.ts (conexão), datas.ts (fuso SP, dd/mm/aaaa),
                        dinheiro.ts (centavos ↔ reais), validacao.ts, resultado.ts, ui/
  modules/
    cadastros/          Empresa, Contato, Evento, Responsável
    oportunidades/      negociações, etapas, perda, valor final, pagamento
    agenda/             tarefas, prazos, conclusão, reagendamento
    historico/          interações e mudanças de etapa (linha do tempo)
    painel/             indicadores (somente leitura)
  fluxos/               gravações que envolvem mais de um módulo, em transação
  app/                  rotas/telas (Next.js), que compõem leituras dos módulos
```

Cada módulo separa as camadas:

| Arquivo | Papel |
|---|---|
| `dominio.ts` | Constantes e regras puras (sem banco); pode ser usado pela interface |
| `schemas.ts` | Validação de entrada (Zod), sempre executada no servidor |
| `repositorio.ts` | Único ponto de acesso ao Prisma do módulo; aceita um `tx` para participar de transações |
| `servico.ts` | Operações internas do módulo (leituras e gravações com regras) — é o que os outros módulos chamam |
| `acoes.ts` | Server Actions finas chamadas pela interface: delegam ao serviço/fluxo e revalidam as telas |
| `componentes/` | Interface do módulo |

### Mapa dos módulos e dependências

```
                   ┌──────────────┐
                   │   cadastros  │  (não depende de nenhum módulo)
                   └──────▲───────┘
            valida vínculos│   ▲ valida responsável
                   ┌───────┴──────┐        ┌──────────┐
                   │ oportunidades│◄───────│  agenda  │  (usa só ETAPAS_ABERTAS do domínio)
                   └──────▲───────┘        └────▲─────┘
                          │                     │
     ┌────────────────────┼─────────────────────┤
     │                    │                     │
┌────┴─────┐       ┌──────┴──────┐        ┌─────┴─────┐
│  painel  │       │   fluxos    │───────►│ historico │ (não depende de nenhum módulo)
│ (leitura)│       │ (transações)│        └───────────┘
└──────────┘       └─────────────┘
```

Nenhum módulo importa `fluxos`, e `historico`/`cadastros` não importam outros módulos — não há dependências circulares.

| Módulo | Responsabilidade | Oferece (servico.ts) | Consulta |
|---|---|---|---|
| **Cadastros** | Empresas, contatos (telefones, tags, notas, eventos, arquivos), eventos, responsáveis; busca; validação de vínculos | `buscarEmpresas`, `buscarContatos`, `obterFichaContato`, `criar*/atualizar*`, `adicionarTag`, `criarNota`, `anexarArquivo`, `associarEvento`, `contatosParaOportunidade`, `verificarDuplicidadeEmail`, `validarVinculosOportunidade`, `validarResponsavel`, `validarContato` | — |
| **Oportunidades** | Negociações, etapas, perda, valor final, pagamento | `listarOportunidades`, `obterOportunidade`, `listarOportunidadesDaEmpresa`, `listarOportunidadesDoContato`, `negociosPorContato`, `prepararDadosOportunidade`, `prepararMudancaEtapa`, `aplicarMudancaEtapa`, `atualizarPagamento`, `contarOportunidades`, `resumoVendasFechadas` | Cadastros (vínculos) |
| **Agenda** | Tarefas (de oportunidade e/ou de contato), prazos, conclusão, reagendamento, fila de retornos | `criarTarefa`, `criarTarefaVinculada`, `concluirTarefa`, `reagendarTarefa`, `filaDeRetornos`, `tarefasDaOportunidade`, `tarefasDoContato`, `pendentesPorContato`, `proximasTarefas`, `contarRetornosAtrasados` | Cadastros (responsável, contato), Oportunidades (vínculo) |
| **Histórico** | Interações e mudanças de etapa | `registrarInteracao`, `registrarMudancaEtapa`, `linhaDoTempo` | — |
| **Painel** | Indicadores com filtros de evento e tipo | `indicadoresComerciais` | Oportunidades e Agenda |

### Pontos de comunicação

**Gravações coordenadas** — [`src/fluxos/oportunidade.ts`](src/fluxos/oportunidade.ts), cada uma em uma única transação (`prisma.$transaction`):

| Fluxo | Grava | Usado por |
|---|---|---|
| `criarOportunidadeComPrimeiraTarefa` | oportunidade + registro de criação no histórico + primeira tarefa. Se a tarefa falhar, nada é gravado | Tela "Nova oportunidade" |
| `mudarEtapa` | etapa (com valor final / motivo / pagamento) + registro no histórico | **Cartão do Funil e tela de detalhe** (mesmo componente `SeletorEtapa` → mesma ação `acaoMudarEtapa`) |
| `concluirTarefa` | conclusão + próxima tarefa opcional; exige decisão quando é a última pendente de oportunidade aberta | Agenda e detalhe |

**Leituras compostas** (as telas consultam vários módulos):

- Ficha da empresa (`src/app/cadastros/empresas/[id]/page.tsx`): Cadastros + `oportunidades.listarOportunidadesDaEmpresa`.
- Funil (`src/app/funil/page.tsx`): Oportunidades + `agenda.proximasTarefas`.
- Detalhe (`src/app/oportunidades/[id]/page.tsx`): Oportunidades + Agenda + Histórico + Cadastros.
- Painel (`src/modules/painel/servico.ts`): `oportunidades.contarOportunidades` / `resumoVendasFechadas` + `agenda.contarRetornosAtrasados`.

### Aba Contatos

**Busca** (`buscarContatos` em `src/modules/cadastros/servico.ts`): o campo escolhido e o tipo de pessoa definem onde procurar.

| Campo | Pessoa física (dados da pessoa) | Pessoa jurídica (dados da empresa → contatos dela) |
|---|---|---|
| Nome | nome + sobrenome | nome da empresa |
| Tag | tags do contato | — (tags são da pessoa) |
| E-mail | e-mail do contato | e-mail da empresa |
| Telefone | todos os telefones do contato | telefone da empresa |
| CPF / CNPJ | CPF | CNPJ |
| RG | RG | — |

"Física e Jurídica" procura nos dois. A busca ignora acentos, maiúsculas e pontuação (telefone, CPF, CNPJ e RG comparam só os dígitos/letras) e roda no banco, com 20 contatos por página. Para isso o banco guarda campos normalizados (`nomeBusca`, `numeroDigitos`, `telefoneDigitos`), recalculados ao salvar e por `prisma/reindexar.ts` (executado em `npm run db:migrate`).

**Onde fica cada informação**

- Contato: nome, sobrenome, CPF, RG, nascimento, e-mail, vários telefones (com tipo e um principal), LinkedIn, cargo, departamento, setor, mala direta, observações, tags, notas, eventos associados (interessado, participante, palestrante, patrocinador) e arquivos.
- Empresa: CNPJ, site, LinkedIn, telefone, e-mail, porte, ramo e setor de atividade. Esses dados aparecem automaticamente na ficha e no card de cada contato da empresa.
- Calendário do contato: usa a mesma Agenda. Uma tarefa pode ser só do contato, só da oportunidade ou dos dois. A Agenda mostra também as tarefas só de contato; o indicador "Retornos atrasados" continua contando apenas tarefas de oportunidades abertas.
- Negócios do contato: oportunidades em que ele é o contato principal (leitura do módulo Oportunidades).
- **Arquivos**: gravados em `dados/arquivos/<id do contato>/` (pasta fora do git; mude com a variável `CRM_PASTA_ARQUIVOS`). Limite de 10 MB por arquivo; executáveis são recusados. Download em `/api/contatos/[id]/arquivos/[arquivoId]`. Faça backup dessa pasta junto com `prisma/dev.db`.

A lista e a ficha **compõem leituras**: Cadastros (dados), Oportunidades (`negociosPorContato`, `listarOportunidadesDoContato`, `contatosComNegociosEmAndamento`) e Agenda (`pendentesPorContato`, `tarefasDoContato`). Cadastros continua sem importar nenhum outro módulo.

### Onde alterar uma regra do Funil

Em **[`src/modules/oportunidades/dominio.ts`](src/modules/oportunidades/dominio.ts)**:

- `ETAPAS`, `ROTULO_ETAPA` — etapas e nomes exibidos.
- `ETAPAS_ABERTAS` — o que conta como "aberta" (indicadores, fila de retornos, "Sem próxima ação").
- `validarMudancaEtapa` — exigências de cada etapa (motivo da perda, valor final, pagamento inicial, limpeza ao reabrir).

Como o cartão do Funil e o detalhe chamam o mesmo fluxo `mudarEtapa`, que usa essa função no servidor, a alteração vale para todas as telas.

### Onde conectar uma futura integração de WhatsApp

Em **[`src/modules/historico/servico.ts`](src/modules/historico/servico.ts)** → `registrarInteracao(oportunidadeId, { canal: "WHATSAPP", resumo, combinado }, { data })`.

Uma futura rota de webhook (por exemplo `src/app/api/integracoes/whatsapp/route.ts`) deve: autenticar a chamada, identificar a oportunidade (por exemplo pelo telefone do contato, usando uma nova leitura em Cadastros/Oportunidades) e chamar `registrarInteracao` com a data da mensagem. Validação, gravação e ordem da linha do tempo já ficam no Histórico. O mesmo vale para e-mail.

## Decisões de implementação

- **Dinheiro em centavos** (`Int`): `valorEstimadoCentavos`, `valorFinalCentavos`. Exibição em reais (`R$ 1.234,56`); a entrada aceita `1.234,56`, `1234,56` ou `1234.56`.
- **Datas**: prazos e datas de evento são guardados como a meia-noite de São Paulo do dia; "hoje", "atrasada" e "futura" são calculados no fuso `America/Sao_Paulo`. Exibição `dd/mm/aaaa`.
- **Sem próxima ação** é calculado (oportunidade aberta sem tarefa pendente), então nunca fica desatualizado. Aparece no cartão do Funil e no detalhe.
- **Pagamento** (`Pendente`/`Pago`) só existe em vendas fechadas; ao fechar começa como Pendente. Atualizar o pagamento não altera o valor final — a venda entra no total comercial mesmo pendente.
- **Documentos**: CPF e CNPJ têm os dígitos verificadores conferidos e são guardados só com números; telefones precisam ter DDD (10 ou 11 dígitos); LinkedIn precisa ser um endereço do linkedin.com.
- **Duplicidade de contato**: o e-mail é normalizado (minúsculas, sem espaços nas extremidades). Ao salvar um e-mail repetido, o sistema avisa e pede confirmação; a lista de contatos marca "Possível duplicidade".
- **Contato × empresa**: com empresa selecionada, o contato precisa pertencer a ela; sem empresa (compra individual), o contato precisa ser sem empresa. Validado no servidor.
- **Simulação de falha** (cenário de aceite 1): na tela "Nova oportunidade", em desenvolvimento (ou com `CRM_PERMITIR_SIMULACAO=1`), há uma caixa "simular falha ao gravar a primeira tarefa". Ela faz o banco recusar a gravação da tarefa (chave estrangeira inválida) dentro da transação, provando que a oportunidade não é criada. Não aparece em `npm start` sem a variável.
- Enums (etapa, tipo, canal, pagamento) são texto no SQLite e validados por Zod + `dominio.ts`.

## Verificação

- `npm test`: 63 testes de serviço — regras e fluxos (transação com falha na tarefa, perda sem motivo, fechamento sem valor, pagamento sem alterar valor, agenda no fuso de SP, fila sem oportunidades encerradas, duplicidade de e-mail, vínculo contato/empresa, filtros do painel), aba Contatos (busca por campo nos modos física/jurídica, CPF/CNPJ/LinkedIn, telefones, tags, notas, eventos, arquivos e calendário), login, participantes (inscrição, confirmação, presença, importação) e eventos (série, edição, público-alvo, sugestão e cadastro rápido de empresa, participantes em outras edições).
- `npm run test:e2e`: 12 cenários no navegador — login, os 8 cenários de aceite (incluindo recarregar a página e reiniciar o servidor), aba Contatos, participantes do evento e séries de eventos com público-alvo e empresa cadastrada pela digitação.

## Fora do escopo desta versão

Perfis e permissões, importação da base de contatos, integrações (WhatsApp, e-mail, pagamento), IA e publicação. WhatsApp, e-mail e pagamento são registrados manualmente.
