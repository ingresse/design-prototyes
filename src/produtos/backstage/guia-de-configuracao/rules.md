# Guia de configuração do evento: regras

> **Rotas:** sem rota própria. Aparece em toda tela do Backstage com contexto de evento (`BackstageLayout`, `showEventContext`), menos no Freepass.
> **No menu:** não tem item de menu. Painel no canto superior direito, abaixo do botão "Guia", na shell com barra no topo; inferior direito na clássica e no celular (GDC-16); o alerta fica em Itens › Ingressos (`/backstage/catalogo/ingressos`).
> **Versão em uso:** única (`guia-de-configuracao/`)
> **Revisado em:** 2026-11-22

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

Painel "Guia de configuração" que mostra ao produtor o que falta para o evento vender: setores,
ingressos, abertura de vendas e publicação. Cada passo lê o estado real do evento e leva à tela que o
resolve. Porte da branch `feat/event-setup-journey` do `awa-backstage-web` (MKT-1051). Não substitui a
criação de evento (`eventos/`, `/backstage/eventos/novo`): entra logo depois dela.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Setores, ingressos e aberturas do evento | `@/plataforma` (`useDoc("eventos", id)`: `sessoes[].grupos[].ingressos`, `aberturas`) | não |
| Status do evento | `@/plataforma` (`Evento.status`) | não (publicar usa o modal de status, `eventos/`) |
| Fechado, minimizado, holofote pendente | `localStorage` `backstage-guia-configuracao:<marca>:<eventoId>` (`data/memoria.ts`) | só no navegador |

## Regras

### Comportamento
- **GDC-01** O guia monta no `BackstageLayout` (as duas shells, clássica e topo) e acompanha o produtor por todas as telas do evento. No Freepass não aparece. _(components/Backstage.tsx, components/guia-de-configuracao.tsx)_
- **GDC-02** Passos, nesta ordem: ~~"Crie os grupos do evento"~~ "Crie os grupos de ingressos" (desde 23/11/2026, pedido do Victor) (Criar), "Crie ingressos com preço e lote" (Criar), "Programe o início das vendas" (Programar), "Publique o evento" (Publicar). A lista vai até publicar porque o guia some quando acaba, e sumir com o evento em rascunho diria que está tudo certo. _(data/passos.ts)_
- **GDC-03** Cada passo é feito pelo estado real do evento, sem contador guardado: setores = existe setor em alguma sessão; ingressos = existe ingresso em algum setor; abertura = existe abertura de vendas com ao menos um ingresso do evento (abertura vazia não vende nada); publicar = status privado, publicado ou encerrado (só rascunho fica pendente). Desfazer reabre o passo sozinho. _(data/passos.ts, data/use-guia.ts)_
- **GDC-04** Enquanto o banco carrega, o guia não aparece. Melhor calar do que cobrar um passo talvez já feito. _(data/passos.ts)_
- **GDC-05** Dependências declaradas: ingressos precisa de setor; abertura precisa de setor e ingresso; publicar precisa de setor, ingresso e abertura de vendas (desde 20/11/2026, EVT-130; antes a abertura não bloqueava publicar). Passo feito nunca é bloqueado. _(data/passos.ts)_
- **GDC-06** Passo atual = primeiro pendente e desbloqueado. Só ele mostra a ação ("Criar", "Programar", "Publicar") à direita. A linha inteira é o botão. _(data/passos.ts, components/painel-do-guia.tsx)_
- **GDC-07** Marcadores: feito com o check verde, atual e pendente com o número (`IconLeftNumber` do DS, tamanho md), bloqueado com cadeado no lugar do número e desabilitado. O nome acessível do bloqueado é o passo mais o motivo ("Precisa de um setor antes", "Precisa de setor e ingresso criados antes", "Precisa da abertura de vendas programada antes"). _(components/painel-do-guia.tsx)_
- **GDC-08** Minimizar recolhe o painel à faixa do título (o corpo fica inerte para o Tab); expandir reabre. A escolha fica gravada por evento. _(components/painel-do-guia.tsx, data/memoria.ts)_
- **GDC-09** O painel sobe de fora da tela ao aparecer e desce ao ser fechado; o título entra palavra a palavra e os passos em cascata. Com reduzir movimento, tudo nasce no lugar. _(components/painel-do-guia.tsx)_
- **GDC-10** Fechar (X) é definitivo para o evento: o painel não volta. Se o passo atual trava a venda (só a abertura de vendas), Itens › Ingressos mostra o alerta "Nada programado para entrar à venda" com "Programar abertura de vendas", que abre o painel da abertura ali mesmo, sem sair da tela (ABV-13; antes levava a Aberturas de vendas); desde 22/11/2026, logo abaixo do título, antes dos atalhos (BKS-119) e das abas. O alerta não tem X; some quando a abertura existe. Faltando ingresso ou só publicar, nada fica na tela (o rascunho já aparece no selo do evento). _(components/guia-de-configuracao.tsx, backstage/components/abas-de-itens.tsx)_
- **GDC-11** Ações: setores abre Itens › Ingressos com a criação rápida de grupo aberta na primeira sessão (`?novoSetor=1`, consumido ao abrir; itens ITM-131); ingressos abre Criar ingresso (`/backstage/catalogo/ingressos/novo`); abertura abre Aberturas de vendas; publicar abre o modal de status já em Publicado ("Abrir para todo mundo"). _(components/guia-de-configuracao.tsx, backstage/components/abas-de-itens.tsx)_
- **GDC-12** A faixa do título tem um campo de partículas (figura de Chladni em canvas 2D nativo) que some à esquerda, onde fica o título. No escuro as partículas são brancas; no claro, pretas, translúcidas. _(backstage/components/campo-de-particulas.tsx, compartilhado com o banner da criação de evento; utils/cor-das-particulas.ts)_
- **GDC-13** Com o painel na tela, os toasts do canto inferior direito sobem para cima dele (a partir de 640px). _(components/guia-de-configuracao.tsx)_
- **GDC-14** Holofote de apresentação: só logo depois de criar o evento em "Criar evento" (a criação marca o evento novo). A tela desfoca (backdrop blur) e escurece a partir do canto do painel, acende com partículas e mostra "Evento criado! Agora, configure as vendas" e "Siga as etapas do guia para criar os ingressos, programar as vendas e publicar o evento.". Some em 9 s ou no primeiro clique em qualquer lugar da tela (o clique segue para o que está embaixo, então clicar numa opção do guia já faz a ação) e não volta. No teste de usabilidade, enquanto o teste cobre o protótipo (`data-teste-sobreposto` no body: pergunta, briefing, sucesso), o holofote fica escondido e parado; aparece e começa a contar quando a pessoa clica em "Começar" na tarefa seguinte. Cliques na camada do teste não contam. Não bloqueia cliques e não é lido por leitor de tela. Nas outras visitas, e em eventos que não acabaram de ser criados, aparece só o painel. Substitui o toast de evento criado (EVT-10). _(components/holofote-do-guia.tsx, data/memoria.ts, eventos/pages/CriarEvento.tsx)_
- **GDC-15** ~~No celular o painel começa recolhido na faixa do título.~~ Substituída por GDC-70 em 20/11/2026: no celular o guia é a barra do pé com a folha.
- **GDC-16** Na shell com barra no topo (BKS-02, a padrão), a partir de 640 px, o painel fica no canto superior direito, logo abaixo da barra e do botão "Guia", e entra descendo de leve em vez de subir de fora da tela. Lá não reserva espaço no fim da página, não sobe com barra fixa e não empurra os toasts (GDC-13 e GDC-43 valem só no pé da tela). O holofote (GDC-14) acende a partir do canto superior direito. Na shell clássica e no celular, continua embaixo. _(components/painel-do-guia.tsx, components/guia-de-configuracao.tsx, components/holofote-do-guia.tsx)_

### Guia unificado (etapas em acordeão)
- **GDC-60** Um guia só, para a organização e para o evento. Na barra do topo, o botão "Guia" (BKS-82) abre e fecha o painel em qualquer tela; a escolha vale para a sessão. Sem escolha, o painel segue GDC-01: aparece sozinho nas telas do evento enquanto houver passo pendente e o guia do evento não foi fechado. Abrir pelo botão traz o painel expandido. O X fecha o painel; na tela do evento, também fecha o guia do evento (GDC-10). Até 20/11/2026 o botão abria um segundo painel, com breadcrumbs. _(components/guia-de-configuracao.tsx, components/botao-do-guia.tsx, data/visibilidade.ts)_
- **GDC-61** O painel tem a faixa do título (partículas, GDC-12), a contagem "X de N" passos feitos, minimizar e fechar, e uma barra de progresso de todas as etapas. Abaixo, as etapas em acordeão, uma aberta por vez, nesta ordem: **Organização**, **Crie o primeiro evento**, **Configure o evento**. A etapa aberta ganha fundo e mostra os passos dela (marcadores de GDC-07, ação no passo atual de GDC-06); a etapa com todos os passos feitos leva um check verde. _(components/painel-do-guia.tsx)_
- **GDC-62** Organização: "Revise os ajustes da organização" (Revisar, abre Ajustes) e "Confira quem faz parte da equipe" (Conferir, abre Membros). O protótipo não tem estado real para eles: contam como feitos ao abrir a tela, gravado por organização no navegador (`backstage-guia-organizacao:<organização>`). _(data/use-etapas.ts)_
- **GDC-63** Crie o primeiro evento, a meta do guia: um passo, "Crie o primeiro evento" (Criar, abre a criação de evento). Feito quando a organização em contexto tem ao menos um evento. _(data/use-etapas.ts)_
- **GDC-64** Configure o evento: os passos do evento (GDC-02 a GDC-07), do evento em contexto, com o nome dele no topo da etapa. Na tela do evento, publicar abre o modal de status (GDC-11); fora dela, ~~leva a Informações do evento~~ leva à Visão geral com o modal de status (GDC-74). Sem evento na organização, a etapa fica fechada, com cadeado no lugar da seta e o motivo "Crie o primeiro evento antes". _(data/use-etapas.ts, components/painel-do-guia.tsx)_
- **GDC-65** O acordeão abre na primeira etapa com passo pendente e desbloqueada; tocar no título de outra a abre e fecha a anterior; tocar na aberta a fecha. _(components/painel-do-guia.tsx)_
- **GDC-66** Na shell clássica (sem barra do topo), o guia continua só nas telas do evento, com o mesmo acordeão. _(components/Backstage.tsx)_

### Guia no celular (abaixo de 768 px)
- **GDC-70** No celular o guia é uma barra presa no pé da tela: "Guia de configuração", seta para cima, a barra de progresso e "Próxima:" com o passo atual como link, que leva direto a ele. Tocar no título abre o guia inteiro numa folha que sobe de baixo (bottom sheet), com o mesmo acordeão, a contagem, recolher (seta para baixo) e fechar; toque fora ou Esc também recolhem. A barra aparece enquanto houver passo pendente e o guia não foi fechado: nas telas do evento, com todas as etapas; nas da organização, só com as da organização (GDC-73). Substitui o painel recolhido de GDC-15 e GDC-42. _(components/guia-no-celular.tsx, components/guia-de-configuracao.tsx)_
- **GDC-71** No meio de uma configuração, a barra sai deslizando para baixo e volta deslizando para cima quando a pessoa sai dela: telas de um passo em andamento (criar ingresso, Aberturas de vendas, Ajustes), telas de formulário que recolhem o guia (GDC-44), telas de operação (GDC-77), telas com barra fixa de salvar, cancelar ou seleção (`data-barra-fixa`) e enquanto a gaveta do menu está aberta (GDC-75). Escondida, a folha também fecha. _(components/guia-de-configuracao.tsx, components/guia-no-celular.tsx)_
- **GDC-72** Tocar num passo, na folha ou no "Próxima:", fecha a folha e segue para o passo. _(data/use-etapas.ts)_
- **GDC-73** Nas telas da organização (`showEventContext={false}`, BKS-06), o celular não mostra os passos do evento: a barra e a folha ficam só com **Organização** e **Crie o primeiro evento**, e a barra some quando essas duas estão feitas, mesmo com o evento em contexto incompleto. Nas telas do evento, nada muda (GDC-70). No desktop, sem escolha pelo botão, o painel já só aparece nas telas do evento (GDC-60); aberto pelo botão "Guia", mostra as três etapas em qualquer tela, porque foi pedido. Até 22/11/2026, a barra do celular aparecia em Pedidos, Produtos e Comissários com o passo do evento (revisão de 22/11/2026, T7). _(components/guia-de-configuracao.tsx)_

- **GDC-74** "Publicar" fora da tela do evento (desde 22/11/2026): leva à Visão geral do evento em contexto com `?status=publicar`, que abre o modal de status já em Publicado e tira o parâmetro da URL. Antes levava a Informações do evento, que não tem status desde 20/11/2026 (EVT-15). Rascunho sem abertura de vendas mostra o toast de EVT-130 em vez do modal. _(data/use-etapas.ts, backstage/components/Backstage.tsx)_
- **GDC-75** No celular, com a gaveta do menu aberta (do evento ou da organização), a barra do guia desce e sai, e volta ao fechar (desde 22/11/2026). Antes ela ficava por cima do rodapé da gaveta e cobria o seletor de status do evento: tocar em "Publicado" acertava o guia. _(components/guia-de-configuracao.tsx, `gavetaAberta`)_
- **GDC-76** Evento realizado (a data dele já passou, como a Visão geral diz, EVT-45) ou encerrado (desde 22/11/2026): o guia do evento não aparece sozinho, nem o alerta de Ingressos (GDC-10), e no celular a barra fica só com as etapas da organização (some quando elas acabam). Aberto pelo botão "Guia", mostra as três etapas, porque foi pedido. Antes, um evento já realizado ouvia "Programe o início das vendas". _(data/use-guia.ts, components/guia-de-configuracao.tsx)_
- **GDC-77** Telas de dados, formulário e operação abrem com o painel recolhido na faixa do título (como GDC-44; expandir vale só para a visita), para não cobrir a meta, os campos ou a venda (desde 22/11/2026): Visão geral (dados), Informações do evento, venda da bilheteria (`/backstage/bilheteria/vender`), passos da emissão de cortesia (`/backstage/itens`, `/backstage/destinatarios`, `/backstage/verificacao`) Pixel de rastreamento e Vincular itens da Passkey (desde 23/11/2026: a barra fixa da tela ficava sob a do guia no celular). Nas de formulário e operação, a barra do celular também sai (GDC-71); na Visão geral fica, e a página reserva o fim (GDC-43). Antes o painel abria sozinho, expandido, sobre a meta, o "Salvar" dos marcos, o Nome de Informações do evento, a busca da venda e os campos do Pixel. _(components/guia-de-configuracao.tsx, `ROTAS_DE_OPERACAO`, `ROTAS_DE_DADOS`)_
- **GDC-78** A etapa "Configure o evento" só aparece no guia dentro do evento (telas com o rail do evento, BKS-06), no desktop e no celular. Fora dele (telas da organização), o acordeão dessa etapa não é exibido: o guia fica só com Organização e Crie o primeiro evento. Desde 23/11/2026, pedido do Victor; antes, no desktop, a etapa aparecia em toda tela (o celular já escondia, GDC-73). _(components/guia-de-configuracao.tsx)_

### Estados
- **GDC-40** Carregando: sem painel, sem alerta, sem holofote (GDC-04).
- **GDC-41** Tudo feito: sem painel e sem alerta.
- **GDC-42** ~~Celular: o painel ocupa a largura, 16 px das bordas.~~ Substituída por GDC-70: a barra do pé ocupa a largura toda.
- **GDC-43** O painel não cobre ação: com uma barra fixa de salvar, cancelar ou seleção no pé da tela (marcada com `data-barra-fixa`: Itens, seleção em massa, canal de Equipe e Comissários, Criar evento, assistente de alterações, Criar cargo, Bilheteria), o painel sobe junto, deslizando, e volta quando ela some. A página também reserva no fim a altura do painel (`--altura-do-guia`), para o último conteúdo não ficar embaixo dele. _(components/guia-de-configuracao.tsx, components/painel-do-guia.tsx)_
- **GDC-44** Em tela de formulário com barra de salvar (configurar canal em Equipe e Comissários), o painel começa recolhido na faixa do título, para não cobrir campos. Expandir vale só para aquela visita e não muda a escolha gravada do evento (GDC-08). _(components/guia-de-configuracao.tsx, `recolherGuia` do BackstageLayout)_

## Depende de / afeta

- **Depende de:** catálogo do evento (`itens/`), aberturas de vendas (`aberturas-de-vendas/`), modal de status (`eventos/components/AlterarStatusModal.tsx`).
- **Afeta:** criação de evento (EVT-10, sem toast), Itens › Ingressos (alerta e `?novoSetor=1`).

## Em aberto

- ~~TEMPORÁRIO (20/11/2026): o holofote ficou fixo na tela para o Victor trabalhar no visual.~~ Voltou ao padrão de GDC-14 no mesmo dia (`HOLOFOTE_FIXO = false` em components/holofote-do-guia.tsx).

- ~~Vocabulário: o protótipo chamava de setor.~~ Resolvido em 13/11/2026: o passo diz "Crie os grupos do evento", como a branch (ITM-89). Desde 23/11/2026, "Crie os grupos de ingressos" (GDC-02).
- Evento esportivo: o guia diz "ingressos" mesmo quando o catálogo fala em inscrições (o toast antigo trocava a palavra).
- Qualquer evento incompleto mostra o painel, não só o recém-criado (igual à branch). O holofote, ao contrário da branch, toca só na criação (decisão Victor, 12/11/2026).
- O cadeado do passo bloqueado não diz o motivo na tela, só para leitor de tela (igual à branch).
- As partículas do holofote usam cor fixa (canvas não lê token). Os textos usavam `#fff` porque `text-white` inverte no escuro do Backstage; desde 21/11/2026 usam os tokens de texto sobre superfície sólida (`text-primary_on-brand` no título, `text-secondary_on-brand` no apoio), claros nos dois modos.
- Os passos da organização (GDC-62) contam por visita à tela, não por estado real: falta definir com produto o que a organização precisa configurar antes de vender.
- ~~Com o guia da organização, o painel do canto e o botão "Guia" mostravam os passos do evento duas vezes.~~ Resolvido em 20/11/2026: um guia só, em acordeão (GDC-60).
- Fora do porte: transição de tela em cortejo e entrada do rail do evento da mesma branch.
- **Guia nas telas de operação (decisão da área):** na venda da bilheteria, na emissão de cortesia e no Pixel, o guia abre recolhido (GDC-77), não some. Se deve aparecer nessas telas (e se a venda deve reservar a linha do título também na coluna dela) é decisão da área; o recolhido foi o meio-termo de 22/11/2026.
- **Evento realizado (GDC-76):** "realizado" é a data de início do evento antes de hoje, a mesma regra da Visão geral (EVT-45); num evento de várias sessões, conta a primeira. O painel pós-evento completo e o encerramento pela data são decisão humana (eventos/rules.md, Em aberto).

## Fontes

- Branch `feat/event-setup-journey` de `ingresse/awa-backstage-web` (MKT-1051): `src/shared/events/setup-journey/`, `src/components/composite/event-setup-journey/`, `src/components/layout/event-shell/journey-overlay.tsx`, `src/components/ui/cymatic-field/`.
