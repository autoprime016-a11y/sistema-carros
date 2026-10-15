// Controle de versões do sistema Auto Prime.
// A cada publicação: aumente APP_VERSION, acrescente a versão no topo de VERSION_HISTORY,
// atualize "version" no package.json e registre no CHANGELOG.md.

export const APP_VERSION = "1.1.1";

export type VersionEntry = {
  versao: string;
  data: string; // AAAA-MM-DD
  titulo: string;
  itens: string[];
};

export const VERSION_HISTORY: VersionEntry[] = [
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
