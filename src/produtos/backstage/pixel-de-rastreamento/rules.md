# Pixel de rastreamento: regras

> **Rotas:** `/backstage/marketing/pixel`
> **No menu:** Backstage › menu do evento › Divulgação › aba Pixel de rastreamento (BKS-120)
> **Versão em uso:** única (`pixel-de-rastreamento/`)
> **Revisado em:** 2026-11-23

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

Gêmeo da tela `tracking` do Backstage de produção. A produtora cola o ID dos pixels de Meta,
TikTok, X e Google Ads do evento, que são carregados na página de compra.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Pixels do evento | `@/plataforma` (`Evento.rastreamento`) | sim, no banco |
| Plataformas, textos e links de instrução | `data/plataformas.ts` | não |

## Regras

### Comportamento
- **PIX-01** Uma tela só, num cartão com uma linha por plataforma, nesta ordem: Meta Pixel, TikTok Pixel, X Pixel "(Antigo Twitter)" e Google Ads. Desde 22/11/2026 é a aba Pixel de rastreamento da página Divulgação (BKS-120): o título da tela fica só para leitor de tela e o subtítulo saiu; até então, título "Pixel de rastreamento", subtítulo e "Divulgação" para voltar à central. _(pages/pixel-de-rastreamento.tsx)_
- **PIX-02** ~~Meta, TikTok e X têm um campo ("Adicione o ID aqui"); Google Ads tem dois, ID de conversão ("AW-123456789") e Rótulo de conversão ("AbCdEfGhIjKlmNoPqr"). Os nomes dos campos ficam para leitor de tela.~~ Substituída por PIX-10 em 23/11/2026 (rótulo só para leitor de tela falhava no WCAG 3.3.2).
- **PIX-10** Cada campo tem rótulo visível acima: "ID do pixel" (Meta, TikTok e X, com um exemplo do formato no texto de exemplo); no Google Ads, "ID de conversão" ("AW-123456789") e "Rótulo de conversão" ("AbCdEfGhIjKlmNoPqr"). _(data/plataformas.ts, pages/pixel-de-rastreamento.tsx)_
- **PIX-03** Cada linha tem a marca da plataforma em uma cor só, o nome e "Instruções". No celular, "Instruções" vira o ícone de informação ao lado do nome. _(components/marcas.tsx)_
- **PIX-04** "Instruções" abre um modal com o que é o pixel e os links oficiais ("Como funciona?", "Como instalar?"; no X, "Veja como funciona e como instalar"), abertos em outra aba. _(components/modal-de-instrucoes.tsx)_
- **PIX-05** "Salvar" aparece só enquanto a linha tem alteração não salva, esmaecendo (200 ms; com movimento reduzido, 120 ms). No desktop o lugar das ações (Salvar e lixeira) fica reservado ao lado do campo, alinhado a ele e não ao rótulo: o campo não encolhe quando o Salvar aparece (até 23/11/2026 encolhia de 644 para 546 px). Google Ads salva os dois campos juntos. Toast "Pixel salvo com sucesso."; erro "Não foi possível salvar o pixel. Tente novamente.".
- **PIX-06** Salvar ou excluir uma linha não mexe nas outras (EVT-049 de produção).
- **PIX-07** A lixeira ("Excluir ID") aparece só com ID salvo, neutra; fica vermelha só no hover e no foco. Abre "Excluir o ID do <plataforma>?" / "A página de compra para de enviar eventos para essa plataforma." com "Cancelar" e "Sim, excluir" (até 23/11/2026, "Excluir ID de rastreamento" / "Tem certeza que deseja excluir este ID?" e a lixeira sempre vermelha); enquanto exclui, o modal não fecha. Toast "ID removido com sucesso.".
- **PIX-09** O que foi digitado e não salvo fica num rascunho na sessão do navegador, por evento: trocar para a aba Lista de espera e voltar, ou recarregar, mantém o ID e o "Salvar" (até 23/11/2026 trocar de aba apagava sem aviso). Fechar a aba ou sair do site com ID não salvo pergunta antes (`beforeunload`). Salvar ou voltar ao valor salvo limpa o rascunho da linha. _(pages/pixel-de-rastreamento.tsx)_
- **PIX-08** GA4 existe no modelo (`ga4`) e não tem linha, como em produção.

### Na compra (desde 21/11/2026)
- **PIX-50** Ao abrir o link de compra, os pixels configurados aparecem no console ("[pixel] Página de compra de …: Meta …, TikTok …"), no lugar de carregar os scripts das plataformas. _(marketplace/selecao-e-atribuicao/pages/SelecaoEAtribuicao.tsx)_

### Validações
- **PIX-20** O ID é gravado sem espaços nas pontas e tem no máximo 120 caracteres: "Use até 120 caracteres no ID." (ação primeiro, UI-TXT-005; até 23/11/2026, "O ID deve ter no máximo 120 caracteres.").
- **PIX-21** IDs não aceitam espaço no meio: "Tire os espaços do ID." (até 23/11/2026, "O ID não pode conter espaços."). O rótulo de conversão aceita. Vazio vale; não há formato por plataforma. Com erro, "Salvar" fica desabilitado.

### Estados
- **PIX-40** Carregando: quatro linhas pulsando no lugar do cartão.

## Depende de / afeta

- **Depende de:** evento em contexto.
- **Afeta:** o link de compra (PIX-50).

## Em aberto

- Sem scripts de terceiros no protótipo: os pixels só aparecem no console da página de compra (PIX-50).
- Erro de carregamento ("Não foi possível carregar as configurações de pixel.") não acontece no banco local e não foi desenhado.

## Fontes

- Levantamento do Backstage de produção (awa-workspace, só leitura), `pesquisas/gemeo-backstage/marketing.md`, seção 3.
