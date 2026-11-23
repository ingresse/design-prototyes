# Pedido de vagas para grupos: regras

> **Rotas:** `/grupos/:slug`
> **No menu:** link copiado em Backstage › Compras em grupo
> **Versão em uso:** única (`pedido-de-grupo/`)
> **Revisado em:** 2026-11-21

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

O lado do gestor das Compras em grupo (backstage/compras-em-grupo/rules.md): quem gerencia uma
assessoria, escola ou empresa pede vagas para o evento, e o pedido cai na fila do Backstage.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Evento, módulo e solicitações | `@/plataforma` (`Evento.comprasEmGrupo`) | sim: `pedirVagasDeGrupo` |
| Quem está pedindo | `@/plataforma` (sessão do comprador) | sim, no navegador |

## Regras

- **PDG-01** Cabeçalho com a capa, o nome do evento e "Período para solicitar suas vagas: de … até …". _(pages/pedido-de-grupo.tsx)_
- **PDG-02** Estados, nesta ordem: evento não encontrado; "Solicitações indisponíveis" (módulo não publicado); "Inscrições pausadas" (desabilitado); "As solicitações abrem em …" (antes do início); "Vagas encerradas" (depois do fim).
- **PDG-03** Sem conta: "Para solicitar vagas para este evento, você precisa acessar ou criar sua conta." Em produção é o login da Ingresse; aqui, nome e e-mail bastam ("Acesse sua conta").
- **PDG-04** Formulário "Vagas para compras em grupo": Tipo de grupo (Assessoria esportiva, Amigos e familiares, Grupo corporativo ou do trabalho, Equipe de corrida, Grupo escolar ou faculdade, Outros), "Como você descreveria seu grupo?" (só em Outros, até 120), Nome do grupo (até 120), Quantidade de vagas ("Você pode solicitar entre X e Y vagas") e CNPJ opcional. "Solicitar vagas".
- **PDG-05** Validações: tipo, nome e quantidade obrigatórios; quantidade entre o mínimo e o máximo do módulo ("Você deve solicitar no mínimo X vagas" / "…no máximo Y vagas"); CNPJ com dígitos verificadores certos ("Informe um CNPJ válido ou deixe em branco").
- **PDG-06** Enviado, o pedido entra na fila do Backstage como Pendente (CEG-70) e a tela mostra "Solicitação enviada". Com um pedido pendente, o mesmo e-mail vê esse aviso em vez do formulário ("Você já tem uma solicitação para este evento.").

## Depende de / afeta

- **Depende de:** o módulo publicado em Compras em grupo.
- **Afeta:** a fila de Compras em grupo do Backstage.

## Em aberto

- Depois da aprovação, a área do gestor para montar o grupo e gerar pedidos e links de pagamento não existe no protótipo.

## Fontes

- Levantamento do Backstage de produção (awa-group-registration-web, só leitura), `pesquisas/gemeo-backstage/estrategias-de-venda.md`, seção 2.
