# NOTAS · Protótipo de pesquisa · Finanças do produtor

> Briefing de 16/11/2026 e **ajustes v2** do mesmo dia (Laricia Barbosa, Payout). Estímulo para 3 a 5 entrevistas com produtores.
> No ar só a direção **Eventos como pastas (B + D)**: a conta que fecha no topo e os eventos como pastas. A jornada "Cascata que fecha" como tela própria foi retirada (código no commit `0770df9`). A direção A (Extrato) não foi construída.

## O que existe

| Tela | Rota |
| --- | --- |
| Finanças (conta da organização + 48 eventos) | `/payout/financas-eventos` |
| Página do evento | `/payout/financas-eventos/:eventoId` |

- Código: `payout/financas-eventos/` (telas) e `payout/components/financas/` (dados, cascata, painel, estados, shell).
- Cenário pela barra do protótipo ou pela URL: `?cenario=negativo`, `bloqueado`, `carregando`, `erro`, `sem-eventos`. Sem o parâmetro, é o normal.
- Busca, filtro, ordem e página também ficam na URL (`busca`, `situacao`, `de`, `ate`, `ordem`, `pagina`): dá para mandar o link da entrevista já no estado certo. Ex.: `?busca=zzz` (busca sem resultado), `?situacao=negativo`.
- Eventos do briefing: `carnaval`, `ivete`, `numanice`, `arraial`.

### Tarefas da entrevista e onde cada uma se resolve

| Tarefa | Onde se resolve |
| --- | --- |
| 1. Quanto pode sacar hoje | Disponível agora, primeiro número do topo |
| 2. Vendido do Carnaval bate com o relatório | Pasta do Carnaval › A conta deste evento › "Ver no relatório de vendas" |
| 3. Quando cai o dinheiro do Numanice | Pasta do Numanice › Calendário de liberações |
| 4. Por que o Arraial está negativo | Pasta do Arraial › aviso no topo e Ajustes |
| 5. O que pode mudar no Ivete, até quando | Pasta do Ivete › O que ainda pode mudar |
| 6. Se precisasse do dinheiro antes | Antecipar, no topo e na pasta |

Com 48 eventos, achar a pasta passa a fazer parte da tarefa (busca, filtro ou paginação).

## Verificação automática das contas

```bash
node src/produtos/payout/financas-eventos/utils/conferir-contas.ts
```

Confere, nos cenários com dados (normal, saldo negativo, bloqueado): em cada evento, a cascata e as seis partes somam Seu dinheiro; calendário, ajustes, créditos, taxas e repasses de cada evento somam os totais do evento; a soma dos 48 eventos é igual à cascata do topo. Sai com erro se alguma soma não fechar. As mesmas checagens rodam no navegador em desenvolvimento e acusam no console.

Resultado em 16/11/2026: todas as contas fecham. Total da organização: R$ 37.415.000 − R$ 561.225 + R$ 72.000 − R$ 51.800 = **R$ 36.873.975**, distribuídos em R$ 158.400 + R$ 1.822.385 + R$ 2.180.000 + R$ 2.846.095 + R$ 600.000 + R$ 29.267.095.

## A conta do topo não muda com busca nem filtro

A cascata e "Onde está seu dinheiro" são sempre da **organização inteira**. Buscar, filtrar, ordenar ou paginar a lista muda só a lista e a contagem ("12 de 48 eventos"). "Baixar relatório" baixa os eventos do resultado da lista.

## Suposições

Dados e contas

1. Os números dos 4 eventos do briefing foram usados sem alteração. Uma data mudou: a bonificação do Carnaval passou de 10/11 para 15/11 (correção 1 da crítica: era antes do evento).
2. **Os outros 44 eventos são fictícios,** gerados de uma semente (nome, data, vendido) com as proporções dos eventos do briefing: Taxas e custos = 1,5% do Vendido; Retido por segurança = 1,9% do Vendido, liberado 60 dias depois do evento; evento em vendas tem 2% em processamento, retido até o evento e a liberar. São 32 já encerrados sem nada retido, 5 encerrados há menos de 60 dias e 7 em vendas. Com os do briefing: 8 em vendas, 2 com saldo negativo (Arraial e Sunset no Cais), 3 com ajuste recente (Ivete, Oktober da Serra 2026, Sunset no Cais).
3. **Liberações e repasses dos eventos gerados** foram datados para não mudar as frases do briefing: a próxima liberação de A liberar da organização continua sendo R$ 150.000 em 19/11 e o único agendado continua em 24/11.
4. **Composição de Taxas e custos** (painel "Ver detalhe"): Taxa de serviço 1,0%, Processamento de pagamentos 0,4% e Emissão de cortesias 0,1% do Vendido. A divisão é inventada; só o total (1,5%) vem do briefing. "MDR" não aparece na tela: virou "Processamento de pagamentos", em linguagem de cliente.
5. **Cenário "Saldo negativo":** a organização já recebeu todo o disponível em 13/11 e sobram os débitos dos dois eventos negativos. Disponível agora total = −R$ 39.200; Já recebido = R$ 32.152.390. As somas continuam fechando.
6. **Datas e motivos que o briefing não deu** foram inventados: ajustes do Arraial (12/10 e 08/10), repasse do Ivete que falhou (R$ 123.480 em 10/11, de volta ao Disponível agora), ajustes dos eventos gerados.
7. **Selo "Ajuste recente"** = ajuste nos últimos 30 dias.
8. **"Até quando" das contestações** = data do evento + 120 dias. Evento com esse prazo vencido mostra "Nada mais pode mudar neste evento".
9. **Em processamento** tem duas previsões: "Até hoje, 18h" (vendas recentes em confirmação) e "Quando as parcelas forem pagas" (Pix parcelado, só no Numanice).

Interface

10. **Topo:** ficaram os três números de destaque (Disponível agora, A liberar, Já recebido, os únicos com centavos) e, logo abaixo, a cascata da organização com a distribuição. Disponível agora, A liberar e Já recebido aparecem duas vezes de propósito: no destaque e como parte da soma que fecha.
11. **"Solicitar repasse" fica no cabeçalho,** como na Tela guardiã do Figma; "Antecipar" fica no card A liberar.
12. **Imagem do evento:** o protótipo não tem as capas reais. Cada evento ganha uma capa ilustrativa gerada (`components/financas/capa.ts`) dentro do Avatar do DS. É conteúdo, não estilo: por isso as cores dela não vêm dos tokens. Trocar pelas capas reais quando houver.
13. **Título de página:** Text xl / Semibold, lido do componente "Cabeçalho da página / Finanças" da Tela guardiã no Figma.
14. **Título da aba:** "Finanças · Protótipo de pesquisa" vale enquanto o protótipo está aberto. O `index.html` é do repositório inteiro e não foi alterado.
15. **"Ver no relatório de vendas"** e os fluxos de repasse e antecipação não fazem parte do teste: o link mostra um aviso e os botões param numa tela final.
16. **Bloco com R$ 0** (Créditos ou Ajustes zerados) não é clicável: não há composição para abrir.
17. **Shell:** menu lateral do Backstage refeito em `shell.tsx` (produto não importa de outro produto; a Arena Produções não existe no banco compartilhado). Botão primário vermelho, como no Figma. Tela escura forçada enquanto o protótipo está aberto.
18. **"Baixar relatório"** baixa um CSV de verdade com os eventos do resultado, com os mesmos nomes da tela.
19. Só desktop (1440 e 1280). Em 1280 os valores da cascata e da distribuição usam um degrau menor da escala de tipo do DS para não cortar.

## Regras a validar com a engenharia

Novas nesta rodada

1. **Saldo negativo de um evento: de onde sai o resto?** A tela diz, como pedido na correção 3: "Em 26/11, R$ 5.700 retidos são liberados e abatem o saldo negativo. Os R$ 19.500 restantes saem das próximas liberações dos seus outros eventos." **Atenção:** o briefing original diz que o Disponível agora total *já desconta* o débito, e é assim que a conta do topo fecha (o −R$ 25.200 do Arraial está dentro dos R$ 2.846.095). As duas coisas não são verdade ao mesmo tempo: ou o débito já saiu do disponível dos outros eventos, ou vai sair das próximas liberações. A frase "já está descontado do seu Disponível agora total" saiu do aviso para a tela não se contradizer, mas a regra precisa ser decidida antes da entrevista.
2. **Contestação no cartão sai do retido por segurança?** "O que ainda pode mudar" afirma que o retido fica "guardado para esses casos" (correção 12: mantido). O retido libera em 60 dias e a contestação pode vir até 120: de onde sai o valor de uma contestação depois da liberação?
3. **Composição de Taxas e custos:** quais linhas existem de verdade e com que nome para o produtor (suposição 4)? Emissão de cortesias é custo cobrado do produtor?
4. **Créditos são sempre "Bonificações do contrato"?** A legenda do bloco afirma isso. Se existir crédito de outro tipo, a legenda fica errada.

Do briefing original (seguem em aberto)

5. Vendido × Em processamento × Disponível fecham com o relatório de vendas? O protótipo assume que sim.
6. "Em processamento" pode ser aberto por motivo e com previsão ("até hoje, 18h", "quando as parcelas forem pagas")?
7. Saldo negativo de um evento é compensado com dinheiro de outros eventos da mesma organização, ou só do mesmo contrato?
8. Quando o total da organização fica negativo, a compensação é automática, em ordem de data? O produtor pode ser cobrado? ("Você não precisa pagar nada" é suposição.)
9. Liberação do retido de um evento negativo abate o saldo do próprio evento (como está) ou vai para o disponível geral?
10. Prazo de contestação: 120 dias contam da compra ou do evento?
11. Dá para pedir repasse de um evento só ("Solicitar repasse deste evento")?
12. Antecipar vale só para A liberar ou também para o retido? A taxa é conhecida antes?
13. Repasse que falha: o valor volta para o Disponível agora na hora? Quais motivos o produtor pode ler?
14. Custo de operação cobrado depois do fechamento entra como Ajuste (como no Arraial) ou como Taxas e custos?
15. Comprovante de repasse existe para todo repasse pago?

### Telas que dependem das regras 5 e 6

| Onde | Depende de |
| --- | --- |
| Topo › A conta de todos os eventos e Onde está seu dinheiro | As partes fecharem com o Vendido |
| Página do evento › A conta deste evento e "Ver no relatório de vendas" | Vendido do evento somar com o relatório |
| Calendário de liberações › linha Em processamento | Motivo e previsão do processamento |
| Numanice › O que ainda pode mudar › "sempre igual ao seu relatório de vendas" | Vendido somar com o relatório enquanto o evento vende |

## Lacunas do DS

| Faltou | O que foi usado no lugar |
| --- | --- |
| Pagination "Page minimal center aligned" em português e com 16px de padding (`PaginationPageMinimalCenter` traz "Previous" e "Next" fixos e padding próprio) | A mesma composição com as peças do DS (`Pagination` base + `Button`), em português: `financas-eventos/components/paginacao.tsx` |
| Limpar o período no Date range picker (não há "limpar" dentro do componente) | "Limpar filtros" ao lado dos filtros |
| Rótulo acessível em português no Date range picker (o padrão é "Date range picker") | `aria-label` passado pela tela; o do diálogo interno continua em inglês |
| Imagem de evento (capa) como componente | Avatar do DS, quadrado, com capa ilustrativa |
| Cascata / equação de valores (blocos com operador entre eles, bloco clicável com "Ver detalhe") | Cartões `ring-secondary` e operadores em texto: `cascata.tsx` |
| Barra de proporção com vários segmentos (o `ProgressBar` tem um valor só) | `div` com segmentos em tokens `utility-*` (neutral-300, amber-500, blue-500, green-500, purple-500, neutral-600) |
| Linha de lista com data, descrição e valor (calendário, repasses, ajustes) | `grid` de três colunas com divisor: `Linha` em `evento.tsx` |
| Linha de "pasta" (item navegável com imagem, selos e frase de status) | `Link` com `Avatar`, `Badge` e chevron |
| Número de destaque com centavos menores (`Metrics` não separa os centavos) | `NumeroGrande` em `cascata.tsx` |
| Esqueleto de carregamento | Blocos `bg-tertiary` com `animate-pulse` |
| Alerta em linha que não corta o texto (`AlertFloating` trunca em uma linha) | `Aviso` em `estados.tsx`, mesma anatomia |
| Rail da organização como componente (só existe dentro do `BackstageLayout`) | Cópia local no shell |

## Revisão de copy (skill `/design:ux-copy`)

As substituições da seção 4 dos ajustes v2 foram aplicadas como pedido. Depois, as duas telas e os estados foram revistos com os princípios da skill (claro, conciso, consistente, útil, humano; CTA com verbo; vazio = o que é + por quê + como seguir; erro = o que houve + por quê + como resolver).

Tela principal

| Sugestão da skill | Decisão | Motivo |
| --- | --- | --- |
| Card A liberar: mesma fórmula da legenda da distribuição ("Próximo: R$ 150.000 em 19/11") em vez de "Próxima liberação: … em qua, 19/11." | Aceita | Mesmo dado, mesma frase nos dois lugares |
| Contagem dizer o recorte quando há filtro ("12 de 48 eventos") | Aceita | Sem isso o selo parece dizer que a organização tem 12 eventos |
| Rótulo "Ordenar por" antes do Select de ordem | Aceita | O valor sozinho ("Data do evento") não diz que é ordenação |
| Estado vazio de filtro explicar o porquê ("Nenhum evento está nessa situação neste período") | Não aceita | Mantido o texto pedido ("Nenhum evento com esse filtro" + "Limpar filtros"): é curto e a ação resolve |
| Aviso de Disponível negativo: trocar "compensado sozinho" por "sai das suas próximas liberações" | Aceita | Mesma expressão da página do evento; "saldo" saiu das frases que falam do disponível |
| Selo "Evento em vendas" virar "Em vendas", igual ao filtro | Não aceita (decidir) | O selo vem do briefing original; é a única diferença de termo que sobrou, vale escolher um |
| Frase da pasta usar "liberam em" em vez de "chegam em" | Não aceita | "chegam em" é o exemplo dado nos ajustes v2 e é mais natural na frase |
| Toast do relatório dizer quantos eventos foram baixados | Aceita | Confirma que o download seguiu o filtro |

Página do evento

| Sugestão da skill | Decisão | Motivo |
| --- | --- | --- |
| "Total a liberar" (proposto) no fim do calendário | Não aceita | Colide com o termo único "A liberar": no Numanice o total é R$ 514.925 e A liberar é R$ 300.000. Ficou "Total que entra no disponível", como pede a regra de usar "entra no disponível" |
| Legendas sem dado novo ficarem vazias, inclusive nos zerados ("Nada em processamento", "Nenhum repasse agendado", "1 repasse pago") | Aceita | R$ 0 já diz; contagem de repasses está na seção Repasses |
| Retido: "Libera em dd/mm" com uma liberação e "Próximo: R$ X em dd/mm" com mais de uma | Aceita | No Numanice há duas datas de retido; "Libera em" sozinho esconderia a segunda |
| Linha Em processamento do Pix parcelado: "Pix parcelado: entra quando as parcelas forem pagas" | Aceita | A frase proposta ("Vendas recentes em confirmação") só vale para o caso "até hoje, 18h" |
| Aviso de saldo negativo mais curto no "Por quê" e com o fim da história no "O que acontece agora" | Aceita | Três frases curtas: o que recebeu, o que saiu, quanto falta; e depois quanto abate e de onde sai o resto |
| "Ver detalhe" virar rótulo específico ("Ver taxas", "Ver créditos") | Não aceita | Mantido o texto pedido; o rótulo do bloco logo acima já dá o contexto, e o leitor de tela lê "Taxas e custos: R$ 36.000. Ver detalhe" |
| Legenda "Bonificações do contrato" sumir quando Créditos é R$ 0 | Não aceita | Mantida sempre: ensina o que é o bloco mesmo zerado e mantém os blocos alinhados |
| Vazio de "O que ainda pode mudar" dizer o porquê | Aceita | "Nada mais pode mudar neste evento. O prazo de contestação no cartão terminou em dd/mm." |
| "Contestações no cartão": tirar "sai do retido por segurança e aparece aqui como ajuste" | Aceita | Texto pedido; a relação com o retido ficou só na linha da liberação (regra 2 a validar) |

Estados

| Sugestão da skill | Decisão | Motivo |
| --- | --- | --- |
| Bloqueado: cortar "os valores desta tela seguem atualizados" | Aceita | Não ajuda a resolver; ficou o que houve, o porquê e o que acontece depois |
| Sem eventos: descrição em uma frase | Aceita | "Quando um evento começar a vender, o dinheiro dele aparece aqui." |
| Erro ao carregar | Sem mudança | Já tem o que houve, o porquê ("do nosso lado") e a ação "Tentar de novo" |
| Repasse não concluído | Sem mudança | Motivo + para onde foi o valor + "Falar com o atendimento" |

## Fora deste teste

- Fluxo de repasse e de antecipação, relatório de vendas e conversa com o atendimento: param numa tela final ou num aviso.
- Direção A (Extrato).
- Figma: nada foi editado; foi lido só para o título de página e a paginação. As telas escolhidas depois da validação vão para o arquivo Finanças - AWA pelo plugin "Importar tela".
