# Teste AB - Proteção de compra: regras

> **Rotas:** `/payin/teste-ab-protecao-de-compra`, `/payin/teste-ab-protecao-de-compra/checkout`
> **No menu:** Produtos › PayIn › Teste AB - Proteção de compra
> **Versão em uso:** variante B (modal sobre o checkout)
> **Revisado em:** 2026-11-19

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
- **TAP-05** O modal não tem "X" e não fecha ao clicar fora nem com Esc: as saídas são "Proteger meu ingresso" e "Prefiro correr o risco". _(components/modal-protecao.tsx)_
- **TAP-06** "Proteger meu ingresso" fecha o modal e inclui a linha "Proteção de compra" no resumo (sem o título "Adicionais" do Figma), somando o valor ao total. _(components/checkout-resumo.tsx)_
- **TAP-07** "Prefiro correr o risco" fecha o modal; o resumo fica sem a linha da proteção e a oferta não se repete naquela visita. _(components/checkout-resumo.tsx)_
- ~~**TAP-12**~~ Substituída por TAP-13 (o "Remover" saiu do resumo).
- **TAP-13** O nome "Proteção de compra" no resumo é clicável (sublinhado) e reabre o modal de proteção. Enquanto o modal está reaberto, a linha e o total continuam como estavam; "Proteger meu ingresso" mantém a proteção e "Prefiro correr o risco" tira a linha e o valor do total. _(components/checkout-resumo.tsx, pages/checkout.tsx)_
- ~~**TAP-08**~~ Substituída por TAP-14 (o modal foi redesenhado no Figma em 2026-11-19).
- **TAP-14** O modal abre enxuto: título, descrição, "Conheça as coberturas" (recolhido), valor da proteção e os dois botões. "Conheça as coberturas" expande quatro cartões (Saúde, Imprevistos no caminho, Emergências em casa, Documentos e questões judiciais) com os casos cobertos de cada um; clicar de novo recolhe. _(components/modal-protecao.tsx)_
- **TAP-15** "Valor da proteção" no modal mostra o valor calculado para o pedido (8% dos ingressos), o mesmo que entra no resumo. _(components/modal-protecao.tsx, data/pedido-store.ts)_
- **TAP-16** Ao aceitar a proteção, o resumo confirma a escolha com uma animação, logo depois de o modal fechar: a linha "Proteção de compra" abre, ganha um realce verde que some em seguida, o escudo verde aparece ao lado do nome e o total conta até o novo valor. Ao recusar depois de ter aceitado, a linha recolhe e o total conta de volta. Com "reduzir movimento" ligado no sistema, tudo muda sem animação. _(components/checkout-resumo.tsx)_
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

- Depois de escolher "Prefiro correr o risco" (na primeira vez ou ao rever), a linha some do resumo e não há como adicionar a proteção de volta no checkout. Uma oferta "Adicionar por R$ X" no resumo foi testada e descartada em 2026-11-19.
- A animação de confirmação (TAP-16) e o escudo verde ao lado de "Proteção de compra" no resumo foram criados no protótipo, não estão no Figma. Validar e levar para o Figma se aprovados.
- O Figma mostra "Atribuição" nas etapas, mas o fluxo vai da seleção direto ao checkout. Falta decidir se o modal também aparece para quem já recusou a proteção na atribuição.
- O modal não tem mais a linha de aceite dos "Termos e condições" (saiu no redesenho do Figma). Falta confirmar com o jurídico se a adesão pode ficar sem esse aceite.
- Os casos cobertos listados em "Conheça as coberturas" vêm do Figma e precisam de validação do jurídico.
- No Figma, o frame desktop com as coberturas abertas tem outro título ("Imprevistos acontecem. Não perca seu ingresso."). O protótipo usa "Proteja sua compra." nos dois estados, como nos outros três frames.
- No Figma, o cartão "Saúde" usa ícone de coração no desktop e check-circle no celular. O protótipo usa o coração nos dois.
- No Figma, "Valor da proteção" mostra R$ 150,00, mas o resumo do mesmo pedido mostra R$ 24,00. O protótipo usa o valor calculado (TAP-15).
- O resumo do checkout no Figma ainda mostra o título "Adicionais"; no protótipo ele foi removido a pedido (TAP-06).
- No Figma, o carregamento no celular (`10938:72241`) é um cartão branco só com o círculo (o texto fica cortado); no desktop é o cartão escuro. O protótipo usa o cartão escuro com texto nos dois.
- O checkout no celular foi derivado do desktop e da estrutura do frame; o Figma só mostra essa tela desfocada atrás do modal.
- A capa do evento no checkout é o placeholder verde do Figma.
- No Figma o texto "Preparando seu pagamento…" usa text-primary (#171717) sobre o cartão #181818 e fica invisível. No protótipo está em branco; falta corrigir o token no Figma.

## Fontes

- Figma: Checkout AWA, seção "Opção B" (`10844:58833`), carregamento (`10867:67896`) e modal redesenhado (`10938:71988`, `10938:72102`, `10938:72199`)
- Reunião "Proteção de compra" de 2026-11-18 (Laricia e Wander)
