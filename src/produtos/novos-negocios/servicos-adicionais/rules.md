# Serviços adicionais: regras

> **Rotas:** `/novos-negocios/servicos-adicionais`, `/novos-negocios/servicos-adicionais/checklist`, `/novos-negocios/servicos-adicionais/:servico`, `/novos-negocios/servicos-adicionais/:servico/checkout`, `/novos-negocios/servicos-adicionais/:servico/confirmacao`
> **No menu:** fora do menu; cada oferta abre pelo link de uma comunicação (push, WhatsApp, e-mail). A lista em `/novos-negocios/servicos-adicionais` é só a entrada do protótipo.
> **Revisado em:** 2026-11-13

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

Compra de serviços de parceiros independente da compra de ingressos. O principal é o crédito
Uber com desconto: a pessoa escolhe o valor, paga no checkout da Ingresse e ativa o crédito na
Uber pelo app ou por código. A oferta não depende de evento nem de a pessoa ter ingresso.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Serviços (Uber, Meep): textos, valores, desconto, condições, resgate | `data/servicos.ts` (mock local) | não |
| Usuário (nome, e-mail) | `data/servicos.ts` (`USUARIO`, mock local) | não |
| Valor escolhido e forma de pagamento | query string (`?valor=`, `&forma=`) entre checkout e confirmação | não |
| Código de resgate | gerado no front a partir de valor + forma (ilustrativo) | não |

Valores, descontos e condições são ilustrativos, não condições comerciais fechadas com os parceiros.

## Regras

### Oferta
- **SAD-06** Mobile (ofertas e Checklist): o header da Ingresse é fixo e sempre vazado sobre a imagem do topo. O card da página sobe por cima da imagem até encostar no header; daí em diante a rolagem segue por baixo do header, que continua mostrando a faixa de cima da imagem, então o conteúdo nunca aparece através dele. _(components/topo.tsx, components/painel-checklist.tsx)_
- **SAD-01** A oferta não mostra evento, exceto quando o serviço é de um evento (Meep, SAD-09; Uber do evento, SAD-14): no desktop, conteúdo de um lado e mosaico de fotos do outro (mosaico à esquerda, discreto: até 480px, quadrado, 10 fotos em 3 colunas de alturas desencontradas; a cada 15 s — o primeiro logo no começo — um brilho de vidro sutil atravessa uma foto sorteada, só como efeito, parado com "reduzir movimento"); no mobile, o mesmo mosaico no topo (largura toda, cortado em cima e embaixo, atrás do header vazado) e o card da oferta desliza por cima; o brilho passa na mesma foto em todas as cópias. _(pages/oferta.tsx, components/mosaico-oferta.tsx, components/topo.tsx)_
- **SAD-02** Topo da oferta: selo do parceiro com nome e categoria, título e benefícios com ícones do Iconly (Light). Sem legenda abaixo do título, exceto quando ela acrescenta informação. Uber (copy revisada após a review de Design): a linha da marca diz o que se compra com o selo do desconto ("Crédito Uber" + "5% off", selo verde), sem repetir "Uber · Transporte"; título "Menos na corrida, mais pro rolê"; legenda "Compre crédito Uber com desconto e aproveite o rolê do começo ao fim com segurança."; benefícios "R$ 5 de desconto a cada R$ 100" (mesmo estilo dos outros) e "Parcele em até 2x sem juros". _(components/apresentacao-servico.tsx, components/icones-iconly.tsx, data/servicos.ts)_
- **SAD-03** Teste (Uber e Meep): a oferta já abre com R$ 100 (o valor do meio) selecionado, com o selo "Mais escolhido" em cima do card, e o CTA já habilitado com o preço. Vale também ao recarregar ou voltar do checkout. Serviços sem valor em destaque (fotos, seguro) abrem sem nada selecionado. _(utils/use-selecao-valor.ts, components/seletor-valor.tsx, data/servicos.ts `valorDestaque`)_
- **SAD-04** Cada card de valor mostra o valor do crédito e quanto a pessoa paga com desconto ("por R$ …"), sem selo de % OFF nos cards (o selo do desconto fica só na linha da marca, SAD-02). _(components/seletor-valor.tsx)_
- **SAD-07** Serviços de crédito ou recarga (Uber, Meep) têm "Outro valor" em largura total abaixo dos valores sugeridos; ao escolher, o botão dá lugar ao campo (tocar num valor sugerido traz o botão de volta) e o CTA só habilita com um valor válido. O campo aceita reais inteiros entre o mínimo e o máximo do serviço e, no crédito com desconto, mostra a faixa e quanto a pessoa paga; na recarga (Meep) não há legenda embaixo do campo, só a mensagem de erro quando o valor está fora do mínimo ou máximo. Pacotes (fotos, seguro) não têm. _(components/seletor-valor.tsx, utils/use-selecao-valor.ts)_
- **SAD-05** O CTA aparece desde o início, desabilitado até a escolha do valor; no desktop fica no fim do conteúdo e no mobile numa barra fixa no rodapé. Uber: desabilitado, "Comprar crédito"; com valor escolhido, mostra o preço com desconto ("Comprar por R$ 47,50"). _(components/oferta-servico.tsx)_
- **SAD-08** Uber e Meep: botão discreto de compartilhar (só ícone, com o rótulo "Compartilhar com a galera" no tooltip, só no desktop — o mobile não tem tooltip — e para leitores de tela) à direita da linha da marca; o fim da página fica só com o CTA. O botão abre um modal (desktop) ou um bottom sheet (mobile) com título e legenda do serviço (Uber: "Coisa boa a gente divide" / "Manda pra quem vai com você. Todo mundo pode comprar crédito Uber com 5% off."; Meep: "Avisa quem vai com você" / "Assim todo mundo carrega a pulseira antes de sair de casa pro {evento}."), prévia do link (selo, título da oferta e endereço, sem marcações de origem) e duas opções: "Enviar no WhatsApp" (com a logo do WhatsApp; mensagem provisória antes do link) e "Copiar link" (vira "Link copiado!" com check por 2 s). Fecha pelo fundo ou pelo Esc; no desktop também pelo X; no mobile não há X visível, só a alça, e arrastá-la para baixo fecha o bottom sheet. _(components/compartilhar-oferta.tsx, components/apresentacao-servico.tsx, data/servicos.ts)_
- **SAD-09** Meep (sempre ligada a um evento): no desktop, o card do evento (pôster, nome, local e data, até 400px) entra no lugar do mosaico, e o pôster tem o mesmo brilho de vidro do mosaico (o primeiro logo no começo, depois a cada 15 s; parado com "reduzir movimento"); no mobile, o topo é o pôster desfocado com nome, local e data do evento em branco (local e data com os ícones, como no card do desktop), atrás do header vazado. Copy: linha da marca "Recarga Meep"; título "Menos fila, mais rolê"; legenda "Carregue sua pulseira antes de sair de casa e use nos bares, comidas e lojas do evento."; dois benefícios, "Pague só aproximando a pulseira" e "Defina antes quanto quer gastar" (provisórios, a definir); aviso "Sobrou saldo? Você pode pedir a devolução depois do evento, conforme as regras da Meep."; CTA "Recarregar", que vira "Recarregar R$ 100,00" com o valor escolhido. Diz "menos fila", não "sem fila": não promete fim das filas nem devolução automática. _(pages/oferta.tsx, components/contexto-evento.tsx, data/servicos.ts)_
- **SAD-14** Duas versões do crédito Uber: a genérica (`/uber`, sem evento, com mosaico) e a ligada a um evento (`/uber-evento`), que reaproveita a oferta, o checkout e o resgate da genérica e muda só o que liga ao evento: card do evento no lugar do mosaico no desktop e topo com o evento no mobile (como a Meep, SAD-09); título "O melhor jeito de ir pro {evento}" (nome sem o ano); legenda "Pague menos e vá e volte sem se preocupar." (cabe em uma linha no celular a partir de 375px); legenda do compartilhar citando o evento. Na lista de serviços aparecem como "Uber · Transporte" e "Uber · Transporte para o evento". _(data/servicos.ts `UBER` e `uber-evento`, pages/servicos-adicionais.tsx)_

### Checklist do rolê (vitrine de serviços)
- **SAD-50** ~~Vitrine na mesma estrutura da oferta (mosaico + card)~~ substituída por SAD-56.
- **SAD-51** Cada serviço é um card com selo, nome, benefício principal (só texto, sem ícone) e o botão "Eu quero" (sem preço); no mobile o botão vai embaixo, na largura toda. _(components/checklist-servicos.tsx)_
- **SAD-56** Estrutura própria, diferente das ofertas: header e o título rotativo (no desktop em vermelho/brand, sozinho à esquerda e centralizado na altura, com a legenda e a linha do tempo à direita; no mobile em branco, no topo de vidro — ver SAD-57) com frases que se revezam a cada 3 s, uma de cada vez, com animação de subida ("Viva o evento", "Prepare tudo", "Aproveite mais", "Experiência completa", "Seu rolê começa aqui"; parado na primeira com "reduzir movimento"), com a legenda "Encontre serviços e benefícios disponíveis para o seu evento" embaixo (grande, em negrito, sem ponto final), e uma linha do tempo com os momentos do rolê numerados (círculo branco com contorno cinza e número em preto) (Antes de sair: seguro; Ida e volta: Uber; No evento: Meep e fotos). _(pages/checklist.tsx, components/checklist-servicos.tsx, data/servicos.ts `MOMENTOS`)_
- **SAD-57** Sem banner de serviços (o card rotativo de vidro saiu; o componente segue em components/painel-checklist.tsx). Mobile: o topo (260px) é só o fundo de vidro (brilhos coloridos sob uma camada escurecida com reflexo) atrás do header vazado, com as frases rotativas em branco embaixo; os brilhos trocam de cor junto com a frase. O conteúdo (legenda e linha do tempo) sobe por cima num card branco, no esquema das ofertas (SAD-06). Desktop: sem fundo de vidro. Os cards dos serviços ganham borda preta no hover. _(pages/checklist.tsx, components/painel-checklist.tsx `FundoVidro`, components/frases-rotativas.tsx)_
- **SAD-58** Quem abre uma oferta pelo Checklist (`?de=checklist`) vê "← Voltar" (desktop: no canto superior esquerdo, acima do mosaico, sem mudar a altura da página; mobile: no topo do card), que volta para a vitrine; a marcação segue para o checkout e volta com o "voltar". Quem chega pela comunicação não vê o botão. _(pages/oferta.tsx, components/oferta-servico.tsx, components/checklist-servicos.tsx, pages/checkout.tsx)_
- **SAD-52** ~~Resumo e CTA único para vários serviços~~ substituída por SAD-54.
- **SAD-53** ~~Checkout e confirmação com vários serviços~~ substituída por SAD-54.
- **SAD-54** "Eu quero" abre a página de contratação do serviço (a mesma oferta individual); cada serviço é contratado e pago separadamente. _(components/checklist-servicos.tsx)_
- **SAD-55** Serviços vendidos em pacote (fotos, seguro) mostram o nome do pacote nas opções e no resumo, com o preço embaixo. _(components/seletor-valor.tsx, utils/pedido.ts)_

### Checkout
- **SAD-10** Segue o formato do checkout em produção (barra com voltar, "Finalizar pedido" com tempo restante, métodos em lista, resumo à direita), sem proteção de compra e sem dados do evento: no lugar do evento entra a mesma linha da marca da oferta (selo e nome com só a inicial maiúscula, sem o selo "5% off", porque o desconto já aparece nos itens). A barra de cima mostra o nome no mesmo estilo, sem caixa alta. _(pages/checkout.tsx)_
- **SAD-11** Resumo: item, desconto e "Total a pagar". Sem taxas. _(pages/checkout.tsx)_
- **SAD-12** Valor ausente ou fora do mínimo/máximo do serviço (ou pacote inexistente) volta para a página de origem. _(pages/checkout.tsx, utils/pedido.ts)_
- **SAD-13** Protótipo: escolher PIX leva à confirmação "pago com Pix"; Crédito, Google Pay e Click to Pay levam à confirmação "pago com cartão". _(pages/checkout.tsx)_

### Confirmação
- **SAD-20** Sem card do evento e sem sugestão de outro serviço. _(pages/confirmacao.tsx)_
- **SAD-21** Uber: título "Tudo certo com seu crédito Uber", legenda "Agora é só ativar com o código abaixo no app da Uber." (o "Agora é só ativar" deixa claro que ainda falta o resgate) (mantém o termo "crédito" do fluxo e apresenta o código como o jeito de ativar; curta, sem repetir o valor do resumo e sem dizer que o crédito já está na conta), resumo (crédito e valor pago), código de resgate com "Copiar código" (secundário) e "Ativar crédito na Uber" (principal, só no celular — SAD-25). Depois do CTA, o passo a passo do resgate manual no app ("Resgate direto no app da Uber" no celular; "Como resgatar no app da Uber" no desktop): copiar o código; Conta > Carteira; Adicionar saldo > Gift Card; colar e tocar em Adicionar. Os passos têm número preto em círculo cinza (como os da Meep), e um divider de ponta a ponta do card separa o passo a passo do CTA. Sem "Concluir". _(pages/confirmacao.tsx, data/servicos.ts)_
- **SAD-25** "Ativar crédito na Uber" só no celular: o resgate de crédito e cartão presente da Uber é feito no app, e não há ativação pelo navegador. No desktop a confirmação mostra o código com "Copiar código" e o passo a passo do resgate no app (SAD-21); no celular segue o CTA que abre o app, com o passo a passo como alternativa. _(pages/confirmacao.tsx, data/servicos.ts)_
- **SAD-22** "Copiar código" copia o código e mostra "Código copiado!" por 2 s. No mobile o código fica em cima e o botão embaixo. _(pages/confirmacao.tsx)_
- **SAD-23** Depois de ativar pela Uber, o código aparece riscado, o copiar fica desabilitado e a tela informa que o código já foi resgatado. A tela nunca afirma que o crédito já está na carteira Uber antes da ativação. _(pages/confirmacao.tsx)_
- **SAD-24** Serviços sem resgate (Meep) mostram os passos e o "Concluir". _(pages/confirmacao.tsx)_

### Estados
- **SAD-40** Serviço inexistente na URL volta para a lista de serviços. _(pages/oferta.tsx, pages/checkout.tsx, pages/confirmacao.tsx)_

## Depende de / afeta

- **Depende de:** `novos-negocios/utils/use-force-light-theme` (todas as telas ficam em tema claro).
- **Afeta:** nada fora da pasta; as rotas estão em `src/app/App.tsx` (as antigas `/revenda/...` redirecionam para `/novos-negocios/...`).

- **SAD-16** "Crédito Uber" nunca quebra de linha: nos textos as duas palavras ficam unidas por espaço inseparável (`\u00a0`). _(data/servicos.ts)_

## Em aberto

- "Fotos do rolê" e "Seguro de celular" são serviços ilustrativos, sem parceiro definido; pacotes, preços e regras são exemplos.

- Ativação pelo app é simulada; o link de resgate em `data/servicos.ts` é placeholder. Falta definir o comportamento quando o app da Uber não está instalado.
- Resgate pelo código no app da Uber não é detectado pela tela (depende da integração).
- Checkout sem seção de taxas: confirmar se a compra de crédito tem taxa de serviço/processamento.
- A lista `/novos-negocios/servicos-adicionais` ainda usa a capa do Festival Aurora nos cards, o que diverge de SAD-01.
- "Pague só aproximando a pulseira" (Meep): confirmar na integração se o pagamento no evento é por aproximação da pulseira. As condições, o checkout e a confirmação da Meep ainda falam em CPF.
- Direito de imagem das fotos do mosaico e do topo do mobile.
- "Mais escolhido" (SAD-03) é ilustrativo: só pode ir para produção se o dado de vendas confirmar que R$ 100 é o valor mais comprado.
- O mosaico repete as 4 fotos que temos para chegar a 10; faltam 6 fotos novas.
