# Finanças · Eventos como pastas: regras

> **Rotas:** `/payout/financas-eventos`, `/payout/financas-eventos/:eventoId`
> **No menu:** Backstage › menu da organização › Finanças (protótipo de pesquisa, shell próprio)
> **Revisado em:** 2026-11-16 (ajustes v2)

Fonte da verdade do comportamento. Contexto, suposições e dúvidas de negócio: `../NOTAS.md`.

## O que é

Estímulo de pesquisa com produtores (direções B + D do briefing de 16/11/2026, ajustes v2). No topo,
a conta que fecha para a organização inteira. Abaixo, os 48 eventos como pastas, sem colunas de
valores, com navegação. A explicação do dinheiro de cada evento mora dentro da pasta.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Eventos, valores, liberações, repasses | `../components/financas/dados.ts` (mock local: 4 do briefing + 44 gerados) | não |
| Busca, filtro, ordem, página, painel aberto | parâmetros da URL | não |

## Regras

### Topo
- **FEV-01** Três números de destaque, só eles com centavos: Disponível agora (o maior), A liberar (com Antecipar e a próxima liberação dessa categoria) e Já recebido. _(pages/eventos.tsx)_
- **FEV-02** "A conta de todos os eventos": Vendido − Taxas e custos + Créditos − Ajustes = Seu dinheiro, e "Onde está seu dinheiro" em seis partes que somam Seu dinheiro. É a mesma cascata da página do evento.
- **FEV-03** A conta do topo é sempre da organização inteira: busca e filtro da lista não mudam a conta.
- **FEV-04** Taxas e custos, Créditos e Ajustes abrem um painel lateral com a composição, que fecha com o total do bloco. Bloco com R$ 0 não abre. Vendido tem o link "Ver no relatório de vendas". _(components/financas/cascata.tsx, painel-do-detalhe.tsx)_
- **FEV-05** Cada parte de "Onde está seu dinheiro" tem uma cor só, a mesma na barra e na legenda. Vermelho só para valor negativo.

### Lista
- **FEV-10** Cada pasta mostra imagem do evento, nome sem `#ID` e sem truncar, data com dia da semana, selos e uma frase de status do dinheiro. Sem colunas de valores.
- **FEV-11** Selos: Saldo negativo (vermelho), Ajuste recente (aviso, ajuste nos últimos 30 dias) e Evento em vendas (neutro).
- **FEV-12** Navegação: contagem ao lado do título, busca por nome (sem diferença de acento), filtro por situação e por período da data do evento, ordenação (data do evento, mais recente primeiro; maior disponível; maior a liberar) e paginação de 10 em 10. _(utils/lista.ts)_
- **FEV-13** Mudar busca, filtro ou ordem volta para a página 1.
- **FEV-14** "Baixar relatório" baixa os eventos do resultado (CSV), não só os da página.
- **FEV-15** Busca sem resultado e filtro sem resultado têm estado vazio próprio, com "Limpar filtros".
- **FEV-16** A pasta abre a página do evento; "Finanças" no topo volta para a lista como ela estava, mantendo o cenário.

### Página do evento
- **FEV-20** Nesta ordem: a conta do evento, calendário de liberações, repasses, ajustes depois do fechamento e o que ainda pode mudar. _(pages/evento.tsx)_
- **FEV-21** O calendário soma tudo o que ainda entra no disponível (processamento, a liberar e retidos) e fecha com um total.
- **FEV-22** Repasse tem situação Agendado, Pago (com comprovante) ou Não concluído (com motivo).
- **FEV-23** "Ajustes depois do fechamento" lista só ajustes. Créditos aparecem só em Créditos.
- **FEV-24** "O que ainda pode mudar" diz até quando, com data. Evento com prazo de contestação encerrado diz que nada mais pode mudar.
- **FEV-25** "Solicitar repasse deste evento" e "Antecipar" ficam na linha do título e levam a uma tela final com o evento já selecionado.

### Copy
- **FEV-30** O rótulo explica; a legenda só entra quando traz dado novo (data, prazo, motivo).
- **FEV-31** Termos únicos: Vendido, Taxas e custos, Créditos, Ajustes, Seu dinheiro, Em processamento, Retido, A liberar, Disponível agora, Agendado, Já recebido, Contestação no cartão, Antecipar, Solicitar repasse.
- **FEV-32** Centavos só nos três números de destaque do topo.

### Estados
- **FEV-40** Cenário em `?cenario=`: normal, negativo, bloqueado, carregando, erro, sem-eventos.
- **FEV-41** Evento com saldo negativo: aviso no topo com "Por quê" e "O que acontece agora", até o fim da história (quanto abate, quando, e de onde sai o resto); repasse do evento desligado.
- **FEV-42** Bloqueado: aviso em linguagem de cliente; repasse e antecipação desligados.

### Contas
- **FEV-50** `node src/produtos/payout/financas-eventos/utils/conferir-contas.ts` confere que as partes somam Seu dinheiro em cada evento e no total, e que a soma dos 48 eventos é igual à cascata do topo.

## Em aberto
- Ver "Regras a validar com a engenharia" em `../NOTAS.md`.
