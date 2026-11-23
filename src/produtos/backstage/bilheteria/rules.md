# Bilheteria online: regras

> **Rotas:** `/backstage/bilheteria`, `/backstage/bilheteria/vender`, `/backstage/bilheteria/ingresso-pdf`; as mesmas telas em `/freepass/bilheteria...` no painel Freepass (BKS-60)
> **No menu:** Backstage › menu do evento › Bilheteria e cortesias › Bilheteria online; Freepass › menu do evento, quando a produtora libera a bilheteria para o comissário
> **Versão em uso:** única, pasta `bilheteria` (a pasta `bilheteria-online` está vazia)
> **Revisado em:** 2026-11-23

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

Venda feita pelo produtor no Backstage, no balcão ou para convidados. O operador identifica o
comprador, monta o carrinho e escolhe entre gerar um link de pagamento ou emitir na hora,
cobrando do produtor só a taxa da bilheteria. A lista acompanha os pedidos emitidos.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Pedidos da bilheteria | `@/plataforma`: os pedidos do canal `bilheteria` do evento em contexto; tipo, emissor, link vencido e reenvios no próprio pedido (`Pedido.bilheteria`), por `data/pedidos-store.ts`. O `localStorage` `bilheteria-pedidos:v2` antigo só completa pedidos gravados antes de 21/11/2026 | sim, no banco |
| Ingressos à venda (sessões, grupos, lote atual, acesso por face do grupo) | `@/plataforma`, catálogo do evento em contexto (`data/plataforma.ts`) | estoque, ao vender |
| Produtos e combos | `@/plataforma`: `Evento.produtos` (nome, foto e preço base da biblioteca da organização, `../itens/data/catalogo.ts` `bibliotecaDe`) e `Evento.combos` (BIL-95, BIL-96) | combo emite os ingressos dele (BIL-96) |
| Compradores | `@/plataforma`: `pedido.comprador` dos pedidos dos eventos da organização (BIL-97) | não |
| Regras do evento (limite por documento, identificação obrigatória) | `@/plataforma`: Regras de compra e acesso do evento (`avancado.limiteBilheteriaOnline`, `limites`, `avancado.acessoFacialId`, `tipoAcesso` dos grupos; BIL-98) | não |
| Validade do link | `data/catalogo.ts` (`EVENTO.validadeLinkDias`, 3 dias) | não |
| Operador (emissor) | membro logado, `../components/membros-store.ts` (`useMembroLogado`, MEM-67) | no pedido (`bilheteria.emissor`) |

A lista mostra só os pedidos do evento em contexto. Os pedidos de exemplo antigos saíram: a lista começa vazia.

## Regras

### Banco
- **BIL-90** O passo Itens lista os ingressos ativos do evento em contexto, no lote atual; sem ingresso à venda, mostra "Nenhum ingresso à venda neste evento" com atalho para Ingressos. _(data/plataforma.ts, pages/VenderIngressos.tsx)_
- **BIL-91** Link de pagamento: grava o pedido aguardando pagamento; o link abre o checkout de verdade (`/checkout/melhorias-de-compra?pedido=<id>`). Pagar lá aprova o pedido e emite os ingressos. _(data/plataforma.ts)_
- **BIL-92** Só a taxa: grava o pedido já pago (método "saldo"), com face R$ 0 e a taxa cobrada da produtora; os ingressos saem na hora. _(data/plataforma.ts)_
- **BIL-93** Cancelar cancela o pedido e os ingressos no banco; o estoque volta. _(data/pedidos-store.ts)_
- **BIL-94** O PDF usa o nome do evento do pedido. _(utils/gerar-ingressos.ts)_
- **BIL-95** Produtos à venda são os do evento em contexto: ativos, com estoque e à venda na bilheteria (sem canal escolhido, vendem em todos), com nome, foto e preço base da biblioteca da organização (o preço do evento, quando houver). Sem foto, a linha mostra um ícone. Sem produto: "Nenhum produto à venda neste evento." Entram no pedido como produto. _(data/plataforma.ts `produtosDoBanco`, components/ItemsStep.tsx)_
- **BIL-96** Combos à venda são os do evento em contexto, ativos, à venda na bilheteria e com limite diferente de zero, num agrupador só, "Combos"; combo com ingresso sem lote à venda fica de fora. Vendido, o combo abre nos itens dele: cada ingresso sai no lote à venda e é emitido, cada produto entra como produto, e o preço do combo é rateado pelo preço avulso de cada item. Sem combo: "Nenhum combo à venda neste evento." _(data/plataforma.ts `combosDoBanco`, `itensDoCombo`)_
- **BIL-97** A busca do comprador procura nos compradores dos pedidos de qualquer evento da organização: e-mail igual (sem diferenciar maiúsculas) ou, com texto sem números de 3 letras ou mais, parte do nome ("N contas com esse nome"). O banco não guarda documento do comprador: busca por documento cai em "Documento não encontrado". _(data/plataforma.ts `buscarCompradores`, components/BuyerStep.tsx)_
- **BIL-98** As regras do evento vêm das Regras de compra e acesso (ITM-66, ITM-67): o limite por documento só existe com "Limite por comprador na Bilheteria online" em "Aplicar limites" e vale o limite por pessoa da categoria Ingresso (sem ele, o geral; sem nenhum, sem limite); a identificação é obrigatória quando o evento usa acesso por face (serviço de acesso por face escolhido, fora "Não usar acesso por face", ou grupo ativo com reconhecimento facial). Ingresso de grupo facial aparece com acesso por face (BIL-33). _(data/plataforma.ts `regrasDoEvento`)_
- **BIL-99** O emissor do pedido é o membro logado no Backstage (MEM-67); até 21/11/2026 era fixo, `operacao@exemplo.com`. _(pages/VenderIngressos.tsx)_
- **BIL-100** A lista de pedidos usa as peças comuns do Backstage (BKS-110): `BarraDaLista`, cartão, cabeçalho de colunas e linhas de `components/tabela.tsx` e a paginação de `components/rodape-de-paginacao.tsx`. O título da coluna dos passos da venda é o cabeçalho de página padrão (`CabecalhoDaPagina`, BKS-100); o "Voltar" do rodapé fica de fora (BKS-105). Até 21/11/2026 a lista tinha tabela, cartões de celular e filtros próprios. _(pages/Pedidos.tsx, ../components/painel-de-passos.tsx)_
- **BIL-101** Textos sem separador e sem repetição (desde 23/11/2026): o ingresso aparece pelo nome dele ("Inteira"), com o grupo no agrupador e na linha de apoio (antes "Pista · Inteira", também no nome acessível); datas no formato do Backstage, "2 out 2026, 23:00" (antes "02 de outubro • 23:00"); comprador com e-mail e documento em linhas separadas; composição do combo "Inteira, Pista, 1º lote". Ingresso sem descrição não mostra a frase padrão que se repetia em toda linha. _(data/plataforma.ts, data/catalogo.ts, data/pedidos-store.ts, components/*)_
- **BIL-102** O catálogo da venda vem pelo catálogo de Itens (`useCatalogo`, sem editá-lo), que respeita `?escala=N`: com a simulação, a faixa "Catálogo simulado…" aparece no fluxo e a ação final fica desativada (nada é gravado). _(data/plataforma.ts, pages/VenderIngressos.tsx)_
- **BIL-103** Escala no passo Itens (UI-LST-001, UI-MOB-004): até 6 datas, chips de data que quebram linha; mais, o ComboBox do DS "Data da sessão", com busca, cada data com quantos horários tem (ou "Esgotado"); os horários quebram linha. Nada rola para o lado (o carrossel saiu). A busca abre os grupos e, quando acha em outros horários, lista "A busca também encontrou em…" com cada horário como atalho que leva até ele (5 por vez). O grupo diz quantos itens tem e "N no carrinho"; com item no carrinho, nasce aberto (voltar do passo 3 reabre), e abre e fecha deslizando a altura. Movimento reduzido: as trocas de aba, data e horário só esmaecem, sem deslizar. Alvos de 44 px no celular (quantidade, abas, grupos). _(components/ItemsStep.tsx, components/QuantityStepper.tsx)_
- **BIL-104** A venda não perde o feito (UI-NAV-006 proposta): a etapa fica na URL (`?passo=comprador|itens|pagamento`), então o voltar do navegador ou do Android volta uma etapa; comprador, carrinho e meio ficam na sessão do navegador, por evento (`bilheteria:venda:v1:<evento>`), e recarregar mantém tudo. Etapa da URL sem o que ela precisa volta até onde dá. "Voltar" da etapa 1 com algo feito pergunta "Descartar a venda?" ("Descartar" / "Continuar vendendo"); fechar a aba ou sair do site pergunta antes (`beforeunload`). Concluir ou descartar limpa. _(pages/VenderIngressos.tsx)_
- **BIL-105** A ação final diz o que acontece: "Gerar link de pagamento" no link, "Emitir ingressos" no só a taxa (até 23/11/2026, "Vender ingresso" nos dois). _(pages/VenderIngressos.tsx, components/PaymentStep.tsx)_
- **BIL-106** Na lista, a linha inteira abre o detalhe; no bloco (cartão estreito), "Cancelar pedido" e "Detalhes" com texto e 44 px, e o e-mail do emissor quebra linha; na tabela, os ícones com dica. _(pages/Pedidos.tsx)_
- **BIL-107** Cartões de métrica e status com as peças comuns de `../components/estado-de-pedido.tsx` (`MetricasDaLista`, `SeloDeStatus`), as mesmas das Cortesias (COR-52, COR-58): "Cancelado" é cinza nas duas. _(pages/Pedidos.tsx, components/PedidoDetailsSlideOut.tsx)_
- **BIL-108** O tipo de acesso aparece em texto na linha do ingresso ("Acesso por QR code", "Acesso por face"), com o ícone neutro ao lado (antes só o ícone, em vermelho de marca e escondido do leitor de tela). _(components/ItemsStep.tsx)_
- **BIL-109** Preço redondo sem centavos ("R$ 80", "R$ 160"); quebrado, com ("R$ 194,95"). DECIDIDO em 22/11/2026. _(data/catalogo.ts `formatBRL`)_
- **BIL-110** A coluna Valor diz o que o número é, numa linha de apoio: "pago pelo comprador" no link, "taxa da produtora" no só a taxa. _(pages/Pedidos.tsx)_

### Lista de pedidos
- **BIL-01** A lista mostra os pedidos de bilheteria do evento em contexto gravados no banco, do mais novo para o mais antigo; a venda feita em outro navegador ou aparelho também aparece. Sem venda, a lista nasce vazia. _(data/pedidos-store.ts)_
- **BIL-02** Cartões de resumo: Pedidos aprovados, Pedidos pendentes, Links expirados, Pedidos cancelados, contados sobre todos os pedidos. Quantos cabem por linha depende da largura que sobra (cada um com 10rem ou mais), não da tela. _(pages/Pedidos.tsx)_
- **BIL-03** Busca por ID do pedido ou destinatário. _(pages/Pedidos.tsx)_
- **BIL-04** Filtros: Status (Todos, Pendente, Aprovado, Expirado, Cancelado) em botões segmentados e Emissor responsável (e-mails presentes na lista) num seletor, à direita da busca (BKS-111). Com a barra abaixo de 30rem, o status vira seletor (os cinco botões não cabem) e tudo empilha. Mudar busca ou filtro volta à página 1. Até 21/11/2026 os filtros eram seletores e, no celular, ficavam atrás do botão "Filtros". _(pages/Pedidos.tsx)_
- **BIL-05** Ordenação por data da venda, decrescente por padrão; o cabeçalho da coluna alterna. _(pages/Pedidos.tsx)_
- **BIL-06** Colunas: Pedido (ID em negrito e o tipo abaixo), Pagamento (status), Emissor responsável, Data da venda, Valor, ações (Cancelar pedido e Detalhes). Com o cartão abaixo de 44rem, cada pedido vira um bloco com o rótulo ao lado de cada valor (BKS-115). Paginação do DS, 10 por página por padrão, a partir de 11 pedidos (BKS-114). _(pages/Pedidos.tsx)_
- **BIL-07** Tipos: "Link de pagamento" e "Só a taxa da bilheteria". _(data/pedidos.ts)_
- **BIL-08** Cores de status: Pendente amarelo, Aprovado verde, Cancelado cinza, Expirado vermelho, pelo mapa de status do Backstage (BIL-107). _(components/estado-de-pedido.tsx)_
- **BIL-09** "Cancelar pedido" fica desabilitado em pedido cancelado. Confirma em modal: "Os itens voltam para o estoque e o comprador perde o acesso. Essa ação não pode ser desfeita." _(pages/Pedidos.tsx, components/CancelPedidosModal.tsx)_

### Detalhe do pedido (painel lateral)
- **BIL-10** Link de pagamento com "Copiar" aparece em pedido com link que não expirou; o QR do link só em pedido pendente. _(components/PedidoDetailsSlideOut.tsx)_
- **BIL-11** Pedido expirado: "O link venceu sem pagamento, 3 dias depois da venda." e botão "Refazer a venda", que abre uma venda nova. _(components/PedidoDetailsSlideOut.tsx)_
- **BIL-12** Pedido cancelado ou expirado não mostra o bloco Ações. _(components/PedidoDetailsSlideOut.tsx)_
- **BIL-13** Pedido "Só a taxa da bilheteria" oferece Baixar PDF, Imprimir na zebra e Baixar .csv. _(components/PedidoDetailsSlideOut.tsx)_
- **BIL-14** Enviar por e-mail ou WhatsApp abre modal para informar o destino; cada envio vai para o Histórico do pedido. Com mais de um envio, avisa que todas as cópias têm o mesmo QR. _(components/PedidoDetailsSlideOut.tsx, data/pedidos-store.ts)_
- **BIL-15** Envio: e-mail precisa ter formato válido; telefone precisa de 10 dígitos ou mais. _(components/EnviarModal.tsx)_

### Venda: painel de passos
- **BIL-80** ~~A venda é um painel com duas colunas. À esquerda, o título "Vender ingressos" e a lista numerada dos passos (Comprador, Itens, Meio de pagamento): o concluído leva ✓, o atual fica destacado e os seguintes, apagados; a coluna acompanha a rolagem. À direita, o conteúdo do passo e o rodapé com as ações: "Voltar" e a ação principal do passo ("Avançar"; no passo 3, "Vender ingresso"); no passo 1, "Pular identificação" fica à esquerda do rodapé. No celular, a coluna vira um cabeçalho com "Passo X de 3: <nome>" e os botões ocupam a largura toda. Até 20/11/2026 os passos ficavam numa barra horizontal acima do conteúdo, com as ações dentro de cada passo.~~ Substituída por BIL-81 em 23/11/2026.
- **BIL-81** Fluxo em etapas do Backstage (`../components/painel-de-passos.tsx`, o mesmo da emissão de cortesia, COR-50; desde 23/11/2026, antes `bilheteria/components/painel-de-passos.tsx`). À esquerda, o título "Vender ingressos" (Display xs, sem a reserva de 160 px do sino e do Guia, que na coluna de 280 px quebrava o título letra a letra) e as etapas Comprador, Itens e Meio de pagamento (a concluída com ✓, a atual destacada, as seguintes apagadas); a coluna acompanha a rolagem. À direita, a linha do título com o nome da etapa (h2), que reserva o canto do sino e do Guia (BKS-92), o conteúdo e o rodapé com "Voltar" e a ação da etapa ("Avançar"; na última, BIL-105); na etapa 1, "Pular identificação" à esquerda. No celular: "Etapa X de 3: <nome>" e, nas três etapas, uma barra fixa no pé (`data-barra-fixa`, o Guia sai do caminho, GDC-71) com o resumo da etapa e os botões de 44 px dividindo a largura. _(../components/painel-de-passos.tsx, pages/VenderIngressos.tsx)_

### Venda: passo 1, Comprador
- **BIL-20** Busca por e-mail, nome ou documento (BIL-97), com resultado em 1,2 s. "Buscar" fica desabilitado com o campo vazio. _(pages/VenderIngressos.tsx, components/BuyerStep.tsx)_
- **BIL-21** Texto com "@" e formato inválido: "E-mail inválido, confira se o e-mail está digitado corretamente." _(components/BuyerStep.tsx)_
- **BIL-22** Uma conta: "Conta encontrada". E-mail usado por mais de uma conta: "N contas usam esse e-mail" e o operador escolhe uma. _(components/BuyerStep.tsx, data/catalogo.ts)_
- **BIL-23** E-mail sem conta: segue a venda como "Comprador ainda sem conta"; os ingressos vão para esse e-mail. _(components/BuyerStep.tsx, components/PaymentStep.tsx)_
- **BIL-24** Documento sem conta: "Documento não encontrado" e orientação para buscar por e-mail ou pular a identificação. Não avança. _(components/BuyerStep.tsx, pages/VenderIngressos.tsx)_
- **BIL-25** "Pular identificação" pede confirmação: sem link de pagamento e sem acesso por face; o limite por documento deixa de valer. Fica desabilitado se o evento exige identificação. _(components/BuyerStep.tsx, components/SkipIdentificationModal.tsx)_
- **BIL-26** Avança com conta escolhida, com e-mail sem conta ou com identificação pulada. _(pages/VenderIngressos.tsx)_

### Venda: passo 2, Itens
- **BIL-30** Abas Ingressos, Produtos e Combos, com busca por grupo ou item. _(components/ItemsStep.tsx)_
- **BIL-31** Data ou sessão esgotada aparece como "Esgotado" e não é selecionável. _(components/ItemsStep.tsx)_
- **BIL-32** Limite de ingressos por documento do evento (BIL-98; até 21/11/2026, fixo em 4), só com comprador identificado. Ao atingir, o "+" trava. Produto e combo não contam. _(pages/VenderIngressos.tsx, data/catalogo.ts)_
- **BIL-33** Venda sem identificação bloqueia ingresso com acesso por face: selo "Bloqueado" e "Acesso por face: indisponível sem identificação do comprador." _(components/ItemsStep.tsx)_
- **BIL-34** Avança com ao menos um item no carrinho. No desktop, o resumo do carrinho fica na coluna dos passos, abaixo da lista (BIL-81), com o total e "Mais as taxas do meio de pagamento, escolhido no próximo passo." (o "ⓘ" sem explicação saiu em 23/11/2026). No celular, a barra fixa leva "Resumo, N itens: R$ X mais taxas", que abre o carrinho deslizando a altura, e o "Avançar". A lixeira de cada linha é o `ButtonUtility` do DS, com o nome na dica e 44 px no celular. _(pages/VenderIngressos.tsx, components/ResumoPanel.tsx)_

### Venda: passo 3, Meio de pagamento
- **BIL-40** Ao entrar, "Link de pagamento" já vem marcado; sem identificação, vem "Cobrar só a taxa da bilheteria do produtor" e o link fica desabilitado. _(pages/VenderIngressos.tsx, components/PaymentStep.tsx)_
- **BIL-41** Link: o comprador paga subtotal + a taxa de serviço do evento (`Evento.taxaServico`, a mesma que a venda grava; até 23/11/2026, 10% fixo na tela); aviso "O pedido será criado antes do pagamento". Os dois meios são o grupo de rádio com ícone do DS (`radio-groups`, IconSimple), com o cartão inteiro como alvo. _(components/PaymentStep.tsx)_
- **BIL-42** Taxa da bilheteria: "O comprador não paga nada e os ingressos saem emitidos na hora. A produtora paga R$ X de taxa da bilheteria no fechamento.", com X = itens × taxa de serviço do evento, o mesmo que a venda grava (BIL-92); sem taxa no evento, a frase sai sem o valor. "Como isso aparece no fechamento?" abre e fecha deslizando a altura. _(components/PaymentStep.tsx)_
- **BIL-43** A ação final (BIL-105) mostra "Processando compra" por 2,2 s e cria o pedido. Link nasce Pendente; taxa da bilheteria nasce Aprovado. _(pages/VenderIngressos.tsx, data/pedidos-store.ts)_
- **BIL-44** Valor gravado no pedido: subtotal + 10%, nos dois tipos. _(data/pedidos-store.ts)_

### Venda concluída
- **BIL-50** Título pelo que aconteceu: "Link de pagamento criado" no link, "Ingressos emitidos" no só a taxa (até 23/11/2026, "Pedido emitido!" nos dois), com o ID; "Ver pedidos" (antes "Gerir pedidos") e "Enviar por WhatsApp". Link: QR, link com "Copiar", envio por WhatsApp ou e-mail e "O link vale por 3 dias. Enquanto não for pago, os ingressos seguem reservados para este pedido." _(components/OrderSuccess.tsx)_
- **BIL-51** Taxa da bilheteria: download em PDF (uma página A4 por unidade), Zebra ou planilha .csv (uma linha por unidade). _(components/OrderSuccess.tsx, utils/gerar-ingressos.ts)_
- **BIL-52** Zebra mostra "Impressão Zebra ainda não está disponível neste protótipo". _(pages/VenderIngressos.tsx, pages/Pedidos.tsx)_
- **BIL-53** Voltar só existe durante o fluxo, no rodapé do painel (BIL-80); no passo 1 volta para a lista. _(pages/VenderIngressos.tsx)_

### Estados
- **BIL-60** Sem pedidos: o vazio do DS (BKS-117, título h2) "Venda ingressos no balcão", com o apoio "Identifique o comprador, escolha os itens e gere um link de pagamento ou emita os ingressos na hora. Os pedidos aparecem aqui." e "Vender ingressos". Sem ingresso à venda (ou com `?sem-itens=1`): "Você ainda não tem ingressos à venda", "Crie um ingresso e deixe pelo menos um ativo para vender no balcão." e "Criar ingresso", que leva ao catálogo. Até 23/11/2026: "Venda ingressos online…" com um apoio sobre convites, e "Configure algum item antes de vender." com "Comece a vender". _(pages/Pedidos.tsx)_
- **BIL-61** Busca ou filtro sem resultado: "Nenhum pedido encontrado para os filtros." dentro do cartão, com "Limpar busca", que limpa a busca e volta status e emissor para Todos (BKS-118). _(pages/Pedidos.tsx)_
- **BIL-62** Busca de itens sem resultado: "Nenhum item encontrado para a busca.", ou indica em qual aba há resultado. _(components/ItemsStep.tsx)_
- **BIL-63** Expirado e cancelado não acontecem pela venda. Para testar: vender para `expirado@mail.com` cria pedido expirado; em dev, `window.bilheteria.expirar()` e `reabrir()` marcam no banco. _(data/pedidos-store.ts)_

### Pré-visualização do PDF
- **BIL-70** `/backstage/bilheteria/ingresso-pdf` mostra uma moldura de visualizador de PDF com dados de placeholder: o nome do arquivo (h1), zoom de 50% a 200%, "Imprimir ou salvar em PDF" (impressão do navegador, sem a moldura) e "Fechar". A aba do navegador se chama "Ingresso em PDF, pedido …". No celular a folha rola até a borda esquerda, sem cortar. Baixar, o menu e o recarregar, que não faziam nada, saíram em 23/11/2026. Decisão: é referência do modelo de impressão, só pela URL, sem link em nenhuma tela; o PDF de verdade sai pelo BIL-51. _(pages/IngressoPdf.tsx)_

## Depende de / afeta

- **Depende de:** catálogo de ingressos, produtos e combos do evento; contas de usuário; configuração de limite por documento e de identificação obrigatória.
- **Afeta:** carteira do comprador (ingressos emitidos), estoque, checkout (link de pagamento), relatórios de vendas e borderô (taxa da bilheteria).

## Em aberto

- "Expirado" é uma marca no pedido (`bilheteria.expirado`): o banco não expira link sozinho nem devolve o estoque do link vencido.
- O estoque de produto do evento não baixa com a venda, e o limite próprio do combo não conta os combos já vendidos.
- Limites por pessoa de Inteira, Meia-entrada e Combo não valem na bilheteria; só o da categoria Ingresso (BIL-98).
- Itens trancados por Passkey (CHA) aparecem para o operador como os outros.
- Comprador sem conta (e-mail não encontrado): o passo 1 diz que itens com acesso por face não poderão ser vendidos, mas o bloqueio só existe ao pular a identificação. _(components/BuyerStep.tsx, components/ItemsStep.tsx)_
- `contaPendente` é gravado no pedido mas não aparece em nenhuma tela.
- Venda sem identificação emite os ingressos para `bilheteria@exemplo.com`.
- Combo emite ingressos mas não conta para o limite por documento.
- A busca por documento nunca acha: o banco não guarda documento do comprador (BIL-97).
- O envio pela tela de sucesso só mostra toast; não fica no Histórico do pedido, diferente do envio pelo painel.
- Busca na lista diz "pedido ou e-mail do comprador", mas todos os pedidos de exemplo têm o mesmo destinatário.
- O topo da lista não é `CabecalhoDaPagina` (BKS-100): no Backstage o título visível é o "Bilheteria e cortesias" das abas de Emissão (`components/navegacao-de-secao.tsx`, compartilhado com Cortesias) e o da aba fica só para leitor de tela; no Freepass, `TituloDaEmissao` vira o h1, com "Vender ingressos" ao lado. Mudar isso é no componente das abas, para as duas telas juntas. _(pages/Pedidos.tsx)_
- O modal de cancelamento aceita vários pedidos, mas a lista não tem seleção múltipla.

- BIL-44 diz "subtotal + 10%, nos dois tipos", mas o código grava outra coisa: no link, subtotal + a taxa; no só a taxa, o total do pedido do banco (só as taxas, com face 0) na lista e 0 no pedido criado pela tela (`data/pedidos-store.ts`). Falta decidir o que o pedido do só a taxa guarda e alinhar BIL-44.
- A taxa de serviço do evento (`Evento.taxaServico`) nasce em 10% na criação do evento e não tem tela para mudar nem fonte do Financeiro; a "taxa da bilheteria" que a produtora paga no só a taxa é essa mesma taxa (BIL-42, BIL-92). Confirmar com o Financeiro.
- O Guia de configuração abre sozinho por cima da venda no desktop (GDC); decidir com a área do Guia se recolhe em telas de operação.
- A busca do comprador (1,2 s) e o "Processando compra" (2,2 s) ainda simulam espera; no balcão pesa na fila.
- Datas com muitos horários no mesmo dia: os horários quebram linha, sem busca própria; com dezenas no mesmo dia, falta um campo como o das datas.

## Fontes

Nenhum link de Figma, Confluence ou Jira no código desta pasta.
