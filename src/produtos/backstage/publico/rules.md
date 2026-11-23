# Público: regras

> **Rotas:** `/backstage/publico`, `/backstage/publico/formularios`, `/backstage/publico/solicitacoes`
> **No menu:** Backstage › rail da organização › Público (`ProducerRailItem` com `href`). Na barra superior da organização (`ORG_NAV`) o item Público existe, mas sem `href`.
> **Versão em uso:** versão única (`pages/Publico.tsx`, `pages/FormulariosParticipacao.tsx`, `pages/SolicitacoesParticipacao.tsx`)
> **Revisado em:** 2026-11-22 (acessibilidade, celular e carregamento dos pedidos, PUB-100 a PUB-103; importantes e melhorias da critique, PUB-104 a PUB-113)

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

Área da organização para gerir o público. Tem as Segmentações (segmentacoes/rules.md, desde 21/11/2026) e o formulário de participação: o produtor cria
um formulário por evento, controla o recebimento e o limite de pedidos, e analisa cada pedido
(dados pessoais, documento e laudo) para aprovar numa segmentação PNE ou reprovar com justificativa.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Formulários de participação | `@/plataforma` (`Evento.formularioDeParticipacao`), um por evento da organização (`data/formularios.ts`) | sim, no banco |
| Pedidos de participação | `@/plataforma` (`Evento.solicitacoesDeParticipacao`), os do formulário daquele evento (`data/solicitacoes.ts`). Formulário que existia antes desta gravação ganha pedidos de exemplo fictícios na primeira abertura (PUB-97) | sim, no banco: aprovar e reprovar gravam no evento |
| Eventos para novo formulário | os eventos da organização em contexto que ainda não têm formulário e não estão encerrados | não |
| Segmentações (7 PNE) e justificativas (5) | `SEGMENTACOES` e `JUSTIFICATIVAS` em `components/DecisaoModal.tsx` | não |
| Anexos | imagem fixa `components/assets/documento-identificacao.png` e laudo em branco `components/LaudoView.tsx` | não |

Formulários, pedidos e eventos vêm de `@/plataforma`. Nenhum formulário público grava pedidos ainda: os pedidos que existem são os de exemplo (PUB-97).

## Regras

### Público (landing)
- **PUB-01** Mostra as duas funcionalidades, "Segmentações" e "Formulário de participação", numa lista no cartão comum (PUB-104). _(pages/Publico.tsx)_
- **PUB-02** "Formulário de participação" leva a `/backstage/publico/formularios`. _(pages/Publico.tsx)_
- **PUB-03** ~~"Segmentações" não tem destino: o clique não faz nada.~~ Desde 21/11/2026 abre `/backstage/publico/segmentacoes` (segmentacoes/rules.md). _(pages/Publico.tsx)_

### Lista de formulários
- **PUB-10** ~~Cada formulário mostra imagem, título, data, status e contagem de solicitações.~~ Substituída por PUB-104.
- **PUB-11** Status "Inativo" quando o recebimento está desligado. _(pages/FormulariosParticipacao.tsx)_
- **PUB-12** Status "Pausado" quando o limite é "Limitado" e recebidas ≥ limite. _(pages/FormulariosParticipacao.tsx)_
- **PUB-13** Nos demais casos, status "Disponível". _(pages/FormulariosParticipacao.tsx)_
- **PUB-14** ~~Com limite: "X de Y solicitações recebidas". Sem limite: "X solicitação(ões) recebida(s)", com singular para 1.~~ Substituída por PUB-104.
- **PUB-15** Clicar num formulário abre `/backstage/publico/solicitacoes` com o id do formulário no estado da navegação. _(pages/FormulariosParticipacao.tsx)_
- **PUB-16** "Voltar" leva a `/backstage/publico`. _(pages/FormulariosParticipacao.tsx)_

### Novo formulário
- **PUB-20** "Novo formulário" abre "Escolha o evento do formulário", com busca por nome ou data (sem diferenciar maiúsculas). Cada opção mostra o nome e a data do evento; o texto diz que aparecem os eventos sem formulário que não terminaram. Sem nenhum evento disponível: "Todos os eventos em andamento já têm formulário." _(components/SelecionarEventoModal.tsx)_
- **PUB-21** Busca sem resultado mostra "Nenhum evento encontrado.". _(components/SelecionarEventoModal.tsx)_
- **PUB-22** "Continuar" fica desabilitado até escolher um evento. _(components/SelecionarEventoModal.tsx)_
- **PUB-23** Busca e seleção zeram a cada abertura do modal, menos ao voltar da configuração (PUB-106). _(components/SelecionarEventoModal.tsx)_
- **PUB-24** Depois do evento, abre o modal de configuração com recebimento ativo e limite "Ilimitado". _(pages/FormulariosParticipacao.tsx)_
- **PUB-25** Ao salvar, o formulário entra no fim da lista com título do evento, data futura aleatória (30 a 365 dias), imagem padrão e marcado como rascunho. _(pages/FormulariosParticipacao.tsx)_
- **PUB-26** ~~O novo formulário já nasce com 12 solicitações recebidas (total do mock).~~ Desde 21/11/2026 o novo formulário nasce sem pedidos (0 solicitações recebidas; o limite aceita qualquer quantidade). _(data/formularios.ts, pages/FormulariosParticipacao.tsx)_
- **PUB-27** ~~Toast de sucesso: "Formulário criado!" / "O novo formulário já está disponível para o público.".~~ Substituída por PUB-105.

### Configuração do formulário (recebimento e limite)
- **PUB-30** ~~Toggle liga e desliga o recebimento; o texto muda entre "Recebimento ativo" e "Recebimento inativo".~~ Substituída por PUB-107.
- **PUB-31** ~~Limite é "Ilimitado" ou "Limitado"; o campo de quantidade só aparece em "Limitado".~~ Substituída por PUB-107.
- **PUB-32** A quantidade aceita só dígitos e recebe máscara de milhar pt-BR. _(components/FormularioParticipacaoModal.tsx)_
- **PUB-33** ~~"Limitado" sem quantidade: erro "Campo obrigatório" e não salva.~~ Substituída por PUB-107.
- **PUB-34** ~~Quantidade menor que as solicitações já recebidas: erro "O limite deve ser maior ou igual a N, que é o total de solicitações já recebidas." e não salva.~~ Substituída por PUB-107.
- **PUB-35** Trocar a opção de limite ou digitar limpa o erro. _(components/FormularioParticipacaoModal.tsx)_
- **PUB-36** O modal reabre sempre com os valores salvos do formulário. _(components/FormularioParticipacaoModal.tsx)_
- **PUB-37** "Configurar formulário" na tela de pedidos abre o mesmo modal, com o título "Configurar formulário" e o evento abaixo; salvar atualiza o formulário e mostra o toast "Configuração salva", com "O formulário aceita pedidos." ou "O recebimento está desligado: o formulário não aceita pedidos." (antes "Tudo certo!" / "…já estão disponíveis para o público", mesmo desligado). _(pages/SolicitacoesParticipacao.tsx)_

### Pedidos de participação: lista
- **PUB-40** Cabeçalho mostra "Formulário de participação" e o título do formulário aberto. _(pages/SolicitacoesParticipacao.tsx)_
- **PUB-41** Abas "Pendente", "Aprovado" e "Reprovado" (abas do DS, PUB-103); cada uma lista só os pedidos daquele status. _(pages/SolicitacoesParticipacao.tsx)_
- **PUB-42** Cada aba mostra contador quando há pedidos; acima de 999 mostra "999+". Só a aba Pendente usa cor de aviso. _(pages/SolicitacoesParticipacao.tsx)_
- **PUB-43** Busca por nome ou e-mail, sem diferenciar maiúsculas, dentro da aba atual. _(pages/SolicitacoesParticipacao.tsx)_
- **PUB-44** ~~Cada linha mostra nome, e-mail e data da solicitação (DD/MM/AAAA).~~ Substituída por PUB-109.
- **PUB-45** Ao entrar, o primeiro pedido da aba Pendente já vem selecionado (antes: o primeiro do mock, de qualquer status). _(pages/SolicitacoesParticipacao.tsx)_
- **PUB-46** "Voltar" leva a `/backstage/publico/formularios`. _(pages/SolicitacoesParticipacao.tsx)_

### Pedidos de participação: detalhe e dados pessoais
- **PUB-50** O detalhe mostra nome, status, e-mail e "Pedido em / Aprovado em / Reprovado em" + data (e hora, para decididos; PUB-98, PUB-109). Até 22/11/2026 o pendente dizia "Solicitado em". _(pages/SolicitacoesParticipacao.tsx)_
- **PUB-51** "Informações do participante" mostra sem máscara: Nome, CPF ou passaporte, E-mail, Data de nascimento, Telefone e Data do laudo. _(pages/SolicitacoesParticipacao.tsx)_
- **PUB-52** O CID existe no dado do pedido, mas não aparece na tela. _(data/solicitacoes.ts, pages/SolicitacoesParticipacao.tsx)_
- **PUB-53** "Anexos (2)": "Documento de identificação" (imagem) e "Laudo ou documento comprobatório" (laudo em branco). _(data/solicitacoes.ts, pages/SolicitacoesParticipacao.tsx)_
- **PUB-54** ~~O cabeçalho dos anexos mostra "Os anexos serão excluídos 15 dias após a validação.".~~ Removida em 22/11/2026: não há exclusão nem contagem de prazo; o texto prometia o que não existe (ver Em aberto).
- **PUB-55** Clicar no anexo ou em "Expandir" ("Expandir {nome do anexo}" para leitor de tela, PUB-103) abre o visualizador em tela cheia com nome, arquivo e tamanho. _(components/AnexoViewerModal.tsx)_
- **PUB-56** Zoom do visualizador vai de 50% a 200%, em passos de 25%, e volta a 100% a cada anexo aberto. _(components/AnexoViewerModal.tsx)_
- **PUB-57** Não há download nem impressão de anexo. _(components/AnexoViewerModal.tsx)_
- **PUB-58** Aprovado mostra "Adicionado em: {segmentação}"; reprovado mostra "Justificativa: {motivo}". _(pages/SolicitacoesParticipacao.tsx)_
- **PUB-59** Pedido decidido mostra no rodapé "Aprovado por" ou "Reprovado por" + e-mail fixo `thais.silva@vegasports.com.br` + data e hora da decisão (PUB-98). _(pages/SolicitacoesParticipacao.tsx)_

### Decisão (aprovar ou reprovar)
- **PUB-60** "Reprovar" e "Aprovar" só aparecem para pedido pendente. Decidido não volta a pendente (os modais avisam, PUB-110). Até 22/11/2026 o botão era "Rejeitar" (PUB-113). _(pages/SolicitacoesParticipacao.tsx)_
- **PUB-61** Aprovar abre "Aprovar pedido" (PUB-110; antes "Selecione a segmentação em que a pessoa será incluída"), com busca e as segmentações da organização (SEG-50; sem gravação, as 7 PNE). Aprovar inclui o documento da pessoa na segmentação (SEG-51). _(components/DecisaoModal.tsx, pages/SolicitacoesParticipacao.tsx)_
- **PUB-62** Busca de segmentação sem resultado mostra "Nenhuma segmentação encontrada.". _(components/DecisaoModal.tsx)_
- **PUB-63** "Aprovar pedido" (antes "Aprovar solicitação") fica desabilitado até escolher uma segmentação. _(components/DecisaoModal.tsx)_
- **PUB-64** Reprovar abre "Reprovar pedido" (antes "Rejeitar solicitação"; PUB-110) com 5 motivos: Documentação ilegível, Documento inválido, Dados inconsistentes, Laudo insuficiente, Outro motivo. _(components/DecisaoModal.tsx)_
- **PUB-65** "Outro motivo" abre o campo "Descreva o motivo" (obrigatório), com no máximo 60 caracteres (PUB-111). _(components/DecisaoModal.tsx)_
- **PUB-66** ~~Ao bater 60 caracteres, o campo fica inválido e mostra por 2 s o tooltip "Você não pode inserir mais que 60 caracteres.".~~ Substituída por PUB-111.
- **PUB-67** "Reprovar pedido" fica desabilitado sem motivo, ou com "Outro motivo" e texto vazio. _(components/DecisaoModal.tsx)_
- **PUB-68** Os modais de decisão zeram seleção, busca e texto a cada abertura. _(components/DecisaoModal.tsx)_
- **PUB-69** Aprovar muda o status, grava a segmentação, troca para a aba Aprovado e mostra o toast "Pedido aprovado" / "{nome} entrou na segmentação {segmentação}." (antes "foi adicionado(a) ao segmento"). _(pages/SolicitacoesParticipacao.tsx)_
- **PUB-70** Reprovar muda o status, grava o motivo, troca para a aba Reprovado e mostra o toast "Pedido reprovado" / "Pedido de {nome} reprovado. Motivo: {motivo}." (antes "{nome} foi reprovado com o motivo: …", com gênero fixo). _(pages/SolicitacoesParticipacao.tsx)_
- **PUB-71** Com "Outro motivo", o motivo gravado é o texto digitado (sem espaços nas pontas). _(components/DecisaoModal.tsx, pages/SolicitacoesParticipacao.tsx)_

### Revisão visual (21/11/2026)
- **PUB-90** Pedidos de participação abre com o cabeçalho padrão (BKS-100): "Formulário de participação" para voltar, o evento do formulário como título e "Configurar formulário" nas ações. Entrando sem formulário escolhido, abre o primeiro; sem nenhum formulário, volta para a lista (PUB-100). _(pages/SolicitacoesParticipacao.tsx)_
- **PUB-91** No celular, uma coluna por vez: a lista; tocar num pedido abre o detalhe, com "Pedidos" no topo para voltar à lista. A partir de md, lista e detalhe lado a lado. Rolagem no celular: PUB-101.
- **PUB-92** Cartões do detalhe e rodapé usam as cores do DS (fundo primário; avisos de decisão em fundo secundário suave), nos dois temas. O detalhe ocupa a largura até 600 px; o topo do pedido empilha em telas estreitas.
- **PUB-93** "Rejeitar" (secundário) e "Aprovar" (primário) são botões do DS, md.

- **PUB-94** O formulário é do evento: a lista mostra os eventos da organização em contexto que têm formulário (nome, data e capa do evento) e o "Novo formulário" oferece os que ainda não têm e não estão encerrados. Criar e configurar gravam no evento. _(data/formularios.ts)_
- **PUB-95** Nenhum evento com formulário: "Comece a receber pedidos de participação", com "Novo formulário"; a ação some do cabeçalho. Enquanto a organização carrega, linhas pulsando no lugar da lista. _(pages/FormulariosParticipacao.tsx)_

### Pedidos por formulário (21/11/2026)
- **PUB-96** Cada formulário tem os seus pedidos, gravados no evento (`Evento.solicitacoesDeParticipacao`). As contagens da lista (PUB-12, PUB-14) e o mínimo do limite no modal (PUB-34) usam os pedidos daquele formulário. _(data/solicitacoes.ts, data/formularios.ts)_
- **PUB-97** Formulário sem pedidos gravados (criado antes desta regra) ganha pedidos de exemplo na primeira abertura da tela de pedidos, ou ao salvar a configuração: de 4 a 18 pela semente do id do evento, nunca acima do limite, todos pendentes, com datas entre a criação do formulário (no máximo 60 dias atrás) e hoje. Nomes fictícios, sem repetir nomes já gravados em outro evento. Antes de gravar, a lista mostra a quantidade que será gravada. _(data/solicitacoes.ts)_
- **PUB-98** Aprovar e reprovar gravam status, segmentação ou justificativa e a hora da decisão no evento; a decisão continua depois de sair da tela ou recarregar. O detalhe e o rodapé mostram a data e a hora da decisão ("21 nov 2026, 19:23", PUB-109); pedido pendente mostra só a data do pedido (até 22/11/2026, "às 12:00" fixo, uma hora inventada). _(data/solicitacoes.ts, pages/SolicitacoesParticipacao.tsx)_
- **PUB-99** Formulário sem nenhum pedido: a lista mostra "Não há pedidos pendentes" e o detalhe, "Este formulário ainda não recebeu pedidos.". _(pages/SolicitacoesParticipacao.tsx)_

### Acessibilidade, celular e carregamento (22/11/2026)
- **PUB-100** `/backstage/publico/solicitacoes` sem nenhum formulário na organização (entrada direta) leva para `/backstage/publico/formularios`, que mostra o vazio com "Novo formulário" (PUB-95). Até 22/11/2026 abria a tela de pedidos com o título "Formulário de participação", "Este formulário ainda não recebeu pedidos." e "Configurar formulário" sem efeito. _(pages/SolicitacoesParticipacao.tsx)_
- **PUB-101** No celular, lista e detalhe não têm altura fixa: rolam com a página. No pedido pendente, o rodapé "Rejeitar"/"Aprovar" fica grudado no pé da tela, em fundo primário. Trocar entre lista e pedido traz o topo do cartão de volta à vista quando ele ficou acima da tela. Até 22/11/2026 a área da lista tinha altura calculada (`100dvh - 13rem`) e sobravam 52 px para rolar em 390 px. A partir de md, nada muda: cada coluna rola no seu lugar e a tela ocupa a altura da janela. _(pages/SolicitacoesParticipacao.tsx)_
- **PUB-102** Carregando (organização ou pedidos): o cabeçalho aparece e lista e detalhe pulsam no formato final (linhas da lista; cartões do pedido a partir de md), sem tempo fixo (BKS-116). Trocar de pedido e confirmar decisão mostram o pedido na hora. Substitui PUB-80 e PUB-81. _(pages/SolicitacoesParticipacao.tsx)_
- **PUB-103** Acessibilidade: as abas de status são as abas do DS (papel de aba, aba selecionada anunciada, setas para navegar, Enter/Espaço para escolher, foco visível); as opções de evento, segmentação e justificativa são os botões de opção do DS, com foco visível; os modais de novo formulário, configuração, aprovar, rejeitar e o visualizador de anexo são o modal do DS (o visualizador, o diálogo do react-aria) com o título ligado ao diálogo, que é o nome anunciado; "Expandir" é o botão utilitário do DS, com foco visível e nome "Expandir {nome do anexo}"; a imagem do anexo é o botão "Abrir {nome do anexo} em tela cheia"; as linhas da lista têm foco visível e a escolhida é marcada como atual. _(pages/SolicitacoesParticipacao.tsx, components/SelecionarEventoModal.tsx, components/DecisaoModal.tsx, components/FormularioParticipacaoModal.tsx, components/AnexoViewerModal.tsx)_

### Importantes e melhorias da critique (22/11/2026)
- **PUB-104** O hub de Público e a lista de formulários usam o cartão comum (BKS-110). No hub, cada funcionalidade é uma linha com nome (link que cobre a linha), uma frase e a seta. Na lista de formulários, cada linha tem a capa do evento (ou um ícone de calendário), o nome (link para os pedidos) com a data embaixo, "Situação" (selo com ponto: Disponível, Pausado ou Inativo; PUB-11 a PUB-13) e "Pedidos recebidos" ("12" ou "12 de 500" com limite). Com o cartão abaixo de 704 px, cada formulário vira um bloco com os rótulos, sem rolagem lateral (antes o status com a contagem ocupava 319 px e estourava em 390 px). _(pages/Publico.tsx, pages/FormulariosParticipacao.tsx)_
- **PUB-105** Criar formulário termina com o próximo passo: o toast "Formulário criado" diz "Ele já aceita pedidos. Os pedidos aparecem na tela do formulário." ou, salvo desligado, "O recebimento está desligado. Ligue em Configurar formulário quando quiser aceitar pedidos.", com a ação "Abrir formulário" (leva aos pedidos dele); fica 6 s. Substitui PUB-27 ("…já está disponível para o público", mesmo desligado). _(pages/FormulariosParticipacao.tsx)_
- **PUB-106** No novo formulário, o modal de configuração tem o título "Novo formulário", o evento escolhido (nome e data) abaixo e os botões "Voltar" e "Criar formulário": "Voltar" reabre a escolha do evento com ele marcado (antes "Cancelar" descartava o evento escolhido). _(pages/FormulariosParticipacao.tsx, components/FormularioParticipacaoModal.tsx, components/SelecionarEventoModal.tsx)_
- **PUB-107** Configuração do formulário: o Toggle do DS "Receber pedidos", com "O formulário aceita pedidos." ou "O formulário não aceita pedidos. Os já recebidos continuam na lista."; "Limite de pedidos" com os botões de opção do DS "Sem limite" ("Aceita pedidos enquanto o recebimento estiver ligado.") e "Com limite" ("Para de aceitar pedidos ao chegar na quantidade."). Em "Com limite", o campo "Quantidade de pedidos" (obrigatório, rótulo visível, fora da opção) entra abaixo com a altura animada (`Surgir` do DS); Esc dentro dele chega ao modal (antes era engolido). Erros começam pela ação: vazio ou zero, "Informe quantos pedidos o formulário aceita."; abaixo dos recebidos, "Use N ou mais: o formulário já recebeu N pedidos." A dica mostra quantos pedidos já chegaram. Substitui PUB-30, PUB-31, PUB-33 e PUB-34. _(components/FormularioParticipacaoModal.tsx)_
- **PUB-108** Fechar sem querer não perde a escolha (UI-NAV-002): nos modais de escolher evento, configurar e decidir, com algo escolhido, digitado ou mudado, clicar fora não fecha e Esc, "Cancelar" e o X perguntam antes ("Descartar o novo formulário?" / "O formulário não será criado."; "Descartar as alterações?"; nas decisões, "Descartar o que você preencheu?" / "Nada foi decidido. O pedido continua pendente."), com "Continuar editando" e "Descartar". Sem mudança, fecham direto. _(components/protecao-de-descarte.tsx e os quatro modais)_
- **PUB-109** Um formato de data em Público e Segmentações: "26 nov 2026" e, com hora, "26 nov 2026, 19:23" (lista de pedidos, detalhe, rodapé da decisão, eventos dos formulários, "Última atualização" das segmentações). Antes conviviam "DD/MM/AAAA", "21/11/2026 às 19:23" e "Quinta, 31 Dez 2026". _(data/solicitacoes.ts, data/formularios.ts, ../segmentacoes/data/segmentacoes.ts)_
- **PUB-110** Os modais "Aprovar pedido" e "Reprovar pedido" mostram quem está sendo decidido ("{nome}, documento {CPF ou passaporte}") e avisam que a decisão não pode ser desfeita ("Escolha a segmentação em que a pessoa entra. A aprovação não pode ser desfeita." / "Escolha o motivo. Ele fica registrado no pedido. A reprovação não pode ser desfeita."). Saíram as promessas de e-mail de confirmação e de justificativa enviada ao comprador, que não existem. _(components/DecisaoModal.tsx)_
- **PUB-111** "Outro motivo": o campo entra com a altura animada e a dica conta "N/60 caracteres", sempre visível; o próprio campo não aceita mais que 60. Substitui PUB-66 (dica de 2 s que sumia). _(components/DecisaoModal.tsx)_
- **PUB-112** Busca sem resultado na lista de pedidos: "Nenhum pedido encontrado para essa busca." com "Limpar busca"; aba vazia: "Não há pedidos …" (PUB-82). Os dois são a peça comum `SemResultados`, anunciada pelo leitor de tela (BKS-118, BKS-126). Substitui PUB-83. _(pages/SolicitacoesParticipacao.tsx)_
- **PUB-113** Um termo para cada coisa: a decisão é "Aprovar"/"Aprovado" e "Reprovar"/"Reprovado" (saiu "Rejeitar"); o que a pessoa manda é "pedido" (saíram "solicitação" e "participação" como nome do item, em botões, títulos, toasts, limites e contagens). O nome da funcionalidade continua "Formulário de participação". O status gravado segue `rejeitada` (dado, não texto). _(pages/, components/)_

### Estados
- **PUB-80** ~~Ao abrir a tela de pedidos, spinner de 1,5 s antes do conteúdo.~~ Substituída em 22/11/2026 por PUB-102 (esqueleto, sem tempo fixo; BKS-116).
- **PUB-81** ~~Trocar de pedido ou confirmar decisão mostra spinner de 1,5 s no detalhe.~~ Substituída em 22/11/2026 por PUB-102 (o pedido aparece na hora).
- **PUB-82** Aba vazia sem busca: "Não há pedidos pendentes", "Não há pedidos aprovados" ou "Não há pedidos reprovados". _(pages/SolicitacoesParticipacao.tsx)_
- **PUB-83** ~~Busca sem resultado: "Pessoa não encontrada", "Verifique o nome ou e-mail inserido e tente novamente." e botão "Limpar busca".~~ Substituída por PUB-112.
- **PUB-84** Sem pedido selecionado: "Selecione um pedido.". _(pages/SolicitacoesParticipacao.tsx)_
- **PUB-85** Toasts somem em 2 s. _(utils/toast.tsx, pages/FormulariosParticipacao.tsx)_

### Permissões
- Não tratadas. Qualquer pessoa no Backstage vê os dados pessoais e decide.

## Depende de / afeta

- **Depende de:** eventos e organização em contexto (`@/plataforma`); segmentações da organização (SEG-50).
- **Afeta:** o evento (`formularioDeParticipacao`, `solicitacoesDeParticipacao`) e a segmentação escolhida ao aprovar (SEG-51). Não há envio de e-mail.

## Em aberto

- Nenhum formulário público grava pedidos: os formulários de comprador que existem (`landing-pages/sao-silvestre`, `SolicitacaoBeneficioPcd` e `SolicitacaoVagas`) só abrem o modal de "Solicitação enviada", não estão ligados a um evento da plataforma e não gravam nada. Até um deles gravar em `solicitacoesDeParticipacao`, formulário novo fica sem pedidos e os antigos só têm os de exemplo (PUB-97).
- Pedidos de exemplo são gravados também no banco compartilhado (Vercel) na primeira abertura. São fictícios, mas ficam para todo mundo.
- "Pausado" é só rótulo calculado: o recebimento não é desligado ao atingir o limite.
- Quem decidiu é um e-mail fixo, não o usuário logado. Pedido pendente mostra "às 12:00" fixo (o pedido grava só a data).
- Não há e-mail ao aprovar nem ao reprovar; os modais não prometem mais (PUB-110). Se o produto quiser avisar quem pediu, decidir o canal.
- A política de exclusão dos anexos ("15 dias após a validação", texto de produção) saiu da tela porque não existe no protótipo (PUB-54). Volta quando houver a exclusão de fato; confirmar o prazo com produto e jurídico.
- "Com limite" diz que o formulário para de aceitar pedidos; no protótipo nenhum formulário público grava pedidos, então o limite só muda o rótulo para "Pausado" (PUB-12).
- Lista de formulários com linhas (PUB-104), toast com "Abrir formulário" (PUB-105) e os modais de decisão (PUB-110) foram vistos só no código: o banco local não tem formulário e criar um grava no banco.
- Aprovação em lote e "PNE" × "PcD" ficam para decisão humana.
- Dados sensíveis (CPF sem máscara, data do laudo, laudo médico) aparecem sem controle de acesso nem registro de quem viu.
- CID está no dado, mas não aparece no detalhe. `DadosCadastraisForm` (mostra CID) e `TermosPreview` existem e não são usados.
- O laudo exibido é um modelo em branco, igual para todos. O documento é a mesma imagem para todos.
- O item Público da barra superior (`ORG_NAV`) não navega (o cartão "Segmentações" navega desde 21/11/2026).

## Fontes

Nenhum link de Figma, Confluence ou Jira no código ou na pasta.
