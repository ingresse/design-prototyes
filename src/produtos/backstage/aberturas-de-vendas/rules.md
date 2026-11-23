# Aberturas de vendas: regras

> **Rotas:** `/backstage/catalogo/aberturas-de-vendas`
> **No menu:** Backstage › menu do evento › Ingressos e produtos › atalho Abertura de vendas (página própria, com "Ingressos e produtos" para voltar; `backstage/rules.md` BKS-07, BKS-17).
> **Versão em uso:** única (`aberturas-de-vendas/`)
> **Revisado em:** 2026-11-22 (critique do evento)

> **De volta ao menu em 08/11/2026:** os itens não têm mais datas de venda próprias, então a abertura de vendas e o lote ligado decidem quando cada item vende (`itens/rules.md` ITM-11 e ITM-30). Substitui a Agenda de vendas; `/backstage/catalogo/agenda` e `/backstage/catalogo-anterior/aberturas-de-vendas` redirecionam para cá.

> **Página única (12/11/2026):** Aberturas de vendas foi uma aba da página Itens; desde 20/11/2026 é página própria (em Regras de venda até 22/11/2026; desde então, pelo atalho de Ingressos e produtos), com o título no `CabecalhoDaPagina` (`backstage/rules.md` BKS-17, BKS-100).

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

Quando os itens do evento vendem. Cada abertura tem nome (visto pelo comprador), início, fim e os
ingressos, produtos e combos incluídos. Sem público nem canais: quem compra é restringido por chave de
acesso, e o item só aparece no fluxo de compra (`itens/rules.md` ITM-31).
Os itens não têm datas próprias (`itens/rules.md` ITM-30); a abertura e o lote ligado decidem.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Aberturas | `Evento.aberturas` (`AberturaDeVendas`: nome, início, fim, `itens`) do evento em contexto; dados antigos com `configuracoes` são lidos por `itensDaAbertura` e regravados sem elas | sim (`salvarAberturas`, na hora) |
| Itens para escolher | ingressos das sessões, produtos do evento e combos (`useCatalogo`) | não |

## Regras

- **ABV-01** Título "Aberturas de vendas" e subtítulo "Quando cada ingresso, produto e combo vende." (UI-VIS-014); "Nova abertura" no topo, como ação do `CabecalhoDaPagina` (à direita no desktop, abaixo do título no celular; BKS-104), quando já há aberturas. Lista por data de início. _(pages/AberturasDeVendas.tsx)_
- **ABV-02** ~~Cada abertura é um cartão com nome, estado (Aberta agora, Agendada, Encerrada, pela hora atual), "De <início> até <fim>" e, sempre visíveis, Ingressos, Produtos e Combos incluídos (três colunas no desktop, empilhados no celular, UI-MOB-004). Vazio: "Nenhum ingresso", "Nenhum produto", "Nenhum combo"; sem nenhum item, aviso "Escolha os itens: sem eles, esta abertura não vende nada." Ações Duplicar, Editar e Excluir.~~ substituída por ABV-10 em 21/11/2026: a abertura virou linha da lista padrão.
- ~~**ABV-03** "Nova abertura" e Editar abrem o modal com Nome (obrigatório, "Aparece para o comprador."), Começa em e Termina em, cada um com a data (calendário, aceita digitação) e o horário em campos separados, lado a lado (UI-FRM-008; `components/campos-de-data-e-hora.tsx`), e a data do evento como referência. O dia do fim não pode ser antes do dia do começo. Erros: "Dê um nome à abertura.", "Escolha a data.", "Escolha o horário.", "Escolha um fim depois do começo." A abertura nova nasce sem itens. _(pages/AberturasDeVendas.tsx)_~~ Substituída por ABV-11 em 22/11/2026 (o modal saiu: nome e período ficam no painel da abertura).
- ~~**ABV-04** "Escolher ingressos", "Escolher produtos" e "Escolher combos" (no menu ⋮ da linha, ABV-10) abrem o mesmo padrão: slideout à direita (tela cheia no celular, UI-NAV-001 e UI-NAV-003) com busca, filtro Todos ou Selecionados, "Mostrar mais" e resumo no rodapé. Produtos e combos: lista com "N de M" e "Selecionar todos os N do filtro" (`SeletorDeLista`). Ingressos, feitos para milhares de setores com centenas de ingressos: sessão › setor › ingresso; "Toda a sessão de <data>" e cada setor com caixa de seleção (parcial mostra "7 de 8 ingressos"); setores recolhidos, 30 por vez, e ingressos do setor aberto 50 por vez; a busca por ingresso abre o setor que o tem; resumo "60 ingressos em 7 setores". A linha mostra até 5 nomes; acima disso, a contagem por tipo ("60 ingressos em 7 setores e 1 produto"). Duas sessões no mesmo dia levam a hora no rótulo ("Sessão de 3 de dez., 20:00"), para não terem o mesmo nome (UI-LST-001). _(pages/AberturasDeVendas.tsx, components/SeletorDeIngressos.tsx, itens/components/SeletorDeLista.tsx)_~~ Substituída por ABV-11 em 22/11/2026 (a escolha de itens saiu do menu ⋮ e dos três slideouts e foi para o painel da abertura).
- **ABV-09** A abertura grava só os ingressos marcados, um por id. Marcar a sessão ou o grupo marca os ingressos que ele tem agora; ingresso criado depois não entra sozinho (decisão Victor, 08/11/2026), e o painel avisa: "Ingressos criados depois não entram sozinhos." O resumo conta ingressos e grupos ("60 ingressos em 7 grupos", ITM-89). _(backstage/components/seletor-de-ingressos.tsx, backstage/components/painel-da-abertura.tsx, pages/AberturasDeVendas.tsx)_
- **ABV-10** Lista padrão do Backstage (BKS-110 a BKS-118, desde 21/11/2026): busca à esquerda e, com mais de um estado na lista, o filtro de estado em botões segmentados do DS à direita (Todas, Aberta agora, Agendada, Encerrada, só os que existem); um cartão da tabela com as colunas Abertura (nome e "De <início> até <fim>"), Estado, Itens (até 5 nomes ou a contagem; sem nenhum item, o aviso "Escolha os itens: sem eles, esta abertura não vende nada." em cor de alerta) e as ações: lápis (Editar) e ⋮ com Duplicar e Excluir; tocar no nome da abertura também abre o painel (ABV-11). Até 22/11/2026, o ⋮ tinha também Escolher ingressos, Escolher produtos e Escolher combos. Paginação do DS acima de 10 aberturas; busca, filtro ou tamanho voltam à página 1. Abaixo de 704 px de largura do cartão, cada linha vira um bloco com o rótulo ao lado de cada valor. _(pages/AberturasDeVendas.tsx)_
- **ABV-11** Criar e editar numa etapa só (desde 22/11/2026): "Nova abertura", o lápis e o nome da abertura abrem o painel da abertura, um slideout de 576 px (tela cheia no celular) com Nome (obrigatório, "Aparece para o comprador."), o período (~~data e horário em campos separados, UI-FRM-008~~ substituído por ABV-15, que por sua vez foi substituída por ABV-17; o fim não pode vir antes do começo) e, separado por uma linha, "O que vende": abas Ingressos, Produtos e Combos, com a quantidade marcada em cada aba. Ingressos: a árvore sessão › grupo › ingresso, com busca, Todos ou Selecionados, marcar a sessão ou o grupo inteiro e "Mostrar mais" (ABV-09). Produtos e combos: lista com busca, "N de M", "Selecionar todos os N do filtro" e "Mostrar mais" quando há muitos. O rodapé resume o que vende (~~"3 ingressos em 2 grupos · 2 produtos · 1 combo"~~ desde 22/11/2026, frase do idioma com `Intl.ListFormat`: "3 ingressos em 2 grupos, 2 produtos e 1 combo", UI-TXT-010; sem nada, "Sem itens, esta abertura não vende nada." em cor de alerta, e mesmo assim salva) e tem um botão só, "Criar abertura" ou "Salvar", que grava nome, período e itens juntos. Erros: "Dê um nome à abertura.", "Escolha a data.", "Escolha a hora." (ABV-17; entre 22 e 23/11/2026 foi "Escolha data e hora."), "Escolha um fim depois do começo." _(backstage/components/painel-da-abertura.tsx)_
- **ABV-12** Nova abertura começa com todos os ingressos, produtos e combos do evento marcados: o caso comum é abrir tudo de uma vez, e desmarcar é um toque. Continua valendo que ingresso criado depois não entra sozinho (ABV-09). _(backstage/components/painel-da-abertura.tsx)_
- **ABV-13** O painel também abre em Ingressos e produtos, sem sair da tela: "Programar abertura de vendas", no aviso "Nada programado para entrar à venda" (GDC-10). Ao criar, o aviso some. _(backstage/components/abas-de-itens.tsx)_
- **ABV-14** O seletor de ingressos do painel (e de todas as telas que usam `components/seletor-de-ingressos.tsx`) aguenta 1.000 grupos × 300 ingressos: até 3 sessões, todas abertas; acima disso, começam fechadas e entram de 30 em 30 ("Mostrar mais 30 sessões"); grupos de 30 em 30 e ingressos de 50 em 50; marcar a sessão ou o grupo inteiro; "Todos" ou "Selecionados". A busca é adiada, acha cada palavra no nome do grupo ou do ingresso com o grupo, usa um índice calculado uma vez por evento e abre só as 3 primeiras sessões e os 3 primeiros grupos achados (com uma letra, nenhum grupo abre). A busca ocupa a largura do painel (antes 204 px, cortando o texto). O painel do seletor tem o nome do título e "Fechar" em português (SEG-64). A API (`useSelecaoDeIngressos`, `ArvoreDeIngressos`, `SeletorDeIngressos`) não mudou. Medido com `?escala=1x1000x300`: o painel abre em cerca de 250 ms (antes 1.044 ms com 5 mil ingressos). _(backstage/components/seletor-de-ingressos.tsx)_
- **ABV-15** Painel da abertura (22/11/2026): ~~Começa em e Termina em com o `DateTimePicker` do DS (data e hora num campo só, 24 h, como a Edição na carteira), em par (lado a lado a partir de 640 px, um embaixo do outro no celular).~~ (substituído por ABV-17 em 23/11/2026) Ao escolher o começo sem fim escolhido, o fim é sugerido: o começo do evento, se vem depois ("Sugerido: até o começo do evento."), senão um dia depois ("Sugerido: um dia depois do começo."); mexer no fim tira a sugestão. Com algo mudado (nome, datas ou qualquer marcação), Esc, Cancelar e Fechar perguntam "Descartar o que você digitou?" ("O que você digitou ainda não foi salvo.", "Continuar editando" e "Descartar", a mesma pergunta da lista de ingressos, ITM-133), clicar fora não fecha e recarregar a página pede confirmação do navegador. As abas Produtos e Combos só aparecem quando o evento tem produtos ou combos (sem elas, nada de abas); trocar de aba troca o conteúdo com um fade de 150 ms (sem movimento, na hora). O painel tem o nome do título e "Fechar" em português (SEG-64). _(backstage/components/painel-da-abertura.tsx)_
- **ABV-16** No celular, o período da abertura ("De <início> até <fim>") quebra linha em vez de cortar. _(pages/AberturasDeVendas.tsx)_
- **ABV-17** Data e hora em campos separados (desde 23/11/2026, decisão do Victor: escolher dia e hora no mesmo calendário não funcionou com os produtores; mesma decisão do Criar evento, 17/11/2026): o período tem duas linhas, "Data de início" e "Hora de início", "Data de término" e "Hora de término", com a data (calendário que aceita digitação) à esquerda e a hora (24 h, digitável, 144 px) à direita, os mesmos `CampoData` e `CampoHora` do Criar evento. A data de término não deixa escolher dia antes da de início. A sugestão do fim (ABV-15) entra quando data e hora de início estão escolhidas e preenche as duas do término. Erros por campo: "Escolha a data.", "Escolha a hora.", e na data de término "Escolha um fim depois do começo.". Substitui o `DateTimePicker` de ABV-15. _(backstage/components/painel-da-abertura.tsx, backstage/components/campos-de-data-e-hora.tsx)_
- **ABV-05** Sem público ("Vender para"), sem canais e sem várias configurações por abertura (removidos em 08/11/2026). _(pages/AberturasDeVendas.tsx)_
- **ABV-06** Duplicar cria "Cópia de <nome>" com os mesmos itens, sem confirmação, com toast. Excluir pede confirmação ("Os itens dela deixam de vender neste período. Esta ação não pode ser desfeita."). _(pages/AberturasDeVendas.tsx)_
- **ABV-07** Cada ação confirmada grava na hora e mostra toast ("Alterações salvas.", "<nome> criada.", "<nome> excluída."); erro mostra "Tente de novo: não foi possível salvar." _(pages/AberturasDeVendas.tsx)_
- **ABV-08** Estados: carregando (linhas pulsando, BKS-116), vazio ("Nenhuma abertura programada" com "Nova abertura", BKS-117); busca ou filtro sem resultado: "Nenhuma abertura encontrada." dentro do cartão, com "Limpar busca", que limpa a busca e o filtro (BKS-118). Até 21/11/2026, a busca e o "Mostrar mais" só apareciam com mais de 8 aberturas e não havia "Limpar busca". _(pages/AberturasDeVendas.tsx)_

## Depende de / afeta

- **Depende de:** evento em contexto e catálogo (`itens/`).
- **Afeta:** **ainda não** afeta a compra: o site, o link de compra e o checkout não leem as aberturas.

## Em aberto

- Decisão humana (critique de 22/11/2026): "Nova abertura" começa com tudo marcado (ABV-12), mas grava cada id de ingresso (ABV-09): até 300 mil ids por abertura, multiplicados a cada "Duplicar", e o ingresso criado depois fica de fora em silêncio. Decidir se marcar o grupo ou a sessão grava a regra ("todo o grupo, inclusive os criados depois"). Até lá, a gravação por id continua.
- BKS-111 (busca sempre) × UI-LST-001 (sem busca com poucos itens): a busca de aberturas aparece com uma abertura só (M15). Escolher uma regra.
- O atalho diz "Abertura de vendas" e a página "Aberturas de vendas" (M7): o nome do atalho vem de `components/grupos-do-evento.ts`, da frente Shell.
- O estado dos badges das abas do painel no celular (M5) e a sugestão do fim com digitação real não foram vistos no navegador automatizado (os segmentos de data não aceitam digitação simulada).

- ~~Escolher os itens saiu da vista direta para o menu ⋮ da linha (ABV-10).~~ Resolvido em 22/11/2026: os itens ficam no painel da abertura, que abre pelo nome, pelo lápis e por "Nova abertura" (ABV-11).

- Ingresso criado depois num setor que já está numa abertura fica fora dela até ser marcado. Avisar no cadastro do ingresso? A combinar.

- Aplicar as aberturas na compra (período e itens) junto com o lote ligado.
- Item fora de qualquer abertura: vende ou não? Hoje a tela não diz; confirmar com Produto.
- Remover um ingresso, produto ou combo do catálogo não o tira das aberturas (o seletor só mostra os que existem).

## Fontes

Nenhum link de Figma, Confluence ou Jira no código desta pasta.
