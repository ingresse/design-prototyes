# Finanças: regras

> **Rotas:** `/backstage/financas`
> **No menu:** Backstage › menu da organização › Finanças
> **Versão em uso:** única (`financas/`)
> **Revisado em:** 2026-11-22 (dicas acessíveis, motivo do "Novo repasse", plural e vazios; depois, assistente com endereço por passo, proteção ao sair, rádios e indicador do DS, filtros em select, barra de seleção presa à lista)

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

Gêmeo da página `/payouts` do app de repasses de produção (repositório `ingresse/cashout`, que o
Backstage abre num iframe). A produtora vê quanto pode repassar, o saldo de cada evento e os
pedidos, e pede repasse para uma conta.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Faturamento por evento | `eventos/data/vendas.ts` (`useResumos`, o mesmo de Eventos e Relatórios) | não |
| Contas favorecidas e repasses | `@/plataforma` (`Organizacao.contasFavorecidas`, `Organizacao.repasses`); sem gravação, a conta do contrato e três repasses de exemplo | sim, no banco |

## Regras

### Saldo
- **FIN-01** Saldo do evento = faturamento × 90% (o resto são taxas), menos o que já foi pedido em repasses (em análise, pendentes, agendados e pagos). Evento que já aconteceu tem tudo liberado; evento futuro tem 55% liberado e o resto "a liberar". _(data/financas.ts)_
- **FIN-02** Disponível = o liberado menos os pedidos, nunca negativo. Saldo a liberar = o que falta liberar, menos o que os pedidos passaram do liberado. Total do evento = disponível + a liberar ("Você pode repassar até").

### Painel
- ~~**FIN-10** Título "Finanças" e três cartões: "Você pode repassar até" (com Disponível, Saldo a liberar e "Novo repasse"), "Repasses agendados" (valor, "Solicitações agendadas" e "Próximo pagamento") e "Repassado nos últimos N dias" ("Total já repassado" em Todos), com o valor escondido ("R$ ••••••") até tocar no olho. As dicas são as de produção (como abrem: FIN-46). _(pages/financas.tsx)_~~ Substituída por FIN-48.
- **FIN-48** Título "Finanças" e três cartões: "Você pode repassar até" (com Disponível, Saldo a liberar e "Novo repasse"), "Repasses em andamento" (valor, "Solicitações em andamento" e "Próximo pagamento") e "Repassado nos últimos N dias" ("Total já repassado" em Todos), com o valor escondido ("R$ ••••••") até tocar no olho. "Em andamento" são os pedidos ainda não pagos: em análise, pendentes ou agendados; a dica diz isso. Até 22/11/2026 o cartão se chamava "Repasses agendados" e contava como agendado um pedido ainda em análise. As outras dicas são as de produção (como abrem: FIN-46). _(pages/financas.tsx)_
- **FIN-11** "Novo repasse" fica desabilitado sem saldo, com "Sem saldo disponível para repasse." escrito logo abaixo dele (ligado ao botão como descrição). Até 22/11/2026 o motivo só aparecia num tooltip de mouse. _(pages/financas.tsx)_
- **FIN-12** Abas "Seu saldo por evento" (padrão) e "Suas solicitações".

### Seu saldo por evento
- ~~**FIN-13** Na barra comum (BKS-111): busca "Buscar eventos..." (nome ou ID) à esquerda; à direita, "Filtrar eventos" (futuros ou passados; com ou sem saldo, cada par exclusivo) e "Relatórios" (saldo por evento e disponibilidade futura, em CSV com `;`, dos eventos marcados; sem marcação: "Selecione ao menos um evento para gerar o relatório."). _(pages/financas.tsx)_~~ Substituída por FIN-55.
- **FIN-55** Na barra comum (BKS-111): busca "Buscar eventos..." (nome ou ID) à esquerda; à direita, dois selects do DS, um para cada filtro exclusivo: data ("Todos os eventos", "Eventos futuros", "Eventos passados") e saldo ("Com e sem saldo", "Com saldo disponível", "Sem saldo disponível"), e "Relatórios" (saldo por evento e disponibilidade futura, em CSV com `;`, dos eventos marcados; sem marcação: "Selecione ao menos um evento para gerar o relatório."). É o mesmo desenho do Período em Suas solicitações. "Limpar busca" volta os dois filtros para "todos". Até 22/11/2026 era um menu "Filtrar eventos" com quatro caixas, em que marcar uma desabilitava o par (rádio disfarçado). _(pages/financas.tsx)_
- ~~**FIN-14** Uma linha por evento, do mais recente, no cartão comum (`../components/tabela.tsx`, BKS-110): capa, nome, "#ID | data", Total do evento, Saldo disponível, Saldo a liberar e "+" (repasse só deste evento, quando tem saldo). Com o cartão abaixo de 704 px, os valores ganham rótulo ao lado; o cabeçalho com a caixa "selecionar todos" continua visível. Paginação do DS acima de 10 eventos; busca ou filtro voltam à página 1 (BKS-114). _(pages/financas.tsx)_~~ Substituída por FIN-57.
- **FIN-57** Uma linha por evento, do mais recente, no cartão comum (`../components/tabela.tsx`, BKS-110): capa, nome, "data, ID 1234" (por exemplo, "19 dez 2026, ID 3390"), Total do evento, Saldo disponível, Saldo a liberar e "+" (repasse só deste evento, quando tem saldo). Com o cartão abaixo de 704 px, os valores ganham rótulo ao lado; o cabeçalho com a caixa "selecionar todos" continua visível. Paginação do DS acima de 10 eventos; busca ou filtro voltam à página 1 (BKS-114). Até 22/11/2026 a linha de apoio era "#ID | data". _(pages/financas.tsx)_
- ~~**FIN-15** Com eventos marcados, a barra flutuante "1 evento selecionado" / "N eventos selecionados" (plural pelas regras do pt-BR, `Intl.PluralRules`), "Limpar seleção" e "Solicitar repasse em massa". Até 22/11/2026 era sempre "N Eventos selecionados", também com 1. _(pages/financas.tsx)_~~ Substituída por FIN-56.
- **FIN-56** Com eventos marcados, a barra "1 evento selecionado" / "N eventos selecionados" (plural pelas regras do pt-BR, `Intl.PluralRules`), "Limpar seleção" e "Solicitar repasse em massa". A barra fica presa ao pé da lista (sticky, 16 px acima da borda da tela), na largura do conteúdo, e entra e sai deslizando em 200 ms (só esmaecendo com movimento reduzido). Até 22/11/2026 flutuava fixa no meio da tela, solta da página (por cima do menu lateral em telas médias), e aparecia sem transição. _(pages/financas.tsx)_
- **FIN-16** Sem eventos: "Esta organização ainda não tem eventos" / "O saldo de cada evento aparece aqui, com o que já pode ser repassado. Crie um evento em Eventos para começar a vender.", com "Ver eventos" (abre `/backstage/eventos`); até 22/11/2026 era "Sem eventos nessa visualização" / "Que tal começar agora?", sem ação. Busca ou filtro sem resultado: "Nenhum evento encontrado para essa busca ou filtro." dentro do cartão, com "Limpar busca", que apaga a busca e os filtros (BKS-118); até 21/11/2026 mostrava o vazio. _(pages/financas.tsx)_

### Suas solicitações
- **FIN-20** Na barra comum: busca por favorecido, solicitante ou data de pagamento à esquerda (placeholder "Buscar favorecido, solicitante ou data") e Período à direita (Últimos 30, 60 ou 90 dias, Todos; pedidos em andamento aparecem sempre). Mais recentes primeiro. Paginação do DS acima de 10; busca ou período voltam à página 1. _(pages/financas.tsx)_
- ~~**FIN-21** Colunas: Favorecido (Pix ou banco; embaixo, "Solicitado por" e o solicitante, "Atendimento Financeiro" quando é a Ingresse), Valor recebido (líquido), Solicitação, Conclusão ("-" se não concluído) e Status: Pago (verde), Pendente e Agendado (azul), Analisando (amarelo), Falhou, Rejeitado e Cancelado (vermelho). Até 21/11/2026 o solicitante era uma coluna e a tabela virava blocos abaixo de 832 px; agora é a linha de apoio, para a tabela caber a partir de 704 px (BKS-115). _(pages/financas.tsx)_~~ Substituída por FIN-58.
- **FIN-58** Colunas: Favorecido (Pix ou banco; embaixo, "Solicitado por" e o solicitante, "Atendimento Financeiro" quando é a Ingresse), Valor líquido (o que chega na conta; antes de pagar ainda não foi recebido), Solicitação, Conclusão ("-" se não concluído) e Status: Pago (verde), Pendente e Agendado (azul), Analisando (amarelo), Falhou, Rejeitado e Cancelado (vermelho). Até 21/11/2026 o solicitante era uma coluna e a tabela virava blocos abaixo de 832 px; agora é a linha de apoio, para a tabela caber a partir de 704 px (BKS-115). Até 22/11/2026 a coluna se chamava "Valor recebido" também nos pedidos não pagos; no avatar do Pix, "PIX" em 10 px virou "Pix" em 12 px. _(pages/financas.tsx)_
- **FIN-22** Menu: "Ver detalhes", "Baixar comprovante" (só pago) e "Cancelar" (só quando dá para cancelar, FIN-27).
- **FIN-23** "Detalhes do repasse": informações (ID, status, motivo, datas, conta), eventos com o valor de cada um e Valores (Subtotal, Taxa de antecipação, Taxa de agendamento, Total).
- **FIN-27** Cancela quem ainda não foi agendado no banco nem concluído, e cujo pagamento não é hoje. Confirma ("Cancelar solicitação de repasse") e o valor volta ao saldo.
- **FIN-28** Vazio (nenhum repasse pedido): "Você ainda não solicitou nenhum repasse". Com saldo: "Você já tem saldo para repassar. Os repasses pedidos aparecem aqui, com o status de cada um." e "Novo repasse" (abre o assistente). Sem saldo: "Ainda não há saldo disponível para repasse. Veja quanto cada evento vai liberar em Seu saldo por evento." e "Ver saldo por evento" (troca de aba). Até 22/11/2026 era "Que tal começar agora?", sem ação. Busca ou período sem resultado: "Nenhum repasse encontrado para essa busca ou período." no cartão, com "Limpar busca", que apaga a busca e passa o período para Todos (BKS-118). _(pages/financas.tsx)_
- **FIN-46** Dicas "i" (Você pode repassar até, Disponível, Saldo a liberar, Repasses agendados, Repassado): botão utilitário do DS com nome próprio ("Sobre o valor que você pode repassar", "Sobre o saldo disponível", "Sobre o saldo a liberar", "Sobre os repasses agendados", "Sobre o valor já repassado"), alvo de 28 × 28 px e foco visível. A explicação abre num popover ao tocar, clicar ou apertar Enter/Espaço, e fecha com Esc ou tocando fora. Até 22/11/2026 eram ícones de 16 px sem nome, com a explicação só num tooltip de mouse (não abria no toque). _(pages/financas.tsx)_
- **FIN-45** Carregando: o título "Finanças" já aparece, com os cartões e as linhas pulsando (BKS-116). No celular, "Novo repasse" fica abaixo do valor "Você pode repassar até" (antes ficava ao lado e saía 51 px da tela). _(pages/financas.tsx)_

### Repasse de saldo (assistente)
- **FIN-30** Ocupa o lugar do painel: voltar, "Repasse de saldo" e os passos 1 Conta favorecida, 2 Valor do repasse, 3 Revisão. _(components/assistente-de-repasse.tsx)_
- **FIN-31** Passo 1, "Quem vai receber o repasse?": busca "Buscar contas...", "Nova conta" (+), "Conta padrão do contrato" e "Outras contas" (com o aviso da taxa adicional de 0,50%). Outras contas têm "Remover conta" (confirma; sai da lista).
- **FIN-33** "Adicionar nova conta": Pix (chave) ou Conta Corrente/Poupança (nome, documento, instituição, agência de 1 a 4 dígitos e conta com dígito). A conta nova já fica escolhida.
- ~~**FIN-35** Passo 2, "Quanto e como você vai repassar?": por evento com saldo, Disponível, A antecipar e o valor (até o total do evento), com "Máximo disponível" e "Máximo total". "Avançar" só com valor maior que zero. Aviso: as taxas de antecipação e agendamento podem descontar do valor.~~ Substituída por FIN-54.
- ~~**FIN-40** Passo 3: as modalidades, na ordem turbo, express, basic, com data e taxa. Turbo foi descontinuado (apagado). Express: próximo dia útil (dois depois do meio-dia), R$ 12; some se o valor não cobre a taxa. Basic: grátis, na quinta-feira seguinte a hoje + 2 dias (+3 depois do meio-dia). A primeira disponível entre basic e express já vem escolhida. Outras contas somam 0,50% do valor em cada modalidade.~~ Substituída por FIN-47.
- **FIN-41** Antecipação: o que passa do disponível de cada evento paga 1,9%.
- **FIN-42** Taxas: "Descontar do repasse" (padrão; chega menos) ou "Descontar do saldo do evento" (chega o valor pedido; só quando o saldo cobre). Descrição (140) e ID de controle (20) opcionais.
- ~~**FIN-43** Resumo: líquido enviado, composição (bruto, creditado, antecipação, TED) e a conta. "Transferir" só com modalidade.~~ Substituída por FIN-59.
- **FIN-44** "Confirmação do repasse": canal (WhatsApp ou SMS), "Enviar código" e o código de 6 dígitos. Sem SMS de verdade, o protótipo mostra o código na tela. Confirmado, o repasse entra "Analisando" e aparece "Tudo certo!" com "Fechar" e "Pedir novo repasse".
- **FIN-47** Passo 3, "Quando o repasse deve chegar?": duas opções, em cartões de rádio. "No próximo dia útil" (dois depois do meio-dia), com a data e "Taxa de R$ 12,00."; fica indisponível, a 50% e com o motivo de produção, se o valor não cobre a taxa ou a data é a mesma da outra opção. "Na quinta-feira" (a quinta seguinte a hoje + 2 dias, +3 depois do meio-dia), com a data e "Sem taxa.". A primeira disponível entre quinta-feira e próximo dia útil já vem escolhida. Outras contas somam 0,50% do valor em cada opção. Datas no formato da página: "Hoje, 22 nov 2026", "Amanhã, 23 nov 2026" ou "26 nov 2026". Até 22/11/2026 apareciam os nomes internos ("turbo", "express", "basic") num selo, a opção descontinuada do mesmo dia ("Hoje… Taxa de R$ 517,98", apagada) e a data por extenso. _(components/assistente-de-repasse.tsx, data/financas.ts)_
- **FIN-49** O passo fica no endereço: `/backstage/financas?passo=1`, `2` ou `3`. Abrir o assistente e avançar empilham uma entrada no histórico; o voltar do navegador recua um passo sem perder o que foi escolhido, e no passo 1 volta para Finanças. "Voltar" na tela também recua um passo. Sair (seta "Finanças", "Cancelar", "Fechar") volta para a entrada de Finanças de onde o assistente abriu. Endereço com um passo que ainda não tem o que precisa (recarregou, avançou pelo navegador) volta para o passo que falta: sem conta, passo 1; sem valor, passo 2. Os eventos do repasse em massa vão no estado da entrada do histórico. Até 22/11/2026 o assistente não tinha endereço e o voltar do navegador saía de Finanças, perdendo o repasse. _(pages/financas.tsx, components/assistente-de-repasse.tsx)_
- **FIN-50** Proteção ao sair: com o repasse começado (passou do passo 1, digitou valor ou trocou a conta que veio escolhida), sair pela seta ou por "Cancelar" pergunta "Sair do repasse?" ("A conta e os valores que você escolheu não ficam salvos.", "Continuar repasse" / "Sair do repasse"), e recarregar ou fechar a aba mostra o aviso do navegador. Em "Adicionar nova conta", com algo digitado, clicar fora não fecha e Esc, X ou Cancelar perguntam "Descartar a conta?". _(components/assistente-de-repasse.tsx)_
- **FIN-51** Com uma conta só, ela já vem escolhida no passo 1. _(components/assistente-de-repasse.tsx)_
- **FIN-52** Os passos aparecem no indicador do DS (`Progress.TextWithLine`: uma barra por passo, a do atual e as dos concluídos acesas); o passo atual é anunciado ao leitor de tela ("Passo 2 de 3: Valor do repasse"). Cada passo entra com um leve deslize de 180 ms (direto com movimento reduzido). Até 22/11/2026 eram pílulas montadas à mão. _(components/assistente-de-repasse.tsx)_
- **FIN-53** Escolhas do assistente são grupos de rádio de verdade (`radiogroup`, setas do teclado): a conta no passo 1 (o cartão inteiro escolhe; "Remover conta" fica ao lado, fora do rádio) e, no passo 3, a data (FIN-47) e "De onde saem as taxas?" ("Descontar do repasse": "Chega na conta o valor pedido menos as taxas."; "Descontar do saldo do evento": "Chega na conta o valor pedido; as taxas saem do saldo do evento.", indisponível a 50% com "Saldo insuficiente para cobrir os custos nesta modalidade." quando o saldo não cobre), com os cartões de rádio do DS. Até 22/11/2026 eram botões com `aria-pressed`. _(components/assistente-de-repasse.tsx)_
- **FIN-54** Passo 2, "Quanto você vai repassar?": busca "Buscar eventos..." e "Máximo em todos" acima da tabela (cartão comum, BKS-110); por evento com saldo, Disponível, A antecipar e o valor (até o total do evento), com "Máximo" ao lado do campo ("Máximo disponível, sem taxa" ou "Máximo total, com antecipação", cada um com o valor). O campo tem largura para o valor inteiro (no desktop, 288 px para campo e botão). No rodapé, "Você pode repassar até R$ X" e "Total do repasse". "Avançar" só com valor maior que zero. Aviso: as taxas de antecipação e agendamento podem descontar do valor. Até 22/11/2026 o máximo era um select "máx" que deixava 64 px para o campo e cortava o número. _(components/assistente-de-repasse.tsx)_
- **FIN-59** Resumo do passo 3: o valor que chega ("Chega na conta de <titular>"), a composição (Valor bruto do repasse, Taxa de antecipação, Taxa de agendamento, Valor creditado ao favorecido; taxas com "-") e a conta (Nome, "Chave Pix" ou agência, conta e instituição, Tipo: "Pix", "Conta corrente" ou "Conta poupança"). "Transferir" só com data escolhida. Até 22/11/2026 a taxa se chamava "Taxa de transferência (TED)", também num repasse Pix, e "PIX" vinha em maiúsculas. _(components/assistente-de-repasse.tsx)_

## Depende de / afeta

- **Depende de:** faturamento dos eventos da organização.
- **Afeta:** nada fora daqui; em produção, o financeiro da Ingresse analisa e paga.

## Em aberto

- Os filtros de Seu saldo por evento viraram dois selects (FIN-55), não botões segmentados (BKS-111): são duas dimensões (data e saldo), que não cabem num só grupo segmentado. Confirmar se o padrão aceita select para filtro exclusivo.
- Voltar do navegador no passo 1 e os links do menu lateral saem do assistente sem perguntar (o app usa `BrowserRouter`, sem `useBlocker`); só a seta, "Cancelar", recarregar e fechar a aba perguntam (FIN-50).
- Quando o endereço volta sozinho para um passo anterior (FIN-49), a entrada do histórico é trocada, não removida: o voltar do navegador pode passar uma vez pelo mesmo passo.
- "Repasses em andamento" (FIN-48) diverge do nome de produção ("Repasses agendados"). Os nomes dos status (Pago, Pendente, Agendado, Analisando, Falhou, Rejeitado, Cancelado) seguem os de produção; vocabulário fixo é decisão de produto (T10).
- "Solicitar repasse em massa" fica desabilitado sem dizer por quê quando nenhum evento marcado tem saldo.
- O passo 2 usa `CampoPreco` de `itens/components/comuns.tsx`, outro projeto do Backstage (o CLAUDE.md proíbe import entre projetos irmãos). Mover para `backstage/components/`.
- O motivo da opção indisponível no passo 3 é o texto de produção ("Opção indisponível. O valor informado…"); reescrever começando pelo que fazer depende de decisão sobre textos de produção.
- "Limpar busca" em Suas solicitações passa o período para Todos, não para o padrão de 30 dias, porque o padrão pode continuar sem resultado.
- Em produção a página vem de outro app (cashout) num iframe, com acesso por permissão (`finance.balances`, `finance.transfer`, `finance.transfer_default_account`, `finance.payee_accounts`) e só para quem tem telefone +55. O protótipo mostra tudo para todo mundo.
- O saldo é uma aproximação (90% do faturamento, 55% liberado antes do evento); em produção vem dos recebíveis e do plano de repasse do contrato (D+N).
- O comprovante sai em texto (em produção, PDF), não há tour guiado nem o aviso "Mudanças nos repasses", e a chave Pix não é consultada (o titular não vem do banco).
- Feriados não entram no cálculo das datas.

## Fontes

- Levantamento do app de repasses de produção (GitHub `ingresse/cashout`, só leitura), `pesquisas/gemeo-backstage/financas-cashout.md`.
