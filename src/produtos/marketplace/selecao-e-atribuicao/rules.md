# Seleção e atribuição (link de compra): regras

> **Rotas:** `/comprar/:eventoId`, `/e/:slug`
> **No menu:** botão de compra do site, link copiado no Backstage
> **Versão em uso:** `pages/SelecaoEAtribuicao.tsx`
> **Revisado em:** 2026-11-22

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

A tela em que o comprador escolhe os ingressos de um evento do banco e segue para o pagamento.
Este arquivo começa pelo que vem das funcionalidades do Backstage; as regras do Decreto 13.108
estão em `DECRETO-13108.md`.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Evento, catálogo, cupons, pixels e lista de espera | `@/plataforma` (`Evento`) | sim: pedido e lista de espera |
| Etiquetas e termo de uso padrão | `@/plataforma` (`Organizacao` do evento) | não |
| Passkeys e o que cada uma libera | `@/plataforma` (`Evento.passkeys`; `chaves` e `vendas.publico` do ingresso e `chaves` do lote) | uso: `usos` da Passkey, quando o pedido é pago (SEL-07) |
| Códigos de comissário e de vendedor | `@/plataforma/comissarios` (`lerEstadoComissarios`, grupos da equipe do evento) | no pedido (`Pedido.comissario`, SEL-08) |

## Regras

### O que vem do Backstage
- **SEL-01** Cada ingresso vende o lote à venda; num conjunto de lotes sincronizados, o lote da vez do conjunto (LSI-31). _(data/plataforma.ts)_
- **SEL-02** As etiquetas vinculadas ao grupo ou ao lote à venda aparecem ao lado do nome do ingresso (ETQ-50).
- **SEL-03** O termo de uso padrão e ativo da organização abre antes da compra; sem ele, não abre (TDU-40).
- **SEL-04** "Adicionar código ou cupom" aceita os cupons do evento, com o motivo quando não vale; o desconto vai no pedido (CUP-50 a CUP-52). Também aceita Passkey (SEL-07) e código de comissário (SEL-08), nessa ordem depois do cupom; o botão continua depois de aplicar um código, para somar outro. _(pages/SelecaoEAtribuicao.tsx, components/CupomModal.tsx)_
- **SEL-05** Os pixels configurados aparecem no console ao abrir a página (PIX-50).
- **SEL-07** Passkeys (CHA): ingresso com Passkey (`chaves`) ou "só com Passkey" (`vendas.publico`) some do link até o comprador informar uma chave dele em "Adicionar código ou cupom" (sem diferenciar maiúsculas) ou chegar pelo link `?passkey=` (CHA-31); lote com Passkey só entra para quem tem a chave dele, e o ingresso cujos lotes são todos trancados some. O que a chave liberou leva o selo "Liberado pela Passkey". Passkey desativada: "Esta Passkey está desativada. Confira o código com quem enviou."; sem uso sobrando: "Esta Passkey já foi usada o máximo de vezes permitido." A chave aplicada aparece como chip, com "x" para tirar (o que ela liberou sai do carrinho). O pedido guarda as Passkeys que liberaram itens dele (`Pedido.passkeys`) e, quando é pago, cada uma soma um uso no evento, uma vez por pedido. _(data/plataforma.ts `conferirPasskey`, `loteNoLink`, `passkeysDoItem`; pages/SelecaoEAtribuicao.tsx; `@/plataforma` `contarUsosDasPasskeys`)_
- **SEL-08** Código de comissário: o código digitado em "Adicionar código ou cupom" que não é cupom nem Passkey e bate com o código de um grupo-comissário ativo do evento (o do responsável) ou de um vendedor dele vai para o pedido na criação (`Pedido.comissario`: grupo, comissário, código e quem vendeu). Aparece como chip "Código de quem indicou". Não dá desconto. _(data/plataforma.ts `comissarioDoCodigo`, pages/SelecaoEAtribuicao.tsx)_
- **SEL-09** Link de convite da lista de espera, `/e/<slug>/lista-de-espera` (LES-03, LES-22): página própria com o formulário da lista e origem `convite`; funciona antes da venda abrir e fecha quando o produtor desliga o convite ou o evento encerra. _(pages/convite-lista-de-espera.tsx)_
- ~~**SEL-10** Prévia da página do evento (Backstage › Página do evento), num iframe com `?previa=1&estado=…`.~~ Removida em 22/11/2026, junto com a Página do evento.
- **SEL-06** Com todos os ingressos esgotados e a lista de espera ligada para "Quando esgotar" (LES-02), aparece "Ingressos esgotados" com "Entrar na lista de espera": nome (3 letras ou mais), e-mail e celular. Registra uma vez por e-mail, com a origem `esgotado`, e não reserva ingresso; aparece no relatório Lista de usuários (LUS-08). Com a lista desligada (o padrão), esgotado mostra só o aviso de esgotado. _(components/lista-de-espera.tsx)_

## Depende de / afeta

- **Depende de:** catálogo, cupons, etiquetas, termos, pixels, conjuntos e Passkeys do Backstage; grupos da equipe (comissários).
- **Afeta:** pedidos (checkout, com Passkeys e comissário), uso das Passkeys, a lista de espera do evento.

## Em aberto

- Produtos e combos do evento ainda não aparecem no link (`produtos: []`, sem combos), então cupom e etiqueta de combo ou produto não têm efeito aqui.
- O ingresso limitado a segmentações não confere o documento de quem compra.
- Ingresso esgotado num conjunto mostra o nome do último lote, não o da vez.
- O uso da Passkey conta no pagamento, não na criação do pedido: duas compras abertas ao mesmo tempo podem passar do limite. A contagem roda a cada mudança do banco em qualquer aba aberta (o checkout não conhece Passkey); no banco compartilhado, duas abas podem contar o mesmo pedido antes de ele ficar marcado.
- Passkey de produto e de combo não tem efeito aqui: o link ainda não vende produto nem combo.
- O link de Passkey (`?passkey=`) com chave desativada ou esgotada não avisa: só não libera.
- O código de comissário vem do estado de `@/plataforma/comissarios` (no navegador, até ir para o banco); se o código for trocado depois, o pedido guarda o antigo.
