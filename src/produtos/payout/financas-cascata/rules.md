# Finanças · Cascata que fecha: regras

> **Rotas:** `/payout/financas-cascata`
> **No menu:** Backstage › menu da organização › Finanças (protótipo de pesquisa, shell próprio)
> **Revisado em:** 2026-11-16

Fonte da verdade do comportamento. Contexto, suposições e dúvidas de negócio: `../NOTAS.md`.

## O que é

Estímulo de pesquisa com produtores (direção B do briefing de 16/11/2026). Mostra a conta do
dinheiro da organização, do vendido ao que é do produtor, sempre fechando, e onde cada parte está.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Eventos, valores, liberações, repasses | `../components/financas/dados.ts` (mock local) | não |
| Composição de cada parte | `data/composicao.ts` (derivado dos dados) | não |

## Regras

### Comportamento
- **FCA-01** A cascata é lida da esquerda para a direita: Vendido − Taxas e custos + Créditos − Ajustes = Seu dinheiro. _(components/financas/cascata.tsx)_
- **FCA-02** Abaixo, "Seu dinheiro" abre em seis partes que somam o mesmo valor: Em processamento, Retido, A liberar, Disponível agora, Agendado, Já recebido.
- **FCA-03** Toda parte é clicável e abre um painel lateral com a explicação e o valor por evento; o total do painel repete o número da parte. _(components/painel-da-parte.tsx)_
- **FCA-04** "Vendido" traz a nota "Mesmo valor do seu relatório de vendas."
- **FCA-05** "Solicitar repasse" (cabeçalho, Disponível agora e painel) e "Antecipar" (A liberar e painel) levam a uma tela final; o fluxo não faz parte do teste.
- **FCA-06** Centavos só nos números grandes da cascata e do topo do painel.
- **FCA-07** Cor só com significado: verde disponível, azul a liberar, vermelho negativo ou ajuste.

### Estados
- **FCA-40** Cenário em `?cenario=`: normal, negativo, bloqueado, carregando, erro, sem-eventos.
- **FCA-41** Saldo negativo: aviso no topo diz o valor, o motivo e como é compensado; "Solicitar repasse" fica desligado.
- **FCA-42** Bloqueado: aviso em linguagem de cliente; os números continuam visíveis; repasse e antecipação desligados.

## Em aberto
- Ver "Dúvidas de regra de negócio" em `../NOTAS.md`.
