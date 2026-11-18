# Teste AB - Proteção de compra: regras

> **Rotas:** `/payin/teste-ab-protecao-de-compra`, `/payin/teste-ab-protecao-de-compra/checkout`
> **No menu:** Produtos › PayIn › Teste AB - Proteção de compra
> **Versão em uso:** variante B (modal sobre o checkout)
> **Revisado em:** 2026-11-18

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

Desafiante do teste A/B de proteção de compra dentro do checkout. O comprador escolhe os ingressos
sem ver oferta de proteção; ao chegar no checkout, um modal pergunta se ele quer proteger a compra
antes de ver os meios de pagamento. Compete com a versão em produção (bloco no checkout que trava
o pagamento até a escolha).

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Evento, setores e ingressos | `data/evento.ts` (mock local) | não |
| Pedido (quantidades e escolha da proteção) | `data/pedido-store.ts` (mock local) | só em memória |

O evento é um mock local porque o teste reproduz o carrinho de produção (Dawn Patrol), não um
evento da plataforma unificada. Valores de proteção (8%) e taxas são de experimento.

## Regras

### Comportamento
- **TAP-01** A seleção de ingressos não oferece proteção: o resumo mostra só os itens, o total e "Continuar". _(pages/selecao.tsx, components/resumo.tsx)_
- **TAP-02** Sem ingresso selecionado, o desktop mostra o banner do evento no lugar do resumo; no celular a barra do resumo não aparece. _(components/resumo.tsx)_
- **TAP-11** Ao clicar em "Continuar", um carregamento cobre a tela inteira (fundo escurecido e desfocado, cartão escuro com o círculo girando e "Preparando seu pagamento…") por 1,5s antes de abrir o checkout. Nada atrás dele recebe clique. _(pages/selecao.tsx, components/carregando-pagamento.tsx)_
- **TAP-03** "Continuar" leva ao checkout e zera a escolha de proteção: cada entrada no checkout mostra o modal de novo. _(pages/selecao.tsx)_
- **TAP-04** O modal de proteção abre sobre o checkout enquanto não houver escolha. _(pages/checkout.tsx)_
- **TAP-05** O modal não tem "X" e não fecha ao clicar fora nem com Esc: as saídas são "Continuar com proteção" e "Prefiro correr o risco". _(components/modal-protecao.tsx)_
- **TAP-06** "Continuar com proteção" fecha o modal e inclui a linha "Proteção de compra" no resumo (sem o título "Adicionais" do Figma), somando o valor ao total. _(components/checkout-resumo.tsx)_
- **TAP-07** "Prefiro correr o risco" fecha o modal; o resumo fica sem a linha da proteção e a oferta não se repete naquela visita. _(components/checkout-resumo.tsx)_
- **TAP-12** A linha "Proteção de compra" tem um "Remover" ao lado: ao clicar, a linha some, o total perde o valor da proteção e o modal não reabre naquela visita. _(components/checkout-resumo.tsx)_
- **TAP-08** "Ver todas as coberturas" abre, dentro dos próprios cartões, os casos cobertos de cada tipo de imprevisto. _(components/modal-protecao.tsx)_
- **TAP-09** No desktop o modal é um card central de 480px; no celular é uma folha ancorada no rodapé. _(components/modal-protecao.tsx)_
- **TAP-10** Os meios de pagamento não abrem: o protótipo termina na escolha da proteção. _(components/checkout-metodos.tsx)_

### Estados
- **TAP-20** ~~Checkout aberto direto pela URL assume 2 ingressos de Pista~~ substituída por TAP-22.
- **TAP-22** A jornada sempre começa na seleção de ingressos: checkout aberto sem pedido (URL direta ou página recarregada) redireciona para a seleção. _(pages/checkout.tsx)_
- **TAP-21** O tempo restante da reserva conta a partir de 09m15s e para em zero, sem expirar a compra. _(components/checkout-topo.tsx)_

## Depende de / afeta

- **Depende de:** nada da plataforma unificada.
- **Afeta:** nenhuma outra tela. O experimento anterior (proteção na seleção) segue em `checkout/protecao-de-compra`.

## Em aberto

- O Figma mostra "Atribuição" nas etapas, mas o fluxo vai da seleção direto ao checkout. Falta decidir se o modal também aparece para quem já recusou a proteção na atribuição.
- Depois de remover a proteção pelo resumo, não há como adicioná-la de volta no checkout.
- O conteúdo de "Ver todas as coberturas" não está no Figma (só o link). Os casos vieram do modal de coberturas do experimento anterior e precisam de validação do jurídico.
- O checkout no celular foi derivado do desktop e da estrutura do frame; o Figma só mostra essa tela desfocada atrás do modal.
- A capa do evento no checkout é o placeholder verde do Figma.
- No Figma o texto "Preparando seu pagamento…" usa text-primary (#171717) sobre o cartão #181818 e fica invisível. No protótipo está em branco; falta corrigir o token no Figma.

## Fontes

- Figma: Checkout AWA, seção "Opção B" (`10844:58833`) e carregamento (`10867:67896`)
- Reunião "Proteção de compra" de 2026-11-18 (Laricia e Wander)
