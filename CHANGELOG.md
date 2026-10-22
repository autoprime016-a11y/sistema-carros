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
