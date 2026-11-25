# Backstage antigo: regras do produto

> **Rotas:** `/backstage-old/*`
> **Revisado em:** 2026-11-25

Guarda telas do Backstage que saíram do produto atual, mas que ainda precisam funcionar como foram
publicadas. Cada projeto aqui é uma cópia congelada: não recebe as mudanças do Backstage atual.

## Regras

- **BKO-01** O layout em `components/Backstage.tsx` é o do Backstage em 30/10/2026 (`ff22ef8`), com os dados de eventos e o Remix daquela data em `components/eventos/` e `components/remix/`. Nada aqui importa de `src/produtos/backstage/`.
- **BKO-02** O que o layout guarda no navegador usa chaves com o prefixo `backstage-old:`, para não trocar o evento, o status ou a variante de layout do Backstage atual.
- **BKO-03** Os itens do menu do layout antigo levam às rotas do Backstage atual; endereços que mudaram seguem os redirecionamentos de `src/app/App.tsx`.
- **BKO-04** O tema segue o do Backstage: começa no escuro e usa a marca neutra (`tema-backstage`), porque a rota começa com `/backstage`.

## Projetos

- `equipe-de-operacao-v3/`: Gerenciamento de cotas, publicado em 30/10/2026, 12:49.
