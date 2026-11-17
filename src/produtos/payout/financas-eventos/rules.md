# Finanças · Eventos como pastas: regras

> **Rotas:** `/payout/financas-eventos`, `/payout/financas-eventos/calendario`, `/payout/financas-eventos/extrato`, `/payout/financas-eventos/:eventoId`
> **No menu:** Backstage › menu da organização › Finanças (protótipo de pesquisa, shell próprio)
> **Revisado em:** 2026-11-17 (ajustes v3)

Fonte da verdade do comportamento. Contexto, suposições e dúvidas de negócio: `../NOTAS.md`.

## O que é

Estímulo de pesquisa com produtores (briefing de 16/11/2026, ajustes v2 e v3). Finanças é a fonte da
verdade de todos os eventos da organização: quanto vendeu, quanto pagou de taxas, quanto recebeu de
créditos, quanto foi devolvido, quanto está retido, quanto pode antecipar, quanto pode repassar e
quanto já repassou.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Eventos, valores, liberações, repasses, movimentos | `../components/financas/dados.ts` (mock local: 4 do briefing + 44 gerados) | não |
| Cenário, busca, filtros, página, painel aberto | parâmetros da URL | não |

## Regras

### A equação
- **FEV-01** De onde veio: Vendido − Taxas e custos + Créditos − Devoluções = Líquido. Onde está: Líquido = Em processamento + Retido + Antecipável + Disponível + Agendado + Repassado. Vale para a organização e para cada evento; a soma dos 48 eventos é a conta da organização.
- **FEV-02** Glossário único (rótulo e definição curta) em `components/financas/cascata.tsx`. Os mesmos termos em telas, filtros, selos, CSV e leitores de tela.

### Finanças (tela principal) _(pages/eventos.tsx)_
- **FEV-10** Cabeçalho: título, "Atualizado em dd/mm/aaaa, hh:mm" (informação neutra) e "Solicitar repasse".
- **FEV-11** Três cards de ação, os únicos números com centavos: Disponível para repasse (em quantos eventos; não é clicável), Antecipável (próxima liberação e "Antecipar", sem taxa) e Repassado (agendados e "Ver repasses", que abre o Extrato filtrado por Repasses).
- **FEV-11b** Copy sem quebra de linha em 1280: os blocos da conta não têm legenda fixa (a definição fica no tooltip) e a legenda de "Líquido por situação" traz só o dado novo ("R$ 150.000 em 19/11").
- **FEV-12** "Resumo financeiro": a cascata e "Líquido por situação" (barra de proporção com tooltip em cada parte e legenda de seis itens). Cada bloco com valor > 0 tem "Ver detalhe"; o Líquido não tem.
- **FEV-13** Cada item da legenda é clicável: Em processamento, Retido e Antecipável abrem o Calendário filtrado; Disponível abre a lista filtrada; Agendado abre o Extrato filtrado por repasses e Repassado abre o Extrato filtrado por repasses pagos.
- **FEV-14** A conta e os cards são sempre da organização inteira: busca e filtro da lista não mudam nenhum dos dois.
- **FEV-15** "Próximas liberações": as 3 próximas datas (uma linha por data e tipo; vários eventos viram "N eventos"). "Últimos movimentos": os 3 mais recentes que mudaram o Disponível. Cada um leva à sua tela.
- **FEV-16** "Saldo por evento": lista (não tabela) em que cada linha lê como conta de banco. À direita, o Disponível do evento é o número mais forte (vermelho com "−" quando negativo, apagado quando zero); à esquerda, nome, data e selos; embaixo, sempre a próxima liberação no mesmo formato ("Próxima liberação: R$ 260.000 em 21/11 · Antecipável"). Acima da lista, o total de Disponível do resultado filtrado (todas as páginas). Busca, filtro por situação e data do evento na barra; ordenação e "Baixar saldos por evento" no cabeçalho; paginação de 10 em 10. Evento quitado leva o selo "Totalmente repassado".
- **FEV-17** Abrir um evento ou voltar para a lista começa do topo da página; a volta mantém busca, filtro e página.

### Painéis de "Ver detalhe" _(components/financas/painel-do-detalhe.tsx)_
- **FEV-20** Todos abrem no painel lateral do DS, com o total no topo igual ao valor do bloco, a soma das linhas fechando com ele e "Baixar detalhe" (CSV).
- **FEV-21** Vendido (só na organização): por evento, maior primeiro, com busca e "Ver relatório de vendas". Na página do evento o Vendido leva direto ao relatório.
- **FEV-22** Taxas e custos: por tipo, com quantidade e preço unitário quando houver; na organização, cada tipo abre a lista por evento.
- **FEV-23** Créditos: por tipo (Bonificação de custo com o uso da verba, Rebate, Luvas, Ajuste a crédito). Rebate aguardando nota fiscal aparece à parte e não soma no total.
- **FEV-24** Devoluções: por tipo, cada linha com de onde saiu ("Saiu do disponível" ou "Saiu do antecipável") e "Ver no relatório de transações".

### Calendário de liberações _(pages/calendario.tsx)_
- **FEV-30** Topo com um número: "Total a liberar" (Em processamento + Retido + Antecipável da organização), com as faixas acumuladas "Até" 7 dias e "Até" 30 dias e, quando há, "Sem data definida" (Pix parcelado). O topo não muda com os filtros.
- **FEV-31** "Liberações por semana": oito semanas a partir de hoje e "Depois de", em barras empilhadas por tipo (Antecipável, Retido, Em processamento, com as cores da legenda da tela principal). Semanas + depois + sem data = total a liberar. Clicar em uma semana filtra a lista por data; clicar de novo tira o filtro.
- **FEV-32** "Próximas liberações": lista por mês (com total do mês) e por dia. Cada dia é uma linha com data, evento ou número de eventos, tipos e total; abre para mostrar cada evento, que leva à página do evento. "Abrir tudo" / "Recolher tudo" no cabeçalho. Com um evento filtrado, os dias já abrem. O que não tem data fica em "Sem data definida", no fim.
- **FEV-33** "Antecipar" aparece uma vez, no topo ("Você pode antecipar R$ …"), sem taxa. Não há botão por linha.
- **FEV-34** Filtros: evento (campo com busca, igual ao do Extrato), tipo e data da liberação.

### Extrato _(pages/extrato.tsx, components/painel-do-movimento.tsx)_
- **FEV-40** Período padrão: do primeiro dia do mês até hoje (01/11 a 17/11), com o atalho "Este mês". O extrato cobre os últimos 90 dias.
- **FEV-41** Resumo do período no topo, com três números: Entradas, Saídas e Disponível hoje (ou "Disponível em" a data final, quando o período não termina hoje; igual ao card quando termina). Entradas e Saídas abrem por tipo de movimento. Repasse não concluído (saiu e voltou dentro do período) não entra em Entradas nem em Saídas; na lista, as duas linhas continuam. Sem operadores entre os blocos: sem o Disponível do início, a conta não fecharia na tela. O resumo não muda com os filtros.
- **FEV-42** O Extrato não tem bloco de repasses agendados: o agendamento de repasses fica em outro lugar. O pedido do repasse ("Repasse solicitado") aparece no histórico, porque foi quando o valor saiu do Disponível.
- **FEV-43** Movimentos do mais recente para o mais antigo, agrupados por dia; o cabeçalho do dia mostra o Disponível no fim do dia. Cada linha tem ícone de direção, título, tipo · evento (e conta, no repasse), valor e "Disponível após".
- **FEV-44** Por padrão a lista só tem o que mudou o Disponível. Vendas em processamento e devoluções que saíram do Antecipável ficam de fora, com um aviso e "Mostrar na lista"; filtrar por um tipo também mostra.
- **FEV-45** Entrada em verde, saída em cor neutra. Vermelho só para saldo negativo.
- **FEV-46** Filtros: Tudo / Entradas / Saídas, busca, período, evento e tipo. O evento é um campo com busca (`Select.ComboBox` do DS), porque a organização pode ter dezenas de eventos; vazio quer dizer todos. Escondem linhas; "Disponível após" e o saldo do dia são sempre os da organização.
- **FEV-47** A linha abre o painel do movimento: o que foi, o que mudou em cada parte, dados do repasse ou da antecipação e o link de prova. O repasse mostra "De onde veio este valor", e as linhas somam o valor do repasse. A taxa da antecipação e a taxa de transferência só aparecem aqui e na linha de repasse do evento.
- **FEV-48** Paginação de 20 em 20. "Baixar extrato" oferece PDF (simulado) e Planilha (CSV do resultado, em ordem cronológica, com os saldos).

### Página do evento _(pages/evento.tsx)_
- **FEV-50** Nesta ordem: a conta do evento, calendário de liberações, repasses, devoluções e o que ainda pode mudar.
- **FEV-51** Repasse mostra situação (Agendado, Pago, Não concluído), conta de destino, modalidade, taxa de transferência e valor recebido.
- **FEV-52** Saldo negativo: "Por quê" e "O que acontece agora" com a regra 1 da v3 (já descontado do Disponível dos outros eventos).
- **FEV-53** "O que ainda pode mudar": contestações com prazo de 120 dias depois do evento e de onde saem antes e depois da liberação do retido.

### Cenários
- **FEV-60** `?cenario=`: normal, negativo ("Total negativo"), bloqueado, carregando, erro, sem-eventos. A barra do protótipo diz o que cada um muda. Todas as telas funcionam em todos.
- **FEV-61** Bloqueado: aviso em linguagem de cliente; "Solicitar repasse" e "Antecipar" desligados em todas as telas; card Disponível com selo "Pausado" e valor neutro.
- **FEV-62** Sem eventos: a tela aparece inteira, zerada, com o vazio de cada seção.

### Design System
- **FEV-70** Cartões são `TableCard`; filtros ficam em `FilterBar`; o Extrato é uma lista por dia (a `Table` do DS não agrupa linhas); painéis são `SlideoutMenu`. Sem valores arbitrários de Tailwind (exceção: a altura do menu lateral, copiada do Backstage).
- **FEV-71** Tamanhos que mudam entre 1280 e 1440 usam consulta de contêiner (`@6xl`).

### Contas
- **FEV-80** `node src/produtos/payout/financas-eventos/utils/conferir-contas.ts` confere a equação em cada evento e no total, o Calendário, o Extrato e os painéis.

## Em aberto
- Ver "Regras a validar" em `../NOTAS.md`.
