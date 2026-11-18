# Categorias: regras

> **Rotas:** `/backstage/categorias`
> **No menu:** sem item de menu por enquanto; abre pela rota.
> **Versão em uso:** única (`categorias/`)
> **Revisado em:** 2026-11-18 (tags só citadas e janelas de data)

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

O que pode ser atribuído a um evento e como os eventos estão. Cada evento tem **uma categoria**, das
10 do mapa do Grupo, e **tags** em quatro grupos: gênero musical, ocasião, sazonais e comodidades
(benefícios e serviços). A categoria, quem cria escolhe; as tags saem por embedding do que a pessoa
escreve, do nome, da descrição e do banner (`eventos/rules.md` EVT-97).

A leitura do banner usa o `claude -p` logado na máquina de quem roda o `npm run dev`
(`ia-local/plugin.ts`). Na Vercel não há ponte e as tags saem sem o banner.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Categorias | `@/plataforma` (coleção `categorias`), gravadas pela seed a partir de `src/plataforma/categorias-catalogo.ts` | só pela seed |
| Tags e grupos de tag | `src/plataforma/categorias-catalogo.ts` | não |
| Vetores das tags | `src/plataforma/categorias-catalogo-vetores.json` (gerado por `ia-local/vetores-catalogo.mjs`) | não |
| Eventos | `@/plataforma` (coleção `eventos`): `evento.categoria`, `evento.tags`, `evento.categoriaTexto` | sim, ao criar o evento |
| Criações de show ou festa | `@/plataforma` (coleção `criacoes`): texto, banner lido, vetor, categoria e tags | sim, ao criar show ou festa |

## Regras

### Categorias
- **CAT-01** São 10, do mapa do Grupo, nesta ordem: Shows, Festivais, Festas e Baladas, Universitário, Futebol, Esportes, Teatro, Stand-up, Kids e Família, Feiras e Exposições. _(plataforma/categorias-catalogo.ts)_
- **CAT-02** Uma por evento. Show ou festa escolhe num dropdown entre as 8 que não são de esporte; futebol nasce em Futebol e evento esportivo em Esportes, sem campo. _(plataforma/categorias.ts, eventos/pages/CriarEvento.tsx)_
- **CAT-03** Vão para o banco pela seed (`SEED_VERSAO` 2026-11-18.1). Os ids não colidem com os da lista anterior (de 17/11), que podem ter ficado no banco; a página e o dropdown só usam os do mapa. _(plataforma/db/seed.ts, plataforma/categorias.ts `doMapa`)_
- **CAT-04** Eventos de antes do mapa (seed e criados até 17/11) não têm categoria gravada: ela sai do tipo (futebol, esportivo) ou da categoria da vitrine do novo site (eletrônica vira Festas e Baladas; sertanejo, rock e rap viram Shows; teatro vira Teatro; festival vira Festivais; stand-up vira Stand-up; esportes vira Futebol quando a vitrine diz futebol). _(plataforma/categorias.ts `categoriaDoEvento`)_

### Tags
- **CAT-10** Quatro grupos: Gênero musical (até 3 por evento), Ocasião (até 2), Sazonais (até 2) e Comodidades (até 4). "Comodidades" é o nome do grupo de benefícios e serviços. _(plataforma/categorias-catalogo.ts)_
- **CAT-11** Gênero musical só vale em Shows, Festivais, Festas e Baladas e Universitário. Clássico e Final (ocasião) só valem em Futebol e Esportes. Sem categoria escolhida ainda, a dica mostra todas; a escolha filtra. _(plataforma/categorias.ts `tagsValidas`)_
- **CAT-12** O que entra na leitura: o texto aberto (peso 0,45), a leitura do banner (0,25), o nome (0,15) e o começo da descrição (0,15). Parte vazia sai da conta. O embedding é do Hugging Face (`Xenova/paraphrase-multilingual-MiniLM-L12-v2`), no navegador; o modelo baixa na primeira leitura e fica em cache. _(plataforma/categorias.ts)_
- **CAT-13** Uma tag entra quando o que foi escrito (texto, nome, descrição ou leitura do banner) cita o nome ou um termo dela, como palavra inteira. Só no gênero musical o embedding também pode pôr uma tag sem citação: a mais parecida do grupo, com similaridade de pelo menos 0,74 e folga de 0,05 sobre a segunda. Ocasião, Sazonais e Comodidades só entram citadas, porque não se adivinham: "bloco" não é Réveillon, e Open bar só existe se alguém disse (desde 18/11/2026, pedido Victor). _(plataforma/categorias.ts `lerTags`, plataforma/categorias-catalogo.ts `soCitada`)_
- **CAT-18** Sazonais só valem com o evento (do início ao fim) dentro da janela da data: Carnaval de 06/01 a 15/03, Réveillon de 26/12 a 02/01, Festa junina de 01/06 a 31/07, Halloween de 20/10 a 05/11, Natal de 01/12 a 26/12, Páscoa de 15/03 a 30/04, Dia dos Namorados de 05/06 a 14/06, Dia das Mães de 01/05 a 15/05, Dia dos Pais de 01/08 a 15/08, Dia das Crianças de 01/10 a 15/10, Oktoberfest de 15/09 a 31/10, Férias de 15/12 a 15/02 e em julho, Verão de 21/12 a 20/03, Copa do Mundo nas datas de cada Copa (2026 e 2030). Sem data no formulário, nenhuma sazonal aparece. _(plataforma/categorias.ts `tagsValidas`, plataforma/categorias-catalogo.ts `janelas`)_
- **CAT-19** Tag tirada pelo X no campo some até a próxima busca: a busca nova devolve todas as que valem (pedido Victor, 18/11/2026). Sem busca nova, a tirada não é gravada. _(plataforma/categorias.ts `tagsValidas`)_
- **CAT-14** No limite do grupo, as citadas vêm antes e depois a nota. _(plataforma/categorias.ts `tagsValidas`)_
- **CAT-15** Techno, House e Psytrance trazem Eletrônica junto. _(plataforma/categorias-catalogo.ts `inclui`)_
- **CAT-16** O Claude só descreve o banner, em uma frase, e essa frase entra na leitura. Não escolhe tag nem categoria. Roda com o login de quem usa a máquina, sem API key, sem ferramentas e fora do repositório. _(ia-local/plugin.ts)_
- **CAT-17** Eventos de antes do mapa saem com as tags soltas da vitrine que batem exatamente com o nome ou um termo de uma tag do catálogo, filtradas pela categoria. _(plataforma/categorias.ts `tagsDoEvento`)_

### Página
- **CAT-20** Duas abas sublinhadas: "Categorias e tags" (abre nela) e "Eventos", com a quantidade de eventos. _(pages/categorias.tsx)_
- **CAT-21** Categorias e tags: um cartão por categoria, na ordem do mapa, com ícone, nome e quantidade de eventos. Clicar no cartão abre Eventos filtrado por ela. _(pages/categorias.tsx)_
- **CAT-22** Depois das categorias, um bloco por grupo de tag, com o que vale e o máximo por evento, e as tags da mais usada para a menos (a quantidade aparece quando há evento). _(pages/categorias.tsx)_
- **CAT-23** Eventos: todos os do banco, do criado mais recente para o mais antigo, com nome, local, cidade e data, o que a pessoa escreveu (quando há), a categoria com o ícone e as tags. Filtro por categoria no topo, com a contagem. _(pages/categorias.tsx)_

### Estados
- **CAT-40** Carregando o banco: esqueleto de dez cartões nas duas abas. _(pages/categorias.tsx)_
- **CAT-41** Nenhum evento: "Nenhum evento ainda", com "Criar show ou festa". Filtro sem evento: "Nenhum evento nesta categoria.". _(pages/categorias.tsx)_

## Depende de / afeta

- **Depende de:** criação de evento (`eventos/rules.md` EVT-97).
- **Afeta:** `evento.categoria` e `evento.tags` de cada evento criado.

## Em aberto

- Futebol e evento esportivo não leem tags na criação (não têm o campo aberto). Ocasião (Clássico, Final), Sazonais e Comodidades (Camarote) valeriam para eles.
- A janela de formação de 60 dias (17/11) saiu: as categorias agora são as do mapa. As criações continuam gravadas (texto, banner, vetor) para recalibrar as tags com dados reais.
- Limiar (0,74) e folga (0,05) do gênero musical foram calibrados com 32 descrições de exemplo, não com dados reais.
- As janelas das sazonais são uma primeira proposta; Carnaval e Páscoa mudam de data a cada ano e a janela fixa cobre a faixa possível.
- O X dos badges vem do componente Tag do DS com o rótulo em inglês ("Remove this tag").
- Mudou uma tag? Rodar `node --experimental-strip-types ia-local/vetores-catalogo.mjs`. Sem isso, o navegador recalcula sozinho as tags mudadas (mais lento na primeira leitura).
- Item de menu para a página.
