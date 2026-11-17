# NOTAS · Protótipo de pesquisa · Finanças do produtor

> Briefing de 16/11/2026, ajustes v2 (16/11) e **ajustes v3 (17/11/2026)**, de Laricia Barbosa (Payout). Quando há conflito, vale a v3.
> **Missão da tela (v3):** Finanças é a fonte da verdade de todos os eventos da organização. O produtor precisa saber o que aconteceu, acontece e vai acontecer com o dinheiro dele, e conseguir provar isso sozinho.

## O que existe

| Tela | Rota | Pergunta que responde |
| --- | --- | --- |
| Finanças | `/payout/financas-eventos` | Quanto é meu, onde está e o que eu posso fazer agora? |
| Calendário de liberações | `/payout/financas-eventos/calendario` | Quando o meu dinheiro entra no Disponível? |
| Extrato | `/payout/financas-eventos/extrato` | O que aconteceu com o meu dinheiro, e por que o meu Disponível mudou? |
| Página do evento | `/payout/financas-eventos/:eventoId` | A mesma conta, só deste evento |

- Código: `payout/financas-eventos/` (telas) e `payout/components/financas/` (dados, conta, painéis, estados, shell).
- Cenário pela barra do protótipo ou pela URL: `?cenario=negativo`, `bloqueado`, `carregando`, `erro`, `sem-eventos`.
- Busca, filtros, página e painel aberto ficam na URL em todas as telas: dá para mandar o link da entrevista já no estado certo. Exemplos: `/calendario?tipo=antecipavel`, `/extrato?tipo=repasse-pago&periodo=90`, `/extrato?sentido=saidas`, `?detalhe=taxas`.
- Eventos do briefing: `carnaval`, `ivete`, `numanice`, `arraial`.

## A equação que a tela inteira conta

```
De onde veio:  Vendido − Taxas e custos + Créditos − Devoluções = Líquido
Onde está:     Líquido = Em processamento + Retido + Antecipável + Disponível + Agendado + Repassado
```

Organização em 17/11/2026: R$ 37.415.000 − R$ 569.225 + R$ 72.000 − R$ 43.800 = **R$ 36.873.975**, em R$ 158.400 + R$ 1.822.385 + R$ 2.180.000 + R$ 2.846.095 + R$ 600.000 + R$ 29.267.095. O Líquido é o mesmo da v2; Taxas e custos subiu R$ 8.000 e Devoluções caiu R$ 8.000 (regra 4 da seção 6: custo de operação é Taxas e custos).

## Verificação automática

```bash
node src/produtos/payout/financas-eventos/utils/conferir-contas.ts
```

Confere, nos cenários com dados (normal, total negativo, bloqueado), e sai com erro se algo não fechar:

- cada evento: as duas linhas da equação, e as listas (liberações, devoluções, créditos, taxas, repasses) contra os totais do evento;
- a soma dos 48 eventos = a conta da organização;
- **Calendário:** a soma das liberações = Em processamento + Retido + Antecipável (organização e cada evento), e as três faixas do resumo somam o total;
- **Extrato:** saldo inicial + movimentos que afetam o Disponível = saldo final = Disponível do card (em 30 e em 90 dias), e a última linha termina no saldo final; o resumo fecha (inicial + entradas − saídas = final); os repasses agendados somam o Agendado; a origem de cada repasse soma o valor do repasse;
- **painéis de detalhe:** a soma das linhas = o valor do bloco (Vendido, Taxas e custos, Créditos, Devoluções);
- cards do topo e legenda leem o mesmo total.

Resultado em 17/11/2026: todas as contas fecham. Calendário: R$ 572.020 + R$ 2.045.515 + R$ 1.543.250 = R$ 4.160.785. Extrato de um mês: R$ 1.173.930 (17/10) + R$ 5.483.165 de entradas − R$ 3.811.000 de saídas = R$ 2.846.095.

## Decisões desta rodada (v3)

Regras de negócio decididas (seção 6 dos ajustes)

1. **Saldo negativo de um evento já é descontado do Disponível da organização.** Redação: "Você não precisa pagar nada: o valor já foi descontado do Disponível dos seus outros eventos. Em 26/11, R$ 5.700 retidos são liberados e reduzem o saldo negativo para R$ 19.500." **É um estado futuro:** hoje a alocação entre eventos é manual. Fecha a pendência que estava aberta desde a v2.
2. **Contestação depois da liberação do retido:** "Até dd/mm, contestações saem do retido. Depois disso, saem do seu disponível." Prazo: 120 dias depois do **evento** (a validar com Fraude). Evento com o retido já liberado diz que as contestações saem do disponível.
3. **Em processamento:** "Entra hoje" (sem hora) e "Pix parcelado: entra quando as parcelas forem pagas".
4. **Custo de operação** lançado depois do fechamento é **Taxas e custos**. No Arraial, os R$ 8.000 de equipe extra saíram de Devoluções (ficaram R$ 22.000) e entraram em Taxas e custos (R$ 12.500). O Líquido do evento não mudou.
5. **Antecipar** vale só para o Antecipável. O botão só aparece no card Antecipável, nas linhas Antecipável do Calendário e na página do evento.
6. **Repasses** mostram conta de destino, modalidade, taxa de transferência e valor líquido recebido (página do evento e painel do Extrato). O repasse do Arraial vai para conta de terceiro.
7. **Bloqueado:** o card Disponível para repasse mostra o selo "Pausado" e o valor em cor neutra.

Decisões de interface

8. **Topo:** voltaram os três cards de ação (Disponível para repasse, Antecipável, Repassado), acima de "A conta de todos os eventos". A repetição dos três valores na legenda é intencional: card para agir, legenda para conferir. Só os três cards têm centavos.
9. **O card Disponível para repasse é inteiro clicável** e leva à lista filtrada por "Com dinheiro disponível". Ele diz isso ("Ver eventos com dinheiro disponível"): sem o texto, nada indicava que o card era clicável.
10. **A taxa da antecipação não aparece** em card, botão ou linha. Só no painel de um movimento de Antecipação já feito, no Extrato.
11. **"Extrato" e não "Histórico"; "Calendário" e não "Agenda"** (decisão de copy dos ajustes).
12. **Vendido da organização** abre "Vendido por evento"; na página do evento, o Vendido leva direto ao relatório de vendas.
13. **Resumo do Calendário em três faixas que não se sobrepõem.** Os rótulos são os pedidos ("Próximos 7 dias", "Próximos 30 dias", "Depois de 30 dias"), e a linha de apoio diz as datas de cada faixa ("Até 24/11", "De 25/11 a 17/12", "A partir de 18/12"). Sem isso, "Próximos 30 dias" pareceria incluir os 7 primeiros e a soma das três não fecharia.
14. **Pix parcelado não tem data:** fica no grupo "Sem data definida", no fim do Calendário, e entra na faixa "Depois de 30 dias" com o aviso "inclui R$ 15.000 sem data".
15. **Filtro "Retido (os dois tipos)" no Calendário:** não estava na lista pedida, mas a legenda de "Onde está o seu líquido" precisa abrir o Calendário com os dois tipos de retido de uma vez.
16. **Extrato do mais recente para o mais antigo, agrupado por dia** (crítica de design de 17/11). Muda a decisão anterior, que seguia o pedido "saldo inicial no topo, saldo final no fim": os dois saldos saíram da lista e foram para o resumo do período, e a lista passou a ler como extrato de banco. Cada dia mostra o Disponível no fim do dia. **A validar com o briefing v3 (seção 4.2).**
17. **Filtros do Extrato escondem linhas, mas "Disponível após" e o saldo do dia são sempre os da organização.** O resumo do período também não muda com os filtros.
18. **O Extrato não mostra repasses agendados em bloco próprio** (pedido de 17/11: o agendamento de repasses fica em outro lugar). O filtro "Repasses agendados" também saiu. O pedido do repasse ("Repasse solicitado") segue no histórico, porque foi quando o valor saiu do Disponível, e o filtro "Repasses pagos" continua: é como a legenda (Repassado) abre o Extrato. A legenda "Agendado" abre o Extrato filtrado por Repasses.
19. **Sem eventos:** a tela principal aparece inteira, zerada, com o vazio de cada seção, em vez de um vazio único.
20. **Cenário "Total negativo":** o aviso do topo continua dizendo que o valor "sai das suas próximas liberações". Vale para a organização inteira negativa; a regra 1 trata de um evento negativo dentro de uma organização positiva.
21. **O Extrato só lista o que mudou o Disponível** (crítica de 17/11). Vendas em processamento e devoluções que saíram do Antecipável ficam de fora por padrão, com um aviso e "Mostrar na lista". Antes elas apareciam com "—". **Muda a seção 4.2 do briefing v3, que listava Vendas entre os movimentos: a validar.**
22. **Cor do valor no Extrato:** entrada em verde, saída em cor neutra; vermelho só para saldo negativo. Antes, taxa e devolução saíam em vermelho e repasse em branco. A mesma regra vale em "Últimos movimentos" e no painel do movimento.
23. **Linha do Extrato sem selo colorido de tipo:** ícone de direção (entrou, saiu, não mudou), título e, embaixo, tipo · evento · conta.
24. **Painel do repasse mostra "De onde veio este valor":** os movimentos mais recentes do evento que formaram o Disponível, até cobrir o valor do repasse.
25. **"Baixar extrato" oferece PDF e Planilha (CSV).** O PDF é simulado (mostra um aviso); o CSV baixa de verdade.
26. **Período padrão do Extrato: do primeiro dia do mês até hoje** (pedido de 17/11), com o atalho "Este mês". Antes era um mês para trás (17/10 a 17/11).
27. **Resumo do Extrato com três números: Entradas, Saídas e Disponível hoje** (pedido de 17/11). O "Disponível em" a data inicial saiu, e com ele os sinais + − =: sem o saldo do início, "entradas − saídas" não dá o Disponível de hoje, e o sinal de igual afirmaria uma conta que não fecha na tela. A conta completa continua verificada pelo script e os saldos seguem no CSV.

## Suposições (dados inventados)

1. **44 dos 48 eventos são fictícios,** gerados de uma semente (nome, data, vendido) com as proporções dos eventos do briefing. "Hoje" do protótipo passou a ser **17/11/2026** (era 16/11), para casar com "Atualizado em 17/11/2026, 09:30". Nenhum valor mudou por causa disso.
2. **Composição de Taxas e custos é ilustrativa.** Emissão de cortesias (× R$ 0,99), Pré-impressos (× R$ 0,32), Juros de parcelamento (0,2% do Vendido), Taxa de serviço (0,3%, só em 3 eventos em que o produtor assumiu) e Processamento de pagamentos, que fecha a conta. As quantidades são sempre múltiplos que dão valor inteiro em reais. Só o total vem do briefing.
3. **Créditos por tipo:** Carnaval virou Rebate (0,5% do Vendido acima de R$ 2.000.000 = R$ 12.000, creditado); Arraial virou Bonificação de custo (Equipe de portaria, R$ 5.000 de R$ 10.000 da verba); os gerados cobrem Rebate, Bonificação de custo, Luvas e Ajuste a crédito. **Numanice tem um rebate de R$ 3.250 aguardando nota fiscal,** que não soma em Créditos.
4. **Devoluções por tipo:** os R$ 22.000 do Arraial viraram Cancelamento (R$ 18.000) e Reembolso parcial (R$ 4.000); os R$ 14.000 do Sunset no Cais viraram Cancelamento (R$ 11.500) e Ingresso suspenso (R$ 2.500); a contestação do Oktober da Serra 2026 "saiu do antecipável", as outras "saíram do disponível".
5. **Repasses:** conta da organização "Itaú ···4521"; modalidades com taxa de transferência de R$ 0 (Básico), R$ 10 (Expresso) e R$ 25 (Turbo). A taxa não entra na conta do Líquido: "Repassado" é o valor do repasse; "valor recebido na conta" é o repasse menos a taxa.
6. **Extrato cobre os últimos 90 dias** (desde 19/08). Os movimentos saem dos dados de cada evento: repasses, devoluções, créditos e custos já existiam; **liberações passadas, vendas do dia e uma antecipação foram inventadas** para o extrato contar uma história completa. Vendas do dia de hoje são o que está Em processamento. A antecipação (Festival de Verão Salvador 2027, R$ 80.000 com taxa de R$ 1.600) é ilustrativa: a taxa dela não está em Taxas e custos do evento.
7. **O saldo inicial do Extrato é calculado de trás para a frente** a partir do Disponível de hoje. Por evento, a história do extrato não é reconciliada com o Disponível do evento; só o saldo da organização é verificado. Por isso a origem de um repasse ("De onde veio este valor") fecha com uma linha de ajuste quando precisa: "Já estava no Disponível do evento" ou "Ficou no Disponível do evento".
8. **Cenário "Total negativo":** a organização já teve todo o disponível repassado em 13/11. Disponível = −R$ 39.200; Repassado = R$ 32.152.390.
9. **Imagem do evento:** capas ilustrativas geradas, dentro do Avatar do DS (cores de conteúdo, não de interface).

## Regras a validar

1. **Prazo de contestação conta da data do evento?** (Fraude.) A tela afirma 120 dias depois do evento.
2. **Alocação automática do saldo negativo entre eventos** é estado futuro: quando entra, e vale entre eventos de contratos diferentes?
3. **Devolução que "saiu do antecipável":** o produtor consegue ver isso hoje em algum relatório? O Extrato promete o link "Ver no relatório de transações".
4. **Ingresso suspenso** volta ao Líquido automaticamente quando liberado?
5. **Rebate aguardando nota fiscal:** existe prazo? O que acontece se a nota não vier?
6. **Taxa de serviço assumida pelo produtor:** aparece como linha de Taxas e custos, como está?
7. **Taxa de transferência por modalidade** e nomes das modalidades (Básico, Expresso, Turbo): valores reais.
8. **Vendas agrupadas por dia no Extrato:** a contagem de ingressos bate com o relatório de vendas do dia?
9. **Repasse "não concluído":** o valor volta ao Disponível no dia seguinte, como no protótipo?
10. Seguem abertas, do briefing original: Vendido × relatório de vendas (o protótipo assume que fecha), repasse de um evento só, antecipação vale para quais partes, comprovante para todo repasse pago.
11. **Extrato em PDF:** o produtor e o contador precisam de PDF, de OFX ou só da planilha? O protótipo oferece PDF e Planilha (CSV).
12. **Origem do repasse:** o sistema consegue dizer quais liberações formaram cada repasse? O painel promete "De onde veio este valor".
13. **Vendas fora do Extrato:** o produtor sente falta das vendas do dia nessa tela, ou o relatório de vendas basta?

## Lacunas do DS

| Faltou | O que foi usado no lugar |
| --- | --- |
| Painel lateral com grupos expansíveis | `SlideoutMenu` + `Accordion` do DS (Taxas e custos da organização). O Accordion tem borda e fundo próprios, pensados para página, não para painel |
| Lista de extrato agrupada por dia, com saldo do dia e colunas de valor | Lista local (`ol` por dia, linha como `button` com foco e hover do DS, `FeaturedIcon` para a direção). A `Table` do DS não agrupa linhas nem alinha à direita o rótulo das colunas de valor |
| Select com busca (`Select.ComboBox`) com seta à direita e sem lupa | A seta entra no espaço de `status` do ComboBox e a lupa é trocada por um ícone vazio (filtro de evento do Extrato). O texto do campo vazio fica na cor de placeholder, mais apagado que o do `Select` ao lado |
| Resumo em blocos com operadores (+ − =) | Blocos locais iguais aos de "A conta de todos os eventos" |
| Selos de tipo (liberação) com cor por tipo | `Badge` do DS com as cores existentes. No Extrato o selo saiu: a linha usa ícone de direção |
| Card de métrica clicável, com centavos menores e sem menu de ações | `TableCard.Root` + `NumeroGrande` local; o card clicável é um `button` com os estados de foco e hover do DS |
| Tooltip no tema escuro: fundo claro e título `text-white`, invisível | Título com o token `text-bg-primary`, que inverte junto com o fundo (`dica.tsx`) |
| Link que envolve conteúdo composto (item da legenda, linha clicável) | `Link` do roteador com os estados de foco e hover do DS |
| Pagination "Page minimal center aligned" em português e com 16px de padding | Mesma composição com `Pagination` base + `Button`: `paginacao.tsx` |
| Limpar período e rótulo em português no Date range picker | "Limpar filtros" ao lado; `aria-label` passado pela tela |
| Cascata (blocos com operador), barra de proporção com segmentos, linha de pasta, linha de lista com data e valor, esqueleto, alerta sem truncar, rail da organização | Composições locais com tokens do DS (já registradas na v2) |
| Ponto de quebra entre 1280 e 1440 | Consulta de contêiner `@6xl` no cartão |

Usados do DS nesta rodada, além dos anteriores: `Table`, `Accordion`, `ProgressBarBase` (uso da verba), `Tooltip`.

## Revisão de copy (skill `/design:ux-copy`)

Princípios aplicados: claro, conciso, consistente, útil, humano; CTA com verbo; vazio = o que é + por quê + como seguir; erro = o que houve + por quê + como resolver. O glossário da seção 3 foi aplicado em todo o protótipo, inclusive CSV, filtros, selos e leitores de tela.

| Onde | Sugestão da skill | Decisão | Motivo |
| --- | --- | --- | --- |
| Card Disponível para repasse | Dizer para onde o clique leva ("Ver eventos com dinheiro disponível") | Aceita | Card clicável sem rótulo de ação não parece clicável |
| Card Repassado | "R$ 600.000 agendados para 24/11" | Aceita (texto pedido) | Dado novo: valor e data |
| Legenda, Agendado | "Para 24/11" em vez de "Em 24/11" | Aceita | Combina com "agendados para" do card |
| Legenda, Retido e Antecipável | "Próxima: R$ X em dd/mm" (feminino) | Aceita | Concorda com "liberação", como no card ("Próxima liberação") |
| Bloco Líquido | Legenda "Tudo o que é seu" | Aceita (texto pedido) | Curta; a definição completa fica no tooltip |
| Tooltips do glossário | Ícone de ajuda ao lado do rótulo de cada bloco | Aceita | A definição fica a um toque, sem virar legenda fixa |
| Frase da pasta | "R$ 260.000 antecipáveis liberam em 21/11" | Aceita (texto pedido) | Diz qual dinheiro é |
| Frase da pasta, evento negativo | "Saldo negativo de R$ 25.200 · R$ 5.700 retidos liberam em 26/11" | Aceita | "abatem" saiu: a regra 1 fala em "reduzem o saldo negativo" |
| Selo e filtro | "Devolução recente" no lugar de "Ajuste recente" | Aceita | "Ajustes" virou "Devoluções" no glossário |
| Calendário, faixas | Linha de apoio com as datas de cada faixa | Aceita | Sem ela, "Próximos 30 dias" é ambíguo |
| Calendário, Retido até o evento | "Libera depois do evento" | Aceita (texto pedido) | — |
| Calendário, vazio | Título "Nenhuma liberação prevista" + "Quando um evento começar a vender, as datas aparecem aqui." | Aceita | O texto pedido não dizia como seguir |
| Extrato, resumo | "Resumo de 01/11 a hoje": "Entradas", "Saídas" e "Disponível hoje" | Aceita | Palavras de extrato de banco; "hoje" em vez da data quando o período termina hoje |
| Extrato, entradas por tipo | "Repasses não concluídos" para o valor que voltou | Aceita | "Repasses" em Entradas pareceria erro |
| Extrato, o que ficou de fora | "25 movimentos não mudaram o Disponível e não aparecem na lista: vendas em processamento e devoluções que saíram do Antecipável." + "Mostrar na lista" / "Ocultar" | Aceita | Diz o que é e por que não está; a ação nomeia o que acontece. "Ver todos" foi recusada: não diz o quê |
| Extrato, cabeçalho do dia | "Disponível no fim do dia"; "Hoje, 17/11" | Aceita | "Saldo do dia" foi recusada: o glossário usa "Disponível", não "saldo" |
| Extrato, atalhos | "Tudo" / "Entradas" / "Saídas"; filtro "Todos os tipos" | Aceita | Uma palavra cada; "Todos os movimentos" ficou redundante com "Tudo" |
| Extrato, filtro de evento | Campo com busca, com "Todos os eventos" como texto do campo vazio | Aceita | Vazio já quer dizer todos: não precisa de um item "Todos os eventos" na lista |
| Extrato, baixar | "Baixar extrato" → "PDF" e "Planilha (CSV)" | Aceita | "Planilha" é a palavra do produtor; CSV fica entre parênteses para quem procura |
| Painel do repasse | "De onde veio este valor", com "Já estava no Disponível do evento" / "Ficou no Disponível do evento" | Aceita | Pergunta do produtor, na voz dele; as linhas de ajuste dizem para onde foi a diferença |
| Extrato, liberação | "Antecipável liberado" / "Retido liberado" | Aceita | Diz de onde veio em duas palavras |
| Painel do movimento | Seções "O que foi" e "O que mudou no seu líquido" | Aceita | "Efeito em cada parte" é fala de dentro; o produtor quer saber o que mudou |
| Painel do movimento, repasse | "Valor recebido na conta" (pago) e "Valor a receber na conta" (agendado) | Aceita | O tempo do verbo segue a situação |
| Painel de Créditos | "R$ 3.250 aguardando sua nota fiscal" + "Não entra no total acima." | Aceita | Evita a pergunta "por que o total não bate?" |
| Painel de Devoluções | "Saiu do disponível" / "Saiu do antecipável" | Aceita (texto pedido) | — |
| Página do evento, Repasses | Uma linha: conta · modalidade · taxa de transferência · quanto recebeu | Aceita | Quatro dados novos sem abrir painel |
| Página do evento, seção | "Devoluções" no lugar de "Ajustes depois do fechamento" | Aceita | Mesmo termo do bloco |
| Vazio de repasses | "Você ainda não solicitou repasse deste evento." | Aceita | "Solicitar repasse" é o termo do botão |
| "Ver detalhe" virar "Ver taxas", "Ver créditos" | Rótulo específico | Não aceita | Mantido o texto pedido; o leitor de tela lê "Ver detalhe de Taxas e custos" |
| "Antecipável" como rótulo | Termo técnico: o briefing original proibia "antecipável" | Não aceita | A v3 tem prioridade e define o termo; o tooltip explica ("O que você pode receber antes, antecipando") |
| "Atualizado em" com frase de ressalva | — | Não aplicado | Pedido explícito: informação neutra, só data e hora |

## Fora deste teste

- Fluxo de repasse e de antecipação (param numa tela final), relatório de vendas, relatório de transações, regra do contrato, comprovante e conversa com o atendimento (mostram um aviso).
- Direção A (Extrato como tela principal) e a jornada "Cascata que fecha" como tela própria (retirada; código no commit `0770df9`).
- Figma: nada foi editado.
