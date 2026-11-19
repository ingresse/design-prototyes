# Teste C - Proteção de compra: regras

> **Rotas:** `/payin/teste-c-protecao-de-compra`, `/payin/teste-c-protecao-de-compra/checkout`
> **No menu:** Produtos › PayIn › Teste C - Proteção de compra
> **Versão em uso:** novo modal de proteção (v.5) sobre o checkout, com entrada animada
> **Revisado em:** 2026-11-19

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

Terceira versão do desafiante de proteção de compra. O comprador escolhe os ingressos sem ver oferta
de proteção; ao chegar no checkout, o novo modal (v.5) faz a oferta antes dos meios de pagamento. O
modal tem o card em forma de ingresso (valor + coberturas em acordeão), entra com uma sequência
animada e confirma a escolha em verde antes de fechar. A seleção de ingressos, o carregamento e o
checkout são os mesmos do `teste-ab-protecao-de-compra`; o que muda é o modal.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Evento, setores e ingressos | `data/evento.ts` (mock local) | não |
| Pedido (quantidades e escolha da proteção) | `data/pedido-store.ts` (mock local) | só em memória |

O evento é um mock local porque o teste reproduz o carrinho de produção (Dawn Patrol), não um
evento da plataforma unificada. Valores de proteção (8%) e taxas são de experimento.

## Regras

### Comportamento
- **TCP-01** A seleção de ingressos não oferece proteção: o resumo mostra só os itens, o total e "Continuar". _(pages/selecao.tsx, components/resumo.tsx)_
- **TCP-02** Sem ingresso selecionado, o desktop mostra o banner do evento no lugar do resumo; no celular a barra do resumo não aparece. _(components/resumo.tsx)_
- **TCP-03** Ao clicar em "Continuar", um carregamento cobre a tela inteira por 1,5s antes de abrir o checkout. Nada atrás dele recebe clique. _(pages/selecao.tsx, components/carregando-pagamento.tsx)_
- **TCP-04** "Continuar" leva ao checkout e zera a escolha de proteção: cada entrada no checkout mostra o modal de novo. _(pages/selecao.tsx)_
- **TCP-05** O modal de proteção abre sobre o checkout enquanto não houver escolha. _(pages/checkout.tsx)_
- **TCP-06** O modal não tem "X" e não fecha ao clicar fora nem com Esc: as saídas são "Continuar com proteção" e "Prefiro correr o risco". _(components/modal-protecao.tsx)_
- **TCP-07** No desktop o modal é um card central de 480px; no celular é uma folha ancorada no rodapé, com alça no topo e 56px livres acima dela. _(components/modal-protecao.tsx)_
- **TCP-08** O modal abre enxuto: escudo com anéis, título, apoio, card em forma de ingresso (valor da proteção, picote, "Conheça as coberturas" recolhido) e os dois botões. _(components/modal-protecao.tsx)_
- **TCP-09** "Conheça as coberturas" expande os quatro grupos (Saúde, Imprevistos no caminho, Emergências em casa, Documentos e questões judiciais); clicar de novo recolhe. No desktop são duas colunas com os casos em lista; no celular é uma coluna com os casos em linha, separados por "·". _(components/modal-protecao.tsx)_
- **TCP-10** No celular, com as coberturas abertas, o escudo e os anéis somem e o rodapé dos botões ganha borda e sombra; o conteúdo rola por trás do rodapé fixo. _(components/modal-protecao.tsx, components/modal-protecao.css)_
- **TCP-11** "Valor da proteção" mostra o valor calculado para o pedido (8% dos ingressos), o mesmo que entra no resumo. _(components/modal-protecao.tsx, data/pedido-store.ts)_
- **TCP-12** "Continuar com proteção": o card fica verde (borda `#75E0A7`, fundo `#F6FEF9`, recortes acompanham) e o modal permanece 600ms antes de fechar. Durante a espera, "Prefiro correr o risco" fica desativado. Depois o resumo ganha a linha "Proteção de compra" e o valor entra no total. _(components/modal-protecao.tsx, components/checkout-resumo.tsx)_
- **TCP-13** "Prefiro correr o risco" fecha o modal na hora e o resumo fica sem a linha da proteção. O modal não se repete naquela visita. _(components/modal-protecao.tsx)_
- **TCP-16** Quem recusou vê, acima de "Escolha como pagar", o aviso "Imprevistos acontecem. Sua compra está sem proteção." / "Se um imprevisto impedir sua ida, você fica sem o reembolso da proteção.", com "Proteger por R$ X" (mesmo bloco do teste B). _(components/aviso-sem-protecao.tsx, pages/checkout.tsx)_
- **TCP-17** "Proteger por R$ X" aceita a proteção direto, sem reabrir o modal: o aviso recolhe e a linha "Proteção de compra" entra no resumo com a confirmação do TCP-25. _(components/aviso-sem-protecao.tsx)_
- **TCP-14** O nome "Proteção de compra" no resumo é clicável (sublinhado) e reabre o modal, que entra de novo no estado inicial. "Continuar com proteção" mantém a proteção e "Prefiro correr o risco" tira a linha e o valor do total. _(components/checkout-resumo.tsx, pages/checkout.tsx)_
- **TCP-15** Os meios de pagamento não abrem: o protótipo termina na escolha da proteção. _(components/checkout-metodos.tsx)_

### Animações
Tempos em ms. Curvas: ease-out `cubic-bezier(0.2, 0.8, 0.2, 1)`, standard `cubic-bezier(0.4, 0, 0.2, 1)`. Tudo em _components/modal-protecao.css_, seguindo o quadro "Animação & handoff" do Figma.

- **TCP-20** Sequência de entrada (atraso desktop / celular · duração · curva). A entrada principal termina em ~1,2s:

  | # | Elemento | Movimento | Atraso | Duração | Curva |
  | --- | --- | --- | --- | --- | --- |
  | 1 | Scrim | opacidade 0→1 | 0 / 0 | 200 | linear |
  | 2 | Modal (desktop) | opacidade + Y(+16→0) + escala(0,98→1) | 60 | 260 | ease-out |
  | 2 | Folha (celular) | Y 100%→0 | 60 | 320 | ease-out |
  | 3 | Anéis | opacidade + escala(0,7→1) | 200 / 240 | 500 | ease-out |
  | 4 | Círculo do escudo | opacidade + escala(0,6→1) | 220 / 260 | 260 | ease-out |
  | 5 | Título | opacidade + Y(+8→0) | 300 / 320 | 260 | ease-out |
  | 6 | Apoio | opacidade + Y(+8→0) | 360 / 380 | 260 | ease-out |
  | 7 | Card | opacidade + Y(+8→0) | 440 / 460 | 300 | ease-out |
  | 8 | Check do escudo | traço desenhado | 480 / 520 | 320 | ease-out |
  | 9 | Ações | opacidade + Y(+8→0) | 540 / 560 | 260 | ease-out |
  | 10 | Recortes laterais | opacidade 0→1 | 680 / 700 | 200 | linear |
  | 11 | Picote | rasga da esquerda (escala X) | 700 / 720 | 420 | standard |
  | 12 | Pulso 1 (anel cinza de 200px / 160px, traço 2px, α 0,12) | escala 0,55→1,25; opacidade 0→0,9 (aos 25%)→0 | 700 | 2400, em loop | ease-out |
  | 13 | Pulso 2 (mesmo anel, α 0,08) | igual ao pulso 1 | 1500 | 2400, em loop | ease-out |
  | 14 | Brilho no botão primário | faixa branca a 22%, 25% da largura do botão, inclinada −20°, varre de X −120% a +420% da própria largura | 1300 | 800 × 1 | standard |

- **TCP-21** Os pulsos do escudo ficam em loop enquanto o modal está aberto (decisão de 2026-11-19; a spec pedia 3 ciclos, parando em ~8,7s). O brilho do botão passa uma vez só.
- **TCP-22** "Conheça as coberturas": o chevron gira 180° e a lista aparece (opacidade 0→1, Y −4→0) enquanto o card abre; no celular o escudo some e o rodapé ganha borda e sombra. Tudo em 150ms linear. A troca de cor do card protegido (TCP-12) leva 200ms linear; os hovers, 100ms linear.
- **TCP-23** Passar o mouse: botão primário `#FF271A`→`#C81F14`; acordeão e botão secundário ganham fundo `#FAFAFA`.
- **TCP-24** Ao fechar, o modal e o scrim somem juntos em 200ms.
- **TCP-25** Ao aceitar a proteção, o resumo confirma depois de o modal fechar: a linha "Proteção de compra" abre, ganha um realce verde que some e o total conta até o novo valor (sem escudo ao lado do nome, retirado a pedido em 2026-11-19). Ao remover, a linha recolhe e o total conta de volta. _(components/checkout-resumo.tsx)_
- **TCP-27** O aviso de compra sem proteção (TCP-16) abre depois de o modal fechar: a altura cresce e o bloco aparece subindo 10px em 0,45s; ao aceitar por ele, recolhe em 0,35s. Os meios de pagamento descem e sobem junto, sem salto. _(components/aviso-sem-protecao.tsx)_
- **TCP-26** Com "reduzir movimento" ligado no sistema, tudo aparece direto no estado final: sem sequência de entrada, pulsos, brilho ou transições. A espera de 600ms do TCP-12 continua. _(components/modal-protecao.css, components/checkout-resumo.tsx)_

### Estados
- **TCP-30** A jornada sempre começa na seleção de ingressos: checkout aberto sem pedido (URL direta ou página recarregada) redireciona para a seleção. _(pages/checkout.tsx)_
- **TCP-31** O tempo restante da reserva conta a partir de 09m15s e para em zero, sem expirar a compra. _(components/checkout-topo.tsx)_

## Depende de / afeta

- **Depende de:** nada da plataforma unificada.
- **Afeta:** nenhuma outra tela. As versões anteriores seguem em `payin/teste-ab-protecao-de-compra` e `payin/teste-b-protecao-de-compra`.

## Em aberto

- O aviso de compra sem proteção (TCP-16) não está no fluxo do Figma do Teste C: veio do protótipo do teste B, a pedido em 2026-11-19. Levar para o Figma se aprovado.
- A spec v.5 diz "nada fica em loop infinito" e pulsos em 3 ciclos; o protótipo deixa os pulsos em loop a pedido (TCP-21). Alinhar a spec e o quadro do Figma.
- Os frames de Checkout do Figma (`11026:80145`, `11026:80492`, `11026:81733`) e os de celular não devolvem linha do tempo de animação pela integração do Figma (o retorno veio vazio). As animações do protótipo seguem o quadro escrito "Animação & handoff"; se houver keyframes na timeline do Figma com algo diferente do quadro, falta comparar.
- Os pulsos são anéis cinzas (neutral-500), não vermelhos: a spec dá o α mas não a cor, e a cor foi confirmada em 2026-11-19 ("apenas as linhas cinzas").
- A spec diz botão secundário em Elza Medium 14/20; o frame do Figma usa Semibold 16/24. O protótipo segue o frame.
- A spec pede recortes em meia-lua de 9×16; o protótipo usa o círculo de 16px do frame, cortado pela borda do card.
- A spec não descreve a saída do modal: o protótipo usa 200ms de opacidade (TCP-24).
- No frame "Protegido" a borda do card usa `#86EFAC` (utility-green-300) e as linhas internas seguem brancas; o quadro de animação pede `#75E0A7` e fundo `#F6FEF9`. O protótipo segue o quadro.
- No Figma o botão é "Continuar com proteção", sem valor; o valor aparece só no card.
- No Figma, "Valor da proteção" mostra R$ 150,00; o protótipo usa o valor calculado (TCP-11).
- O Figma avisa que texto branco sobre `#FF271A` tem contraste ~3,6:1, abaixo do AA para 16px. É uma questão do design system; o protótipo mantém a cor.
- O resumo do checkout no Figma mostra o título "Adicionais"; o protótipo herdou do teste AB a linha sem título.
- A confirmação no resumo (TCP-25) veio do teste AB e não está neste fluxo do Figma.
- O frame de celular do checkout usa outro evento ("Réveillon Carneiros 2027"); o protótipo mantém o Dawn Patrol nas duas larguras.
- O Figma mostra "Atribuição" nas etapas, mas o fluxo vai da seleção direto ao checkout.
- A seleção de ingressos, o carregamento e o checkout foram reaproveitados do teste AB; os frames deste fluxo não foram comparados pixel a pixel.
- Os casos cobertos listados em "Conheça as coberturas" vêm do Figma e precisam de validação do jurídico.
- O escudo do topo do modal é desenhado em SVG dentro do componente (mesmo desenho do Figma) para o check poder ser traçado; o picote e os recortes são feitos em CSS para poderem animar e mudar de cor.
- Os ícones dos grupos de cobertura vêm da biblioteca de ícones do design system (`@untitledui/icons`: activity-heart, bus, home-02, scales-02), não dos SVGs exportados do Figma, que saíam quebrados.

## Fontes

- Spec "Modal de proteção de compra — v.5" (`SPEC-protecao-modal-v5.md`, recebida em 2026-11-19): tokens, layout e tabela de animação
- Figma: Checkout AWA, seção `10981:78889`: modal v.5 desktop (`10999:4866`, `11009:417`, `11012:418`), celular (`11013:4893`, `11014:417`, `11017:418`), quadro "Animação & handoff" (`11021:417`) e frames de Checkout (`11026:80145`, `11026:80492`, `11026:81733`)
