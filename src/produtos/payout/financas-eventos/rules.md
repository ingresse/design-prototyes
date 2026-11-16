# Finanças · Eventos como pastas: regras

> **Rotas:** `/payout/financas-eventos`, `/payout/financas-eventos/:eventoId`
> **No menu:** Backstage › menu da organização › Finanças (protótipo de pesquisa, shell próprio)
> **Revisado em:** 2026-11-16

Fonte da verdade do comportamento. Contexto, suposições e dúvidas de negócio: `../NOTAS.md`.

## O que é

Estímulo de pesquisa com produtores (direção D do briefing de 16/11/2026). Sem tabela: cada evento
é uma pasta com uma frase de status do dinheiro. A explicação mora dentro da pasta.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Eventos, valores, liberações, repasses | `../components/financas/dados.ts` (mock local) | não |

## Regras

### Comportamento
- **FEV-01** O topo tem três números: Disponível agora, A liberar (com Antecipar) e Já recebido. _(pages/eventos.tsx)_
- **FEV-02** Cada pasta mostra nome sem `#ID` e sem truncar, data com dia da semana, uma frase de status do dinheiro e os selos Saldo negativo, Ajuste recente e Evento em vendas.
- **FEV-03** A pasta abre a página do evento; "Finanças" no topo volta para a lista, mantendo o cenário.
- **FEV-04** A página do evento tem, nesta ordem: a conta do evento (mesma cascata do total), calendário de liberações, repasses, ajustes depois do fechamento e o que ainda pode mudar. _(pages/evento.tsx)_
- **FEV-05** O calendário soma tudo o que ainda vai entrar no saldo (processamento, a liberar e retidos) e fecha com um total.
- **FEV-06** Repasse tem situação Agendado, Pago (com comprovante) ou Não concluído (com motivo).
- **FEV-07** "O que ainda pode mudar" diz até quando, com data.
- **FEV-08** "Solicitar repasse deste evento" e "Antecipar" levam a uma tela final com o evento já selecionado.

### Estados
- **FEV-40** Cenário em `?cenario=`: normal, negativo, bloqueado, carregando, erro, sem-eventos.
- **FEV-41** Evento com saldo negativo: aviso no topo com "Por quê" e "O que acontece agora"; repasse do evento desligado.
- **FEV-42** Bloqueado: aviso em linguagem de cliente; repasse e antecipação desligados.

## Em aberto
- Ver "Dúvidas de regra de negócio" em `../NOTAS.md`.
