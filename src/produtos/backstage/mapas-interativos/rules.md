# Mapas interativos: regras

> **Rotas:** `/backstage/ajustes/mapas`, `/backstage/ajustes/mapas/:id`
> **No menu:** Backstage › menu da organização › Ajustes › Mapas interativos
> **Versão em uso:** única (`mapas-interativos/`)
> **Revisado em:** 2026-11-22 (cartão clicável, assentos no celular, data, mapa inexistente, proteção do modal)

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

Gêmeo de `settings/seat-maps` do Backstage de produção. A organização cria os mapas de assentos
(setores, mesas, cadeiras) que os eventos usam para o comprador escolher onde sentar.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Mapas | `@/plataforma` (`Organizacao.mapas`); sem gravação, os três de exemplo (`data/mapas.ts`) | sim, no banco |

## Regras

### Lista
- **MAP-01** "Ajustes" para voltar, título "Mapas interativos" e "Novo mapa" à direita (só com mapas). Em Ajustes, a linha "Mapas interativos" tem "Gerenciar". _(pages/mapas-interativos.tsx, organizacoes/pages/ajustes.tsx)_
- ~~**MAP-02** Um cartão por mapa não arquivado: miniatura (ícone de mapa, sem desenho no protótipo), "Atualizado em dd/mm/aaaa às hh:mm", nome, o selo "Rascunho" quando nunca foi publicado, "Assentos cadastrados" e o menu ("Mais ações do mapa X"): "Editar" e "Arquivar".~~ Substituída por MAP-31.
- **MAP-03** Sem mapas gravados, valem os três de exemplo, os mesmos que a criação de evento oferece: Arena Exemplo, Teatro Exemplo e Estádio Exemplo.
- **MAP-04** Vazio: "Crie o seu primeiro mapa interativo", com o texto de produção e "Novo mapa".
- **MAP-31** Um cartão por mapa não arquivado: miniatura (ícone de mapa, sem desenho no protótipo), "Atualizado em …" (MAP-33), nome, o selo "Rascunho" quando nunca foi publicado, os assentos e o menu ("Mais ações do mapa X"): "Editar" e "Arquivar". O cartão inteiro abre o editor (o nome é o link e reage ao mouse); o menu fica por cima. No desktop, "Assentos cadastrados" e o número à direita; abaixo de 640 px, "N assentos" logo abaixo do nome. Até 22/11/2026 o editor só abria pelo ⋮ e os assentos sumiam no celular. _(pages/mapas-interativos.tsx)_
- **MAP-33** Data de atualização no formato do Backstage: "Atualizado em 14 out 2026, 16:20". Até 22/11/2026 era "14/10/2026 às 16:20". _(data/mapas.ts)_

### Criar e arquivar
- **MAP-10** "Novo mapa": "Dê um nome ao mapa. Em seguida, você o desenha no editor.", "Nome do mapa" (placeholder "Ex.: Arena padrão", até 120 caracteres), "Voltar" e "Criar mapa" (desabilitado sem nome). Cria o mapa em rascunho, com 0 assentos, e abre o editor. Erro: "Não foi possível criar o mapa. Tente novamente.".
- **MAP-11** "Arquivar" confirma ("Arquivar mapa?" e o texto de produção) e tira o mapa da lista. Toast "Mapa arquivado.". Eventos que já usam o mapa continuam vendendo.
- **MAP-32** "Novo mapa" com nome digitado: clicar fora não fecha; Esc, X e "Voltar" perguntam "Descartar o novo mapa?" ("O nome que você digitou não fica salvo.", "Continuar editando" / "Descartar"). Sem nome, fecha direto. _(pages/mapas-interativos.tsx)_

### Editor
- **MAP-20** "Mapas interativos" para voltar, título "Criação de mapa" (rascunho) ou "Edição de mapa" (publicado), o nome como subtítulo e "Como funciona?". _(pages/editor-de-mapa.tsx)_
- **MAP-21** No lugar do editor, um aviso de que ele roda fora do Backstage: em produção é o editor do PickSeats, embutido na página.
- **MAP-22** "Como funciona?" abre o painel "Como criar um mapa" com "Visão geral" e os "Conceitos rápidos" (Imagem de referência, Espaços de venda de ingressos, Categorias), com os textos de produção.
- **MAP-23** Ferramenta de protótipo: "Simular publicação" marca o mapa como publicado e dá a ele assentos.
- **MAP-34** Endereço de um mapa que não existe: título "Mapa não encontrado", sem "Como funciona?", e o estado vazio do DS "Nenhum mapa neste endereço" / "Confira o endereço ou volte para a lista e escolha um mapa desta organização." com "Ver mapas interativos". Até 22/11/2026 o título era "Criação de mapa" e só aparecia "Mapa não encontrado." solto, sem saída além da seta. _(pages/editor-de-mapa.tsx)_

### Fora daqui
- **MAP-30** Na criação de evento, "Mapa de assentos" lista os mapas desta tela que não estão arquivados nem em rascunho, com a quantidade de assentos. _(components/mapas-da-organizacao.ts, eventos/pages/CriarEvento.tsx)_

## Depende de / afeta

- **Afeta:** a criação de evento (mapa de assentos) e o editor de assentos disponíveis.

## Em aberto

- O desenho do mapa (PickSeats) não existe no protótipo.
- O código do editor citava "MAP-24", que não existe neste arquivo; o comentário passou a citar MAP-20 a MAP-23 e MAP-34.
- Arquivar não tem desarquivar nem Desfazer; a regra de arquivar não tem fonte de produção conferida.

## Fontes

- Levantamento do Backstage de produção (awa-workspace, só leitura), `pesquisas/gemeo-backstage/organizacao.md`, seções 2.3 e 2.4.
