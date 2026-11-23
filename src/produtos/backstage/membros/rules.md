# Membros: regras

> **Rotas:** `/backstage/membros`, `/backstage/membros/criar-cargo`, `/backstage/membros/cargos/:id/editar`
> **No menu:** Backstage › barra da organização › Membros (rail lateral e barra do topo apontam para `/backstage/membros`). Até 12/11/2026 era "Membros e Comissários", com abas (BKS-34); Comissários virou relatório (COM-110).
> **Versão em uso:** esta pasta (`membros`, rota `/backstage/membros`). `membros-v2` e `equipe-e-permissoes` ficaram como histórico; as rotas delas levam para cá e para Equipe e comissários (BKS-35).
> **Revisado em:** 2026-11-22

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

Área da organização para gerenciar quem acessa o Backstage. O admin adiciona membros por e-mail,
dá a eles cargos (o que podem fazer) e grupos (em quais eventos), e cria cargos próprios numa
matriz de permissões.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Membros, grupos, cargos criados | documento da organização em contexto (`Organizacao.membros`, `gruposDeMembros`, `cargos`), lido e gravado por `../components/membros-store.ts`; Equipe e comissários usa os grupos como origem de operadores | sim, na organização |
| Membros e grupos de exemplo | `exemploDa` em `../components/membros-store.ts`, feitos para cada organização (e-mails no domínio dela, grupos nos eventos dela) enquanto ela não grava | não |
| Cargos padrão (8) | `CARGOS` em `../components/membros-store.ts` | não |
| Eventos dos selects e das contagens | eventos da organização em contexto (`useEventosDaOrganizacao`) | não |
| Catálogo de permissões dos cargos | `data/permissoes-catalogo.ts` ("lista de 06/10/2026") | não |

## Regras

### Comportamento
- **MEM-01** A tela tem três abas: Membros, Grupos e Cargos, cada uma com a contagem total no rótulo. _(pages/Membros.tsx)_
- **MEM-02** O botão do topo muda com a aba: "Adicionar membro", "Novo grupo" ou "Novo cargo". _(pages/Membros.tsx)_
- **MEM-03** Trocar de aba (pelas abas ou pelo voltar do navegador) limpa a busca, os filtros e as seleções. _(pages/Membros.tsx)_
- **MEM-04** Busca: Membros por e-mail; Grupos por nome do grupo ou nome de evento; Cargos por nome. _(pages/Membros.tsx)_
- **MEM-05** Aba Membros mostra e-mail, cargos (badges), nº de grupos e nº de eventos; o lápis abre "Editar membro". O nº de eventos é a soma, sem repetir, dos eventos dos grupos do membro. _(pages/Membros.tsx, ../components/membros-store.ts `eventosDoMembro`)_
- **MEM-06** ~~Aba Grupos mostra nome, nº de usuários e nº de eventos; grupos não têm ação de editar.~~ Substituída por MEM-77 e MEM-81.
- **MEM-07** Aba Cargos mostra nome e informações: resumo de níveis (cargo com `permissions`), ou descrição e "N permissões" (cargo com `acoes`). Cargos "Parceiro" e "Comissário" levam o selo "Limites em cada funcionalidade" abaixo do nome (antes "Por feature", só no Parceiro; no Comissário os limites vêm do grupo em Equipe e comissários). _(pages/Membros.tsx, ../components/membros-store.ts `porFeature`)_
- **MEM-08** "Remover (N)" aparece só nas abas Membros e Grupos e fica desabilitado sem seleção. _(pages/Membros.tsx)_
- **MEM-09** Remover membros apaga os membros e tira os ids deles dos grupos. Toast: "Membro removido" ou "N membros removidos". _(pages/Membros.tsx, ../components/membros-store.ts)_
- **MEM-10** Excluir grupos apaga os grupos e tira o vínculo dos membros. Toast: "Grupo excluído" ou "N grupos excluídos". _(pages/Membros.tsx, ../components/membros-store.ts)_
- **MEM-11** Excluir cargo pede confirmação com quantos membros perdem as permissões; ao confirmar, o cargo sai dos membros. Toast: `Cargo "X" excluído`. _(pages/Membros.tsx, ../components/membros-store.ts)_
- **MEM-12** Adicionar membro aceita vários e-mails: Enter, vírgula, colar lista ou sair do campo transformam o texto em chips; Backspace no campo vazio apaga o último chip. _(../components/CriarMembroModal.tsx)_
- **MEM-13** Cada e-mail adicionado vira um membro com os mesmos cargos e grupos escolhidos, e entra nos grupos escolhidos. _(../components/CriarMembroModal.tsx, ../components/membros-store.ts)_
- **MEM-14** Editar membro mostra o e-mail só para leitura e troca apenas cargos e grupos; a troca se reflete nos grupos. Toast: `Membro "X" atualizado`. _(../components/CriarMembroModal.tsx)_
- **MEM-15** Novo grupo (título do modal "Novo grupo", botão "Criar grupo"): nome, eventos (os da organização em contexto) e membros (opcional). Toast: `Grupo "X" criado`. _(../components/CriarGrupoModal.tsx)_
- **MEM-16** Criar/editar cargo é uma tela com nome, descrição e uma tabela por seção do catálogo. As seções levam o nome de onde a funcionalidade fica no Backstage (menu do evento, BKS-07; atalhos de Ingressos e produtos, BKS-119), nesta ordem: Organização, Visão geral do evento, Ingressos e produtos, Questionário, "Passkey, cupons e etiquetas", Compras em grupo, Equipe e comissários, Bilheteria e cortesias, Relatórios, Finanças. Até 22/11/2026 eram Configurações do evento, Equipe de operação, Emissão de ingressos (cortesias e inscrições em grupo juntas), Marketing e Coleta de dados. As chaves `recurso:acao` não mudaram. _(pages/CriarCargo.tsx, data/permissoes-catalogo.ts)_
- **MEM-17** As colunas padrão são Visualizar, Editar, Criar, Excluir; Bilheteria e cortesias e Compras em grupo usam Visualizar, Editar, Emitir, Cancelar; Relatórios usa Visualizar, Exportar; Finanças usa Visualizar, Solicitar, Cancelar. Célula sem a ação fica desabilitada. _(data/permissoes-catalogo.ts, pages/CriarCargo.tsx)_
- **MEM-18** Marcar Editar, Criar, Excluir (ou uma linha de ação) marca também o Visualizar exigido. Desmarcar o Visualizar desmarca o que depende dele. _(data/permissoes-catalogo.ts)_
- **MEM-19** Checkbox de seção e de coluna marcam ou desmarcam o conjunto; ficam parciais quando só parte está marcada. Linha pai agrega os sub-itens recuados. _(pages/CriarCargo.tsx)_
- **MEM-20** Passar o mouse num checkbox pré-visualiza (meia opacidade) o que seria marcado junto. O checkbox em si só tem os estados do DS (o hover recriado à mão saiu em 22/11/2026); a linha da matriz reage ao mouse. _(pages/CriarCargo.tsx)_
- **MEM-21** O rodapé fixo conta "N permissões selecionadas". _(pages/CriarCargo.tsx)_
- **MEM-22** "Criar cargo" / "Salvar alterações" abre um resumo antes de gravar. Na criação lista o que o cargo pode fazer por seção e as seções "Sem acesso"; na edição mostra só "Passa a poder" e "Deixa de poder", com quantos membros têm o cargo. _(components/resumo-cargo-modal.tsx)_
- **MEM-23** ~~Confirmar no resumo grava o cargo, mostra toast `Cargo "X" criado` ou `"X" atualizado` e volta para `/backstage/membros`.~~ Substituída por MEM-78 (volta para a aba Cargos). "Voltar e ajustar" fecha o resumo. _(pages/CriarCargo.tsx, components/resumo-cargo-modal.tsx)_

### Validações
- **MEM-30** ~~E-mail precisa casar com `nome@dominio.ext`; inválidos são descartados sem aviso. E-mails são gravados em minúsculas e sem repetição.~~ Substituída por MEM-70.
- **MEM-31** Máximo de 30 e-mails por vez; o contador "N/30" fica vermelho ao chegar no limite e o excedente é ignorado. _(../components/CriarMembroModal.tsx)_
- **MEM-32** ~~Salvar membro exige ao menos um e-mail (na criação), um cargo e um grupo; senão o botão fica desabilitado.~~ Substituída por MEM-71.
- **MEM-33** ~~Criar grupo exige nome e ao menos um evento; membros são opcionais.~~ Substituída por MEM-72.
- **MEM-34** ~~Cargo exige nome e descrição: o botão fica desabilitado sem eles, e o toast diz "Informe o nome do cargo" ou "Informe a descrição do cargo".~~ Substituída por MEM-73 (o toast nunca aparecia: o botão desabilitado impedia o clique).
- **MEM-70** E-mail precisa casar com `nome@dominio.ext`. Ao virar chip (Enter, vírgula, colar, sair do campo ou Salvar), o que tem problema fica no campo, com o erro abaixo começando pela ação: "Corrija o e-mail: falta o domínio" (ou "falta o @", "falta o nome antes do @", "tem mais de um @", "falta o final do domínio, como .com"; com vários, o erro cita cada e-mail). Quem já é membro da organização também fica no campo: "Já é membro: x@y.com. Apague do campo ou edite o membro na lista." Os válidos viram chips, em minúsculas e sem repetição. Digitar de novo limpa o erro. _(../components/CriarMembroModal.tsx)_
- **MEM-71** Salvar membro fica sempre habilitado. Ao clicar, o texto que ainda está no campo vira chip; se sobrar erro, o foco volta ao campo. Faltando algo, o erro aparece no campo: "Informe ao menos um e-mail." (só na criação), "Selecione ao menos um cargo.", "Selecione ao menos um grupo.". _(../components/CriarMembroModal.tsx)_
- **MEM-72** Criar grupo fica sempre habilitado e exige nome e ao menos um evento; membros são opcionais. Faltando, os erros aparecem nos campos ("Informe o nome do grupo.", "Selecione ao menos um evento.") e o foco vai ao nome. Nome igual ao de outro grupo da organização (sem diferenciar maiúsculas): "Use outro nome: já existe um grupo com esse nome." (desde 22/11/2026, vale também ao editar). _(../components/CriarGrupoModal.tsx)_
- **MEM-73** Cargo exige nome e descrição. "Criar cargo" / "Salvar alterações" fica sempre habilitado; ao clicar sem eles, os erros aparecem nos campos ("Informe o nome do cargo.", "Informe a descrição do cargo.", no lugar do texto de apoio) e o foco vai ao primeiro campo com erro, sem abrir o resumo. _(pages/CriarCargo.tsx)_
- **MEM-35** Cargo pode ser salvo sem nenhuma permissão; o resumo avisa "Este cargo está sem permissões" (ou "vai ficar sem permissões" na edição). _(components/resumo-cargo-modal.tsx)_

### Estados
- **MEM-40** Inicial, enquanto a organização não grava: `admin@<domínio da organização>` (Administrador, no grupo "Todos os eventos"), os 16 grupos de exemplo de quem opera o evento (bilheteria, promoters, camarote…) com 89 pessoas, todos nos eventos da organização, e os 8 cargos padrão. Organização sem evento começa só com o admin e o grupo padrão. _(../components/membros-store.ts `exemploDa`)_
- **MEM-41** Busca sem resultado: "Não encontramos membros/grupos/cargos para essa busca." com "Limpar busca", dentro do cartão (BKS-118). _(pages/Membros.tsx)_
- **MEM-42** ~~Recarregar a página volta ao estado inicial (store em memória).~~ Substituída por MEM-45.
- **MEM-43** Editar cargo inexistente ou padrão pela URL redireciona para `/backstage/membros`; enquanto a organização carrega, a tela mostra o carregando em vez de redirecionar. _(pages/CriarCargo.tsx)_
- **MEM-45** Membros, grupos e cargos são da organização em contexto e ficam gravados nela: trocar de organização troca a lista, e recarregar mantém o que foi feito. A primeira gravação guarda os exemplos junto. _(../components/membros-store.ts)_
- **MEM-46** Enquanto a organização carrega, linhas pulsando no lugar da tabela, com cabeçalho, abas e busca já visíveis. Membros, Grupos e Cargos paginam com a paginação do DS acima de 10 linhas; buscar volta à página 1 (BKS-114). _(pages/Membros.tsx)_
- **MEM-68** As abas ficam acima da lista e só trocam de seção; abaixo delas, a barra comum com a busca à esquerda e "Remover (N)" à direita, e a lista no cartão comum (`../components/tabela.tsx`, BKS-110). Com o cartão abaixo de 704 px cada linha vira um bloco com o rótulo ao lado de cada valor, sem rolagem lateral; o cabeçalho com "Selecionar todos" continua visível no estreito. Lápis e lixeira são botões terciários com dica. _(pages/Membros.tsx)_
- **MEM-69** A matriz de Criar/editar cargo depende da largura das tabelas, como as listas (BKS-115, MEM-68): com 44rem (704 px) ou mais, a matriz com uma coluna por ação; mais estreito, cada seção mostra título, descrição, o checkbox da seção e "Em toda a seção" com um checkbox com rótulo por coluna, e cada recurso vira um bloco com o nome em cima e só as ações que ele tem, como checkboxes com rótulo ("Visualizar", "Editar", "Criar", "Excluir") em duas colunas. Linha de ação com uma ação só (ex.: "Publicar eventos") vira um checkbox com o próprio nome; sub-itens ficam recuados. Sem rolagem lateral em 390 px. _(pages/CriarCargo.tsx)_
- **MEM-74** Os campos de seleção múltipla dos modais (Cargo e Grupo em Adicionar/Editar membro; Eventos e Membros em Criar grupo) são o Select do React Aria em seleção múltipla, com o rótulo e o asterisco do Label do DS e os itens do DS (checkbox à esquerda): o botão tem o rótulo do campo e abre uma lista (listbox) com busca; setas andam pelas opções, Enter marca e desmarca, a lista fica aberta para marcar várias. Esc limpa a busca e, de novo, fecha só a lista, com o foco de volta no botão (o modal continua aberto). O botão mostra o nome da opção escolhida ou "N selecionados"; abaixo, um chip por opção com "×" de 24 px. _(../components/CheckboxSelect.tsx)_
- **MEM-75** Os modais de Membros (Adicionar/Editar membro, Novo/Editar grupo) são o modal do DS preso ao topo da tela (8% da altura): crescem para baixo, sem mudar de lugar enquanto a pessoa escolhe. No celular (abaixo de 640 px) ocupam a tela toda, com Cancelar e a ação no pé, fixos. Chips de e-mail e das seleções entram e saem com a altura animada (`Surgir` do DS, 200 ms; sem animação com movimento reduzido). Saindo do campo de e-mail com um clique em outro controle, o texto só vira chip depois de soltar o botão, para o clique cair no controle certo; se um select já abriu, a lista dele se reposiciona embaixo do campo. O campo de e-mail (rótulo "E-mails") recebe o foco ao abrir; o botão diz "Adicionar" ou "Adicionar N membros". Até 22/11/2026 o modal era centralizado e saltava ao virar chip (o clique caía na opção errada). _(../components/CriarMembroModal.tsx, ../components/CriarGrupoModal.tsx, ../components/CheckboxSelect.tsx)_
- **MEM-76** Fechar sem querer não perde o preenchido (UI-NAV-002): com algo preenchido ou mudado, clicar fora não fecha, e Esc, "Cancelar" e o X abrem "Descartar o que você preencheu?" ("O que você preencheu ainda não foi salvo.", "Continuar editando" e "Descartar", em vermelho). Sem nada mudado, fecham direto. Vale para Adicionar/Editar membro e Novo/Editar grupo. _(../components/CriarMembroModal.tsx, ../components/CriarGrupoModal.tsx)_
- **MEM-77** Grupos abrem para edição (desde 22/11/2026): clicar na linha ou no lápis (com dica "Editar grupo") abre "Editar grupo" com nome, eventos e membros, e "Salvar alterações" grava e reflete a troca de membros neles. Toast: `Grupo "X" atualizado`. O grupo padrão "Todos os eventos" mostra o nome e "vale para todos os eventos da organização, inclusive os criados depois" sem campos: só os membros mudam (MEM-64). _(pages/Membros.tsx, ../components/CriarGrupoModal.tsx, ../components/membros-store.ts `editarGrupo`)_
- **MEM-78** A aba fica na URL: `/backstage/membros` (Membros), `?aba=grupos` e `?aba=cargos`; o voltar do navegador troca de aba. Criar e editar cargo, ao salvar, cancelar ou descartar, voltam para `?aba=cargos`. _(pages/Membros.tsx, pages/CriarCargo.tsx)_
- **MEM-79** Na aba Membros, a barra tem a busca, os filtros "Todos os cargos" e "Todos os grupos" (Select do DS) e "Editar em lote (N)", desabilitado sem seleção: o menu tem "Dar o cargo" (os cargos) e "Incluir no grupo" (os grupos, sem o padrão), que somam ao que os membros já têm, com toast (`Cargo "X" dado a N membros`, `N membros incluídos no grupo "X"`) e limpam a seleção. Sem resultado com filtros: "Não encontramos membros com esses filtros." com "Limpar busca", que limpa busca e filtros. _(pages/Membros.tsx, ../components/membros-store.ts `adicionarAosMembros`)_
- **MEM-80** Criar/editar cargo com algo mudado (nome, descrição ou permissões): "Cancelar" e "← Membros" abrem "Descartar o cargo?" (ou "Descartar as alterações do cargo?"), com "Continuar editando" e "Descartar"; recarregar ou fechar a aba mostra o aviso do navegador. O voltar do navegador não pergunta (o app usa `BrowserRouter`, sem `useBlocker`). Os títulos de seção da matriz são Text lg Semibold. _(pages/CriarCargo.tsx)_
- **MEM-81** Colunas de número (Grupos e Eventos na aba Membros; Membros e Eventos na aba Grupos) mostram só o número; o rótulo da coluna (ou, no estreito, o rótulo ao lado) diz o que é. Antes: "Grupos: 1 grupo", "Membros: 6 usuários". _(pages/Membros.tsx)_
- **MEM-67** Não há login no Backstage do protótipo: quem opera é o primeiro administrador da organização em contexto, com nome tirado do e-mail. Emissor de cortesia, operador da bilheteria e autor de alteração no pedido vêm dele. _(../components/membros-store.ts)_
- **MEM-44** Resumo de edição sem mudanças: "Nenhuma permissão foi alterada". _(components/resumo-cargo-modal.tsx)_

### Permissões
- **MEM-60** Um membro pode ter vários cargos e vários grupos. Cargo define o que faz; grupo define em quais eventos. _(../components/membros-store.ts, ../components/CriarMembroModal.tsx)_
- **MEM-61** Cargos padrão: Administrador, Editor de eventos, Financeiro, Financeiro (conta padrão), Marketing, Visualizador, Parceiro e Comissário (aplicado às pessoas dos grupos-comissário de Equipe e Comissários, ECO-24). Não podem ser editados nem excluídos (ícone de cadeado com tooltip "Cargo padrão"). _(../components/membros-store.ts, pages/Membros.tsx)_
- **MEM-62** Cargo "Parceiro" não tem permissão geral; os limites ficam em cada funcionalidade (ex.: itens e quantidades de Cortesias). _(../components/membros-store.ts)_
- **MEM-63** Cargos criados pela organização guardam ações no formato `recurso:acao` (ex.: `events.courtesies:emit`). _(pages/CriarCargo.tsx, data/permissoes-catalogo.ts)_
- **MEM-64** O grupo padrão "Todos os eventos" cobre todos os eventos da organização, inclusive os criados depois, tem badge "Padrão" e não pode ser selecionado para exclusão. Os outros grupos mostram só os eventos que ainda são da organização. _(pages/Membros.tsx, ../components/membros-store.ts)_
- **MEM-65** A seção "Equipe e comissários" do catálogo (antes "Equipe de operação") controla Operadores, Grupos do evento (antes "Grupos de cota"), Ativar grupos do evento, Emissões dos grupos e Emissores dos grupos (ativar, validar). _(data/permissoes-catalogo.ts)_
- **MEM-66** Finanças separa "Repasses para qualquer conta" de "Repasses para a conta padrão"; não há Editar em finanças. _(data/permissoes-catalogo.ts)_

## Depende de / afeta

- **Depende de:** organização em contexto e os eventos dela (`@/plataforma`, `../organizacoes/data/organizacao-atual.ts`).
- **Afeta:** Equipe e comissários: as pessoas dos grupos vêm dos grupos de Membros da organização (ECO-08). Cortesias › Grupos parceiros (`../cortesias/pages/GruposParceiros.tsx`, sem rota) grava no mesmo store.

## Em aberto

- O admin de exemplo não é a pessoa logada; o Backstage ainda não tem login de produtor.
- Membros, grupos e cargos não restringem nada no Backstage: quem entra vê tudo.
- Criar grupo não oferece "Todos os eventos" (só o grupo padrão cobre todos).
- "Editar em lote" só soma cargo ou grupo; tirar cargo ou grupo em lote não existe.
- "Criar cargo sem índice" (critique de 22/11/2026): a tela não tem índice das 10 seções; ficou de fora.
- O texto "Use o e-mail da conta Ingresse da pessoa" não é verificado (MEM-70 só checa o formato e quem já é membro).
- Divulgação (Lista de espera e Pixel de rastreamento, BKS-120) não tem permissões no catálogo de 06/10/2026; Passkey, cupons e etiquetas, que eram "Marketing", ficaram numa seção própria em vez de dentro de Ingressos e produtos, para a tabela não crescer demais. Confirmar com produto.
- "Visão geral do evento" é o nome da seção dos dados do evento (eventos, publicação, sessões, configurações, termos): no menu a opção é só "Visão geral", e "Informações do evento" abre por ela (EVT-137).
- `CheckboxSelect` também é usado por `membros-v2/pages/NovoGrupoV2.tsx` (sem rota, BKS-35), que passa a ter o mesmo comportamento (MEM-74).
- Dois modelos de cargo convivem: `permissions` (níveis Visualizador/Editor/Admin por feature, via `components/criar-cargo-modal.tsx` + `permission-accordion.tsx`) e `acoes` (matriz da tela Criar cargo). O modal antigo não é usado por nenhuma tela. Decidir qual fica e apagar o outro.
- `FEATURES` do store (usado pelo modal antigo) não bate com `CATALOGO_PERMISSOES` da matriz.
- Cargos padrão só têm descrição, sem `acoes`: não dá para ver na matriz o que eles concedem.
- `membros-v2` (acesso por pessoa dentro do grupo) e `equipe-e-permissoes` (por evento) ficaram como histórico, sem rota (BKS-35).

## Fontes

Nenhum link de Figma, Confluence ou Jira no código desta feature. O catálogo cita "lista de 06/10/2026" sem link _(data/permissoes-catalogo.ts)_.
