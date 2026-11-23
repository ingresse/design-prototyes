# Pré-venda: regras

> **Rotas:** `/backstage/marketing/pre-venda`
> **No menu:** não tem. A tela só é aberta pela URL; o menu do evento › Marketing só lista "Passkey".
> **Versão em uso:** única, pasta `marketing`
> **Revisado em:** 2026-11-21

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

O produtor cria uma pré-venda para um evento de alta demanda: define período, itens
participantes, valor mínimo da oferta e limite de emissões. O público faz ofertas e o produtor
acompanha quantas ofertas entraram e o ticket médio antes de abrir os lotes oficiais.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Itens elegíveis (sessões, grupos, inteira/meia, combos) | árvore fixa em `components/SelecionarItensSlideOut.tsx` (mock local) | não |
| Configuração da pré-venda (datas, itens, valores, limites) | estado da página `pages/PreVenda.tsx` | só em memória; sair da tela perde |
| Ofertas, ticket médio, gráfico | valores fixos e gerados por hash em `pages/PreVenda.tsx` | não |

Não lê nada de `@/plataforma` nem do evento em contexto. `data/pre-venda-itens.ts` só fornece o tipo `ItemTipo`; a lista de 100 itens dele não é usada.

## Regras

### Entrada
- **MKT-01** Sem pré-venda: "Antecipe vendas em eventos concorridos" com "Como funciona?" e "Criar pré-venda". _(pages/PreVenda.tsx)_
- **MKT-02** "Como funciona?" abre um modal de 4 passos que termina em "Criar pré-venda". _(components/ComoFuncionaModal.tsx)_
- **MKT-03** Toda troca de etapa (vazio, configuração, criada) mostra um carregamento de 1,6 s: o cabeçalho de página da etapa seguinte ("Configuração de pré-venda" ou "Pré-venda") e linhas pulsando (BKS-100, BKS-116). Até 21/11/2026 era um esqueleto sem título. _(pages/PreVenda.tsx)_
- **MKT-04** A tela abre sem o contexto do evento e sem o menu do evento. _(pages/PreVenda.tsx)_

### Configuração
- **MKT-10** Campos gerais: Data de início e Data de fim (obrigatórias, com hora, 24 h), "Limite de emissões do evento" (inteiro, opcional; vazio usa o limite de cada item) e "Compartilhar valor do primeiro lote" (marcado como Recomendado, desmarcado por padrão). _(pages/PreVenda.tsx)_
- **MKT-11** Itens participantes vêm de um painel lateral em árvore: Ingressos › sessão › grupo › Inteira/Meia, e Combos › grupo › Inteira/Meia. Busca filtra a árvore; salvar exige ao menos um item. _(components/SelecionarItensSlideOut.tsx)_
- **MKT-12** Depois de confirmar os itens, a lista mostra linhas pulsando por 3 s ("Atualizando seus itens…" para leitor de tela). _(pages/PreVenda.tsx)_
- **MKT-13** Tabela de itens: busca por nome ou grupo à esquerda e, à direita, o tipo em botões segmentados do DS (Todos, Ingressos, Combos; antes um controle próprio à esquerda); colunas Nome, Valor mínimo (moeda), Limite (inteiro) e remover. No cartão estreito, rótulo em cima de cada campo. _(pages/PreVenda.tsx)_
- **MKT-14** O botão de estrela ao lado de um valor ou limite preenchido copia esse dado para os outros itens: "Para todos os itens" (sobrescreve) ou só para os vazios. Fica desabilitado com o campo vazio. _(pages/PreVenda.tsx, components/CompartilharValorModal.tsx)_
- **MKT-15** Remover item pede confirmação: "Remover item da pré-venda?" _(components/RemoverItemModal.tsx)_
- **MKT-16** Voltar: ao criar, volta para o vazio; ao editar, volta para a pré-venda criada. _(pages/PreVenda.tsx)_

### Validações
- **MKT-20** "Salvar" sem data de início ou de fim marca o campo com "Campo obrigatório". _(pages/PreVenda.tsx)_
- **MKT-21** "Salvar" sem itens destaca o bloco em vermelho e mostra o toast "Adicione ao menos um item". _(pages/PreVenda.tsx)_
- **MKT-22** Valor mínimo e limite por item são opcionais. _(pages/PreVenda.tsx)_

### Pré-venda criada
- **MKT-30** Título "Pré-venda" com selo "Rascunho" e o período "Disponível entre … e …". _(pages/PreVenda.tsx)_
- **MKT-31** Alerta: "Publique o evento para ativar a pré-venda no período definido". _(pages/PreVenda.tsx)_
- **MKT-32** Métricas Ofertas, Ticket médio e Maior oferta, zeradas enquanto não está em andamento. _(pages/PreVenda.tsx)_
- **MKT-33** Tabela de itens com Nome, Ofertas, Ticket médio, Valor mínimo e Limite, ordenável por coluna (números à direita); sem valor ou limite mostra "—". Mesma busca e filtro de tipo da configuração (MKT-13). _(pages/PreVenda.tsx)_
- **MKT-34** "Cancelar pré-venda" só aparece enquanto não está em andamento. "Editar" volta à configuração com os dados preenchidos. _(pages/PreVenda.tsx)_
- **MKT-35** Em andamento (só simulado), aparecem o gráfico "Acompanhamento de ofertas" e ofertas por item; a faixa de preço nunca começa abaixo do valor mínimo do item. _(pages/PreVenda.tsx)_

### Estados
- **MKT-40** Busca ou filtro sem resultado, dentro do cartão (BKS-118): "Nenhum item encontrado para “termo”." ou, no filtro sem itens daquele tipo, "Nenhum item encontrado: sua pré-venda não possui combos/ingressos selecionados.", sempre com "Limpar busca", que zera a busca e volta o filtro para Todos. Vale na configuração e na pré-venda criada (onde antes o filtro vazio não oferecia limpar). _(pages/PreVenda.tsx)_
- **MKT-41** Sem itens na configuração: o estado vazio do DS (BKS-117) com "Quais itens estarão na pré-venda?" e "Selecionar itens", num bloco com borda (vermelha no erro, MKT-21). Até 21/11/2026 era uma ilustração de radar com avatares. _(pages/PreVenda.tsx)_
- **MKT-42** As duas tabelas de itens seguem as listas do Backstage (BKS-110 a BKS-118): o título "Itens participantes" (com a quantidade e "Editar") fica acima da barra e do cartão de `../components/tabela.tsx`, com a paginação do DS acima de 10 itens. Com o cartão a partir de 704 px é tabela; mais estreito, cada item vira um bloco com o rótulo de cada valor, sem rolagem lateral (UI-MOB-005). Antes as tabelas tinham largura mínima de 820 px e rolavam de lado, com altura máxima de 632 px e rolagem interna. _(pages/PreVenda.tsx)_

## Depende de / afeta

- **Depende de:** evento publicado; catálogo de ingressos, sessões e combos do evento.
- **Afeta:** site e página do evento (selo de pré-venda, oferta do comprador), checkout das ofertas aceitas.

## Em aberto

- Sem entrada no menu: a rota é órfã. Decidir se entra em Marketing, ao lado de Passkey.
- Não usa `@/plataforma`: os itens deveriam vir do catálogo do evento em contexto e a pré-venda deveria ser gravada no evento.
- `publicado` é fixo em `false`: o selo é sempre "Rascunho" e o estado "Em andamento" nunca é alcançável (o atalho de simulação está no selo "Agendada", que não aparece).
- O período exibido é fixo ("01/02/2026 às 10:00" a "07/02/2026 às 10:00"), não as datas configuradas.
- Não valida data de fim depois da data de início.
- "Cancelar pré-venda" e o menu "Mais opções" da métrica Ofertas não fazem nada.
- "Limite de emissões do evento" e "Compartilhar valor do primeiro lote" são guardados, mas não aparecem nem têm efeito depois de salvar.
- Itens e sessões da árvore são fixos (Grupo A/B/C, 05 e 06/06/2026) e não batem com as datas do gráfico (01 a 07/02).
- `data/pre-venda-itens.ts` gera 100 itens que nada usa.
- As imagens do radar (`assets/radar/`) ficaram sem uso depois do MKT-41; continuam na pasta.
- O estado vazio do DS (`EmptyState.Title`) é um h1: com o vazio dos itens (MKT-41), a configuração fica com dois h1. Vem de `../components/tabela.tsx` (`VazioDaTabela`), compartilhado.

## Fontes

Nenhum link de Figma, Confluence ou Jira no código desta pasta.
