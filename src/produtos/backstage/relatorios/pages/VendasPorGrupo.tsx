import { type ReactNode, useMemo, useState } from "react";
import type { SortDescriptor } from "react-aria-components";
import { Table } from "@/components/application/table/table";
import { BarraDePontos, MetricaDoRelatorio as Metrica, PainelDeMetricas, PainelDoRelatorio } from "../components/visual-dos-relatorios";
import { CarregandoRelatorio, useRelatorioCarregando } from "../components/estado-dos-relatorios";
import { BackstageLayout } from "../../components/Backstage";
import { RelatorioPageHeader } from "../components/RelatorioPageHeader";
import { RelatorioFiltersProvider, useRelatorioFilters } from "../components/relatorio-filters";
import { DetalhesDaLinha, ListaDaTabela, useLinhaAberta } from "../components/TabelaLista";
import { TabelaEmArvore, type ColunaDaArvore, type NoDaArvore } from "../components/tabela-em-arvore";
import { TransacionadoChartCard, type ChartPoint } from "../components/TransacionadoChart";
import { FunilAoVivo } from "../components/funil-ao-vivo";
import { EVENT, currencyFormatter, numberFormatter } from "../data/event";
import { useDatasetDoEvento } from "../data/vendas-banco";
import { useTodosOsEventos } from "../../components/escopo-dos-relatorios";

/** Percentual em pt-BR, com uma casa ("26,4%"). */
const PERCENTUAL = new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });

/* ------------------------------------------------------------------ */
/*  Tipos                                                             */
/* ------------------------------------------------------------------ */

interface SetorRow {
    id: string;
    nome: string;
    estoque: number;
    vendido: number;
}

interface IngressoPorSetorRow {
    id: string;
    setor: string;
    tipoIngresso: string;
    lote: string;
    vendidos: number;
    estoque: number;
    /** Valor bruto e c/ desconto do grupo no período, do mesmo dataset dos totais (REL-213). */
    valor: number;
    valorComDesconto: number;
}

interface ProdutoRow {
    id: string;
    nome: string;
    quantidade: number;
    valorUnitario: number;
    gmv: number;
    gmvComDesconto: number;
    desconto: number;
}

interface CupomLoteRow {
    id: string;
    lote: string;
    quantidade: number;
    valorTotal: number;
}

interface CupomRow {
    id: string;
    cupom: string;
    quantidade: number;
    valor: number;
    valorDesconto: number;
    valorTotal: number;
    lotes: CupomLoteRow[];
}

interface MixReceitaItem {
    id: string;
    nome: string;
    quantidade: number;
    gmv: number;
    gmvComDesconto: number;
    /** % do valor c/ desconto, arredondado. */
    percentual: number;
    fill: string;
}

/* ------------------------------------------------------------------ */
/*  Detalhamento das vendas (sessão > tipo do item > grupo), com os   */
/*  números do mesmo dataset dos totais (REL-213, REL-247).            */
/* ------------------------------------------------------------------ */

interface TreeNode {
    id: string;
    label: string;
    value: number;
    estoque?: number;
    children?: TreeNode[];
    /** Linha de apoio sob o rótulo (a data da sessão, quando o rótulo é o nome do evento, REL-227). */
    apoio?: string;
}

/**
 * Cada sessão com os grupos do próprio evento (em "Todos os eventos", o grupo vem como "Pista (Evento)").
 * O dataset não separa as vendas por sessão nem por tipo de ingresso ou lote: evento com várias sessões
 * divide o grupo igualmente entre elas, e a árvore para no grupo (antes, os níveis de tipo e lote eram
 * proporções fixas inventadas, e em "Todos os eventos" cada sessão somava os grupos de todos os eventos).
 */
const buildDrillTree = (
    sessoes: { id: string; label: string; evento: string; data: string }[],
    todos: boolean,
    grupos: { grupo: string; vendido: number }[],
    capacidadeDe: (grupo: string) => number,
): TreeNode[] => {
    const sufixo = (evento: string) => ` (${evento})`;
    const sessoesPorEvento = new Map<string, number>();
    for (const d of sessoes) sessoesPorEvento.set(d.evento, (sessoesPorEvento.get(d.evento) ?? 0) + 1);
    return sessoes.map((d) => {
        const n = sessoesPorEvento.get(d.evento) ?? 1;
        const doEvento = todos ? grupos.filter((g) => g.grupo.endsWith(sufixo(d.evento))) : grupos;
        const filhos: TreeNode[] = doEvento.map((g, k) => ({
            id: `${d.id}-g${k}`,
            label: todos ? g.grupo.slice(0, -sufixo(d.evento).length) : g.grupo,
            value: Math.round(g.vendido / n),
        }));
        const total = filhos.reduce((t, c) => t + c.value, 0);
        const estoque = Math.round(doEvento.reduce((t, g) => t + capacidadeDe(g.grupo), 0) / n);
        const tiposDeItem: TreeNode[] = [{ id: `${d.id}-ingressos`, label: "Ingressos", value: total, children: filhos }];
        // Em "Todos os eventos", o nome do evento é o rótulo e a data vai embaixo: cortado, o nome não pode esconder a data.
        const rotulo = todos ? { label: d.evento, apoio: d.data.slice(0, 5) } : { label: d.label };
        return { id: d.id, ...rotulo, value: total, estoque, children: tiposDeItem };
    });
};

/**
 * A árvore do detalhamento na tabela em árvore comum (REL-243): Participação (% entre os irmãos) e
 * Ingressos. A ocupação da sessão (vendidos ÷ lugares) fica na linha de apoio da sessão.
 */
const paraNosDoDetalhamento = (nos: TreeNode[], nivel = 0): NoDaArvore[] => {
    const soma = nos.reduce((s, n) => s + n.value, 0);
    return nos.map((n) => {
        const participacao = soma === 0 ? 0 : (n.value / soma) * 100;
        let apoio = n.apoio;
        if (nivel === 0 && n.estoque !== undefined) {
            const ocupacao = `${PERCENTUAL.format(n.estoque ? n.value / n.estoque : 0)} de ${numberFormatter.format(n.estoque)} lugares`;
            apoio = apoio ? `${apoio}, ${ocupacao}` : ocupacao;
        }
        return { id: n.id, rotulo: n.label, apoio, valores: [participacao, n.value], filhos: n.children ? paraNosDoDetalhamento(n.children, nivel + 1) : undefined };
    });
};

const COLUNAS_DO_DETALHAMENTO: ColunaDaArvore[] = [
    { rotulo: "Participação", formatar: (v) => PERCENTUAL.format(v / 100) },
    { rotulo: "Ingressos", formatar: (v) => numberFormatter.format(v) },
];

const COLUNAS_DA_OCUPACAO: ColunaDaArvore[] = [
    { rotulo: "Estoque", formatar: (v) => numberFormatter.format(v) },
    { rotulo: "Ingressos", formatar: (v) => numberFormatter.format(v) },
    { rotulo: "Ocupação", formatar: (v) => `${v}%`, barra: true },
];

const COLUNAS_DOS_AVULSOS: ColunaDaArvore[] = [
    { rotulo: "Quantidade", formatar: (v) => numberFormatter.format(v) },
    { rotulo: "Valor unitário médio", formatar: (v) => currencyFormatter.format(v) },
    { rotulo: "Valor total bruto", formatar: (v) => currencyFormatter.format(v) },
    { rotulo: "Desconto", formatar: (v) => currencyFormatter.format(v) },
    { rotulo: "Valor total c/ desconto", formatar: (v) => currencyFormatter.format(v) },
];

/** Cor de série da paleta categórica dos relatórios (REL-214), na ordem: Ingressos, Combos, Produtos. */
const MIX_CORES: Record<string, string> = {
    Ingressos: "var(--color-utility-blue-500)",
    Combos: "var(--color-utility-orange-600)",
    Produtos: "var(--color-utility-indigo-700)",
};

const ocupacaoEmPorcento = (vendidos: number, estoque: number) => Math.min(100, Math.max(0, estoque === 0 ? 0 : Math.round((vendidos / estoque) * 100)));

/** Agrupa as linhas por grupo e tipo de ingresso; cada linha vira um lote com os valores de `lote`. */
function porGrupoEItem<T>(rows: IngressoPorSetorRow[], lote: (row: IngressoPorSetorRow) => T) {
    const grupos = new Map<string, Map<string, { row: IngressoPorSetorRow; lote: T }[]>>();
    rows.forEach((row) => {
        const itens = grupos.get(row.setor) ?? new Map<string, { row: IngressoPorSetorRow; lote: T }[]>();
        const lista = itens.get(row.tipoIngresso) ?? [];
        lista.push({ row, lote: lote(row) });
        itens.set(row.tipoIngresso, lista);
        grupos.set(row.setor, itens);
    });
    return grupos;
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export function VendasPorGrupo() {
    const { periodoPadrao } = useDatasetDoEvento();
    const carregando = useRelatorioCarregando();
    return (
        <BackstageLayout activeSection="relatorios" activeItem="vendas-por-grupo">
            <RelatorioFiltersProvider key={`${periodoPadrao.start.toString()}|${periodoPadrao.end.toString()}`} initialDateRange={periodoPadrao}>
                <div className="flex min-w-0 flex-1 flex-col">
                    <main className="flex flex-1 flex-col gap-6">
                        <RelatorioPageHeader title="Vendas" filter="period" />
                        {carregando ? <CarregandoRelatorio rotulo="Carregando vendas" metricas={6} /> : <VendasBody />}
                    </main>
                </div>
            </RelatorioFiltersProvider>
        </BackstageLayout>
    );
}

const VendasBody = () => {
    const { dateRange } = useRelatorioFilters();
    // Vendas do evento em contexto, do banco unificado (histórico + pedidos pagos).
    const { consultar, grupos: GRUPOS } = useDatasetDoEvento();
    const todos = useTodosOsEventos();

    const view = useMemo(() => {
        // Fonte única: dataset do evento em contexto (banco unificado) agregado pelo período.
        const ds = consultar(dateRange);
        const slug = (s: string) =>
            s
                .toLowerCase()
                .normalize("NFD")
                .replace(/\p{Diacritic}/gu, "")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "");
        const capOf = (nome: string) => GRUPOS.find((g) => g.nome === nome)?.capacidade ?? 0;

        // Setores = grupos de ingresso do evento (Pista, Camarote, VIP…), com o valor do mesmo dataset dos totais (REL-213).
        const det = ds.detalhe;
        const valorDoGrupo = (nome: string) => det.ingressosPorGrupo.find((g) => g.nome === nome);
        const setoresView: SetorRow[] = ds.ingressosPorGrupo.map((g) => ({ id: slug(g.grupo), nome: g.grupo, estoque: capOf(g.grupo), vendido: g.vendido }));
        const ingressosPorSetorView: IngressoPorSetorRow[] = ds.ingressosPorGrupo.map((g, i) => ({
            id: `ips${i}`,
            setor: g.grupo,
            tipoIngresso: "Inteira",
            lote: "Lote único",
            vendidos: g.vendido,
            estoque: capOf(g.grupo),
            valor: valorDoGrupo(g.grupo)?.bruto ?? g.valor,
            valorComDesconto: valorDoGrupo(g.grupo)?.liquido ?? g.valor,
        }));

        // Mix, combos, produtos e cupons: as mesmas linhas do período que somam os totais do topo,
        // com o desconto real dos cupons dos pedidos (REL-213). Sem mock nem desconto fixo.
        const totalMix = det.mix.reduce((s, m) => s + m.liquido, 0) || 1;
        const mixView: MixReceitaItem[] = det.mix.map((m) => ({
            id: `mix-${m.nome}`,
            nome: m.nome,
            quantidade: m.quantidade,
            gmv: m.bruto,
            gmvComDesconto: m.liquido,
            percentual: Math.round((m.liquido / totalMix) * 100),
            fill: MIX_CORES[m.nome] ?? "var(--color-utility-neutral-400)",
        }));
        const paraLinha = (l: { nome: string; quantidade: number; bruto: number; liquido: number }, i: number): ProdutoRow => ({
            id: `${i}-${l.nome}`,
            nome: l.nome,
            quantidade: l.quantidade,
            valorUnitario: l.quantidade ? l.bruto / l.quantidade : 0,
            gmv: l.bruto,
            gmvComDesconto: l.liquido,
            desconto: l.bruto - l.liquido,
        });
        const combosView = det.combos.map(paraLinha);
        const produtosView = det.produtos.map(paraLinha);
        const cuponsView: CupomRow[] = det.cupons.map((c, i) => ({
            id: `cu${i}`,
            cupom: c.nome,
            quantidade: c.quantidade,
            valor: c.bruto,
            valorDesconto: c.bruto - c.liquido,
            valorTotal: c.liquido,
            lotes: c.itens.map((it, j) => ({ id: `cu${i}-${j}`, lote: it.nome, quantidade: it.quantidade, valorTotal: it.liquido })),
        }));
        // Período já filtrado no dataset: a árvore não precisa de escala.
        const drillView = paraNosDoDetalhamento(buildDrillTree(EVENT.sessoes, todos, ds.ingressosPorGrupo, capOf));

        const chartData: ChartPoint[] = ds.vendasDiarias.map((d) => ({ data: d.dia, total: d.valor, quantidade: d.itens }));

        return {
            setoresView,
            ingressosPorSetorView,
            mixView,
            combosView,
            produtosView,
            cuponsView,
            drillView,
            valorTotal: ds.totais.valorTotalBruto,
            valorTotalDesconto: ds.totais.valorTotalComDesconto,
            totalItens: ds.totais.itensVendidos,
            chartData,
        };
    }, [dateRange, consultar, GRUPOS, todos]);

    return (
        <>
            <MetricsRow valorTotal={view.valorTotal} valorTotalDesconto={view.valorTotalDesconto} totalItens={view.totalItens} setores={view.setoresView} />
            {/* O funil fica como está, logo abaixo das métricas (REL-205). */}
            <FunilAoVivo />
            <TransacionadoChartCard data={view.chartData} title="Total transacionado e número de ingressos" subtitle="Distribuição diária de transações e ingressos vendidos" />
            <MixReceitaCard items={view.mixView} />
            <DetalhamentoCard nos={view.drillView} />
            <OcupacaoPorGrupoCard rows={view.ingressosPorSetorView} />
            <ItensVendidosCard titulo="Combos" coluna="Combo" vazio="Nenhum combo vendido no período." rows={view.combosView} />
            <ItensVendidosCard titulo="Produtos" coluna="Produto" vazio="Nenhum produto vendido no período." rows={view.produtosView} />
            <IngressosAvulsosCard rows={view.ingressosPorSetorView} />
            <IngressosComCupomCard cupons={view.cuponsView} />
        </>
    );
};

/* ------------------------------------------------------------------ */
/*  Métricas (painel comum dos relatórios, REL-221)                   */
/* ------------------------------------------------------------------ */

const MetricsRow = ({ valorTotal, valorTotalDesconto, totalItens, setores: setoresView }: { valorTotal: number; valorTotalDesconto: number; totalItens: number; setores: SetorRow[] }) => {
    const desconto = Math.max(0, valorTotal - valorTotalDesconto);
    const ticketMedio = totalItens === 0 ? 0 : valorTotal / totalItens;
    const totalEstoque = setoresView.reduce((s, x) => s + x.estoque, 0);
    const totalVendido = setoresView.reduce((s, x) => s + x.vendido, 0);
    const ocupacao = totalEstoque === 0 ? 0 : Math.round((totalVendido / totalEstoque) * 100);
    return (
        <PainelDeMetricas rotulo="Resumo das vendas">
            <Metrica rotulo="Valor total" valor={currencyFormatter.format(valorTotal)} destaque />
            <Metrica rotulo="Valor total c/ desconto" valor={currencyFormatter.format(valorTotalDesconto)} />
            <Metrica rotulo="Desconto" valor={currencyFormatter.format(desconto)} />
            <Metrica rotulo="Ticket médio" valor={currencyFormatter.format(ticketMedio)} />
            <Metrica rotulo="Quantidade de itens" valor={numberFormatter.format(totalItens)} />
            {/* Como a taxa de validação de Acesso: número, "N de M" e a barra de pontos (REL-221). */}
            <Metrica rotulo="Ocupação" valor={`${ocupacao}%`} complemento={`${numberFormatter.format(totalVendido)} de ${numberFormatter.format(totalEstoque)}`}>
                <BarraDePontos valor={totalVendido} total={totalEstoque} pontos={32} className="mt-1" />
            </Metrica>
        </PainelDeMetricas>
    );
};

/* ------------------------------------------------------------------ */
/*  Peças comuns dos blocos                                           */
/* ------------------------------------------------------------------ */

/** Bloco do relatório (REL-200, REL-246): o painel dos relatórios, com o conteúdo abaixo de uma linha fina, como em Transferências. */
const Bloco = ({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: ReactNode }) => (
    <PainelDoRelatorio titulo={titulo} subtitulo={subtitulo}>
        <div className="pt-3">{children}</div>
    </PainelDoRelatorio>
);

/** Bloco sem venda no período: a mesma frase centrada dos outros relatórios (Transferências, Transações). */
const VazioDoBloco = ({ texto }: { texto: string }) => <p className="border-t border-secondary px-5 py-12 text-center text-sm text-tertiary">{texto}</p>;

/** Rótulo de coluna da tabela do DS no degrau sm (o rótulo padrão do DS é xs, abaixo do mínimo dos relatórios). */
const RotuloDaColuna = ({ children }: { children: ReactNode }) => <span className="text-sm font-semibold text-tertiary">{children}</span>;

/** À direita, para colunas de número (como em Comissários). */
const DIREITA = "[&>div]:justify-end";

/** Ordena as linhas pelo cabeçalho da tabela do DS (REL-237). */
function useOrdemDaTabela<T>(rows: T[], inicial: SortDescriptor) {
    const [ordem, setOrdem] = useState<SortDescriptor>(inicial);
    const ordenadas = useMemo(() => {
        const col = ordem.column as keyof T;
        const dir = ordem.direction === "ascending" ? 1 : -1;
        return [...rows].sort((a, b) => {
            const va = a[col];
            const vb = b[col];
            if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
            return String(va).localeCompare(String(vb), "pt-BR", { numeric: true }) * dir;
        });
    }, [rows, ordem]);
    return { ordem, setOrdem, ordenadas };
}

/* ------------------------------------------------------------------ */
/*  Mix de receita: barra proporcional e tabela, como os blocos de    */
/*  status e meios de pagamento de Transações (REL-242)               */
/* ------------------------------------------------------------------ */

const camposDoMix = (r: MixReceitaItem) => [
    { rotulo: "Quantidade", valor: numberFormatter.format(r.quantidade) },
    { rotulo: "Valor total bruto", valor: currencyFormatter.format(r.gmv) },
    { rotulo: "Desconto", valor: currencyFormatter.format(r.gmv - r.gmvComDesconto) },
    { rotulo: "Valor total c/ desconto", valor: currencyFormatter.format(r.gmvComDesconto) },
];

const MarcaDaSerie = ({ cor }: { cor: string }) => <span aria-hidden="true" className="size-3 shrink-0 rounded-full" style={{ backgroundColor: cor }} />;

const MixReceitaCard = ({ items }: { items: MixReceitaItem[] }) => {
    const linha = useLinhaAberta<MixReceitaItem>();
    return (
        <Bloco titulo="Mix de receita">
            {items.length === 0 ? (
                <VazioDoBloco texto="Nenhuma venda no período." />
            ) : (
                <>
                    {/* Largura proporcional ao valor c/ desconto; o % fica na tabela (REL-235). */}
                    <div aria-hidden="true" className="flex w-full items-start gap-1 px-5 pt-1 pb-5">
                        {items.map((item) => (
                            <div
                                key={item.id}
                                title={`${item.nome}: ${item.percentual}%`}
                                className="h-10 min-w-1 rounded-md"
                                style={{ flexGrow: item.gmvComDesconto || 1, flexBasis: 0, backgroundColor: item.fill }}
                            />
                        ))}
                    </div>
                    <div className="hidden border-t border-secondary md:block">
                        <Table aria-label="Mix de receita" size="sm">
                            <Table.Header>
                                <Table.Head id="nome" isRowHeader className="w-full">
                                    <RotuloDaColuna>Categoria</RotuloDaColuna>
                                </Table.Head>
                                <Table.Head id="quantidade" className={DIREITA}>
                                    <RotuloDaColuna>Quantidade</RotuloDaColuna>
                                </Table.Head>
                                <Table.Head id="gmv" className={DIREITA}>
                                    <RotuloDaColuna>Valor total bruto</RotuloDaColuna>
                                </Table.Head>
                                <Table.Head id="desconto" className={DIREITA}>
                                    <RotuloDaColuna>Desconto</RotuloDaColuna>
                                </Table.Head>
                                <Table.Head id="gmvComDesconto" className={DIREITA}>
                                    <RotuloDaColuna>Valor total c/ desconto</RotuloDaColuna>
                                </Table.Head>
                            </Table.Header>
                            <Table.Body items={items}>
                                {(item) => (
                                    <Table.Row id={item.id}>
                                        <Table.Cell>
                                            <span className="flex min-w-0 items-center gap-2.5">
                                                <MarcaDaSerie cor={item.fill} />
                                                <span className="shrink-0 font-semibold text-primary tabular-nums">{item.percentual}%</span>
                                                <span className="truncate text-secondary">{item.nome}</span>
                                            </span>
                                        </Table.Cell>
                                        <Table.Cell className="text-right whitespace-nowrap tabular-nums">{numberFormatter.format(item.quantidade)}</Table.Cell>
                                        <Table.Cell className="text-right whitespace-nowrap tabular-nums">{currencyFormatter.format(item.gmv)}</Table.Cell>
                                        <Table.Cell className="text-right whitespace-nowrap tabular-nums">{currencyFormatter.format(item.gmv - item.gmvComDesconto)}</Table.Cell>
                                        <Table.Cell className="text-right font-medium whitespace-nowrap text-primary tabular-nums">{currencyFormatter.format(item.gmvComDesconto)}</Table.Cell>
                                    </Table.Row>
                                )}
                            </Table.Body>
                        </Table>
                    </div>
                    {/* Celular: tabela-lista; o toque abre todas as colunas (UI-MOB-005). */}
                    <ListaDaTabela
                        rotulo="Mix de receita"
                        className="border-t border-secondary"
                        itens={items}
                        chave={(r) => r.id}
                        inicio={(r) => <MarcaDaSerie cor={r.fill} />}
                        titulo={(r) => r.nome}
                        apoio={(r) => `${r.percentual}% do total`}
                        destaque={(r) => <span className="font-medium">{currencyFormatter.format(r.gmvComDesconto)}</span>}
                        onAbrir={linha.abrir}
                    />
                    {linha.aberta && <DetalhesDaLinha titulo={linha.aberta.nome} subtitulo={`${linha.aberta.percentual}% do total`} grupos={[{ campos: camposDoMix(linha.aberta) }]} onFechar={linha.fechar} />}
                </>
            )}
        </Bloco>
    );
};

/* ------------------------------------------------------------------ */
/*  Detalhamento das vendas (tabela em árvore comum, REL-243)         */
/* ------------------------------------------------------------------ */

const DetalhamentoCard = ({ nos }: { nos: NoDaArvore[] }) => (
    <Bloco titulo="Detalhamento das vendas" subtitulo="Por sessão, tipo do item e grupo">
        {nos.length === 0 ? (
            <VazioDoBloco texto="Nenhuma sessão no período." />
        ) : (
            <div className="border-t border-secondary">
                <TabelaEmArvore primeiraColuna="Sessão" colunas={COLUNAS_DO_DETALHAMENTO} nos={nos} ordenavel={false} larguraDaPrimeiraNoCelular="w-[72%]" />
            </div>
        )}
    </Bloco>
);

/* ------------------------------------------------------------------ */
/*  Ocupação por grupo (tabela em árvore comum, REL-244)              */
/* ------------------------------------------------------------------ */

const OcupacaoPorGrupoCard = ({ rows }: { rows: IngressoPorSetorRow[] }) => {
    const nos = useMemo<NoDaArvore[]>(() => {
        const grupos = porGrupoEItem(rows, (row) => ({ estoque: row.estoque, ingressos: row.vendidos }));
        const valores = (estoque: number, ingressos: number) => [estoque, ingressos, ocupacaoEmPorcento(ingressos, estoque)];
        return [...grupos.entries()]
            .map(([grupo, itens]) => {
                const filhos = [...itens.entries()]
                    .map(([item, lotes]) => {
                        const estoque = lotes.reduce((s, l) => s + l.lote.estoque, 0);
                        const ingressos = lotes.reduce((s, l) => s + l.lote.ingressos, 0);
                        const folhas = [...lotes]
                            .sort((a, b) => b.lote.ingressos - a.lote.ingressos)
                            .map(({ row, lote }) => ({ id: row.id, rotulo: row.lote, valores: valores(lote.estoque, lote.ingressos) }));
                        return { id: `${grupo}|${item}`, rotulo: item, valores: valores(estoque, ingressos), filhos: folhas, ingressos };
                    })
                    .sort((a, b) => b.ingressos - a.ingressos);
                const estoque = filhos.reduce((s, x) => s + (x.valores[0] ?? 0), 0);
                const ingressos = filhos.reduce((s, x) => s + x.ingressos, 0);
                return { id: grupo, rotulo: grupo, valores: valores(estoque, ingressos), filhos, ingressos };
            })
            .sort((a, b) => b.ingressos - a.ingressos);
    }, [rows]);

    return (
        <Bloco titulo="Ocupação por grupo">
            {nos.length === 0 ? (
                <VazioDoBloco texto="Nenhum ingresso vendido no período." />
            ) : (
                <div className="border-t border-secondary">
                    <TabelaEmArvore primeiraColuna="Grupo, ingresso e lote" colunas={COLUNAS_DA_OCUPACAO} nos={nos} ordenavel={false} larguraDaPrimeiraNoCelular="w-[46%]" />
                </div>
            )}
        </Bloco>
    );
};

/* ------------------------------------------------------------------ */
/*  Ingressos avulsos (tabela em árvore comum, REL-244)               */
/* ------------------------------------------------------------------ */

const IngressosAvulsosCard = ({ rows }: { rows: IngressoPorSetorRow[] }) => {
    const { nos, total } = useMemo(() => {
        // Valor real do grupo no período (o mesmo dos totais e do mix), não um preço fixo por setor (REL-213).
        const grupos = porGrupoEItem(rows, (row) => ({ quantidade: row.vendidos, gmv: row.valor, gmvComDesconto: row.valorComDesconto }));
        const valores = (quantidade: number, gmv: number, gmvComDesconto: number) => [quantidade, quantidade ? gmv / quantidade : 0, gmv, gmv - gmvComDesconto, gmvComDesconto];
        type Soma = { quantidade: number; gmv: number; gmvComDesconto: number };
        const somar = (lista: Soma[]): Soma => ({
            quantidade: lista.reduce((s, x) => s + x.quantidade, 0),
            gmv: lista.reduce((s, x) => s + x.gmv, 0),
            gmvComDesconto: lista.reduce((s, x) => s + x.gmvComDesconto, 0),
        });
        const arvore = [...grupos.entries()]
            .map(([grupo, itens]) => {
                const filhos = [...itens.entries()]
                    .map(([item, lotes]) => {
                        const t = somar(lotes.map((l) => l.lote));
                        const folhas = [...lotes].sort((a, b) => b.lote.gmv - a.lote.gmv).map(({ row, lote }) => ({ id: row.id, rotulo: row.lote, valores: valores(lote.quantidade, lote.gmv, lote.gmvComDesconto) }));
                        return { id: `${grupo}|${item}`, rotulo: item, valores: valores(t.quantidade, t.gmv, t.gmvComDesconto), filhos: folhas, soma: t };
                    })
                    .sort((a, b) => b.soma.gmv - a.soma.gmv);
                const t = somar(filhos.map((f) => f.soma));
                return { id: grupo, rotulo: grupo, valores: valores(t.quantidade, t.gmv, t.gmvComDesconto), filhos, soma: t };
            })
            .sort((a, b) => b.soma.gmv - a.soma.gmv);
        const t = somar(arvore.map((g) => g.soma));
        // O total é o "Ingressos" do mix (REL-213); o valor unitário do total é total ÷ quantidade, como no Borderô.
        return { nos: arvore as NoDaArvore[], total: valores(t.quantidade, t.gmv, t.gmvComDesconto) };
    }, [rows]);

    return (
        <Bloco titulo="Ingressos avulsos">
            {nos.length === 0 ? (
                <VazioDoBloco texto="Nenhum ingresso vendido no período." />
            ) : (
                <div className="border-t border-secondary">
                    <TabelaEmArvore
                        primeiraColuna="Grupo, item e lote"
                        colunas={COLUNAS_DOS_AVULSOS}
                        nos={nos}
                        total={total}
                        ordenavel={false}
                        larguraDaPrimeiraNoCelular="w-[46%]"
                        larguraDaPrimeira="md:w-[21%]"
                    />
                </div>
            )}
        </Bloco>
    );
};

/* ------------------------------------------------------------------ */
/*  Combos e Produtos: tabela do DS (REL-245)                         */
/* ------------------------------------------------------------------ */

/** Campos de valor comuns a combo e produto, para os detalhes no celular. */
const camposDeValor = (r: ProdutoRow) => [
    { rotulo: "Quantidade", valor: numberFormatter.format(r.quantidade) },
    { rotulo: "Valor unitário médio", valor: currencyFormatter.format(r.valorUnitario) },
    { rotulo: "Valor total bruto", valor: currencyFormatter.format(r.gmv) },
    { rotulo: "Desconto", valor: currencyFormatter.format(r.desconto) },
    { rotulo: "Valor total c/ desconto", valor: currencyFormatter.format(r.gmvComDesconto) },
];

/** Combos e Produtos: o mesmo bloco, com as vendas reais do período (REL-213). */
const ItensVendidosCard = ({ titulo, coluna, vazio, rows }: { titulo: string; coluna: string; vazio: string; rows: ProdutoRow[] }) => {
    const { ordem, setOrdem, ordenadas } = useOrdemDaTabela(rows, { column: "gmv", direction: "descending" });
    const linha = useLinhaAberta<ProdutoRow>();
    return (
        <Bloco titulo={titulo}>
            {rows.length === 0 ? (
                <VazioDoBloco texto={vazio} />
            ) : (
                <>
                    <div className="hidden border-t border-secondary md:block">
                        <Table aria-label={titulo} size="sm" sortDescriptor={ordem} onSortChange={setOrdem}>
                            <Table.Header>
                                <Table.Head id="nome" isRowHeader allowsSorting className="w-full">
                                    <RotuloDaColuna>{coluna}</RotuloDaColuna>
                                </Table.Head>
                                <Table.Head id="quantidade" allowsSorting className={DIREITA}>
                                    <RotuloDaColuna>Quantidade</RotuloDaColuna>
                                </Table.Head>
                                <Table.Head id="valorUnitario" allowsSorting className={DIREITA}>
                                    <RotuloDaColuna>Valor unitário médio</RotuloDaColuna>
                                </Table.Head>
                                <Table.Head id="gmv" allowsSorting className={DIREITA}>
                                    <RotuloDaColuna>Valor total bruto</RotuloDaColuna>
                                </Table.Head>
                                <Table.Head id="desconto" allowsSorting className={DIREITA}>
                                    <RotuloDaColuna>Desconto</RotuloDaColuna>
                                </Table.Head>
                                <Table.Head id="gmvComDesconto" allowsSorting className={DIREITA}>
                                    <RotuloDaColuna>Valor total c/ desconto</RotuloDaColuna>
                                </Table.Head>
                            </Table.Header>
                            <Table.Body items={ordenadas}>
                                {(row) => (
                                    <Table.Row id={row.id}>
                                        {/* O nome quebra linha: a tabela não rola para o lado (REL-228). */}
                                        <Table.Cell className="min-w-40 font-medium break-words text-primary">{row.nome}</Table.Cell>
                                        <Table.Cell className="text-right whitespace-nowrap tabular-nums">{numberFormatter.format(row.quantidade)}</Table.Cell>
                                        <Table.Cell className="text-right whitespace-nowrap tabular-nums">{currencyFormatter.format(row.valorUnitario)}</Table.Cell>
                                        <Table.Cell className="text-right whitespace-nowrap tabular-nums">{currencyFormatter.format(row.gmv)}</Table.Cell>
                                        <Table.Cell className="text-right whitespace-nowrap tabular-nums">{currencyFormatter.format(row.desconto)}</Table.Cell>
                                        <Table.Cell className="text-right font-medium whitespace-nowrap text-primary tabular-nums">{currencyFormatter.format(row.gmvComDesconto)}</Table.Cell>
                                    </Table.Row>
                                )}
                            </Table.Body>
                        </Table>
                    </div>
                    {/* Celular: tabela-lista; o toque abre todas as colunas (UI-MOB-005). */}
                    <ListaDaTabela
                        rotulo={titulo}
                        className="border-t border-secondary"
                        itens={ordenadas}
                        chave={(r) => r.id}
                        titulo={(r) => r.nome}
                        apoio={(r) => `${numberFormatter.format(r.quantidade)} vendidos`}
                        destaque={(r) => <span className="font-medium">{currencyFormatter.format(r.gmvComDesconto)}</span>}
                        onAbrir={linha.abrir}
                    />
                    {linha.aberta && <DetalhesDaLinha titulo={linha.aberta.nome} grupos={[{ campos: camposDeValor(linha.aberta) }]} onFechar={linha.fechar} />}
                </>
            )}
        </Bloco>
    );
};

/* ------------------------------------------------------------------ */
/*  Ingressos com cupom: tabela do DS (REL-245)                       */
/* ------------------------------------------------------------------ */

const IngressosComCupomCard = ({ cupons }: { cupons: CupomRow[] }) => {
    // Abre ordenada por quantidade, decrescente (REL-41).
    const { ordem, setOrdem, ordenadas } = useOrdemDaTabela(cupons, { column: "quantidade", direction: "descending" });
    const linha = useLinhaAberta<CupomRow>();

    return (
        <Bloco titulo="Quantidade de ingressos com cupom">
            {cupons.length === 0 ? (
                <VazioDoBloco texto="Nenhum pedido com cupom no período." />
            ) : (
                <>
                    <div className="hidden border-t border-secondary md:block">
                        <Table aria-label="Ingressos com cupom" size="sm" sortDescriptor={ordem} onSortChange={setOrdem}>
                            <Table.Header>
                                <Table.Head id="cupom" isRowHeader allowsSorting className="w-full">
                                    <RotuloDaColuna>Cupom</RotuloDaColuna>
                                </Table.Head>
                                <Table.Head id="quantidade" allowsSorting className={DIREITA}>
                                    <RotuloDaColuna>Quantidade</RotuloDaColuna>
                                </Table.Head>
                                <Table.Head id="valor" allowsSorting className={DIREITA}>
                                    <RotuloDaColuna>Valor</RotuloDaColuna>
                                </Table.Head>
                                <Table.Head id="valorDesconto" allowsSorting className={DIREITA}>
                                    <RotuloDaColuna>Valor do desconto</RotuloDaColuna>
                                </Table.Head>
                                <Table.Head id="valorTotal" allowsSorting className={DIREITA}>
                                    <RotuloDaColuna>Valor total</RotuloDaColuna>
                                </Table.Head>
                            </Table.Header>
                            <Table.Body items={ordenadas}>
                                {(row) => (
                                    <Table.Row id={row.id}>
                                        <Table.Cell className="font-medium break-words text-primary">{row.cupom}</Table.Cell>
                                        <Table.Cell className="text-right whitespace-nowrap tabular-nums">{numberFormatter.format(row.quantidade)}</Table.Cell>
                                        <Table.Cell className="text-right whitespace-nowrap tabular-nums">{currencyFormatter.format(row.valor)}</Table.Cell>
                                        <Table.Cell className="text-right whitespace-nowrap tabular-nums">{currencyFormatter.format(row.valorDesconto)}</Table.Cell>
                                        <Table.Cell className="text-right font-medium whitespace-nowrap text-primary tabular-nums">{currencyFormatter.format(row.valorTotal)}</Table.Cell>
                                    </Table.Row>
                                )}
                            </Table.Body>
                        </Table>
                    </div>
                    <ListaDaTabela
                        rotulo="Ingressos com cupom"
                        className="border-t border-secondary"
                        itens={ordenadas}
                        chave={(r) => r.id}
                        titulo={(r) => r.cupom}
                        apoio={(r) => `${numberFormatter.format(r.quantidade)} ingressos`}
                        destaque={(r) => <span className="font-medium">{currencyFormatter.format(r.valorTotal)}</span>}
                        onAbrir={linha.abrir}
                    />
                    {linha.aberta && (
                        <DetalhesDaLinha
                            titulo={linha.aberta.cupom}
                            grupos={[
                                {
                                    campos: [
                                        { rotulo: "Quantidade", valor: numberFormatter.format(linha.aberta.quantidade) },
                                        { rotulo: "Valor", valor: currencyFormatter.format(linha.aberta.valor) },
                                        { rotulo: "Valor do desconto", valor: currencyFormatter.format(linha.aberta.valorDesconto) },
                                        { rotulo: "Valor total", valor: currencyFormatter.format(linha.aberta.valorTotal) },
                                    ],
                                },
                                {
                                    titulo: "Itens com o cupom",
                                    campos: linha.aberta.lotes.map((l) => ({
                                        rotulo: l.lote,
                                        valor: `${numberFormatter.format(l.quantidade)} ${l.quantidade === 1 ? "ingresso" : "ingressos"}, ${currencyFormatter.format(l.valorTotal)}`,
                                    })),
                                },
                            ]}
                            onFechar={linha.fechar}
                        />
                    )}
                </>
            )}
        </Bloco>
    );
};
