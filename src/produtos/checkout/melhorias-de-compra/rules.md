# Checkout (melhorias de compra): regras

> **Rotas:** `/checkout/melhorias-de-compra` (e telas do cartão)
> **No menu:** depois do link de compra
> **Versão em uso:** `melhorias-de-compra/`
> **Revisado em:** 2026-11-21

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

O pagamento do pedido criado no link de compra. Este arquivo começa pelo que mudou com as
funcionalidades do Backstage.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Pedido em pagamento | `@/plataforma` (`?pedido=` na URL, guardado na aba) | sim: pagamento |

## Regras

- **CHK-01** O total parte do total gravado no pedido, lido do `?pedido=` da URL antes de qualquer outro; antes, o primeiro desenho podia mostrar o total do mock. _(data/pedido-banco.ts)_
- **CHK-02** Pedido com cupom mostra, no resumo, "Desconto (CÓDIGO)" com o valor negativo; o total já vem com o desconto (CUP-52). _(components/checkout-shell.tsx)_

## Em aberto

- As demais regras do checkout ainda não foram escritas aqui.
