# Início (app Ingresse): regras

> **Rotas:** `/ingresse-app`, `/ingresse-app/uber` (atalho de teste da oferta Uber)
> **No menu:** app › aba Início
> **Revisado em:** 2026-11-16

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

A tela inicial do app: destaque do evento, seções de eventos e as comunicações de serviços
adicionais que aparecem ao abrir o app.

## Regras

### Comunicações
- **INI-01** Oferta de crédito Uber ao abrir o app: bottom sheet com um banner da foto dos amigos (a mesma do banner da Carteira) e, por cima, o selo da Uber com "5% off", título "Menos na corrida, mais pro rolê" (o mesmo da página da oferta), texto "Compre crédito Uber com 5% de desconto aqui na Ingresse e vá e volte do rolê com mais tranquilidade." (o fato primeiro, depois o conceito de ir e voltar tranquilo, sem prometer segurança), CTA "Aproveitar desconto" (abre a oferta `/novos-negocios/servicos-adicionais/uber`) e "Não tenho interesse". _(home/components/oferta-uber-sheet.tsx, components/ofertas.ts)_
- **INI-02** O bottom sheet da Uber aparece uma vez só: fechar, tocar fora ou ir para a oferta não mostra de novo (salvo no navegador); `/ingresse-app/uber` (ou `?oferta=uber`) força para teste. _(home/pages/Home.tsx)_

## Em aberto

- Frequência real de exibição (uma vez, por campanha, a cada X dias) depende do negócio; a de uma vez só é premissa do protótipo.
- O 5% é ilustrativo e depende de confirmação comercial (como na oferta).
