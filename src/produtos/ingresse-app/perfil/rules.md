# Perfil e dependentes (app Ingresse): regras

> **Rotas:** `/ingresse-app/perfil`, `/ingresse-app/perfil/dependentes`, `/ingresse-app/perfil/dependentes/cadastrar`, `/ingresse-app/perfil/dependentes/:id/habilitar` e `/ingresse-app/perfil/selecionar` (multiperfis, desligados)
> **No menu:** app › aba Perfil
> **Versão em uso:** clássica (multiperfis desligados pela chave `MULTIPERFIS` em `components/funcionalidades.ts`)
> **Revisado em:** 2026-11-16

Este arquivo é a fonte da verdade do comportamento da feature. Mudou uma regra no código, mude
aqui no mesmo commit. Achou divergência entre código e este arquivo, registre em **Em aberto**
em vez de escolher um lado em silêncio.

## O que é

O Perfil da conta no app e a área de dependentes (cadastrar, listar e excluir quem pode ser
associado a ingressos). A feature de multiperfis — acessar o perfil de um dependente — está
pronta, mas desligada.

## Dados

| Dado | De onde vem | Grava? |
| --- | --- | --- |
| Dependentes | `data/dependentes.ts` (mock local; lista clássica com a chave desligada) | só em memória |
| Perfil em uso (multiperfis) | `components/perfil-ativo.ts` (sempre a própria conta com a chave desligada) | só em memória |

## Regras

### Comportamento
- **PER-01** Chave `MULTIPERFIS` (em `components/funcionalidades.ts`), hoje `false`: o app fica como antes dos multiperfis. Trocar para `true` religa tudo, sem outra mudança. _(components/funcionalidades.ts)_
- **PER-02** Com a chave desligada, o Perfil é o clássico: card da conta (sem a lista de outros perfis nem a troca de perfil) e "Sair" sem ação no protótipo. A conta é fictícia (Camila Ferreira Rocha, e-mail e telefone fictícios) e tem foto cadastrada. _(pages/Perfil.tsx → pages/perfil-classico.tsx, data/dependentes.ts `EU`)_
- **PER-03** Com a chave desligada, Dependentes é a lista clássica: três dependentes (Mariana, Eduardo, Regina) em cards com avatar de iniciais, dados e excluir, e "Cadastrar dependente" no rodapé; sem status nem ações de acesso. _(pages/Dependentes.tsx → pages/dependentes-classico.tsx, data/dependentes.ts)_
- **PER-04** Com a chave desligada, ninguém entra no perfil de um dependente: a Carteira e os ingressos mostram sempre os da própria conta, não há onboarding dos perfis na Carteira. _(components/perfil-ativo.ts, components/AppShell.tsx, carteira/pages/Carteira.tsx)_
- **PER-07** A aba Perfil (barra de baixo) mostra a bolinha com a foto da conta, como se a pessoa tivesse cadastrado a foto; com os multiperfis ligados, num perfil de dependente, mostra as iniciais dele. _(components/AppShell.tsx, assets/foto-perfil.jpg)_
- **PER-05** Com a chave desligada, a atribuição de ingresso a um dependente volta a mostrar o avatar de iniciais na lista e no dependente escolhido. _(ingressos/pages/TransferirDependente.tsx)_
- **PER-06** Guardado para quando a chave ligar: habilitar acesso ao perfil do dependente, seleção de perfil ao entrar, troca de perfil no Perfil com confirmação, onboarding dos perfis na Carteira, aba Perfil com as iniciais do dependente em uso e Carteira/ingressos filtrados pelo perfil. _(pages/perfil-multiperfis.tsx, pages/dependentes-multiperfis.tsx, pages/habilitar-acesso.tsx, pages/selecionar-perfil.tsx, components/)_

## Em aberto

- As rotas de habilitar acesso e de selecionar perfil continuam registradas e abrem se alguém digitar o endereço, mesmo com a chave desligada.
- A Carteira web (`src/produtos/carteira-web`) também tem multiperfis e não foi desligada.
