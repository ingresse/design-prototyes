# Teste B - Proteção de compra: regras

> **Rotas:** `/payin/teste-b-protecao-de-compra`, `/payin/teste-b-protecao-de-compra/checkout`
> **No menu:** Produtos › PayIn › Teste B - Proteção de compra
> **Versão em uso:** oferta dentro do checkout, acima dos meios de pagamento
> **Revisado em:** 2026-11-19

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

Nova versão do desafiante de proteção de compra. O comprador escolhe os ingressos sem ver oferta de
proteção; no checkout, um bloco acima dos meios de pagamento conta a história ("E se, no dia do
show…" com perguntas em loop) e faz a oferta. O pagamento só libera depois da escolha. Não há modal
na entrada: é a diferença para o `teste-ab-protecao-de-compra`.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Evento, setores e ingressos | `data/evento.ts` (mock local) | não |
| Pedido (quantidades e escolha da proteção) | `data/pedido-store.ts` (mock local) | só em memória |

O evento é um mock local porque o teste reproduz o carrinho de produção (Dawn Patrol), não um
evento da plataforma unificada. Valores de proteção (8%) e taxas são de experimento.

## Regras

### Comportamento
- **TBP-01** A seleção de ingressos não oferece proteção: o resumo mostra só os itens, o total e "Continuar". _(pages/selecao.tsx, components/resumo.tsx)_
- **TBP-02** Sem ingresso selecionado, o desktop mostra o banner do evento no lugar do resumo; no celular a barra do resumo não aparece. _(components/resumo.tsx)_
- **TBP-03** Ao clicar em "Continuar", um carregamento cobre a tela inteira por 1,5s antes de abrir o checkout. Nada atrás dele recebe clique. _(pages/selecao.tsx, components/carregando-pagamento.tsx)_
- **TBP-04** "Continuar" leva ao checkout e zera a escolha de proteção: cada entrada no checkout mostra a oferta de novo. _(pages/selecao.tsx)_
- **TBP-05** No checkout, o bloco de proteção fica acima de "Escolha como pagar": gancho escuro à esquerda e oferta à direita no desktop; no celular, gancho em cima e oferta embaixo. _(components/protecao-narrativa.tsx)_
- **TBP-06** Enquanto não há escolha, os meios de pagamento ficam travados (esmaecidos, sem clique) e o texto "Escolha uma das opções de proteção acima para liberar o pagamento." aparece sob o título. _(components/checkout-metodos.tsx)_
- **TBP-07** "Continuar com proteção · R$ X" inclui a linha "Proteção de compra" no resumo, soma o valor ao total e libera o pagamento. _(components/protecao-narrativa.tsx, components/checkout-resumo.tsx)_
- **TBP-08** "Prefiro correr o risco" libera o pagamento sem a linha da proteção no resumo. _(components/protecao-narrativa.tsx)_
- **TBP-09** Depois da escolha, o bloco encolhe para uma linha de confirmação: "Compra protegida" com "Remover", ou "Você seguiu sem proteção" com "Proteger por R$ X". O comprador pode mudar de ideia quantas vezes quiser; o pagamento segue liberado. _(components/protecao-narrativa.tsx)_
- **TBP-10** "Conheça as coberturas!" abre um modal com os quatro grupos de cobertura (Saúde, Imprevistos no caminho, Emergências em casa, Documentos e questões judiciais). O modal fecha no "X", clicando fora ou no Esc sem mudar a escolha, e repete os dois botões da oferta. _(components/modal-coberturas.tsx)_
- **TBP-11** O nome "Proteção de compra" no resumo é clicável (sublinhado) e abre o mesmo modal de coberturas. _(components/checkout-resumo.tsx, pages/checkout.tsx)_
- **TBP-12** O valor no botão da oferta é o calculado para o pedido (8% dos ingressos), o mesmo que entra no resumo. _(components/protecao-narrativa.tsx, data/pedido-store.ts)_
- **TBP-13** Os meios de pagamento, mesmo liberados, não abrem: o protótipo termina na escolha da proteção. _(components/checkout-metodos.tsx)_
- **TBP-14** O Pix leva o selo "Aprovação imediata". _(components/checkout-metodos.tsx)_

### Animações
- **TBP-20** Perguntas do gancho: cinco perguntas em loop de 13s. Cada uma fica 2s parada e sobe 72px em 0,5s para dar lugar à próxima; a primeira se repete no fim para o ciclo recomeçar sem salto. Tempos e curvas vêm do Figma. _(components/protecao-narrativa.tsx)_
- **TBP-21** Brilho do botão "Continuar com proteção": uma faixa clara de 70px cruza o botão da esquerda para a direita a cada 2,6s, em loop. _(components/protecao-narrativa.tsx)_
- **TBP-22** Ao aceitar a proteção, o resumo confirma: a linha "Proteção de compra" abre, ganha um realce verde que some, o escudo aparece e o total conta até o novo valor. Ao remover, a linha recolhe e o total conta de volta. _(components/checkout-resumo.tsx)_
- **TBP-23** Com "reduzir movimento" ligado no sistema, as perguntas ficam paradas na primeira, o brilho some e o resumo muda sem animação. Leitor de tela recebe as cinco perguntas como texto, sem o loop. _(components/protecao-narrativa.tsx, components/checkout-resumo.tsx)_

### Estados
- **TBP-30** A jornada sempre começa na seleção de ingressos: checkout aberto sem pedido (URL direta ou página recarregada) redireciona para a seleção. _(pages/checkout.tsx)_
- **TBP-31** O tempo restante da reserva conta a partir de 09m15s e para em zero, sem expirar a compra. _(components/checkout-topo.tsx)_
- **TBP-32** No celular o título do checkout é "Finalizar compra"; no desktop é o nome do evento. O resumo do pedido vai para depois dos meios de pagamento no celular. _(components/checkout-topo.tsx, pages/checkout.tsx)_

## Depende de / afeta

- **Depende de:** nada da plataforma unificada.
- **Afeta:** nenhuma outra tela. A versão com modal segue em `payin/teste-ab-protecao-de-compra`.

## Em aberto

- O estado depois da escolha (TBP-09) não está no Figma: foi criado no protótipo. Validar e levar para o Figma se aprovado.
- O conteúdo de "Conheça as coberturas!" (TBP-10) não está neste fluxo do Figma: o modal reaproveita as coberturas do teste AB. Os casos cobertos precisam de validação do jurídico.
- No Figma o botão mostra "R$ 11,90", mas o mesmo frame tem total de R$ 359,00 para R$ 300,00 em ingressos e R$ 35,00 em taxas (diferença de R$ 24,00, os 8%). O protótipo usa o valor calculado (TBP-12).
- A linha do tempo do frame Checkout tem mais três camadas animadas nos primeiros 0,6s (um cursor, um botão redondo e um retângulo, parecendo um interruptor sendo clicado) que não aparecem no frame renderizado. Não foram implementadas; confirmar se são sobra de outra exploração.
- O frame de celular usa outro evento ("Vai Safadão", Belém - PA); o protótipo mantém o Dawn Patrol nas duas larguras.
- O frame de celular não mostra o resumo do pedido; no protótipo ele fica depois dos meios de pagamento (TBP-32).
- O Figma mostra "Atribuição" nas etapas, mas o fluxo vai da seleção direto ao checkout.
- A seleção de ingressos e o carregamento foram reaproveitados do teste AB; os frames de seleção deste fluxo não foram comparados pixel a pixel.
- A capa do evento no checkout é o placeholder verde do Figma.

## Fontes

- Figma: Checkout AWA, seção "teste novo" (`10928:69646`), frames Checkout (`10950:75560`) e Teste/recuperação (Mobile) (`10961:76773`)
