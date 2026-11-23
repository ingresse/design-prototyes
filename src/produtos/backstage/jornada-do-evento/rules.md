# Jornada do evento (centrais dos grupos): regras

> **Removida em 22/11/2026.** As centrais Regras de venda e Divulgação saíram do menu do evento (BKS-07): o que era de ingresso e produto abre pelos atalhos de Ingressos e produtos (BKS-119), Compras em grupo virou opção do menu e Divulgação é uma página com abas (BKS-120). As regras abaixo ficam como histórico e não valem mais; a tela `pages/central-do-grupo.tsx` foi apagada.

> **Rotas:** `/backstage/evento/:grupo` (`configuracoes-de-venda`, `marketing`; `financeiro` leva para a Visão geral)
> **No menu:** Backstage › menu do evento › Regras de venda, Divulgação (BKS-07)
> **Versão em uso:** única (`jornada-do-evento/`)
> **Revisado em:** 2026-11-22

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

O menu do evento tem sete opções (BKS-07). As duas que juntam várias funcionalidades
(Regras de venda, Divulgação) abrem uma central: uma tela que diz o
que dá para fazer ali e leva a cada funcionalidade. O menu fica curto e a tela explica as opções.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Grupos e funcionalidades | `backstage/components/grupos-do-evento.ts` (lista fixa) | não |
| Evento em contexto | `@/plataforma` (`useEventoAtual`, pelo `BackstageLayout`) | não |

## Regras

### Central do grupo
- **JDE-01** A central mostra o nome do grupo como título, o job em uma frase como subtítulo e as funcionalidades em cartões (2 colunas a partir de 640 px, 3 a partir de 1280 px). _(pages/central-do-grupo.tsx)_
- ~~**JDE-02** Cada cartão tem ícone, nome, uma frase do que faz e "Abrir"; o cartão inteiro leva à tela da funcionalidade.~~ Substituída por JDE-22 em 22/11/2026.
- **JDE-03** Funcionalidade que ainda não existe aparece apagada, sem a seta, com o selo "Em breve", e não é clicável. _(pages/central-do-grupo.tsx)_
- **JDE-04** Grupo desconhecido na URL leva a Regras de venda. _(pages/central-do-grupo.tsx)_
- ~~**JDE-05**~~ Borderô abria nos relatórios a partir da central Financeiro, que saiu em 21/11/2026 (JDE-18).

### Grupos e funcionalidades
- ~~**JDE-10** a **JDE-15**~~ Grupos por job (Criar e configurar, Acompanhar vendas, Acompanhar acessos, Emitir ingressos), substituídos em 20/11/2026 pelos grupos abaixo.
- **JDE-16** Regras de venda: Abertura de vendas, Regras de compra e acesso, Lotes sincronizados (lotes-sincronizados/rules.md, desde 21/11/2026), Compras em grupo (compras-em-grupo/rules.md), Questionário. Meios de pagamento e Taxas saíram em 21/11/2026: não existem no Backstage de produção.
- **JDE-17** (nomes curtos dos cartões desde 22/11/2026, BKS-119) Divulgação: Passkey, Cupons (cupons/rules.md), Etiquetas (etiquetas/rules.md) e Pixel de rastreamento (pixel-de-rastreamento/rules.md), as quatro com tela desde 21/11/2026, e Lista de espera (lista-de-espera/rules.md), funcionalidade nova de 21/11/2026. Em 22/11/2026, Passkey, Etiquetas e Lista de espera passaram por algumas horas para a Página do evento, desfeita no mesmo dia.
- ~~**JDE-18**~~ Financeiro (Borderô; em breve, Reconciliação e Repasse) saiu em 21/11/2026: o Backstage de produção não tem financeiro no evento. O Borderô continua nos relatórios; saldo e repasse ficam em Finanças, na organização.

### Menu
- **JDE-22** Cartão da central (desde 22/11/2026, no lugar do cartão branco com ícone): fundo escuro de marca (`bg-brand-section`: cinza-escuro no claro, cinza do fundo secundário no escuro), nome em Text xl Semibold na largura toda, a frase do que faz em Text sm até 62% da largura e, no canto de baixo à direita, a ilustração de linhas finas: o ícone da funcionalidade (Untitled UI, o mesmo do menu) com 128 px (144 px em cartão a partir de 352 px) e traço de 1,25 px em qualquer tamanho, sem fundo nem moldura. Embaixo, à esquerda, a seta num círculo claro e, se for o caso, o selo "Novo". O cartão inteiro leva à tela da funcionalidade. No hover, o ícone sobe e gira de leve e a seta anda 2 px, em 200 ms; com movimento reduzido, nada se mexe. A ilustração é decorativa (sem texto alternativo). Altura mínima de 240 px. No mesmo dia, a primeira versão usava objetos 3D do Iconly (estilo Clay), trocados pela linha fina; os círculos concêntricos atrás do ícone saíram no mesmo dia. _(pages/central-do-grupo.tsx)_
- **JDE-21** Toda tela de uma central tem, no topo, o voltar com o nome da central (cabeçalho padrão, BKS-100): inclusive Passkey e Questionário, desde 21/11/2026.
- **JDE-20** A opção do menu fica marcada na central e nas telas das funcionalidades dela: Abertura de vendas, Regras de compra e acesso e Questionário marcam Regras de venda; Passkey, Cupons, Etiquetas, Pixel e Lista de espera marcam Divulgação. _(backstage/components/grupos-do-evento.ts, `opcaoDaTela`)_

## Depende de / afeta

- **Depende de:** as telas de cada funcionalidade (informações, itens, aberturas, questionário, equipe, marketing, relatórios, cortesias, bilheteria).
- **Afeta:** o menu do evento em todas as shells (BKS-07).

## Em aberto

- "Mapa de assentos" (Informações do evento) e Pré-venda (Marketing) ainda não têm lugar: a Pré-venda existe em `/backstage/marketing/pre-venda`, mas fora do contexto do evento.
- As frases de cada cartão foram escritas para o protótipo; revisar com UX writing.

## Fontes

- Artefato "Reorganização do Menu Backstage" e "Momentos do Produtor × Jobs to be Done" (claude.ai, Victor).
