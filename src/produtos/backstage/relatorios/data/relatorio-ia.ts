/* ------------------------------------------------------------------ */
/*  Relatório personalizado por IA (OpenRouter).                       */
/*  A fonte de dados é o evento em contexto (ou todos os eventos da     */
/*  organização, BKS-27), lido do banco por `useDatasetDoEvento`        */
/*  (vendas-banco.ts) e entregue às consultas por `useFonteDoRelatorio`.*/
/*  A IA recebe a CAMADA SEMÂNTICA + o resumo agregado do período e     */
/*  devolve uma "visão" (blocos) escolhendo features e funções           */
/*  estatísticas.                                                        */
/* ------------------------------------------------------------------ */

import { useMemo } from "react";
import type { CalendarDate } from "@internationalized/date";
import { organizacaoDoEvento, useBanco, type Evento, type HistoricoVendas, type Pedido, type Repasse } from "@/plataforma";
import { CATALOGO, EXTRAS_VAZIOS, executarChamada, type Chamada, type ExtrasDoRelatorio } from "./relatorio-features";
import { executarConsulta, type Consulta } from "./relatorio-query";
import { CAMADA_SEMANTICA } from "@/reports/semantic";
import { COMPRADORES as AMOSTRA_DE_IDADES } from "@/reports/event-dataset";
import type { Comprador, Dataset, FatoVenda, PeriodoSelecionado } from "@/reports/event-dataset";
import { useDatasetDoEvento } from "./vendas-banco";
import { useEventoDosRelatorios } from "./event";
import { TAXA_DE_RESPOSTA, fracoesDoQuestionario } from "./questionarios";
import { eventos as eventosDaOrganizacao, useEventoAtual, useEventosVersao } from "../../eventos/data/eventos";
import { useTodosOsEventos } from "../../components/escopo-dos-relatorios";

export type { Dataset, PeriodoSelecionado } from "@/reports/event-dataset";
export type { Consulta } from "./relatorio-query";

/* ------------------------------ Blocos ---------------------------- */

export type Formato = "moeda" | "numero" | "pct";

export type Bloco =
    | { tipo: "metric"; titulo: string; valor: string; ajuda?: string }
    | { tipo: "medidor"; titulo: string; pct: number; detalhe?: string }
    | { tipo: "barras"; titulo: string; formato?: Formato; dados: { nome: string; valor: number }[] }
    | { tipo: "linha"; titulo: string; formato?: Formato; dados: { nome: string; valor: number }[] }
    | { tipo: "pizza"; titulo: string; dados: { nome: string; valor: number }[] }
    | { tipo: "tabela"; titulo: string; colunas: string[]; linhas: (string | number)[][] }
    // Dispersão para inferência: pontos pareados + reta de regressão (ajuste) + coeficiente r.
    | { tipo: "dispersao"; titulo: string; dados: { x: number; y: number }[]; rotuloX: string; rotuloY: string; r: number; ajuste: { a: number; b: number }; formatoX?: Formato; formatoY?: Formato; ajuda?: string }
    | { tipo: "texto"; titulo?: string; conteudo: string };

export interface RespostaIA {
    resposta: string;
    blocos: Bloco[];
    sugestoes?: string[];
}

export interface Mensagem {
    autor: "user" | "assistant";
    texto: string;
}

/* ------------------------- Fonte de dados ------------------------- */

/** Dados do evento em contexto para as consultas e features do relatório. */
export interface FonteDoRelatorio {
    /** Nome do evento (ou "Todos os eventos"). */
    nome: string;
    todos: boolean;
    /** Janela completa de vendas: período inicial do filtro. */
    periodoPadrao: { start: CalendarDate; end: CalendarDate };
    /** Sem nenhuma venda no escopo. */
    vazio: boolean;
    /** Resumo agregado do período (mesmo formato do dataset estático de `src/reports`). */
    consultar: (periodo: PeriodoSelecionado) => Dataset;
    /** Linhas dia × setor do período, para o motor de consulta genérico. */
    linhas: (periodo: PeriodoSelecionado) => FatoVenda[];
    extras: ExtrasDoRelatorio;
}

const p2 = (n: number) => String(n).padStart(2, "0");
const br = (d: Date) => `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`;
const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
function makeRng(seed: number) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const NOME_DO_MEIO: Record<string, string> = { pix: "Pix", credito: "Cartão de crédito", debito: "Cartão de débito", dinheiro: "Dinheiro", saldo: "Saldo da produtora", cortesia: "Cortesia" };
const NOME_DO_CANAL: Record<string, string> = { online: "Online", site: "Online", link: "Online", app: "Online", bilheteria: "Bilheteria", cortesia: "Cortesia" };

interface Escopo {
    eventos: Evento[];
    historicos: Record<string, HistoricoVendas | undefined>;
    /** Pedidos pagos dos eventos do escopo. */
    pagos: Pedido[];
    todos: boolean;
}

/** Proporções (meios, canais) somando o histórico e os pedidos pagos do escopo. */
function proporcoes(escopo: Escopo) {
    const meios = new Map<string, number>();
    const canais = new Map<string, number>();
    const somar = (m: Map<string, number>, k: string, v: number) => v > 0 && m.set(k, (m.get(k) ?? 0) + v);
    for (const e of escopo.eventos) {
        const h = escopo.historicos[e.id];
        if (!h) continue;
        for (const p of h.pagamentos ?? []) somar(meios, p.tipo.charAt(0).toUpperCase() + p.tipo.slice(1).toLowerCase(), p.qtd);
        for (const [c, v] of Object.entries(h.porCanal ?? {})) somar(canais, NOME_DO_CANAL[c] ?? c, v);
    }
    for (const p of escopo.pagos) {
        if (p.pagamento) somar(meios, NOME_DO_MEIO[p.pagamento.metodo] ?? p.pagamento.metodo, 1);
        somar(canais, NOME_DO_CANAL[p.canal] ?? p.canal, p.itens.reduce((n, i) => n + i.quantidade, 0));
    }
    const total = (m: Map<string, number>) => [...m.values()].reduce((s, v) => s + v, 0);
    return { meios, totalMeios: total(meios), canais, totalCanais: total(canais) };
}

/**
 * Ajusta ao escopo o que `agregar` ainda tira do dataset estático: questionário (perguntas do
 * próprio evento, coerente com Respostas do questionário), meios de pagamento e canais (histórico
 * + pedidos pagos) e demografia (proporções da amostra estática, escaladas às vendas do período).
 */
function ajustarAoEscopo(d: Dataset, escopo: Escopo, prop: ReturnType<typeof proporcoes>): Dataset {
    const vendido = d.ocupacao.vendido;

    // Questionário: cada evento pesa pela sua parte dos ingressos vendidos (histórico por lote).
    const vendidosDe = (e: Evento) => Object.values(escopo.historicos[e.id]?.porLote ?? {}).reduce((s, v) => s + v, 0);
    const somaVendidos = escopo.eventos.reduce((s, e) => s + vendidosDe(e), 0);
    let respondentes = 0;
    const porPergunta: { pergunta: string; respostas: number }[] = [];
    for (const e of escopo.eventos) {
        if (!e.perguntas?.length) continue;
        const peso = somaVendidos ? vendidosDe(e) / somaVendidos : 1 / escopo.eventos.length;
        const f = fracoesDoQuestionario(e, escopo.historicos[e.id]);
        respondentes += vendido * peso * TAXA_DE_RESPOSTA * f.fracaoComPergunta;
        for (const q of f.perguntas)
            porPergunta.push({ pergunta: escopo.todos ? `${q.titulo} (${e.nome})` : q.titulo, respostas: Math.round(vendido * peso * TAXA_DE_RESPOSTA * q.fracao * q.taxa) });
    }
    respondentes = Math.round(respondentes);

    const ordens = d.transacoes.porStatus.reduce((s, x) => s + x.quantidade, 0);
    const escalar = <T extends { itens: number; faturamento: number }>(arr: T[]) => {
        const si = arr.reduce((s, x) => s + x.itens, 0) || 1;
        const sf = arr.reduce((s, x) => s + x.faturamento, 0) || 1;
        return arr.map((x) => ({ ...x, itens: Math.round((x.itens / si) * d.totais.itensVendidos), faturamento: Math.round((x.faturamento / sf) * d.totais.valorTotalBruto) }));
    };

    return {
        ...d,
        meiosDePagamento: prop.totalMeios ? [...prop.meios.entries()].sort((a, b) => b[1] - a[1]).map(([meio, v]) => ({ meio, pct: Math.round((v / prop.totalMeios) * 100) })) : [],
        transacoes: {
            ...d.transacoes,
            porCanal: prop.totalCanais ? [...prop.canais.entries()].sort((a, b) => b[1] - a[1]).map(([canal, v]) => ({ canal, quantidade: Math.round((v / prop.totalCanais) * ordens) })) : [],
        },
        questionarios: {
            respondentes,
            enviados: vendido,
            taxaRespostaPct: vendido ? Math.round((respondentes / vendido) * 100) : 0,
            porPergunta,
        },
        demografia: { porFaixa: escalar(d.demografia.porFaixa), porUf: escalar(d.demografia.porUf).filter((u) => u.itens > 0) },
    };
}

/**
 * Linhas dia × setor do período, refeitas do agregado: o dia a dia é dividido entre os setores
 * (e as categorias sem setor) pela participação de cada um no período. Somam exatamente os totais
 * por dia, por setor e por categoria, que é o que o motor de consulta cruza (uma dimensão por vez).
 */
function linhasDoAgregado(d: Dataset): FatoVenda[] {
    const partes: { categoria: string; grupo: string; itens: number; valor: number }[] = d.ingressosPorGrupo.map((g) => ({ categoria: "Ingressos", grupo: g.grupo, itens: g.vendido, valor: g.valor }));
    for (const m of d.mixDeReceita) {
        const jaContado = partes.filter((x) => x.categoria === m.grupo);
        const itens = m.quantidade - jaContado.reduce((s, x) => s + x.itens, 0);
        const valor = m.valor - jaContado.reduce((s, x) => s + x.valor, 0);
        if (itens > 0 || valor > 0) partes.push({ categoria: m.grupo, grupo: m.grupo === "Ingressos" ? "Outros ingressos" : m.grupo, itens: Math.max(0, itens), valor: Math.max(0, valor) });
    }
    const totalItens = partes.reduce((s, x) => s + x.itens, 0) || 1;
    const totalValor = partes.reduce((s, x) => s + x.valor, 0) || 1;
    const liquidoPorBruto = d.totais.valorTotalBruto ? d.totais.valorTotalComDesconto / d.totais.valorTotalBruto : 1;
    return d.vendasDiarias.flatMap((dia, i) =>
        partes.map((x) => {
            const receitaBruta = (dia.valor * x.valor) / totalValor;
            return { iso: "", data: dia.dia, ms: i, categoria: x.categoria, grupo: x.grupo, itens: (dia.itens * x.itens) / totalItens, receitaBruta, receitaLiquida: receitaBruta * liquidoPorBruto };
        }),
    );
}

/** Amostra fictícia de compradores: setor pelas vendas, idade da amostra estática (um pouco mais alta nos setores caros), valor perto do preço médio do setor. */
function compradoresDe(d: Dataset, semente: string): Comprador[] {
    const grupos = d.ingressosPorGrupo.filter((g) => g.vendido > 0).map((g) => ({ ...g, preco: g.valor / g.vendido }));
    if (!grupos.length || !AMOSTRA_DE_IDADES.length) return [];
    const porPreco = [...grupos].sort((a, b) => a.preco - b.preco).map((g) => g.grupo);
    const total = grupos.reduce((s, g) => s + g.vendido, 0);
    const r = makeRng(hash(semente));
    return Array.from({ length: 2400 }, () => {
        let x = r() * total;
        let g = grupos[grupos.length - 1];
        for (const c of grupos) {
            if (x < c.vendido) {
                g = c;
                break;
            }
            x -= c.vendido;
        }
        const base = AMOSTRA_DE_IDADES[Math.floor(r() * AMOSTRA_DE_IDADES.length)];
        const rank = porPreco.length > 1 ? porPreco.indexOf(g.grupo) / (porPreco.length - 1) : 0.5;
        return { idade: Math.max(16, base.idade + Math.round(rank * 6 - 3)), uf: base.uf, grupo: g.grupo, valor: Math.round(g.preco * (0.85 + r() * 0.3)) };
    });
}

function extrasDe(escopo: Escopo, d: Dataset, semente: string, organizacao: { repasses?: Repasse[]; contasFavorecidas?: { id: string; titular: string; tipo: string; chavePix?: string; banco?: string; agencia?: string; conta?: string }[] } | undefined, daOrganizacao: Evento[], historicos: Record<string, HistoricoVendas | undefined>, pedidos: Pedido[]): ExtrasDoRelatorio {
    const ids = new Set(escopo.eventos.map((e) => e.id));

    // Lotes: vendidos no histórico + pedidos pagos.
    const pagosPorLote = new Map<string, number>();
    for (const p of escopo.pagos) for (const i of p.itens) if (i.loteId) pagosPorLote.set(i.loteId, (pagosPorLote.get(i.loteId) ?? 0) + i.quantidade);
    const lotes = escopo.eventos.flatMap((e) =>
        e.sessoes.flatMap((s) =>
            s.grupos.flatMap((g) =>
                g.ingressos.flatMap((t) =>
                    t.lotes.map((l) => ({
                        lote: `${escopo.todos ? `${e.nome}: ` : ""}${g.nome}, ${t.nome}, ${l.nome}`,
                        vendidos: (escopo.historicos[e.id]?.porLote[l.id] ?? 0) + (pagosPorLote.get(l.id) ?? 0),
                        preco: l.preco,
                    })),
                ),
            ),
        ),
    ).filter((l) => l.vendidos > 0);

    // Repasses (Finanças) que tocam os eventos do escopo.
    const repasses = (organizacao?.repasses ?? []).filter((r) => r.liquidacoes.some((l) => ids.has(l.eventoId)));
    const contas = new Map((organizacao?.contasFavorecidas ?? []).map((c) => [c.id, c]));
    const quando = (r: Repasse) => r.concluidoEm ?? r.dataPrevista;
    const dataDe = (s: string) => {
        const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
    };
    const pagamentos = repasses
        .filter((r) => r.status === "pago")
        .sort((a, b) => quando(b).localeCompare(quando(a)))
        .map((r) => {
            const c = contas.get(r.contaId);
            const conta = !c ? "—" : c.tipo === "pix" ? `Pix ${c.chavePix ?? ""}`.trim() : [c.banco, c.agencia && `ag. ${c.agencia}`, c.conta && `conta ${c.conta}`].filter(Boolean).join(", ") || "—";
            return { data: dataDe(quando(r)), favorecido: c?.titular ?? r.solicitante, conta, valor: r.valorTransferido };
        });
    const repassado = repasses
        .filter((r) => r.status !== "cancelado" && r.status !== "rejeitado" && r.status !== "falhou")
        .reduce((s, r) => s + r.liquidacoes.filter((l) => ids.has(l.eventoId)).reduce((t, l) => t + l.valor, 0), 0);

    // Vendas do ano corrente por evento da organização (dias do histórico no ano + pedidos pagos no ano).
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const vendasDoAno = {
        ano,
        eventos: daOrganizacao.map((e) => {
            const serie = historicos[e.id]?.serie ?? [];
            const doHistorico = serie.reduce((s, [, , fat], i) => {
                const dia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - (serie.length - i));
                return dia.getFullYear() === ano ? s + fat : s;
            }, 0);
            const dosPedidos = pedidos
                .filter((p) => p.eventoId === e.id && p.status === "pago" && new Date(p.pagamento?.pagoEm ?? p.atualizadoEm).getFullYear() === ano)
                .reduce((s, p) => s + p.subtotal, 0);
            return { nome: e.nome, valor: doHistorico + dosPedidos };
        }),
    };

    return { compradores: compradoresDe(d, semente), lotes, pagamentos, repassado, vendasDoAno };
}

/** Fonte do Relatório personalizado: o evento em contexto, ou todos os eventos da organização (BKS-27). */
export function useFonteDoRelatorio(): FonteDoRelatorio {
    const dataset = useDatasetDoEvento();
    const evento = useEventoDosRelatorios();
    const nome = evento.nome;
    const ctx = useEventoAtual();
    const todos = useTodosOsEventos();
    const { tabelas } = useBanco();
    const versao = useEventosVersao();
    return useMemo<FonteDoRelatorio>(() => {
        const daOrganizacao = eventosDaOrganizacao.map((e) => tabelas.eventos[e.id]).filter((e): e is Evento => !!e);
        const eventos = todos ? daOrganizacao : [tabelas.eventos[ctx.id]].filter((e): e is Evento => !!e);
        const ids = new Set(eventos.map((e) => e.id));
        const pedidos = Object.values(tabelas.pedidos ?? {});
        const escopo: Escopo = { eventos, historicos: tabelas.historico ?? {}, pagos: pedidos.filter((p) => ids.has(p.eventoId) && p.status === "pago"), todos };
        const prop = proporcoes(escopo);
        const consultar = (periodo: PeriodoSelecionado) => ajustarAoEscopo(dataset.consultar(periodo), escopo, prop);
        const primeiro = eventos[0];
        const organizacao = primeiro ? tabelas.organizacoes?.[organizacaoDoEvento(primeiro)] : undefined;
        const semente = `${todos}|${[...ids].join(",")}`;
        return {
            nome,
            todos,
            periodoPadrao: dataset.periodoPadrao,
            vazio: dataset.vazio,
            consultar,
            linhas: (periodo: PeriodoSelecionado) => linhasDoAgregado(consultar(periodo)),
            extras: eventos.length ? extrasDe(escopo, consultar(null), semente, organizacao, daOrganizacao, tabelas.historico ?? {}, pedidos) : EXTRAS_VAZIOS,
        };
    }, [dataset, nome, ctx.id, todos, tabelas, versao]);
}

/* ---------------------------- OpenRouter -------------------------- */

export const MODELO_PADRAO = "tencent/hy3:free";

export const getApiKey = (): string =>
    (import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined) || localStorage.getItem("openrouter_key") || "";
export const setApiKey = (k: string) => localStorage.setItem("openrouter_key", k.trim());
export const getModelo = (): string =>
    localStorage.getItem("openrouter_model") || (import.meta.env.VITE_OPENROUTER_MODEL as string | undefined) || MODELO_PADRAO;
export const setModelo = (m: string) => localStorage.setItem("openrouter_model", m.trim());

/** Rótulos de dia + referências relativas a partir do resumo. */
const datasDoDataset = (dataset: Dataset) => {
    const dias = dataset.vendasDiarias.map((d) => d.dia);
    return { hoje: dias[dias.length - 1] ?? "", ontem: dias[dias.length - 2] ?? "", dias };
};

const SYSTEM = (dataset: Dataset, fonte: FonteDoRelatorio) => {
    const datas = datasDoDataset(dataset);
    const sobre = fonte.todos ? "todos os eventos da organização somados" : `o evento "${fonte.nome}"`;
    return `Você é um analista da Ingresse. Responda perguntas do organizador sobre ${sobre} de forma CLARA e CONCISA, em português do Brasil.

CAMADA SEMÂNTICA (tabelas, campos, medidas, dimensões e funções estatísticas disponíveis — use para saber o que considerar em cada análise e qual método aplicar):
${JSON.stringify(CAMADA_SEMANTICA)}

RESUMO DOS DADOS (já do período selecionado; use apenas estes números, não invente e não cite a origem):
${JSON.stringify(dataset)}

DATAS: hoje = ${datas.hoje}; ontem = ${datas.ontem}; dias disponíveis = ${JSON.stringify(datas.dias)}.
Interprete termos relativos (hoje, ontem, anteontem, "dia 20") mapeando para os dias disponíveis. Se pedirem um dia sem dados (ex.: amanhã), diga isso na resposta.

Responda SOMENTE com um JSON válido (sem markdown):
{"consultas":[{"titulo":"...","medida":"...","dimensao":"...|null","agregacao":"soma|media|mediana|min|max|desvio","acumulado":false,"grafico":"auto","limite":0}],"sugestoes":["ideia 1","ideia 2","ideia 3"]}

MOTOR DE CONSULTA (combine livremente — cobre qualquer pergunta):
- medida: faturamento | faturamentoLiquido | desconto | itens | ticketMedio | ocupacao | validados | taxaValidacao | checkins | transacoes | valorTransacoes | transferencias | churn | respostas | taxaResposta | meioPagamento | bordero
- dimensao (opcional): dia | grupo | categoria | meioPagamento | status | canal | portao | faixaHorario | pergunta | faixaEtaria | uf | null (número único)
- acumulado: true = soma corrida no tempo (ex.: faturamento acumulado = {medida:"faturamento",dimensao:"dia",acumulado:true})
- agregacao: para um número único sobre a série diária (media/mediana/desvio/min/max); default soma
- grafico: "auto" (recomendado) escolhe pelo formato; ou linha/barras/pizza/medidor/metric/tabela
- limite: top N quando a dimensão é categórica (ranking)

Regras:
- Identifique TODAS as solicitações da mensagem. Para CADA uma gere UMA consulta. N pedidos → N consultas. Não repita consultas idênticas.
- Escolha medida+dimensão que respondem ao pedido, guiando-se pela CAMADA SEMÂNTICA (tabelas, campos e funções). Ex.: "taxa de acesso por tipo de ingresso" → {medida:"taxaValidacao",dimensao:"grupo"}.
- Relatórios empacotados (vários blocos): pode usar "chamadas":[{"feature":"nome","args":{}}] com as FEATURES abaixo (ex.: totais, bordero, questionarios, transferencias).
- NÃO escreva texto/resposta; entregue só os gráficos. Em "sugestoes", proponha 3 novas análises úteis e diferentes.

FEATURES (opcionais, relatórios empacotados): ${JSON.stringify(CATALOGO)}`;
};

/** Um único elemento por solicitação: prioriza o gráfico; senão o primeiro bloco. */
function umBloco(blocos: Bloco[]): Bloco[] {
    if (blocos.length <= 1) return blocos;
    const grafico = blocos.find((b) => b.tipo === "barras" || b.tipo === "linha" || b.tipo === "pizza" || b.tipo === "medidor" || b.tipo === "tabela" || b.tipo === "dispersao");
    return [grafico ?? blocos[0]];
}

/** Monta a resposta final a partir do texto do modelo. Uma consulta/chamada = um gráfico; N solicitações = N gráficos. */
function finalize(conteudo: string, dataset: Dataset, linhas: FatoVenda[], extras: ExtrasDoRelatorio): RespostaIA {
    const plano = extrairJson(conteudo);
    if (!plano) return { resposta: "", blocos: [], sugestoes: DEFAULT_SUGESTOES };
    const deConsultas = (plano.consultas ?? []).map((c) => executarConsulta(c, dataset, linhas));
    const deFeatures = (plano.chamadas ?? []).flatMap((c) => umBloco(executarChamada(c, dataset, extras)));
    return { resposta: plano.resposta ?? "", blocos: [...deConsultas, ...deFeatures], sugestoes: plano.sugestoes ?? DEFAULT_SUGESTOES };
}

const DEFAULT_SUGESTOES = ["Mostre as vendas por dia", "Distribuição por meio de pagamento", "Estatísticas do faturamento diário", "Top grupos por receita"];

interface ChatMsg {
    role: "system" | "user" | "assistant" | "tool";
    content: string | null;
    tool_call_id?: string;
    name?: string;
    tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
}

interface PlanoIA {
    resposta?: string;
    consultas?: Consulta[];
    chamadas?: Chamada[];
    sugestoes?: string[];
}

function extrairJson(txt: string): PlanoIA | null {
    const limpo = txt.replace(/```json/gi, "").replace(/```/g, "").trim();
    const ini = limpo.indexOf("{");
    const fim = limpo.lastIndexOf("}");
    if (ini === -1 || fim === -1) return null;
    try {
        return JSON.parse(limpo.slice(ini, fim + 1)) as PlanoIA;
    } catch {
        return null;
    }
}

const URL = "https://openrouter.ai/api/v1/chat/completions";

/** POST ao OpenRouter com timeout. */
async function post(model: string, body: Record<string, unknown>, key: string): Promise<Record<string, unknown>> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    try {
        const resp = await fetch(URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${key}`,
                "Content-Type": "application/json",
                "HTTP-Referer": window.location.origin,
                "X-Title": "Ingresse - Relatorio personalizado",
            },
            body: JSON.stringify({ model, ...body }),
            signal: ctrl.signal,
        });
        if (!resp.ok) {
            const detalhe = await resp.text().catch(() => "");
            throw new Error(`HTTP ${resp.status}: ${detalhe.slice(0, 200)}`);
        }
        return await resp.json();
    } finally {
        clearTimeout(timer);
    }
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Roteia UMA parte da mensagem para uma consulta (motor genérico) ou feature (relatório empacotado). */
function rotearParte(parte: string, datas: { hoje: string; ontem: string }): Chamada | Consulta {
    const q = parte.toLowerCase();
    const has = (...w: string[]) => w.some((x) => q.includes(x));
    const ehItens = has("ingresso", "ingressos") && !has("faturamento", "receita", "valor", "r$");

    if (has("hoje")) return { feature: "metrica_dia", args: { dia: datas.hoje } };
    if (has("ontem")) return { feature: "metrica_dia", args: { dia: datas.ontem } };
    // Motor genérico para os casos que o catálogo fixo não cobre:
    if (has("acumul")) return { medida: ehItens ? "itens" : "faturamento", dimensao: "dia", acumulado: true };
    if (has("acesso", "valida", "check-in", "checkin", "check in") && has("tipo", "grupo", "ingresso", "categoria", "setor"))
        return { medida: "taxaValidacao", dimensao: "grupo" };

    /* ---- Perguntas frequentes do produtor (respostas mockadas) ---- */
    // Gênero: "quantos homens e mulheres".
    if (has("gênero", "genero", "homens", "mulheres", "masculino", "feminino", "sexo")) return { feature: "genero" };
    // Vendas por lote.
    if (has("lote", "lotes")) return { feature: "vendas_por_lote" };
    // Total vendido no ano somando todos os eventos.
    if (has("todos os eventos", "todos os meus eventos", "todos meus eventos") || (has("ano") && has("evento", "vendi", "ingresso", "total")))
        return { feature: "vendas_ano" };
    // Saldo disponível para repasse (antes de borderô, que também usa "repasse").
    if (has("saldo") || has("disponível para repass", "disponivel para repass", "para executar pagament")) return { feature: "saldo_repasse" };
    // Últimos pagamentos realizados (antes de "meio/pagamento" e "transfer").
    if (has("favorecid") || (has("pagamento", "pagamentos") && has("últim", "ultim", "realiza", "fizemos", "realizamos", "5 ")))
        return { feature: "ultimos_pagamentos" };
    if (has("correla", "relação entre", "relacao entre")) {
        const medidas: string[] = [];
        if (has("idade", "faixa etária", "faixa etaria")) medidas.push("idade");
        if (has("grupo", "setor", "tipo de ingresso")) medidas.push("grupo");
        if (has("ticket")) medidas.push("ticket");
        if (medidas.length < 2 && has("fatur", "receita", "valor", "r$")) medidas.push("valor");
        if (medidas.length < 2 && has("ingresso", "itens")) medidas.push("itens");
        if (medidas.length < 2 && has("dia", "tempo", "campanha", "cresc")) medidas.push("dia");
        const a = medidas[0] ?? "itens";
        const b = medidas[1] ?? (a === "valor" ? "itens" : "valor");
        return { feature: "correlacao", args: { a, b } };
    }
    // Demografia: faixa etária / localização (UF) → consulta genérica.
    if (has("faixa etária", "faixa etaria", "idade", "geração", "geracao"))
        return { medida: ehItens ? "itens" : "faturamento", dimensao: "faixaEtaria" };
    if (has("estado", "uf", "localiz", "região", "regiao", "por cidade"))
        return { medida: ehItens ? "itens" : "faturamento", dimensao: "uf" };
    if (has("ocupa", "lota")) return { feature: "ocupacao" };
    if (has("portão", "portao", "portões", "portoes")) return { feature: "acesso_portao" };
    if (has("horário", "horario", "fluxo", "por hora", "pico")) return { feature: "acesso_horario" };
    if (has("acesso", "valida", "check-in", "checkin", "check in", "entrada", "entraram", "compareci", "presenç", "presenc", "público presente")) return { feature: "acesso_validacao" };
    if (has("status", "aprovad", "cancelad", "estorn", "reembol", "pendente")) return { feature: "transacoes_status", args: { metrica: has("valor", "receita", "faturamento") ? "valor" : "quantidade" } };
    if (has("canal", "online", "bilheteria", "offline")) return { feature: "transacoes_canal" };
    if (has("meio", "pagamento", "pix", "cart", "boleto")) return { feature: "distribuicao", args: { dimensao: "meios" } };
    if (has("transfer", "churn")) return { feature: "transferencias" };
    if (has("question", "pesquisa", "respost", "formulá", "formula")) return { feature: "questionarios" };
    if (has("borderô", "bordero", "repasse", "taxa retid")) return { feature: "bordero" };
    if (has("estat", "média", "media", "mediana", "desvio", "tend")) return { feature: "estatisticas_vendas", args: { metrica: ehItens ? "itens" : "valor" } };
    if (has("ranking", "top", "mais vend", "melhores grupo", "maiores grupo")) return { feature: "ranking_grupos", args: { metrica: has("receita", "faturamento", "valor") ? "valor" : "vendido" } };
    if (has("por dia", "cada dia", "dia a dia", "por data", "diá", "diario", "ao longo", "evolu", "linha do tempo", "quando vend", "vendas diárias", "vendas diarias")) return { feature: "serie_vendas", args: { metrica: ehItens ? "itens" : "valor" } };
    if (has("mix", "receita por grupo", "composi", "combos", "produtos")) return { feature: "distribuicao", args: { dimensao: "mix" } };
    if (has("grupo", "setor")) return { feature: "distribuicao", args: { dimensao: "grupos" } };
    if (has("ticket")) return { feature: "metrica", args: { kpi: "ticketMedio" } };
    if (has("desconto")) return { feature: "metrica", args: { kpi: "desconto" } };
    if (has("item", "itens")) return { feature: "metrica", args: { kpi: "itens" } };
    if (has("com desconto", "líquido", "liquido")) return { feature: "metrica", args: { kpi: "valorLiquido" } };
    return { feature: "metrica", args: { kpi: "valorBruto" } };
}

/**
 * Perguntas frequentes do produtor: têm resposta mockada determinística e
 * NÃO devem passar pelo LLM (que tende a confundir "pagamentos" com "meios de
 * pagamento", etc.). São sempre roteadas localmente pelo `rotearParte`.
 */
export function ehPerguntaFrequente(texto: string): boolean {
    return /homens e mulheres|g[êe]nero|favorecid|pagamento[s]? (que|realiz|fizemos)|[úu]ltimos?\s*\d*\s*pagamento|saldo|por lote|ao longo do ano|todos os (meus )?eventos/i.test(texto);
}

/** Modo demonstração: divide a mensagem em N solicitações e gera um gráfico por solicitação. */
export function responderLocal(historico: Mensagem[], dataset: Dataset, linhas: FatoVenda[], extras: ExtrasDoRelatorio = EXTRAS_VAZIOS): RespostaIA {
    const q = historico.filter((m) => m.autor === "user").pop()?.texto || "";
    const datas = datasDoDataset(dataset);
    // Correlação/relação é um pedido único — não dividir no " e " (ex.: "idade e grupo").
    const ehCorrelacao = /correla|rela[cç][aã]o entre/i.test(q);
    // Perguntas frequentes também são pedido único (têm vírgulas/"e" internos: "homens e mulheres", "favorecidos, e valores").
    const partes = ehCorrelacao || ehPerguntaFrequente(q)
        ? [q]
        : q
              .split(/\s+e\s+|,|;|\btambém\b|\bmais\b/i)
              .map((s) => s.trim())
              .filter((s) => s.length > 1);
    const alvo = partes.length ? partes : [q];

    // Um pedido por parte (consulta OU feature), sem duplicar.
    const chave = (p: Chamada | Consulta) => ("medida" in p ? `c:${p.medida}:${p.dimensao ?? ""}:${p.acumulado ?? ""}` : `f:${p.feature}:${JSON.stringify(p.args ?? {})}`);
    const pedidos: (Chamada | Consulta)[] = [];
    for (const parte of alvo) {
        const p = rotearParte(parte, datas);
        if (!pedidos.some((x) => chave(x) === chave(p))) pedidos.push(p);
    }
    const blocos = pedidos.flatMap((p) => ("medida" in p ? [executarConsulta(p, dataset, linhas)] : umBloco(executarChamada(p, dataset, extras))));
    return { resposta: "", blocos, sugestoes: DEFAULT_SUGESTOES };
}

/** Tempo extra de loading (ms) para valorizar a animação cymatics de geração. */
const LOADING_EXTRA_MS = 2000;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Dispatcher: OpenRouter (se houver chave) → modo demonstração local. Recebe o período e resolve os dados na fonte do evento. */
export async function chamarIA(historico: Mensagem[], periodo: PeriodoSelecionado, fonte: FonteDoRelatorio): Promise<RespostaIA> {
    const dataset = fonte.consultar(periodo);
    const linhas = fonte.linhas(periodo);
    const orKey = getApiKey();
    // Perguntas frequentes → resposta determinística (não depende do LLM).
    const ultimaUser = historico.filter((m) => m.autor === "user").pop()?.texto || "";
    const usarLocal = !orKey || ehPerguntaFrequente(ultimaUser);
    const res = usarLocal ? responderLocal(historico, dataset, linhas, fonte.extras) : await chamarOpenRouter(historico, dataset, linhas, fonte, orKey);
    // Segura o loading +2s para mostrar mais a animação de geração do gráfico.
    await delay(LOADING_EXTRA_MS);
    return res;
}

async function chamarOpenRouter(historico: Mensagem[], dataset: Dataset, linhas: FatoVenda[], fonte: FonteDoRelatorio, key: string): Promise<RespostaIA> {
    const { extras } = fonte;
    const baseMsgs: ChatMsg[] = [
        { role: "system", content: SYSTEM(dataset, fonte) },
        ...historico.map((m) => ({ role: m.autor === "user" ? ("user" as const) : ("assistant" as const), content: m.texto })),
    ];

    // Modelo escolhido + fallbacks gratuitos (JSON, sem tools).
    const modelos = [...new Set([getModelo(), "google/gemma-2-9b-it:free", "meta-llama/llama-3.3-70b-instruct:free"])];

    let ultimoErro: unknown;
    for (const model of modelos) {
        try {
            const data: any = await post(model, { messages: baseMsgs, temperature: 0.2 }, key);
            const conteudo: string = data?.choices?.[0]?.message?.content ?? "";
            const res = finalize(conteudo, dataset, linhas, extras);
            // Sempre entregar algo visual: se a IA não gerou blocos, o sistema gera a partir da pergunta.
            if (!res.blocos.length) {
                const local = responderLocal(historico, dataset, linhas, extras);
                if (local.blocos.length) return { ...local, resposta: res.resposta || local.resposta };
            }
            if (res.blocos.length) return res;
        } catch (e) {
            ultimoErro = e;
        }
    }
    // Todos os modelos falharam → não deixa o usuário sem resposta: roteia localmente.
    if (ultimoErro) return responderLocal(historico, dataset, linhas, extras);
    throw new Error("Falha ao consultar a IA.");
}
