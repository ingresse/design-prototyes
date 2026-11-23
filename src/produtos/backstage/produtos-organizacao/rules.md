# Produtos da organização: regras

> **Rotas:** `/backstage/produtos`, `/backstage/produtos/:id` (`novo` cria)
> **No menu:** Backstage › menu da organização › Produtos (rail, barra do topo e gaveta mobile)
> **Versão em uso:** única (`produtos-organizacao/`)
> **Revisado em:** 2026-11-22

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

A biblioteca de produtos da organização (camiseta, copo, estacionamento). Aqui se define o que vale
para todos os eventos. Cada evento só escolhe quais vender e define preço, estoque, transferência e
se está à venda (Itens › Produtos, `itens/rules.md` ITM-50 a 53).

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Produtos | `Organizacao.produtos` da organização em contexto; sem ela, 4 produtos iniciais de exemplo | sim (`salvarBiblioteca`) |
| Em quantos eventos | `Evento.produtos` dos eventos da organização | não |

## Regras

- **POR-01** A lista mostra imagem, nome, "Em N eventos" (ou "Em nenhum evento") e o preço sugerido, por nome, na lista padrão do Backstage (BKS-110 a BKS-118, desde 21/11/2026): busca à esquerda sempre que há produtos (sem filtro de status: o produto da organização não tem status), cartão da tabela com as colunas Produto e Preço sugerido, o nome como botão que abre o produto e cobre a linha, e a paginação do DS acima de 10 (busca ou tamanho voltam à página 1). Abaixo de 704 px de largura do cartão, cada linha vira bloco com "Preço sugerido:" ao lado do valor. Carregando: linhas pulsando. Busca sem resultado: "Nenhum produto encontrado." dentro do cartão, com "Limpar busca". Até 21/11/2026 eram cartões soltos, com busca e "N de M" só acima de 8 e "Mostrar mais" acima de 20. _(pages/ProdutosDaOrganizacao.tsx)_
- **POR-02** "Criar produto" (ação do cabeçalho, só quando já há produtos) abre o detalhe em modo novo. Vazio: o estado vazio do DS "Nenhum produto ainda" com "Criar produto". _(pages/ProdutosDaOrganizacao.tsx)_
- **POR-03** ~~Detalhe: Informações (nome obrigatório, descrição, imagem PNG/JPG até 400 KB, preço sugerido obrigatório, "Cada evento começa com este preço e pode mudar.") e Vendas (quantidade por pedido, igual à do catálogo). Edição em rascunho com a barra de salvar e confirmação ao sair.~~ Substituída por POR-09 (imagem) e POR-11 (detalhe e barra de salvar) em 22/11/2026.
- **POR-04** ~~Excluir só produto que não está em nenhum evento, com confirmação; em uso, a tela diz "Está em N eventos: remova deles antes de excluir."~~ Substituída por POR-07 em 22/11/2026 (a tela passou a dizer quais eventos e a levar até eles).
- **POR-05** Ícones do menu da organização são animações do Iconly em traço (Calendar, users, Wallet, Shopping Cart, bag, users group, Setting, Add user), que tocam uma vez no hover ou foco e ficam paradas com reduzir movimento (UI-DS-008). _(components/icones-organizacao.ts, components/Backstage.tsx)_

- **POR-07** Excluir só produto que não está em nenhum evento, com confirmação. Em uso, no lugar do botão: "Para excluir, tire o produto deste evento antes:" (ou "destes N eventos") e a lista dos eventos, cada um um link que põe o evento em contexto e abre a aba Produtos de Ingressos e produtos (`/backstage/catalogo/produtos`). Até 22/11/2026 a tela só dizia "Está em N eventos", sem nome nem caminho. _(pages/ProdutoDaOrganizacaoDetalhe.tsx, data/biblioteca.ts `eventosDoProduto`)_
- **POR-08** A busca da lista fica na URL (`?busca=`); abrir um produto e voltar (pelo voltar, ao sair ou ao excluir) devolve a lista filtrada como estava. _(pages/ProdutosDaOrganizacao.tsx, pages/ProdutoDaOrganizacaoDetalhe.tsx)_
- **POR-09** Imagem: PNG ou JPG de até 10 MB. No envio, a imagem é reduzida para no máximo 600 px de lado e comprimida (WebP quando o navegador grava WebP; senão JPEG, ou PNG se a original é PNG), e só o resultado vai para o banco. Uma foto de 2.400 px vira cerca de 100 KB. Arquivo acima de 10 MB: "Escolha uma imagem de até 10 MB: esta tem X MB." Até 22/11/2026 o limite era 400 KB do arquivo original, gravado como veio. _(pages/ProdutoDaOrganizacaoDetalhe.tsx `reduzirImagem`)_
- **POR-10** Produto inexistente no endereço: o estado vazio do DS "Produto não encontrado" com "Voltar para produtos" (antes o vazio não tinha ação). _(pages/ProdutoDaOrganizacaoDetalhe.tsx)_
- **POR-11** Detalhe: Informações (nome obrigatório, descrição, imagem, preço sugerido obrigatório, "Cada evento começa com este preço e pode mudar.") e Vendas (quantidade por pedido, igual à do catálogo). Subtítulo: "Em N eventos." (ou "Ainda não está em nenhum evento."); no novo, "Depois de criado, adicione o produto aos eventos em Ingressos e produtos." (BKS-88). Edição em rascunho com confirmação ao sair; a barra de salvar só aparece depois que algo muda, também no produto novo. Até 22/11/2026 o subtítulo dizia "Vendido em N eventos" (estar no evento não é ter vendido), o novo citava "Itens › Produtos" e a barra abria com a tela vazia. _(pages/ProdutoDaOrganizacaoDetalhe.tsx)_
- **POR-12** Campo de imagem: rótulo "Imagem" com o `Label` do DS, ligado ao grupo do campo (`aria-labelledby`); a prévia fica direto no cartão da seção (miniatura, dica e "Remover imagem"), sem moldura própria. Até 22/11/2026 o rótulo era um texto solto e a prévia, uma caixa dentro do cartão. _(pages/ProdutoDaOrganizacaoDetalhe.tsx `CampoImagem`)_

## Em aberto

- Produtos da organização importa a busca (`paraBusca`) e os textos de `itens/` (projeto irmão), o que a regra de pastas do repositório proíbe; mover para `backstage/components/` quando der. Desde 22/11/2026 também importa `setEventoAtual` de `eventos/` (POR-07), como Pedidos já fazia.
- Salvar um produto regrava a biblioteca inteira (`salvarBiblioteca`, em `itens/data/catalogo.ts`, grava o documento da organização com todos os produtos). Não é simples separar sem mudar o modelo (`Organizacao.produtos`); registrado pela critique de 22/11/2026 (UI-LST-002). As imagens de até 400 KB gravadas antes de POR-09 continuam como estavam até alguém trocá-las.
- Lista no celular em bloco com rótulo (POR-01) × tabela-lista (UI-MOB-005): não decidido, ver Pedidos.

- Variações de produto (tamanho da camiseta) não existem: cada variação vira um produto.
- Regras de venda antigas gravadas no produto do evento (`ProdutoNoEvento.vendas`) não são mais lidas; saem quando o produto do evento é salvo.
- Finanças e Ajustes seguem sem tela.
