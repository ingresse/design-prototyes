# Carteira web: regras

> **Rotas:** `/carteira-web`, `/carteira-web/uber` (atalho de teste do modal da Uber) (e `/carteira-web/transferir`, `/carteira-web/troca-onboarding`); multiperfis desligados: `/carteira-web/dependentes`, `/carteira-web/dependentes/onboarding`, `/carteira-web/selecionar`
> **No menu:** Produtos › Site e conta do usuário › Carteira web
> **Revisado em:** 2026-11-16

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

A carteira de ingressos no site (desktop e celular): eventos em "Vem aí" e "Já passou", ingressos,
inscrições, transferência e troca.

## Regras

### Perfis
- **CWB-01** Chave `MULTIPERFIS` (em `data/funcionalidades.ts`), hoje `false`: sem troca de perfil no menu da conta, sem "Meus dependentes", sem escolha de perfil ao sair e sem onboarding dos perfis; a Carteira mostra só a própria conta. Trocar para `true` religa tudo. _(data/funcionalidades.ts, data/perfil-ativo.ts, components/site-header.tsx, pages/Carteira.tsx)_

### Comunicações (oferta de crédito Uber, as mesmas peças do app)
- **CWB-10** Ao abrir a Carteira: modal (desktop, com X) ou bottom sheet (celular, com alça) com o banner da foto dos amigos, o selo da Uber com "5% off", "Menos na corrida, mais pro rolê", "Compre crédito Uber com 5% de desconto aqui na Ingresse e vá e volte do rolê com mais tranquilidade.", "Aproveitar desconto" (abre `/novos-negocios/servicos-adicionais/uber`) e "Não tenho interesse". Aparece uma vez (salvo no navegador); `/carteira-web/uber` (ou `?oferta=uber`) força. _(components/oferta-uber.tsx, pages/Carteira.tsx)_
- **CWB-11** Atalho do hub "Prepare seu rolê" na lista de eventos, em "Vem aí", no lugar da antiga oferta da Uber (trocado em 23/11/2026, a pedido do Design). Desktop: primeiro card da grade, da altura dos cards de evento (que mostram a capa em 3:4, CWB-16), com a foto do festival (`assets/foto-hub.jpg`) ocupando o card, degradê escuro embaixo, selo da Ingresse em cima do texto, "Tem mais pra viver no Gop Tun" / "Uber, fotos, seguro e mais" e o botão "Preparar meu rolê". Celular: banner antes do primeiro mês, com a foto à direita e o véu com desfoque à esquerda. Os dois abrem `/novos-negocios/servicos-adicionais/checklist?evento=gop-tun`; o X dispensa (`cw-banner-hub-dispensado`, o mesmo no desktop e no celular). A oferta da Uber continua só no modal/bottom sheet ao abrir a Carteira (CWB-10). _(components/oferta-hub.tsx, pages/Carteira.tsx)_
- **CWB-12** Página do evento (desktop e celular): eventos com serviço ligado mostram a seção "Prepare seu rolê" com uma linha clicável por serviço. Hoje só a Meep: selo laranja de hambúrguer (no lugar do logo da Meep, pouco conhecida), "Chegue com saldo pra comer e beber", "Consumo antecipado no evento" e seta, abrindo `/novos-negocios/servicos-adicionais/meep` na mesma vista em que a pessoa está (`?vista=desktop` ou `?vista=mobile`). Nos dois, a seção fica no fundo cinza e, quando o evento tem banner, a linha do serviço usa um recorte dele (a faixa das montanhas, sem texto do pôster), escurecido à esquerda, com o texto em branco. No celular, o ingresso continua sendo o primeiro conteúdo da tela, e a seção começa fixa no rodapé (a lista de ingressos rola por baixo) e tem um X que a fecha: ela passa para o fim da lista; ao recarregar a página, volta a ficar fixa (nada é salvo). No desktop (a pessoa não usa o ingresso pelo computador), vem antes da lista de ingressos, logo abaixo do evento, no fundo cinza da página (título em preto); a linha do serviço usa um recorte do banner do evento (a faixa das montanhas, sem texto do pôster), escurecido à esquerda, com nome e apoio em branco; no hover sobe um pouco e ganha sombra. Sem fixar e sem X. Não aparece em eventos que já aconteceram. O evento de simulação é o Festival Aurora 2026 (sáb, 28 nov · 16h, Parque Villa-Lobos), em "Vem aí", com 4 ingressos. _(components/servicos-evento.tsx, components/evento-desktop.tsx, components/evento-ingressos.tsx, data/eventos.ts `servicos`, pages/Carteira.tsx)_
- **CWB-14** Atalho para o hub de serviços do evento, no mesmo componente e comportamento da Meep (CWB-12: celular fixo com X; desktop antes dos ingressos). Hoje no Gop Tun Festival 2026: "Prepare seu rolê", card com o selo da Ingresse (símbolo branco sobre o vermelho da marca), "Tem mais pra viver no Gop Tun" / "Uber, fotos, seguro e mais", abrindo `/novos-negocios/servicos-adicionais/checklist?evento=gop-tun` na mesma vista. Sem banner no evento, o card fica branco. _(components/servicos-evento.tsx `HUB`, data/eventos.ts `servicos: ["hub"]`)_
- **CWB-15** Um serviço ou vários: se o evento tem um serviço só (ex.: Festival Aurora, só a Meep), o atalho leva direto à oferta dele; com mais de um (ex.: Gop Tun, seis serviços, incluindo a Meep), o atalho leva ao hub do evento. A decisão vem da lista `servicos` do evento. _(data/eventos.ts `servicos`, components/servicos-evento.tsx)_
- **CWB-13** Cada evento tem sua URL: `/carteira-web/evento/:eventId` (ex.: `/carteira-web/evento/festival-aurora`, `/carteira-web/evento/sao-silvestre`). Tocar num evento da lista muda o endereço; o "voltar" da tela e o do navegador voltam para `/carteira-web`. O ingresso aberto dentro do evento não muda a URL. Entrando direto pela URL de um evento, o modal da oferta Uber não abre (ele é da Carteira). _(pages/Carteira.tsx, src/app/App.tsx)_

### Capas dos eventos
- **CWB-16** Todo evento tem capa ilustrativa (arte original do protótipo, não é a capa oficial), no padrão do Gop Tun e do Aurora: retrato 600×800, nome em cima, faixa entre 58% e 78% só com grafismo e rodapé com data ou local. Na grade do desktop, o card mostra a capa inteira, na proporção do banner (3:4), com nome, data e local embaixo; a grade tem 4 cards por linha (mínimo de 240px cada), para o card não ficar alto demais (alterado em 24/11/2026, a pedido do Design). _(assets/*.svg, data/eventos.ts, data/sao-silvestre.ts, pages/Carteira.tsx)_

## Em aberto

- Seção de serviços no evento (CWB-12): falta definir se some no dia do evento e se mostra o status depois da compra (hoje não mostra).

- Frequência real de exibição do modal depende do negócio; "uma vez" é premissa do protótipo.
- O 5% é ilustrativo e depende de confirmação comercial.
