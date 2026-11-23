import { Fragment, useMemo, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { AlertFloating } from "@/components/application/alerts/alerts";
import { TabList, Tabs } from "@/components/application/tabs/tabs";
import { NativeSelect } from "@/components/base/select/select-native";
import { Badge } from "@/components/base/badges/badges";
import { cx } from "@/utils/cx";
import { BackstageLayout } from "../../components/Backstage";
import { ExportMenu, RelatorioPageHeader } from "../components/RelatorioPageHeader";
import { RelatorioFiltersProvider, useRelatorioFilters, type DateRange } from "../components/relatorio-filters";
import { AbrirDaLinha, AlternarDaArvore, DetalhesDaLinha, PainelLateral, linhaQueAbre, useLinhaAberta } from "../components/TabelaLista";
import { CarregandoRelatorio, useItemNaUrl, useLinhaFilhaAnimada, useRelatorioCarregando } from "../components/estado-dos-relatorios";
import { MetricaDoRelatorio, PainelDeMetricas } from "../components/visual-dos-relatorios";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { SortableHeader } from "../components/SortableHeader";
import { useSortableTable } from "../utils/useSortableTable";
import { currencyFormatter, dataEHora, numberFormatter } from "../data/event";
import { useDatasetDoEvento } from "../data/vendas-banco";
import { getLocalTimeZone } from "@internationalized/date";
import { useBanco, type Evento as EventoBanco, type HistoricoVendas, type Pedido as PedidoBanco } from "@/plataforma";
import { eventos as eventosDaOrganizacao, useEventoAtual, useEventosVersao } from "../../eventos/data/eventos";
import { useTodosOsEventos } from "../../components/escopo-dos-relatorios";


/* ------------------------------------------------------------------ */
/*  Tree types + helpers                                              */
/* ------------------------------------------------------------------ */

type ColType = "int" | "currency" | "text";
interface ColDef {
    label: string;
    type: ColType;
}

interface TreeNode {
    label: string;
    values?: number[];
    children?: TreeNode[];
    changed?: boolean;
}

const fmt = (value: number, type: ColType) => (type === "text" ? "-" : type === "currency" ? currencyFormatter.format(value) : numberFormatter.format(value));

const subtotalOf = (node: TreeNode): number[] => {
    if (node.values) return node.values;
    return (node.children ?? []).reduce<number[]>((acc, child) => {
        const cs = subtotalOf(child);
        return cs.map((v, i) => (acc[i] ?? 0) + v);
    }, []);
};

const grandTotalOf = (nodes: TreeNode[]): number[] =>
    nodes.reduce<number[]>((acc, node) => {
        const s = subtotalOf(node);
        return s.map((v, i) => (acc[i] ?? 0) + v);
    }, []);

/** Em subtotal, o valor unitário é o total ÷ a quantidade, não a soma dos unitários. */
const comUnitario = (values: number[], columns: ColDef[]): number[] => {
    const q = columns.findIndex((c) => c.label === "Quantidade");
    const u = columns.findIndex((c) => c.label === "Valor unitário");
    const t = columns.findIndex((c) => c.label === "Valor total");
    if (q < 0 || u < 0 || t < 0) return values;
    const out = [...values];
    out[u] = values[q] ? Math.round((values[t] / values[q]) * 100) / 100 : 0;
    return out;
};

/* ------------------------------------------------------------------ */
/*  Colunas das 3 visões                                              */
/* ------------------------------------------------------------------ */

// As três visões têm as mesmas colunas. "Bundle" e "Produto" saíram da visão macro: eram sempre "-" (REL-230).
const PDV_COLUMNS: ColDef[] = [
    { label: "Quantidade", type: "int" },
    { label: "Valor unitário", type: "currency" },
    { label: "Valor total", type: "currency" },
];
const MACRO_COLUMNS = PDV_COLUMNS;

type ChangeType = "venda" | "cancelamento" | "estorno";

interface BorderoChange {
    id: string;
    hora: string;
    tipo: ChangeType;
    canal: string;
    descricao: string;
    ingressos: number;
    produtos: number;
    valor: number;
}

const CHANGE_META: Record<ChangeType, { label: string; color: "success" | "gray" | "error" }> = {
    venda: { label: "Venda", color: "success" },
    cancelamento: { label: "Cancelamento", color: "gray" },
    estorno: { label: "Estorno", color: "error" },
};

type BorderoView = "macro" | "pdv" | "meios";

const VISOES_DO_BORDERO: { id: BorderoView; label: string }[] = [
    { id: "macro", label: "Visão macro" },
    { id: "pdv", label: "Por PDV" },
    { id: "meios", label: "Por meios de pagamento" },
];

const VIEWS: Record<BorderoView, { columns: ColDef[]; firstCol: string }> = {
    macro: { columns: MACRO_COLUMNS, firstCol: "Canal, grupo e ingresso" },
    pdv: { columns: PDV_COLUMNS, firstCol: "PDV, grupo e ingresso" },
    meios: { columns: PDV_COLUMNS, firstCol: "Canal e meio de pagamento" },
};

/* ------------------------------------------------------------------ */
/*  Vendas do evento por canal, do banco unificado                     */
/*                                                                     */
/*  Duas fontes, as mesmas de Vendas (data/vendas-banco.ts):           */
/*  - histórico (vendas anteriores ao gêmeo): o dia a dia é total, então */
/*    divide pelo canal (`porCanal`), pelo ingresso (`porLote`) e pelo  */
/*    meio de pagamento (`pagamentos`) nas proporções do próprio evento; */
/*  - pedidos pagos: canal, emissor da bilheteria e meio reais.        */
/* ------------------------------------------------------------------ */

type CanalBordero = "ONLINE" | "BILHETERIA" | "CORTESIAS";
const ORDEM_CANAIS: CanalBordero[] = ["ONLINE", "BILHETERIA", "CORTESIAS"];
const CANAL_DO_PEDIDO: Record<PedidoBanco["canal"], CanalBordero> = { site: "ONLINE", link: "ONLINE", app: "ONLINE", bilheteria: "BILHETERIA", cortesia: "CORTESIAS" };
const NOME_DO_CANAL: Record<CanalBordero, string> = { ONLINE: "Online", BILHETERIA: "Bilheteria", CORTESIAS: "Cortesias" };
const MEIO_DO_PEDIDO: Record<string, string> = { pix: "Pix", credito: "Cartão de crédito", debito: "Cartão de débito", dinheiro: "Dinheiro", saldo: "Saldo da produtora", cortesia: "Cortesia" };

/** Uma linha de venda já no período: canal, ponto de venda, grupo, item e meio. */
interface VendaBordero {
    canal: CanalBordero;
    pdv: string;
    grupo: string;
    item: string;
    meio: string;
    qtd: number;
    valor: number;
}

const DIA_MS = 86_400_000;

/** Grupo e nome do tipo de ingresso de cada lote, e o preço. */
function catalogoDoEvento(ev: EventoBanco, nomeDoGrupo: (g: string) => string) {
    const lotes = new Map<string, { grupo: string; item: string; preco: number }>();
    const grupos = new Map<string, string>();
    const tipos = new Map<string, string>();
    for (const s of ev.sessoes)
        for (const g of s.grupos) {
            grupos.set(g.id, nomeDoGrupo(g.nome));
            for (const t of g.ingressos) {
                tipos.set(t.id, t.nome);
                for (const l of t.lotes) lotes.set(l.id, { grupo: nomeDoGrupo(g.nome), item: t.nome, preco: l.preco });
            }
        }
    return { lotes, grupos, tipos };
}

/** Distribui `total` pelos pesos, arredondando pelo maior resto para a soma fechar. */
function repartir(total: number, pesos: number[]): number[] {
    const soma = pesos.reduce((a, b) => a + b, 0);
    if (!soma || !total) return pesos.map(() => 0);
    const brutos = pesos.map((p) => (total * p) / soma);
    const base = brutos.map(Math.floor);
    let resto = Math.round(total - base.reduce((a, b) => a + b, 0));
    brutos
        .map((b, i) => ({ i, f: b - Math.floor(b) }))
        .sort((a, b) => b.f - a.f)
        .forEach(({ i }) => {
            if (resto > 0) {
                base[i]++;
                resto--;
            }
        });
    return base;
}

/** Vendas do histórico no período, divididas por canal, ingresso e meio nas proporções do evento. */
function vendasDoHistorico(ev: EventoBanco, h: HistoricoVendas, de: number, ate: number, nomeDoGrupo: (g: string) => string): VendaBordero[] {
    const hoje = new Date();
    let ingressos = 0;
    let faturamento = 0;
    h.serie.forEach(([i, , f], idx, todos) => {
        const ms = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - (todos.length - idx)).getTime();
        if (ms < de || ms > ate) return;
        ingressos += i;
        faturamento += f;
    });
    if (!ingressos && !faturamento) return [];

    const { lotes } = catalogoDoEvento(ev, nomeDoGrupo);
    const porTipo = new Map<string, { grupo: string; item: string; qtd: number; valor: number }>();
    for (const [lote, qtd] of Object.entries(h.porLote)) {
        const l = lotes.get(lote);
        if (!l || qtd <= 0) continue;
        const chave = `${l.grupo}|${l.item}`;
        const atual = porTipo.get(chave) ?? { grupo: l.grupo, item: l.item, qtd: 0, valor: 0 };
        atual.qtd += qtd;
        atual.valor += qtd * l.preco;
        porTipo.set(chave, atual);
    }
    const tipos = [...porTipo.values()];
    if (tipos.length === 0) tipos.push({ grupo: nomeDoGrupo("Ingressos"), item: "Ingresso", qtd: 1, valor: 1 });

    const { online, bilheteria, cortesia } = h.porCanal;
    const pagos = online + bilheteria;
    // Quantidade nos três canais; o faturamento do histórico é só do que foi pago (cortesia sai a zero).
    const [qOnline, qBilheteria, qCortesia] = online + bilheteria + cortesia ? repartir(ingressos, [online, bilheteria, cortesia]) : [ingressos, 0, 0];
    const [vOnline, vBilheteria] = pagos ? repartir(faturamento, [online, bilheteria]) : [faturamento, 0];

    // Meios: o histórico só tem a contagem geral; dinheiro fica na bilheteria.
    const meiosOnline = h.pagamentos.filter((p) => p.tipo !== "Dinheiro" && p.qtd > 0);
    const meiosBilheteria = h.pagamentos.filter((p) => p.qtd > 0);

    const linhas: VendaBordero[] = [];
    const canal = (c: CanalBordero, qtd: number, valor: number, meios: { tipo: string; qtd: number }[]) => {
        if (!qtd && !valor) return;
        // Reparte de uma vez por ingresso × meio, para o arredondamento fechar no canal inteiro.
        const lista = meios.length ? meios : [{ tipo: "Não informado", qtd: 1 }];
        const pares = tipos.flatMap((t) => lista.map((m) => ({ t, m })));
        const qs = repartir(qtd, pares.map(({ t, m }) => t.qtd * m.qtd));
        const vs = repartir(valor, pares.map(({ t, m }) => t.valor * m.qtd));
        pares.forEach(({ t, m }, i) => {
            if (qs[i] || vs[i]) linhas.push({ canal: c, pdv: NOME_DO_CANAL[c], grupo: t.grupo, item: t.item, meio: m.tipo, qtd: qs[i], valor: vs[i] });
        });
    };
    canal("ONLINE", qOnline, vOnline, meiosOnline);
    canal("BILHETERIA", qBilheteria, vBilheteria, meiosBilheteria);
    canal("CORTESIAS", qCortesia, 0, [{ tipo: "Cortesia", qtd: 1 }]);
    return linhas;
}

/** Pedidos pagos no período: canal, emissor da bilheteria, ingresso e meio reais. */
function vendasDosPedidos(ev: EventoBanco, pedidos: PedidoBanco[], de: number, ate: number, nomeDoGrupo: (g: string) => string): VendaBordero[] {
    const { lotes, grupos, tipos } = catalogoDoEvento(ev, nomeDoGrupo);
    const linhas: VendaBordero[] = [];
    for (const p of pedidos) {
        if (p.eventoId !== ev.id || p.status !== "pago") continue;
        const ms = new Date(p.pagamento?.pagoEm ?? p.atualizadoEm).getTime();
        if (ms < de || ms > ate) continue;
        const canal = CANAL_DO_PEDIDO[p.canal];
        const pdv = canal === "BILHETERIA" ? `Bilheteria (${p.bilheteria?.emissor ?? "sem emissor"})` : NOME_DO_CANAL[canal];
        const meio = p.pagamento ? (MEIO_DO_PEDIDO[p.pagamento.metodo] ?? p.pagamento.metodo) : "Não informado";
        for (const item of p.itens) {
            const ingresso = item.tipo === "ingresso";
            const grupo = ingresso ? ((item.grupoId && grupos.get(item.grupoId)) || (item.loteId && lotes.get(item.loteId)?.grupo) || nomeDoGrupo("Ingressos")) : nomeDoGrupo("Produtos");
            const nome = ingresso ? ((item.ingressoId && tipos.get(item.ingressoId)) || item.nome) : item.nome;
            linhas.push({ canal, pdv, grupo, item: nome, meio, qtd: item.quantidade, valor: item.face * item.quantidade });
        }
    }
    return linhas;
}

interface No {
    qtd: number;
    valor: number;
    filhos: Map<string, No>;
}

/** Árvore de N níveis somando quantidade e valor; as folhas viram [qtd, unitário, total] (ou com as colunas de texto na frente). */
function arvore(vendas: VendaBordero[], niveis: ((v: VendaBordero) => string)[], ordemTopo: string[], comTexto: boolean): TreeNode[] {
    const raiz: No = { qtd: 0, valor: 0, filhos: new Map() };
    for (const v of vendas) {
        let no = raiz;
        for (const nivel of niveis) {
            const chave = nivel(v);
            const filho = no.filhos.get(chave) ?? { qtd: 0, valor: 0, filhos: new Map() };
            no.filhos.set(chave, filho);
            no = filho;
        }
        no.qtd += v.qtd;
        no.valor += v.valor;
    }
    const valores = (n: No) => {
        const unit = n.qtd ? Math.round((n.valor / n.qtd) * 100) / 100 : 0;
        return comTexto ? [0, 0, n.qtd, unit, n.valor] : [n.qtd, unit, n.valor];
    };
    const montar = (mapa: Map<string, No>, nivel: number): TreeNode[] =>
        [...mapa.entries()].map(([label, n]) => (nivel === niveis.length - 1 ? { label, values: valores(n) } : { label, children: montar(n.filhos, nivel + 1) }));
    const peso = (label: string) => {
        const i = ordemTopo.findIndex((o) => label === o || label.startsWith(`${o} (`));
        return i < 0 ? ordemTopo.length : i;
    };
    return montar(raiz.filhos, 0).sort((a, b) => peso(a.label) - peso(b.label));
}

/** Semente estável a partir de um texto (para as alterações de exemplo não mudarem a cada render). */
const semente = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const p2 = (n: number) => String(n).padStart(2, "0");
// Um formato de data só nos relatórios (T9).
const horaCurta = dataEHora;

/**
 * Alterações que mexeram no borderô: os pedidos cancelados de verdade e, para o protótipo ter o que
 * mostrar, alguns cancelamentos e estornos de exemplo feitos com ingressos que o evento vendeu.
 */
function alteracoesDoBordero(eventos: EventoBanco[], historicos: Record<string, HistoricoVendas | undefined>, pedidos: PedidoBanco[], todos: boolean): BorderoChange[] {
    const ids = new Set(eventos.map((e) => e.id));
    const sufixo = (ev: EventoBanco) => (todos ? ` (${ev.nome})` : "");
    const reais: (BorderoChange & { ms: number })[] = pedidos
        .filter((p) => ids.has(p.eventoId) && p.status === "cancelado")
        .map((p) => {
            const ev = eventos.find((e) => e.id === p.eventoId)!;
            const { grupos, tipos } = catalogoDoEvento(ev, (g) => g);
            const ingressos = p.itens.filter((i) => i.tipo === "ingresso").reduce((n, i) => n + i.quantidade, 0);
            const produtos = p.itens.filter((i) => i.tipo !== "ingresso").reduce((n, i) => n + i.quantidade, 0);
            const descricao = p.itens.map((i) => (i.tipo === "ingresso" ? [(i.grupoId && grupos.get(i.grupoId)) || "", (i.ingressoId && tipos.get(i.ingressoId)) || i.nome].filter(Boolean).join(", ") : i.nome)).join(" + ");
            return { id: p.id, ms: new Date(p.atualizadoEm).getTime(), hora: horaCurta(new Date(p.atualizadoEm)), tipo: "cancelamento" as const, canal: NOME_DO_CANAL[CANAL_DO_PEDIDO[p.canal]], descricao: `${descricao}${sufixo(ev)}`, ingressos: -ingressos, produtos: -produtos, valor: -p.subtotal };
        });

    const exemplos: (BorderoChange & { ms: number })[] = eventos.flatMap((ev) => {
        const h = historicos[ev.id];
        if (!h) return [];
        const { lotes } = catalogoDoEvento(ev, (g) => g);
        const vendidos = Object.entries(h.porLote)
            .filter(([id, q]) => q > 0 && (lotes.get(id)?.preco ?? 0) > 0)
            .map(([id]) => lotes.get(id)!);
        if (vendidos.length === 0) return [];
        let s = semente(ev.id);
        const rnd = () => {
            s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0;
            return s / 4294967296;
        };
        // Ancorado no começo de hoje, para os horários não mudarem a cada render.
        const hoje = new Date();
        const agora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime();
        const quantos = todos ? 2 : 5;
        return Array.from({ length: quantos }, (_, i) => {
            const l = vendidos[Math.floor(rnd() * vendidos.length)];
            const qtd = 1 + Math.floor(rnd() * 3);
            const quando = new Date(agora - Math.floor((quantos - i) * DIA_MS * 0.6 + rnd() * DIA_MS * 0.4));
            const tipo: ChangeType = rnd() < 0.5 ? "cancelamento" : "estorno";
            return {
                id: `${ev.id}-alt-${i}`,
                ms: quando.getTime(),
                hora: horaCurta(quando),
                tipo,
                canal: rnd() < 0.85 ? "Online" : "Bilheteria",
                descricao: `${l.grupo}, ${l.item}${qtd > 1 ? ` × ${qtd}` : ""}${sufixo(ev)}`,
                ingressos: -qtd,
                produtos: 0,
                valor: -qtd * l.preco,
            };
        });
    });
    return [...reais, ...exemplos].sort((a, b) => a.ms - b.ms).map(({ ms: _ms, ...c }) => c);
}

/** Borderô do evento em contexto, ou de todos os eventos da organização (BKS-27), no período escolhido. */
function useBorderoDoEvento(dateRange: DateRange) {
    const ctx = useEventoAtual();
    const todos = useTodosOsEventos();
    const { tabelas } = useBanco();
    const versao = useEventosVersao();
    return useMemo(() => {
        void versao;
        const ids = todos ? eventosDaOrganizacao.map((e) => e.id) : [ctx.id];
        const eventos = ids.map((id) => tabelas.eventos?.[id]).filter((e): e is EventoBanco => !!e);
        const pedidos = Object.values(tabelas.pedidos ?? {});
        const historicos = tabelas.historico ?? {};
        const tz = getLocalTimeZone();
        const de = dateRange ? dateRange.start.toDate(tz).getTime() : -Infinity;
        const ate = dateRange ? dateRange.end.toDate(tz).getTime() + DIA_MS - 1 : Infinity;

        const vendas = eventos.flatMap((ev) => {
            // Somando eventos, cada grupo leva o nome do evento (o mesmo rótulo de Vendas).
            const nomeDoGrupo = (g: string) => (todos ? `${g} (${ev.nome})` : g);
            const h = historicos[ev.id];
            return [...(h ? vendasDoHistorico(ev, h, de, ate, nomeDoGrupo) : []), ...vendasDosPedidos(ev, pedidos, de, ate, nomeDoGrupo)];
        });

        const visoes: Record<BorderoView, TreeNode[]> = {
            // Canal com o nome de exibição ("Online", não "ONLINE"; REL-231).
            macro: arvore(vendas, [(v) => NOME_DO_CANAL[v.canal], (v) => v.grupo, (v) => v.item], ORDEM_CANAIS.map((c) => NOME_DO_CANAL[c]), false),
            pdv: arvore(vendas, [(v) => v.pdv, (v) => v.grupo, (v) => v.item], ["Online", "Bilheteria", "Cortesias"], false),
            meios: arvore(vendas, [(v) => NOME_DO_CANAL[v.canal], (v) => v.meio], ORDEM_CANAIS.map((c) => NOME_DO_CANAL[c]), false),
        };
        return { visoes, mudancas: alteracoesDoBordero(eventos, historicos, pedidos, todos) };
    }, [ctx.id, todos, tabelas, versao, dateRange]);
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export function Bordero() {
    const { periodoPadrao } = useDatasetDoEvento();
    const carregando = useRelatorioCarregando();
    return (
        <BackstageLayout activeSection="relatorios" activeItem="bordero">
            {/* A chave volta ao período completo quando o evento (ou o escopo) muda o período padrão. */}
            <RelatorioFiltersProvider key={`${periodoPadrao.start.toString()}|${periodoPadrao.end.toString()}`} initialDateRange={periodoPadrao}>
                <div className="flex min-w-0 flex-1 flex-col">
                    <main className="flex flex-1 flex-col gap-6">
                        {/* Só o botão de período (REL-220); o filtro de sessão, que não filtrava, saiu. */}
                        <RelatorioPageHeader
                            title="Borderô"
                            splitControls
                            actions={<ExportMenu onExport={(f) => toast.success(`Exportando ${f.toUpperCase()}`, { description: "O borderô será exportado." })} />}
                        />
                        {carregando ? <CarregandoRelatorio rotulo="Carregando borderô" /> : <BorderoBody />}
                    </main>
                </div>
            </RelatorioFiltersProvider>
        </BackstageLayout>
    );
}

const BorderoBody = () => {
    const { dateRange } = useRelatorioFilters();
    const [view, setView] = useState<BorderoView>("macro");
    const [acknowledged, setAcknowledged] = useState(false);
    // Painel das alterações aberto na URL (?painel=alteracoes, REL-223).
    const painel = useItemNaUrl("painel");
    const detailsOpen = painel.id === "alteracoes";

    // Vendas do evento em contexto (ou da organização), do banco unificado: histórico + pedidos pagos, por canal real.
    const { visoes: scaled, mudancas: changedTransacoes } = useBorderoDoEvento(dateRange);

    const activeNodes = view === "macro" ? scaled.macro : view === "pdv" ? scaled.pdv : scaled.meios;
    const activeMeta = VIEWS[view];

    const macroGrand = useMemo(() => grandTotalOf(scaled.macro), [scaled.macro]);
    const totalIngressos = macroGrand[0] ?? 0;
    const totalFaturado = macroGrand[2] ?? 0;
    const ticketMedio = totalIngressos === 0 ? 0 : totalFaturado / totalIngressos;

    const changedCount = changedTransacoes.length;
    const showBanner = changedCount > 0 && !acknowledged;

    return (
        <>
            {showBanner && (
                <AlertFloating
                    color="warning"
                    title="Borderô atualizado"
                    description={`${changedCount} ${changedCount === 1 ? "transação alterou" : "transações alteraram"} o borderô desde o fim do evento.`}
                    confirmLabel="Detalhes"
                    onConfirm={() => painel.abrir("alteracoes")}
                    dismissLabel="Marcar como visto"
                    onClose={() => setAcknowledged(true)}
                />
            )}

            {/* O painel de métricas comum dos relatórios (REL-221). */}
            <PainelDeMetricas rotulo="Resumo do borderô" className="sm:grid-cols-3 xl:grid-cols-3">
                <MetricaDoRelatorio rotulo="Total faturado" valor={currencyFormatter.format(totalFaturado)} destaque />
                <MetricaDoRelatorio rotulo="Total de ingressos" valor={numberFormatter.format(totalIngressos)} />
                <MetricaDoRelatorio rotulo="Ticket médio" valor={currencyFormatter.format(ticketMedio)} />
            </PainelDeMetricas>

            <section className="flex flex-col overflow-clip rounded-xl bg-primary ring-1 ring-border-secondary">
                <header className="flex flex-col gap-3 border-b border-secondary px-4 py-4 md:flex-row md:items-center md:justify-between">
                    <h3 className="text-md font-semibold text-primary">Detalhamento do borderô</h3>
                    {/* No celular, as três visões não cabem lado a lado em 390 px: viram um select do DS (UI-MOB-005, REL-218). */}
                    <NativeSelect
                        // O nome acessível vem do label (o NativeSelect do DS aponta aria-labelledby para ele); o label fica só para leitor de tela.
                        label="Visão do borderô"
                        className="md:hidden [&_label]:sr-only"
                        value={view}
                        onChange={(e) => {
                            setView(e.target.value as BorderoView);
                            setAcknowledged(false);
                        }}
                        options={VISOES_DO_BORDERO.map((v) => ({ value: v.id, label: v.label }))}
                    />
                    <Tabs
                        selectedKey={view}
                        onSelectionChange={(value: React.Key) => {
                            setView(value as BorderoView);
                            setAcknowledged(false);
                        }}
                        className="hidden w-auto shrink-0 md:flex"
                    >
                        <TabList type="button-minimal" items={VISOES_DO_BORDERO} />
                    </Tabs>
                </header>

                <TreeTable key={view} nodes={activeNodes} columns={activeMeta.columns} firstCol={activeMeta.firstCol} />
            </section>

            {detailsOpen && <BorderoChangesSlideout onClose={painel.fechar} changes={changedTransacoes} />}
        </>
    );
};

/* ------------------------------------------------------------------ */
/*  Slideout — detalhes das transações                                */
/* ------------------------------------------------------------------ */

const signed = (value: number, currency: boolean) => {
    const formatted = currency ? currencyFormatter.format(Math.abs(value)) : numberFormatter.format(Math.abs(value));
    return `${value >= 0 ? "+" : "−"}${formatted}`;
};

// No painel lateral do DS (REL-225), no lugar do modal feito à mão de 520 px.
const BorderoChangesSlideout = ({ onClose, changes }: { onClose: () => void; changes: BorderoChange[] }) => (
    <PainelLateral titulo="Transações desde o fim do evento" subtitulo="Alterações que impactaram o borderô." onFechar={onClose}>
        <ul className="flex flex-col divide-y divide-secondary">
            {changes.map((change) => {
                const meta = CHANGE_META[change.tipo];
                return (
                    <li key={change.id} className="flex flex-col gap-2 py-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-col">
                                <span className="text-sm font-medium text-primary">{change.descricao}</span>
                                <span className="text-sm text-tertiary">
                                    {change.canal}, {change.hora}
                                </span>
                            </div>
                            <Badge size="sm" color={meta.color} type="pill-color">
                                {meta.label}
                            </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-tertiary">
                            <span>
                                Ingressos: <b className={cx("tabular-nums", change.ingressos >= 0 ? "text-success-primary" : "text-error-primary")}>{signed(change.ingressos, false)}</b>
                            </span>
                            {change.produtos !== 0 && (
                                <span>
                                    Produtos: <b className={cx("tabular-nums", change.produtos >= 0 ? "text-success-primary" : "text-error-primary")}>{signed(change.produtos, false)}</b>
                                </span>
                            )}
                            <span>
                                Faturado: <b className={cx("tabular-nums", change.valor >= 0 ? "text-success-primary" : "text-error-primary")}>{signed(change.valor, true)}</b>
                            </span>
                        </div>
                    </li>
                );
            })}
        </ul>
    </PainelLateral>
);

/* ------------------------------------------------------------------ */
/*  Tree table (com ordenação dos nós de topo)                        */
/* ------------------------------------------------------------------ */

const TreeTable = ({ nodes, columns, firstCol }: { nodes: TreeNode[]; columns: ColDef[]; firstCol: string }) => {
    const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
    const entrada = useLinhaFilhaAnimada();
    // Celular: só a última coluna cabe; a linha final abre os detalhes com todas (UI-MOB-005).
    const celular = !useBreakpoint("md");
    const linha = useLinhaAberta<{ titulo: string; apoio: string; valores: number[] }>();
    const lastCol = columns.length - 1;
    const indent = (depth: number) => 16 + depth * 24;

    const accessors = useMemo(() => {
        const acc: Record<string, (n: TreeNode) => string | number> = { label: (n) => n.label };
        columns.forEach((_, i) => {
            acc[`c${i}`] = (n) => comUnitario(subtotalOf(n), columns)[i] ?? 0;
        });
        return acc;
    }, [columns]);

    const { sorted, sortKey, sortDir, toggleSort } = useSortableTable(nodes as unknown as Record<string, unknown>[], accessors as Partial<Record<string, (r: Record<string, unknown>) => string | number>>);
    const sortedNodes = sorted as unknown as TreeNode[];

    const grand = comUnitario(grandTotalOf(nodes), columns);

    const toggle = (key: string) =>
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });

    const metricCell = (value: number, colIdx: number, valueClass: string) => (
        <td key={colIdx} className={cx("whitespace-nowrap px-4 py-3.5 text-right text-sm", colIdx < lastCol && "hidden md:table-cell", valueClass)}>
            {fmt(value, columns[colIdx].type)}
        </td>
    );

    const renderNodes = (list: TreeNode[], depth: number, prefix: string, caminho: string[] = []): ReactNode[] => {
        const out: ReactNode[] = [];
        list.forEach((node, idx) => {
            const key = `${prefix}-${idx}`;
            if (node.children) {
                const isExpanded = expanded.has(key);
                const sub = comUnitario(subtotalOf(node), columns);
                const labelClass = depth === 0 ? "font-bold text-primary" : "font-semibold text-secondary";
                const valueClass = depth === 0 ? "font-semibold text-primary" : "font-medium text-secondary";
                out.push(
                    <Fragment key={key}>
                        {/* Linha de tabela, não botão (REL-226); as filhas entram com transição (REL-224). */}
                        <motion.tr
                            {...(depth > 0 ? entrada : {})}
                            onClick={() => toggle(key)}
                            className={cx("cursor-pointer border-b border-secondary transition duration-100 ease-linear hover:bg-primary_hover", depth === 0 && "bg-primary")}
                        >
                            <td className="py-3.5 pr-4 text-sm" style={{ paddingLeft: indent(depth) }}>
                                <AlternarDaArvore aberto={isExpanded} onAlternar={() => toggle(key)}>
                                    <span title={node.label} className={cx("line-clamp-2", labelClass)}>{node.label}</span>
                                </AlternarDaArvore>
                            </td>
                            {sub.map((v, i) => metricCell(v, i, valueClass))}
                        </motion.tr>
                        {isExpanded && renderNodes(node.children!, depth + 1, key, [...caminho, node.label])}
                    </Fragment>,
                );
                return;
            }
            const abrirDetalhes = () => linha.abrir({ titulo: node.label, apoio: caminho.join(", "), valores: node.values! });
            out.push(
                <motion.tr
                    key={key}
                    {...entrada}
                    {...linhaQueAbre(celular, abrirDetalhes)}
                    className={cx("border-b border-secondary bg-secondary/60", celular && "hover:bg-primary_hover")}
                >
                    <td className="py-3 pr-4 text-sm text-tertiary" style={{ paddingLeft: indent(depth) }}>
                        <AbrirDaLinha ativa={celular} onAbrir={abrirDetalhes} className="line-clamp-2">
                            {node.label}
                        </AbrirDaLinha>
                    </td>
                    {node.values!.map((v, i) => metricCell(v, i, i === lastCol ? "font-medium text-primary" : "text-tertiary"))}
                </motion.tr>,
            );
        });
        return out;
    };

    return (
        <div className="overflow-x-auto overflow-y-clip">
            <table className="w-full table-fixed border-collapse">
                <colgroup>
                    <col className="w-[60%] md:w-auto" />
                    {columns.map((_, i) => (
                        <col key={i} className={i < lastCol ? "hidden md:table-column" : undefined} />
                    ))}
                </colgroup>
                <thead className="bg-secondary">
                    <tr className="border-b border-secondary text-left">
                        <th className="px-4 py-3 text-sm font-semibold text-tertiary">
                            <SortableHeader label={firstCol} sortKey="label" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                        </th>
                        {columns.map((col, i) => (
                            <th key={col.label} className={cx("whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-tertiary", i < lastCol && "hidden md:table-cell")}>
                                <SortableHeader label={col.label} align="right" sortKey={`c${i}`} activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {renderNodes(sortedNodes, 0, "n")}
                    <tr className="border-t-2 border-secondary bg-secondary">
                        <td className="px-4 py-3.5 text-sm font-bold text-primary">Total geral</td>
                        {grand.map((v, i) => (
                            <td key={i} className={cx("whitespace-nowrap px-4 py-3.5 text-right text-sm font-bold text-primary", i < lastCol && "hidden md:table-cell")}>
                                {fmt(v, columns[i].type)}
                            </td>
                        ))}
                    </tr>
                </tbody>
            </table>
            {linha.aberta && (
                <DetalhesDaLinha
                    titulo={linha.aberta.titulo}
                    subtitulo={linha.aberta.apoio}
                    grupos={[{ campos: columns.map((col, i) => ({ rotulo: col.label, valor: fmt(linha.aberta!.valores[i] ?? 0, col.type) })) }]}
                    onFechar={linha.fechar}
                />
            )}
        </div>
    );
};
