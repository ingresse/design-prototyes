# Compras em grupo: regras

> **Rotas:** `/backstage/vendas/compras-em-grupo`
> **No menu:** Backstage › menu do evento › Compras em grupo (opção própria desde 22/11/2026, BKS-07; antes, em Regras de venda)
> **Versão em uso:** única (`compras-em-grupo/`)
> **Revisado em:** 2026-11-23

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

Gêmeo do módulo `group-registration` do Backstage de produção. A produtora publica um formulário
para gestores de grupos e assessorias pedirem vagas, e aprova uma cota (com prazo) ou reprova cada
pedido. Não há desconto de grupo: quem compra paga o preço normal.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Módulo (período, limites, prazo, ingressos, estado) e solicitações | `@/plataforma` (`Evento.comprasEmGrupo`) | sim, no banco |
| Vagas por ingresso | `@/plataforma` (`useCatalogo`: lotes menos vendidos) | não |

## Regras

### Telas, nesta ordem
- **CEG-80** Evento sem ingressos: "Antes de vender para grupos, você precisa criar seu catálogo", "Crie ingressos em Ingressos e produtos." (antes, "Vá até a sessão de itens…") e "Criar itens para venda". _(pages/compras-em-grupo.tsx)_
- ~~**CEG-01** Evento sem ingressos: "Antes de vender para grupos, você precisa criar seu catálogo" e "Criar itens para venda". _(pages/compras-em-grupo.tsx)_~~ substituída por CEG-80.
- **CEG-02** Módulo nunca publicado: "Habilite o módulo de compras em grupo", com "Como funciona?" (as 3 etapas e "Vamos começar!") e "Habilitar compras em grupo", que abre o assistente.
- **CEG-03** Publicado e sem pedidos: título "Compras em grupo", "Você já tem seu formulário, mas ainda não recebeu solicitações", o estado ("Tudo certo com seu formulário!"), "Desabilitar/Habilitar novas solicitações", "Editar formulário" e o cartão "Compartilhar" com o link e "Copiar link" ("Link copiado!" por 2 s). É a confirmação da publicação.
- **CEG-04** Com pedidos: a fila (CEG-30 em diante).

### Assistente
- **CEG-10** Três passos com stepper (Período e limites, Itens do formulário, Revisão); o cabeçalho tem voltar ("Voltar para a etapa anterior"), o título "Compras em grupo" e "Continuar" ("Publicar formulário" no último). Cada "Continuar" grava. _(components/assistente.tsx)_
- **CEG-11** Passo 1, em três cartões: "Limites do grupo de compra" (mínimo e máximo de pessoas), "Período de disponibilidade do formulário de pedidos" (início e fim, data e hora) e "Prazo para comprar no grupo": "Até uma data específica" (data e hora) ou "Por um período após a aprovação" (dias).
- **CEG-73** Passo 2 (desde 23/11/2026): os ingressos na árvore comum com escala (`ArvoreDeIngressos`, UI-LST-005): sessão › grupo › ingresso, grupos recolhidos, marcar sessão ou grupo inteiro, busca, "Selecionados" e "Mostrar mais". À direita, "Inscrições": o resumo ("40 ingressos em 5 grupos"), o total de vagas e cada ingresso com o grupo (e a data, "2 out 2026, 23:00", com várias sessões), "N vagas" e "Remover", 20 por vez. Sem ingresso, "Continuar" fica desabilitado ("Selecione ao menos um ingresso para o formulário."). Com `?escala=5000`: 30 linhas e 12 ms por clique (antes, lista plana com todos os ingressos). Marcar o grupo grava os ingressos que ele tem agora. _(components/assistente.tsx)_
- **CEG-74** O assistente e o passo ficam no endereço (`?passo=0|1|2`, com `&editando=1` no "Editar formulário"): o Voltar do navegador volta um passo em vez de sair do fluxo. _(pages/compras-em-grupo.tsx)_
- ~~**CEG-12** Passo 2: busca "Busque por nome de grupo ou inscrição" e os ingressos por sessão e grupo, cada um com "N vagas" (o que resta nos lotes); à direita, "Inscrições" com o total de vagas, os escolhidos e "Remover". Sem item, "Continuar" fica desabilitado ("Selecione ao menos um item para o formulário.").~~ substituída por CEG-73.
- **CEG-75** Passo 3, "Revise a configuração": limites ("De 10 a 200 pessoas por pedido"), período e prazo ("Até 2 out 2026, 23:00" ou "N dias após a aprovação") e os ingressos contados por grupo ("Pista: 8 ingressos"), 8 grupos de início e "Ver todos (N)". "Publicar formulário" liga o módulo e volta para a tela do formulário. _(components/assistente.tsx)_
- **CEG-76** No celular, no lugar do stepper vertical (cerca de 200 px), uma linha: "Etapa 2 de 3: Itens do formulário". Os campos do prazo ("Até uma data específica" ou "Por um período após a aprovação") abrem deslizando. O exemplo do prazo não usa mais uma data passada ("Ex.: as compras podem acontecer até a véspera do evento."). _(components/assistente.tsx)_
- ~~**CEG-13** Passo 3, "Revise a configuração": limites ("De 10 a 200 pessoas por pedido"), período, prazo ("Até …" ou "N dias após a aprovação") e itens. "Publicar formulário" liga o módulo e volta para a tela do formulário.~~ substituída por CEG-75.
- **CEG-14** "Editar formulário" (menu) abre direto "Editar período e limites" ou "Editar itens do formulário", sem stepper; "Salvar" grava e volta.
- **CEG-15** Mudar o prazo com grupos já aprovados mostra o aviso de que o prazo deles será atualizado.

### Validações
- **CEG-20** Mínimo obrigatório e maior que zero; máximo obrigatório e maior ou igual ao mínimo; início e fim obrigatórios, fim depois do início; prazo informado (data, ou dias maior que zero). Mensagens de produção ("Informe o mínimo de pessoas.", "O máximo precisa ser maior ou igual ao mínimo.", "O fim precisa ser depois do início." …).

### Fila
- **CEG-72** Cabeçalho da fila: título "Compras em grupo" com o selo do estado ao lado (Disponível em verde, Agendado em amarelo, Encerrado e Desativado em cinza), subtítulo "Grupos e assessorias que pediram vagas pelo formulário." e as ações em md, no cabeçalho (BKS-104): "Copiar link do formulário", "Editar formulário" e "Desabilitar/Habilitar novas solicitações". Antes ficavam numa linha própria, em sm. _(pages/compras-em-grupo.tsx)_
- ~~**CEG-30** Cabeçalho "Compras em grupo" (subtítulo "Grupos e assessorias que pediram vagas pelo formulário.") com o estado (Disponível em verde, Agendado em amarelo, Encerrado e Desativado em cinza), "Copiar link do formulário", "Editar formulário" e "Desabilitar/Habilitar novas solicitações".~~ substituída por CEG-72.
- **CEG-31** Estado do formulário: Desativado (a produtora desabilitou), Agendado (antes do início), Encerrado (depois do fim) ou Disponível.
- **CEG-81** Desabilitar confirma: "Desabilitar novas solicitações?" / "O formulário para de receber pedidos. Você pode habilitar de novo a qualquer momento." ("Voltar" e "Desabilitar"); habilitar não pergunta. _(pages/compras-em-grupo.tsx)_
- ~~**CEG-32** Desabilitar confirma ("Tem certeza?" … "Sim, desabilitar o formulário." / "Não, cancelar."); habilitar não pergunta.~~ substituída por CEG-81.
- **CEG-33** Cartões "Resumo das vagas do evento": Vagas solicitadas, Total de vagas aprovadas (com "N% aprovadas"), Pagas, A pagar e Iniciadas.
- **CEG-34** Painel "Solicitações": "N inscrições pendentes de aprovação em M solicitações pendentes" (M conta só as pendentes, desde 23/11/2026; sem pendentes, "Nenhuma solicitação pendente.") e "Exportar" (CSV das linhas filtradas); abaixo, a barra comum (BKS-111): busca "Buscar por responsável ou grupo" à esquerda e o filtro de status à direita em botões segmentados (Todas, Pendentes, Aprovadas, Reprovadas; a contagem de cada um aparece a partir de 1280 px). Até 21/11/2026 o filtro eram abas. Paginação do DS acima de 10 pedidos; mudar busca ou filtro volta à página 1 (BKS-114). _(pages/compras-em-grupo.tsx)_
- **CEG-35** Colunas, no cartão comum (`../components/tabela.tsx`): Grupo (título; "Expira em" ou, em amarelo, "Expirou em"), Status (Pendente, Aprovada, Reprovada), Responsável (com e-mail ou "Sem e-mail cadastrado"), Solicitadas, Aprovadas e Pagas ("—" quando não se aplica). Com o cartão abaixo de 704 px, cada pedido vira um bloco com o rótulo ao lado de cada valor (BKS-115). Até 21/11/2026 o Status era a primeira coluna e o bloco começava em 768 px. _(pages/compras-em-grupo.tsx)_
- **CEG-77** Ações com texto, que funcionam no toque (antes, só o ícone de polegar com dica): pendente tem "Reprovar" e "Aprovar"; aprovada tem "Revisar" (muda a cota); reprovada tem "Aprovar" (CEG-79). O nome acessível diz o grupo ("Aprovar a solicitação de X"). No bloco estreito, as ações ficam embaixo. _(pages/compras-em-grupo.tsx)_
- **CEG-78** Aprovação em lote: caixa nas pendentes (e "Selecionar as pendentes da página" no cabeçalho); com seleção, a barra dentro do cartão mostra "N solicitações selecionadas" e "Aprovar selecionadas", que confirma ("Aprovar N solicitações?", com o total de vagas pedidas) e aprova cada uma com as vagas pedidas e o prazo da regra do formulário. Toast "N solicitações aprovadas.". _(pages/compras-em-grupo.tsx)_
- ~~**CEG-36** Ações: pendente tem "Reprovar solicitação" e "Aprovar solicitação"; decidida tem "Revisar solicitação".~~ substituída por CEG-77.
- **CEG-37** Busca ou filtro sem resultado: "Nenhuma solicitação encontrada para essa busca ou filtro." dentro do cartão, com "Limpar busca", que apaga a busca e volta o filtro para Todas (BKS-118). A fila só aparece com pedidos (CEG-04), então ela não tem vazio próprio. _(pages/compras-em-grupo.tsx)_
- **CEG-71** Enquanto o evento carrega, o cabeçalho "Compras em grupo" já aparece, com linhas pulsando no lugar do conteúdo (BKS-116). _(pages/compras-em-grupo.tsx)_

### Decisão
- **CEG-40** Aprovar: "Confirma a aprovação deste grupo?", os dados do pedido e "Confirme ou altere a quantidade de inscrições" (padrão: a cota atual ou o pedido). Pode aprovar mais do que o pedido; nunca menos do que o grupo já usou ("A quantidade aprovada não pode ser menor que as N vagas já utilizadas pelo grupo."). _(components/modal-de-decisao.tsx)_
- **CEG-41** Reduzir uma cota aprovada pede o motivo ("Por que a quantidade aprovada está sendo reduzida?").
- **CEG-42** O prazo da cota vem da regra do módulo (data fixa ou N dias depois da aprovação); a produtora não digita.
- **CEG-79** Reprovar: "Confirma a reprovação deste grupo?" e o motivo, obrigatório, com a dica "O gestor vê este motivo. Se mudar de ideia, use “Aprovar” na linha da solicitação." (antes, prometia "Essa ação poderá ser desfeita no futuro." sem ter como). A reprovada pode ser aprovada depois: o modal de aprovar, com a data da decisão e o prazo da cota novos. Grupo com vagas usadas não pode ser reprovado: o aviso manda aprovar as vagas já usadas. Os dados do pedido mostram "Solicitado por" e "E-mail" em linhas separadas. _(components/modal-de-decisao.tsx, pages/compras-em-grupo.tsx)_
- ~~**CEG-43** Reprovar: "Confirma a reprovação deste grupo?" e o motivo, obrigatório. Grupo com vagas usadas não pode ser reprovado: o aviso manda reduzir a cota.~~ substituída por CEG-79.
- **CEG-44** Toasts: "Solicitação de X aprovada.", "Solicitação de X reprovada.", "Quantidade de vagas de X atualizada.".

### Ferramenta de protótipo
- **CEG-60** Na tela sem pedidos, "Simular pedidos de exemplo" cria cinco pedidos fictícios (três pendentes, um aprovado, um reprovado) para mostrar a fila. Em produção os pedidos chegam pelo formulário público.

### Formulário público
- **CEG-70** O link copiado (`/grupos/<slug>`) abre o formulário do gestor (marketplace/pedido-de-grupo). O pedido enviado entra na fila como Pendente, com o nome e o e-mail de quem pediu. _(@/plataforma `pedirVagasDeGrupo`)_

## Depende de / afeta

- **Depende de:** ingressos do evento.
- **Afeta:** o formulário público do gestor (`/grupos/<slug>`, marketplace/pedido-de-grupo/rules.md).

## Em aberto

- Cada "Continuar" do assistente grava (CEG-10), como em produção. A critique pediu "sem gravar no meio" só para os cupons; aqui ficou como está.
- O motivo da reprovação fica gravado na solicitação, mas não está claro se chega ao gestor (o formulário público não mostra).
- Aprovação em lote usa sempre as vagas pedidas; para outra cota, aprovar uma a uma.

- A área de compras do grupo (pedidos e links de pagamento do gestor) não existe no protótipo; pagas e iniciadas vêm só dos pedidos de exemplo.
- "Revisar" (aprovada) abre o modal de aprovar; o painel de produção "Editar solicitação de vagas" (troca de decisão e do prazo da cota, "Copiar link do gestor") ficou de fora.
- Em produção o título da tela muda de "Compras em grupo" (menu) para "Grupos e assessorias" (fila). Aqui o título fica sempre "Compras em grupo", igual ao menu (BKS-100), e "Grupos e assessorias" vai para o subtítulo (decisão de 21/11/2026). O texto de produção "Por quê esta solicitação…" foi corrigido para "Por que".

## Fontes

- Levantamento do Backstage de produção (awa-workspace, só leitura), `pesquisas/gemeo-backstage/estrategias-de-venda.md`, seção 2.
