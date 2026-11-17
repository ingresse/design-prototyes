# Carteira (app Ingresse): regras

> **Rotas:** `/ingresse-app/ingressos`
> **No menu:** app › aba Ingressos
> **Revisado em:** 2026-11-16

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

A lista de eventos com ingressos da pessoa, separada em "Vem aí" e "Passados", agrupada por mês.

## Regras

### Comunicações
- **CAR-01** Banner da oferta de crédito Uber no topo da aba "Vem aí", antes do primeiro mês: fundo com a foto dos amigos juntos (a do mosaico da oferta) e um véu escuro desfocado à esquerda que concentra o texto em branco (mais escuro na área da legenda, para ela ficar legível); selo da Uber, título "Vai curtir o rolê?" e apoio "Vá de Uber pagando 5% menos" (cada um numa linha no celular a partir de 375px); cerca de 104px de altura. O card inteiro abre a oferta (`/novos-negocios/servicos-adicionais/uber`); sem seta, para o texto caber em uma linha no celular. _(carteira/components/banner-oferta-uber.tsx, components/ofertas.ts)_
- **CAR-02** O X do banner dispensa a oferta e ela não volta (salvo no navegador). O banner não aparece em "Passados" nem quando não há eventos. Rola junto com a lista (não fica grudado no topo). _(carteira/pages/Carteira.tsx)_
- **CAR-03** O onboarding da troca de ingresso continua abrindo na primeira visita; o modal da Uber fica na Início para não empilhar dois avisos. _(carteira/pages/Carteira.tsx)_

## Em aberto

- Frequência e regra de reexibição do banner depois de dispensado dependem do negócio.
