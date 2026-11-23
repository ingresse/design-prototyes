# Lista de espera: regras

> **Rotas:** `/backstage/marketing/lista-de-espera` (Backstage) e `/e/:slug/lista-de-espera` (convite, comprador)
> **No menu:** Backstage › menu do evento › Divulgação › aba Lista de espera, a primeira (BKS-120)
> **Versão em uso:** única (`lista-de-espera/`)
> **Revisado em:** 2026-11-23

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

O produtor escolhe, por evento, por onde o público entra na lista de espera: pelo botão do link de
compra quando tudo esgota e por um link de convite que ele divulga, inclusive antes da venda abrir.
Quem entra aparece no relatório Lista de usuários. Funcionalidade nova do protótipo (21/11/2026): o
Backstage de produção não tem essa configuração; lá a lista aparece sempre que esgota e o convite
(MKT-951, `awa-purchase-ui`) não tem liga e desliga.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Evento em contexto | `@/plataforma` (`useCatalogo` → `useEventoAtual`) | não |
| Configuração | `Evento.configuracaoDaListaDeEspera` (`aoEsgotar`, `convite`, `atualizadoEm`) | sim, pelo Backstage |
| Inscrições | `Evento.listaDeEspera`, com `origem` (`esgotado` ou `convite`) | sim, pelo link de compra e pelo convite |

## Regras

### Comportamento
- **LES-01** Duas entradas independentes, cada uma com um interruptor do DS: "Quando esgotar" e "Link de convite". Cada interruptor grava na hora e confirma com um aviso ("Lista de espera ligada para quando esgotar.", "Link de convite desligado: a página avisa que a lista está fechada."); não há botão Salvar. Enquanto grava, o segundo clique no mesmo interruptor é ignorado, sem esmaecer (até 22/11/2026 a regra dizia "fica travado", o que o código nunca fez). _(pages/lista-de-espera.tsx, `configurarListaDeEspera` em @/plataforma/acoes.ts)_
- **LES-02** As duas entradas começam desligadas: evento sem configuração não recebe inscrições, nem quando esgota. Com "Quando esgotar" ligado, o link de compra com todos os ingressos esgotados mostra "Entrar na lista de espera" (SEL-06). _(`listaDeEsperaAberta` em @/plataforma/acoes.ts)_
- **LES-03** Com "Link de convite" ligado, a tela mostra o link (`/e/<slug>/lista-de-espera`) num campo só leitura com "Copiar" (vira "Copiado" por 2 s). A página do convite mostra capa, nome, data e local do evento, "Quer viver essa experiência de perto?", o formulário (nome, e-mail, celular) e "Como funciona?": o interesse fica registrado com a organização, não há mensagens sobre a lista e não há ingresso garantido. Depois de enviar: "Você está na lista!" (ou "Você já está na lista") e, se o evento vende no link, "Ver ingressos". _(src/produtos/marketplace/selecao-e-atribuicao/pages/convite-lista-de-espera.tsx)_
- **LES-04** Cada inscrição grava por onde a pessoa entrou (`origem`: `esgotado` ou `convite`). Um e-mail entra uma vez por evento, qualquer que seja a entrada. _(@/plataforma/acoes.ts `entrarNaListaDeEspera`)_
- **LES-05** Entrada desligada recusa a inscrição mesmo com a página aberta, e a tela vai para o estado fechado em vez de deixar o formulário parado: o convite mostra "Esta lista não está recebendo inscrições" (LES-22); no link de compra, o modal fecha e o botão some. Falha de envio: "Tente de novo. Não conseguimos registrar sua inscrição, e o que você preencheu continua aqui." (ação primeiro, UI-TXT-005), sem limpar o formulário. _(@/plataforma/acoes.ts, components/lista-de-espera.tsx, pages/convite-lista-de-espera.tsx)_
- **LES-06** A tela mostra o total de pessoas na lista do evento, o mesmo do relatório Lista de usuários (reais e, no protótipo, as simuladas), com "Ver inscritos", que abre o relatório com o "voltar para o evento". _(pages/lista-de-espera.tsx)_
- **LES-07** O aviso "Entrar na lista não garante nem reserva ingresso" aparece na configuração, para o produtor saber o que o público lê.
- **LES-08** Movimento (UI-VIS-008): o link de convite entra e sai abrindo e fechando a altura em 200 ms (saída em 160 ms), e as linhas de baixo deslizam; na página de convite, o cartão acompanha a altura do formulário, do erro e da confirmação, e o erro entra abrindo a altura. Com movimento reduzido, só esmaece. _(pages/lista-de-espera.tsx, pages/convite-lista-de-espera.tsx, components/lista-de-espera.tsx)_
- **LES-09** Copiar o link anuncia "Link de convite copiado." para leitor de tela, numa região `aria-live`, além de trocar o botão para "Copiado". _(pages/lista-de-espera.tsx)_
- **LES-10** Página de convite: o título ("Quer viver essa experiência de perto?", ou a confirmação) usa o degrau de título (Display xs, negrito), acima do nome do evento (Text md Semibold); "Como funciona?" é um subgrupo separado por linha dentro do mesmo cartão, sem caixa própria (UI-VIS-018, UI-VIS-019). _(pages/convite-lista-de-espera.tsx)_
- **LES-12** O texto de apoio dos interruptores quebra linha dentro do cartão (o rótulo do Toggle do DS limitado à largura do cartão, `max-w-full`); até 22/11/2026, em 390 px, ele saía cortado. _(pages/lista-de-espera.tsx)_
- **LES-11** Desde 22/11/2026, a tela é a aba Lista de espera da página Divulgação (BKS-120): o título "Lista de espera" fica só para leitor de tela e o subtítulo saiu. _(pages/lista-de-espera.tsx)_

### Estados
- **LES-20** Carregando: três linhas pulsando no lugar do cartão, com o cabeçalho já visível.
- **LES-21** Evento encerrado: os dois interruptores travados, com "O evento foi encerrado: a lista não recebe mais inscrições."; o link de convite some e a página do convite diz que a lista está fechada.
- **LES-22** Convite desligado ou evento encerrado: a página do convite mostra "Esta lista não está recebendo inscrições" e, se o evento vende no link, "Ver ingressos"; senão, "Ver outros eventos". Link de evento que não existe: "Não encontramos este evento".

## Depende de / afeta

- **Depende de:** evento com `slug` (o link de convite usa o slug).
- **Afeta:** o link de compra (SEL-06), a página de convite e o relatório Lista de usuários (LUS-08, LUS-11).

## Em aberto

- Em produção a lista aparece sempre que esgota e não há configuração: começar desligada (LES-02) muda o comportamento dos eventos esgotados. Validar com produto antes de levar para produção.
- Produção exige login para entrar pelo convite (MKT-951); o protótipo só preenche nome e e-mail com a sessão, sem obrigar.
- Aviso aos inscritos quando surgem ingressos (produção avisa por e-mail e WhatsApp quando abre a revenda) ficou fora: sem tela.
- O relatório Lista de usuários não mostra a origem de cada inscrição, embora ela fique gravada.
- Os textos da tela e do convite foram escritos para o protótipo; revisar com UX writing.

## Fontes

- Produção: `awa-purchase-ui/src/locales/pt-BR.json` (`WAITLIST`, `SOLD_OUT`) e `src/core/routers/routes.tsx` (MKT-951); inscrições em `awa-resale-service` (`waitlist_entries`).
