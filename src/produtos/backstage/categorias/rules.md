# Categorias: regras

> **Rotas:** `/backstage/categorias`
> **No menu:** sem item de menu por enquanto; abre pela rota.
> **Versão em uso:** única (`categorias/`)
> **Revisado em:** 2026-11-17

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

Lista visual das categorias de show ou festa que estão no banco. Na criação, a pessoa conta com as
próprias palavras que tipo de evento é (`eventos/rules.md` EVT-97) e a categoria sai desse texto, do
nome, da descrição e do banner. Esta página mostra o que já entrou na lista, o que ficou sem
categoria e o que do catálogo ainda não apareceu.

Iniciativa que só roda local: a leitura do banner usa o `claude -p` logado na máquina de quem roda
o `npm run dev` (`ia-local/plugin.ts`).

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Categorias da lista | `@/plataforma` (coleção `categorias`) | sim, ao criar show ou festa |
| Criações de show ou festa | `@/plataforma` (coleção `criacoes`) | sim, ao criar show ou festa |
| Catálogo de candidatas | `src/plataforma/categorias-catalogo.ts` | não |
| Vetores do catálogo | `src/plataforma/categorias-catalogo-vetores.json` (gerado por `ia-local/vetores-catalogo.mjs`) | não |

O banco começa vazio: a lista se preenche com o uso, sem dado fictício.

## Regras

### Como a categoria é escolhida
- **CAT-01** O que entra na leitura: o texto aberto (peso 0,45), a leitura do banner (0,25), o nome (0,15) e o começo da descrição (0,15). Parte vazia sai da conta. _(plataforma/categorias.ts)_
- **CAT-02** O embedding é do Hugging Face (`Xenova/paraphrase-multilingual-MiniLM-L12-v2`), rodando no navegador. O modelo baixa na primeira leitura e fica em cache. _(plataforma/categorias.ts)_
- **CAT-03** O Claude só descreve o banner, em uma frase, e essa frase entra no embedding. Não escolhe nem dá nome a categoria. Roda com o login de quem usa a máquina, sem API key (a variável `ANTHROPIC_API_KEY` é tirada do ambiente), sem ferramentas e fora do repositório. _(ia-local/plugin.ts)_
- **CAT-04** O evento é comparado com um catálogo longo de candidatas (nome e termos como as pessoas escrevem). Vence a mais parecida, se passar de 0,6 de similaridade. _(plataforma/categorias.ts, plataforma/categorias-catalogo.ts)_
- **CAT-05** Citar a candidata no texto aberto reforça: +0,15 pelo nome, +0,1 por um termo dela. _(plataforma/categorias.ts)_
- **CAT-06** Sem a ponte local (na Vercel ou com o `claude` fora do ar), a leitura segue sem o banner, sem aviso. _(plataforma/categorias.ts)_

### Formação da lista
- **CAT-10** A formação dura 60 dias, contados da primeira criação de show ou festa. _(plataforma/categorias.ts)_
- **CAT-11** Na formação, vale o catálogo inteiro: a candidata entra na lista no primeiro evento que cai nela. _(plataforma/categorias.ts)_
- **CAT-12** Depois da formação, só a lista vale: o que só caberia numa candidata fora dela fica sem categoria. _(plataforma/categorias.ts)_
- **CAT-13** Toda criação de show ou festa é gravada, com ou sem categoria, com o vetor, a similaridade e a candidata mais parecida. _(plataforma/categorias.ts)_

### Página
- **CAT-20** Subtítulo pelo momento: antes da primeira criação, explica como a lista se forma; na formação, "Em formação até <data>"; depois, "Lista formada de <data> a <data>". _(pages/categorias.tsx)_
- **CAT-21** Números do topo: categorias na lista, eventos com categoria, eventos sem categoria. _(pages/categorias.tsx)_
- **CAT-22** Na lista: um cartão por categoria, da mais usada para a menos, com nome, grupo do catálogo, quantidade de eventos, até 3 textos escritos e o último evento com a data. _(pages/categorias.tsx)_
- **CAT-23** Sem categoria: as criações que não passaram do limiar, da mais recente para a mais antiga, com o texto escrito e a candidata mais perto com o percentual. _(pages/categorias.tsx)_
- **CAT-24** Ainda não usadas: só na formação, as candidatas do catálogo que nenhum evento usou. _(pages/categorias.tsx)_

### Estados
- **CAT-40** Carregando o banco: esqueleto de três cartões. _(pages/categorias.tsx)_
- **CAT-41** Vazio (nenhuma criação): "Nenhuma categoria ainda", com "Criar show ou festa". _(pages/categorias.tsx)_

## Depende de / afeta

- **Depende de:** criação de show ou festa (`eventos/rules.md` EVT-97).
- **Afeta:** `evento.categoria` e `evento.categoriaTexto` de cada show ou festa criado.

## Em aberto

- Um evento pode caber em duas categorias ("pagode na laje com open de cerveja" ficou em Open bar, não em Pagode). Hoje só uma é escolhida. Open bar talvez seja um atributo do evento, não uma categoria.
- O que fazer ao fim da formação com as criações sem categoria: revisar o catálogo à mão ou abrir uma nova janela.
- Limiar (0,6), pesos e reforços foram calibrados num teste local com 65 descrições de exemplo (cerca de 60 acertos), não com dados reais.
- Mudou o catálogo? Rodar `node --experimental-strip-types ia-local/vetores-catalogo.mjs`. Sem isso, o navegador recalcula sozinho as candidatas mudadas (mais lento na primeira leitura).
- Item de menu para a página.
