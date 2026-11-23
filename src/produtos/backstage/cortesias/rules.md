# Cortesias: regras

> **Rotas:** `/backstage/cortesias` (relatório), `/backstage/itens` (passo 1), `/backstage/destinatarios` (passo 2), `/backstage/verificacao` (passo 3); as mesmas telas em `/freepass/...` no painel Freepass
> **No menu:** Backstage › menu do evento › Bilheteria e cortesias › Cortesia; Freepass › menu do evento › Emissão de ingressos › Cortesia (quando liberado)
> **Versão em uso:** única, pasta `cortesias`
> **Revisado em:** 2026-11-23

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

O produtor emite itens sem custo (ingressos, produtos, combos) para uma lista de e-mails e
acompanha o que foi enviado: por pedido e destinatário, ou item a item, com cancelamento e
reenvio.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Pedidos e itens emitidos | `@/plataforma`: um pedido por destinatário no canal `cortesia`, agrupados pelo envio (`pedido.envio`) | sim, no banco |
| Catálogo de itens (sessões, grupos, ingressos, produtos, combos) | `@/plataforma`, catálogo do evento em contexto (`data/plataforma.ts`); nome e foto dos produtos na biblioteca da organização | estoque dos ingressos, ao emitir |
| Tipos e status de item | `data/item-types.ts` | não |
| Emissor | Backstage: o membro logado (`useMembroLogado`, MEM-67), gravado no envio; Freepass: a pessoa do Freepass | sim, no pedido (`envio.emissor`) |
| Rascunho da emissão (itens e e-mails) | `sessionStorage`, chave `cortesias:rascunho-da-emissao:v1:<painel>`, com o evento (COR-53) | só na aba do navegador |
| Grupos parceiros e cotas | `data/parceiros.ts` (usado só por `pages/GruposParceiros.tsx`, sem rota) | só em memória |

A tela mostra só as cortesias do evento em contexto.

## Regras

### Banco
- **COR-90** Enviar grava um pedido por destinatário, sem cobrança (método "cortesia"), e emite os ingressos no lote atual, na carteira do e-mail. Produtos e combos entram no mesmo pedido (COR-97). _(src/plataforma/acoes.ts, `emitirCortesias`)_
- **COR-91** Item Aceito = destinatário com conta (usuário no banco); Pendente de cadastro = sem conta. Cancelado = ingresso cancelado. O envio fica Cancelado quando todos os pedidos dele estão cancelados ou todos os itens dele foram cancelados (desde 22/11/2026; antes só pelos pedidos, e cancelar pela tela nunca mudava o envio). _(data/cortesias-store.tsx)_
- **COR-92** Cancelar o pedido cancela os pedidos de todos os destinatários do envio; cancelar um item cancela só aquele ingresso (ou aquela linha de produto ou combo, COR-98). Renomear muda o envio em todos. _(data/cortesias-store.tsx)_

### Freepass
- **COR-93** No Freepass, o relatório mostra só as cortesias que a pessoa emitiu, e o emissor do envio é ela. _(data/cortesias-store.tsx)_
- **COR-94** No Freepass, a verificação mostra quantas cortesias o envio usa da cota da pessoa no evento; passou da cota, "Enviar cortesias" fica desativado, com o aviso de tirar destinatários ou itens, ou pedir mais ao organizador. Sem cota, não há limite. _(pages/VerificacaoFinal.tsx)_
- **COR-95** O envio feito pelo Freepass conta nas vendas do comissário como cortesia, sem comissão (FCO-72). O uso do canal Cortesia do grupo soma pelo id do item no catálogo (tipo de ingresso, produto ou combo), o mesmo que o canal guarda (desde 21/11/2026; antes ia o id da tela e nunca somava). _(pages/VerificacaoFinal.tsx, @/plataforma/comissarios)_
- **COR-96** O passo 1 lista, além dos ingressos, os produtos do evento ativos e com estoque (nome e foto da biblioteca da organização; sem foto, uma imagem estável pelo id) e os combos ativos com itens (nome, quantidade de itens e cada item com setor e data). Tudo vem do banco, do evento em contexto, e as seções nascem abertas. _(data/plataforma.ts, pages/SelecaoItens.tsx)_
- **COR-97** Na emissão, cada produto vira uma linha do pedido (`produtoId`, sem custo); cada combo vira uma linha do combo (`comboId`, com os itens no detalhe) mais os ingressos dele, emitidos no lote atual e marcados com o combo (`comboId`). Produto não emite ingresso. _(src/plataforma/acoes.ts, `emitirCortesias`)_
- **COR-98** No relatório, produto e combo aparecem como uma linha por destinatário (o ingresso que veio no combo não aparece sozinho), com o mesmo status do ingresso (Aceito, Pendente de cadastro, Cancelado). Cancelar a linha do combo cancela também os ingressos dele; a do produto só marca a linha. _(data/cortesias-store.tsx, src/plataforma/acoes.ts, `cancelarItemDeCortesia`)_
- **COR-99** No Backstage, o emissor de um envio novo é o membro logado (o primeiro administrador da organização, MEM-67, pelo nome do e-mail); sem membro carregado, "Backstage". Envios antigos mantêm o emissor gravado. _(data/cortesias-store.tsx)_

### Relatório (`/backstage/cortesias`)
- **COR-01** Sem pedidos: título "Cortesias" (sem botão no topo) e, embaixo, o estado vazio do DS (BKS-117; o título dele vale como nível 2, `components/tabela.tsx`) com "Distribua itens para convidados especiais", o texto de apoio e o botão "Emitir cortesias". Até 21/11/2026 era uma composição própria, com cartões decorativos. _(pages/RelatorioPedidos.tsx)_
- **COR-02** Com pedidos: título "Cortesias", botão "Emitir cortesia" e abas Pedidos e Itens. _(pages/RelatorioPedidos.tsx)_
- **COR-03** ~~Aba Pedidos: uma linha por destinatário de cada pedido (pedido + e-mail), com métricas "Pedidos emitidos" e "Pedidos cancelados".~~ Substituída por COR-58 em 22/11/2026 (as métricas contam destinatários).
- **COR-04** Aba Pedidos: busca por ID ou nome do pedido, e-mail ou documento, à esquerda; à direita, Status em botões segmentados (Todos, Emitidos, Parciais, Cancelados; um por vez; Parciais só aparece quando há destinatário assim), Emissor responsável (seleção múltipla, "Todos os emissores") e "Exportar em CSV" (BKS-111, COR-56). Até 21/11/2026 o status era seleção múltipla. _(pages/RelatorioPedidos.tsx)_
- **COR-05** O nome do pedido é editável na própria linha, no campo do DS (`InputBase`; até 22/11/2026 um `<input>` próprio); Enter salva, Esc descarta, nome vazio não é salvo. _(pages/RelatorioPedidos.tsx, data/cortesias-store.tsx)_
- **COR-06** Cancelar destinatário cancela todos os itens dele naquele pedido, com confirmação: "Os QR codes serão invalidados e essa ação não pode ser desfeita." Depois, a linha mostra o novo status (COR-51) e o Cancelar fica desativado. Aberto pela linha, o detalhe mostra o status do destinatário e o botão "Cancelar destinatário" (antes "Cancelar pedido completo", que já cancelava só os itens dele). _(pages/RelatorioPedidos.tsx, components/PedidoDetailsSlideOut.tsx)_
- **COR-07** Seleção múltipla com "Limpar seleção" e "Cancelar destinatários selecionados"; linhas canceladas não são selecionáveis. Com a página toda marcada, "Selecionar todos os N do filtro" (COR-57). "Selecionar todos da página" fica no cabeçalho das colunas e, no cartão estreito (sem cabeçalho), na barra de seleção. _(pages/RelatorioPedidos.tsx)_
- **COR-08** ~~Aba Itens: uma linha por item emitido, com métricas Itens totais, Itens com cadastro pendente, Itens cancelados e Itens validados.~~ Substituída por COR-59 em 22/11/2026 ("Itens validados" contava quem tem cadastro).
- **COR-09** Aba Itens: busca por ID, nome do item, e-mail ou documento; Status em botões segmentados (Todos, Aceitos, Pendentes, Cancelados; Processando e Com erro só aparecem quando há item assim, para os botões caberem em 390 px), Tipo do item (Ingresso, Combo, Produto) e Emissor em seleção múltipla. _(pages/RelatorioPedidos.tsx, data/item-types.ts)_
- **COR-10** Status de item: Aceito, Cancelado, Pendente de cadastro, Processando, Erro, com as cores do mapa de status do Backstage (COR-52). Item transferido mostra "(transferido)" em texto ao lado do e-mail (até 22/11/2026, só um ícone com dica). _(data/item-types.ts, pages/RelatorioPedidos.tsx)_
- **COR-11** Item cancelado ou com erro não é selecionável; "Cancelar" e "Reenviar" ficam desabilitados em item cancelado (Reenviar também no item com erro), na tabela e no detalhe. _(pages/RelatorioPedidos.tsx, components/ItemDetailsSlideOut.tsx)_
- **COR-12** "Reenviar" só mostra o toast "Cortesia reenviada" (não envia nada no protótipo). _(pages/RelatorioPedidos.tsx)_
- **COR-13** Detalhe do item com erro mostra a mensagem de erro no lugar das ações. _(components/ItemDetailsSlideOut.tsx)_
- **COR-14** ~~Paginação com 100 linhas por página por padrão nas duas abas.~~ Desde 21/11/2026, a paginação do Backstage (BKS-114): 10 por página, aparece com mais de 10 linhas, e busca, filtro ou tamanho novo voltam à página 1. Vale também para os itens do detalhe do pedido. _(pages/RelatorioPedidos.tsx, components/PedidoDetailsSlideOut.tsx)_

- **COR-100** As duas abas e os itens do detalhe do pedido seguem as listas do Backstage (BKS-110 a BKS-118): cartão, cabeçalho das colunas e linhas de `components/tabela.tsx`. Com o cartão a partir de 704 px é tabela; mais estreito, cada linha vira um bloco com o rótulo ao lado de cada valor, sem rolagem lateral (UI-MOB-005). Colunas de Pedidos: Destinatário (e-mail e documento), Pedido (nome editável e ID), Itens, Status, Envio (data e emissor) e ações; de Itens: Item, Status, Destinatário, Emissor e ações; no detalhe: Item, Status e Destinatário. No bloco, as ações ficam embaixo e o lápis do nome fica sempre visível (no toque não há hover). _(pages/RelatorioPedidos.tsx, components/PedidoDetailsSlideOut.tsx)_
- **COR-101** Busca ou filtro sem resultado: "Nenhum destinatário encontrado." ou "Nenhum item encontrado." dentro do cartão, com "Limpar busca", que zera a busca e todos os filtros da aba (BKS-118). _(pages/RelatorioPedidos.tsx, components/PedidoDetailsSlideOut.tsx)_

- **COR-51** Status da linha de Pedidos (desde 22/11/2026): sai dos itens daquele destinatário, não do envio inteiro. Todos cancelados, "Cancelado"; alguns, "Parcial: N de M cancelados"; nenhum, "Emitido". O detalhe aberto pela linha usa o mesmo status. _(data/item-types.ts `statusDoDestinatario`, pages/RelatorioPedidos.tsx, components/PedidoDetailsSlideOut.tsx)_
- **COR-52** Status com o selo e o mapa de status do Backstage (`components/estado-de-pedido.tsx`): `BadgeWithDot` pill md (texto de 14 px, nunca 12 px); verde Aceito e Emitido, amarelo Pendente de cadastro e Parcial, cinza Cancelado (igual à Bilheteria; até 22/11/2026 era vermelho aqui), vermelho Erro, azul Processando. Vale na tabela e nos detalhes. _(data/item-types.ts, pages/RelatorioPedidos.tsx, components/*SlideOut.tsx)_
- **COR-56** "Exportar em CSV" (desde 22/11/2026; antes só escrevia no console) baixa um arquivo com as linhas do filtro atual (busca, status, tipo e emissor), todas as páginas: `cortesias-pedidos-AAAA-MM-DD.csv` (Destinatário, Documento, Pedido, ID do pedido, Itens, Status, Data de envio, Emissor responsável) ou `cortesias-itens-AAAA-MM-DD.csv` (ID do item, Item, Detalhe, Tipo, Status, Destinatário, Documento, Emissor responsável, ID do pedido). Separador ";" com BOM, para o Excel em português. Sem linha no filtro, o botão fica desativado. _(utils/baixar-csv.ts, pages/RelatorioPedidos.tsx)_
- **COR-57** Seleção em lote além da página: com todas as linhas selecionáveis da página marcadas e mais no filtro, a barra de seleção oferece "Selecionar todos os N do filtro"; marcado, diz "Todos os N … do filtro selecionados". Vale nas abas Pedidos e Itens. _(pages/RelatorioPedidos.tsx)_
- **COR-58** Métricas da aba Pedidos contam destinatários, a unidade das linhas: "Destinatários com cortesia" (não cancelados), "Cancelados em parte" (só quando há) e "Destinatários cancelados". Cartões de `MetricasDaLista` (`components/estado-de-pedido.tsx`), o desenho da Bilheteria. _(pages/RelatorioPedidos.tsx)_
- **COR-59** Métricas da aba Itens: Itens emitidos, Itens com cadastro (Aceito), Itens com cadastro pendente e Itens cancelados; os três últimos somam o primeiro. "Itens validados" saiu: contava os aceitos, e validar é passar na portaria. _(pages/RelatorioPedidos.tsx)_
- **COR-60** O cabeçalho "Emissor" da aba Itens não tem mais o "?" (era um ícone sem explicação nem ação). _(pages/RelatorioPedidos.tsx)_
- **COR-61** A linha inteira abre o detalhe (do destinatário ou do item), com caixa, nome editável e ações por cima. No bloco (cartão estreito), as ações têm texto (Cancelar, Reenviar, Detalhes) e 44 px de altura, a caixa de marcar tem área de toque de 44 px e o e-mail quebra linha em vez de cortar; na tabela, seguem os ícones com dica. _(pages/RelatorioPedidos.tsx)_

### Emissão: fluxo em etapas
- **COR-50** Os três passos usam o fluxo em etapas do Backstage (`components/painel-de-passos.tsx`, o mesmo da venda, BIL-80), desde 22/11/2026: à esquerda, o título "Emitir cortesia" e as etapas Itens, Destinatários e Verificação final (a concluída com ✓); à direita, o nome da etapa na linha do título, o conteúdo e o rodapé com "Voltar" e a ação ("Avançar"; na verificação, "Enviar cortesias"). No celular, "Etapa X de 3: <nome>" e uma barra fixa no pé com o resumo da etapa e as ações. Até 22/11/2026, `Progress` do DS no topo (o vertical inteiro no celular) e "Avançar" abaixo do título. _(pages/SelecaoItens.tsx, pages/EmissaoCortesias.tsx, pages/VerificacaoFinal.tsx)_
- **COR-53** O que foi feito não se perde: itens e e-mails ficam num rascunho na sessão do navegador, por painel e evento (até 22/11/2026, só na navegação, e recarregar ou voltar da verificação perdia). Recarregar, voltar e avançar de novo mantêm tudo; fechar ou sair do site com algo preenchido pergunta antes (`beforeunload`). "Voltar" do passo 1 com algo escolhido pergunta "Descartar a emissão?" ("Descartar" / "Continuar emitindo"). Enviar ou descartar limpa o rascunho; "Emitir cortesia" com rascunho no evento retoma de onde parou. _(data/rascunho-da-emissao.ts)_
- **COR-54** O catálogo vem pelo catálogo de Itens (`useCatalogo`), que respeita `?escala=N`: com a simulação, a faixa "Catálogo simulado…" aparece no passo 1 e a verificação deixa conferir, mas "Enviar cortesias" fica desativado ("as cortesias não são enviadas"). _(data/plataforma.ts, pages/SelecaoItens.tsx, pages/VerificacaoFinal.tsx)_

### Emissão, passo 1: Itens (`/backstage/itens`)
- **COR-20** ~~Lista de sessões com grupos e ingressos, abertas por padrão; busca por nome de grupo, item ou data da sessão.~~ Substituída por COR-55 em 22/11/2026.
- **COR-25** Cada item é o `Checkbox` do DS com `label` (nome) e `hint` (lote; no combo, quantos itens e a composição); a linha inteira marca e desmarca, com o fundo de hover na linha e 44 px no celular. No limite (COR-21), as outras ficam desativadas. Até 22/11/2026 a caixa ficava dentro de outro `<label>` e o clique ou toque marcava e desmarcava na mesma hora: só o teclado marcava. _(pages/SelecaoItens.tsx)_
- **COR-55** Escala (UI-LST-001): sessões, grupos, Combos e Produtos nascem fechados, cada um com o total ("8 grupos", "40 ingressos") e quantos estão escolhidos; abrem e fecham deslizando a altura (`Surgir`; com movimento reduzido, só esmaece) e, fechados, não desenham o conteúdo. "Mostrar mais" a cada 20 sessões, 30 grupos e 50 ingressos. A busca (por grupo, item, lote ou data, sem acento) filtra e abre os grupos achados quando sobram até 3 sessões. `ArvoreDeIngressos` (`components/seletor-de-ingressos.tsx`) não foi usada: ela marca o setor inteiro e escolhe tipos de ingresso, e a cortesia escolhe até 10 itens por sessão (COR-21). _(pages/SelecaoItens.tsx)_
- **COR-21** Máximo de 10 itens selecionados; ao atingir, os demais ficam desabilitados. No desktop, o painel dos escolhidos fica na coluna das etapas, com "N de 10 cortesias selecionadas" e "Remover"; no celular, a contagem e "Remover todos" ficam na barra fixa do pé, junto do "Avançar" (até 22/11/2026, abaixo de 1024 px a contagem sumia). _(data/cortesia-items.ts, pages/SelecaoItens.tsx, components/CortesiaSelectionPanel.tsx)_
- **COR-22** Seções Combos e Produtos só aparecem quando há itens; vêm do catálogo do evento (COR-96). _(pages/SelecaoItens.tsx, data/plataforma.ts)_
- **COR-23** "Avançar" exige ao menos um item. Busca sem resultado: "Nenhum item corresponde à busca." _(pages/SelecaoItens.tsx)_
- **COR-24** Voltar do passo 1 leva ao relatório de cortesias (com algo escolhido, pergunta antes, COR-53). _(pages/SelecaoItens.tsx)_

### Emissão, passo 2: Destinatários (`/backstage/destinatarios`)
- **COR-30** E-mails digitados ou colados, separados por espaço, vírgula, ponto e vírgula ou Enter. _(components/EmailListManager.tsx)_
- **COR-31** Limite de 100 e-mails; o contador mostra "N de 100 e-mails adicionados" e "limite atingido". _(components/EmailListManager.tsx)_
- **COR-32** E-mail com formato inválido fica marcado e bloqueia o avanço. _(components/EmailListManager.tsx)_
- **COR-33** Duplicados são aceitos e marcados; só quando há repetido aparece "E-mails repetidos recebem cortesias para cada vez que aparecem na lista." (até 22/11/2026, sempre). _(components/EmailListManager.tsx)_
- **COR-34** Importar planilha (.csv, .xlsx, .txt, também arrastando): exige coluna "email" com ao menos um contato; não pode passar de 100 nem do espaço restante na lista. Cada caso tem mensagem própria. _(components/EmailListManager.tsx, components/ImportEmailsModal.tsx)_
- **COR-35** "Excluir e-mails" pede confirmação na própria linha: "Excluir todos os e-mails?", "Cancelar" / "Sim, excluir" (um nome só; a regra dizia "Limpar todos"). _(components/EmailListManager.tsx)_
- **COR-36** "Avançar" exige ao menos um e-mail e nenhum inválido. _(components/EmailListManager.tsx, pages/EmissaoCortesias.tsx)_

### Emissão, passo 3: Verificação final (`/backstage/verificacao`)
- **COR-40** Mostra os itens por tipo, a quantidade por destinatário e a lista de e-mails únicos, sem cadastro primeiro. _(pages/VerificacaoFinal.tsx)_
- **COR-41** Filtro de cadastro (Todos, Apenas cadastrados, Apenas sem cadastro) e busca por e-mail; 10 por página. O e-mail aparece inteiro, quebrando linha (até 22/11/2026, cortado); editar e remover têm 44 px no celular. _(pages/VerificacaoFinal.tsx)_
- **COR-42** Remover e-mail pede confirmação e tira todas as ocorrências dele. _(pages/VerificacaoFinal.tsx)_
- **COR-43** Editar e-mail só existe para quem não tem cadastro; salvar exige texto não vazio e junta duplicados. _(pages/VerificacaoFinal.tsx, components/EmailModals.tsx)_
- **COR-44** "Enviar" abre "Confirmar envio de cortesias" com "Nome do pedido" (padrão "Envio de cortesia"; vazio volta ao padrão) e a opção "Enviar QR Code por e-mail". _(components/EmailModals.tsx)_
- **COR-45** Confirmar cria o pedido, mostra "Pedido enviado", limpa o rascunho (COR-53) e volta para o relatório. _(pages/VerificacaoFinal.tsx)_
- **COR-46** Cada e-mail recebe um item por item selecionado, contando cada ocorrência repetida. _(data/cortesias-store.tsx)_
- **COR-47** ~~Aberta sem dados de navegação, a tela usa 24 e-mails e itens de exemplo.~~ Substituída em 22/11/2026 (COR-53): sem itens no rascunho, a verificação e os destinatários voltam ao passo 1; sem e-mails, a verificação volta aos destinatários.

## Depende de / afeta

- **Depende de:** catálogo de ingressos, produtos e combos do evento; cadastro de usuários (com ou sem conta).
- **Afeta:** carteira dos destinatários (ingressos emitidos), estoque, relatórios de acesso e de vendas.

## Em aberto

- Status Processando e Erro não acontecem mais (a emissão é imediata no banco). Documento aparece sempre "—": o modelo não guarda documento.
- "Tem cadastro" é calculado por duas funções diferentes: na verificação ~60% têm cadastro; no relatório ~30%. O mesmo e-mail pode aparecer com e sem cadastro. _(pages/VerificacaoFinal.tsx, data/cortesias-store.tsx)_
- A aba Pedidos agrupa por pedido + e-mail, então duplicados viram uma linha só, embora tenham recebido itens repetidos.
- "Enviar QR Code por e-mail" não é gravado nem muda nada.
- Editar e-mail não valida formato.
- Importar aceita .xlsx, mas o arquivo é lido como texto.
- `pages/GruposParceiros.tsx` (grupos parceiros e cotas) não tem rota: está órfã.
- Produto e combo de cortesia não baixam estoque: o estoque do produto no evento é fixo (produtos ainda não têm venda, `itens/rules.md`) e o limite próprio do combo não conta as cortesias. Só os ingressos (inclusive os do combo) entram no estoque.
- O detalhe do item diz "Cancelado por" com o emissor do envio: quem cancelou não é gravado.
- No Freepass, o emissor continua sendo a pessoa fixa do Freepass (`freepass/data/usuario`), não um membro.
- Freepass: cancelar uma cortesia no relatório não devolve a cota nem tira a cortesia das vendas do comissário.
- O título do relatório vem de `TituloDaEmissao` (BKS-25, `components/navegacao-de-secao.tsx`, fora desta pasta), não de `CabecalhoDaPagina` (BKS-100): sob as abas o h1 é "Bilheteria e cortesias"; no Freepass é um h1 próprio. Decidir junto com a Bilheteria online.
- A verificação (passo 3, COR-41) ainda usa a paginação do DS direto, com lista própria, fora das peças de `components/tabela.tsx`.
- Limite de 100 e-mails por envio (COR-31, COR-34) e 10 itens (COR-21): com centenas de convidados é preciso quebrar a planilha. Confirmar se o limite vem de produção antes de importar em lotes.
- A aba Pedidos agrupa por pedido + e-mail; o envio cancelado em parte por item (aba Itens) aparece como "Parcial" na linha do destinatário, mas o envio só fica Cancelado com todos os itens cancelados.
- O rascunho da emissão (COR-53) só vive na aba do navegador: fechar a aba perde, depois de perguntar.
- O grupo recolhível do passo 1 é composto aqui com o desenho do Accordion do DS: o Accordion não deixa a tela abrir um item (a busca precisa abrir os grupos achados).

## Fontes

Nenhum link de Figma, Confluence ou Jira no código desta pasta.
