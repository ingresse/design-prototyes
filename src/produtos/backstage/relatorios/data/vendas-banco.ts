import { useMemo } from "react";
import { CalendarDate, getLocalTimeZone } from "@internationalized/date";
import { useBanco, useDoc, type Evento, type HistoricoVendas, type Pedido } from "@/plataforma";
import { agregar, type ContextoDataset, type FatoVenda, type PeriodoSelecionado } from "@/reports/event-dataset";
import { eventos as eventosEspelho, useEventoAtual, useEventosVersao } from "../../eventos/data/eventos";
import { useTodosOsEventos } from "../../components/escopo-dos-relatorios";

/* ------------------------------------------------------------------ */
/*  Dataset de vendas do evento em contexto, lido do banco unificado.  */
/*                                                                     */
/*  Mesmo formato do dataset estático (src/reports): tabela-fato dia × */
/*  grupo agregada por `agregar`. Fontes: vendas anteriores ao gêmeo   */
/*  (historico) e pedidos pagos. Usado por Vendas e Borderô.           */
/* ------------------------------------------------------------------ */

const p2 = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const isoParaMs = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d).getTime();
};
const isoParaLabel = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
const isoParaBr = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
const calendario = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new CalendarDate(y, m, d);
};

/** Grupo (setor) de cada lote do evento, com capacidade e preço médio por nome de grupo. */
function mapaDoCatalogo(evento: Evento, nomeDoGrupo: (g: string) => string = (g) => g) {
    const grupoDoLote = new Map<string, string>();
    const precoDoLote = new Map<string, number>();
    const grupos = new Map<string, { capacidade: number; somaPreco: number; lotes: number }>();
    for (const s of evento.sessoes)
        for (const g of s.grupos)
            for (const t of g.ingressos)
                for (const l of t.lotes) {
                    grupoDoLote.set(l.id, nomeDoGrupo(g.nome));
                    precoDoLote.set(l.id, l.preco);
                    const nome = nomeDoGrupo(g.nome);
                    const atual = grupos.get(nome) ?? { capacidade: 0, somaPreco: 0, lotes: 0 };
                    atual.capacidade += l.quantidade;
                    atual.somaPreco += l.preco;
                    atual.lotes += 1;
                    grupos.set(nome, atual);
                }
    return { grupoDoLote, precoDoLote, grupos };
}

/** Uso de cupom num pedido pago, por item: base da tabela de cupons de Vendas (REL-213). */
export interface FatoCupom {
    iso: string;
    ms: number;
    /** Código do cupom (no escopo "Todos os eventos", com o nome do evento). */
    cupom: string;
    /** Item do pedido ("Inteira · 1º lote"). */
    item: string;
    quantidade: number;
    valor: number;
    desconto: number;
}

/** Linha de um detalhamento: quantidade, bruto e líquido (bruto − desconto do cupom). */
export interface LinhaDoDetalhe {
    nome: string;
    quantidade: number;
    bruto: number;
    liquido: number;
}

/**
 * Detalhe do período, das mesmas linhas que os totais (REL-213): mix por categoria, ingressos por
 * grupo, combos, produtos e cupons, todos com o desconto real dos cupons dos pedidos.
 */
export interface DetalheDoPeriodo {
    mix: LinhaDoDetalhe[];
    ingressosPorGrupo: LinhaDoDetalhe[];
    combos: LinhaDoDetalhe[];
    produtos: LinhaDoDetalhe[];
    cupons: (LinhaDoDetalhe & { itens: LinhaDoDetalhe[] })[];
}

export interface DatasetDoEvento {
    consultar: (periodo: PeriodoSelecionado) => ReturnType<typeof agregar> & { detalhe: DetalheDoPeriodo };
    periodoPadrao: { start: CalendarDate; end: CalendarDate };
    grupos: ContextoDataset["grupos"];
    vazio: boolean;
}

/** Fatos (dia × grupo) e grupos de um evento. `nomeDoGrupo` identifica o setor quando vários eventos são somados. */
function fatosDoEvento(
    evento: Evento,
    historico: HistoricoVendas | undefined,
    pedidos: Pedido[],
    nomeDoGrupo?: (g: string) => string,
    linhas = new Map<string, FatoVenda>(),
    cupons: FatoCupom[] = [],
) {
    const { grupoDoLote, precoDoLote, grupos } = mapaDoCatalogo(evento, nomeDoGrupo);
    const somar = (dia: string, grupo: string, categoria: string, itens: number, receita: number, liquida = receita) => {
        if (itens <= 0 && receita <= 0) return;
        const chave = `${dia}|${categoria}|${grupo}`;
        const atual = linhas.get(chave) ?? { iso: dia, data: isoParaLabel(dia), ms: isoParaMs(dia), categoria, grupo, itens: 0, receitaBruta: 0, receitaLiquida: 0 };
        atual.itens += itens;
        atual.receitaBruta += receita;
        atual.receitaLiquida += liquida;
        linhas.set(chave, atual);
    };

    // Histórico: o dia a dia é total; divide entre os grupos pela participação de cada um nas vendas.
    // O histórico não tem cupom: o valor c/ desconto dele é o próprio bruto.
    if (historico) {
        const porGrupo = new Map<string, { itens: number; receita: number }>();
        for (const [lote, qtd] of Object.entries(historico.porLote)) {
            const g = grupoDoLote.get(lote);
            if (!g) continue;
            const atual = porGrupo.get(g) ?? { itens: 0, receita: 0 };
            atual.itens += qtd;
            atual.receita += qtd * (precoDoLote.get(lote) ?? 0);
            porGrupo.set(g, atual);
        }
        const totalItens = [...porGrupo.values()].reduce((t, v) => t + v.itens, 0) || 1;
        const totalReceita = [...porGrupo.values()].reduce((t, v) => t + v.receita, 0) || 1;
        const hoje = new Date();
        historico.serie.forEach(([ingressos, , faturamento], i, todos) => {
            const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - (todos.length - i));
            for (const [g, v] of porGrupo) somar(iso(d), g, "Ingressos", Math.round((ingressos * v.itens) / totalItens), Math.round((faturamento * v.receita) / totalReceita));
        });
    }

    // Pedidos pagos: ingresso, combo (a linha do combo) e produto, cada um na própria categoria. O desconto
    // do cupom (já fora do total do pedido) é dividido entre as linhas pelo valor de cada uma (REL-213).
    const nome = nomeDoGrupo ?? ((g: string) => g);
    for (const p of pedidos) {
        if (p.eventoId !== evento.id || p.status !== "pago") continue;
        const dia = iso(new Date(p.pagamento?.pagoEm ?? p.atualizadoEm));
        const ativos = p.itens.filter((item) => !item.cancelado);
        const brutoDoPedido = ativos.reduce((t, item) => t + item.face * item.quantidade, 0);
        const desconto = Math.min(p.cupom?.desconto ?? 0, brutoDoPedido);
        for (const item of ativos) {
            const bruto = item.face * item.quantidade;
            const descontoDoItem = brutoDoPedido > 0 ? (desconto * bruto) / brutoDoPedido : 0;
            if (item.tipo === "ingresso" && item.loteId) somar(dia, grupoDoLote.get(item.loteId) ?? item.nome, "Ingressos", item.quantidade, bruto, bruto - descontoDoItem);
            else if (item.comboId) somar(dia, nome(item.nome), "Combos", item.quantidade, bruto, bruto - descontoDoItem);
            else somar(dia, nome(item.nome), "Produtos", item.quantidade, bruto, bruto - descontoDoItem);
            if (p.cupom && bruto > 0)
                cupons.push({
                    iso: dia,
                    ms: isoParaMs(dia),
                    cupom: nome(p.cupom.codigo),
                    item: item.detalhe ? `${item.nome} (${item.detalhe})` : item.nome,
                    quantidade: item.quantidade,
                    valor: bruto,
                    desconto: descontoDoItem,
                });
        }
    }
    return { linhas, grupos, cupons };
}

/** Soma por nome, na ordem de maior valor. */
function porNome<T>(linhas: T[], nomeDe: (l: T) => string, valores: (l: T) => { quantidade: number; bruto: number; liquido: number }): LinhaDoDetalhe[] {
    const mapa = new Map<string, LinhaDoDetalhe>();
    for (const l of linhas) {
        const n = nomeDe(l);
        const v = valores(l);
        const atual = mapa.get(n) ?? { nome: n, quantidade: 0, bruto: 0, liquido: 0 };
        atual.quantidade += v.quantidade;
        atual.bruto += v.bruto;
        atual.liquido += v.liquido;
        mapa.set(n, atual);
    }
    return [...mapa.values()].sort((a, b) => b.bruto - a.bruto);
}

/** Detalhe do período a partir das mesmas linhas que os totais (REL-213). */
function detalhar(fatos: FatoVenda[], cupons: FatoCupom[]): DetalheDoPeriodo {
    const valores = (f: FatoVenda) => ({ quantidade: f.itens, bruto: f.receitaBruta, liquido: f.receitaLiquida });
    const daCategoria = (c: string) => fatos.filter((f) => f.categoria === c);
    const ordem = ["Ingressos", "Combos", "Produtos"];
    return {
        mix: ordem.map((c) => porNome(daCategoria(c), () => c, valores)[0]).filter((l): l is LinhaDoDetalhe => !!l && l.quantidade > 0),
        ingressosPorGrupo: porNome(daCategoria("Ingressos"), (f) => f.grupo, valores),
        combos: porNome(daCategoria("Combos"), (f) => f.grupo, valores),
        produtos: porNome(daCategoria("Produtos"), (f) => f.grupo, valores),
        cupons: porNome(cupons, (c) => c.cupom, (c) => ({ quantidade: c.quantidade, bruto: c.valor, liquido: c.valor - c.desconto })).map((linha) => ({
            ...linha,
            itens: porNome(
                cupons.filter((c) => c.cupom === linha.nome),
                (c) => c.item,
                (c) => ({ quantidade: c.quantidade, bruto: c.valor, liquido: c.valor - c.desconto }),
            ),
        })),
    };
}

export function montarDataset(evento: Evento, historico: HistoricoVendas | undefined, pedidos: Pedido[]): DatasetDoEvento {
    const { linhas, grupos, cupons } = fatosDoEvento(evento, historico, pedidos);
    return datasetDe(linhas, grupos, evento.data.slice(0, 10), cupons);
}

/** Todos os eventos da organização somados (BKS-27): cada setor leva o nome do evento entre parênteses. */
export function montarDatasetDeVarios(eventos: Evento[], historicos: Record<string, HistoricoVendas | undefined>, pedidos: Pedido[]): DatasetDoEvento {
    const linhas = new Map<string, FatoVenda>();
    const cupons: FatoCupom[] = [];
    const grupos = new Map<string, { capacidade: number; somaPreco: number; lotes: number }>();
    for (const e of eventos) {
        const r = fatosDoEvento(e, historicos[e.id], pedidos, (g) => `${g} (${e.nome})`, linhas, cupons);
        for (const [nome, g] of r.grupos) grupos.set(nome, g);
    }
    const ultimoDia = eventos.map((e) => e.data.slice(0, 10)).sort().pop() ?? iso(new Date());
    return datasetDe(linhas, grupos, ultimoDia, cupons);
}

function datasetDe(linhas: Map<string, FatoVenda>, grupos: Map<string, { capacidade: number; somaPreco: number; lotes: number }>, fimEvento: string, cupons: FatoCupom[] = []): DatasetDoEvento {
    const fatos = [...linhas.values()].sort((a, b) => a.ms - b.ms);
    const ctx: ContextoDataset = {
        grupos: [
            ...[...grupos.entries()].map(([nome, g]) => ({ nome, categoria: "Ingressos", capacidade: g.capacidade, precoMedio: g.lotes ? Math.round(g.somaPreco / g.lotes) : 0, validaPct: 0.92 })),
            ...["Combos", "Produtos"].flatMap((categoria) =>
                [...new Set(fatos.filter((f) => f.categoria === categoria).map((f) => f.grupo))].map((nome) => ({ nome, categoria, capacidade: null, precoMedio: 0, validaPct: 0 })),
            ),
        ],
        capacidade: [...grupos.values()].reduce((t, g) => t + g.capacidade, 0),
        itensTotal: fatos.reduce((t, f) => t + f.itens, 0),
        vendasInicio: fatos[0] ? isoParaBr(fatos[0].iso) : isoParaBr(iso(new Date())),
        vendasFim: isoParaBr(fimEvento),
    };

    const inicio = fatos[0]?.iso ?? iso(new Date());
    const hoje = iso(new Date());
    const fim = [fimEvento, hoje, fatos[fatos.length - 1]?.iso ?? hoje].sort().pop()!;

    return {
        consultar: (periodo) => {
            const tz = getLocalTimeZone();
            const de = periodo ? periodo.start.toDate(tz).getTime() : -Infinity;
            const ate = periodo ? periodo.end.toDate(tz).getTime() + 86_400_000 - 1 : Infinity;
            const doPeriodo = fatos.filter((f) => f.ms >= de && f.ms <= ate);
            return { ...agregar(doPeriodo, ctx), detalhe: detalhar(doPeriodo, cupons.filter((c) => c.ms >= de && c.ms <= ate)) };
        },
        periodoPadrao: { start: calendario(inicio), end: calendario(fim) },
        grupos: ctx.grupos,
        vazio: fatos.length === 0,
    };
}

/** Dataset do evento em contexto, ou de todos os eventos da organização (BKS-27), refeito quando o banco muda. */
export function useDatasetDoEvento(): DatasetDoEvento {
    const ctx = useEventoAtual();
    const evento = useDoc("eventos", ctx.id);
    const { tabelas } = useBanco();
    const todos = useTodosOsEventos();
    useEventosVersao();
    return useMemo(() => {
        if (todos) {
            const daOrganizacao = eventosEspelho.map((e) => tabelas.eventos?.[e.id]).filter((e): e is Evento => !!e);
            return montarDatasetDeVarios(daOrganizacao, tabelas.historico ?? {}, Object.values(tabelas.pedidos));
        }
        if (!evento) return montarDataset({ ...ctx, slug: ctx.id, produtora: ctx.produtor, sessoes: [], taxaServico: 0.1, criadoEm: ctx.data, atualizadoEm: ctx.data }, undefined, []);
        return montarDataset(evento, tabelas.historico[evento.id], Object.values(tabelas.pedidos));
    }, [evento, tabelas, ctx, todos]);
}
