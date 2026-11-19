/**
 * Cenários de aceite (seção 6 da especificação), executados pela interface.
 * Rodam em série sobre o mesmo banco de demonstração; o cenário 7 vem primeiro porque confere
 * os números exatos dos dados de demonstração antes de qualquer alteração.
 */
import { expect, test, type Page } from "@playwright/test";
import { iniciarServidor, pararServidor } from "./servidor";

test.describe.configure({ mode: "serial" });

const sufixo = Date.now().toString().slice(-6);
const hojeSP = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
function diaRelativo(n: number) {
  const [a, m, d] = hojeSP().split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
}

let urlIndividual = "";

test.beforeAll(async () => {
  await iniciarServidor();
});
test.afterAll(async () => {
  await pararServidor();
});

const EMAIL_DEMO = "ana.ribeiro@centralconsult.example";

async function entrar(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(EMAIL_DEMO);
  await page.getByLabel("Senha", { exact: true }).fill("demo1234");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByTestId("usuario-logado")).toHaveText("Ana Ribeiro");
}

// Todos os cenários, exceto o de login, começam autenticados.
test.beforeEach(async ({ page }, info) => {
  if (!info.title.startsWith("0.")) await entrar(page);
});

test("0. Login: rotas protegidas, senha incorreta, volta à página pedida e sair", async ({ page }) => {
  await page.goto("/agenda");
  await expect(page).toHaveURL(/\/login\?proximo=%2Fagenda/);
  await expect(page.getByRole("heading", { name: "Entrar no CRM" })).toBeVisible();

  const api = await page.request.get("/api/contatos/x/arquivos/y");
  expect(api.status()).toBe(401);

  await page.getByLabel("E-mail", { exact: true }).fill(EMAIL_DEMO);
  await page.getByLabel("Senha", { exact: true }).fill("senha-errada");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "E-mail ou senha incorretos." }).first()).toBeVisible();
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel("Senha", { exact: true }).fill("demo1234");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/agenda$/);
  await expect(page.getByTestId("usuario-logado")).toHaveText("Ana Ribeiro");

  // Logado, /login volta para o CRM
  await page.goto("/login");
  await expect(page).not.toHaveURL(/\/login/);

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

async function aviso(page: Page, texto: string | RegExp) {
  await expect(page.locator("[role=status], [role=alert]").filter({ hasText: texto }).first()).toBeVisible();
}

async function indicadores(page: Page) {
  const ler = (r: string) => page.getByTestId(`indicador-${r}`).innerText();
  return {
    abertas: await ler("Oportunidades abertas"),
    propostas: await ler("Propostas enviadas"),
    atrasados: await ler("Retornos atrasados"),
    fechadas: await ler("Vendas fechadas"),
  };
}

async function preencherOportunidade(
  page: Page,
  o: { titulo: string; contato: string; tarefa: string; valor: string; evento?: string; tipo?: string },
) {
  await page.getByLabel("Título").fill(o.titulo);
  await page.getByLabel("Evento").selectOption({ label: o.evento ?? "COMSAÚDE 2027" });
  await page.getByLabel("Tipo de venda").selectOption({ label: o.tipo ?? "Inscrição" });
  await page.getByLabel("Contato principal").selectOption({ label: o.contato });
  await page.getByLabel("Origem do lead").selectOption({ label: "Site" });
  await page.getByLabel("Responsável comercial").selectOption({ label: "Ana Ribeiro" });
  await page.getByLabel("Valor estimado (R$)").fill(o.valor);
  await page.getByLabel("Descrição").fill(o.tarefa);
  await page.getByLabel("Prazo").fill(diaRelativo(1));
  await page.getByLabel("Responsável", { exact: true }).selectOption({ label: "Ana Ribeiro" });
}

test("7. Painel filtrado por evento e tipo de venda confere com os dados de demonstração", async ({ page }) => {
  await page.goto("/");
  expect(await indicadores(page)).toEqual({ abertas: "5", propostas: "2", atrasados: "1", fechadas: "R$ 28.500,00" });

  const escolherEvento = async (nome: string) => {
    await page.getByRole("button", { name: /^Evento:/ }).click();
    await page.getByRole("navigation", { name: "Filtrar por evento" }).getByRole("link", { name: new RegExp(`^${nome}`) }).click();
  };
  const tipo = page.getByRole("navigation", { name: "Filtrar por tipo de venda" });
  await escolherEvento("COMSAÚDE 2027");
  await expect(page).toHaveURL(/evento=/);
  await expect(page.getByTestId("indicador-Oportunidades abertas")).toHaveText("2");
  expect(await indicadores(page)).toEqual({ abertas: "2", propostas: "0", atrasados: "0", fechadas: "R$ 28.500,00" });

  await escolherEvento("IATECH RH 2027");
  await expect(page).toHaveURL(/evento=/);
  await tipo.getByRole("link", { name: "Inscrições", exact: true }).click();
  await expect(page).toHaveURL(/tipo=INSCRICAO/);
  await expect(page.getByTestId("indicador-Vendas fechadas")).toHaveText("R$ 0,00");
  expect(await indicadores(page)).toEqual({ abertas: "2", propostas: "1", atrasados: "1", fechadas: "R$ 0,00" });

  await escolherEvento("Todos os eventos");
  await expect(page).not.toHaveURL(/evento=/);
  await tipo.getByRole("link", { name: "Patrocínios", exact: true }).click();
  await expect(page).toHaveURL(/tipo=PATROCINIO/);
  await expect(page.getByTestId("indicador-Oportunidades abertas")).toHaveText("1");
  expect(await indicadores(page)).toEqual({ abertas: "1", propostas: "1", atrasados: "0", fechadas: "R$ 28.500,00" });
});

test("1. Empresa + contato + oportunidade com primeira tarefa; falha na tarefa não cria a oportunidade", async ({ page }) => {
  const empresa = `Empresa Teste ${sufixo}`;
  const titulo = `Inscrições equipe ${sufixo}`;
  await page.goto("/cadastros/empresas");
  await page.getByRole("button", { name: "+ Nova empresa" }).click();
  await page.getByLabel("Nome da empresa").fill(empresa);
  await page.getByRole("button", { name: "Salvar empresa" }).click();
  await aviso(page, "Empresa criada.");
  await expect(page.getByRole("heading", { name: empresa })).toBeVisible();

  await page.getByRole("button", { name: "+ Adicionar contato" }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Contato Teste");
  await page.getByLabel("E-mail", { exact: true }).fill(`contato.${sufixo}@teste.example`);
  await page.getByRole("button", { name: "Salvar contato" }).click();
  await aviso(page, "Contato criado.");
  await expect(page.getByText(`contato.${sufixo}@teste.example`)).toBeVisible();
  const urlFicha = page.url();

  await page.getByRole("link", { name: "+ Nova oportunidade" }).last().click();
  await expect(page.getByLabel("Empresa", { exact: true })).toHaveValue(/.+/);
  await preencherOportunidade(page, {
    titulo,
    contato: `Contato Teste — contato.${sufixo}@teste.example`,
    tarefa: "Ligar para apresentar o evento",
    valor: "2.000,00",
  });

  // Falha simulada na gravação da tarefa → nada é criado
  await page.getByLabel(/simular falha/i).check();
  await page.getByRole("button", { name: "Criar oportunidade" }).click();
  await aviso(page, "Não foi possível gravar a primeira tarefa. A oportunidade não foi criada.");
  await expect(page).toHaveURL(/\/oportunidades\/nova/);

  // Gravação normal
  await page.getByLabel(/simular falha/i).uncheck();
  await page.getByRole("button", { name: "Criar oportunidade" }).click();
  await aviso(page, "Oportunidade criada com a primeira tarefa.");
  await expect(page.getByRole("heading", { name: titulo })).toBeVisible();
  await expect(page.getByTestId("tarefa").filter({ hasText: "Ligar para apresentar o evento" })).toBeVisible();

  // Ficha da empresa: só uma oportunidade (a tentativa com falha não foi gravada)
  await page.goto(urlFicha);
  await expect(page.getByRole("heading", { name: "Oportunidades (1)" })).toBeVisible();
  await expect(page.getByRole("link", { name: titulo })).toHaveCount(1);
});

test("2. Inscrição individual com contato sem empresa", async ({ page }) => {
  const email = `pf.${sufixo}@email.example`;
  await page.goto("/cadastros/contatos");
  await page.getByRole("button", { name: "+ Adicionar contato" }).click();
  const modalPf = page.getByRole("dialog", { name: "Adicionar contato" });
  await modalPf.getByLabel("Nome", { exact: true }).fill(`Pessoa Física ${sufixo}`);
  await modalPf.getByLabel("E-mail", { exact: true }).fill(email);
  await expect(modalPf.getByLabel("Empresa", { exact: true })).toHaveValue("");
  await modalPf.getByRole("button", { name: "Salvar contato" }).click();
  await aviso(page, "Contato criado.");
  await expect(page.getByText("Pessoa física, sem empresa vinculada.")).toBeVisible();

  await page.goto("/oportunidades/nova");
  await expect(page.getByLabel("Empresa", { exact: true })).toHaveValue("");
  await preencherOportunidade(page, {
    titulo: `Inscrição individual ${sufixo}`,
    contato: `Pessoa Física ${sufixo} — ${email}`,
    tarefa: "Enviar link de inscrição",
    valor: "1.290,00",
  });
  await page.getByRole("button", { name: "Criar oportunidade" }).click();
  await aviso(page, "Oportunidade criada com a primeira tarefa.");
  await expect(page.getByText("Compra individual (sem empresa).")).toBeVisible();
  urlIndividual = page.url();
});

test("3. Interação + mudança para Proposta enviada aparecem na linha do tempo", async ({ page }) => {
  await page.goto(urlIndividual);
  await page.getByLabel("Canal").selectOption({ label: "WhatsApp" });
  await page.getByLabel("Resumo da conversa").fill("Cliente pediu parcelamento em 3x.");
  await page.getByLabel("O que ficou combinado").fill("Enviar proposta com parcelamento.");
  await page.getByRole("button", { name: "Registrar interação" }).click();
  await aviso(page, "Interação registrada na linha do tempo.");

  await page.getByRole("list", { name: "Etapas da negociação" }).getByRole("button", { name: /Proposta enviada/ }).click();
  await aviso(page, "Etapa atualizada e registrada no histórico.");

  const itens = page.getByRole("list", { name: "Linha do tempo" }).getByRole("listitem");
  await expect(itens.first()).toContainText("Etapa alterada de Novo para Proposta enviada.");
  await expect(itens.nth(1)).toContainText("Cliente pediu parcelamento em 3x.");
  await expect(itens.nth(1)).toContainText("WhatsApp");
  await expect(itens.nth(1)).toContainText("Enviar proposta com parcelamento.");
});

test("4. Reagendar e concluir tarefas; concluir a última e agendar a próxima no mesmo fluxo", async ({ page }) => {
  // Reagendar pela agenda (tarefa futura dos dados de demonstração)
  await page.goto("/agenda");
  const tarefaThiago = page.getByTestId("tarefa").filter({ hasText: "Enviar link de inscrição pelo WhatsApp" });
  await tarefaThiago.getByRole("button", { name: "Reagendar" }).click();
  await tarefaThiago.getByLabel("Novo prazo").fill(diaRelativo(10));
  await tarefaThiago.getByRole("button", { name: "Salvar prazo" }).click();
  await aviso(page, "Prazo reagendado.");
  const [a, m, d] = diaRelativo(10).split("-");
  await expect(
    page.locator("[data-grupo=FUTURA]").getByTestId("tarefa").filter({ hasText: "Enviar link de inscrição pelo WhatsApp" }),
  ).toContainText(`${d}/${m}/${a}`);

  // Na oportunidade individual: adicionar uma tarefa, concluir uma (não é a última), depois a última com próxima ação
  await page.goto(urlIndividual);
  await page.getByRole("button", { name: "+ Nova tarefa" }).click();
  await page.getByLabel("Descrição").fill("Confirmar recebimento da proposta");
  await page.getByLabel("Prazo").fill(diaRelativo(0));
  await page.getByRole("button", { name: "Salvar tarefa" }).click();
  await aviso(page, "Tarefa criada.");

  await page.getByTestId("tarefa").filter({ hasText: "Enviar link de inscrição" }).getByRole("button", { name: "Concluir" }).click();
  await aviso(page, /^Tarefa concluída\.$/);
  await expect(page.getByTestId("tarefa")).toHaveCount(1);

  await page.getByTestId("tarefa").filter({ hasText: "Confirmar recebimento" }).getByRole("button", { name: "Concluir" }).click();
  const modal = page.getByRole("dialog", { name: "Concluir e agendar a próxima ação" });
  await expect(modal).toBeVisible();
  await modal.getByLabel("Descrição").fill("Cobrar retorno sobre a proposta");
  await modal.getByLabel("Prazo").fill(diaRelativo(3));
  await modal.getByRole("button", { name: "Concluir e agendar próxima" }).click();
  await aviso(page, "Tarefa concluída e próxima ação agendada.");
  await expect(page.getByTestId("tarefa")).toHaveCount(1);
  await expect(page.getByTestId("tarefa")).toContainText("Cobrar retorno sobre a proposta");
  await expect(page.getByTestId("tarefa-concluida")).toHaveCount(2);
  await expect(page.getByText("Sem próxima ação")).toHaveCount(0);

  await page.goto("/agenda");
  await expect(page.locator("[data-grupo=FUTURA]").getByText("Cobrar retorno sobre a proposta")).toBeVisible();
  await expect(page.getByText("Confirmar recebimento da proposta")).toHaveCount(0);
});

test("5. Perdido exige motivo (pelo cartão do Funil)", async ({ page }) => {
  await page.goto("/funil");
  const titulo = "Inscrições time de RH — TalentoPro";
  await page.getByLabel(`Mudar etapa de ${titulo}`).selectOption({ label: "Perdido" });
  const modal = page.getByRole("dialog", { name: "Marcar como perdida" });
  await modal.getByRole("button", { name: "Confirmar perda" }).click();
  await expect(modal.getByText("Informe o motivo da perda.")).toBeVisible();
  await expect(page.locator("[data-etapa=EM_NEGOCIACAO]").getByRole("link", { name: titulo })).toBeVisible();

  await modal.getByLabel("Motivo da perda").fill("Cliente optou por evento concorrente.");
  await modal.getByRole("button", { name: "Confirmar perda" }).click();
  await aviso(page, "Etapa atualizada e registrada no histórico.");
  await expect(page.locator("[data-etapa=PERDIDO]").getByRole("link", { name: titulo })).toBeVisible();

  await page.locator("[data-etapa=PERDIDO]").getByRole("link", { name: titulo }).click();
  await expect(page.getByText("Cliente optou por evento concorrente.").first()).toBeVisible();
  // tarefa da oportunidade perdida sai da fila de retornos
  await page.goto("/agenda");
  await expect(page.getByText("Retornar à Juliana sobre o desconto para grupo")).toHaveCount(0);
});

test("6. Fechar venda com valor final; pagamento Pago não altera o total fechado", async ({ page }) => {
  await page.goto("/funil");
  await page.getByRole("link", { name: "Patrocínio cota Ouro — Vida Plena" }).click();
  await page.getByRole("button", { name: "Fechar venda" }).click();
  const modal = page.getByRole("dialog", { name: "Fechar venda" });
  await modal.getByLabel("Valor final (R$)").fill("");
  await modal.getByRole("button", { name: "Confirmar fechamento" }).click();
  await expect(modal.getByText("Informe o valor final da venda.")).toBeVisible();
  await modal.getByLabel("Valor final (R$)").fill("42.000,00");
  await modal.getByRole("button", { name: "Confirmar fechamento" }).click();
  await aviso(page, "Etapa atualizada e registrada no histórico.");
  await expect(page.getByText("Pagamento pendente").first()).toBeVisible();
  const urlVenda = page.url();

  await page.goto("/");
  await expect(page.getByTestId("indicador-Vendas fechadas")).toHaveText("R$ 70.500,00");
  await expect(page.getByText("2 vendas fechadas")).toBeVisible();

  await page.goto(urlVenda);
  await page.getByRole("button", { name: "Pago", exact: true }).click();
  await aviso(page, "Status do pagamento atualizado.");
  await expect(page.getByText("Pagamento pago").first()).toBeVisible();
  await expect(page.getByText("R$ 42.000,00").first()).toBeVisible();

  await page.goto("/");
  await expect(page.getByTestId("indicador-Vendas fechadas")).toHaveText("R$ 70.500,00");
});

test("8. Dados persistem após recarregar a página e reiniciar a aplicação", async ({ page }) => {
  await page.goto(urlIndividual);
  await page.reload();
  await expect(page.getByText("Cliente pediu parcelamento em 3x.")).toBeVisible();

  await pararServidor();
  await iniciarServidor();

  await page.goto(urlIndividual);
  await expect(page.getByText("Cliente pediu parcelamento em 3x.")).toBeVisible();
  await expect(page.getByTestId("tarefa")).toContainText("Cobrar retorno sobre a proposta");
  await page.goto("/");
  await expect(page.getByTestId("indicador-Vendas fechadas")).toHaveText("R$ 70.500,00");
});

test("9. Contatos: busca por campo e pessoa física/jurídica, ficha completa com tags, notas, calendário, arquivos e negócios", async ({ page }) => {
  const buscar = async (termo: string, campo: string, pessoa: string) => {
    await page.getByLabel("Termo da busca").fill(termo);
    await page.getByRole("group", { name: "Buscar por" }).getByText(campo, { exact: true }).click();
    await page.getByRole("group", { name: "Tipo de pessoa" }).getByText(pessoa, { exact: true }).click();
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(page).toHaveURL(/q=/);
  };
  const cards = page.getByTestId("card-contato");

  await page.goto("/cadastros/contatos");
  await buscar("vida plena", "Nome", "Jurídica");
  await expect(page.getByTestId("total-contatos")).toHaveText("Foram encontrados 2 contatos");
  await expect(cards.filter({ hasText: "Mariana Lopes" })).toBeVisible();
  await expect(cards.filter({ hasText: "Rafael Souza" })).toBeVisible();

  await buscar("vida plena", "Nome", "Física");
  await expect(page.getByTestId("total-contatos")).toHaveText("Foram encontrados 0 contatos");

  await buscar("98888-1001", "Telefone", "Física e jurídica");
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("Mariana Lopes");

  await buscar("123.456.789-09", "CPF / CNPJ", "Física");
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("Thiago Martins");

  // Novo contato completo
  const sobrenome = `Teste ${sufixo}`;
  await page.goto("/cadastros/contatos");
  await page.getByRole("button", { name: "+ Adicionar contato" }).click();
  const modal = page.getByRole("dialog", { name: "Adicionar contato" });
  await modal.getByLabel("Nome", { exact: true }).fill("Bianca");
  await modal.getByLabel("Sobrenome").fill(sobrenome);
  await modal.getByLabel("E-mail", { exact: true }).fill(`bianca.${sufixo}@vidaplena.example`);
  await modal.getByLabel("Número do telefone 1").fill("(11) 97000-1234");
  await modal.getByRole("button", { name: "+ Adicionar telefone" }).click();
  await modal.getByLabel("Tipo do telefone 2").selectOption({ label: "Comercial" });
  await modal.getByLabel("Número do telefone 2").fill("(11) 3333-1050");
  await modal.getByLabel("LinkedIn").fill("linkedin.com/in/bianca-teste");
  // Empresa: digita parte do nome e escolhe a sugestão
  await modal.getByRole("combobox", { name: "Empresa" }).fill("vida pl");
  await modal.getByRole("option", { name: /Hospital Vida Plena/ }).click();
  await expect(modal.getByRole("combobox", { name: "Empresa" })).toHaveValue("Hospital Vida Plena");
  await modal.getByLabel("Cargo").fill("Coordenadora de Eventos");
  await modal.getByLabel("Departamento").fill("Marketing");
  await modal.getByLabel("Deseja receber mala direta").check();
  await modal.getByRole("button", { name: "Salvar contato" }).click();
  await aviso(page, "Contato criado.");
  await expect(page.getByRole("heading", { name: `Bianca ${sobrenome}` })).toBeVisible();
  const urlFicha = page.url();
  await expect(page.getByText("(11) 97000-1234").first()).toBeVisible();
  await expect(page.getByText("(11) 3333-1050").first()).toBeVisible();
  await expect(page.getByRole("link", { name: `LinkedIn de Bianca ${sobrenome}` })).toHaveAttribute("href", "https://linkedin.com/in/bianca-teste");
  await expect(page.getByText("Hospital geral")).toBeVisible(); // perfil da empresa vem da Empresa

  // Tag
  await page.getByLabel("Nova tag").fill("Decisor");
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await aviso(page, "Tag adicionada.");
  await expect(page.getByRole("button", { name: "Remover tag Decisor" })).toBeVisible();

  // Nota
  await page.getByLabel("Nova nota").fill("Cuida dos patrocínios do hospital.");
  await page.getByRole("button", { name: "Salvar nota" }).click();
  await aviso(page, "Nota registrada.");
  await expect(page.getByTestId("nota")).toContainText("Cuida dos patrocínios do hospital.");

  // Calendário
  await page.getByRole("link", { name: /^Calendário/ }).click();
  await expect(page).toHaveURL(/aba=calendario/);
  await page.getByLabel("Descrição").fill(`Apresentar cotas ${sufixo}`);
  await page.getByLabel("Prazo").fill(diaRelativo(2));
  await page.getByLabel("Responsável", { exact: true }).selectOption({ label: "Bruno Carvalho" });
  await page.getByRole("button", { name: "Agendar tarefa" }).click();
  await aviso(page, "Tarefa agendada.");
  await expect(page.getByTestId("tarefa").filter({ hasText: `Apresentar cotas ${sufixo}` })).toBeVisible();

  // Arquivo: anexar e baixar
  await page.getByRole("link", { name: /^Arquivos/ }).click();
  await page.getByLabel("Anexar arquivo").setInputFiles({
    name: "proposta-patrocinio.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 proposta de teste"),
  });
  await page.getByRole("button", { name: "Enviar arquivo" }).click();
  await aviso(page, "Arquivo anexado.");
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "proposta-patrocinio.pdf" }).click();
  expect((await download).suggestedFilename()).toBe("proposta-patrocinio.pdf");

  // Negócios: atalho cria oportunidade com empresa e contato já selecionados
  await page.getByRole("link", { name: /^Negócios/ }).click();
  await expect(page.getByText("Nenhuma oportunidade vinculada.")).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "Nova oportunidade", exact: true }).click();
  await expect(page.getByLabel("Contato principal")).toHaveValue(/.+/);
  await expect(page.getByLabel("Contato principal").locator("option:checked")).toHaveText(new RegExp(`Bianca ${sobrenome}`));

  // A tarefa do contato aparece na Agenda
  await page.goto("/agenda");
  const tarefa = page.getByTestId("tarefa").filter({ hasText: `Apresentar cotas ${sufixo}` });
  await expect(tarefa).toContainText(`Bianca ${sobrenome}`);

  // Persistência e contadores no card
  await page.goto(urlFicha);
  await page.reload();
  await expect(page.getByTestId("nota")).toContainText("Cuida dos patrocínios do hospital.");
  await page.goto("/cadastros/contatos");
  await buscar(sobrenome, "Nome", "Física e jurídica");
  const card = cards.first();
  await expect(card.getByRole("link", { name: "Notas (1)" })).toBeVisible();
  await expect(card.getByRole("link", { name: "Tags (1)" })).toBeVisible();
  await expect(card.getByRole("link", { name: "Calendário (1)" })).toBeVisible();
  await expect(card.getByRole("link", { name: "Arquivos (1)" })).toBeVisible();
});

test("10. Participantes do evento: inscrever, confirmar, presença, lote, exportar e importar planilha", async ({ page }) => {
  const email = `inscrita.${sufixo}@empresa.example`;
  await page.goto("/cadastros/eventos");
  await page.getByRole("link", { name: "IATECH RH 2027" }).click();
  await expect(page.getByRole("heading", { name: "IATECH RH 2027" })).toBeVisible();
  await expect(page.getByTestId("resumo-Inscritos")).toHaveText("3");

  // Inscrever
  await page.getByRole("button", { name: "Adicionar participante" }).click();
  const modal = page.getByRole("dialog", { name: "Adicionar participante" });
  await modal.getByLabel("Nome completo").fill(`Inscrita Teste ${sufixo}`);
  await modal.getByLabel("E-mail", { exact: true }).fill(email);
  await modal.getByLabel("Celular / WhatsApp").fill("(11) 98765-4321");
  await modal.getByLabel("Empresa", { exact: true }).fill(`Empresa Inscrita ${sufixo}`);
  await modal.getByLabel("Cargo").fill("Analista de RH");
  await expect(modal.getByLabel("Nome para o crachá")).toHaveValue("INSCRITA TESTE");
  await modal.getByRole("group", { name: "Participação" }).getByText("Online", { exact: true }).click();
  await modal.getByLabel("Cortesia concedida por").fill("Diretoria");
  await modal.getByRole("button", { name: "Inscrever" }).click();
  await aviso(page, "Participante inscrito.");
  await expect(page.getByTestId("resumo-Inscritos")).toHaveText("4");
  const linha = page.getByTestId("participante").filter({ hasText: email });
  await expect(linha).toContainText("Cortesia · Diretoria");

  // Confirmação e presença na própria linha
  await linha.getByLabel(`Marcar confirmação enviada para Inscrita Teste ${sufixo}`).selectOption({ label: "por WhatsApp" });
  await aviso(page, "Confirmação marcada como enviada.");
  await expect(linha).toContainText("Enviada");
  await linha.getByLabel(`Presença de Inscrita Teste ${sufixo}`).selectOption({ label: "Confirmada" });
  await aviso(page, "Presença atualizada.");

  // Ação em lote: confirmação para todos os que faltam
  await page.goto(page.url().split("?")[0] + "?confirmacao=PENDENTE");
  await page.getByLabel("Selecionar todos").check();
  await page.getByLabel("Marcar confirmação enviada para os selecionados").selectOption({ label: "por E-mail" });
  await aviso(page, /para \d+ participantes/);
  await expect(page.getByText("Nenhum participante encontrado.")).toBeVisible();

  // Exportar mailing
  await page.goto(page.url().split("?")[0]);
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Mailing (CSV)" }).click();
  const arquivo = await download;
  expect(arquivo.suggestedFilename()).toBe("iatech-rh-2027-mailing.csv");
  const fs = await import("node:fs/promises");
  expect(await fs.readFile((await arquivo.path())!, "utf-8")).toContain(email);

  // Importar planilha no formato padrão
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Participantes");
  ws.addRow([null, "NOME", "NOME PARA CRACHÁ", "EMPRESA", "CARGO", "DDD", "TELEFONE", "DDD", "CEL", "EMAIL DO PARTICIPANTE", "PARTICIPAÇÃO", "OBSERVAÇÕES", "Confirmação LIGAÇÃO e/ou Whats e/ou email", "Confirmação de presença"]);
  ws.addRow([null, `Importado Um ${sufixo}`, "IMPORTADO UM", "Empresa Importada", "Gerente", null, null, 11, "91111-1111", `um.${sufixo}@importada.example`, "Presencial", "Cortesia - Parceiro", "Enviado", null]);
  ws.addRow([null, `Importado Dois ${sufixo}`, "IMPORTADO DOIS", "Empresa Importada", "Analista", null, null, 21, "92222-2222", `dois.${sufixo}@importada.example`, "Onilne", "1ª Tabela", null, null]);
  await page.getByRole("button", { name: "Importar planilha" }).click();
  const imp = page.getByRole("dialog", { name: /Importar participantes/ });
  await imp.getByLabel("Planilha (.xlsx)").setInputFiles({
    name: "inscritos.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(await wb.xlsx.writeBuffer()),
  });
  await imp.getByRole("button", { name: "Pré-visualizar" }).click();
  await expect(imp.getByLabel("Prévia da importação")).toContainText("Serão inscritos2");
  await imp.getByRole("button", { name: "Importar 2 participante(s)" }).click();
  await aviso(page, "Planilha importada.");
  await expect(page.getByTestId("resumo-Inscritos")).toHaveText("6");
  await expect(page.getByTestId("participante").filter({ hasText: `dois.${sufixo}@importada.example` })).toContainText("1ª Tabela");
});

test("11. Séries de eventos, público-alvo, participantes recorrentes e empresa cadastrada pela digitação", async ({ page }) => {
  // Lista agrupada por série, com as edições
  await page.goto("/cadastros/eventos");
  const serie = page.getByRole("region", { name: "Série COMSAÚDE" });
  await expect(serie.getByRole("link", { name: "COMSAÚDE 2027" })).toBeVisible();
  await expect(serie.getByRole("link", { name: "COMSAÚDE 2026" })).toBeVisible();
  await expect(serie.getByLabel("Público-alvo de COMSAÚDE 2027")).toContainText("SST");

  // Página do evento: edições da série e quem já participou antes
  await serie.getByRole("link", { name: "COMSAÚDE 2027" }).click();
  await expect(page.getByRole("heading", { name: "COMSAÚDE 2027" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Edições da série" }).getByRole("link", { name: /COMSAÚDE 2026/ })).toBeVisible();
  await expect(page.getByTestId("recorrentes")).toContainText("2 pessoa(s)");
  const fernanda = page.getByTestId("participante").filter({ hasText: "FERNANDA COSTA" });
  await expect(fernanda.getByTestId("outras-edicoes")).toContainText("2026");

  // Editar o evento: novo público-alvo em etiqueta
  await page.getByRole("button", { name: "Editar evento" }).click();
  const modalEvento = page.getByRole("dialog", { name: "Editar evento" });
  await modalEvento.getByLabel("Público-alvo").fill(`Gestores ${sufixo}`);
  await modalEvento.getByLabel("Público-alvo").press("Enter");
  await expect(modalEvento.getByRole("button", { name: `Remover Gestores ${sufixo}` })).toBeVisible();
  await modalEvento.getByRole("button", { name: "Salvar evento" }).click();
  await aviso(page, "Evento atualizado.");
  await expect(page.getByRole("list", { name: "Público-alvo" })).toContainText(`Gestores ${sufixo}`);
  await expect(page.getByRole("list", { name: "Público-alvo" })).toContainText("Saúde ocupacional");

  // Ficha do contato: participações agrupadas por série
  await fernanda.getByRole("link", { name: /Fernanda/ }).click();
  await expect(page.getByRole("heading", { name: "Fernanda Costa" })).toBeVisible();
  await page.goto(`${page.url().split("?")[0]}?aba=eventos`);
  const participacoes = page.getByRole("region", { name: "Participações em COMSAÚDE" }).first();
  await expect(participacoes).toContainText("2027");
  await expect(participacoes).toContainText("2026");

  // Novo evento numa série existente, digitando o nome sem acento
  await page.goto("/cadastros/eventos");
  await page.getByRole("button", { name: "+ Novo evento" }).click();
  const novo = page.getByRole("dialog", { name: "Novo evento" });
  await novo.getByLabel("Nome do evento").fill(`CONARTES 2027 ${sufixo}`);
  await novo.getByLabel("Série do evento").fill("conartes");
  await novo.getByLabel("Data de início").fill("2027-09-23");
  await novo.getByRole("button", { name: "Salvar evento" }).click();
  await aviso(page, "Evento criado.");
  const conartes = page.getByRole("region", { name: "Série CONARTES" });
  await expect(conartes.getByRole("link", { name: `CONARTES 2027 ${sufixo}` })).toBeVisible();
  await expect(conartes).toContainText("2 edição(ões)");

  // Contato com empresa nova cadastrada pela digitação
  const empresaNova = `Clínica Digitada ${sufixo}`;
  await page.goto("/cadastros/contatos");
  await page.getByRole("button", { name: "+ Adicionar contato" }).click();
  const modal = page.getByRole("dialog", { name: "Adicionar contato" });
  await modal.getByLabel("Nome", { exact: true }).fill(`Pessoa Empresa ${sufixo}`);
  await modal.getByLabel("E-mail", { exact: true }).fill(`pessoa.empresa.${sufixo}@teste.example`);
  const campoEmpresa = modal.getByRole("combobox", { name: "Empresa" });
  await campoEmpresa.fill(empresaNova);
  await modal.getByRole("option", { name: `+ Cadastrar empresa “${empresaNova}”` }).click();
  await aviso(page, `Empresa “${empresaNova}” cadastrada.`);
  await expect(campoEmpresa).toHaveValue(empresaNova);
  await modal.getByRole("button", { name: "Salvar contato" }).click();
  await aviso(page, "Contato criado.");
  await expect(page.getByRole("link", { name: empresaNova }).first()).toBeVisible();

  // Teclado: setas + Enter escolhem a sugestão
  await page.getByRole("link", { name: "+ Novo", exact: true }).first().click();
  const empresaOp = page.getByRole("combobox", { name: "Empresa" });
  await expect(empresaOp).toHaveValue(empresaNova);
  await empresaOp.fill("hospital vida");
  await expect(page.getByRole("option", { name: /Hospital Vida Plena/ })).toBeVisible();
  await empresaOp.press("Enter");
  await expect(empresaOp).toHaveValue("Hospital Vida Plena");
  await expect(page.getByLabel("Contato principal")).toContainText("Mariana");
});
