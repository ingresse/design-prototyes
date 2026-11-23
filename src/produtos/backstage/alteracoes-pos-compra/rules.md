# Pedidos (alterações pós-compra): regras

> **Rotas:** `/backstage/pedidos`, `/backstage/pedidos/:pedidoId`, `/backstage/pedidos/:pedidoId/transferir`, `/backstage/pedidos/:pedidoId/trocar`, `/backstage/pedidos/:pedidoId/formulario`
> **No menu:** Backstage › barra da organização › Pedidos (sem contexto de evento)
> **Versão em uso:** única, pasta `alteracoes-pos-compra`
> **Revisado em:** 2026-11-22 (rodada 2: importantes e melhorias da critique)

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

A auditoria contra as três especificações funcionais (troca de item, troca de titularidade,
troca de perguntas) e as decisões da reunião de 14/10/2026 estão em [REGRAS.md](./REGRAS.md).
A auditoria mobile está em [MOBILE.md](./MOBILE.md). As duas são de 15/10/2026 e parte do que
apontam já mudou no código; vale o que está aqui.

## O que é

Tela do atendimento para achar um pedido e alterá-lo depois da compra: transferir unidades para
outra pessoa, trocar unidades por outros itens e editar as respostas do formulário. Cada
alteração gera uma cobrança com link e prazo, e só é aplicada quando o pagamento entra.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Pedidos do banco (itens = ingressos emitidos, respostas, alterações com autor) | `@/plataforma` (`Pedido`, `IngressoEmitido.respostas`, `Pedido.alteracoes`), espelhados em `data/pos-compra-store.ts` | sim: alteração aplicada grava no banco (PED-91, PED-93, PED-94) |
| Alterações em andamento (cobrança, prazo, reservas) | `data/pos-compra-store.ts` | só em memória; recarregar perde a aberta |
| Questionário dos ingressos do banco | `@/plataforma` (`Evento.perguntas`, QST), convertido em formulário (PED-96) | as respostas, no ingresso |
| Autor das alterações | membro logado, `../components/membros-store.ts` (`lerMembroLogado`, MEM-67) | no histórico e no pedido |
| Pedidos de demonstração (corridas) | `data/pos-compra-store.ts` (mock local) | não aparecem mais na lista (PED-92) |
| Eventos, sessões, catálogo, estoque | `data/pos-compra-store.ts` (`EVENTOS`, `SESSOES`, `CATALOGO`) | estoque só em memória |
| Contas (compradores e destinatários) | `data/pos-compra-store.ts` (`CONTAS`, `CONTAS_EXTRA`) | não |
| Perguntas e formulários | `data/pos-compra-store.ts` (`PERGUNTAS`, `FORMULARIOS`) | estoque de opção só em memória |

Pedidos pagos do banco (`@/plataforma`) entram na lista com evento, sessões, catálogo, questionário e contas reais. Os eventos de demonstração (corridas, nomes com "(demonstração)") continuam no código, mas não são de organização nenhuma e saíram da lista em 21/11/2026 (PED-92); o formulário passou a vir do questionário do evento (PED-96).

## Regras

### Banco
- **PED-90** Todo pedido pago ou cancelado do banco (site, link, app, bilheteria, cortesia) aparece na lista; cada ingresso emitido vira uma linha. _(data/pos-compra-store.ts, `espelharBanco`)_
- **PED-91** Transferência de titularidade aplicada num pedido do banco muda o titular do ingresso no banco; a carteira do novo titular recebe. _(data/pos-compra-store.ts, `gravarNoBanco`)_
- **PED-92** A lista e o filtro de eventos mostram só pedidos de eventos da organização em contexto (BKS-14); organização sem evento não mostra pedido nenhum. Até 21/11/2026 os cinco eventos de demonstração (fora do banco) apareciam em toda organização, na lista e no filtro: misturavam pedidos que não eram da organização e contradiziam BKS-14. Saíram porque o que eles exercitavam (formulário) agora vem do questionário dos eventos do banco (PED-96). _(pages/Pedidos.tsx)_
- **PED-93** Troca de item aplicada num pedido do banco grava no banco: o ingresso emitido passa para o ingresso novo, no lote atual, com código novo (o antigo deixa de valer); o pedido ganha a linha do item novo com o valor pago da unidade antiga (o total pago não muda) e registra a alteração com autor, data, mudança, valor e motivo (`Pedido.alteracoes`). _(data/pos-compra-store.ts `gravarNoBanco`, `@/plataforma` `trocarItemDoPedido`)_
- **PED-94** Edição do formulário aplicada num pedido do banco grava as respostas no ingresso (`IngressoEmitido.respostas`) e registra a alteração no pedido. Respostas mudadas junto da transferência também gravam, no ingresso novo. _(data/pos-compra-store.ts, `@/plataforma` `editarFormularioDoIngresso`)_
- **PED-95** O histórico do pedido do banco mostra as alterações gravadas (troca, formulário, transferência), com autor e horário, também depois de recarregar. A transferência registra a alteração além de mudar o titular (PED-91). _(data/pos-compra-store.ts `entradaDaAlteracao`, `@/plataforma` `registrarAlteracaoNoPedido`)_
- **PED-96** O questionário do evento (QST) é o formulário dos ingressos do banco: cada ingresso recebe as perguntas que o marcam. Opção única vira escolha (com o estoque da opção); múltipla escolha vira texto ("separadas por vírgula"); anexo vira anexo; o resto, texto. Ingresso sem pergunta não tem "Editar formulário". _(data/pos-compra-store.ts `perguntaDoBanco`)_
- **PED-97** Pedido do banco já na tela é remontado quando o banco muda (pagamento que emite os ingressos depois do pedido, alteração gravada, transferência), desde que não tenha alteração aberta. Antes, o pedido pago com a tela aberta entrava sem ingressos e não se corrigia. _(data/pos-compra-store.ts `espelharBanco`)_
- **PED-98** ~~Organização sem pedido mostra o vazio "Nenhum pedido ainda" no lugar da barra e da tabela. Busca ou filtro sem resultado mostra "Nenhum pedido encontrado para essa busca." dentro do cartão, com "Limpar busca", que volta a busca e o evento ao padrão (BKS-117, BKS-118).~~ Substituída por PED-120 em 22/11/2026 (texto da busca sem resultado).
- **PED-99** A lista usa as peças comuns do Backstage (BKS-110): busca à esquerda e o seletor de evento à direita (`BarraDaLista`), cartão, cabeçalho de colunas e linhas de `components/tabela.tsx` e a paginação do DS (`RodapeDePaginacao`), com página e tamanho na URL (PED-04). Até 21/11/2026 tinha tabela, cartão de celular e paginação próprios (`RodapeTabela`). _(pages/Pedidos.tsx)_
- **PED-100** Taxas: o mesmo valor do começo ao fim (22/11/2026). "Total pago" é o total cobrado na compra: itens, taxa de serviço, proteção e juros do parcelamento (`totaisDoPedido().pago`). É o mesmo número na lista (coluna Total pago), no cartão do pedido (Total pago) e na compra do histórico ("pagos na compra"). Onde aparece só a soma dos itens, o rótulo é "Valor dos itens". Antes, o mesmo pedido mostrava três valores: a lista somava só os itens (PED-08), o cartão somava as taxas e a compra do histórico guardava a soma dos itens (no pedido do banco, `Pedido.total`). _(pages/Pedidos.tsx, pages/DetalhePedido.tsx, data/pos-compra-store.ts `totaisDoPedido`, `comValorDaCompra`)_
- **PED-101** ~~Revisão dos três fluxos que cobram: ao lado de "Enviar cobrança", o valor e o e-mail mascarado ("R$ 15,00 para a***@email.com") e o prazo do link.~~ Substituída por PED-105 em 22/11/2026 (o e-mail passou a ir inteiro).
- **PED-103** Vocabulário de evento esportivo (DECIDIDO "inscrição", 22/11/2026): o item vendido é **inscrição** ("Inscrições" no grupo do detalhe, no seletor de unidades e nas abas do Trocar; "Transferir inscrições e produtos", "Trocar inscrições e produtos"); o questionário é **ficha de inscrição** e o nível 2 é **modalidade**. Em entretenimento continuam "Ingressos", "formulário" e "grupo". Itens agrupados no detalhe: ingressos (ou inscrições) por sessão, em ordem cronológica, depois Produtos e Combos. Até 22/11/2026 o item esportivo se chamava "Categoria", nome que o Backstage já usa para a categoria do evento. _(data/pos-compra-store.ts `VOCABULARIO`, pages/DetalhePedido.tsx)_
- **PED-104** Um formato de data em toda a feature: "26 nov 2026" e, com hora, "26 nov 2026, 20:00" (sessão, compra, histórico, transferência, pedidos do banco). Até 22/11/2026 a sessão saía como "qua, 11 de nov, 06h00", a compra como "02 ago 2026, 10:12" e o histórico só com a hora. O prazo da cobrança aberta continua só com a hora ("até 15:42"), porque é sempre hoje. Os chips de data do Trocar seguem com dia da semana, dia e mês empilhados. _(data/pos-compra-store.ts `dataCurta`, `dataHoraLabel`, pages/DetalhePedido.tsx)_
- **PED-105** Revisão dos três fluxos que cobram (Transferir, Trocar, Editar formulário): ao lado de "Enviar cobrança", o valor e o e-mail **inteiro** de quem recebe o link ("R$ 15,00 para ana.correia@email.com") e, logo abaixo, "O link vale 15 minutos. Se expirar, nada é cobrado e a reserva é liberada." O prazo vem de `PRAZO_REAL_LABEL` (PED-70). Troca sem cobrança (PED-63) não mostra prazo. Até 22/11/2026 o e-mail ia mascarado, depois de a mesma tela mostrar o endereço completo no cartão de quem recebe. _(components/pos-compra-ui.tsx `InfoDaCobranca`)_
- **PED-106** Pergunta com estoque: um aviso só, acima das perguntas, "Algumas respostas têm vagas limitadas. Opção esgotada aparece na lista, mas não pode ser escolhida." A opção esgotada continua com "Esgotado" e desabilitada na lista (PED-51). Até 22/11/2026 cada pergunta com estoque repetia o aviso como dica. Vale para Editar formulário, a etapa de ficha do Transferir e a do Trocar. _(components/respostas-ui.tsx `AvisoDeEstoque`)_
- **PED-107** Transferir: Destinatário, O que vai (para {primeiro nome}), Formulário (ou Ficha de inscrição) e Confirmar. O número de etapas é decidido ao abrir o fluxo e não muda: a etapa do formulário existe quando alguma unidade transferível do pedido tem formulário. Se as unidades escolhidas não têm formulário, ela é pulada na ida e na volta e fica concluída no stepper; o voltar diz para onde vai. Até 22/11/2026 a etapa nascia ao marcar uma unidade com formulário e o stepper passava de 3 para 4 etapas no meio do fluxo. _(components/wizard/TransferirTitularidadeWizard.tsx, components/wizard/WizardShell.tsx `indiceAnterior`)_
- **PED-108** Botão de avançar ou enviar desligado diz por quê, no rodapé, ao lado dele: "Escolha ao menos uma unidade para transferir.", "Desmarque as N unidades que não podem ir para {nome}.", "Mude ao menos uma resposta para continuar.", "Preencha o número do chamado e o motivo para enviar a cobrança." (o Trocar já dizia, PED-41). _(components/wizard/TransferirTitularidadeWizard.tsx, components/wizard/editar-formulario-wizard.tsx)_
- **PED-109** Busca de conta no Transferir: enquanto busca, a lista mostra uma linha só, "Buscando contas com “termo”…" (com `role="status"`); sem resultado, "Nenhuma conta com “termo”. Confira a grafia ou busque pelo e-mail ou CPF." Até 22/11/2026 a lista abria com três contas falsas pulsando (skeleton). A espera simulada continua de 1 a 2 s. _(components/wizard/TransferirTitularidadeWizard.tsx)_
- **PED-110** Trocar: O que sai, O que entra, Formulários (ou Fichas de inscrição) e Confirmar. Como no PED-107, o número de etapas é decidido ao abrir: a etapa de formulários existe quando algum item do catálogo do evento tem formulário, e é pulada quando os itens escolhidos não têm. O selo do item que pede respostas diz "Pede N respostas". _(components/wizard/TrocarItensWizard.tsx)_
- **PED-111** Datas à venda do Trocar: no celular (abaixo de md), os chips ficam numa grade de três colunas, todos à vista, sem rolagem lateral; no desktop, carrossel com setas. A busca da etapa tem o placeholder curto "Nome, lote ou data", que cabe inteiro em 390 px. _(components/abas-carrossel.tsx, components/wizard/TrocarItensWizard.tsx)_
- **PED-112** Pedido inexistente no endereço (detalhe ou fluxo): o estado vazio do DS, "Pedido não encontrado", "Confira o endereço ou busque o pedido pelo nome do comprador na lista." e o botão "Voltar para pedidos". Até 22/11/2026 era um texto solto com um botão. _(components/pedido-nao-encontrado.tsx)_
- **PED-113** Detalhe e fluxos sem recuo próprio: o título fica na mesma coluna e altura das outras telas com voltar (x=124 e topo 80 px no desktop; 16 px da borda no celular). Até 22/11/2026 o cabeçalho dos fluxos tinha 24 px a mais de cada lado (h1 em x=148 contra 124 nas listas) e o detalhe, no celular, 16 px a mais. _(components/wizard/WizardShell.tsx, pages/DetalhePedido.tsx)_
- **PED-114** Trocar de aba (Itens, Histórico) faz o conteúdo novo entrar com um fade de 180 ms (sem movimento com "reduzir movimento"). Antes a aba nova aparecia seca. _(pages/DetalhePedido.tsx)_
- **PED-115** Barra do pedido no celular: "Pedido {ID curto}" e o evento. O ID completo e a cópia ficam em "Detalhes". Antes a barra mostrava o UUID inteiro, cortado. _(pages/DetalhePedido.tsx `BarraDoPedido`)_
- **PED-116** Detalhe: unidades iguais (mesmo item, mesmo portador e mesma alteração aberta, ou nenhuma) viram **um cartão** com o selo "N unidades" e o valor "R$ X cada" (ou "no total", se as unidades custaram valores diferentes). Com uma unidade, o cartão tem "Editar {formulário}" no pé. Com várias e formulário, o pé "Ver as N unidades" abre (altura animada, 200 ms) a lista das unidades: "Unidade N", a primeira resposta da ficha ("Tamanho da camiseta: M") e o botão "Editar" de cada uma. Item sem formulário não abre lista (as unidades são idênticas). Até 22/11/2026 cada unidade era um cartão: um pedido com 70 unidades tinha 70 cartões e 11.905 px de altura (agora cerca de 1.000 px). _(pages/DetalhePedido.tsx `CartaoDoItem`, `agruparUnidades`)_
- **PED-117** Editar formulário sem `?linhas=` (PED-53): a escolha da unidade é um grupo de rádios do DS, uma opção por unidade ("Corrida 5 km, unidade 2"), com o portador e a primeira resposta. Até 22/11/2026 eram caixas de seleção agrupadas por item, em que marcar uma desmarcava a outra e o grupo pegava sempre a primeira unidade. _(components/wizard/seletor-unidades.tsx `unica`, pages/AlterarPedido.tsx)_
- **PED-118** No celular, os botões do rodapé dos fluxos, do modal "Sair e descartar" e de editar a unidade têm 44 px de altura (o md do DS tem 40). _(components/wizard/WizardShell.tsx, pages/DetalhePedido.tsx)_
- **PED-119** Lista: subtítulo "Encontre o pedido do cliente para transferir, trocar itens ou corrigir respostas." (era a lista das três operações com o nome interno). O nome do evento quebra linha em vez de ser cortado sem ter onde ler o resto. _(pages/Pedidos.tsx)_
- **PED-120** Organização sem pedido mostra o vazio "Nenhum pedido ainda" no lugar da barra e da tabela. Busca sem resultado, dentro do cartão: "Nenhum pedido com “termo”. Confira a grafia ou busque pelo ID do pedido."; filtro de evento sem pedido: "Nenhum pedido neste evento ainda. Escolha outro evento ou veja todos." Os dois com "Limpar busca", que volta a busca e o evento ao padrão (BKS-117, BKS-118). _(pages/Pedidos.tsx)_
- **PED-121** Sem "·", "|" e "›" como separador nos textos da feature: frase ou vírgula. "Provas de rua, Lote 2"; "Pedido f456d223, de Letícia Amaral" (subtítulo dos fluxos); "28 ago 2026, 15:40, por Marcelo Duarte"; "Online em 02 ago 2026, 10:12"; motivo como frases ("Pedido do cliente. Chamado 98231."). O título da aba do navegador segue BKS-125. _(components/pos-compra-ui.tsx `caminhoDoItem`, components/wizard/*, pages/*, data/pos-compra-store.ts `descreverMotivo`)_
- **PED-102** Foco visível: campos e botões do DS usam o próprio anel; o anel de foco da feature (`FOCO`) vai só nos elementos montados aqui (botão da linha da lista, botões da faixa de atenção, `summary` dos "Detalhes", cartões focáveis, linhas da folha "Mais ações"). Até 22/11/2026 um escopo na página inteira (`FOCO_ESCOPO`, na lista, no detalhe, nos cartões do histórico e no modal de saída dos fluxos) punha um segundo anel em todo `:focus-visible`, dobrando o foco dos campos do DS. _(components/pos-compra-ui.tsx)_

### Lista de pedidos
- **PED-01** Lista todos os pedidos da organização, sem contexto de evento. _(pages/Pedidos.tsx)_
- **PED-02** Busca por ID do pedido, nome do comprador ou nome do evento, sem diferenciar maiúsculas. _(pages/Pedidos.tsx)_
- **PED-03** Filtro por evento, com "Todos os eventos" como padrão. _(pages/Pedidos.tsx)_
- **PED-04** Busca, evento, página e itens por página ficam na URL; voltar do detalhe devolve a lista como estava. _(pages/Pedidos.tsx)_
- **PED-05** Mudar busca, evento ou itens por página volta para a página 1. _(pages/Pedidos.tsx)_
- **PED-06** Itens por página: 10, 25 (padrão), 50 ou 100, na paginação do DS (BKS-114), que só aparece com mais de 10 pedidos; o seletor de tamanho só aparece a partir de md. _(pages/Pedidos.tsx)_
- **PED-07** Colunas: Comprador (nome em negrito e e-mail), Pedido (ID curto, 8 caracteres; o completo fica no detalhe e vale na busca), Evento e Total pago (PED-100). A linha inteira abre o pedido; não há botão próprio para abrir (o olho "Detalhes" saiu em 22/11/2026: era um segundo alvo para a mesma ação). Com o cartão abaixo de 44rem, cada pedido vira um bloco com o rótulo ao lado de cada valor (BKS-115). Até 21/11/2026 o desktop mostrava o ID completo e o celular um cartão próprio com nº de itens. _(pages/Pedidos.tsx)_
- **PED-08** ~~"Total pago" na lista é a soma do valor pago das linhas.~~ Substituída por PED-100 em 22/11/2026: a soma das linhas deixava de fora taxa de serviço, proteção e juros, e a lista discordava do cartão do pedido.
- **PED-09** Faixa "N pedidos precisam de atenção agora" acima da lista: pedidos em falha e cobranças aguardando que expiram em até 15 minutos, ordenadas pelo menor prazo. Atualiza a cada 15 s e some quando não há nada. No celular nasce recolhida. _(components/FaixaAtencaoPedidos.tsx)_

### Detalhe do pedido
- **PED-10** Duas abas: Itens e Histórico. _(pages/DetalhePedido.tsx)_
- **PED-11** ~~Itens agrupados em ingressos por sessão (ordem cronológica), Produtos e Combos. Em evento de esporte, "Ingressos" vira "Categorias" e "formulário" vira "ficha de inscrição".~~ Substituída por PED-103 em 22/11/2026 ("inscrição" no lugar de "categoria").
- **PED-12** Sessão que já começou mostra "Sessão realizada. Só a transferência continua disponível." _(pages/DetalhePedido.tsx)_
- **PED-13** ~~Cada unidade é uma linha, com item, grupo/lote, valor pago, portador e, se houver, selo "Exclusivo feminino" ou "Exclusivo sócios". Combo abre "Detalhes" com os itens que contém.~~ Substituída por PED-116 em 22/11/2026 (unidades iguais num cartão só). O selo de segmentação e o "Detalhes" do combo continuam.
- **PED-14** Pagamento: Valor dos itens, Taxa de serviço, Proteção do pedido, Juros do parcelamento (pedido do banco com juros) e Total pago (PED-100). "Itens sem desconto" e cupom só aparecem quando houve cupom com desconto. Até 22/11/2026 a linha dos itens se chamava "Itens" e os juros não entravam. Pedido de cortesia ou de total zero mostra "Cortesia, sem valor pago". _(pages/DetalhePedido.tsx)_
- **PED-15** Botões "Transferir …" e "Trocar …" aparecem só quando ao menos uma unidade aceita o verbo; o rótulo diz os tipos alcançados (ingressos, produtos, combos). Ficam no cabeçalho padrão (`CabecalhoDaPagina`, BKS-100), abaixo do título e à esquerda (BKS-104); no celular, abaixo da barra do pedido, com a largura toda. Até 22/11/2026 ficavam à direita do título. O "Detalhes" da barra do celular e os gatilhos de conferência são links do DS (`link-gray`) sem cor própria; antes eram azuis à mão (`utility-blue`). _(pages/DetalhePedido.tsx)_
- **PED-16** ~~"Editar formulário" fica na própria unidade e só aparece se o item tem formulário e a unidade está livre.~~ Substituída por PED-116 em 22/11/2026: continua por unidade e com as mesmas condições, no pé do cartão (uma unidade) ou na lista que o cartão abre (várias).
- **PED-17** Unidade com alteração aberta mostra o estado no lugar da ação: "Aguardando pagamento da … até HH:MM", "Pagamento registrado. Aplicando…", "… paga e não aplicada" ou "Reprovada na revalidação…". _(pages/DetalhePedido.tsx)_
- **PED-18** Seção "Alterações em andamento (N)" lista um cartão por solicitação aberta, com contador de prazo, "Copiar link", "Reenviar" e "Mais ações" (Registrar pagamento recebido, Cancelar alteração). _(pages/DetalhePedido.tsx, components/CartaoOperacao.tsx)_
- **PED-19** Histórico agrupa as entradas por alteração, mais recente primeiro, e a compra fica por último. Mostra 10 alterações e "Mostrar mais N alterações". Sem alterações: "Nenhuma alteração registrada no Backstage desde a compra." _(pages/DetalhePedido.tsx)_
- **PED-20** Toda entrada do histórico grava autor; o operador é o membro logado no Backstage (sem login no protótipo, o primeiro administrador da organização em contexto, MEM-67), com o nome tirado do e-mail. Até 21/11/2026 era fixo, "Renata Lopes". _(data/pos-compra-store.ts `operadorAtual`)_

### Disponibilidade da unidade
- **PED-21** Uma unidade presa em solicitação aguardando, processando ou em falha não entra em outra alteração. Reprovada libera a unidade. _(data/pos-compra-store.ts)_
- **PED-22** Troca: bloqueada quando a sessão da unidade já começou ("Sessão realizada"). Transferir e editar formulário continuam liberados. _(data/pos-compra-store.ts)_
- **PED-23** Editar formulário: bloqueado quando o item não tem formulário ("Sem formulário"). _(data/pos-compra-store.ts)_
- **PED-24** Ter recebido a unidade por transferência não bloqueia nenhuma ação. _(data/pos-compra-store.ts)_

### Transferir
- **PED-30** ~~Etapas: Destinatário, Itens, Formulário (só se alguma unidade tem formulário) e Revisão.~~ Substituída por PED-107 em 22/11/2026 (nomes como estão na tela e número de etapas fixo).
- **PED-31** ~~Busca de conta com resultado simulado em 1 a 2 s; sem resultado: "Nenhuma conta encontrada para “termo”".~~ Substituída por PED-109 em 22/11/2026.
- **PED-32** Um destinatário por solicitação, com várias unidades. _(components/wizard/TransferirTitularidadeWizard.tsx)_
- **PED-33** Bloqueia a unidade quando a conta já é a titular, quando o item é nominal e a conta já tem ou vai receber uma unidade do mesmo item, ou quando o item é exclusivo feminino ou de sócios e a conta não atende. _(data/pos-compra-store.ts)_
- **PED-34** Ingresso é nominal por padrão; produto e combo não, salvo configuração do item. _(data/pos-compra-store.ts)_
- **PED-35** Taxa da transferência: R$ 15,00 por unidade. Mudar resposta que já existia soma R$ 10,00 de taxa de edição; completar resposta em branco não cobra. _(data/pos-compra-store.ts)_
- **PED-36** O link vai para o e-mail do novo titular, que é quem paga. _(components/wizard/TransferirTitularidadeWizard.tsx, components/CartaoOperacao.tsx)_

### Trocar
- **PED-40** ~~Etapas: Saem, Entram, Formulários (se algum item que entra tem formulário) e Revisão.~~ Substituída por PED-110 em 22/11/2026 (nomes como estão na tela e número de etapas fixo).
- **PED-41** A quantidade que entra precisa ser igual à que sai, e a seleção não pode ser idêntica à atual. O rodapé diz o que falta ("Escolha mais N", "Tire N…", "Escolha ao menos um diferente do atual"). _(components/wizard/TrocarItensWizard.tsx)_
- **PED-42** Item de destino bloqueado com selo: "Item atual", "Já vinculado" (nominal), "Esgotado", "Sessão encerrada" ou "Restrito" (feminino/sócio). Item esgotado aparece na lista, não selecionável. _(data/pos-compra-store.ts, components/wizard/TrocarItensWizard.tsx)_
- **PED-43** Pareamento: unidades que saem e itens que entram são ordenados do menor para o maior valor e casados nessa ordem. _(data/pos-compra-store.ts)_
- **PED-44** Total = máx(0, Σ(preço integral do novo − valor pago) + Σ máx(0, taxa do novo − taxa paga) + R$ 20,00 da troca [+ R$ 10,00 se mudou resposta existente]). Taxa de serviço padrão 10%, o item pode ter a sua. _(data/pos-compra-store.ts)_
- **PED-45** A cobrança da troca (R$ 20,00) é uma por operação: R$ 15,00 produtor e R$ 5,00 Ingresse. _(data/pos-compra-store.ts)_
- **PED-46** Downgrade com sobra: a sobra não volta e a revisão exige o aceite "Confirmo, em nome do comprador, que R$ X não serão devolvidos"; o aceite vai para a nota do motivo. _(components/wizard/TrocarItensWizard.tsx)_
- **PED-47** No formulário do item novo, pergunta igual herda a resposta; pergunta nova vem em branco e é obrigatória antes da revisão. _(components/wizard/TrocarItensWizard.tsx)_
- **PED-48** O estoque do item de destino é reservado (−1) quando a cobrança é criada e devolvido se ela expira, é cancelada ou reprovada. _(data/pos-compra-store.ts)_
- **PED-49** O link vai para o e-mail do comprador. _(components/wizard/TrocarItensWizard.tsx, components/CartaoOperacao.tsx)_

### Editar formulário
- **PED-50** Uma unidade por vez. Etapas: Respostas e Revisão; só avança com ao menos uma resposta alterada. _(components/wizard/editar-formulario-wizard.tsx)_
- **PED-51** Opção esgotada de pergunta com estoque fica desabilitada, salvo se já é a resposta atual. _(components/respostas-ui.tsx)_
- **PED-52** Cobrança: R$ 10,00 por operação, independente de quantas respostas mudam. Link para o e-mail do comprador. _(data/pos-compra-store.ts, components/wizard/editar-formulario-wizard.tsx)_
- **PED-53** Link sem `?linhas=` abre a escolha da unidade antes do formulário (rádio, PED-117). _(pages/AlterarPedido.tsx)_

### Validações comuns aos fluxos
- **PED-60** Motivo obrigatório na revisão: número do chamado e categoria (Pedido do cliente, Erro de cadastro, Erro do operador, Outro). Nenhuma categoria vem marcada. Em "Outro" a descrição é obrigatória. _(data/pos-compra-store.ts, components/pos-compra-ui.tsx)_
- **PED-61** Sair do fluxo com algo montado pergunta "Sair e descartar esta alteração?"; recarregar dispara o aviso do navegador. Não há rascunho. _(components/wizard/WizardShell.tsx, pages/AlterarPedido.tsx)_
- **PED-62** Se outra alteração pegou a unidade enquanto o fluxo estava aberto, o envio falha com toast e nada é criado. _(data/pos-compra-store.ts, components/wizard/*)_
- **PED-63** Total zero não gera link nem prazo: a alteração é aplicada na hora e o histórico registra "… sem cobrança". _(data/pos-compra-store.ts)_
- **PED-64** Reenviar link: só e-mail, começa no último destino usado, valida o formato ("Confira o e-mail.") e não reinicia o prazo. _(components/CartaoOperacao.tsx)_
- **PED-65** Registrar pagamento recebido exige referência com no mínimo 4 caracteres e não pode ser desfeito. _(components/CartaoOperacao.tsx)_

### Estados da solicitação
- **PED-70** Aguardando: prazo exibido como "15 minutos", mas expira em 60 s de relógio (acelerado para demo). Ao expirar, libera reservas e o pedido fica "Alteração expirada". _(data/pos-compra-store.ts, components/CartaoOperacao.tsx)_
- **PED-71** Processando: depois de registrar o pagamento, as regras são revalidadas em ~1,4 s. Passou: aplica, devolve o estoque da origem e o pedido vira "Já alterados". _(data/pos-compra-store.ts)_
- **PED-72** Reprovada: a revalidação falhou; o histórico registra estorno integral e nada muda no pedido. _(data/pos-compra-store.ts)_
- **PED-73** Cancelar: "O link para de funcionar, a reserva é liberada e nada é cobrado." _(components/CartaoOperacao.tsx)_
- **PED-74** Status do pedido é derivado: falha > processando > aguardando ("Alteração em andamento") > status de base ("Sem alterações" ou "Já alterados"). Entrar num fluxo de pedido expirado volta o pedido ao status de base. _(data/pos-compra-store.ts, pages/AlterarPedido.tsx)_
- **PED-75** ~~Pedido inexistente na URL: "Pedido não encontrado." com "Voltar para pedidos".~~ Substituída por PED-112 em 22/11/2026 (estado vazio do DS).
- **PED-76** Lista sem resultado: ver PED-120. _(pages/Pedidos.tsx)_

## Depende de / afeta

- **Depende de:** catálogo, sessões e formulários do evento; contas de usuário; finance (valores de cobrança, hoje constantes).
- **Afeta:** carteira do comprador e do novo titular (titularidade, item e respostas), estoque de itens e de opções de resposta, relatórios de transferência.

## Em aberto

- Pedidos do banco: só os ingressos viram linhas; produtos e combos do pedido não aparecem e não podem ser trocados. A troca só vai para ingressos do banco (o catálogo de destino do banco só tem ingressos).
- A diferença paga na troca (e as taxas da alteração) não entra nos totais do pedido do banco: a linha nova guarda o valor pago da unidade antiga; o valor da alteração fica só no registro dela.
- O checkout ainda não grava respostas do questionário: os ingressos do banco começam com o formulário em branco.
- Múltipla escolha do questionário é editada como texto livre (PED-96).
- Pedido de demonstração continua abrindo pelo endereço (`/backstage/pedidos/<id>`); o detalhe não confere a organização.
- Solicitação reprovada fica em `pedido.solicitacoes` para sempre: o status do pedido continua "Alteração em andamento" e o cartão continua em "Alterações em andamento". _(data/pos-compra-store.ts, `comStatus`)_
- Nenhum fluxo gera solicitação em "falha", então a faixa de atenção e o status "Falha na alteração" nunca aparecem por uso. Não há ação de reprocessar; o cartão só diz "Será reprocessada". O histórico semente ainda tem "Troca paga e não aplicada" e "Financeiro notificado", de um estado que saiu do código.
- Valor pago da linha após a troca é `máx(valor pago, preço integral do novo)`, mas o comentário diz "o da compra mais a diferença paga agora". Em downgrade a linha mantém o valor antigo como crédito para a próxima troca. _(data/pos-compra-store.ts, `aplicarSolicitacao`)_
- O filtro da lista é de evento, num seletor, e não de status em botões segmentados como pede BKS-111: a lista não tem status de pedido e os eventos variam por organização. _(pages/Pedidos.tsx)_
- Taxa da transferência multiplicada por unidade (R$ 15 × N); as EFs falam em cobrança por operação. Ver REGRAS.md, item 2.
- Reserva do destino na criação da cobrança; a reunião de 14/10 decidiu reserva de ~5 min a partir do clique no link.
- "Registrar pagamento recebido" efetiva sem confirmação real; a reunião decidiu que é controle só do protótipo e deve parecer fora do design. Hoje está no menu "Mais ações" com visual normal.
- Sessão realizada só bloqueia a troca; as EFs mandam bloquear transferência e edição em evento encerrado.
- Mensagem "Todas as unidades estão em outra alteração ou com outro titular" cita titular, mas ter outro titular não bloqueia transferência.
- Item esgotado ou restrito aparece bloqueado no catálogo de destino; a EF manda não listar (esgotado) ou listar e barrar só na efetivação (segmentação).
- Nominalidade checa só o mesmo item dentro do pedido; a EF fala em um item de acesso por sessão.
- Nenhuma permissão por perfil: qualquer operador faz tudo, inclusive registrar pagamento.
- Alteração em andamento (aguardando pagamento) fica só em memória: recarregar a página perde a cobrança aberta. Só a aplicada grava no banco.
- Lista não tem coluna nem filtro de status, embora o código mencione "filtro de situação".
- Prazo do link: a tela diz 15 minutos (`PRAZO_REAL_LABEL`, PED-70 e PED-101), mas no protótipo a cobrança expira em 60 s de relógio (`PRAZO_DEMO_SEGUNDOS`), para a expiração ser visível na demonstração. O texto segue a regra do produto; o relógio, não. _(data/pos-compra-store.ts)_
- Transferência leva as respostas do formulário do titular anterior para o novo (H-23, `TransferirTitularidadeWizard`): o novo titular herda tudo o que o formulário tiver, inclusive dados sensíveis (ex.: "Histórico médico e observações", "Atestado médico" nas fichas de esporte). Questão de LGPD (dados pessoais de uma pessoa passam a constar no ingresso de outra) aguardando decisão; o comportamento não muda até lá. _(components/wizard/TransferirTitularidadeWizard.tsx)_
- Pedido do banco com cupom: a linha guarda o valor de face sem o desconto (`face`), então o Total pago derivado (PED-100) fica acima do `Pedido.total` do banco pelo valor do cupom. O cupom ainda não é aplicado às linhas do espelho. _(data/pos-compra-store.ts `espelharBanco`)_

- Celular: a lista segue em bloco com rótulo ao lado de cada valor (PED-07, BKS-115), e a critique de 22/11/2026 (UI-MOB-005) pede tabela-lista. Não decidido: aguarda decisão humana (vale também para Produtos, POR-01).
- Rail "Vendas" × título "Pedidos" (BKS-87): não decidido; o título da tela segue "Pedidos".
- Detalhe: o nome do comprador no trilho (h2) vem antes do h1 (ID do pedido) na ordem do documento. Visto só no código; não mexido.
- A lista de unidades do cartão (PED-116) numera as unidades pela ordem da compra ("Unidade 2"); o número não existe para o comprador. A primeira resposta da ficha é o que ajuda a reconhecer a unidade; em pedido sem resposta nenhuma, só o número.
- REGRAS.md e MOBILE.md (15/10/2026) ainda citam "Categoria", o cartão por unidade e o stepper que cresce; vale o que está aqui.

## Fontes

- [EF Troca de item](https://ingresse-team.atlassian.net/wiki/spaces/TS/pages/575995905)
- [EF Troca de titularidade](https://ingresse-team.atlassian.net/wiki/spaces/TS/pages/576978948)
- [EF Troca de perguntas do formulário](https://ingresse-team.atlassian.net/wiki/spaces/TS/pages/575635517)
- Reunião "Gestão de pedidos", 14/10/2026 (resumo em REGRAS.md)
