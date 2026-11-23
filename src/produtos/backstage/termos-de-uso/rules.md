# Termos de uso: regras

> **Rotas:** `/backstage/ajustes/termos-de-uso`
> **No menu:** Backstage › menu da organização › Ajustes › Termos de uso
> **Versão em uso:** única (`termos-de-uso/`)
> **Revisado em:** 2026-11-22 (vazio com ação, tabela comum, confirmação ao desligar o padrão, Desfazer, proteção do modal)

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

Gêmeo de `settings/terms-of-use` do Backstage de produção. A organização cria os termos de uso que
o comprador aceita, ativa ou desativa cada um e escolhe o padrão, associado aos eventos novos.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Termos de uso | `@/plataforma` (`Organizacao.termosDeUso`) | sim, no banco |

## Regras

### Lista
- ~~**TDU-01** "Ajustes" para voltar, título "Termos de uso" e "Novo termo de uso" à direita. Em Ajustes, a linha "Termos de uso" tem "Gerenciar", que abre esta página. _(pages/termos-de-uso.tsx, organizacoes/pages/ajustes.tsx)_~~ Substituída por TDU-43.
- ~~**TDU-02** Colunas: Status (toggle), Nome (com o selo "Termo padrão" quando for) e o menu com "Visualizar". Sem busca nem filtro, como em produção.~~ Substituída por TDU-44.
- ~~**TDU-03** O toggle ativa ou desativa na hora: "Termo de uso ativado com sucesso!" / "Termo de uso desativado com sucesso!"; erro "Erro ao atualizar status do termo de uso".~~ Substituída por TDU-42.
- ~~**TDU-04** Vazio: "Nenhum termo de uso cadastrado" / "Crie seu primeiro termo de uso para começar.".~~ Substituída por TDU-43.
- **TDU-41** Desligar o termo padrão (ativo) pergunta antes, dizendo o efeito na compra (TDU-40): "Desativar o termo padrão?" / "Sem um termo padrão ativo, o link de compra dos seus eventos deixa de pedir o aceite dos termos. O termo continua salvo e pode ser ativado de novo.", com "Voltar" e "Desativar termo". Os outros termos ligam e desligam direto. Até 22/11/2026 desligar o padrão gravava na hora, sem aviso. _(pages/termos-de-uso.tsx)_
- **TDU-42** O toggle grava na hora: "Termo de uso ativado com sucesso!" / "Termo de uso desativado com sucesso!", com "Desfazer" no aviso (volta a lista como estava); erro "Erro ao atualizar status do termo de uso". _(pages/termos-de-uso.tsx)_
- **TDU-43** "Ajustes" para voltar e o título "Termos de uso"; com termos, "Novo termo de uso" à direita. Em Ajustes, a linha "Termos de uso" tem "Gerenciar", que abre esta página. Vazio: o estado vazio do DS (BKS-117), "Nenhum termo de uso cadastrado" / "Crie seu primeiro termo de uso para começar.", com "Novo termo de uso" no próprio vazio (o botão do topo não aparece, para não repetir a ação). Até 22/11/2026 o vazio não tinha ação. _(pages/termos-de-uso.tsx, organizacoes/pages/ajustes.tsx)_
- **TDU-44** Lista no cartão comum (BKS-110): colunas "Termo" (nome, com o selo "Termo padrão" quando for) e "Ativo na compra" (toggle) e o menu com "Visualizar". A linha inteira abre o termo (o nome é o botão); toggle e menu ficam por cima. Abaixo de 704 px de cartão, o toggle leva "Ativo"/"Inativo" ao lado. Sem busca nem filtro, como em produção. Até 22/11/2026 era uma tabela montada à mão, com a coluna "Status" e o detalhe só pelo ⋮. _(pages/termos-de-uso.tsx)_
- **TDU-45** Novo termo com algo preenchido (nome, texto ou padrão ligado): clicar fora não fecha; Esc, X e "Cancelar" perguntam "Descartar o novo termo?" ("O nome e o texto que você escreveu não ficam salvos.", "Continuar editando" / "Descartar"). Vazio, fecha direto. Visualizar fecha direto. _(pages/termos-de-uso.tsx)_
- **TDU-46** O modal não rola de lado no celular: a dica de "Tornar termo de uso padrão" quebra linha na largura do modal (o Toggle do DS é `w-max`; aqui recebe `w-full`). Até 22/11/2026 a dica esticava o conteúdo até 890 px. _(pages/termos-de-uso.tsx)_

### Novo termo
- **TDU-10** Modal "Novo termo de uso" ("Preencha as informações do novo termo de uso."): nome (placeholder "Dê um nome para o termo de uso", dica "Este nome será visto pelo comprador."), texto em editor rico com contador "N/5.000" e "Tornar termo de uso padrão" (com a explicação de produção), desligado de início.
- **TDU-11** "Salvar novo termo" grava o termo ativo e mostra "Termo de uso criado com sucesso!". Marcado como padrão, ele substitui o padrão anterior (só um por organização).

### Visualizar
- **TDU-20** "Visualizar" abre o mesmo formulário só para leitura (nome desabilitado, texto como o comprador vê). O toggle de padrão só liga, e só se o termo ainda não for o padrão: "Termo definido como padrão com sucesso!". Não há editar nem excluir, como em produção.

### Na compra (desde 21/11/2026)
- **TDU-40** No link de compra, o termo padrão e ativo da organização do evento abre antes da compra ("Li e aceito os termos e condições"), em texto corrido. Sem termo padrão ativo, não abre. _(marketplace/selecao-e-atribuicao/data/plataforma.ts)_

### Validações
- **TDU-30** Nome obrigatório ("Nome é obrigatório"); texto obrigatório ("Conteúdo é obrigatório"), até 5.000 caracteres de texto ("Descrição deve ter no máximo 5000 caracteres"). Valida ao salvar.

## Depende de / afeta

- **Afeta:** o link de compra (TDU-40).

## Em aberto

- Textos de erro e sucesso vindos de produção (TDU-30, TDU-42): "Nome é obrigatório", "Conteúdo é obrigatório" (o rótulo do campo é "Texto do termo"), "… com sucesso!" e "Erro ao atualizar status do termo de uso" não seguem o guia (erro começa pelo que fazer, sem "com sucesso!"). Trocar depende de decidir se o gêmeo mantém os textos de produção.
- No celular, a barra de formatação do editor rico (`components/descricao-rica.tsx`, compartilhado) é cortada à direita dentro do modal (ícones depois da lista somem). Corrigir no componente comum.

- A criação de evento não associa o termo ao evento: o link de compra usa sempre o padrão ativo da organização.
- Em produção, "Salvar novo termo" fica desabilitado até o formulário ser válido e o sucesso aparece numa barra flutuante; aqui o botão valida ao clicar e o sucesso é um toast, como no resto do protótipo.

## Fontes

- Levantamento do Backstage de produção (awa-workspace, só leitura), `pesquisas/gemeo-backstage/organizacao.md`, seção 2.2.
