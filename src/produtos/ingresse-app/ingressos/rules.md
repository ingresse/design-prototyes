# Ingressos do evento (app): regras

> **Rotas:** `/ingresse-app/ingressos/evento/:eventId`
> **No menu:** app › aba Ingressos (Carteira) › toque num evento
> **Revisado em:** 2026-11-17

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

Página de um evento na Carteira do app: card do evento e a lista de ingressos (ou combos), que abre o
detalhe com o QR. Este arquivo começa pelas regras da seção de serviços do evento; as demais regras da
página ainda não foram documentadas.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Evento, ingressos e serviços ligados | `data/eventos.ts` (`EVENTOS`, campo `servicos`) (mock local) | não |

## Regras

### Comportamento
- **ING-01** Eventos com serviço ligado mostram a seção "Prepare seu rolê" com uma linha clicável por serviço. Ela começa fixa logo acima da tab bar (a lista de ingressos rola por baixo), então o serviço fica sempre à vista, por mais ingressos que o evento tenha. O ingresso continua sendo o primeiro conteúdo da tela. _(components/servicos-evento.tsx, pages/Ingressos.tsx)_
- **ING-07** A seção fixa fica sempre colada na tab bar, com qualquer quantidade de ingressos: com poucos ingressos (a lista não rola), ela desce até o rodapé em vez de ficar logo abaixo da lista com um vão embaixo. _(pages/Ingressos.tsx, components/servicos-evento.tsx)_
- **ING-04** O X da seção fixa a fecha, e a seção passa a ficar no fim da lista de ingressos (a pessoa não é obrigada a ver o serviço o tempo todo). Ao recarregar a página, volta a ficar fixa (nada é salvo). _(components/servicos-evento.tsx)_
- **ING-02** Hoje o único serviço é a Meep: selo da Meep, "Consumo antecipado Meep", "Chegue com saldo pra comer e beber" e seta. A linha inteira abre `/novos-negocios/servicos-adicionais/meep?vista=mobile`, ou seja, a oferta já na vista de celular do protótipo. _(components/servicos-evento.tsx)_
- **ING-05** A seção fica no fundo cinza (com uma linha em cima quando fixa). Quando o evento tem banner, a linha do serviço usa um recorte dele (a faixa das montanhas, sem texto do pôster), escurecido à esquerda, com o selo branco e o texto em branco, como no desktop da carteira web. _(components/servicos-evento.tsx)_
- **ING-03** O evento de simulação é o Festival Aurora 2026 (sáb, 28 nov · 16h, Parque Villa-Lobos), em "Vem aí" › Novembro 2026, com 4 ingressos da Camila Ferreira Rocha (2 Pista e 2 Pista Premium, para simular uma lista longa) e a Meep ligada. _(data/eventos.ts `festival-aurora`, carteira/pages/Carteira.tsx `VEM_AI`)_

- **ING-06** Atalho para o hub de serviços do evento (mesmo comportamento da seção da Meep: fixa acima da tab bar com X, depois no fim da lista). Hoje no Gop Tun Festival 2026: seção "Prepare seu rolê", card com o selo da Ingresse (símbolo branco sobre o vermelho da marca, sem logo de parceiro), "Tem mais pra viver no Gop Tun" / "Uber, fotos, seguro e mais", abrindo `/novos-negocios/servicos-adicionais/checklist?evento=gop-tun` na vista mobile. Copy do agente de Writing com ux-copy. _(components/servicos-evento.tsx `HUB`, data/eventos.ts `servicos: ["hub"]`)_
- **ING-08** Um serviço ou vários: se o evento tem um serviço só (ex.: Festival Aurora, só a Meep), o atalho leva direto à oferta dele; com mais de um (ex.: Gop Tun, seis serviços, incluindo a Meep), o atalho leva ao hub do evento. A decisão vem da lista `servicos` do evento. _(data/eventos.ts `servicos`, components/servicos-evento.tsx)_

## Em aberto

- Falta definir se a seção some no dia do evento e se mostra o status depois da compra (hoje não mostra).
