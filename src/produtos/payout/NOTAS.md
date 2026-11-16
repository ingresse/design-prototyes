# NOTAS · Protótipos de pesquisa · Finanças do produtor

> Briefing de 16/11/2026 (Laricia Barbosa, Payout). Estímulos para 3 a 5 entrevistas com produtores.
> Feito só a **direção B + D**, separada em duas jornadas, uma por projeto. A direção A (Extrato) não foi construída.

## O que existe

| Jornada | Projeto | Rota |
| --- | --- | --- |
| Cascata que fecha (B) | `payout/financas-cascata/` | `/payout/financas-cascata` |
| Eventos como pastas (D) | `payout/financas-eventos/` | `/payout/financas-eventos` e `/payout/financas-eventos/:eventoId` |

- O que as duas compartilham fica em `payout/components/financas/`: dados, formatos, shell, cascata, estados.
- Cenário pela barra do protótipo ou pela URL: `?cenario=negativo`, `bloqueado`, `carregando`, `erro`, `sem-eventos`. Sem o parâmetro, é o normal.
- Eventos: `carnaval`, `ivete`, `numanice`, `arraial`.
- Na jornada B, `?parte=` abre o painel de uma parte direto (ex.: `?parte=disponivel`).

### Tarefas da entrevista e onde cada uma se resolve

| Tarefa | Cascata que fecha | Eventos como pastas |
| --- | --- | --- |
| 1. Quanto pode sacar hoje | Disponível agora, na distribuição | Primeiro número do topo |
| 2. Vendido do Carnaval bate com o relatório | Vendido › Por evento | Pasta do Carnaval › A conta deste evento |
| 3. Quando cai o dinheiro do Numanice | A liberar e Retido › Por evento | Pasta do Numanice › Calendário de liberações |
| 4. Por que o Arraial está negativo | Disponível agora › Arraial e Ajustes › Arraial | Pasta do Arraial › aviso no topo e Ajustes |
| 5. O que pode mudar no Ivete, até quando | **Não responde direto** (só o Retido, com a data de liberação) | Pasta do Ivete › O que ainda pode mudar |
| 6. Se precisasse do dinheiro antes | Antecipar, em A liberar | Antecipar, no topo e na pasta |

A tarefa 5 é uma diferença real entre as duas jornadas e vale observar na entrevista.

## Suposições

Dados e contas

1. Os números do briefing foram usados sem alteração. As duas regras de soma são conferidas em desenvolvimento (`conferirContas()` em `dados.ts`): qualquer soma que não feche aparece no console.
2. **Cenário "Saldo negativo"** não estava no briefing com números. Criado assim: a organização já sacou todo o disponível em 13/11 (R$ 661.205 passam de Disponível para Já recebido) e sobra só o débito do Arraial. Disponível agora total = −R$ 25.200; Já recebido = R$ 2.521.205. As somas continuam fechando.
3. **Datas e motivos que o briefing não deu** foram inventados para a tela ficar crível: ajustes do Arraial (cancelamentos em 12/10; equipe extra e bonificação em 08/10), crédito do Carnaval (bonificação por meta de vendas, 10/11).
4. **Repasse que falhou:** o briefing pede o estado e não traz dado. Incluído no Ivete: repasse de R$ 123.480 em 10/11 não concluído, com o valor de volta no Disponível agora (o disponível do Ivete é exatamente esse valor, então a soma não muda).
5. **Selo "Ajuste recente"** = ajuste nos últimos 30 dias. Com isso só o Ivete (02/11) recebe o selo; os ajustes do Arraial são de outubro.
6. **"Até quando" das contestações** = data do evento + 120 dias (última compra possível + prazo máximo). Ivete: 17/01/2027.
7. **Retido por segurança libera 60 dias depois do evento.** Deduzido das datas do briefing (as quatro batem com +60 dias).
8. **Taxas e custos** aparecem em uma linha só por evento ("Taxa sobre as vendas"). Nos dados do briefing elas valem 1,5% do vendido em todos os eventos; a porcentagem não aparece na tela.

Interface

9. **Shell:** o menu lateral do Backstage foi refeito em `payout/components/financas/shell.tsx` com os mesmos tokens e ícones. Motivo: produto não importa de outro produto, e o `BackstageLayout` lê a organização do banco compartilhado, onde a Arena Produções não existe (criar lá mexeria no mundo de todo mundo). Os outros itens do menu ficam inertes.
10. **Botão primário vermelho,** como na tela guardiã do Figma. O Backstage em código usa hoje a marca neutra (`tema-backstage`, só nas rotas `/backstage`). Trocar é uma linha em `App.tsx` se o padrão for o neutro.
11. **Tela escura forçada** enquanto o protótipo está aberto, sem mexer na preferência de tema salva.
12. **Bloqueado:** aviso em linguagem de cliente no topo, números visíveis e ações de repasse e antecipação desligadas. O motivo (conferência de conta bancária) é exemplo.
13. **Saldo negativo:** "não precisa pagar nada" e "compensado com as próximas liberações, em ordem de data" são suposições de regra (ver dúvidas 3 e 4).
14. Dia da semana em todas as datas de evento e de liberação. O ano só aparece quando não é 2026.
15. Só desktop (1440 e 1280). Sem versão para celular.

## Lacunas do DS

| Faltou | O que foi usado no lugar |
| --- | --- |
| Esqueleto de carregamento | Blocos `bg-tertiary` com `animate-pulse` (mesma saída do Figma atual) |
| Alerta em linha que não corta o texto (`AlertFloating` trunca título e descrição em uma linha a partir de `md`) | Mesma composição (FeaturedIcon outline, título, descrição, ação) sem truncar: `Aviso` em `estados.tsx` |
| Cascata / equação de valores (blocos com operador entre eles) | Composição com cartões `ring-secondary` e operadores em texto: `cascata.tsx` |
| Barra de proporção com vários segmentos (o `ProgressBar` tem um valor só) | `div` com segmentos em tokens `utility-*` |
| Linha de lista com data, descrição e valor (extrato / calendário) | `grid` de três colunas com divisor entre linhas: `Linha` em `evento.tsx` |
| Linha de "pasta" (item de lista navegável com ícone, selos e frase de status) | `Link` com `FeaturedIcon`, `Badge` e chevron |
| Métrica com número grande e centavos menores (`Metrics` não separa os centavos) | `NumeroGrande` em `cascata.tsx` |
| Rail da organização como componente do DS (existe só dentro do `BackstageLayout`) | Cópia local no shell |

As seis lacunas já anotadas no Figma (Select aberto, Date picker desabilitado, Filters bar, Table header) não apareceram aqui: estas telas não usam filtro nem tabela.

## Dúvidas de regra de negócio (validar com engenharia)

1. **Vendido × Em processamento × Disponível fecham com o relatório de vendas?** (seção 10 do briefing). Os protótipos assumem que sim.
2. **"Em processamento" pode ser aberto por motivo e com previsão?** Assumido: "vendas das últimas horas, até hoje 18h" e "Pix parcelado, quando as parcelas forem pagas".
3. **Saldo negativo de um evento é compensado com o dinheiro de outros eventos da mesma organização?** O briefing diz que o Disponível agora total já desconta o débito. Vale para qualquer evento ou só do mesmo contrato?
4. **Quando o total da organização fica negativo,** a compensação é automática com as próximas liberações, em ordem de data? O produtor pode ser cobrado?
5. **Liberação do retido de um evento negativo:** os R$ 5.700 do Arraial em 26/11 abatem o saldo do próprio evento (como está) ou vão para o disponível geral?
6. **Prazo de contestação:** 90 a 120 dias contam da compra ou do evento? O retido por segurança libera em 60 dias, antes do fim desse prazo: o que acontece com uma contestação depois da liberação?
7. **Repasse por evento:** dá para pedir repasse de um evento só ("Solicitar repasse deste evento")?
8. **Antecipar** vale só para "A liberar" ou também para o retido? A taxa é conhecida antes de entrar no fluxo?
9. **Repasse que falha:** o valor volta para o Disponível agora na hora? Quais motivos o produtor pode ler?
10. **Taxas e custos** podem ser abertos por tipo (taxa de serviço, processamento, custo de operação)? Custo de operação cobrado depois do fechamento entra como Ajuste (como no Arraial) ou como Taxas e custos?
11. **Créditos:** que tipos existem e com que nome aparecem para o produtor?
12. **Comprovante de repasse** existe para todo repasse pago?

## Telas que dependem da dúvida 1 e 2 (dependência em aberto)

| Tela | Depende de |
| --- | --- |
| Cascata do total (`/payout/financas-cascata`), bloco Vendido e nota "Mesmo valor do seu relatório de vendas" | Vendido somar com o relatório |
| Painel Vendido › Por evento | Vendido por evento somar com o relatório do evento |
| Distribuição (total e por evento), células Em processamento e Disponível agora | Em processamento + Disponível fecharem com o Vendido |
| Painel Em processamento › Por evento | Em processamento aberto por motivo e previsão |
| Topo de `/payout/financas-eventos` (Disponível agora) | Disponível fechar com o resto |
| Página do evento › A conta deste evento | Vendido do evento somar com o relatório |
| Página do evento › Calendário de liberações, linha Em processamento | Motivo e previsão do processamento |
| Página do evento (Numanice) › O que ainda pode mudar › "sempre igual ao seu relatório de vendas" | Vendido somar com o relatório enquanto o evento vende |

## Fora deste teste

- Fluxo de repasse e de antecipação: "Solicitar repasse" e "Antecipar" param numa tela final.
- Direção A (Extrato).
- Figma: nada foi editado. As telas escolhidas depois da validação vão para o arquivo Finanças - AWA pelo plugin "Importar tela".
