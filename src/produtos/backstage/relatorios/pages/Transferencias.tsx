import { Fragment, useEffect, useMemo, useState } from "react";
import { ArrowRight } from "@untitledui/icons";
import type { SortDescriptor } from "react-aria-components";
import { PaginationCardAdvanced } from "@/components/application/pagination/pagination";
import { Table } from "@/components/application/table/table";
import { Avatar } from "@/components/base/avatar/avatar";
import { cx } from "@/utils/cx";
import { useBanco, type Evento as EventoBanco, type HistoricoVendas, type IngressoEmitido, type Pedido as PedidoBanco } from "@/plataforma";
import { BackstageLayout } from "../../components/Backstage";
import { useTodosOsEventos } from "../../components/escopo-dos-relatorios";
import { eventos as eventosDaOrganizacao, useEventoAtual } from "../../eventos/data/eventos";
import { RelatorioPageHeader } from "../components/RelatorioPageHeader";
import { RelatorioFiltersProvider, inDateRange, matchRow, periodoCompleto, useRelatorioFilters, type FilterFieldDef } from "../components/relatorio-filters";
import { CarregandoRelatorio, useItemNaUrl, useRelatorioCarregando } from "../components/estado-dos-relatorios";
import { ListaDaTabela, PainelLateral } from "../components/TabelaLista";
import { MetricaDoRelatorio, PainelDeMetricas, PainelDoRelatorio } from "../components/visual-dos-relatorios";
import { dataEHora, numberFormatter, useEventoDosRelatorios } from "../data/event";
import { useDatasetDoEvento, type DatasetDoEvento } from "../data/vendas-banco";

/* ------------------------------------------------------------------ */
/*  Dados do evento em contexto (ou de todos os eventos, BKS-27)       */
/*                                                                     */
/*  Totais vêm do dataset do banco (`useDatasetDoEvento`), no período  */
/*  aplicado. A lista junta as transferências reais (ingressos         */
/*  emitidos com status "transferido" e o ingresso que os substituiu)  */
/*  com transferências fictícias geradas do catálogo e do histórico de */
/*  vendas do próprio evento.                                          */
/* ------------------------------------------------------------------ */

interface HolderHistorico {
    nome: string;
    email: string;
    /** Vazio nas transferências reais: o banco não guarda CPF do titular. */
    cpf: string;
    data: string;
}

interface Transferencia {
    id: string;
    /** Nome do evento: a origem da linha em "Todos os eventos" (REL-227). */
    evento: string;
    code: string;
    nomeComprador: string;
    emailComprador: string;
    cpfComprador: string;
    portadorAnteriorNome: string;
    portadorAnteriorEmail: string;
    portadorAnteriorCpf: string;
    portadorAtualNome: string;
    portadorAtualEmail: string;
    portadorAtualCpf: string;
    /** Quantas vezes o ingresso trocou de mão. */
    vezes: number;
    sessao: string;
    grupo: string;
    tipoIngresso: string;
    /** Data da última transferência (ms): ordena e filtra pelo período. */
    transferidoEm: number;
    /** Cadeia completa de portadores, do comprador original ao atual. */
    historico: HolderHistorico[];
}

const p2 = (n: number) => String(n).padStart(2, "0");
// Um formato de data só nos relatórios (T9): "26 nov 2026, 20:00".
const dataBr = (ms: number) => dataEHora(new Date(ms));

/** Nomes fictícios e genéricos para as transferências geradas. */
const PRIMEIROS = ["Ana", "Bruno", "Camila", "Diego", "Eduarda", "Felipe", "Gabriela", "Henrique", "Isabela", "João", "Larissa", "Lucas", "Mariana", "Nicolas", "Olívia", "Pedro", "Rafaela", "Samuel", "Tatiana", "Vinícius", "Beatriz", "Caio", "Letícia", "Mateus"];
const SOBRENOMES = ["Silva", "Souza", "Oliveira", "Santos", "Lima", "Costa", "Pereira", "Almeida", "Ribeiro", "Carvalho", "Gomes", "Martins", "Rocha", "Barbosa", "Araújo", "Melo", "Cardoso", "Teixeira", "Moreira", "Nunes"];
const PROVEDORES = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com"];
const ALFABETO_DO_CODIGO = [..."0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
/** Quantas vezes o ingresso trocou de mão: quase sempre uma. */
const VEZES = [
    { n: 1, peso: 0.75 },
    { n: 2, peso: 0.15 },
    { n: 3, peso: 0.06 },
    { n: 4, peso: 0.03 },
    { n: 5, peso: 0.01 },
];

/** Até quantas transferências fictícias por evento. */
const MAXIMO_POR_EVENTO = 1500;

function mulberry32(seed: number) {
    return function () {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const sementeDe = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const emailDe = (nome: string, sufixo: number, provedor: string) =>
    `${nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]+/g, ".")}${sufixo}@${provedor}`;

function descricaoDaSessao(ev: EventoBanco, inicio: string, todos: boolean) {
    const d = new Date(inicio);
    // Um formato de data só (T9): "26 nov 2026, 20:00, Local".
    const base = `${dataEHora(d)}${ev.local ? `, ${ev.local}` : ""}`;
    return todos ? `${ev.nome}, ${base}` : base;
}

/** Setor do catálogo (por nome, como no dataset), com os tipos de ingresso e as sessões em que existe. */
interface SetorDoEvento {
    nome: string;
    tipos: { nome: string; peso: number }[];
    sessoes: string[];
}

function setoresDoEvento(ev: EventoBanco, historico: HistoricoVendas | undefined, todos: boolean) {
    const setores = new Map<string, SetorDoEvento>();
    for (const s of ev.sessoes)
        for (const g of s.grupos) {
            const nome = todos ? `${g.nome} (${ev.nome})` : g.nome;
            const setor = setores.get(nome) ?? { nome, tipos: [], sessoes: [] };
            const descricao = descricaoDaSessao(ev, s.inicio, todos);
            if (!setor.sessoes.includes(descricao)) setor.sessoes.push(descricao);
            for (const t of g.ingressos) {
                const peso = t.lotes.reduce((n, l) => n + (historico?.porLote[l.id] ?? 0), 0);
                const atual = setor.tipos.find((x) => x.nome === t.nome);
                if (atual) atual.peso += peso;
                else setor.tipos.push({ nome: t.nome, peso });
            }
            setores.set(nome, setor);
        }
    for (const setor of setores.values()) if (setor.tipos.every((t) => t.peso === 0)) setor.tipos.forEach((t) => (t.peso = 1));
    return setores;
}

/**
 * Transferências reais: cada ingresso "transferido" aponta para o ingresso que o substituiu (mesmo
 * pedido, lote e sessão, emitido depois e fora do lote original do pedido). A cadeia vira uma linha.
 */
function transferenciasDoBanco(ingressos: IngressoEmitido[], pedidos: Record<string, PedidoBanco>, evs: Map<string, EventoBanco>, todos: boolean): Transferencia[] {
    const porChave = new Map<string, IngressoEmitido[]>();
    for (const i of ingressos) {
        if (!evs.has(i.eventoId)) continue;
        const chave = `${i.pedidoId}|${i.loteId}|${i.sessaoId}`;
        porChave.set(chave, [...(porChave.get(chave) ?? []), i]);
    }
    const ms = (s: string) => new Date(s).getTime();
    const linhas: Transferencia[] = [];
    for (const grupo of porChave.values()) {
        if (!grupo.some((i) => i.status === "transferido")) continue;
        grupo.sort((a, b) => ms(a.emitidoEm) - ms(b.emitidoEm));
        // Os ingressos da emissão original saem juntos; os que chegam depois são de transferência.
        const primeiraEmissao = ms(grupo[0].emitidoEm);
        const original = (i: IngressoEmitido) => ms(i.emitidoEm) - primeiraEmissao < 5000;
        const seguinte = new Map<string, IngressoEmitido>();
        const usados = new Set<string>();
        for (const t of grupo) {
            if (t.status !== "transferido") continue;
            const novo = grupo.find((x) => x.id !== t.id && !usados.has(x.id) && !original(x) && ms(x.emitidoEm) > ms(t.emitidoEm));
            if (novo) {
                seguinte.set(t.id, novo);
                usados.add(novo.id);
            }
        }
        for (const inicio of grupo.filter((i) => !usados.has(i.id) && i.status === "transferido")) {
            const cadeia = [inicio];
            for (let atual = seguinte.get(inicio.id); atual; atual = seguinte.get(atual.id)) cadeia.push(atual);
            const ev = evs.get(inicio.eventoId)!;
            const pedido = pedidos[inicio.pedidoId];
            const ultimo = cadeia[cadeia.length - 1];
            const temSucessor = cadeia.length > 1;
            const holders: HolderHistorico[] = cadeia.map((i) => ({ nome: i.titular.nome, email: i.titular.email, cpf: "", data: dataBr(ms(i.emitidoEm)) }));
            if (!temSucessor) holders.push({ nome: "Destinatário não encontrado", email: "—", cpf: "", data: dataBr(ms(inicio.atualizadoEm)) });
            const anterior = holders[holders.length - 2];
            const atual = holders[holders.length - 1];
            const sessao = ev.sessoes.find((s) => s.id === inicio.sessaoId);
            linhas.push({
                id: inicio.pedidoId,
                code: ultimo.codigo,
                nomeComprador: pedido?.comprador.nome ?? inicio.titular.nome,
                emailComprador: pedido?.comprador.email ?? inicio.titular.email,
                cpfComprador: "",
                portadorAnteriorNome: anterior.nome,
                portadorAnteriorEmail: anterior.email,
                portadorAnteriorCpf: "",
                portadorAtualNome: atual.nome,
                portadorAtualEmail: atual.email,
                portadorAtualCpf: "",
                vezes: holders.length - 1,
                evento: ev.nome,
                sessao: sessao ? descricaoDaSessao(ev, sessao.inicio, todos) : "—",
                grupo: todos ? `${inicio.rotulo.grupo} (${ev.nome})` : inicio.rotulo.grupo,
                tipoIngresso: inicio.rotulo.ingresso,
                transferidoEm: temSucessor ? ms(ultimo.emitidoEm) : ms(inicio.atualizadoEm),
                historico: holders,
            });
        }
    }
    return linhas;
}

/**
 * Transferências fictícias do evento: tantas quanto o total do dataset (menos as reais), em
 * setores e tipos de ingresso sorteados pelo que o evento vendeu, com datas dentro da janela de
 * vendas. Determinístico por evento.
 */
function gerarTransferencias(
    ev: EventoBanco,
    historico: HistoricoVendas | undefined,
    vendidosPorGrupo: Map<string, number>,
    quantidade: number,
    todos: boolean,
): Transferencia[] {
    const setores = setoresDoEvento(ev, historico, todos);
    const grupos = [...setores.values()].map((s) => ({ setor: s, peso: vendidosPorGrupo.get(s.nome) ?? 0 })).filter((g) => g.peso > 0 && g.setor.sessoes.length > 0 && g.setor.tipos.some((t) => t.peso > 0));
    if (quantidade <= 0 || grupos.length === 0) return [];
    const rng = mulberry32(sementeDe(`transferencias|${ev.id}`));
    const um = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)];
    const pesado = <T extends { peso: number }>(arr: T[]): T => {
        let r = rng() * arr.reduce((s, x) => s + x.peso, 0);
        for (const x of arr) {
            r -= x.peso;
            if (r <= 0) return x;
        }
        return arr[arr.length - 1];
    };
    const serie = historico?.serie ?? [];
    const acumulado = serie.reduce<number[]>((acc, [i]) => [...acc, (acc[acc.length - 1] ?? 0) + Math.max(0, i)], []);
    const totalDias = acumulado[acumulado.length - 1] ?? 0;
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - serie.length);
    const pessoa = (): HolderHistorico => {
        const nome = `${um(PRIMEIROS)} ${um(SOBRENOMES)}`;
        return { nome, email: emailDe(nome, Math.floor(rng() * 90 + 10), um(PROVEDORES)), cpf: String(Math.floor(rng() * 9e10 + 1e10)), data: "" };
    };
    const rows: Transferencia[] = [];
    for (let i = 0; i < quantidade; i++) {
        const { setor } = pesado(grupos);
        const tipo = pesado(setor.tipos.filter((t) => t.peso > 0)).nome;
        // Compra num dia sorteado pelo histórico; as transferências vêm depois, até hoje.
        const comprado = new Date(inicio);
        if (totalDias > 0) {
            const r = rng() * totalDias;
            const dia = acumulado.findIndex((a) => a >= r);
            comprado.setDate(comprado.getDate() + (dia < 0 ? serie.length - 1 : dia));
        }
        comprado.setHours(Math.floor(rng() * 24), Math.floor(rng() * 60));
        const vezes = pesado(VEZES).n;
        const holders = Array.from({ length: vezes + 1 }, pessoa);
        let quando = comprado.getTime();
        holders.forEach((h, k) => {
            if (k > 0) quando = Math.min(hoje.getTime(), quando + Math.floor(rng() * 6 + 1) * 86_400_000);
            h.data = dataBr(quando);
        });
        const comprador = holders[0];
        const anterior = holders[holders.length - 2];
        const atual = holders[holders.length - 1];
        const id = Array.from({ length: 4 }, () => Math.floor(rng() * 0xffffffff).toString(16).padStart(8, "0")).join("");
        rows.push({
            id: `${id.slice(0, 8)}-${id.slice(8, 12)}-4${id.slice(13, 16)}-${id.slice(16, 20)}-${id.slice(20, 32)}`,
            code: `26${Array.from({ length: 12 }, () => um(ALFABETO_DO_CODIGO)).join("")}`,
            nomeComprador: comprador.nome,
            emailComprador: comprador.email,
            cpfComprador: comprador.cpf,
            portadorAnteriorNome: anterior.nome,
            portadorAnteriorEmail: anterior.email,
            portadorAnteriorCpf: anterior.cpf,
            portadorAtualNome: atual.nome,
            portadorAtualEmail: atual.email,
            portadorAtualCpf: atual.cpf,
            vezes,
            evento: ev.nome,
            sessao: um(setor.sessoes),
            grupo: setor.nome,
            tipoIngresso: tipo,
            transferidoEm: quando,
            historico: holders,
        });
    }
    return rows;
}

/** Transferências do evento em contexto (ou de todos), reais e fictícias, da mais recente para a mais antiga. */
function useTransferencias(dataset: DatasetDoEvento): Transferencia[] {
    const ctx = useEventoAtual();
    const todos = useTodosOsEventos();
    const { tabelas } = useBanco();
    return useMemo(() => {
        const ids = todos ? eventosDaOrganizacao.map((e) => e.id) : [ctx.id];
        const evs = new Map(ids.map((id) => [id, tabelas.eventos[id]] as const).filter((x): x is [string, EventoBanco] => !!x[1]));
        const reais = transferenciasDoBanco(Object.values(tabelas.ingressos ?? {}), tabelas.pedidos, evs, todos);

        // Vendidos por grupo no período completo, e de qual evento é cada grupo.
        const vendidosPorGrupo = new Map(dataset.consultar(null).ingressosPorGrupo.map((g) => [g.grupo, g.vendido] as const));
        const ficticias = [...evs.values()].flatMap((ev) => {
            const historico = tabelas.historico[ev.id];
            const grupos = [...setoresDoEvento(ev, historico, todos).keys()];
            const vendidos = grupos.reduce((n, g) => n + (vendidosPorGrupo.get(g) ?? 0), 0);
            const reaisDoEvento = reais.filter((r) => grupos.includes(r.grupo)).length;
            // Mesma taxa do dataset (12% dos ingressos vendidos trocam de mão).
            const quantidade = Math.min(MAXIMO_POR_EVENTO, Math.max(0, Math.round(vendidos * 0.12) - reaisDoEvento));
            return gerarTransferencias(ev, historico, vendidosPorGrupo, quantidade, todos);
        });
        return [...reais, ...ficticias].sort((a, b) => b.transferidoEm - a.transferidoEm);
    }, [ctx.id, todos, tabelas.eventos, tabelas.historico, tabelas.ingressos, tabelas.pedidos, dataset]);
}

/* ------------------------------------------------------------------ */
/*  Métricas                                                          */
/* ------------------------------------------------------------------ */

/** Percentual sem casa decimal inútil: "12%", "12,5%" (antes, "12,0%"). */
const pctFormatter = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });

/** Totais do período, no painel de métricas comum dos relatórios (REL-221). */
const TransferenciasMetricsRow = ({ total, vendidos }: { total: number; vendidos: number }) => (
    <PainelDeMetricas rotulo="Resumo das transferências" className="sm:grid-cols-3 xl:grid-cols-3">
        <MetricaDoRelatorio rotulo="Total de transferências" valor={numberFormatter.format(total)} destaque />
        <MetricaDoRelatorio rotulo="Ingressos transferidos" valor={`${pctFormatter.format(vendidos ? (total / vendidos) * 100 : 0)}%`} apoio={`dos ${numberFormatter.format(vendidos)} vendidos`} />
        <MetricaDoRelatorio rotulo="Compradores que transferiram" valor={numberFormatter.format(Math.round(total * 0.82))} />
    </PainelDeMetricas>
);

/* ------------------------------------------------------------------ */
/*  Filtros                                                           */
/* ------------------------------------------------------------------ */

const FILTER_FIELDS: FilterFieldDef[] = [
    { id: "code", label: "Código do ingresso" },
    { id: "nomeComprador", label: "Nome do comprador" },
    { id: "emailComprador", label: "E-mail do comprador" },
    { id: "cpfComprador", label: "CPF do comprador" },
    { id: "portadorAnteriorNome", label: "Nome do portador anterior" },
    { id: "portadorAnteriorEmail", label: "E-mail do portador anterior" },
    { id: "portadorAnteriorCpf", label: "CPF do portador anterior" },
    { id: "portadorAtualNome", label: "Nome do portador atual" },
    { id: "portadorAtualEmail", label: "E-mail do portador atual" },
    { id: "portadorAtualCpf", label: "CPF do portador atual" },
];

function getFieldValue(t: Transferencia, field: string): string {
    const v = (t as unknown as Record<string, unknown>)[field];
    return typeof v === "string" ? v : "";
}

/* ------------------------------------------------------------------ */
/*  Página                                                            */
/* ------------------------------------------------------------------ */

export function Transferencias() {
    const ev = useEventoDosRelatorios();
    const carregando = useRelatorioCarregando();
    return (
        <BackstageLayout activeSection="relatorios" activeItem="transferencias">
            {/* Abre no período completo de vendas, como os outros relatórios; trocar de evento recomeça os filtros. */}
            <RelatorioFiltersProvider fields={FILTER_FIELDS} key={`${ev.salesStart}|${ev.salesEnd}`} initialDateRange={periodoCompleto()}>
                <div className="flex min-w-0 flex-1 flex-col">
                    <main className="flex flex-1 flex-col gap-6">
                        <RelatorioPageHeader title="Transferências" splitControls />
                        {carregando ? <CarregandoRelatorio rotulo="Carregando transferências" /> : <TransferenciasBody />}
                    </main>
                </div>
            </RelatorioFiltersProvider>
        </BackstageLayout>
    );
}

const TransferenciasBody = () => {
    const { dateRange, filters } = useRelatorioFilters();
    const dataset = useDatasetDoEvento();
    const transferencias = useTransferencias(dataset);

    const filteredTransferencias = useMemo(() => {
        const valid = filters.filter((f) => f.field && f.value);
        return transferencias.filter((t) => inDateRange(new Date(t.transferidoEm), dateRange) && matchRow(t, valid, getFieldValue));
    }, [transferencias, dateRange, filters]);

    const periodo = useMemo(() => dataset.consultar(dateRange), [dataset, dateRange]);

    return (
        <>
            <TransferenciasMetricsRow total={periodo.transferencias.total} vendidos={periodo.ocupacao.vendido} />
            <TransferenciasTabela rows={filteredTransferencias} todos={transferencias} />
        </>
    );
};

/* ------------------------------------------------------------------ */
/*  Lista: tabela do DS no desktop, tabela-lista no celular (REL-232)  */
/* ------------------------------------------------------------------ */

const PAGE_SIZE_INICIAL = 10;

const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const formatCpf = (cpf: string): string => {
    if (!cpf.replace(/\D/g, "")) return "—";
    const digits = cpf.replace(/\D/g, "").padStart(11, "0").slice(0, 11);
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};

const vezesTexto = (n: number) => `${n} ${n === 1 ? "transferência" : "transferências"}`;
const chaveDe = (t: Transferencia) => `${t.id}-${t.code}`;

type ColunaOrdenavel = "code" | "portadorAnteriorNome" | "portadorAtualNome" | "vezes" | "transferidoEm" | "evento";

const TransferenciasTabela = ({ rows, todos: todasAsTransferencias }: { rows: Transferencia[]; todos: Transferencia[] }) => {
    const todos = useTodosOsEventos();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE_INICIAL);
    const [ordem, setOrdem] = useState<SortDescriptor>({ column: "transferidoEm", direction: "descending" });
    // Transferência aberta na URL (?item=<id>, REL-223); procura em todas, para o link valer mesmo fora do filtro.
    const aberta = useItemNaUrl();
    const selected = useMemo(() => (aberta.id ? (todasAsTransferencias.find((t) => chaveDe(t) === aberta.id) ?? null) : null), [todasAsTransferencias, aberta.id]);

    const ordenadas = useMemo(() => {
        const col = ordem.column as ColunaOrdenavel;
        const dir = ordem.direction === "ascending" ? 1 : -1;
        return [...rows].sort((a, b) => {
            const va = a[col];
            const vb = b[col];
            if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
            return String(va).localeCompare(String(vb), "pt-BR", { numeric: true }) * dir;
        });
    }, [rows, ordem]);

    const totalPages = Math.max(1, Math.ceil(ordenadas.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const visibleRows = useMemo(() => ordenadas.slice((safePage - 1) * pageSize, safePage * pageSize), [ordenadas, safePage, pageSize]);

    // Filtro mudou (nova referência de `rows`) → volta para a 1ª página.
    useEffect(() => setPage(1), [rows]);

    return (
        <PainelDoRelatorio titulo="Transferências realizadas" subtitulo={`${numberFormatter.format(rows.length)} ${rows.length === 1 ? "transferência" : "transferências"} no período`}>
            <div className="pt-3">
                {visibleRows.length === 0 ? (
                    <p role="status" className="border-t border-secondary px-5 py-12 text-center text-sm text-tertiary">
                        Nenhuma transferência corresponde aos filtros aplicados.
                    </p>
                ) : (
                    <>
                        <div className="hidden border-t border-secondary md:block">
                            <Table
                                aria-label="Transferências realizadas"
                                size="sm"
                                sortDescriptor={ordem}
                                onSortChange={(d) => {
                                    setOrdem(d);
                                    setPage(1);
                                }}
                                onRowAction={(key) => aberta.abrir(String(key))}
                            >
                                <Table.Header>
                                    <Table.Head id="code" label="Código" isRowHeader allowsSorting />
                                    <Table.Head id="portadorAnteriorNome" label="Portador anterior" allowsSorting />
                                    <Table.Head id="portadorAtualNome" label="Portador atual" allowsSorting />
                                    {/* Em "Todos os eventos", de qual evento é cada transferência (REL-227). */}
                                    {todos ? <Table.Head id="evento" label="Evento" allowsSorting /> : null}
                                    <Table.Head id="vezes" label="Trocas" allowsSorting className="text-right" />
                                    <Table.Head id="transferidoEm" label="Última transferência" allowsSorting />
                                </Table.Header>
                                <Table.Body items={visibleRows.map((t) => ({ ...t, key: chaveDe(t) }))}>
                                    {(row) => (
                                        <Table.Row id={row.key} className="cursor-pointer">
                                            <Table.Cell className="font-mono font-medium whitespace-nowrap text-primary">{row.code}</Table.Cell>
                                            <Table.Cell>
                                                <Pessoa nome={row.portadorAnteriorNome} />
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Pessoa nome={row.portadorAtualNome} destaque />
                                            </Table.Cell>
                                            {todos ? <Table.Cell className="min-w-48">{row.evento}</Table.Cell> : null}
                                            <Table.Cell className="text-right tabular-nums">{numberFormatter.format(row.vezes)}</Table.Cell>
                                            <Table.Cell className="whitespace-nowrap tabular-nums">{dataEHora(new Date(row.transferidoEm))}</Table.Cell>
                                        </Table.Row>
                                    )}
                                </Table.Body>
                            </Table>
                        </div>
                        {/* Celular: tabela-lista; o toque abre os detalhes (UI-MOB-005). */}
                        <ListaDaTabela
                            rotulo="Transferências realizadas"
                            className="border-t border-secondary"
                            itens={visibleRows}
                            chave={chaveDe}
                            titulo={(t) => t.portadorAtualNome}
                            apoio={(t) => (todos ? `De ${t.portadorAnteriorNome}, ${t.evento}` : `De ${t.portadorAnteriorNome}`)}
                            destaque={(t) => <span className="text-tertiary">{vezesTexto(t.vezes)}</span>}
                            onAbrir={(t) => aberta.abrir(chaveDe(t))}
                        />
                    </>
                )}

                {rows.length > 0 && (
                <PaginationCardAdvanced
                    page={safePage}
                    total={totalPages}
                    pageSize={pageSize}
                    onPageChange={(p: number) => setPage(p)}
                    onPageSizeChange={(size: number) => {
                        setPageSize(size);
                        setPage(1);
                    }}
                />
                )}
            </div>

            {selected && <TransferenciaDetailsSlideOut row={selected} onClose={aberta.fechar} />}
        </PainelDoRelatorio>
    );
};

const Pessoa = ({ nome, destaque = false }: { nome: string; destaque?: boolean }) => (
    <span className="flex min-w-0 items-center gap-2.5">
        <Avatar size="xs" initials={getInitials(nome)} />
        <span className={cx("truncate", destaque ? "font-medium text-primary" : "text-secondary")}>{nome}</span>
    </span>
);

/* ------------------------------------------------------------------ */
/*  Histórico de transferência (cadeia completa de portadores)         */
/* ------------------------------------------------------------------ */

const HistoricoHolder = ({ holder, emphasis = false }: { holder: HolderHistorico; emphasis?: boolean }) => (
    <div className={cx("flex items-start gap-3 rounded-lg bg-secondary p-3 ring-1 ring-border-secondary", emphasis && "ring-2 ring-brand")}>
        <Avatar size="md" initials={getInitials(holder.nome)} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {holder.data && <span className="text-sm text-tertiary tabular-nums">{holder.data}</span>}
            <span className={cx("truncate text-sm text-primary", emphasis ? "font-semibold" : "font-medium")}>{holder.nome}</span>
            <span className="truncate text-sm text-brand-secondary">{holder.email}</span>
            <span className="text-sm text-tertiary tabular-nums">{formatCpf(holder.cpf)}</span>
        </div>
    </div>
);

/* ------------------------------------------------------------------ */
/*  Detalhes, no painel lateral do DS (REL-225)                        */
/* ------------------------------------------------------------------ */

const TransferenciaDetailsSlideOut = ({ row, onClose }: { row: Transferencia; onClose: () => void }) => (
    <PainelLateral titulo="Detalhes da transferência" subtitulo={vezesTexto(row.vezes)} onFechar={onClose}>
        <div className="flex flex-col divide-y divide-secondary">
            <section className="flex flex-col gap-3 py-5">
                <h3 className="text-md font-semibold text-primary">Identificação</h3>
                <dl className="flex flex-col gap-3">
                    <DetailRow label="Evento" value={row.evento} />
                    <DetailRow label="Código do ingresso" value={row.code} isMono />
                    <DetailRow label="ID da transação" value={row.id} isMono />
                    <DetailRow label="Sessão" value={row.sessao} />
                    <DetailRow label="Grupo de ingressos" value={row.grupo} />
                    <DetailRow label="Tipo de ingresso" value={row.tipoIngresso} />
                </dl>
            </section>

            <section className="flex flex-col gap-3 py-5">
                <h3 className="text-md font-semibold text-primary">Comprador original</h3>
                <dl className="flex flex-col gap-3">
                    <DetailRow label="Nome" value={row.nomeComprador} />
                    <DetailRow label="E-mail" value={row.emailComprador} isEmail />
                    <DetailRow label="CPF" value={formatCpf(row.cpfComprador)} />
                </dl>
            </section>

            {/* Histórico completo: todas as transferências, em ordem */}
            <section className="flex flex-col gap-3 py-5">
                <h3 className="text-md font-semibold text-primary">Histórico de transferência</h3>
                {row.historico.map((holder, i, arr) => (
                    <Fragment key={i}>
                        <HistoricoHolder holder={holder} emphasis={i === arr.length - 1} />
                        {i < arr.length - 1 && (
                            <div className="flex items-center gap-2 pl-1.5 text-tertiary">
                                <ArrowRight aria-hidden="true" className="size-4 rotate-90 text-fg-quaternary" />
                                <span className="text-sm">transferido para</span>
                            </div>
                        )}
                    </Fragment>
                ))}
            </section>
        </div>
    </PainelLateral>
);

const DetailRow = ({ label, value, isEmail = false, isMono = false }: { label: string; value: string; isEmail?: boolean; isMono?: boolean }) => (
    <div className="flex flex-col gap-0.5">
        <dt className="text-sm text-tertiary">{label}</dt>
        <dd className={cx("text-sm break-words", isEmail ? "text-brand-secondary" : "text-secondary", isMono && "font-mono text-sm text-primary")}>{value}</dd>
    </div>
);
