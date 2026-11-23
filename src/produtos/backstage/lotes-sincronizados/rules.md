# Lotes sincronizados: regras

> **Rotas:** `/backstage/vendas/lotes-sincronizados`, `/backstage/vendas/lotes-sincronizados/novo`
> **No menu:** Backstage › menu do evento › Ingressos e produtos › atalho Lotes sincronizados (BKS-119; até 22/11/2026, em Regras de venda)
> **Versão em uso:** única (`lotes-sincronizados/`)
> **Revisado em:** 2026-11-23

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

Gêmeo de `sync-rotation-groups` do Backstage de produção. Um conjunto junta ingressos que viram de
lote juntos (ex.: Inteira e Meia mudam de preço ao mesmo tempo): a virada dispara pela soma das
vendas do conjunto, não pelo estoque de cada lote.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Conjuntos (nome, itens com o lote inicial, gatilhos) | `@/plataforma` (`Evento.conjuntosSincronizados`) | sim, no banco |
| Vendas por lote (aprovadas e pendentes) | `@/plataforma` (`useCatalogo`) | não |
| Viradas, status e avanço | derivados em `data/conjuntos.ts` | não |

## Regras

### Lista
- ~~**LSI-01** Título "Lotes sincronizados", "Ingressos e produtos" para voltar (até 22/11/2026, "Regras de venda") e "Criar novo conjunto" (com conjuntos). Sem filtro nem busca, como em produção. Desde 21/11/2026 é a lista padrão do Backstage (BKS-110 a BKS-118): um cartão da tabela com as colunas Conjunto, Itens sincronizados e Virada atual, uma linha por conjunto e a paginação do DS acima de 10 conjuntos; carregando, linhas pulsando; vazio, o estado vazio do DS. _(pages/lotes-sincronizados.tsx)_~~ substituída por LSI-32 (o texto não citava o subtítulo).
- **LSI-32** Título "Lotes sincronizados", subtítulo "Ingressos que viram de lote juntos, pela soma das vendas.", "Ingressos e produtos" para voltar e "Criar novo conjunto" (com conjuntos). Sem filtro nem busca, como em produção. Lista padrão do Backstage (BKS-110 a BKS-118): cartão com as colunas Conjunto, Itens sincronizados e Virada atual, paginação do DS acima de 10 conjuntos; carregando, linhas pulsando; vazio, o estado vazio do DS. _(pages/lotes-sincronizados.tsx)_
- **LSI-02** Linha fechada: nome, Itens sincronizados (N) e Virada atual ("X de Y"); à direita, "Editar nome", "Excluir conjunto" e "Expandir/Recolher conjunto". Clicar na linha (o nome é o botão e cobre a linha, menos as ações) abre e fecha. A nota "A quantidade de viradas é baseada no item com mais lotes" aparece uma vez, abaixo do cartão (até 21/11/2026 ficava em cada cartão, com o ícone de link ao lado do nome).
- **LSI-03** Aberta, a linha mostra embaixo a tabela de viradas (em ordem), com as mesmas peças da lista (cabeçalho de colunas, linhas e células): "Viradas" ("Virada N" e "N itens sincronizados"), "Status", "Disparar virada após" e "Progresso da virada", com as dicas de produção. Abaixo de 704 px de largura do cartão (antes 640 px), cada virada vira bloco com o rótulo ao lado de cada valor; o mesmo vale para os itens da virada ("Avanço:"). O gatilho fica por cima do botão que cobre a linha da virada, para editar sem abrir e fechar.
- **LSI-04** Status: "Concluído" (cinza, com check), "Ativo" (vermelho, com ponto) e "Aguardando" (cinza). Só a primeira virada não concluída com gatilho fica Ativa; sem gatilho, ou depois dela, Aguardando.
- ~~**LSI-05** Gatilho editável na linha: "Definir" quando vazio, ou o valor com o lápis ("Definir gatilho de virada"). Enter ou sair do campo salva; Esc cancela. Só inteiro maior que zero ("Informe um número inteiro maior que zero."). Virada concluída mostra o valor e "meta atingida", sem editar. Toast "Gatilho da virada atualizado", ou "Virada disparada imediatamente" quando as vendas já passaram do novo gatilho.~~ substituída por LSI-37.
- **LSI-37** Gatilho editável na linha (desde 23/11/2026): "Definir" quando vazio (sem o lápis ao lado, que levava ao mesmo lugar), ou o valor com o lápis ("Definir gatilho de virada"). Enter ou sair do campo salva; Esc cancela. Só inteiro maior que zero ("Informe um número inteiro maior que zero."). Virada concluída mostra o valor e "meta atingida", sem editar. Toast "Gatilho da virada atualizado", ou "Virada disparada imediatamente" quando as vendas já passaram do novo gatilho. _(pages/lotes-sincronizados.tsx)_
- **LSI-06** Progresso: barra com as vendas pendentes (amarelo) e aprovadas (verde) sobre o gatilho, e "vendidos/gatilho" ("vendidos/—" sem gatilho).
- ~~**LSI-07** Abrir uma virada mostra os itens: nome, "Ingresso", "· Grupo: X" e o avanço ("Avança na próxima virada" ou "Avançou nesta virada", com "Lote 1 → Lote 2"), ou os selos "Aguardando próxima virada", "Sem próximo lote" e "Item inativo".~~ substituída por LSI-36.
- **LSI-36** Abrir uma virada mostra os itens (desde 23/11/2026): nome e "Ingresso", com "Grupo: X" na linha de apoio (sem "·"), e o avanço ("Avança na próxima virada" ou "Avançou nesta virada", com "Lote 1 para lote 2", sem seta), ou os selos "Aguardando próxima virada", "Sem próximo lote" e "Item inativo". _(pages/lotes-sincronizados.tsx)_
- **LSI-08** Com virada sem gatilho depois da próxima (lotes novos entraram), aparece antes dela o aviso "Novos lotes foram adicionados aos itens deste conjunto. **Defina o gatilho das viradas para manter a sincronização atualizada.**".
- **LSI-09** "Editar nome" vira campo na linha (até 120 caracteres; vazio: "Informe um nome"); Enter ou sair salva, Esc cancela; salvo, um check aparece por 2 s.
- **LSI-20** "Excluir conjunto" confirma ("Excluir o conjunto X é irreversível. Os itens voltarão a vender individualmente.", mais o aviso de viradas já executadas) e pode ser feito a qualquer momento. Toast "Conjunto excluído com sucesso".

### Criação
- ~~**LSI-10** Página própria: "Lotes sincronizados" para voltar, título "Novo conjunto sincronizado", "Voltar" e "Criar conjunto". Duas seções numeradas, sem passos. _(pages/novo-conjunto.tsx)_~~ substituída por LSI-33 (o código usava "Cancelar").
- ~~**LSI-11** "1. Defina um nome para o conjunto": "Nome" (placeholder "Exemplo: Só camarotes"), obrigatório ("O nome é obrigatório", com foco no campo).~~ substituída por LSI-33.
- ~~**LSI-12** "2. Selecione os itens que serão incluídos no conjunto": busca "Busque por grupo ou item" e um cartão por sessão ("2 de out. às 23:00"), com os grupos e os ingressos (caixa, nome, "Ingresso" e "N lotes").~~ substituída por LSI-33 (lista toda aberta: 5 mil caixas e 1 s por clique com `?escala=5000`).
- **LSI-33** Criação (desde 23/11/2026): página própria com "Lotes sincronizados" para voltar, título "Novo conjunto sincronizado", "Cancelar" e "Criar conjunto". Duas seções sem número: "Nome do conjunto" ("Nome", placeholder "Exemplo: Só camarotes", obrigatório: "Informe o nome do conjunto.", com foco no campo) e "Ingressos que viram de lote juntos", com a nota "A quantidade de viradas é baseada no ingresso com mais lotes.". Os ingressos vêm na árvore comum (`ArvoreDeIngressos`, UI-LST-005): sessão › grupo › ingresso, grupos recolhidos, marcar a sessão ou o grupo inteiro, busca, "Selecionados" e "Mostrar mais". A árvore só tem os ingressos que podem entrar (LSI-13); abaixo dela, "N ingressos não aparecem aqui", com o porquê e "Ver quais" (cada um com o motivo: "Já está em “X”", "Inativo" ou "Sem lote à venda"). Com `?escala=5000`: 30 linhas, cerca de 1.100 nós e 22 ms por clique (antes, 5 mil caixas, 68 mil nós e 1 s). _(pages/novo-conjunto.tsx)_
- **LSI-13** Ingresso que já está em outro conjunto ("Já está em “X”"), inativo ou sem lote à venda não pode ser marcado: um item fica em um conjunto só.
- ~~**LSI-14** Painel "Itens" à direita: "N de M itens selecionados", "Você ainda não selecionou nenhum item" e, para cada um, grupo, sessão, "Lote N sincronizado" e "Remover"; "Remover todos" limpa.~~ substituída por LSI-35.
- **LSI-35** Painel "Itens" à direita (desde 23/11/2026): o resumo ("60 ingressos em 7 grupos" ou "Nenhum ingresso selecionado"), "Remover todos" e cada ingresso com o grupo (e a data, "2 out 2026, 23:00", quando há várias sessões), "Começa no lote N" e "Remover"; 20 por vez, com "Mostrar mais". _(pages/novo-conjunto.tsx)_
- **LSI-15** Cada ingresso entra a partir do lote vigente (o primeiro com saldo). Viradas = (mais lotes restantes entre os itens) − 1.
- ~~**LSI-16** Criar sem item: "Selecione ao menos um item". Sem virada possível: "Nenhum item possui mais de um lote — não é possível criar viradas.". Criado: "Conjunto criado com N viradas. Defina o gatilho para começar." e volta para a lista. Os gatilhos não são definidos na criação.~~ substituída por LSI-34.
- **LSI-34** Os erros da criação aparecem na seção dos ingressos, começando pela ação (desde 23/11/2026; antes, só em toast): "Selecione ao menos um ingresso para criar o conjunto." e "Escolha ao menos um ingresso com mais de um lote: com um lote só não há virada.". Mudar a escolha tira o erro. Criado: toast "Conjunto criado com N viradas. Defina o gatilho para começar." e volta para a lista. Os gatilhos não são definidos na criação. _(pages/novo-conjunto.tsx)_

### Cálculo
- **LSI-21** Na virada N, cada item está no lote inicial + N − 1. O progresso soma as vendas (aprovadas e pendentes) desses lotes dos itens ativos. A virada conclui quando o progresso chega ao gatilho; virada sem gatilho, ou abaixo dele, segura as seguintes.

### Fora da tela
- **LSI-30** Em Ingressos e produtos, o ingresso num conjunto mostra "Sincronizado" na coluna Virada de lote. _(itens/pages/Ingressos.tsx)_

- **LSI-31** Fora do Backstage: no link de compra, na bilheteria e nas cortesias, o ingresso de um conjunto vende o lote inicial + as viradas executadas. Ele só muda de lote quando o conjunto vira; se o lote da vez acabar antes do gatilho, o ingresso fica esgotado até a virada. _(@/plataforma `loteAVenda`, `viradasExecutadas`)_

## Depende de / afeta

- **Depende de:** ingressos com mais de um lote.
- **Afeta:** o lote à venda no link de compra, na bilheteria e nas cortesias (LSI-31).

## Em aberto

- O status "Ativo" da virada usa a cor de erro (vermelho, LSI-04), como em produção; a critique de 22/11/2026 sugeriu outra cor. Depende da decisão "gêmeo de produção × guia".
- Marcar um grupo inteiro na árvore grava os ingressos que ele tem agora; ingresso criado depois não entra sozinho no conjunto (regra da árvore comum, ABV-04).

- Em Ingressos e produtos, o estado de cada lote (à venda ou aguardando) ainda usa a regra individual, não o conjunto.
- Combos não entram: no protótipo, combo não tem lotes. Em produção há a aba "Combos".
- Não há "Selecionar próximo lote" nem a escolha do lote inicial, porque no protótipo não existem vários lotes abertos ao mesmo tempo.
- Em produção o título da criação mostra "Chave de acesso" (erro de texto); aqui é "Novo conjunto sincronizado". Em produção o item está atrás de uma flag e só no desktop.

## Fontes

- Levantamento do Backstage de produção (awa-workspace, só leitura), `pesquisas/gemeo-backstage/estrategias-de-venda.md`, seção 1.
