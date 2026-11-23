# Cupom de desconto: regras

> **Rotas:** `/backstage/marketing/cupons`
> **No menu:** Backstage › menu do evento › Ingressos e produtos › atalho Cupons (BKS-119; até 22/11/2026, em Divulgação)
> **Versão em uso:** única (`cupons/`)
> **Revisado em:** 2026-11-23

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

Gêmeo da tela `coupons` do Backstage de produção. A produtora cria cupons por código (gerados ou
digitados), define desconto, limites e validade, e escolhe em quais lotes e combos ele vale.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Cupons do evento | `@/plataforma` (`Evento.cupons`) | sim, no banco |
| Catálogo do evento (grupos, lotes, combos) | `@/plataforma` (`useCatalogo`) | não |

## Regras

### Lista
- **CUP-62** Título "Cupom de desconto", "Ingressos e produtos" para voltar e, com cupons, as ações no cabeçalho (BKS-104): "Novo cupom" (primário) e "Exportar". Sem cupons, "Novo cupom" fica no vazio. Até 22/11/2026 criar ficava só no pé do cartão, depois da paginação. Na barra comum das listas (BKS-111), busca "Buscar cupom" (pelo código) à esquerda e filtro "Todos", "Ativos", "Inativos" à direita. Mudar filtro ou busca volta à página 1. _(pages/cupons.tsx)_
- ~~**CUP-01** Título "Cupom de desconto", "Ingressos e produtos" para voltar (até 22/11/2026, "Divulgação") e "Exportar" à direita (só com cupons). Na barra comum das listas (BKS-111), busca "Buscar cupom" (pelo código) à esquerda e filtro "Todos", "Ativos", "Inativos" em botões segmentados à direita; até 21/11/2026 ficavam trocados. Mudar filtro ou busca volta à página 1. _(pages/cupons.tsx)_~~ substituída por CUP-62.
- **CUP-02** Colunas: seleção, "Cupom" (código e vínculos), "Status" (toggle e "Ativo"/"Inativo"), "Desconto" ("10%" ou "R$ 10,50") e "Itens vendidos" ("usados de limite"; sem limite, "de ilimitado"). Cupom mais novo primeiro.
- **CUP-03** A lista usa o cartão e as linhas comuns (`../components/tabela.tsx`, BKS-110). A tabela depende da largura do cartão: abaixo de 704 px (celular), cada cupom vira um bloco com os rótulos ao lado dos valores, sem rolagem lateral (UI-MOB-005); o cabeçalho continua com a caixa e "Selecionar a página". _(pages/cupons.tsx)_
- **CUP-04** Cada linha tem "Copiar link do cupom" (link de compra do evento com `?cupom=CÓDIGO`; o ícone vira check com "Link copiado!" por 2 s) e o menu "Mais opções": "Editar cupom", "Editar vínculos", "Desvincular tudo", "Ativar" ou "Desativar" e "Excluir".
- **CUP-05** A caixa do cabeçalho marca ou desmarca só a página atual, com estado parcial.
- ~~**CUP-06** Paginação no navegador, igual à de Etiquetas (ETQ-04). Embaixo da tabela, "+ Novo cupom".~~ substituída por CUP-62.
- **CUP-64** "Exportar" baixa um CSV dos cupons do filtro (Cupom, Status, Desconto, Itens vendidos, Limite por itens, Vínculos). Antes, prometia um e-mail que não existe. _(pages/cupons.tsx)_
- ~~**CUP-07** "Exportar" mostra "Solicitando exportação..." e depois "Você vai receber o arquivo por e-mail em alguns minutos" (simulado: não gera arquivo).~~ substituída por CUP-64.
- **CUP-65** Com seleção, a barra de ações em lote fica dentro do cartão, no topo, com fundo secundário (a mesma da Passkey, CHA-45; antes flutuava no rodapé): "N cupons selecionados", "Ativar" e "Desativar" (só o que se aplica), "Novas associações", "Desvincular tudo", "Excluir" e o X que limpa a seleção. _(pages/cupons.tsx)_
- **CUP-66** Com a página toda marcada e mais cupons no filtro, a barra oferece "Selecionar todos os N cupons" (todos os do filtro, não só a página). _(pages/cupons.tsx)_
- ~~**CUP-08** Com seleção, uma barra flutua no rodapé ("Ações para cupons selecionados"): "Ativar" e "Desativar" (só o que se aplica), "Novas associações", "Desvincular tudo", "Excluir" e o X que limpa a seleção.~~ substituída por CUP-65.
- **CUP-61** O toggle de status e "Ativar"/"Desativar" do menu da linha gravam na hora, com aviso ("Cupom X ativado." / "desativado.") e "Desfazer", como a Passkey (CHA-44). Ativar e desativar em lote, excluir e desvincular confirmam antes, com os textos de produção, no singular ou no plural ("Deseja desativar os cupons selecionados?" … "Sim, desative"); excluir e desvincular são destrutivos (vermelho), sem toast de sucesso. _(pages/cupons.tsx)_
- ~~**CUP-09** Ativar, desativar, excluir e desvincular confirmam antes, com os textos de produção, no singular ou no plural ("Deseja desativar os cupons selecionados?" … "Sim, desative"). Excluir e desvincular são destrutivos (vermelho). Sem toast de sucesso, como em produção.~~ substituída por CUP-61.

### Criação (painel lateral, 682 px; título em português desde 23/11/2026, CUP-68)
- **CUP-60** Criar em três etapas no mesmo painel, com "Etapa N de 3" abaixo do título, "Voltar" para a etapa anterior (sem perder o preenchido) e nada gravado até o fim (desde 23/11/2026; antes, a etapa 2 já criava os cupons). Etapa 1, "Como quer criar os seus cupons?": o componente comum com a Passkey (`../components/como-criar-codigos.tsx`, CHA-49): rádio só no cabeçalho do cartão e campos como irmãos, fora do rótulo, então o clique no campo foca o campo (antes, focava o rádio e o digitado se perdia). Nenhum escolhido de início; "Continuar" desabilitado até o método valer. Etapa 2, "Quais são as regras do cupom?" (CUP-30 a CUP-34), com "N cupons serão criados." no rodapé. Etapa 3, "Quais ingressos fazem parte deste cupom?" (CUP-69); "Criar N cupons" (desabilitado sem item) grava os cupons, ativos e com os vínculos, mostra "N cupons criados." e fecha. _(components/painel-de-cupons.tsx)_
- **CUP-63** Fechar o painel (X, Esc, "Cancelar") com algo preenchido pergunta "Descartar o que você preencheu?" ("Continuar editando" ou "Descartar"); clicar fora não fecha. Sem alteração, fecha direto. Vale para criar, editar regras e editar vínculos. _(components/painel-de-cupons.tsx, ../components/painel-lateral.tsx)_
- **CUP-68** Os painéis têm o título como nome acessível e "Fechar" em português (antes, "Slideout menu" e "Close"); editar mostra o código do cupom abaixo do título. _(../components/painel-lateral.tsx)_
- ~~**CUP-10** Passo 1, "Como quer criar os seus cupons?": dois cartões, nenhum escolhido de início; o escolhido abre os campos. "Criar e definir regras" fica desabilitado até o método estar válido. Nada é gravado neste passo. _(components/painel-de-cupons.tsx)_~~ substituída por CUP-60.
- **CUP-11** Automático: "Quantidade" (até 5.000) e "Prefixo (opcional)", com seis exemplos do código que será gerado. Gera o prefixo em maiúsculas mais 6 letras ou números, sem repetir os códigos do evento. _(data/cupons.ts)_
- **CUP-67** Manual: "Cupons", separados por vírgula ou linha, até 1.000, com contador "N / 1.000". A lista inteira é validada como na Passkey (CHA-51): inválidos (vermelho) e repetidos, na lista ou no evento (amarelo, "repetido"), aparecem destacados embaixo, cada um com o X para tirar; inválido bloqueia; repetido não é criado; "N cupons serão criados.". "Importar cupons" lê .csv ou .txt (vírgula ou linha, ignora o cabeçalho "Cupons"), soma ao digitado, traz também os inválidos (antes, sumiam em silêncio), fica com os 1.000 primeiros e avisa se o arquivo tinha mais. "Baixar modelo de importação" (antes, "Clique aqui") baixa o modelo. _(components/painel-de-cupons.tsx, data/cupons.ts)_
- ~~**CUP-12** Manual: "Cupons", separados por vírgula, até 1.000, com contador "N / 1.000". Os inválidos aparecem destacados embaixo da caixa, com "Cupom inválido encontrado. Ajuste o formato dos cupons destacados para continuar.". "Importar cupons" lê .csv ou .txt (vírgula ou linha, ignora o cabeçalho "Cupons"), fica com os 1.000 primeiros e avisa se o arquivo tinha mais. "Clique aqui" baixa o modelo de importação.~~ substituída por CUP-67.
- ~~**CUP-13** Passo 2, "Quais são as regras do cupom?": Desconto, Limite de uso e Período de validade (CUP-30 a CUP-36). "Definir regras e ver associações" cria os cupons, ativos e sem vínculos. Código que já existe no evento não é criado: "N de M cupons não foram criados: já existem neste evento.". _(components/formulario-de-regras.tsx)_~~ substituída por CUP-60.
- **CUP-69** Vínculos (etapa 3, "Editar vínculos" e "Novas associações"): abas Ingressos, Combos e Conferir. Ingressos na árvore comum com escala (`ArvoreDeIngressos`, UI-LST-005): grupos recolhidos, marcar sessão ou grupo inteiro, busca, "Selecionados" e "Mostrar mais". Marcar um ingresso marca todos os lotes dele; em "Conferir", "Escolher lotes" deixa só alguns, e os lotes parciais aparecem listados. Grava só lotes e combos. Rodapé com o resumo ("60 ingressos em 7 grupos e 2 combos"). Antes, árvore própria com tudo aberto. _(../components/arvore-de-vinculos.tsx)_
- ~~**CUP-14** Passo 3, "Quais ingressos fazem parte deste cupom?": a árvore de vínculos (combos primeiro, depois os grupos, com ingressos e lotes; sem produtos), com busca e "Ver apenas marcados". Marcar grupo ou ingresso marca os lotes. Grava só lotes e combos. "Associar ingressos" (desabilitado sem marcação) adiciona os vínculos, mostra "Ingressos associados com sucesso!" e fecha. Fechar no passo 3 deixa os cupons criados, sem vínculos.~~ substituída por CUP-69.

### Edição
- **CUP-15** "Editar cupom" abre "Editar regras do cupom" com as regras atuais. Cupom já usado mostra o aviso "Este cupom já foi utilizado. Nesse caso, somente os limites de uso e a data final podem ser alterados." e esconde Desconto e Data inicial. "Salvar regras".
- **CUP-16** "Editar vínculos" abre a árvore marcada com os vínculos do cupom e troca todos ao associar. "Novas associações" (em lote) abre vazia e só adiciona.
- **CUP-17** "Desvincular tudo" deixa o cupom com "Nenhum vínculo".

### Na compra (desde 21/11/2026)
- **CUP-50** No link de compra, "Adicionar código ou cupom" aceita os códigos do evento, sem diferenciar maiúsculas; a ajuda diz o desconto ("10% de desconto nos itens participantes."). _(marketplace/selecao-e-atribuicao/data/plataforma.ts)_
- **CUP-51** Só vale cupom ativo, dentro da validade e dos limites: o modal diz por quê ("Este cupom não está ativo.", "Este cupom expirou.", "Este cupom já foi totalmente utilizado.", "Você já usou este cupom o máximo de vezes."). _(@/plataforma `motivoDoCupomInvalido`)_
- **CUP-52** Um cupom por pedido. O desconto vale só nos lotes e combos vinculados, nunca em item gratuito; com "Por itens da compra" = N, só nas N unidades mais caras; percentual arredonda para baixo e valor fixo nunca deixa o item negativo. O desconto vai no pedido, sai do total e aparece no checkout como "Desconto (CÓDIGO)". _(@/plataforma `descontoDoCupom`, `criarPedido`)_
- **CUP-53** Pago o pedido, "Itens vendidos" soma as unidades que receberam desconto; o limite por comprador conta os pedidos pagos dele com o cupom. _(@/plataforma `pagarPedido`)_

### Validações
- **CUP-20** Código: só letras e números, gravado em maiúsculas, único no evento.
- **CUP-22** Cupom já usado não é excluído: no menu, "Excluir" vira "Cupom já usado não pode ser excluído", desabilitado; no lote, "Excluir" fica desabilitado, e se escapar, abre "Não foi possível excluir alguns cupons".
- **CUP-30** Desconto obrigatório ("Campo obrigatório"). "Percentual" ou "Valor fixo"; trocar o tipo limpa o valor. Percentual vai até 100.
- **CUP-31** Limites "Por itens", "Por comprador" e "Por itens da compra", opcionais ("Ilimitado"), inteiros a partir de 1. Apagar o campo volta a ilimitado (em produção não volta).
- **CUP-32** "Por comprador" não pode passar de "Por itens": "Não pode ser maior que o limite “Por itens”.".
- **CUP-33** Data inicial obrigatória ("A data inicial é obrigatória."); sem hora, vale 00:00. Data final opcional; sem ela, o cupom não expira.
- **CUP-34** A data final vem depois da inicial: "A data final não pode ser anterior à data inicial.".

### Estados
- **CUP-40** Vazio: "Ofereça descontos e atraia mais compradores", com "Novo cupom".
- **CUP-41** Filtro ou busca sem resultado: "Nenhum cupom encontrado para essa busca ou filtro." dentro do cartão, com "Limpar busca", que apaga a busca e volta o filtro para "Todos" (BKS-118). _(pages/cupons.tsx)_
- **CUP-42** Carregando: o cabeçalho e três linhas pulsando (BKS-116). _(pages/cupons.tsx)_

## Depende de / afeta

- **Depende de:** catálogo do evento (lotes e combos).
- **Afeta:** o link de compra e o checkout (CUP-50 a CUP-53).

## Em aberto

- Diferenças propositais de produção: "1 vínculo" no singular, "de ilimitado" em vez de "de 0" e limite apagado volta a ilimitado.
- Gêmeo de produção × guia (decisão em aberto): criar no cabeçalho, toggle sem confirmação, três etapas sem gravar no meio e o painel de 682 px seguem o guia, não produção. Se a decisão for seguir produção, voltar CUP-60, CUP-61 e CUP-62.
- Marcar um grupo inteiro grava os lotes que ele tem agora; lote criado depois não recebe o cupom sozinho.
- Editar regras continua no painel; a régua de formulários (data e hora separadas, hora nativa, EVT-65) ainda não foi decidida.

## Fontes

- Levantamento do Backstage de produção (awa-workspace, só leitura), `pesquisas/gemeo-backstage/marketing.md`, seção 1.
