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
- **CAR-01** Atalho do hub "Prepare seu rolê" no topo de "Vem aí", antes do primeiro mês, no lugar do antigo banner da Uber (trocado em 23/11/2026, a pedido do Design). Mesma estrutura do banner anterior: foto do festival (`assets/foto-hub.jpg`) à direita, véu escuro com desfoque à esquerda, selo da Ingresse (símbolo branco sobre o vermelho da marca), "Tem mais pra viver no Gop Tun" / "Uber, fotos, seguro e mais". O card abre `/novos-negocios/servicos-adicionais/checklist?evento=gop-tun&vista=mobile`; o X dispensa e some até limpar os dados do navegador (`ing-banner-hub-dispensado`). Só aparece com eventos na lista. _(carteira/components/banner-hub.tsx, carteira/pages/Carteira.tsx)_
- **CAR-03** O onboarding da troca de ingresso continua abrindo na primeira visita; o modal da Uber fica na Início para não empilhar dois avisos. _(carteira/pages/Carteira.tsx)_

### Capas dos eventos
- **CAR-04** Todo evento da lista tem capa ilustrativa (arte original do protótipo, não é a capa oficial), no padrão do Gop Tun e do Aurora; as mesmas capas valem na página do evento. _(assets/*.svg, carteira/pages/Carteira.tsx, ingressos/data/eventos.ts)_

## Em aberto

