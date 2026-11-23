# Passkey: regras

> **Rotas:** `/backstage/marketing/chave-de-acesso`, `/backstage/marketing/chave-de-acesso/vincular-itens`, `/backstage/marketing/chave-de-acesso/lista`
> **No menu:** Backstage › menu do evento › Ingressos e produtos › atalho Passkey (BKS-119; até 22/11/2026, em Divulgação)
> **Versão em uso:** única, pasta `chave-de-acesso`
> **Revisado em:** 2026-11-23

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

O produtor cria códigos que liberam itens ocultos do evento só para quem tem a chave ou chega
por um link especial. Cria as chaves (geradas ou próprias), vincula os itens que elas liberam e
gerencia a lista: status, limite de uso, vínculos e remoção.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Itens do evento (sessões, setores, ingressos, lotes, combos, produtos) | catálogo do evento em contexto (`../itens/data/catalogo.ts`), na árvore comum (`../components/arvore-de-vinculos.tsx`) | não |
| Passkeys do evento (código, ativa, limite, usos) | `Evento.passkeys`, por `../components/passkeys-do-evento.ts` | sim, no evento |
| O que cada Passkey libera | `chaves` do ingresso, do lote, do combo e do produto no catálogo do evento | sim, no evento |
| Chaves digitadas ou importadas na criação | rascunho na sessão do navegador (`data/rascunho.ts`), levado ao vínculo | na sessão até salvar o vínculo (CHA-22, CHA-40) |

## Regras

### Entrada
- ~~**CHA-01** Sem chave: "Crie Passkeys para liberar ingressos ocultos" com "Criar Passkey". _(pages/ChaveDeAcesso.tsx)_~~ substituída por CHA-48.
- **CHA-02** Evento com Passkey entra pela lista; sem nenhuma, pelo vazio (CHA-01). "Nova Passkey", na lista, abre direto a criação, e o voltar da criação leva de volta à lista. _(pages/ListaChaves.tsx, pages/ChaveDeAcesso.tsx)_

### Criação
- **CHA-40** A criação tem endereço: `/backstage/marketing/chave-de-acesso?criar=1` (desde 23/11/2026; antes era estado da tela). O que foi preenchido fica na sessão do navegador, por evento: recarregar, o Voltar do navegador e o voltar "Passkey" de Vincular itens devolvem as chaves. O voltar e o "Cancelar" com algo preenchido perguntam "Descartar as Passkeys?" ("Continuar editando" ou "Descartar", que apaga o rascunho). Salvar os vínculos apaga o rascunho. _(pages/ChaveDeAcesso.tsx, data/rascunho.ts)_
- **CHA-49** "Como criar" é o mesmo componente dos Cupons (`../components/como-criar-codigos.tsx`, UI-DS-003): dois cartões, o rádio só no cabeçalho (com o título e a dica) e os campos como irmãos, fora do rótulo, então o clique no campo foca o campo; o escolhido abre os campos deslizando (com movimento reduzido, só um fade). Sem ícone PNG, alerta PNG nem spinner próprio. _(pages/ChaveDeAcesso.tsx)_
- **CHA-10** Duas formas, uma por vez: "Criar automaticamente" ou "Criar manualmente". _(pages/ChaveDeAcesso.tsx)_
- **CHA-11** As chaves usam só letras e números, sem símbolos ou emojis, e não distinguem maiúsculas de minúsculas. _(pages/ChaveDeAcesso.tsx)_
- **CHA-50** Automática: Limite de uso (opcional, só números, vazio = ilimitado), Quantidade (só números; diz "N Passkeys serão criadas.") e Prefixo (opcional, até 20). Os exemplos saem do mesmo jeito que o gerador: prefixo em maiúsculas e o resto com letras e números sem I, O, 0 e 1, até 8 caracteres. _(pages/ChaveDeAcesso.tsx)_
- ~~**CHA-12** Automática: Limite de uso (opcional, vazio = ilimitado), Quantidade e Prefixo (opcional). Mostra exemplos dos códigos com o prefixo em maiúsculas. _(pages/ChaveDeAcesso.tsx)_~~ substituída por CHA-50.
- **CHA-54** Automática: quantidade que, somada às Passkeys do evento, passa de 5.000 mostra no campo "Use até N: o evento pode ter no máximo 5 mil Passkeys." e bloqueia o avanço. _(pages/ChaveDeAcesso.tsx)_
- ~~**CHA-13** Automática: quantidade que, somada às Passkeys que o evento já tem, passa de 5.000 mostra "O seu total de Passkeys no evento não pode ser maior que 5 mil." e bloqueia o avanço. _(pages/ChaveDeAcesso.tsx)_~~ substituída por CHA-54.
- **CHA-51** Manual (desde 23/11/2026): Limite de uso (opcional) e a caixa "Passkeys", separadas por vírgula ou linha, com contador "N / 1.000". A lista inteira é validada (UI-EST-008): inválidas (símbolo, espaço, acento) e repetidas (na lista ou com as do evento, sem diferenciar maiúsculas) aparecem destacadas embaixo da caixa, em vermelho e em amarelo ("repetido"), cada uma com o X para tirar. Inválida bloqueia ("N códigos inválidos: use só letras e números… Ajuste ou tire os destacados para continuar."); repetida não é criada ("N repetidos não serão criados."); a linha de status diz "N Passkeys serão criadas.". Antes, o texto digitado não era validado e o inválido sumia em silêncio ao criar. _(../components/como-criar-codigos.tsx)_
- ~~**CHA-14** Manual: Limite de uso (opcional) e até 1.000 chaves separadas por vírgula, com contador "N / 1.000". _(pages/ChaveDeAcesso.tsx)_~~ substituída por CHA-51.
- **CHA-52** "Importar de planilha" (.csv, .xlsx, .xls; até 1.000 por importação) soma as chaves ao que já foi digitado (antes, substituía), tirando o título "Passkeys". "Baixar modelo de importação" baixa "Modelo de importação de Passkeys.csv" (o título "Passkeys" na primeira linha), como em Cupons. _(pages/ChaveDeAcesso.tsx, components/ImportarPlanilhaModal.tsx, data/rascunho.ts)_
- ~~**CHA-15** Importar planilha (.csv, .xlsx, .xls; até 1.000 chaves). Acima disso: "A planilha ultrapassa o limite de 1.000 chaves por importação." _(components/ImportarPlanilhaModal.tsx)_~~ substituída por CHA-52.
- ~~**CHA-16** Depois de importar, as chaves viram chips editáveis (clique edita, vazio remove, Enter ou vírgula adiciona, Backspace apaga a última), com carregamento de 1,8 s. _(pages/ChaveDeAcesso.tsx)_~~ substituída por CHA-51.
- ~~**CHA-17** Chip com símbolo é inválido e bloqueia o avanço: "Passkey inválida encontrada. Ajuste o formato dos destacados para continuar." _(pages/ChaveDeAcesso.tsx)_~~ substituída por CHA-51.
- ~~**CHA-18** Chip repetido (sem diferenciar maiúsculas), inclusive com uma Passkey que o evento já tem, é marcado e não bloqueia: "N chaves estão duplicadas e não serão consideradas ao continuar." Chips com problema vão para o início. _(pages/ChaveDeAcesso.tsx)_~~ substituída por CHA-51.
- **CHA-53** "Criar e vincular itens" exige: automática com quantidade entre 1 e o que cabe no evento; manual com ao menos uma chave válida e nova, sem inválida e até 1.000. _(pages/ChaveDeAcesso.tsx)_
- ~~**CHA-19** "Criar e vincular itens" exige: automática com quantidade entre 1 e 5.000; manual com ao menos uma chave, sem carregamento e sem chip inválido. _(pages/ChaveDeAcesso.tsx)_~~ substituída por CHA-53.

### Vincular itens
- **CHA-41** Vincular itens (desde 23/11/2026): abas Ingressos, Combos e Produtos (as que o evento tiver, com a contagem do escolhido). Ingressos na árvore comum com escala (`ArvoreDeIngressos`, UI-LST-005): sessão › grupo › ingresso, grupos recolhidos, marcar sessão ou grupo inteiro, busca, "Selecionados" e "Mostrar mais". Marcar um ingresso marca todos os lotes; "Escolher lotes" (na conferência) deixa só alguns. Combos e produtos com caixa de nome acessível, busca a partir de 8 e "Mostrar mais". Vindo da lista ("Adicionar vínculos"), o título é "Adicionar vínculos" com "Esta ação só adiciona vínculos. Itens já vinculados continuam como estão.". Evento sem itens: "Este evento ainda não tem ingressos, combos nem produtos para vincular.". Com `?escala=5000`: 30 caixas, cerca de 1.100 nós e 8 ms por clique (antes, 16.478 caixas, 209 mil nós e 1,8 s a 4,7 s). _(pages/VincularItens.tsx, ../components/arvore-de-vinculos.tsx)_
- **CHA-42** Conferência do escolhido: no desktop, à direita ("Itens escolhidos"); abaixo de 1024 px, uma barra presa embaixo com o resumo ("40 ingressos em 5 grupos") e "Ver selecionados", que abre o painel. Cada ingresso com o grupo (e a data, "2 out 2026, 23:00", com várias sessões), os lotes ("Todos os lotes" ou quais, em destaque), "Escolher lotes" e "Remover"; fica ao menos um lote. 20 por vez com "Mostrar mais". Voltar e "Cancelar" com algo marcado perguntam "Descartar a seleção?". Navega sem atraso (antes, 260 ms de animação de saída). _(pages/VincularItens.tsx, ../components/arvore-de-vinculos.tsx)_
- ~~**CHA-20** Os itens são os do catálogo do evento em contexto. Filtro Todos, Ingressos, Combos, Produtos. Ingressos por sessão › setor › ingresso › lote, com "Selecionar todos" por sessão e marcação parcial nos níveis acima; combos e produtos se marcam inteiros. A busca filtra por nome de setor, ingresso ou lote, e combos e produtos pelo nome. Evento sem itens diz "Este evento ainda não tem ingressos, combos nem produtos para vincular." _(pages/VincularItens.tsx, data/itens-evento.ts)_~~ substituída por CHA-41.
- ~~**CHA-21** Painel à direita lista o que foi vinculado, com "remover todos" para ingressos e combos e limpar para produtos. _(pages/VincularItens.tsx)_~~ substituída por CHA-42.
- **CHA-22** "Salvar" exige ao menos um item, grava as Passkeys novas no evento (ativas, com o limite escolhido, 0 usos) e o código em `chaves` de cada item marcado, mostra o toast ("N Passkeys criadas." ou "Vínculos adicionados.") e leva para a lista. Cancelar não grava nada. Abrir a tela sem Passkey para vincular leva para o começo. _(pages/VincularItens.tsx, ../components/passkeys-do-evento.ts)_
- ~~**CHA-23** Vindo da lista ("Adicionar vínculos"), o título é "Adicionar vínculos" com "Esta ação apenas adiciona novos vínculos. Itens já vinculados não serão alterados." e voltar leva para a lista. _(pages/VincularItens.tsx)_~~ substituída por CHA-41.

### Lista de chaves
- **CHA-30** Busca por código à esquerda e filtro Todas, Ativas, Inativas à direita, acima do cartão (BKS-111); paginação do DS (BKS-114). Sem resultado: o que não achou e "Limpar busca", dentro do cartão. _(pages/ListaChaves.tsx)_
- **CHA-46** Cada linha (desde 23/11/2026): colunas "Passkey" (código e "N itens vinculados" ou "Nenhum item vinculado"), "Ativa" (o toggle, "Passkey X ativa"), "Uso" ("X de Y", ∞ quando ilimitado) e "Ações": Copiar link (o link de compra do evento com `?passkey=`), Editar vínculo, Desvincular tudo (tira o código de todos os itens), Remover (tira do evento e dos itens). No bloco estreito, "Ativa:" ao lado do toggle. _(pages/ListaChaves.tsx)_
- **CHA-44** O toggle grava na hora, com aviso ("Passkey X ativada." / "desativada.") e "Desfazer" no aviso, como os Cupons (CUP-61). _(pages/ListaChaves.tsx)_
- ~~**CHA-31** Cada linha: status (toggle, grava), código, "N itens vinculados" (ingressos inteiros, lotes, combos e produtos; "Nenhum item vinculado"), uso "X de Y" (∞ quando ilimitado) e ações: Copiar link (o link de compra do evento com `?passkey=`), Editar vínculo (Vincular itens só daquela Passkey), Desvincular tudo (tira o código de todos os itens), Remover (tira do evento e dos itens). _(pages/ListaChaves.tsx, ../components/passkeys-do-evento.ts)_~~ substituída por CHA-46.
- **CHA-32** Logo depois de criadas, as Passkeys novas (até 12) aparecem "Preparando Passkey..." e ficam prontas uma a uma, em até 6 s. Em preparo não podem ser selecionadas nem alternadas. _(pages/ListaChaves.tsx)_
- **CHA-33** Editar limite na linha: o novo limite não pode ser menor que o uso: "Limite não alterado. O novo limite não pode ser menor que a quantidade de vezes que o código já foi usado." O aviso some em 15 s. Vazio cancela. _(pages/ListaChaves.tsx)_
- **CHA-45** Ações em lote aparecem com 1 ou mais selecionadas (antes, 2), numa barra dentro do cartão, no topo, com fundo secundário (a mesma de Cupons, CUP-65): "N Passkeys selecionadas", Ativar (se houver inativa), Desativar (se houver ativa), Editar limite, Adicionar vínculos, Desvincular, Remover. _(pages/ListaChaves.tsx)_
- **CHA-47** As confirmações usam o modal comum do Backstage (`ModalDeConfirmacao`, com nome acessível): Desvincular e Remover em vermelho; textos curtos ("Desvincular as Passkeys selecionadas?", "Os itens ficam visíveis para o público se não tiverem outra Passkey."). Cada ação mostra "N Passkeys …s com sucesso.". O `ConfirmModal` próprio saiu. _(pages/ListaChaves.tsx)_
- ~~**CHA-34** Ações em massa aparecem com 2 ou mais selecionadas: Ativar (se houver inativa), Desativar (se houver ativa), Editar limite, Adicionar vínculos, Desvincular, Remover. Cada uma confirma em modal e mostra "N Passkeys …s com sucesso." _(pages/ListaChaves.tsx, components/ConfirmModal.tsx)_~~ substituída por CHA-45 e CHA-47.
- **CHA-43** Editar limite em massa: campo só de números, vazio = ilimitado; o novo limite não pode ficar abaixo do maior uso entre as selecionadas ("Use N ou mais: uma das Passkeys já foi usada N vezes."), como na linha (CHA-33). O modal tem nome ("Editar limite de uso"). _(components/EditarLimiteModal.tsx)_
- ~~**CHA-35** Editar limite em massa: vazio = ilimitado. _(components/EditarLimiteModal.tsx)_~~ substituída por CHA-43.
- **CHA-37** Tudo o que a lista muda (status, limite, vínculos, remoção) grava no evento; recarregar mantém. "Exportar" baixa um CSV com Passkey, status, itens vinculados, uso e limite. _(pages/ListaChaves.tsx, ../components/passkeys-do-evento.ts)_
- **CHA-39** A lista usa as peças comuns do Backstage (BKS-110): `BarraDaLista`, cartão, cabeçalho de colunas e linhas de `components/tabela.tsx`. Com o cartão abaixo de 44rem, cada Passkey vira um bloco: status e código, "Uso: X de Y" e as ações embaixo, e "Selecionar todas" ganha linha própria acima das Passkeys (o cabeçalho das colunas some, BKS-115). O aviso de limite não alterado (CHA-33) é o balão do tooltip do DS, com as cores dele nos dois modos. Até 21/11/2026 a lista tinha grade, barra e cabeçalho próprios, e o campo do limite e o lápis ficavam brancos no modo escuro. _(pages/ListaChaves.tsx)_
- **CHA-48** Sem Passkey: o vazio comum das listas (`VazioDaTabela`, BKS-117) com "Crie Passkeys para liberar ingressos ocultos", "Com a Passkey, só quem tem o código ou chega por um link especial vê os itens ocultos." e "Criar Passkey"; "Ingressos e produtos" para voltar. Antes, título partido em itálico, cartões decorativos e uma `<main>` própria. _(pages/ChaveDeAcesso.tsx)_
- **CHA-38** Ingressos e produtos oferece, no seletor de Passkeys do ingresso e do lote, as Passkeys do evento (e as que já estão em algum item). _(../itens/pages/Ingressos.tsx, ../itens/pages/IngressoDetalhe.tsx, ../components/passkeys-do-evento.ts `codigosDoEvento`)_
- **CHA-36** Textos de efeito: desativar mantém os itens ocultos e para a liberação; desvincular ou remover deixa os itens visíveis se não tiverem outra chave; atingir o limite mantém os itens ocultos. _(pages/ListaChaves.tsx, components/EditarLimiteModal.tsx)_

## Depende de / afeta

- **Depende de:** catálogo do evento (ingressos, lotes, produtos, combos) e itens marcados como ocultos.
- **Afeta:** fluxo de compra (site e link do evento): itens ocultos aparecem para quem informa a chave ou chega pelo link.

## Em aberto

- O link de compra do marketplace já respeita `chaves` e `?passkey=` e conta o uso no pagamento (SEL-07, SEL-08). O uso conta só no pagamento, então duas compras abertas ao mesmo tempo podem passar do limite.
- Marcar um grupo inteiro em Vincular itens grava os lotes que ele tem agora; ingresso ou lote criado depois não recebe a Passkey sozinho.
- A página do vazio ainda tem duas `<main>`: a segunda vem do `EmptyState` do DS (`VazioDaTabela`), igual nas outras listas; não é da Passkey.
- No celular, a barra presa de Vincular itens fica por cima da barra do Guia de configuração (frente Shell decide se o Guia some nessa tela, como na gaveta, GDC-71).
- "Editar vínculo" de uma Passkey abre vazio e só adiciona (como "Adicionar vínculos"); não mostra os vínculos que ela já tem.

## Fontes

Nenhum link de Figma, Confluence ou Jira no código desta pasta.
