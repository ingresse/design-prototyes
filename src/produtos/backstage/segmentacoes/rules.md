# Segmentações: regras

> **Rotas:** `/backstage/publico/segmentacoes`, `/backstage/publico/segmentacoes/:id`
> **No menu:** Backstage › menu da organização › Público › Segmentações
> **Versão em uso:** única (`segmentacoes/`)
> **Revisado em:** 2026-11-22 (importantes e melhorias da critique, SEG-60 a SEG-69)

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

Gêmeo de `audience/segments` do Backstage de produção. A organização agrupa o público por idade,
lista de documentos ou documento no checkout, para limitar ingressos e benefícios a esse grupo.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Segmentações | `@/plataforma` (`Organizacao.segmentacoes`), lidas por `components/segmentacoes-da-organizacao.ts`; sem gravação, as sete PNE | sim, no banco |

## Regras

### Lista
- **SEG-01** "Público" para voltar, título "Segmentações" e "Novo segmento" (com segmentos). No hub de Público, o cartão "Segmentações" abre esta lista. _(pages/segmentacoes.tsx, publico/pages/Publico.tsx)_
- **SEG-02** ~~Colunas "Nome do segmento" (com a descrição embaixo) e "Última atualização" ("dd/mm/aaaa às hh:mm"); o menu tem "Ver" e "Excluir". Tocar na linha também abre o segmento. Lista no cartão comum (`../components/tabela.tsx`, BKS-110): abaixo de 704 px de cartão cada segmento vira um bloco com "Última atualização:" ao lado da data. Paginação do DS acima de 10 (BKS-114). Carregando: linhas pulsando (BKS-116).~~ Substituída por SEG-67.
- **SEG-03** Sem gravação, valem as sete segmentações PNE que o formulário de participação e os ingressos já usam (mesmos ids).
- **SEG-04** Vazio: "Sem segmentos nesta organização", com o texto de produção e "Novo segmento".
- **SEG-05** A lixeira confirma: "Excluir o segmento {nome}?", "Os ingressos limitados a este segmento deixam de reconhecer quem estava nele. Esta ação não pode ser desfeita.", com "Cancelar" e "Excluir segmento". Toast "Segmento excluído" / "{nome} foi excluído."; erro "Tente de novo: não foi possível excluir o segmento."

### Painel (criar e editar)
- **SEG-20** ~~"Gestão de segmento" (criar) ou "Editar segmento", com "Salvar" no rodapé, desabilitado enquanto o formulário for inválido.~~ Substituída por SEG-60 e SEG-63.
- **SEG-21** ~~"Identificação do segmento": nome obrigatório (placeholder "Dê um nome para este segmento").~~ Substituída por SEG-60.
- **SEG-22** ~~"Seleção de critérios", em sanfona: Idade, Lista manual, Planos de provedores externos e Documento exigido no checkout (com o selo "NOVO").~~ Substituída por SEG-61.
- **SEG-23** ~~Idade: "Idade inicial" e "Idade final"; o cabeçalho resume a faixa ("18 → ∞"). Inicial maior que a final mostra "A idade inicial deve ser menor ou igual à idade final" e bloqueia o salvar.~~ Substituída por SEG-61.
- **SEG-24** Lista manual: CPF ou passaporte, separados por vírgula, espaço, ponto e vírgula ou linha. CPF precisa dos dígitos verificadores certos; passaporte tem de 6 a 9 letras ou números. Os inválidos aparecem destacados com "Corrija ou apague os N documentos destacados: não são CPF nem passaporte válidos." (no singular, "o documento destacado") e impedem salvar (SEG-63). Até 1.000 por vez e 100.000 por segmento. Os novos somam à lista existente, sem repetir; ao editar, a caixa começa vazia e diz quantos já estão no segmento.
- **SEG-25** ~~"Importar lista": CSV de até 2 MB (maior: "Erro no upload"). Caixa e arquivo são exclusivos: com arquivo, a caixa trava; com texto, o botão trava. O arquivo importado aparece com a contagem e o X para remover.~~ Substituída por SEG-65 e SEG-66.
- **SEG-26** Planos de provedores externos: no protótipo nenhum provedor está conectado, e a seção diz isso.
- **SEG-27** ~~Documento exigido no checkout: "Nenhum" (padrão) ou "CIE — Carteira de Identificação Estudantil".~~ Substituída por SEG-61.
- **SEG-28** Toasts: "Segmento criado" / "{nome} foi criado."; "Segmento atualizado" / "{nome} foi atualizado."; erros começam pela ação ("Tente de novo: não foi possível criar o segmento.").

### Detalhe
- **SEG-40** "Segmentações" para voltar, o nome como título, os critérios de idade e documento no checkout como selos e "Editar segmento". _(pages/segmento.tsx)_
- **SEG-41** Busca "Buscar por documento" (ignora pontos e traço), na barra comum (BKS-111), e as colunas "Documento" (CPF com máscara, ou passaporte) e "Tipo", com "Remover documento" (SEG-68). Paginação do DS acima de 10 documentos, 10 por página de início (10, 25, 50 ou 100); buscar volta à página 1 (BKS-114). Até 21/11/2026 eram páginas de 25, com a paginação mínima, como em produção. _(pages/segmento.tsx)_
- **SEG-42** ~~"Remover membro" confirma ("Excluir documento" … "Excluir usuário"). Toast "Membro removido".~~ Substituída por SEG-68.
- **SEG-43** ~~Sem documentos: "Nenhum membro neste segmento" / "Adicione membros para começar a gerenciar este segmento", com "Editar segmento" (que nesse caso sai do cabeçalho) e sem a busca. Busca sem resultado: "Nenhum documento encontrado para essa busca." dentro do cartão, com "Limpar busca" (BKS-118); até 21/11/2026 mostrava o vazio. Id desconhecido: "Segmento não encontrado". Carregando: linhas pulsando, com o voltar já visível.~~ Substituída por SEG-69.

### Importantes e melhorias da critique (22/11/2026)
- **SEG-60** O painel abre com o título "Novo segmento" (antes "Gestão de segmento") ou "Editar segmento" com o nome do segmento abaixo. "Identificação do segmento": "Nome do segmento" obrigatório ("Ex.: Sócios ouro", dica "Dá para mudar depois."). Rodapé com "Cancelar" e "Salvar". _(components/painel-de-segmento.tsx)_
- **SEG-61** "Critérios": Idade, Lista manual, Planos de provedores externos e Documento exigido no checkout (com o selo "Novo"), um abaixo do outro e sempre abertos (antes, sanfona toda recolhida). Idade: "Idade inicial" e "Idade final" vazias ("Sem mínimo", "Sem máximo"; dica "Deixe em branco para não limitar."), com o resumo em palavras no cabeçalho do critério: "Qualquer idade", "A partir de 18 anos", "Até 60 anos" ou "De 18 a 60 anos" (antes "0 → ∞"). Inicial maior que a final: "Use uma idade inicial menor ou igual à final." Documento no checkout: botões de opção do DS "Nenhum" (padrão) e "CIE (Carteira de Identificação Estudantil)". _(components/painel-de-segmento.tsx, data/segmentacoes.ts `resumoDaIdade`)_
- **SEG-62** Fechar sem querer não perde o preenchido (UI-NAV-002): com algo mudado (nome, critérios, texto ou arquivo), clicar fora não fecha e Esc, "Cancelar" e o X perguntam "Descartar o que você preencheu?", com "Continuar editando" e "Descartar". _(components/painel-de-segmento.tsx)_
- **SEG-63** "Salvar" fica sempre habilitado (antes desabilitado sem dizer por quê): sem nome, o erro "Dê um nome ao segmento." aparece no campo e o foco vai até ele; idade invertida ou documentos inválidos/acima do limite mostram o erro no critério e não salvam. _(components/painel-de-segmento.tsx)_
- **SEG-64** O painel tem como nome o próprio título e o botão de fechar se chama "Fechar" (o painel lateral do DS fixa "Slideout menu" e "Close" em inglês; as peças dele são montadas no painel para trocar). _(components/painel-de-segmento.tsx)_
- **SEG-65** Caixa e arquivo são exclusivos (SEG-25) e o motivo do bloqueio fica escrito abaixo, não só no `title`: "Com um arquivo importado, a caixa fica bloqueada. Remova o arquivo para digitar." e "Com documentos na caixa, a importação fica bloqueada. Limpe a caixa para importar." O botão é "Importar CSV" (ícone de envio), vira "Trocar arquivo"; o arquivo aparece como "{nome}: N documentos" com o X para remover. _(components/painel-de-segmento.tsx)_
- **SEG-66** Limites, como o texto diz: na caixa, até 1.000 por vez ("Envie até 1.000 documentos por vez. Para mais, use o arquivo CSV."); por arquivo CSV, até 10.000 documentos e 2 MB; no segmento, até 100.000. Arquivo que não é CSV: "Envie um arquivo CSV (.csv)."; maior que 2 MB: "Envie um arquivo de até 2 MB."; com mais de 10.000: "Envie um arquivo com até 10.000 documentos. Este tem N." (no aviso "Não foi possível importar"). Antes o arquivo não tinha teto e o não-CSV mostrava o erro de 2 MB. _(components/painel-de-segmento.tsx, data/segmentacoes.ts `LIMITE_POR_ARQUIVO`)_
- **SEG-67** Lista: busca "Buscar segmento" (por nome) na barra comum, colunas "Nome do segmento" (com o resumo dos critérios embaixo, no lugar da descrição, que era a mesma nos sete: "Lista de documentos", "De 18 a 60 anos", "…, pede CIE no checkout"), "Documentos" (quantos) e "Última atualização" ("26 nov 2026, 13:14", PUB-109). O nome abre o segmento e cobre a linha; a lixeira "Excluir {nome}" (dica "Excluir segmento") fica no fim, no lugar do "Mais opções" sem nome com "Ver" e "Excluir". Sem resultado: "Nenhum segmento encontrado para essa busca." com "Limpar busca". Abaixo de 704 px de cartão, cada segmento vira um bloco com os rótulos. Paginação do DS acima de 10 (BKS-114); carregando, linhas pulsando (BKS-116). _(pages/segmentacoes.tsx, data/segmentacoes.ts `resumoDosCriterios`)_
- **SEG-68** Um nome para tirar um documento do segmento: "Remover documento" (dica da lixeira, com o nome "Remover {documento}"), confirmação "Remover o documento {CPF com máscara ou passaporte}?" / "Quem tem este documento deixa de ter acesso aos ingressos limitados a este segmento.", botão "Remover documento", toast "Documento removido" / "{documento} saiu do segmento." Antes eram "Remover membro", "Excluir documento", "Excluir usuário" e "Membro removido". _(pages/segmento.tsx)_
- **SEG-69** Vazios do detalhe: sem documentos, "Nenhum documento neste segmento" / "Adicione CPFs ou passaportes pela lista manual. Só quem tem o documento no segmento compra os ingressos limitados a ele.", com "Adicionar documentos" (abre o painel; "Editar segmento" sai do cabeçalho), sem a busca. Busca sem resultado: "Nenhum documento encontrado para essa busca." com "Limpar busca" (BKS-118). Id desconhecido: título "Segmento não encontrado" e o vazio "Este segmento não existe mais" / "Ele pode ter sido excluído ou o endereço está errado. Veja os segmentos da organização.", com "Ver segmentações". Carregando: linhas pulsando, com o voltar já visível. _(pages/segmento.tsx)_

### Fora daqui (desde 21/11/2026)
- **SEG-50** A aprovação do formulário de participação lista as segmentações desta tela. _(publico/components/DecisaoModal.tsx)_
- **SEG-51** Aprovar inclui o documento da pessoa (CPF ou passaporte) na segmentação escolhida, sem repetir. _(publico/pages/SolicitacoesParticipacao.tsx)_
- **SEG-52** No ingresso, "Segmentação" escolhe entre as segmentações desta tela. _(itens/pages/IngressoDetalhe.tsx)_

## Depende de / afeta

- **Afeta:** ingressos limitados a segmentações (`TipoIngresso.segmentos`) e a aprovação do formulário de participação.

## Em aberto

- O link de compra ainda não confere o documento de quem compra contra a segmentação do ingresso.
- Regras avançadas por plano (rating do sócio, antecedência, horário) dependem de provedores externos e ficaram de fora.
- Limites: produção diz "até 1 mil por vez" na caixa e "até 10 mil documentos" no arquivo; o protótipo segue o texto (SEG-66). Confirmar com produto se os dois tetos são esses.
- "PNE" × "PcD" no nome das segmentações de exemplo: decisão humana.
- O painel lateral do DS (`SlideoutMenu`) fixa "Slideout menu" e "Close" em inglês; aqui o painel monta as peças para trocar (SEG-64), mas os outros painéis do Backstage seguem com o texto em inglês. Melhor uma prop no DS.
- Diferenças propositais de produção: o título é "Segmentações" (produção mistura "Segmentações" e "Segmentos"), "Última atualização" com acento, o nome tem rótulo visível e "1 documento inválido" no singular.

## Fontes

- Levantamento do Backstage de produção (awa-workspace, só leitura), `pesquisas/gemeo-backstage/organizacao.md`, seções 3.1 a 3.4.
