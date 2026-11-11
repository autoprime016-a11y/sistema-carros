# Histórico de versões — Auto Prime

Cada publicação do sistema ganha um número de versão. A versão no ar aparece no menu lateral
(abaixo de "Sistema Web Completo") e em **Configurações → Versões do sistema**.

- **1.x.0** (muda o número do meio): melhorias e correções novas.
- **1.1.x** (muda o último número): ajuste pequeno numa versão já publicada.

No GitHub e na Vercel, cada versão é identificada pelo título da publicação, que começa com o número
(por exemplo "v1.1.0 — ..."). A versão 1.0.0 é a publicação "Update App.tsx" de 17/04/2026 (código 188046b).

---

## Como voltar para uma versão anterior

### Jeito rápido (pela Vercel, em segundos)
1. Entre em vercel.com e abra o projeto **sistema-carros-taam**.
2. Vá em **Deployments**. Cada publicação mostra a mensagem com o número da versão (ex.: "v1.1.0 — ...").
3. Na versão para a qual quer voltar, clique nos **três pontinhos (⋯)** → **Promote to Production**
   (ou **Instant Rollback**).
4. Pronto: o site volta a ser exatamente como era naquela versão.

### Jeito definitivo (pelo GitHub)
Peça ao Claude: "volta o sistema para a versão 1.0.0". Ele reverte o código no GitHub para a tag
correspondente, e a Vercel publica automaticamente.

### Sobre os dados
Voltar a versão **não altera os dados** (carros, despesas, vendas, garantias). Nenhuma versão até agora
mudou a estrutura do banco, então qualquer versão funciona com os dados atuais.
Dados apagados por engano só voltam pela **cópia de segurança** (Configurações → Baixar cópia de segurança).
**Baixe uma cópia antes de cada publicação.**

---

## v1.8.1 — 11/11/2026 (em teste)
Sem mudança no banco.
- Ficha do carro vendido: **Data da Venda** (com os dias de pátio) na ficha técnica e no Resumo Financeiro.
- Botão **"Corrigir venda"**: altera a data e o valor da venda. A garantia de 90 dias passa a contar da nova data.
- Ao salvar, avisa (sem impedir) se a venda muda de mês (Resultado do mês e extratos mudam), fica antes da compra ou no futuro.

## v1.8.0 — 11/11/2026
Sem mudança no banco.

**Nova tela "Gastos com carros"** (menu lateral)
- Mês escolhido: total gasto (com variação sobre a média dos 3 meses anteriores e média por carro), Em estoque, Custo da venda e Pós-venda.
- Gráfico "Onde mais gastamos" por categoria (Oficina e Mecânica somadas), dividido nas três fases.
- Evolução dos últimos 12 meses (toque na barra para abrir o mês), lista do pós-venda e os 10 carros que mais gastaram.
- Filtro Todos / Só da loja / Consignados.

**Regra das fases** (pela data da despesa comparada com a data da venda)
- Até a venda, ou carro no pátio: **Em estoque**.
- Depois da venda, conserto (Mecânica, Oficina, Funilaria, Elétrica, Pneus, Troca de óleo, Acessórios): **Pós-venda**.
- Depois da venda, o resto (comissão, cartório, transferência, vistoria, tanque cheio, lavagem, outros): **Custo da venda**.

**Consignados**
- Pós-venda: 50% descontado da parte da loja e 50% da parte do proprietário.
- Custo da venda continua por conta do proprietário, como antes.
- Extrato: nova coluna Pós-venda. O repasse passa a ser valor do carro + despesas pagas pelo proprietário + parte dele,
  sem devolver o pós-venda (pago pela loja). Extratos de meses com pós-venda mudam de valor.
- O lucro do carro continua descontando todas as despesas, inclusive as de depois da venda.

## v1.7.3 — 07/11/2026
Sem mudança no banco.
- **Estoque**: os dois campos de data (filtro por data de compra) foram retirados.
- Novo botão **"Só próprios"**: ligado (azul), mostra só os carros da loja — Próprio e Troca —, sem os consignados.
  Desligado, mostra todos. Funciona junto com a busca e o filtro de status.
- O topo da lista mostra quantos carros aparecem com os filtros atuais.

## v1.7.2 — 03/11/2026
Sem mudança no banco.
- **Despesas operacionais**: o formulário ganhou o campo **"Mês da despesa (competência)"**. Antes o mês vinha só do seletor
  no topo da tela, e despesas retroativas acabavam caindo no mês atual.
- Aviso ao salvar quando a **data do pagamento** é de outro mês ("vai contar em novembro, mas foi paga em 31/03"). Não impede.
- **Corrigir** permite trocar o mês de uma despesa já lançada. Depois de salvar, a tela vai para o mês onde a despesa ficou.
- Seletor de meses vai até 24 meses para trás.

## v1.7.1 — 03/11/2026
**Tabela nova no banco** — `supabase/despesas_validadas.sql` (só acréscimo). Para desfazer: `drop table public.despesas_validadas;`
- Botão **"Manter as duas (não é duplicada)"** em cada grupo do card de possíveis duplicadas. O grupo some do aviso
  e fica registrado como conferido no banco (vale para qualquer computador ou celular).
- Se entrar outra despesa igual no mesmo carro e data, o grupo muda e o aviso volta.
- Cópia de segurança inclui a tabela nova.

## v1.7.0 — 03/11/2026
Sem mudança no banco.
- **Alerta de despesa duplicada ao lançar**: se já existe despesa do mesmo carro, na mesma data e com o mesmo valor,
  aparece um aviso com a despesa já lançada e a pergunta "Lançar mesmo assim?". Não impede o lançamento.
- Na tela **Despesas**, card **"Possíveis lançamentos duplicados"** no topo (só aparece quando há algum):
  **vermelho** = mesma categoria também (quase sempre duplicada); **amarelo** = categorias diferentes (pode ser coincidência).
  Cada despesa tem **Corrigir** e **Excluir**.

## v1.6.0 — 02/11/2026
**Precisa de uma tabela nova no banco** — rodar `supabase/custos_operacionais.sql` no SQL Editor do Supabase
antes de publicar. É só um acréscimo; as versões anteriores continuam funcionando (ignoram a tabela).
Para desfazer: `drop table public.custos_operacionais;`

- Nova tela **Despesas operacionais** (menu lateral): lançar, corrigir e excluir custos da loja por mês (competência),
  com descrição e data de pagamento opcionais.
- Categorias agrupadas no padrão de DRE: **Pessoal** (salários, encargos, benefícios, pró-labore), **Administrativas**
  (aluguel, energia, água, IPTU, internet, contador, sistemas, manutenção, limpeza, seguros), **Comerciais**
  (marketing, portais de anúncio, brindes), **Financeiras** (tarifas, juros, taxas de cartão), **Impostos** e **Outras**.
- Botão **"Copiar de <mês anterior>"** para trazer as despesas fixas e só ajustar os valores que mudaram.
- **Resultado do mês** ganha o card **Resultado da loja**: lucro da loja nas vendas − despesas operacionais
  = resultado operacional − impostos = **lucro líquido do mês**, com margem líquida.
- Cópia de segurança inclui a tabela nova.

## v1.5.2 — 22/10/2026
- Item **"Extrato por proprietário"** removido do menu lateral, por ser redundante.
  O extrato (com "Gerar PDF") continua no **Resultado do mês**, tocando no card Família Carlesci, Givaldo ou Consignado (outros).
- No **Estoque**, cada carro mostra a **origem** (Próprio, Troca, Consignado Família Carlesci, Consignado Givaldo ou Consignado (outros)),
  com a mesma cor usada no Resultado do mês.
- Nova opção de combustível **Álcool** no cadastro do carro.

## v1.5.1 — 22/10/2026
- **Correção do repasse** no extrato (tela e PDF): como as despesas dos consignados são pagas pelo proprietário,
  o repasse agora é **venda − parte da loja** (= valor do carro + despesas + parte dele no lucro).
  Antes o extrato mostrava "valor do carro + parte", ou seja, um repasse menor no valor das despesas.
  Extratos gerados na v1.4.0/1.5.0 devem ser refeitos.
- Texto do card "Capital investido da loja": as despesas dos consignados são pagas pelos proprietários (antes dizia "adiantados").

## v1.5.0 — 22/10/2026
- Novo item no menu: **"Extrato por proprietário"**, com escolha do mês e do proprietário (Família Carlesci, Givaldo, Consignado (outros)).
  O extrato continua abrindo também pelo Resultado do mês.
- O botão "Copiar para WhatsApp" do extrato foi trocado por **"Gerar PDF"**: baixa um PDF com cabeçalho da Auto Prime,
  tabela dos carros (venda, valor do carro, despesas, lucro, parte do proprietário, repasse), totais e observações.
- Dashboard: novo card **"Capital investido da loja"** — compra + despesas só dos carros próprios e de troca.
  O subtítulo mostra quanto a loja adiantou em despesas de consignados (que saem do repasse do proprietário).
  O card antigo passa a se chamar "Capital investido (todos os carros)".
- O mês aparece como "Outubro de 2026" (antes "Outubro De 2026").

## v1.4.0 — 22/10/2026
**Dashboard**
- Novos cards **"Lucro previsto da loja"** (estoque) e **"Lucro da loja"** (vendas), sem a parte dos proprietários,
  com a mesma regra do Resultado do mês. Também **"Parte dos proprietários"** e **"Parte prevista dos proprietários"**.
- Os cards de lucro antigos passam a se chamar "(todos os carros)"; as margens aparecem no subtítulo.

**Resultado do mês**
- Tocar em **Família Carlesci**, **Givaldo** ou **Consignado (outros)** abre o **extrato** do proprietário no mês:
  venda, valor do carro, despesas, lucro, parte do proprietário e **repasse** (valor do carro + parte), com totais.
- Botão **"Copiar para WhatsApp"** gera um texto pronto para mandar ao proprietário.
- O repasse mostra quanto é devido; ainda não marca se foi pago.

## v1.3.0 — 22/10/2026
**Origem do carro**
- Novas opções no cadastro: **Consignado Família Carlesci**, **Consignado Givaldo** e **Consignado (outros)**, além de Próprio e Troca.
- Carros antigos cadastrados só como "Consignado" continuam assim até serem corrigidos (aparecem como "a definir").

**Tela "Resultado do mês"** (menu lateral)
- Carros vendidos no mês, total vendido e lucro de todos os carros.
- Divisão do lucro: **Loja**, **Família Carlesci**, **Givaldo**, **Consignado (outros)** e, enquanto houver pendência, **A definir**.
- Regra: lucro = venda − valor de compra/do dono − despesas. Próprio e Troca: 100% loja.
  Consignado com lucro: 50% loja, 50% proprietário. Com prejuízo: tudo do proprietário (loja R$ 0).
- Aviso dos carros com proprietário a conferir (sem dono definido, ou origem diferente do que diz a observação),
  com sugestão tirada da observação. Tocar no carro abre o cadastro; ao salvar, volta para o Resultado.
- Nenhuma mudança na estrutura do banco e nenhum carro alterado automaticamente.

## v1.2.0 — 20/10/2026
- No dashboard, o card **"Carros vendidos"** agora abre a **lista dos carros vendidos** no período do filtro,
  com placa, data da venda, dias de pátio, valor e lucro de cada um (mais recentes primeiro).
- Tocar num carro da lista abre a ficha completa; o botão **"Voltar para o dashboard"** retorna à tela anterior.

## v1.1.2 — 16/10/2026
- Novas categorias na lista de despesas: **Troca de óleo**, **Combustível** e **Comissão**.
  As despesas já lançadas como "Outros" ou em outra categoria não mudam sozinhas; dá para corrigir uma a uma pelo botão "Corrigir".

## v1.1.1 — 15/10/2026
- A tela de **Estoque** abre com o filtro **"Em estoque"** já selecionado (antes abria em "Todos").
  Para ver vendidos ou todos, é só trocar o filtro.

## v1.1.0 — 15/10/2026
Correções do dashboard, datas, vendas e despesas.

**Dashboard**
- Estoque atual separado das vendas do mês (o filtro de mês vale só para vendas, pela data da venda).
- Novos números: capital investido, lucro realizado e margem realizada.
- Margem calculada sobre o preço de venda.
- Ranking e lucro previsto só com carros em estoque e cadastro completo; alerta de cadastro incompleto.
- Custo de cada carro soma todas as despesas dele, não só as do mês filtrado.

**Garantia**
- Mostra quantos dias faltam para vencer (laranja com 15 dias ou menos), da mais próxima para a mais distante.
- Garantia que vence hoje continua ativa até o fim do dia.

**Datas**
- Datas exibidas corretamente (antes apareciam um dia antes).
- Data de hoje certa mesmo depois das 21h (antes virava "amanhã").

**Vendas e ficha do carro**
- Registrar venda não apaga mais o preço pedido; a ficha mostra preço pedido, valor de venda e desconto.
- Dias de pátio de carro vendido param na data da venda.
- Lucro em vermelho quando é prejuízo; "Lucro realizado" para carro vendido.
- Botão **Desfazer venda**.

**Despesas e exclusões**
- Despesas podem ser corrigidas e excluídas.
- Excluir carro apaga junto despesas, venda e garantia, com aviso do que será removido.

**Configurações**
- Botão **Baixar cópia de segurança** (todas as tabelas em um arquivo .json).
- Histórico de versões e número da versão no menu lateral.

Observação: os carros vendidos antes desta versão não mostram desconto, porque o sistema antigo
substituiu o preço pedido pelo valor da venda.

## v1.0.0 — 17/04/2026
Versão original do sistema, antes do controle de versões.
