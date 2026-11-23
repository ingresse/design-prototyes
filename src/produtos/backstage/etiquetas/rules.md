# Etiquetas: regras

> **Rotas:** `/backstage/marketing/etiquetas`, `/backstage/marketing/etiquetas/nova`, `/backstage/marketing/etiquetas/:id`
> **No menu:** Backstage › menu do evento › Ingressos e produtos › atalho Etiquetas (BKS-119; até 22/11/2026, em Divulgação)
> **Versão em uso:** única (`etiquetas/`)
> **Revisado em:** 2026-11-23

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

Gêmeo da tela `tags` do Backstage de produção. Etiquetas como "Últimos ingressos" ou "Área VIP"
destacam grupos, lotes, combos e produtos na compra.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Etiquetas e vínculos | `@/plataforma` (`Organizacao.etiquetas`) | sim, no banco |
| Catálogo do evento (grupos, lotes, combos, produtos) | `@/plataforma` (`useCatalogo`) | não |

## Regras

### Comportamento
- **ETQ-01** A etiqueta é da organização, não do evento: a tela lista todas as etiquetas da organização, em ordem de criação, e conta só os vínculos do evento em contexto ("Nenhum vínculo", "1 vínculo", "N vínculos"). Etiqueta criada em outro evento aparece aqui com "Nenhum vínculo". _(data/etiquetas.ts)_
- **ETQ-54** A tabela tem a coluna "Etiqueta" (nome e vínculos) e o menu de cada linha ("Opções de etiqueta"): "Editar vínculos", "Desvincular tudo" (desabilitado sem vínculo neste evento) e "Remover etiqueta". "Nova etiqueta" fica no cabeçalho (BKS-104), com etiquetas; sem, no vazio. Até 22/11/2026 ficava no pé do cartão. Sem ações em lote nem ordenação. _(pages/etiquetas.tsx)_
- ~~**ETQ-02** A tabela tem a coluna "Etiqueta" (nome e vínculos) e o menu de cada linha ("Opções de etiqueta"): "Editar vínculos", "Desvincular tudo" e "Remover etiqueta". Embaixo, "+ Nova etiqueta". Sem ações em lote nem ordenação. _(pages/etiquetas.tsx)_~~ substituída por ETQ-54.
- **ETQ-03** A busca ("Buscar etiqueta") aparece quando há etiquetas e filtra pelo nome, sem diferenciar maiúsculas.
- **ETQ-04** Paginação no navegador: "Mostrando 1-10 de N", "Itens por página" (10, 25, 50), página anterior e próxima; aparece com mais de 10 etiquetas. _(components/rodape-de-paginacao.tsx)_
- **ETQ-05** "Nova etiqueta" abre o painel lateral em `/etiquetas/nova`; "Editar vínculos" abre em `/etiquetas/:id`. Fechar (X, fundo ou voltar do navegador) volta para a lista.
- **ETQ-55** Passo 1, "Criar nova etiqueta": "Nome da etiqueta" (placeholder "Ex: Últimos ingressos") e o contador "n/30", que fica em aviso no limite (a dica "Limite de 30 caracteres." saiu: repetia o contador), com "Voltar" e "Criar etiqueta". Criar grava na hora e passa ao passo 2 da etiqueta nova. Os painéis têm o título como nome acessível e "Fechar" em português (antes, "Slideout menu"); fechar com algo preenchido (nome digitado ou itens marcados) pergunta "Descartar o que você preencheu?", e clicar fora não fecha. _(pages/etiquetas.tsx, ../components/painel-lateral.tsx)_
- ~~**ETQ-06** Passo 1, "Criar nova etiqueta": "Nome da etiqueta" (placeholder "Ex: Últimos ingressos", dica "Limite de 30 caracteres." e contador "n/30", que fica em aviso no limite), com "Voltar" e "Criar etiqueta". Criar grava na hora e passa ao passo 2 da etiqueta nova.~~ substituída por ETQ-55.
- **ETQ-52** Passo 2, "Quais itens podem usar essa etiqueta?" (o nome abaixo do título): abas Ingressos, Combos, Produtos (os ativos no evento) e Conferir. Ingressos na árvore comum com escala (`ArvoreDeIngressos`, UI-LST-005): grupos recolhidos, marcar sessão ou grupo inteiro, busca, "Selecionados" e "Mostrar mais". Grupo com todos os ingressos e lotes marcados vira vínculo do grupo; ingresso marcado vincula os lotes dele; em "Conferir", "Escolher lotes" deixa só alguns. O rodapé mostra o resumo ("2 ingressos em 1 grupo"). "Salvar" troca os vínculos deste evento (os de outros eventos ficam), com "Etiqueta atualizada com sucesso." e fecha. Antes, árvore própria com tudo aberto. _(pages/etiquetas.tsx, ../components/arvore-de-vinculos.tsx)_
- ~~**ETQ-07** Passo 2, "Quais itens podem usar essa etiqueta?": árvore com combos, grupos de ingressos (com a data quando o evento tem várias sessões) e "Produtos" (os produtos ativos no evento), com busca ("Busque por nome de grupo, item ou lote") e "Ver apenas marcados". _(components/arvore-de-vinculos.tsx)_~~ substituída por ETQ-52.
- ~~**ETQ-08** Marcar o grupo vincula o grupo inteiro e não marca os lotes; marcar um ingresso marca todos os lotes dele; combos e produtos marcam um a um.~~ substituída por ETQ-52.
- ~~**ETQ-09** Depois da primeira mudança, o rodapé mostra "N marcações". "Salvar" troca os vínculos deste evento (os de outros eventos ficam) com o toast "Etiqueta atualizada com sucesso." e fecha.~~ substituída por ETQ-52.
- **ETQ-10** Reabrir "Editar vínculos" mostra marcado o que já está vinculado neste evento.
- **ETQ-51** "Desvincular tudo" tira só os vínculos deste evento (desde 23/11/2026; antes, apagava os de todos os eventos sem dizer). A confirmação diz o alcance: "Desvincular tudo deste evento?" / "A etiqueta “X” sai de N itens deste evento. Os vínculos em outros eventos continuam.". Toast "Vínculos deste evento removidos.". _(pages/etiquetas.tsx)_
- ~~**ETQ-11** "Desvincular tudo" confirma ("Desvincular tudo?" / "Todos os itens vinculados a essa etiqueta serão desvinculados. Esta ação não pode ser desfeita.") e tira os vínculos de todos os eventos. Toast "Vínculos removidos com sucesso.".~~ substituída por ETQ-51.
- **ETQ-12** "Remover etiqueta" confirma ("Remover etiqueta?") e apaga a etiqueta da organização inteira, com os vínculos. Toast "Etiqueta removida com sucesso.".
- **ETQ-13** Não dá para renomear uma etiqueta, como em produção.

### Na compra (desde 21/11/2026)
- **ETQ-50** No link de compra, cada ingresso mostra, ao lado do nome, as etiquetas vinculadas ao grupo dele ou ao lote à venda (até 3). Produtos e combos ainda não aparecem no link, então as etiquetas deles não aparecem. _(marketplace/selecao-e-atribuicao/data/plataforma.ts)_

### Validações
- **ETQ-20** Nome obrigatório ("O nome é obrigatório."), até 30 caracteres ("Máximo de 30 caracteres.") e único na organização, sem diferenciar maiúsculas ("Já existe uma etiqueta com esse nome."). Valida ao sair do campo e ao criar.
- **ETQ-53** No máximo 3 etiquetas por item: salvar além disso não grava e mostra no painel quais itens estouram ("Tire N itens para salvar: eles já têm 3 etiquetas.", com os nomes; antes, só um toast sem dizer o item). _(pages/etiquetas.tsx)_
- ~~**ETQ-21** No máximo 3 etiquetas por item: salvar além disso mostra "O limite de etiquetas por item já foi atingido." e não grava.~~ substituída por ETQ-53.

### Estados
- **ETQ-40** Vazio: "Crie etiquetas para destacar seus itens", com o texto de produção e "Nova etiqueta".
- **ETQ-41** Busca sem resultado: "Sem resultados" / "Nenhuma etiqueta encontrada para essa busca.".
- **ETQ-42** Evento sem itens no passo 2: "Sem itens cadastrados" / "Crie ingressos para vinculá-los aqui.".
- **ETQ-43** Carregando: três faixas pulsando.

## Depende de / afeta

- **Depende de:** catálogo do evento (Ingressos e produtos) e biblioteca de produtos da organização.
- **Afeta:** o link de compra (ETQ-50).

## Em aberto

- Etiqueta da organização mostrada no evento: produção também tira os vínculos só do evento ao desvincular? Aqui, desde 23/11/2026, sim (ETQ-51). Confirmar com Produto ("Etiquetas da organização", decisão em aberto).
- Marcar o grupo inteiro na árvore vira vínculo do grupo, que vale para ingressos criados depois; marcar ingresso por ingresso grava os lotes de agora.
- O painel continua com 682 px para um campo só no passo 1, como em produção (gêmeo de produção × guia).

- Em produção, depois de criar a etiqueta não aparece toast; aqui também não. O texto de criação "Em quais itens essa etiqueta será exibida?" e o "Pular" existem no código de produção, mas nunca aparecem: ficaram de fora.

## Fontes

- Levantamento do Backstage de produção (awa-workspace, só leitura), `pesquisas/gemeo-backstage/marketing.md`, seção 2.
