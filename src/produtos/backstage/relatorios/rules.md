# Relatórios: regras

> **Rotas:** `/backstage/relatorios/vendas-por-grupo`, `/backstage/relatorios/transacoes`, `/backstage/relatorios/transacoes2`, `/backstage/relatorios/transacoes3`, `/backstage/relatorios/acesso`, `/backstage/relatorios/bordero`, `/backstage/relatorios/transferencias`, `/backstage/relatorios/comparativos`, `/backstage/relatorios/questionarios`, `/backstage/relatorios/comissarios`, `/backstage/relatorios/relatorio-personalizado`
> **No menu:** Backstage › menu da organização › Relatórios (e, pelo menu do evento, com "Voltar para o evento"); dentro, a lista Vendas, Transações, Acesso, Borderô, Transferências, Comparativos, Respostas do questionário, Lista de usuários, Comissários (selo "Novo"), Relatório personalizado (selo "IA"). No celular, a lista vira um select (REL-238).
> **Versão em uso:** única. Desde 21/11/2026 `transacoes2` e `transacoes3` levam para `/backstage/relatorios/transacoes` (BKS-35); `pages/Transacoes2.tsx` e `pages/Transacoes3.tsx` ficam como histórico, sem rota.
> **Revisado em:** 2026-11-23 (Vendas com as peças comuns: REL-242 a REL-246)

> **Na organização (12/11/2026):** Relatórios saiu do menu do evento para o da organização, com a lista empilhada à esquerda, o evento selecionado no topo e "Todos os eventos" (`backstage/rules.md` BKS-26 e BKS-27). Em Vendas, os cartões de métrica deixaram de ter largura mínima de 320 px para caber ao lado da lista.

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

Relatórios do evento para o produtor: vendas, transações, acesso, borderô, transferências,
respostas de questionários, comparação com outros eventos e um relatório montado por pedido em
linguagem natural (IA). Todos são de leitura; as versões 2 e 3 de Transações simulam edição de pedido.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Inscritos da Lista de usuários | `data/lista-de-usuarios.ts` (mock fictício e fixo por evento) | não |
| Vendas e Borderô | `@/plataforma`, evento em contexto: histórico + pedidos pagos (`data/vendas-banco.ts`), no mesmo formato do dataset estático. O Borderô divide o histórico por canal, ingresso e meio de pagamento pelas proporções do próprio evento (`porCanal`, `porLote`, `pagamentos`) e os pedidos reais pelo canal, emissor e meio reais (REL-123) | não |
| Portões, faixas de horário e proporções de demografia do Relatório personalizado | proporções fixas de `@/reports/event-dataset`, aplicadas às vendas do evento | não |
| Nome, sessões e janela de vendas dos relatórios | `data/event.ts`: espelho do evento em contexto, ou de todos os eventos da organização no escopo "Todos os eventos" (REL-16) | não |
| Transações (v1) | `@/plataforma`: pedidos do evento (reais, com o comprador) + transações fictícias geradas do catálogo e do histórico de vendas do evento (REL-64) | não |
| Transações v2 e v3 (sem rota) | gerador de inscrições de corrida dentro de `pages/Transacoes2.tsx` e `Transacoes3.tsx` | não |
| Acesso | `@/plataforma`, evento em contexto ou todos os eventos: totais, faixas de horário e validação por grupo do dataset do evento (`data/vendas-banco.ts`, taxa de validação de 92%); lista = ingressos emitidos reais (válido, utilizado) + pessoas fictícias geradas do catálogo e do histórico do evento, até 3 mil por evento | não |
| Transferências | totais do dataset do evento (12% dos vendidos); lista = transferências reais (ingresso emitido `transferido` → o que o substituiu no mesmo pedido) + fictícias geradas do catálogo e do histórico do evento, até 1.500 por evento | não |
| Respostas de questionário | `Evento.perguntas` + catálogo, histórico por lote e ingressos emitidos (`data/questionarios.ts`); respostas fictícias determinísticas (REL-169) | edição só no estado do painel |
| Combos, produtos, cupons e mix de Vendas | as mesmas linhas do dataset do evento que somam os totais (`data/vendas-banco.ts`, `detalhe`): combos, produtos e cupons só dos pedidos pagos do banco; desconto = cupom real do pedido (REL-213). Até 22/11/2026 eram mocks fixos, escalados pelo período | não |
| Árvore de detalhamento de Vendas | sessões do evento › setores com as vendas do dataset do evento, divididas igualmente entre as sessões; tipos e lotes por proporção fixa | não |
| Eventos de Comparativos | eventos da organização em `@/plataforma`: série diária do histórico + pedidos pagos, catálogo para capacidade e lotes (REL-153) | não |
| Colunas exportáveis | `data/export-fields.ts` (v1, v3) e `data/export-fields2.ts` (v2) | seleção só em memória |
| Relatório personalizado | dataset do evento (`useDatasetDoEvento`) via `useFonteDoRelatorio` (`data/relatorio-ia.ts`) + OpenRouter ou roteamento local (REL-189) | blocos só em memória |

Desde 21/11/2026 todos os relatórios em uso leem o evento em contexto (ou todos os eventos da organização) de `@/plataforma`; o que o banco não tem é gerado de forma determinística a partir das vendas do próprio evento.

## Regras

### Comum a todos
- **REL-01** ~~Todo relatório abre dentro do `BackstageLayout`, com o item do menu do evento destacado.~~ Substituída por REL-240 (Relatórios saiu do menu do evento em 12/11/2026).
- **REL-240** Todo relatório abre dentro do `BackstageLayout`, com Relatórios marcado no menu da organização (ou no menu do evento, quando aberto por ele, BKS-90) e o relatório atual marcado na lista. _(pages/*.tsx, ../components/navegacao-de-secao.tsx)_
- **REL-02** ~~O botão "Filtros" abre um painel com Período, Sessão (só se o relatório passar sessões) e um campo por filtro do relatório.~~ Substituída por REL-220.
- **REL-03** As mudanças no painel são rascunho; só valem ao clicar "Aplicar", que mostra a contagem entre parênteses. _(components/RelatorioFilterSlideout.tsx)_
- **REL-04** ~~O botão "Filtros" mostra um contador com o número de filtros aplicados (período, sessão e campos com valor).~~ Substituída por REL-220 (o período não conta mais).
- **REL-05** ~~"Limpar tudo" volta ao período inicial do relatório, sessão "Todas" e sem campos.~~ Substituída por REL-220: "Limpar tudo" limpa sessão e campos e mantém o período. Trocar de evento ou de escopo recomeça os filtros no período inicial do novo evento. _(components/relatorio-filters.tsx, pages/*.tsx)_
- **REL-06** Filtros de lista fechada são multisseleção: a linha passa se bater com qualquer valor marcado. _(components/RelatorioFilterSlideout.tsx, components/relatorio-filters.tsx)_
- **REL-07** Filtro de texto usa "contém", sem diferenciar maiúsculas. _(components/RelatorioFilterSlideout.tsx, components/relatorio-filters.tsx)_
- **REL-08** Período inclui o dia final inteiro (até 23:59:59). _(components/relatorio-filters.tsx)_
- **REL-09** ~~Abaixo do título, uma faixa mostra "Horário de Brasília (GMT-3)", "Moeda: BRL (R$)" e os filtros.~~ Fuso e moeda foram para o topo de todos os relatórios (`backstage/rules.md` BKS-28); abaixo do título fica só um chip removível por filtro aplicado (sessão e campos; o período está no botão, REL-220), mais "Limpar tudo". _(components/RelatorioPageHeader.tsx)_
- **REL-10** ~~Relatórios com só o botão de período (Vendas, Relatório personalizado) aplicam a data na hora e não mostram a faixa de chips.~~ Substituída por REL-220: todos os relatórios com período usam o mesmo botão.
- **REL-220** Um controle de período só (UI-DS-003): o botão de datas do DS, que aplica na hora, em Vendas, Transações, Acesso, Borderô, Transferências e Relatório personalizado. "Filtros" fica ao lado só quando o relatório tem campos ou sessões, abre só eles (sem Período), alinhado à esquerda do botão para não cobrir a lista de relatórios, e o contador não conta o período. A faixa de chips mostra sessão e campos (o período já está no botão); "Limpar tudo" mantém o período. Até 22/11/2026 havia dois controles: o botão (Vendas, Relatório personalizado) e o Período dentro de Filtros (os outros); o Borderô não tinha nenhum, e o popover de Filtros de Transações abria para a esquerda, por cima da lista. _(components/RelatorioPageHeader.tsx, components/RelatorioFilterSlideout.tsx, components/FilterPopover.tsx, components/relatorio-filters.tsx)_
- **REL-221** Um desenho de métrica só: o painel de métricas dos relatórios (células separadas por linhas finas, rótulo, número em mono, complemento ao lado e apoio embaixo), em Vendas, Transações, Acesso, Borderô, Transferências e Comissários. Até 22/11/2026 eram três (este, o `MetricsIcon03` com ícone e a faixa de Comissários). Em Transações, o painel mostra Total transacionado, Transações e Ingressos; em Acesso, a taxa de validação usa a barra de pontos (REL-202) no lugar da rosca. _(components/visual-dos-relatorios.tsx `PainelDeMetricas`, `MetricaDoRelatorio`)_
- **REL-222** Carregando: enquanto o banco não responde, o relatório mostra o esqueleto (painel de métricas e dois blocos pulsando; parado com "reduzir movimento"), sem atraso fixo. Antes, a tela mostrava zeros e vazios até os dados chegarem. Não há estado de erro de leitura: sem o banco compartilhado, a plataforma usa a cópia local. _(components/estado-dos-relatorios.tsx, pages/*.tsx)_
- **REL-223** Item aberto no painel lateral vai à URL (`?item=<id>`; no Borderô, `?painel=alteracoes`): recarregar ou mandar o link abre o mesmo item; fechar tira o parâmetro. Vale para Acesso, Transferências, Transações, Respostas do questionário e Borderô. Abrir e fechar trocam a URL sem empilhar histórico. _(components/estado-dos-relatorios.tsx `useItemNaUrl`)_
- **REL-225** Todos os detalhes abrem no painel lateral do DS (`SlideoutMenu`), com título, conteúdo que rola e "Fechar" no rodapé; tela cheia no celular. Antes, Acesso, Borderô, Transferências, Respostas do questionário e Comparativos ("Ajustar comparação") tinham modais feitos à mão de 520 px. _(components/TabelaLista.tsx `PainelLateral`, pages/Comparativos.tsx)_
- **REL-226** Linha de tabela continua linha (sem `role="button"`): nas árvores, o botão da primeira célula abre e fecha o grupo (com `aria-expanded`) e, no celular, o rótulo da linha final é o botão que abre os detalhes; nas listas de Acesso e Transações, o nome do portador ou o ID do pedido é o botão. O clique em qualquer ponto da linha continua valendo. _(components/TabelaLista.tsx `AlternarDaArvore`, `AbrirDaLinha`, pages/*.tsx)_
- **REL-227** Em "Todos os eventos", cada linha diz de qual evento é (UI-LST-004): no Detalhamento das vendas, a sessão mostra o nome do evento em até duas linhas (inteiro ao passar o cursor) e a data embaixo (antes, "02/10 · D-EDGE RIO apres…" cortado e igual em várias); a descrição da sessão nos filtros e detalhes leva o evento ("Nome do evento, 2 out 2026, 23:00"); em Acesso, o evento fica embaixo do nome do portador e nos detalhes; em Transferências, na coluna Evento e nos detalhes; em Respostas do questionário, o grupo leva o evento entre parênteses. _(data/event.ts, pages/VendasPorGrupo.tsx, pages/Acesso.tsx, pages/Transferencias.tsx, data/questionarios.ts)_
- **REL-239** Textos sem separador solto (T9): "·", "•" e "›" viraram vírgula, parênteses ou frase ("Grupo, ingresso e lote", "Bilheteria (emissor)", "12 (34%)"). Datas e horas num formato só, "26 nov 2026, 20:00" (`dataEHora`), em sessões, transferências, alterações do Borderô e respostas. Sem caixa alta: canais do Borderô ("Online", não "ONLINE"), etapas do funil, cabeçalhos do detalhamento e grupos do modal de colunas; "Cartão de crédito" e "Cartão de débito" em minúscula. Comparativos sem o selo "Novo" na lista (BKS-08). _(data/event.ts, pages/*.tsx, components/funil-ao-vivo.tsx, components/ManageColumnsModal.tsx, ../components/navegacao-de-secao.tsx)_
- **REL-219** Dentro dos Relatórios só o título do relatório (`h1.titulo-do-relatorio`, do `RelatorioPageHeader`) fica para leitor de tela (BKS-26). Até 22/11/2026 todo `h1` dentro do relatório sumia, inclusive os títulos dos estados vazios do DS ("Nenhuma pessoa cadastrada…", "Este evento não tem questionário", "Nenhuma transação encontrada") e o "O que você quer descobrir?" do Relatório personalizado, que agora é `h2` (REL-169, REL-170, LUS-07). _(../components/navegacao-de-secao.tsx, components/RelatorioPageHeader.tsx, pages/RelatorioPersonalizado.tsx)_
- **REL-11** O menu "Exportar" lista "Arquivo Excel", "Arquivo .CSV" e "Arquivo PDF", ou o subconjunto que o relatório passar. _(components/RelatorioPageHeader.tsx)_
- **REL-211** O cabeçalho do relatório gruda no topo com o fundo da página (`bg-primary_alt`, o do shell do Backstage) nos dois modos, para o que rola por baixo sumir sem faixa. Até 21/11/2026 era `bg-secondary` no claro (um tom mais claro que a página) e `#0a0a0a` fixo no escuro. Os balões dos gráficos de Acesso usam as cores do tooltip do DS (título `text-white`, apoio `text-tooltip-supporting-text`). _(components/RelatorioPageHeader.tsx, pages/Acesso.tsx)_
- **REL-12** Exportar não gera arquivo: só mostra um toast "Exportando {FORMATO}". _(pages/Acesso.tsx, pages/Bordero.tsx, pages/Transacoes*.tsx)_
- **REL-13** Cabeçalho ordenável: primeiro clique ordena crescente, o seguinte inverte; seta indica a direção. _(utils/useSortableTable.ts, components/SortableHeader.tsx)_
- **REL-14** Texto ordena em pt-BR com números naturais; datas e valores ordenam como número. _(utils/useSortableTable.ts)_
- **REL-237** Um jeito só de ordenar: o cabeçalho da coluna. Comissários trocou os botões "Mais vendas / A repassar / Nome" pela tabela do DS ordenável (COM-120); Transferências também ordena pelo cabeçalho (REL-232). _(../comissarios/pages/relatorio-comissarios.tsx, pages/Transferencias.tsx)_
- **REL-15** Valores em R$ e números em pt-BR. _(data/event.ts)_
- **REL-16** Nome, sessões e janela de vendas dos relatórios são os do evento em contexto; no escopo "Todos os eventos", as sessões de todos os eventos da organização ("Nome (dd/mm)"; até 22/11/2026, "dd/mm · Nome", REL-227) e a janela do primeiro dia com venda ao último evento (ou hoje). A janela começa no primeiro dia do histórico de vendas (ou na criação do evento) e vai até o dia do evento ou hoje, o que for depois. Trocar de evento ou de escopo redesenha o relatório. _(data/event.ts, components/relatorio-filters.tsx)_

### Tabelas no celular (tabela-lista, UI-MOB-005)
- **REL-182** Abaixo de 768 px, nenhuma tabela rola para o lado: a página e cada contêiner cabem em 390 px. _(components/TabelaLista.tsx)_
- **REL-183** Lista de Transações, Produtos e Ingressos com cupom viram tabela-lista no celular: título, uma linha de apoio, valor à direita e seta; o toque abre "Detalhes" em tela cheia com todas as colunas. _(components/TabelaLista.tsx, pages/Transacoes.tsx, pages/VendasPorGrupo.tsx)_
- **REL-184** Em Transações, os detalhes mostram as colunas escolhidas em "Editar colunas", na mesma ordem. _(pages/Transacoes.tsx)_
- **REL-185** Tabelas em árvore (Detalhamento das vendas, Ocupação, Ingressos avulsos, Borderô, Validação por grupo): o grupo abre e fecha pela linha (e pelo botão da primeira célula, REL-226); no celular, a linha final abre os detalhes com as colunas escondidas, e o subtítulo diz de onde ela é ("Online, Pista"). No desktop, a linha final não abre nada: todas as colunas já estão na tela. _(pages/VendasPorGrupo.tsx, pages/Bordero.tsx, pages/Acesso.tsx)_
- **REL-224** As linhas filhas das árvores entram com transição de 180 ms (aparecem e descem 4 px); com "reduzir movimento", aparecem sem animar. Fechar é imediato. Antes, abriam de uma vez. _(components/estado-dos-relatorios.tsx `useLinhaFilhaAnimada`)_
- **REL-186** Tabelas pequenas em que tudo cabe (status e meios de pagamento de Transações) descem a contagem para baixo do nome no celular, sem clique. _(pages/Transacoes.tsx)_
- **REL-187** Na lista de portadores de Acesso, o status desce para baixo do CPF no celular. ~~Em Transferências, o código e o selo ficam numa linha, o fluxo comprador → portador embaixo, sem avatar.~~ Transferências: substituída por REL-232. _(pages/Acesso.tsx)_
- **REL-238** No celular (abaixo de 768 px), a lista de relatórios vira um select do DS ("Relatório") que leva ao relatório escolhido; antes, os 10 itens quebravam linha e ocupavam 450 px antes do relatório. No desktop, a lista empilhada segue. _(../components/navegacao-de-secao.tsx)_

### Editar colunas (listas de Transações)
- **REL-212** "Editar colunas" abre o modal com duas áreas: opções agrupadas e colunas selecionadas. _(components/ManageColumnsModal.tsx, components/ManageColumnsModal2.tsx)_ Até 22/11/2026 tinha o ID REL-16, repetido com a regra de nome, sessões e janela de vendas (REL-16, que fica com esse ID).
- **REL-17** "ID do Pedido" é fixa e sempre a primeira; tooltip "Esta opção não pode ser removida.". _(components/ManageColumnsModal.tsx)_
- **REL-18** Há busca nas duas áreas, "Selecionar todas"/"Limpar seleção" geral e por grupo, remoção por X e reordenação por arraste. _(components/ManageColumnsModal.tsx)_
- **REL-19** Com mais de 50 colunas, "Salvar" fica desabilitado com o tooltip "Para mais de 50 colunas, exporte como .CSV". _(components/ManageColumnsModal.tsx)_
- **REL-20** "Exportar .csv" fica em "Exportando..." por 5 s e mostra o toast "Exportação concluída" / "N colunas foram exportadas.". Nenhum arquivo é gerado. _(components/ManageColumnsModal.tsx, pages/Transacoes*.tsx)_
- **REL-21** "Restaurar padrão" volta à seleção padrão. Fechar sem salvar descarta o rascunho; Esc fecha. _(components/ManageColumnsModal.tsx)_
- **REL-22** No celular, o modal vira painel inferior. _(components/ManageColumnsModal.tsx)_

### Vendas
- **REL-30** Título "Vendas", só com o botão de período, que abre no período completo de vendas. _(pages/VendasPorGrupo.tsx)_
- **REL-31** Métricas num painel só, em células separadas por linhas finas: Valor total (em destaque), Valor total c/ desconto, Desconto, Ticket médio, Quantidade de itens e Ocupação (%, "vendidos de capacidade" e barra de pontos). Números em fonte mono com algarismos tabulares (REL-201). _(pages/VendasPorGrupo.tsx)_
- **REL-32** Desconto = valor total − valor c/ desconto, nunca negativo. _(pages/VendasPorGrupo.tsx)_
- **REL-33** Ticket médio = valor total bruto ÷ quantidade de itens (ingressos, combos e produtos); 0 sem itens. _(pages/VendasPorGrupo.tsx)_
- **REL-34** Ocupação = ingressos vendidos ÷ capacidade somada dos grupos, em %. _(pages/VendasPorGrupo.tsx)_
- **REL-35** Gráfico "Total transacionado e número de ingressos": barras por dia de uma medida por vez, com a troca "Valor / Ingressos" no cabeçalho e o total do período em destaque acima; um eixo só, à direita, com moeda compacta. A barra sob o cursor acende. Antes eram barras de valor e área de quantidade em dois eixos. _(components/TransacionadoChart.tsx)_
- **REL-36** ~~"Mix de receita" divide Ingressos, Combos e Produtos (só as categorias com venda no período) com quantidade, bruto, desconto e valor c/ desconto; a composição aparece numa grade de 100 quadrados (REL-203), no lugar da pizza. A soma do mix é o valor total do topo (REL-213).~~ Substituída por REL-242.
- **REL-37** ~~No mix, valor c/ desconto = bruto × 0,97.~~ Substituída por REL-213 em 22/11/2026: o desconto do mix é o dos cupons reais, o mesmo do topo.
- **REL-38** ~~"Detalhamento das vendas" abre em colunas: Sessão › Tipo do item › Grupo › Tipo de ingresso › Lote; "Limpar seleção" volta ao início.~~ Substituída por REL-243.
- **REL-39** ~~"Ocupação por grupo" lista Grupo • Ingresso • Lote, Estoque, Ingressos e a ocupação em barra de pontos com o % em mono; a linha do grupo expande.~~ Substituída por REL-244.
- **REL-40** Tabelas "Combos", "Produtos", "Ingressos avulsos" (antes "Tickets Avulso") e "Quantidade de ingressos com cupom". Combos e Produtos são a mesma tabela, uma linha por item vendido; no celular, os detalhes do cupom listam os itens comprados com ele. Sem venda no período, cada bloco diz "Nenhum combo vendido no período.", "Nenhum produto vendido no período." ou "Nenhum pedido com cupom no período."; "Ocupação por grupo" e "Ingressos avulsos" dizem "Nenhum ingresso vendido no período." (antes, cabeçalho e total zerado). Em Combos e Produtos, o nome quebra linha e a tabela não rola para o lado no desktop (REL-228). _(pages/VendasPorGrupo.tsx)_
- **REL-41** A tabela de cupons abre ordenada por quantidade, decrescente. _(pages/VendasPorGrupo.tsx)_
- **REL-228** Combos e Produtos não rolam para o lado no desktop: o nome quebra linha (antes, todas as colunas sem quebra estouravam a largura). _(pages/VendasPorGrupo.tsx)_
- **REL-42** ~~Combos, produtos, cupons e detalhamento são escalados pela fração do período (itens do período ÷ itens totais).~~ Substituída por REL-213: combos, produtos e cupons vêm das vendas do próprio período; o detalhamento já é do período.
- **REL-43** Sem botão de exportar. _(pages/VendasPorGrupo.tsx)_
- **REL-213** Números da mesma tela batem (UI-EVI-002): métricas do topo, gráfico, mix, Ingressos avulsos, Combos, Produtos e cupons saem das mesmas linhas do dataset (escopo e período aplicados). Pedido pago com cupom: o desconto (já fora do total) é dividido entre as linhas do pedido pelo valor de cada uma; o histórico de vendas não tem cupom (desconto 0). Linha de combo do pedido = categoria Combos; produto = Produtos; ingresso = Ingressos (os ingressos de dentro de um combo também, com valor 0); linha cancelada não entra. "Ingressos avulsos" mostra o valor real de cada grupo (antes, um preço fixo por setor e 10% de desconto inventado em alguns lotes); o total dela é o Ingressos do mix. Percentuais em pt-BR ("26,4%"). Até 22/11/2026 Combos, Produtos e Cupons eram mocks de outro evento, iguais em todos os eventos, e o mix tinha 3% de desconto fixo. _(data/vendas-banco.ts `detalhar`, pages/VendasPorGrupo.tsx)_
- **REL-242** "Mix de receita" no desenho dos blocos de status e meios de pagamento de Transações: uma barra horizontal dividida pelo valor c/ desconto de cada categoria (Ingressos, Combos e Produtos, só as com venda no período) e, embaixo, a tabela do DS com Categoria (marca da cor, % do total e nome), Quantidade, Valor total bruto, Desconto e Valor total c/ desconto. Cores da paleta categórica (REL-214): Ingressos `utility-blue-500`, Combos `utility-orange-600`, Produtos `utility-indigo-700` (antes brand, azul e laranja). No celular, tabela-lista (nome, "% do total", valor c/ desconto) e o toque abre os quatro valores. Sem venda: "Nenhuma venda no período.". A soma do mix segue sendo o valor total do topo (REL-213). Até 23/11/2026 era a grade de 100 quadrados com uma lista própria (REL-36, REL-203). _(pages/VendasPorGrupo.tsx `MixReceitaCard`)_
- **REL-243** "Detalhamento das vendas" é a tabela em árvore comum (a do Borderô, REL-185), ~~em cinco níveis (sessão, tipo do item, grupo, tipo de ingresso e lote)~~ em três níveis desde 23/11/2026 (REL-247), com as colunas Participação (% do item entre os irmãos, uma casa) e Ingressos (a única no celular). A ocupação da sessão (vendidos ÷ lugares, "33,2% de 1.320 lugares") fica na linha de apoio dela, depois da data em "Todos os eventos" (REL-227). No celular, o recuo é de 16 px por nível e a linha final abre os detalhes. Os números são os mesmos de antes. Até 23/11/2026 eram colunas lado a lado com cartões, linhas curvas entre elas, fundo pontilhado, "Limpar seleção" e o aviso "Selecione uma sessão" (REL-38). _(pages/VendasPorGrupo.tsx `DetalhamentoCard`, components/tabela-em-arvore.tsx)_
- **REL-244** "Ocupação por grupo" e "Ingressos avulsos" usam a mesma tabela em árvore (REL-243), sem ordenação, com o grupo e o ingresso abrindo pela linha. Ocupação: Estoque, Ingressos e Ocupação na barra de progresso do DS (`ProgressBar`, % ao lado; antes, barra de pontos com o % em mono, REL-39). Ingressos avulsos: as mesmas colunas e o "Total geral", que agora mostra também o valor unitário médio (total ÷ quantidade, como no Borderô). A barra de pontos (REL-202) fica só no painel de métricas. No desktop as colunas tomam a largura do conteúdo e o cabeçalho quebra linha, para as seis colunas caberem sem rolar para o lado (antes, Ingressos avulsos rolava 72 px no evento). _(pages/VendasPorGrupo.tsx, components/tabela-em-arvore.tsx)_
- **REL-245** Combos, Produtos e "Quantidade de ingressos com cupom" usam a tabela do DS (`Table`, como Transferências e Comissários), ordenável pelo cabeçalho (REL-237): Combos e Produtos abrem pelo valor total bruto, decrescente; cupons pela quantidade, decrescente (REL-41). Os rótulos das colunas ficam em sm (o rótulo padrão da tabela do DS é xs, abaixo do mínimo). No celular, a tabela-lista de sempre (REL-183). _(pages/VendasPorGrupo.tsx `ItensVendidosCard`, `IngressosComCupomCard`)_
- **REL-246** Todo bloco de Vendas é o painel dos relatórios (REL-200) com o conteúdo abaixo de uma linha fina, como a lista de Transferências; o vazio de bloco é a frase centrada dos outros relatórios ("Nenhum combo vendido no período.", REL-40). Ficam como estavam: o painel de métricas (REL-31), o funil ao vivo logo abaixo dele (REL-205 a REL-210) e o gráfico (REL-35). _(pages/VendasPorGrupo.tsx)_
- **REL-247** O "Detalhamento das vendas" usa os números do mesmo dataset dos totais (REL-213), em três níveis: sessão, tipo do item (Ingressos) e grupo. Cada sessão mostra só os grupos do próprio evento (em "Todos os eventos", o grupo vem com o evento no nome) e a ocupação dela conta só os lugares desses grupos. Desde 23/11/2026: antes, em "Todos os eventos", cada sessão somava os grupos de todos os eventos (as três mostravam 577), e os níveis de tipo de ingresso e lote eram proporções fixas inventadas ("Meia-Entrada" 42%, "VIP" 8%). O dataset não separa vendas por sessão, tipo de ingresso nem lote: evento com várias sessões divide o grupo igualmente entre elas (Em aberto). Conferido em "Todos os eventos": 438 + 607 + 688 = 1.733, o total do relatório. _(pages/VendasPorGrupo.tsx, `buildDrillTree`)_
- **REL-248** No Funil de vendas ao vivo, a etapa Pagamento tem metade do volume de antes: Atribuição → Pagamento passa de 92% a 99% para 46% a 50% (começa em 48%). A conversão média passa de 23% para 12%, para "agora" e "média" continuarem comparáveis. Desde 23/11/2026, pedido do Victor. _(components/funil-ao-vivo.tsx)_

### Visual dos relatórios
- **REL-200** Os blocos dos relatórios usam o painel dos relatórios: cantos de 16 px, fundo primário, contorno fino, título e subtítulo sem linha embaixo, ações à direita do título. Aplicado em Vendas (REL-246) e na lista de Transferências; os outros blocos ainda usam o cartão antigo. As métricas de todos usam o painel de métricas (REL-221). _(components/visual-dos-relatorios.tsx)_
- **REL-201** Números de destaque em fonte mono com algarismos tabulares, sem quebra. _(components/visual-dos-relatorios.tsx, `NUMERO_DO_RELATORIO`)_
- **REL-202** Proporções (ocupação) em barra de pontos: pontos acesos na cor primária e apagados em cinza; o número fica ao lado, em texto. _(components/visual-dos-relatorios.tsx, `BarraDePontos`)_
- **REL-203** ~~Composição (mix) em grade de 100 quadrados, um por ponto percentual, distribuídos pelo maior resto para somar 100; a legenda com os números segue ao lado. _(components/visual-dos-relatorios.tsx, `GradeDeQuadrados`)_~~ Substituída por REL-242 (o `GradeDeQuadrados` ficou sem uso).
- **REL-204** Gráfico com um eixo só; duas medidas de escala diferente viram uma troca no cabeçalho, nunca dois eixos. _(components/TransacionadoChart.tsx)_
- **REL-216** O eixo do gráfico de transacionado tem marcas redondas (1, 2, 2,5 ou 5 × 10ⁿ, cerca de 4 intervalos) e a largura do rótulo mais longo, com a abreviação inteira ("R$ 3,8 mil", "R$ 100 mil"); o primeiro dia do eixo X tem margem para não cortar. O total em destaque é a soma das barras sem arredondar por dia: em Transações, igual ao cartão "Total transacionado". Antes, 56/44 px fixos cortavam "R$ 100 mil" e os dias eram arredondados (R$ 87.557,90 no cartão e R$ 87.563,00 no gráfico). _(components/TransacionadoChart.tsx, pages/Transacoes.tsx)_
- **REL-214** Cor de série é identidade, não estado: sem verde, amarelo ou vermelho (as cores de status do DS). Paleta categórica dos relatórios, nesta ordem: `utility-blue-500`, `utility-orange-600`, `utility-indigo-700`, `utility-pink-500`, validada no validador de dataviz (todas as duplas, claro e escuro; no escuro os tons ficam um pouco claros demais para a faixa de luminosidade, sem perder separação). Rótulos e números ficam em cor de texto, com a marca colorida ao lado. Em Comparativos, o nome da série no gráfico fica em `text-secondary` com um ● na cor da série, e a variação mostra só a seta em verde ou vermelho, com o número em cor neutra. Em Transações, Pix e Cartão usam as duas primeiras cores (antes verde e azul). _(pages/Comparativos.tsx `PALETTE`, pages/Transacoes.tsx `MEIO_FILL`)_
- **REL-205** Vendas tem o "Funil de vendas ao vivo" logo abaixo das métricas: as etapas Seleção de ingresso, Produto, Atribuição e Pagamento lado a lado num trilho com nós, cada uma com o rótulo, quantas pessoas estão nela agora (número mono) e o percentual sobre a etapa anterior; na primeira, "pessoas agora". Embaixo, quanto de quem escolhe o ingresso chega ao pagamento. Selo "Ao vivo" com ponto verde pulsando no cabeçalho. _(components/funil-ao-vivo.tsx, pages/VendasPorGrupo.tsx)_
- **REL-206** O volume vira partículas que correm da esquerda para a direita dentro de um funil horizontal: a altura de cada etapa é proporcional ao volume (com piso para a etapa não sumir) e muda suave entre as etapas; na passagem, a fração que não segue some na linha azul entre as etapas, sem escapar para cima ou para baixo, e volta a entrar no começo do funil. Como todas andam na mesma velocidade, a quantidade de partículas em cada trecho fica proporcional ao volume. Mesma família das partículas do guia, cor pelo tema. _(components/funil-ao-vivo.tsx)_
- **REL-207** Os números são simulados, calibrados pela conversão média de ~~23%~~ 12% (REL-248): quase 80% sai na Seleção de ingresso (passa entre 21% e 29%) e ~~quase todo mundo que segue chega ao pagamento (Produto → Atribuição e Atribuição → Pagamento entre 92% e 99%)~~ Produto → Atribuição entre 92% e 99% e Atribuição → Pagamento entre 46% e 50% (REL-248). A cada 2,2 s a entrada e as taxas andam um pouco dentro dessas faixas; os números correm até o valor novo e o funil se ajusta sem reiniciar. O rodapé mostra a conversão de agora e a média. _(components/funil-ao-vivo.tsx, `useVolumesAoVivo`, `CONVERSAO_MEDIA`)_
- **REL-208** Reduzir movimento: as partículas ficam paradas, já no desenho do funil, e os números trocam sem correr. Fora de vista, a animação pausa. _(components/funil-ao-vivo.tsx)_
- **REL-209** Padrões leves no funil, pela mesma regra da figura de Chladni do guia (passo aleatório proporcional a |f|, quase parado onde f ≈ 0). O padrão se alterna a cada 14 s, com troca suave: filetes ondulados (5, 7 ou 9 filetes) e figuras cimáticas (modos 3/5, 4/7 e 2/5, com as células esticadas para ficarem quadradas no funil comprido e a figura andando junto com o fluxo, para as partículas assentarem). O funil já abre com os filetes formados. _(components/funil-ao-vivo.tsx, `PADROES`)_
- **REL-210** Entre cada etapa, uma linha em blue-600 (token `--color-blue-600`) no lugar da divisa, da altura do funil naquele ponto, com brilho que pulsa de leve, por cima das partículas. Sem cone de luz (a luz em funil invertido saiu). _(components/funil-ao-vivo.tsx)_

### Transações v1 (em uso no menu)
- **REL-50** Título "Transações", abre no período completo de vendas. _(pages/Transacoes.tsx)_
- **REL-51** Filtros: Status, Meio de pagamento, Canal (Bilheteria, Cortesia, Online), Tipo de produto (Ingresso, Produto, Combo) e Cupom (texto). Sem filtro de sessão. _(pages/Transacoes.tsx)_
- **REL-233** "Tipo de produto" compara com os tipos dos itens da transação: pedido do banco = os tipos dos itens dele (Ingresso, Produto, Combo); transação gerada do histórico = Ingresso. Antes comparava com o nome do ingresso (Inteira, Meia…) e nunca casava. _(pages/Transacoes.tsx `tipoProduto`)_
- **REL-52** Status tem a opção extra "Aprovados hoje ({data})", com a data de hoje. _(pages/Transacoes.tsx)_
- **REL-53** Rótulos de status: Aprovado, Pendente, Carrinho Abandonado, Cancelado (estornado) e Reembolso. _(pages/Transacoes.tsx)_
- **REL-54** "Total transacionado" = soma do valor final das linhas filtradas. _(pages/Transacoes.tsx)_
- **REL-55** "Quantidade de ingressos e valor por status" mostra só status com linhas; canal vira "Online + PDV" quando há mais de um; % = valor do status ÷ valor total, arredondado. _(pages/Transacoes.tsx)_
- **REL-56** ~~"Meio de Pagamentos" mostra só Pix e Cartão de Crédito, com % de transações, de ingressos e de valor.~~ Substituída por REL-234.
- **REL-234** "Meios de pagamento" mostra só Pix e Cartão de crédito, com % de transações, de ingressos e de valor. _(pages/Transacoes.tsx)_
- **REL-235** As barras de status e de meios são proporcionais de verdade: sem a largura mínima de 52 px, que distorcia as fatias pequenas; o percentual fica na tabela abaixo (e no título da fatia). _(pages/Transacoes.tsx)_
- **REL-57** Dois gráficos: diário e acumulado de valor e ingressos. _(pages/Transacoes.tsx)_
- **REL-215** Vocabulário de show (o protótipo é de shows e festas): "ingressos" no lugar de "inscrições" nos títulos, colunas e contagens; nas colunas exportáveis, "Dados do ingresso", "ID do ingresso" e "Dados do portador" (Portador, Documento do portador, Nº do documento do portador, E-mail, Telefone e Data de nasc. do portador), no lugar de "atleta". Os ids dos campos (`inscricao_*`, `atleta_*`) não mudaram. _(pages/Transacoes.tsx, data/export-fields.ts)_
- **REL-58** "Lista de transações" mostra o total de linhas, busca por ID, status, setor, comprador, CPF, telefone ou e-mail, e pagina com 50 por página. _(pages/Transacoes.tsx)_
- **REL-59** Buscar ou mudar filtro volta à página 1. _(pages/Transacoes.tsx)_
- **REL-60** CPF e telefone aparecem formatados, sem máscara de ocultação. _(pages/Transacoes.tsx)_
- **REL-61** Exportar da lista oferece só Excel, .CSV e "Editar colunas e exportar". _(pages/Transacoes.tsx)_
- **REL-62** ~~Linha da lista não abre detalhe.~~ Substituída por REL-236.
- **REL-236** A linha da lista abre os detalhes também no desktop (antes, só no celular), no painel lateral com as colunas escolhidas em "Editar colunas" (REL-184); o ID do pedido é o botão para o teclado; o pedido aberto vai à URL (REL-223). _(pages/Transacoes.tsx)_
- **REL-64** As transações são do evento em contexto (ou de todos os eventos da organização, BKS-27): os pedidos do banco entram com o comprador, o canal (site, link e app = Online; Bilheteria; Cortesia), o meio de pagamento, o cupom e o status reais (pago = Aprovado, aguardando pagamento = Pendente, cancelado); somam-se transações fictícias que reproduzem o histórico de vendas do evento (mesmos setores, lotes, preços, dias e volume, até 6 mil por evento), com nomes inventados. As colunas de perguntas de corrida ficam "—" nos pedidos reais. _(pages/Transacoes.tsx `useTransacoes`)_
- **REL-63** Vazio: "Nenhum status corresponde aos filtros." e "Nenhum meio corresponde aos filtros.". _(pages/Transacoes.tsx)_
- **REL-217** Lista sem resultado: o estado vazio do DS na largura visível do cartão (antes, a frase ficava centrada numa célula de 2.790 px, fora da tela), título "Nenhuma transação encontrada" e o texto "Nenhuma transação corresponde a “{busca}” com os filtros aplicados." (ou "…corresponde aos filtros aplicados."). Ação: "Limpar filtros" (limpa a busca e os campos do painel; o período fica) quando há campo aplicado, ou "Limpar busca" quando só há busca. _(pages/Transacoes.tsx)_

### Transações v2 e v3 (comum, fora do menu)
- **REL-70** Mesmos cards, filtros e gráficos da v1. _(pages/Transacoes2.tsx, pages/Transacoes3.tsx)_
- **REL-71** Valor total, valor por status e contagem de transações somam uma vez por pedido; quantidade de inscrições soma por linha. _(pages/Transacoes2.tsx, pages/Transacoes3.tsx)_
- **REL-72** A lista vira "Registro de vendas", com abas "Item" e "Transação"; abre em "Transação". _(pages/Transacoes2.tsx, pages/Transacoes3.tsx)_
- **REL-73** Aba Transação: uma linha por pedido, colunas próprias (padrão: ID do pedido, Status, Informações do comprador, Valor final, Quantidade), editáveis no mesmo modal. _(pages/Transacoes3.tsx)_
- **REL-74** Na aba Transação a busca ignora o setor. _(pages/Transacoes3.tsx)_
- **REL-75** Clicar numa linha da aba Transação abre o painel "Transação" com Dados do comprador, Dados da compra e Itens. _(pages/Transacoes2.tsx, pages/Transacoes3.tsx)_
- **REL-76** "Cupom ou passkey" mostra o cupom; sem cupom, mostra a passkey. _(pages/Transacoes3.tsx)_
- **REL-77** O botão "Editar" só aparece para pedido Aprovado sem link de pagamento pendente. _(pages/Transacoes2.tsx, pages/Transacoes3.tsx)_
- **REL-78** Pedido Reembolso, Cancelado ou Carrinho Abandonado não permite editar respostas do item. _(pages/Transacoes3.tsx)_
- **REL-79** Pedido com link de pagamento pendente mostra o card "Aguardando pagamento" com link copiável e contagem regressiva de 48 h; copiar mostra "Copiado" por 2 s e o toast "Link copiado". _(pages/Transacoes3.tsx)_

### Transações v2: edição dentro do painel
- **REL-80** "Editar" abre a edição de todos os itens no próprio painel: Portador, Item (data › categoria › modalidade) e respostas do questionário. _(pages/Transacoes2.tsx)_
- **REL-81** "Salvar e pagar" exige escolher "Quem pagará pela edição?": "A organização" ou "O comprador"; sem escolha, erro "Selecione quem pagará pela edição" e rolagem até o campo. _(pages/Transacoes2.tsx)_
- **REL-82** Sem alteração, "Salvar e pagar" não faz nada e mostra o tooltip "Nenhuma edição foi feita". _(pages/Transacoes2.tsx)_
- **REL-83** Salvar leva 3 s ("Salvando..."). _(pages/Transacoes2.tsx)_
- **REL-84** Organização paga: aplica na hora e mostra "Respostas atualizadas". _(pages/Transacoes2.tsx)_
- **REL-85** Comprador paga: mostra antes → depois, gera link de pagamento com prazo de 48 h, marca o item "Em edição" e mostra "Pagamento gerado". _(pages/Transacoes2.tsx)_
- **REL-86** Custo de edição por item = 5% do valor final do item (novo valor, se trocou de item). _(pages/Transacoes2.tsx)_
- **REL-87** Marca de tênis esgotada (Mizuno) exige marcar "Aumentar estoque para continuar"; contato de emergência vazio bloqueia o salvamento. _(pages/Transacoes2.tsx)_
- **REL-88** "Cancelar" desfaz as edições de todos os itens. _(pages/Transacoes2.tsx)_

### Transações v3: edição em página própria
- **REL-90** "Editar" (ou "Ver edição", se o pedido já está em edição) fecha o painel e abre a página "O que você quer mudar?", com os itens em acordeão, um aberto por vez. _(pages/Transacoes3.tsx)_
- **REL-91** Cada item edita Portador (e-mail), Item (Sessão › Categoria › Modalidade, já preenchidos) e Questionário. _(pages/Transacoes3.tsx)_
- **REL-92** Portador: e-mail válido dispara validação após 0,5 s, spinner por 2 s e confirmação com os dados do novo portador. _(pages/Transacoes3.tsx)_
- **REL-93** Trocar a sessão limpa categoria e modalidade; cada campo só habilita depois do anterior. _(pages/Transacoes3.tsx)_
- **REL-94** Categoria "PCD", modalidade "Corrida 42km" e marca "Mizuno" aparecem esgotadas; trocar para elas exige "Aumentar estoque para continuar". Manter a opção original não exige. _(pages/Transacoes3.tsx)_
- **REL-95** Erros só aparecem depois do primeiro clique em "Salvar e gerar pagamento": "Informe um e-mail válido para continuar", "Selecione uma categoria/modalidade para continuar", "Sem estoque, aumente ou troque a seleção", "Informe um contato de emergência para continuar". _(pages/Transacoes3.tsx)_
- **REL-96** O cabeçalho do item mostra "N erro(s)"; o resumo mostra "Resolva os erros dos itens para continuar.". _(pages/Transacoes3.tsx)_
- **REL-97** "Desfazer edições" de um item pede confirmação e volta o item ao original. _(pages/Transacoes3.tsx)_
- **REL-98** Resumo: Valor original (fixo), Valor atual, Excedente = máx(0, atual − original); queda de valor não gera reembolso. _(pages/Transacoes3.tsx)_
- **REL-99** Custo de edição = 5% do valor de cada item alterado (novo valor, se trocou de item). _(pages/Transacoes3.tsx)_
- **REL-100** Taxa da organização = 2% do excedente (produtor com taxa cadastrada, fixo no mock). _(pages/Transacoes3.tsx)_
- **REL-101** Total = excedente + custo de edição + taxa da organização. _(pages/Transacoes3.tsx)_
- **REL-102** "Quem pagará?" é obrigatório: sem escolha, "Selecione quem pagará para continuar". _(pages/Transacoes3.tsx)_
- **REL-103** Com o comprador pagando, "Absorver custo de edição" separa "Total para o comprador" (excedente + taxa) e "Total para organização" (custo de edição). _(pages/Transacoes3.tsx)_
- **REL-104** "Salvar e gerar pagamento" fica desabilitado sem alteração. _(pages/Transacoes3.tsx)_
- **REL-105** Organização paga: toast "Edição enviada" e modal "Edição enviada" com "Ver como ficou a edição" e "Voltar para Transações". _(pages/Transacoes3.tsx)_
- **REL-106** Comprador paga: gera link `https://cart.ingresse.com/pagamento/{id}` com prazo de 48 h, toast "Link de pagamento gerado" e modal "Aguardando pagamento" com 3 passos. _(pages/Transacoes3.tsx)_
- **REL-107** "Cancelar edição" com link pendente pede confirmação; confirmar invalida o link e tira o pedido de "Em edição". _(pages/Transacoes3.tsx)_
- **REL-108** Voltar da página de edição à lista zera os filtros do relatório. _(pages/Transacoes3.tsx)_

### Acesso
- **REL-110** Título "Acesso", exportação em Excel, .CSV e PDF. _(pages/Acesso.tsx)_
- **REL-111** Filtros: Canal, Grupo, Tipo de ingresso e Status (Validado, Não validado); as opções de Canal, Grupo e Tipo vêm dos dados do evento. _(pages/Acesso.tsx)_
- **REL-112** Métricas no período aplicado: Validados, Não validados e Taxa de validação = validados ÷ (validados + não validados), arredondado, com "N de M" e a barra de pontos (REL-221). _(pages/Acesso.tsx)_
- **REL-113** "Entradas por faixa de horário": faixas de 30 min em torno do início da primeira sessão de cada evento (de 2h30 antes a 1h depois), com pico meia hora antes; destaca a faixa de pico. _(pages/Acesso.tsx)_
- **REL-114** "Validação por grupo" divide cada grupo nos tipos de ingresso do catálogo, pelo peso de venda de cada tipo no histórico; responde ao período e ao filtro Grupo. _(pages/Acesso.tsx)_
- **REL-115** Lista de entradas busca por nome, comprador, IDs, Code, grupo, canal, tipo ou CPF (só dígitos); 100 por página; colunas ordenáveis. _(pages/Acesso.tsx)_
- **REL-116** Clicar numa entrada abre "Detalhes da entrada" com o status ("Validado às 21:30"), Portador, Ingresso (evento, Code, IDs, sessão, canal, grupo, tipo, portão) e Comprador. _(pages/Acesso.tsx)_
- **REL-229** O avatar do portador não tem o ponto verde de "online": validado é status, e a coluna Status já mostra. _(pages/Acesso.tsx)_
- **REL-118** A lista de entradas filtra pela data de compra do ingresso; os ingressos reais aparecem primeiro, com o portador e o comprador do pedido; transferidos e cancelados não entram (o ingresso que substituiu já está na lista); sem CPF no banco, mostra "—". _(pages/Acesso.tsx `useAcessoDoEvento`)_
- **REL-117** Vazio: "Nenhum grupo corresponde aos filtros." e "Nenhuma entrada corresponde aos filtros.". _(pages/Acesso.tsx)_

### Borderô
- **REL-120** Título "Borderô", abre no período completo, com o botão de período (REL-220; antes não havia como mudar o período) e exportação em Excel, .CSV e PDF. Sem filtro de sessão. _(pages/Bordero.tsx)_
- **REL-121** Métricas: Total faturado, Total de ingressos e Ticket médio = faturado ÷ ingressos (visão macro). _(pages/Bordero.tsx)_
- **REL-122** "Detalhamento do borderô" tem três visões: "Visão macro" (Canal › Grupo › Ingresso), "Por PDV" e "Por meios de pagamento". _(pages/Bordero.tsx)_
- **REL-123** Visão macro: Canal (Online, Bilheteria, Cortesias; antes em caixa alta) › Grupo › Ingresso, com os grupos e ingressos do catálogo do evento. O histórico se divide pelas proporções do evento (canal pelo `porCanal`, ingresso pelo vendido × preço de cada lote); os pedidos pagos entram no canal real (site, link e app = Online). "Por PDV": Online, Bilheteria, "Bilheteria ({emissor})" (pedidos reais da bilheteria) e Cortesias. "Por meios de pagamento": Canal › Meio, pelos pagamentos do histórico (Dinheiro só na Bilheteria) e pelo meio real dos pedidos. Subtotal e total mostram valor unitário = total ÷ quantidade. No escopo "Todos os eventos", cada grupo leva o nome do evento entre parênteses. _(pages/Bordero.tsx `useBorderoDoEvento`)_
- **REL-124** Linhas expandem; os nós de topo ordenam por coluna; a tabela mostra total geral. _(pages/Bordero.tsx)_
- **REL-230** As três visões têm as mesmas colunas: Quantidade, Valor unitário e Valor total. "Bundle" e "Produto" saíram da visão macro: eram sempre "-". _(pages/Bordero.tsx)_
- **REL-218** No celular (abaixo de 768 px), as três visões do detalhamento viram um select do DS ("Visão do borderô", rótulo só para leitor de tela) em vez das abas, que eram cortadas em 390 px. No desktop, as abas seguem. _(pages/Bordero.tsx)_
- **REL-125** Aviso "Borderô atualizado": "N transações alteraram o borderô desde o fim do evento.", com "Detalhes" e "Marcar como visto". _(pages/Bordero.tsx)_
- **REL-126** "Detalhes" abre "Transações desde o fim do evento" com tipo (Venda, Cancelamento, Estorno), canal, descrição e variação em ingressos, produtos e valor: os pedidos cancelados reais do evento e cancelamentos e estornos de exemplo dos lotes vendidos (5 por evento; 2 por evento em "Todos os eventos"). _(pages/Bordero.tsx)_
- **REL-127** "Marcar como visto" esconde o aviso até recarregar a página. _(pages/Bordero.tsx)_

### Transferências
- **REL-130** ~~Título "Transferências do Evento", sem exportação.~~ Substituída por REL-232.
- **REL-131** Métricas no período aplicado: Total de transferências, Ingressos transferidos (% = transferências ÷ ingressos vendidos, sem casa decimal à toa: "12%", não "12,0%"; com "dos N vendidos") e Compradores que transferiram (82% das transferências). _(pages/Transferencias.tsx)_
- **REL-132** Filtros de texto: código do ingresso, nome, e-mail e CPF do comprador, do portador anterior e do atual (rótulos em frase: "Nome do comprador"). O período é o botão de datas e filtra a lista pela data da última transferência; abre no período completo de vendas. _(pages/Transferencias.tsx)_
- **REL-133** ~~"Transferências realizadas" lista cards Comprador → Portador, da transferência mais recente para a mais antiga, com quantas vezes o ingresso trocou de mão (o tamanho da cadeia real, ou sorteado nas fictícias); 10 por página, rolando ao topo ao trocar de página.~~ Substituída por REL-232.
- **REL-232** Título "Transferências". "Transferências realizadas" é uma tabela do DS (no lugar dos cartões; os cartões chamavam o portador anterior de "Comprador"): Código, Portador anterior, Portador atual, Evento (só em "Todos os eventos"), Trocas (quantas vezes o ingresso trocou de mão: o tamanho da cadeia real, ou sorteado nas fictícias) e Última transferência; abre da mais recente para a mais antiga, e todas as colunas ordenam pelo cabeçalho. 10 por página; sem resultado, sem paginação. No celular, tabela-lista: portador atual, "De {anterior}" (e o evento) e as trocas. _(pages/Transferencias.tsx)_
- **REL-134** Filtrar volta à página 1. Vazio: "Nenhuma transferência corresponde aos filtros aplicados.". _(pages/Transferencias.tsx)_
- **REL-135** Clicar numa linha abre Identificação (evento, código, ID da transação, sessão, grupo e tipo de ingresso), Comprador original (CPF formatado, "—" sem CPF) e Histórico de transferência com as datas de cada troca. _(pages/Transferencias.tsx)_

### Comparativos
- **REL-140** Título "Comparativos", sem filtros nem exportação; no menu, marca Comparativos. Organização sem eventos com perfil de venda mostra "Ainda não há outros eventos desta organização com vendas para comparar." em vez de quebrar. _(pages/Comparativos.tsx)_
- **REL-141** O evento em contexto é a âncora: primeiro slot, primeira cor, sem opção de remover, base de todas as variações. _(pages/Comparativos.tsx)_
- **REL-142** Abre já comparando com o primeiro outro evento do catálogo. _(pages/Comparativos.tsx)_
- **REL-143** No máximo 4 eventos ao mesmo tempo, contando a âncora. _(pages/Comparativos.tsx)_
- **REL-144** Sem comparação, a tela mostra "Escolha um evento para comparar" e a busca aberta. _(pages/Comparativos.tsx)_
- **REL-145** Busca sem texto mostra os 6 eventos mais recentes; com texto, ordena por relevância (nome exato, começo, começo de palavra, trecho, data) e corta em 50. _(utils/busca-eventos.ts)_
- **REL-146** Busca ignora acentos e maiúsculas e não lista eventos já escolhidos. Sem resultado: "Nenhum evento encontrado". _(utils/busca-eventos.ts, pages/Comparativos.tsx)_
- **REL-147** "Medir por": Faturamento líquido, Ingressos ou Transações. "Alinhar": Dia do evento (D-N) ou Abertura (Dia N). _(pages/Comparativos.tsx)_
- **REL-148** Faturamento líquido = bruto × (1 − taxa retida); a taxa retida é a `taxaServico` do evento (o banco não tem taxa de retenção). _(pages/Comparativos.tsx)_
- **REL-149** Cada série tem cor e traço próprios, atribuídos pela ordem de seleção. _(pages/Comparativos.tsx)_
- **REL-150** Seções: leituras, gráfico acumulado/diário, por mês, "Em que momento cada evento vendeu" (faixas 1-15, 16-30, 31-60, 61-90, mais de 90 dias), "Preço praticado e viradas de lote" e "Os números". _(pages/Comparativos.tsx)_
- **REL-151** Diferença relativa até 1% é mostrada como "Empate técnico". _(pages/Comparativos.tsx)_
- **REL-153** Os eventos são os da organização com vendas no banco: série diária do histórico (até ontem) mais os pedidos pagos no dia do pagamento; transações por dia estimadas pelos pagamentos do histórico (cada pedido real conta 1); capacidade = soma dos lotes. O nome curto sai do nome do evento (sem "X apresenta:" e sem o que vem depois de pres., w/, by ou feat). Evento em contexto sem venda: "Este evento ainda não tem vendas para comparar."; sem outro evento com venda, a mensagem da REL-140. Trocar de evento recomeça a seleção. _(pages/Comparativos.tsx `useCatalogo`)_
- **REL-154** D-0 é a data do evento, ou o último dia com venda quando houve venda depois dela. "Preço praticado e viradas de lote" mostra o ingresso mais vendido de cada evento; o dia de cada virada é estimado pelas vendas acumuladas daquele ingresso. _(pages/Comparativos.tsx)_
- **REL-152** "Os números": bruto, taxas retidas, líquido, ingressos, transações, ticket médio, repasse por ingresso, ocupação, melhor dia e dias de venda. _(pages/Comparativos.tsx)_

### Respostas do questionário
- **REL-160** Título "Respostas do questionário" (no menu, o mesmo nome, para não confundir com Itens › Questionário), abas "Resumo" e "Respostas". _(pages/Questionarios.tsx)_
- **REL-161** Filtro por pergunta: escolher pergunta, operador "inclui"/"não inclui" e valor; várias perguntas somam condições. _(pages/Questionarios.tsx)_
- **REL-162** Resumo mostra só perguntas de escolha (única e múltipla), 15 por página, com "Exibindo X-Y de N perguntas". _(pages/Questionarios.tsx)_
- **REL-163** % de cada opção = respostas da opção ÷ respondentes da pergunta, recalculado pelo filtro. _(pages/Questionarios.tsx)_
- **REL-164** Clicar numa opção do resumo aplica o filtro daquela pergunta e abre a aba Respostas. _(pages/Questionarios.tsx)_
- **REL-165** Respostas lista participantes únicos, busca por nome, e-mail ou documento, 10 por página. Vazio: "Nenhum participante encontrado.". _(pages/Questionarios.tsx)_
- **REL-166** O painel do participante mostra Portador e, por ingresso ("Grupo, ingresso"), Comprador e respostas; um ingresso aberto por vez. O participante aberto vai à URL (REL-223). _(pages/Questionarios.tsx)_
- **REL-167** Resposta existente pode ser editada, menos anexo (texto, número e telefone num campo de texto); pergunta sem resposta não. "Editar" pede "Confirmar alteração desta resposta?" e mostra o toast "Resposta alterada". _(pages/Questionarios.tsx)_
- **REL-169** As perguntas são as do evento (`Evento.perguntas`), na ordem do formulário. Respondem cerca de 34% dos ingressos vendidos dos tipos marcados em cada pergunta (até 6 mil por evento), em pedidos de 1 a 3 ingressos, nas datas do histórico; os ingressos emitidos no banco entram com portador e comprador reais. As respostas são fictícias (o checkout ainda não grava respostas): por tipo, com as opções e o estoque da pergunta; as opcionais têm 60 a 90% de resposta. No escopo "Todos os eventos", cada pergunta leva o nome do evento. Sem perguntas: "Este evento não tem questionário" (ou "Nenhum evento tem questionário"), com "Criar perguntas" para `/backstage/catalogo/questionario`. Trocar de evento ou escopo limpa os filtros. Dado que o banco não tem (documento, telefone, nascimento) aparece como "Não informado". _(data/questionarios.ts, pages/Questionarios.tsx)_
- **REL-168** Sem resposta: "Não respondeu". Anexo tem botão de baixar que só mostra o toast "Baixando {arquivo}". _(pages/Questionarios.tsx)_

### Comissários
- **REL-188** O relatório Comissários está na lista e soma todos os eventos (escopo "Todos os eventos", sem o aviso de BKS-27). As regras dele ficam em `../comissarios/rules.md` (COM-110 a COM-121). _(../components/navegacao-de-secao.tsx, ../comissarios/pages/relatorio-comissarios.tsx)_

### Relatório personalizado (IA)
- **REL-170** Sem conteúdo, a tela mostra "O que você quer descobrir?", o campo de pedido e sugestões. _(pages/RelatorioPersonalizado.tsx, components/RelatorioIAChat.tsx)_
- **REL-241** O botão de período aparece já na tela sem conteúdo, embaixo de "Dados de…" (antes, só depois do primeiro bloco, e o primeiro pedido usava um período que não dava para ver nem mudar). O campo diz "…sobre o evento…" num evento e "…sobre os eventos da organização…" em "Todos os eventos". _(pages/RelatorioPersonalizado.tsx, components/RelatorioIAChat.tsx)_
- **REL-171** Enviar fica desabilitado com campo vazio ou enquanto gera. _(components/RelatorioIAChat.tsx)_
- **REL-172** Cada pedido usa o período escolhido e gera um ou mais blocos (métrica, medidor, barras, linha, pizza, tabela, dispersão). _(data/relatorio-ia.ts)_
- **REL-173** Com chave OpenRouter (`VITE_OPENROUTER_API_KEY` ou localStorage), envia o pedido e o resumo do período ao OpenRouter; testa o modelo escolhido e dois gratuitos de reserva. _(data/relatorio-ia.ts)_
- **REL-174** Sem chave, se todos os modelos falharem, ou em perguntas frequentes (gênero, pagamentos, saldo, por lote, ao longo do ano, todos os eventos), responde localmente. _(data/relatorio-ia.ts)_
- **REL-175** Localmente, o pedido é dividido em partes por "e", vírgula, ponto e vírgula, "também" e "mais"; correlação fica inteira. _(data/relatorio-ia.ts)_
- **REL-176** Gerar segura mais 2 s de animação e gira mensagens a cada 2 s. _(data/relatorio-ia.ts, pages/RelatorioPersonalizado.tsx)_
- **REL-177** Sem bloco: toast "Não consegui gerar um gráfico para esse pedido. Tente reformular.". Bloco repetido: toast "Esses dados já estão no relatório.". _(pages/RelatorioPersonalizado.tsx)_
- **REL-178** Métricas ficam no topo, gráficos abaixo; a tela rola até o bloco novo. _(components/RelatorioIABlocks.tsx, pages/RelatorioPersonalizado.tsx)_
- **REL-179** Cada bloco tem "Remover do relatório"; "Limpar relatório" apaga todos. _(components/RelatorioIABlocks.tsx, pages/RelatorioPersonalizado.tsx)_
- **REL-180** Após cada pedido, as sugestões giram para as próximas 3 de uma lista de 12. _(components/RelatorioIAChat.tsx)_
- **REL-189** O relatório responde sobre o evento em contexto (ou todos os eventos da organização). O período inicial é a janela de vendas do evento; trocar de evento ou escopo recomeça o relatório. Sob o título vazio, "Dados de <evento>" (", ainda sem vendas" sem venda). Lotes, últimos pagamentos (repasses pagos de Finanças), saldo (líquido menos repasses pedidos) e vendas do ano (todos os eventos da organização) vêm do banco; gênero, idade e UF, portões e horários são estimativas fictícias proporcionais às vendas. _(data/relatorio-ia.ts, data/relatorio-features.ts, pages/RelatorioPersonalizado.tsx)_
- **REL-181** Erro sem resposta mostra a mensagem em vermelho abaixo do campo. _(components/RelatorioIAChat.tsx)_

### Lista de usuários
- **LUS-01** Gêmeo do relatório `waitlist` de produção (awa-reports-web): quem se inscreveu nas listas de interesse do evento (pré-venda, lista de espera, interessados), uma linha por inscrição. No menu dos relatórios, depois de "Respostas do questionário". _(pages/lista-de-usuarios.tsx, components/navegacao-de-secao.tsx)_
- **LUS-02** Um cartão de métrica, "Usuários na lista", com o total de inscritos do evento (ou de todos os eventos da organização, LUS-10); a busca não mexe nele.
- **LUS-03** Cartão "Usuários" com a busca "Buscar por nome, e-mail, telefone ou documento" e a tabela: Nome (avatar com iniciais), Tipo de documento (CPF, CNPJ, Passaporte), Documento, E-mail, Telefone e Data de interesse ("16/09/2026, 16:54"). Vazio vira "—"; documento e telefone sem máscara, como em produção.
- **LUS-04** Todas as colunas ordenam: coluna parada ordena crescente, a ativa inverte; o padrão é Data de interesse, mais recente primeiro. Ordenar, buscar ou mudar o tamanho da página volta à página 1.
- **LUS-05** No celular, cada pessoa vira um cartão: nome e e-mail no topo e as linhas Tipo de documento, Documento, Telefone e Data de interesse, cada uma com ícone e rótulo com dois pontos.
- **LUS-06** "Exportar" (Excel ou CSV) baixa a lista inteira com a busca e a ordem atuais, nas mesmas colunas; sem inscritos, o botão não aparece.
- **LUS-07** Sem inscritos (ou busca sem resultado): "Nenhuma pessoa cadastrada na lista de usuários" / "As pessoas inscritas na sua lista aparecerão aqui".

- **LUS-08** Quem entrou na lista de espera pelo link de compra (CART-084/085) aparece primeiro, antes dos inscritos de exemplo, sem documento. _(pages/lista-de-usuarios.tsx)_ Desde 21/11/2026 é o único dado real: a tela não soma mais 137 inscritos de exemplo sempre (LUS-09).
- **LUS-09** Os inscritos de exemplo só aparecem depois de "Simular inscrições" (ferramenta do protótipo, link abaixo da lista, com a dica "Ferramenta do protótipo: cria 137 inscrições fictícias em {evento}."). A simulação é do evento em contexto, gravada no evento (`Evento.listaDeUsuariosSimulada`, com a hora da simulação, para as datas não mudarem) e vale depois de recarregar. Com simulação, o link vira "Limpar inscrições simuladas", que tira só as fictícias. Sem lista de espera e sem simulação, aparece o vazio (LUS-07). _(pages/lista-de-usuarios.tsx, data/lista-de-usuarios.ts)_
- **LUS-10** Segue o seletor do topo (BKS-27): em "Todos os eventos", soma a lista de espera e as simulações de todos os eventos da organização; num evento, só dele. A simulação continua sendo do evento em contexto. _(pages/lista-de-usuarios.tsx)_
- **LUS-11** Lista vazia de um evento (sem busca, sem inscritos): o vazio tem "Configurar lista de espera", que abre Divulgação › Lista de espera (LES). Com as duas entradas da lista desligadas, o texto diz que a lista está desligada e o botão é primário. Em "Todos os eventos", sem botão. _(pages/lista-de-usuarios.tsx)_

### Permissões
- Não tratadas em nenhum relatório.

## Depende de / afeta

- **Depende de:** evento em contexto (`useEventoAtual`) ou todos os eventos da organização (`useTodosOsEventos`), lidos de `@/plataforma`.
- **Afeta:** só a simulação da Lista de usuários grava (`Evento.listaDeUsuariosSimulada`, LUS-09). Os outros relatórios só leem; edições de respostas em Questionários ficam na tela.

## Em aberto

- Lista de usuários em "Todos os eventos" não diz de qual evento é cada inscrito.
- As respostas do questionário são fictícias até o checkout gravar respostas. Perguntas de combos não entram (as vendas de combo não estão no dataset).

- Métricas de Acesso e Transferências são projeções do dataset (92% de validação, 12% de transferência), não contagens dos ingressos `utilizado` e `transferido`; os reais só aparecem nas listas.
- A seed tem histórico de vendas que passa da data do evento (o histórico termina sempre ontem; alguns eventos são de outubro): Comparativos usa o último dia de venda como D-0 nesses casos.
- Produtos do histórico (`serie[1]`) não têm faturamento nem canal e ficam fora de Borderô e Comparativos.

- Transações v2 e v3 (fora do menu) ainda rolam para o lado no celular; não receberam a tabela-lista (REL-182).
- As tabelas dos relatórios ainda são `<table>` feitas à mão, menos Transferências, Comissários e as listas de Vendas (já no `Table` do DS, REL-232, COM-120, REL-242, REL-245). As árvores (as três de Vendas, Borderô, Validação) e a lista de Transações (colunas escolhidas, cabeçalho fixo) não cabem no `Table` do DS sem árvore e sem colunas dinâmicas; Vendas usa a árvore comum `components/tabela-em-arvore.tsx` (REL-243), e Borderô e Acesso ainda têm cada um a sua cópia dela; a tabela-lista também não tem par no DS. Conferir no AFTER DS.
- Os blocos de Transações, Acesso e Borderô ainda usam o cartão antigo (linha sob o título), não o painel dos relatórios (REL-200). Comparativos também.
- Linhas filhas das árvores entram com transição, mas saem de uma vez (REL-224).
- No celular, a linha de grupo das árvores mostra só a última coluna; os subtotais do grupo não têm detalhe (só a linha final abre).

- **Qual Transações vale:** o menu aponta para a v1, que não tem detalhe nem edição. v2 (edição no painel) e v3 (edição em página) só abrem pela URL. Falta decidir a versão.
- Acesso: o período filtra métricas, faixas e lista (conferido em 22/11/2026; o item antigo dizia que não). As métricas e as faixas ignoram Canal, Tipo e Status (só a árvore segue o filtro Grupo).
- Transferências: o período filtra a lista e as métricas; os filtros de texto só filtram a lista. As métricas são projeção (12% dos vendidos) e não batem com a lista (ex.: 125 no total e 126 linhas no mesmo período).
- Borderô: o aviso de alterações é fixo (5 transações de exemplo por evento). (Bundle e Produto saíram, REL-230; o filtro de sessão, que não filtrava, saiu.)
- Transações: meios de pagamento listam só Pix e Cartão de crédito, embora o filtro tenha 8 meios.
- **Vocabulário de status de Transações (decisão humana, com FIN-21):** "Carrinho Abandonado" é o pedido cancelado, "Cancelado" é o estornado e "Reembolso" não tem par no banco. Fica como está até decidirem o vocabulário de status de produção.
- Transações v1 soma valores por linha; v2/v3 somam por pedido. Com mais de um item por pedido, os totais divergem.
- Vale-troca (seleção de itens, taxa de 10%, "Vale-troca gerado") existe em v2 e v3, mas nenhum botão abre esse modo.
- v3: tooltip do custo de edição diz "5% do valor do pedido atualizado"; o rodapé diz "5% do valor das inscrições editadas"; o cálculo é por item alterado.
- v3: portador aceita qualquer e-mail válido como conta existente, com nome aleatório. Não há caso "sem conta Ingresse".
- v2 e v3 geram links de pagamento com domínios diferentes (`pagamento.ingresse.com/editar/...` e `cart.ingresse.com/pagamento/...`).
- Taxa do produtor (2%) e esgotados (PCD, Corrida 42km, Mizuno) são fixos no código.
- Questionários: "Exportar" não tem ação (nem toast); respostas editadas somem ao fechar o painel.
- Relatório personalizado: blocos já gerados não mudam quando o período muda. O resumo do evento vai para um serviço externo (OpenRouter) quando há chave.
- Vendas: "Ocupação por grupo" e "Ingressos avulsos" ainda mostram "Inteira" e "Lote único" em todo grupo (o dataset só tem o grupo, não o tipo nem o lote); os valores são os reais do grupo. A árvore "Detalhamento das vendas" divide tipos e lotes por proporção fixa (REL-38).
- Vendas: hoje o banco da seed não tem pedido pago com combo, produto ou cupom nesta organização, então Combos, Produtos e Cupons aparecem vazios e o desconto é R$ 0,00 (REL-213). Ingressos que vêm dentro de um combo contam em Ingressos com valor 0.
- A paleta categórica (REL-214) está em Comparativos, Transações e no mix de Vendas (REL-242); os status de Transações usam as cores de status.
- A tabela do DS tem o rótulo de coluna em xs (12 px): Transferências e Comissários usam assim; Vendas passa o rótulo em sm (REL-245). Falta decidir um jeito só.
- Vendas: o dataset não separa vendas por sessão, tipo de ingresso nem lote. O Detalhamento para no grupo e, em evento com várias sessões, divide o grupo igualmente entre elas (REL-247). Para descer até tipo e lote, as linhas do dataset precisam guardar a sessão e o lote.
- Transações v2 e v3 (sem rota) ainda falam "inscrição" e "atleta"; as colunas exportáveis de `data/export-fields2.ts` (v2) também.
- Exportação em todos os relatórios é só toast.
- `pages/SocioDemografico.tsx` importa `components/demografia-geo`, que não existe, e não tem rota.
- Transações v2 e v3 seguem sem rota e sem import: `pages/Transacoes2.tsx` → `components/ManageColumnsModal2.tsx` → `data/export-fields2.ts` (com "atleta") só se usam entre si, e `pages/Transacoes3.tsx` e `pages/SocioDemografico.tsx` não são importados por nada (conferido em 22/11/2026). Não foram apagados: falta decidir a versão de Transações.
- Comparativos: a leitura do gráfico (o balão com os valores) fica sempre visível, começando no último dia, no padrão de /eventos. A crítica pediu tooltip só no hover; mudar depende de decidir o padrão junto com /eventos.
- Colunas sempre "—": as perguntas de corrida em Transações (nos pedidos reais) seguem como colunas opcionais em "Editar colunas"; não aparecem no padrão.
- Divergências com `backstage/rules.md` (só o agente do shell edita): BKS-26 diz que, no celular, a lista de relatórios são "botões que quebram linha" (agora é um select, REL-238) e não cita Lista de usuários e Comissários; BKS-27 diz que só Vendas e Borderô somam os eventos e os outros mostram aviso, mas hoje quase todos somam (`RELATORIOS_COM_TODOS`). BKS-08 (selo "Novo" só em Comissários) agora bate: Comparativos perdeu o selo (REL-239).

## Fontes

Nenhum link de Figma, Confluence ou Jira no código ou na pasta.
