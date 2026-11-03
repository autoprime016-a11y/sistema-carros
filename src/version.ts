// Controle de versões do sistema Auto Prime.
// A cada publicação: aumente APP_VERSION, acrescente a versão no topo de VERSION_HISTORY,
// atualize "version" no package.json e registre no CHANGELOG.md.

export const APP_VERSION = "1.7.2";

export type VersionEntry = {
  versao: string;
  data: string; // AAAA-MM-DD
  titulo: string;
  itens: string[];
};

export const VERSION_HISTORY: VersionEntry[] = [
  {
    versao: "1.7.2",
    data: "2026-11-03",
    titulo: "Mês da despesa operacional no formulário",
    itens: [
      "Campo \"Mês da despesa (competência)\" no formulário de despesas operacionais, para lançar meses passados",
      "Aviso quando a data do pagamento é de um mês diferente do mês da despesa (não impede)",
      "Ao corrigir uma despesa operacional dá para trocar o mês dela",
      "Lista de meses vai até 24 meses para trás",
    ],
  },
  {
    versao: "1.7.1",
    data: "2026-11-03",
    titulo: "Manter despesas iguais já conferidas",
    itens: [
      "Botão \"Manter as duas (não é duplicada)\" em cada grupo de possíveis duplicadas: o grupo sai do aviso e fica guardado como conferido",
      "Se depois entrar mais uma despesa igual no mesmo carro e data, o aviso volta",
    ],
  },
  {
    versao: "1.7.0",
    data: "2026-11-03",
    titulo: "Alerta de despesas duplicadas",
    itens: [
      "Ao lançar uma despesa com mesmo carro, mesma data e mesmo valor de outra já lançada, o sistema avisa e pergunta se quer lançar mesmo assim (não impede)",
      "Tela Despesas mostra a lista de possíveis duplicadas: vermelho quando a categoria também é igual, amarelo quando é diferente",
      "Cada item da lista tem Corrigir e Excluir",
    ],
  },
  {
    versao: "1.6.0",
    data: "2026-11-02",
    titulo: "Despesas operacionais e lucro líquido do mês",
    itens: [
      "Nova tela Despesas operacionais: aluguel, energia, água, IPTU, salários, pró-labore, contador, impostos etc., por mês",
      "Categorias agrupadas como na DRE: Pessoal, Administrativas, Comerciais, Financeiras, Impostos e Outras",
      "Botão para copiar as despesas do mês anterior (despesas fixas)",
      "Resultado do mês: Resultado da loja = lucro da loja nas vendas − despesas operacionais − impostos = lucro líquido",
      "Cópia de segurança inclui as despesas operacionais",
    ],
  },
  {
    versao: "1.5.2",
    data: "2026-10-22",
    titulo: "Ajustes no menu e no estoque",
    itens: [
      "Item \"Extrato por proprietário\" removido do menu; o extrato abre pelo Resultado do mês, tocando no card do proprietário",
      "Card do carro no Estoque mostra a origem (Próprio, Troca, Consignado Família Carlesci, Givaldo ou outros)",
      "Opção de combustível Álcool no cadastro do carro",
    ],
  },
  {
    versao: "1.5.1",
    data: "2026-10-22",
    titulo: "Correção do repasse no extrato",
    itens: [
      "Repasse ao proprietário passa a incluir as despesas pagas por ele (repasse = venda − parte da loja)",
      "Texto do card Capital investido da loja: despesas dos consignados são pagas pelos proprietários",
    ],
  },
  {
    versao: "1.5.0",
    data: "2026-10-22",
    titulo: "Tela de extrato por proprietário e capital investido da loja",
    itens: [
      "Item \"Extrato por proprietário\" no menu, com escolha do mês e do proprietário",
      "Extrato com botão \"Gerar PDF\" (no lugar de copiar para o WhatsApp)",
      "Dashboard: card \"Capital investido da loja\" (só próprios e trocas) e despesas adiantadas em consignados",
      "Nome do mês com só a primeira letra maiúscula (\"Outubro de 2026\")",
    ],
  },
  {
    versao: "1.4.0",
    data: "2026-10-22",
    titulo: "Lucro da loja no dashboard e extrato por proprietário",
    itens: [
      "Dashboard mostra o lucro da loja (sem a parte dos proprietários) no estoque e nas vendas",
      "Cards de lucro de todos os carros passam a dizer isso no nome",
      "No Resultado do mês, tocar em Família Carlesci, Givaldo ou outros abre o extrato do proprietário",
      "Extrato com venda, valor do carro, despesas, lucro, parte do proprietário e repasse, com botão para copiar para o WhatsApp",
    ],
  },
  {
    versao: "1.3.0",
    data: "2026-10-22",
    titulo: "Resultado do mês e proprietários dos consignados",
    itens: [
      "Novas origens no cadastro: Consignado Família Carlesci, Consignado Givaldo e Consignado (outros)",
      "Tela Resultado do mês: vendidos, lucro total e divisão entre Loja, Família Carlesci, Givaldo e outros",
      "Consignado com lucro: 50% loja e 50% proprietário; com prejuízo, a loja fica com R$ 0",
      "Aviso dos carros com proprietário a conferir, com sugestão e acesso direto ao cadastro",
    ],
  },
  {
    versao: "1.2.0",
    data: "2026-10-20",
    titulo: "Lista de carros vendidos no dashboard",
    itens: [
      "O card \"Carros vendidos\" do dashboard abre a lista dos carros vendidos no período, com data, valor e lucro",
      "Tocar num carro da lista abre a ficha completa; o botão \"Voltar\" retorna ao dashboard",
    ],
  },
  {
    versao: "1.1.2",
    data: "2026-10-16",
    titulo: "Novas categorias de despesa",
    itens: ["Categorias Troca de óleo, Combustível e Comissão na lista de despesas"],
  },
  {
    versao: "1.1.1",
    data: "2026-10-15",
    titulo: "Estoque abre filtrado em \"Em estoque\"",
    itens: ["A tela de Estoque abre mostrando só os carros no pátio; os outros filtros continuam disponíveis"],
  },
  {
    versao: "1.1.0",
    data: "2026-10-15",
    titulo: "Correções do dashboard, datas, vendas e despesas",
    itens: [
      "Dashboard separa o estoque atual das vendas do mês e mostra capital investido, lucro e margem realizados",
      "Ranking e lucro previsto usam só carros em estoque com cadastro completo; alerta de cadastro incompleto",
      "Garantias mostram quantos dias faltam para vencer, da mais próxima para a mais distante",
      "Datas exibidas corretamente (sem cair no dia anterior) e data de hoje certa mesmo à noite",
      "Registrar venda não apaga mais o preço pedido; a ficha mostra o desconto dado",
      "Dias de pátio de carro vendido param na data da venda",
      "Despesas podem ser corrigidas e excluídas; venda pode ser desfeita",
      "Excluir carro apaga junto despesas, venda e garantia",
      "Configurações: botão para baixar cópia de segurança e histórico de versões",
    ],
  },
  {
    versao: "1.0.0",
    data: "2026-04-17",
    titulo: "Versão original",
    itens: ["Sistema como estava antes do controle de versões"],
  },
];
