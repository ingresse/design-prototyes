import { Fragment, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, SearchLg } from "@untitledui/icons";
import { motion } from "motion/react";
import { Bar, CartesianGrid, Cell, ComposedChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Avatar } from "@/components/base/avatar/avatar";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { cx } from "@/utils/cx";
import { useBanco, type CanalMetrica, type Evento as EventoBanco, type HistoricoVendas, type IngressoEmitido, type Pedido as PedidoBanco } from "@/plataforma";
import { BackstageLayout } from "../../components/Backstage";
import { useTodosOsEventos } from "../../components/escopo-dos-relatorios";
import { eventos as eventosDaOrganizacao, useEventoAtual } from "../../eventos/data/eventos";
import { ExportMenu, RelatorioPageHeader } from "../components/RelatorioPageHeader";
import { RelatorioFiltersProvider, inDateRange, matchRow, periodoCompleto, useRelatorioFilters, type FilterFieldDef } from "../components/relatorio-filters";
import { AbrirDaLinha, AlternarDaArvore, DetalhesDaLinha, PainelLateral, linhaQueAbre, useLinhaAberta } from "../components/TabelaLista";
import { CarregandoRelatorio, useItemNaUrl, useLinhaFilhaAnimada, useRelatorioCarregando } from "../components/estado-dos-relatorios";
import { BarraDePontos, MetricaDoRelatorio, PainelDeMetricas } from "../components/visual-dos-relatorios";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { SortableHeader } from "../components/SortableHeader";
import { useSortableTable } from "../utils/useSortableTable";
import { dataEHora, numberFormatter, useEventoDosRelatorios } from "../data/event";
import { useDatasetDoEvento, type DatasetDoEvento } from "../data/vendas-banco";


/* ------------------------------------------------------------------ */
/*  Dados do evento em contexto (ou de todos os eventos, BKS-27)       */
/*                                                                     */
/*  Totais, faixas de horário e validação por grupo vêm do dataset do  */
/*  banco (`useDatasetDoEvento`), no período aplicado. A lista de      */
/*  portadores junta os ingressos emitidos de verdade (tabela          */
/*  `ingressos`) com portadores fictícios gerados do catálogo e do     */
/*  histórico de vendas do próprio evento.                             */
/* ------------------------------------------------------------------ */

interface AcessoNode {
    id: string;
    nome: string;
    vendidos?: number;
    validados?: number;
    children?: AcessoNode[];
}

type AcessoDoPeriodo = ReturnType<DatasetDoEvento["consultar"]>["acesso"];

const slugSetor = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const p2 = (n: number) => String(n).padStart(2, "0");
const pad = (n: number, len: number) => String(n).padStart(len, "0");

const sumVendidos = (node: AcessoNode): number => (node.children?.length ? node.children.reduce((s, c) => s + sumVendidos(c), 0) : node.vendidos ?? 0);
const sumValidados = (node: AcessoNode): number => (node.children?.length ? node.children.reduce((s, c) => s + sumValidados(c), 0) : node.validados ?? 0);

const BAR_COLOR = "var(--color-brand-600)";

/* ------------------------------------------------------------------ */
/*  Controle de acesso — lista por portador                           */
/* ------------------------------------------------------------------ */

type StatusAcesso = "validado" | "pendente";

const ACESSO_STATUS: Record<StatusAcesso, { label: string; color: "success" | "gray" }> = {
    validado: { label: "Validado", color: "success" },
    pendente: { label: "Não validado", color: "gray" },
};

interface PortadorAcesso {
    id: string;
    /** Nome do evento do ingresso: a origem da linha em "Todos os eventos" (REL-227). */
    evento: string;
    sessaoId: string;
    portador: string;
    emailPortador: string;
    /** Vazio nos ingressos reais: o banco não guarda CPF do titular. */
    cpf: string;
    comprador: string;
    emailComprador: string;
    idTransacao: string;
    idIngresso: string;
    qrCode: string;
    sessao: string;
    canal: string;
    grupo: string;
    tipoIngresso: string;
    portao?: string;
    status: StatusAcesso;
    horario?: string;
    /** Quando o ingresso foi comprado (ms): filtra a lista pelo período. */
    compradoEm: number;
}

/** Setor (grupo de ingressos) do catálogo, com o nome usado no dataset. */
interface SetorDoEvento {
    nome: string;
    eventoId: string;
    /** Tipos de ingresso do setor, com o peso de venda do histórico. */
    tipos: { nome: string; peso: number }[];
    sessoes: { id: string; descricao: string }[];
    portoes: string[];
}

/** O que o gerador precisa de cada evento: início da sessão, dia a dia de vendas e canais. */
interface EventoDoAcesso {
    id: string;
    nome: string;
    /** Minuto do dia em que a primeira sessão começa. */
    inicioMin: number;
    /** Primeiro dia da série de vendas (00:00). */
    inicio: Date;
    pesoDoDia: number[];
    canais: { nome: string; peso: number }[];
}

interface AcessoDoEvento {
    setores: Map<string, SetorDoEvento>;
    eventos: Map<string, EventoDoAcesso>;
    portadores: PortadorAcesso[];
    grupos: string[];
    tipos: string[];
    canais: string[];
    consultar: DatasetDoEvento["consultar"];
}

const CANAL_DA_METRICA: Record<CanalMetrica, string> = { online: "Online", bilheteria: "Bilheteria", cortesia: "Cortesia" };
const CANAL_DO_PEDIDO: Record<PedidoBanco["canal"], string> = { site: "Online", link: "Online", app: "Online", bilheteria: "Bilheteria", cortesia: "Cortesia" };
const ORDEM_DOS_CANAIS = ["Online", "Bilheteria", "Cortesia"];

/** Faixas de entrada (minutos a partir do início da sessão, 30 min cada), com pico meia hora antes. */
const LARGURA_DA_FAIXA = 30;
const FAIXAS_DE_ENTRADA = [-150, -120, -90, -60, -30, 0, 30, 60].map((offset) => ({ offset, peso: Math.exp(-((offset + 30) ** 2) / (2 * 55 ** 2)) }));
const minutoDoDia = (min: number) => ((min % 1440) + 1440) % 1440;
const rotuloDaFaixa = (min: number) => `${p2(Math.floor(minutoDoDia(min) / 60))}h${p2(minutoDoDia(min) % 60)}`;
const horaDe = (min: number) => `${p2(Math.floor(minutoDoDia(min) / 60))}:${p2(minutoDoDia(min) % 60)}`;

/** Nomes fictícios e genéricos para os portadores gerados. */
const PRIMEIROS = ["Ana", "Bruno", "Camila", "Diego", "Eduarda", "Felipe", "Gabriela", "Henrique", "Isabela", "João", "Larissa", "Lucas", "Mariana", "Nicolas", "Olívia", "Pedro", "Rafaela", "Samuel", "Tatiana", "Vinícius", "Beatriz", "Caio", "Letícia", "Mateus"];
const SOBRENOMES = ["Silva", "Souza", "Oliveira", "Santos", "Lima", "Costa", "Pereira", "Almeida", "Ribeiro", "Carvalho", "Gomes", "Martins", "Rocha", "Barbosa", "Araújo", "Melo", "Cardoso", "Teixeira", "Moreira", "Nunes"];
const PROVEDORES = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com"];

/** Até quantos portadores fictícios por evento (o histórico pode ter dezenas de milhares de ingressos). */
const MAXIMO_POR_EVENTO = 3000;

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

/** Junta os setores do evento (por nome, como no dataset) e o contexto de geração dele. */
function lerCatalogo(ev: EventoBanco, historico: HistoricoVendas | undefined, todos: boolean, setores: Map<string, SetorDoEvento>, eventos: Map<string, EventoDoAcesso>) {
    const nomeDoGrupo = (g: string) => (todos ? `${g} (${ev.nome})` : g);
    for (const s of ev.sessoes)
        for (const g of s.grupos) {
            const nome = nomeDoGrupo(g.nome);
            const setor = setores.get(nome) ?? { nome, eventoId: ev.id, tipos: [], sessoes: [], portoes: [] };
            if (!setor.sessoes.some((x) => x.id === s.id)) setor.sessoes.push({ id: s.id, descricao: descricaoDaSessao(ev, s.inicio, todos) });
            if (g.acesso && !setor.portoes.includes(g.acesso)) setor.portoes.push(g.acesso);
            for (const t of g.ingressos) {
                const peso = t.lotes.reduce((n, l) => n + (historico?.porLote[l.id] ?? 0), 0);
                const atual = setor.tipos.find((x) => x.nome === t.nome);
                if (atual) atual.peso += peso;
                else setor.tipos.push({ nome: t.nome, peso });
            }
            setores.set(nome, setor);
        }
    // Setor sem histórico: os tipos dividem por igual.
    for (const setor of setores.values()) if (setor.eventoId === ev.id && setor.tipos.every((t) => t.peso === 0)) setor.tipos.forEach((t) => (t.peso = 1));

    const primeira = ev.sessoes.map((s) => new Date(s.inicio)).sort((a, b) => a.getTime() - b.getTime())[0] ?? new Date(ev.data);
    const serie = historico?.serie ?? [];
    const hoje = new Date();
    const canais = historico
        ? (Object.entries(historico.porCanal) as [CanalMetrica, number][]).filter(([, n]) => n > 0).map(([c, n]) => ({ nome: CANAL_DA_METRICA[c], peso: n }))
        : [];
    eventos.set(ev.id, {
        id: ev.id,
        nome: ev.nome,
        inicioMin: primeira.getHours() * 60 + primeira.getMinutes(),
        inicio: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - serie.length),
        pesoDoDia: serie.map(([i]) => i),
        canais: canais.length ? canais : [{ nome: "Online", peso: 1 }],
    });
}

/** Ingressos emitidos de verdade (válidos e utilizados), com o titular e o comprador reais. */
function portadoresDosIngressos(ingressos: IngressoEmitido[], pedidos: Record<string, PedidoBanco>, evs: Map<string, EventoBanco>, setores: Map<string, SetorDoEvento>, todos: boolean): PortadorAcesso[] {
    return ingressos.flatMap((i): PortadorAcesso[] => {
        const ev = evs.get(i.eventoId);
        // Transferido: o código antigo não entra mais (o ingresso novo aparece no lugar). Cancelado não entra.
        if (!ev || (i.status !== "valido" && i.status !== "utilizado")) return [];
        const pedido = pedidos[i.pedidoId];
        const grupo = todos ? `${i.rotulo.grupo} (${ev.nome})` : i.rotulo.grupo;
        const sessao = ev.sessoes.find((s) => s.id === i.sessaoId);
        const validado = i.status === "utilizado";
        const entrada = new Date(i.atualizadoEm);
        return [
            {
                id: i.id,
                evento: ev.nome,
                sessaoId: i.sessaoId,
                portador: i.titular.nome,
                emailPortador: i.titular.email,
                cpf: "",
                comprador: pedido?.comprador.nome ?? i.titular.nome,
                emailComprador: pedido?.comprador.email ?? i.titular.email,
                idTransacao: i.pedidoId,
                idIngresso: i.id,
                qrCode: i.codigo,
                sessao: sessao ? descricaoDaSessao(ev, sessao.inicio, todos) : "—",
                canal: pedido ? CANAL_DO_PEDIDO[pedido.canal] : "Online",
                grupo,
                tipoIngresso: i.rotulo.ingresso,
                portao: validado ? (i.rotulo.acesso ?? setores.get(grupo)?.portoes[0]) : undefined,
                status: validado ? "validado" : "pendente",
                horario: validado ? horaDe(entrada.getHours() * 60 + entrada.getMinutes()) : undefined,
                compradoEm: new Date(i.emitidoEm).getTime(),
            },
        ];
    });
}

/**
 * Portadores fictícios que completam os vendidos de cada grupo (menos os ingressos reais já
 * listados): tipos, sessões, canais e dias de compra sorteados pelo histórico do evento, e a
 * mesma taxa de validação do dataset. Determinístico por evento e setor.
 */
function gerarPortadores(porGrupo: AcessoDoPeriodo["porGrupo"], setores: Map<string, SetorDoEvento>, eventos: Map<string, EventoDoAcesso>, reaisPorGrupo: Map<string, number>): PortadorAcesso[] {
    const faltam = porGrupo.map((g) => ({ g, n: Math.max(0, g.vendido - (reaisPorGrupo.get(g.grupo) ?? 0)) }));
    const porEvento = new Map<string, number>();
    for (const { g, n } of faltam) {
        const s = setores.get(g.grupo);
        if (s) porEvento.set(s.eventoId, (porEvento.get(s.eventoId) ?? 0) + n);
    }
    const rows: PortadorAcesso[] = [];
    for (const { g, n } of faltam) {
        const setor = setores.get(g.grupo);
        const ev = setor ? eventos.get(setor.eventoId) : undefined;
        if (!setor || !ev || n <= 0 || setor.sessoes.length === 0) continue;
        const quantidade = Math.round(n * Math.min(1, MAXIMO_POR_EVENTO / (porEvento.get(ev.id) || 1)));
        const taxa = g.vendido ? g.validado / g.vendido : 0;
        const rng = mulberry32(sementeDe(`${ev.id}|${setor.nome}`));
        const um = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)];
        const pesado = <T extends { peso: number }>(arr: T[]): T => {
            let r = rng() * arr.reduce((s, x) => s + x.peso, 0);
            for (const x of arr) {
                r -= x.peso;
                if (r <= 0) return x;
            }
            return arr[arr.length - 1];
        };
        const acumulado = ev.pesoDoDia.reduce<number[]>((acc, p) => [...acc, (acc[acc.length - 1] ?? 0) + Math.max(0, p)], []);
        const totalDias = acumulado[acumulado.length - 1] ?? 0;
        const tipos = setor.tipos.filter((t) => t.peso > 0);
        const slug = slugSetor(setor.nome);
        for (let i = 0; i < quantidade; i++) {
            const tipo = tipos.length ? pesado(tipos).nome : setor.nome;
            const sessao = um(setor.sessoes);
            const canal = pesado(ev.canais).nome;
            const validado = rng() < taxa;
            const comprado = new Date(ev.inicio);
            if (totalDias > 0) {
                const r = rng() * totalDias;
                const dia = acumulado.findIndex((a) => a >= r);
                comprado.setDate(comprado.getDate() + (dia < 0 ? ev.pesoDoDia.length - 1 : dia));
            }
            comprado.setHours(Math.floor(rng() * 24), Math.floor(rng() * 60));
            const comprador = `${um(PRIMEIROS)} ${um(SOBRENOMES)}`;
            const emailComprador = emailDe(comprador, Math.floor(rng() * 90 + 10), um(PROVEDORES));
            const paraOutro = rng() < 0.3;
            const portador = paraOutro ? `${um(PRIMEIROS)} ${um(SOBRENOMES)}` : comprador;
            const emailPortador = paraOutro ? emailDe(portador, Math.floor(rng() * 90 + 10), um(PROVEDORES)) : emailComprador;
            const faixa = pesado(FAIXAS_DE_ENTRADA);
            const entrada = ev.inicioMin + faixa.offset + Math.floor(rng() * LARGURA_DA_FAIXA);
            rows.push({
                id: `${ev.id}-${slug}-${i}`,
                evento: ev.nome,
                sessaoId: sessao.id,
                portador,
                emailPortador,
                cpf: String(Math.floor(rng() * 9e10 + 1e10)),
                comprador,
                emailComprador,
                idTransacao: `TRX-${Math.floor(rng() * 9e6 + 1e6)}`,
                idIngresso: `ING-${pad(Math.floor(rng() * 1e6), 6)}`,
                qrCode: pad(Math.floor(rng() * 1e8), 8),
                sessao: sessao.descricao,
                canal,
                grupo: setor.nome,
                tipoIngresso: tipo,
                portao: validado && setor.portoes.length ? um(setor.portoes) : undefined,
                status: validado ? "validado" : "pendente",
                horario: validado ? horaDe(entrada) : undefined,
                compradoEm: comprado.getTime(),
            });
        }
    }
    return rows;
}

/** Catálogo, portadores e consulta do evento em contexto (ou de todos), refeitos quando o banco muda. */
function useAcessoDoEvento(): AcessoDoEvento {
    const ctx = useEventoAtual();
    const todos = useTodosOsEventos();
    const { tabelas } = useBanco();
    const dataset = useDatasetDoEvento();
    return useMemo(() => {
        const ids = todos ? eventosDaOrganizacao.map((e) => e.id) : [ctx.id];
        const evs = new Map(ids.map((id) => [id, tabelas.eventos[id]] as const).filter((x): x is [string, EventoBanco] => !!x[1]));
        const setores = new Map<string, SetorDoEvento>();
        const eventos = new Map<string, EventoDoAcesso>();
        for (const ev of evs.values()) lerCatalogo(ev, tabelas.historico[ev.id], todos, setores, eventos);

        const reais = portadoresDosIngressos(Object.values(tabelas.ingressos ?? {}), tabelas.pedidos, evs, setores, todos);
        const reaisPorGrupo = new Map<string, number>();
        for (const r of reais) reaisPorGrupo.set(r.grupo, (reaisPorGrupo.get(r.grupo) ?? 0) + 1);
        const ficticios = gerarPortadores(dataset.consultar(null).acesso.porGrupo, setores, eventos, reaisPorGrupo);
        // Reais primeiro (o que o produtor acabou de emitir), depois os fictícios; cada bloco da compra mais recente para a mais antiga.
        const recentes = (a: PortadorAcesso, b: PortadorAcesso) => b.compradoEm - a.compradoEm;
        const portadores = [...reais.sort(recentes), ...ficticios.sort(recentes)];

        const unicos = (lista: string[]) => [...new Set(lista)];
        const canais = unicos(portadores.map((p) => p.canal)).sort((a, b) => ORDEM_DOS_CANAIS.indexOf(a) - ORDEM_DOS_CANAIS.indexOf(b));
        return {
            setores,
            eventos,
            portadores,
            grupos: unicos([...setores.keys(), ...reais.map((r) => r.grupo)]),
            tipos: unicos([...[...setores.values()].flatMap((s) => s.tipos.map((t) => t.nome)), ...reais.map((r) => r.tipoIngresso)]),
            canais,
            consultar: dataset.consultar,
        };
    }, [ctx.id, todos, tabelas.eventos, tabelas.historico, tabelas.ingressos, tabelas.pedidos, dataset]);
}

/** Divide `total` pelos pesos, pelo maior resto, para a soma bater. */
function repartir(total: number, pesos: number[]): number[] {
    const soma = pesos.reduce((a, b) => a + b, 0);
    if (!soma) return pesos.map((_, i) => (i === 0 ? total : 0));
    const brutos = pesos.map((p) => (total * p) / soma);
    const base = brutos.map(Math.floor);
    let resto = total - base.reduce((a, b) => a + b, 0);
    for (const [, i] of brutos.map((b, i) => [b - base[i], i] as const).sort((a, b) => b[0] - a[0])) {
        if (resto <= 0) break;
        base[i]++;
        resto--;
    }
    return base;
}

/** Grupo → tipos de ingresso do catálogo, com vendidos e validados do período divididos pelo peso de venda de cada tipo. */
function arvoreDeSetores(porGrupo: AcessoDoPeriodo["porGrupo"], setores: Map<string, SetorDoEvento>): AcessoNode[] {
    return porGrupo.map((g, idx) => {
        const id = `${idx}-${slugSetor(g.grupo)}`;
        const tipos = setores.get(g.grupo)?.tipos.filter((t) => t.peso > 0) ?? [];
        if (tipos.length === 0) return { id, nome: g.grupo, vendidos: g.vendido, validados: g.validado };
        const vendidos = repartir(g.vendido, tipos.map((t) => t.peso));
        const validados = repartir(g.validado, vendidos);
        return {
            id,
            nome: g.grupo,
            children: tipos.map((t, i) => ({ id: `${id}-${i}`, nome: t.nome, vendidos: vendidos[i], validados: Math.min(vendidos[i], validados[i]) })),
        };
    });
}

/** Check-ins por faixa de 30 min em torno do início da sessão de cada evento. */
function faixasDeEntrada(porGrupo: AcessoDoPeriodo["porGrupo"], setores: Map<string, SetorDoEvento>, eventos: Map<string, EventoDoAcesso>) {
    const somaPesos = FAIXAS_DE_ENTRADA.reduce((s, f) => s + f.peso, 0);
    const porFaixa = new Map<string, { ordem: number; checkins: number }>();
    for (const g of porGrupo) {
        const ev = eventos.get(setores.get(g.grupo)?.eventoId ?? "");
        if (!ev) continue;
        for (const f of FAIXAS_DE_ENTRADA) {
            const min = ev.inicioMin + f.offset;
            const rotulo = rotuloDaFaixa(min);
            const atual = porFaixa.get(rotulo) ?? { ordem: min, checkins: 0 };
            atual.ordem = Math.min(atual.ordem, min);
            atual.checkins += (g.validado * f.peso) / somaPesos;
            porFaixa.set(rotulo, atual);
        }
    }
    return [...porFaixa.entries()].sort((a, b) => a[1].ordem - b[1].ordem).map(([hora, v]) => ({ hora, checkins: Math.round(v.checkins) }));
}

/* ------------------------------------------------------------------ */
/*  Filtros — campos do slideout global (opções do próprio evento)     */
/* ------------------------------------------------------------------ */

function getFieldValue(p: PortadorAcesso, field: string): string {
    switch (field) {
        case "canal":
            return p.canal;
        case "grupo":
            return p.grupo;
        case "tipoIngresso":
            return p.tipoIngresso;
        case "status":
            return ACESSO_STATUS[p.status].label;
        default:
            return "";
    }
}

const formatCPF = (raw: string) => {
    const d = raw.replace(/\D/g, "").slice(0, 11);
    if (!d) return "—";
    if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
    if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`;
    return d;
};

const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export function Acesso() {
    // Assina o evento dos relatórios: a janela de vendas muda com o evento e o escopo, e o período inicial acompanha.
    const ev = useEventoDosRelatorios();
    const dados = useAcessoDoEvento();
    const carregando = useRelatorioCarregando();
    const fields = useMemo<FilterFieldDef[]>(
        () => [
            { id: "canal", label: "Canal", multi: { options: dados.canais.map((c) => ({ id: c, label: c })) } },
            { id: "grupo", label: "Grupo", multi: { options: dados.grupos.map((g) => ({ id: g, label: g })) } },
            { id: "tipoIngresso", label: "Tipo de ingresso", multi: { options: dados.tipos.map((t) => ({ id: t, label: t })) } },
            { id: "status", label: "Status", multi: { options: [{ id: "Validado", label: "Validado" }, { id: "Não validado", label: "Não validado" }] } },
        ],
        [dados.canais, dados.grupos, dados.tipos],
    );
    return (
        <BackstageLayout activeSection="relatorios" activeItem="acesso">
            <RelatorioFiltersProvider fields={fields} key={`${ev.salesStart}|${ev.salesEnd}`} initialDateRange={periodoCompleto()}>
                <div className="flex min-w-0 flex-1 flex-col">
                    <main className="flex flex-1 flex-col gap-6">
                        <RelatorioPageHeader
                            title="Acesso"
                            splitControls
                            actions={<ExportMenu onExport={(f) => toast.success(`Exportando ${f.toUpperCase()}`, { description: "A lista de entradas será exportada." })} />}
                        />
                        {carregando ? <CarregandoRelatorio rotulo="Carregando acesso" /> : <AcessoBody dados={dados} />}
                    </main>
                </div>
            </RelatorioFiltersProvider>
        </BackstageLayout>
    );
}

const AcessoBody = ({ dados }: { dados: AcessoDoEvento }) => {
    const { dateRange, sessao, filters } = useRelatorioFilters();

    const filteredPortadores = useMemo(() => {
        const validFilters = filters.filter((f) => f.field && f.value);
        return dados.portadores.filter((p) => {
            if (sessao !== "all" && p.sessaoId !== sessao) return false;
            if (!inDateRange(new Date(p.compradoEm), dateRange)) return false;
            if (!matchRow(p, validFilters, getFieldValue)) return false;
            return true;
        });
    }, [dados.portadores, dateRange, sessao, filters]);

    // Acesso do período aplicado (vendidos do evento × taxa de validação do dataset).
    const acesso = useMemo(() => dados.consultar(dateRange).acesso, [dados, dateRange]);
    const totals = useMemo(() => ({ validados: acesso.validados, pendentes: acesso.naoValidados, total: acesso.validados + acesso.naoValidados }), [acesso]);
    const faixas = useMemo(() => faixasDeEntrada(acesso.porGrupo, dados.setores, dados.eventos), [acesso, dados.setores, dados.eventos]);
    const setores = useMemo(() => arvoreDeSetores(acesso.porGrupo, dados.setores), [acesso, dados.setores]);

    // Árvore filtrada pelos grupos selecionados (se houver).
    const selectedGrupos = useMemo(() => {
        const grupoFilter = filters.find((f) => f.field === "grupo" && f.value);
        return grupoFilter ? new Set(grupoFilter.value.split(",").filter(Boolean)) : null;
    }, [filters]);
    const setoresView = useMemo(() => (selectedGrupos ? setores.filter((s) => selectedGrupos.has(s.nome)) : setores), [setores, selectedGrupos]);

    return (
        <>
            <MetricsRow validados={totals.validados} pendentes={totals.pendentes} total={totals.total} />
            <EntradasPorFaixaCard faixas={faixas} />
            <ValidacaoPorSetorCard setores={setoresView} />
            <ControleDeAcessoCard rows={filteredPortadores} />
        </>
    );
};

/* ------------------------------------------------------------------ */
/*  Métricas                                                          */
/* ------------------------------------------------------------------ */

// O painel de métricas comum dos relatórios (REL-221); a taxa usa a barra de pontos, como a ocupação de Vendas.
const MetricsRow = ({ validados, pendentes, total }: { validados: number; pendentes: number; total: number }) => {
    const pct = total === 0 ? 0 : Math.round((validados / total) * 100);
    return (
        <PainelDeMetricas rotulo="Resumo do acesso" className="sm:grid-cols-3 xl:grid-cols-3">
            <MetricaDoRelatorio rotulo="Validados" valor={numberFormatter.format(validados)} destaque />
            <MetricaDoRelatorio rotulo="Não validados" valor={numberFormatter.format(pendentes)} />
            <MetricaDoRelatorio rotulo="Taxa de validação" valor={`${pct}%`} complemento={`${numberFormatter.format(validados)} de ${numberFormatter.format(total)}`}>
                <BarraDePontos valor={validados} total={total} pontos={32} className="mt-1" />
            </MetricaDoRelatorio>
        </PainelDeMetricas>
    );
};

const ChartTooltip = ({ active, label, payload }: { active?: boolean; label?: string; payload?: { value: number | string }[] }) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
        <div className="rounded-lg bg-primary-solid px-3 py-2.5 shadow-xl ring-1 ring-secondary_alt">
            <p className="mb-1 text-sm font-semibold text-white">{label}</p>
            <p className="text-sm text-tooltip-supporting-text">
                <span className="font-semibold text-white">{numberFormatter.format(Number(payload[0].value))}</span> check-ins
            </p>
        </div>
    );
};

const EntradasPorFaixaCard = ({ faixas }: { faixas: { hora: string; checkins: number }[] }) => {
    const picoFaixa = faixas.reduce((a, b) => (b.checkins > a.checkins ? b : a), faixas[0] ?? { hora: "", checkins: 0 });
    return (
        <section className="overflow-clip rounded-xl bg-primary ring-1 ring-border-secondary">
            <header className="border-b border-secondary px-5 py-4">
                <h3 className="text-md font-semibold text-primary">Entradas por faixa de horário</h3>
            </header>
            <div className="h-[280px] w-full px-2 pt-5 pb-2 md:h-[320px] md:px-4">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={faixas} margin={{ top: 24, right: 12, bottom: 4, left: 4 }}>
                        <CartesianGrid stroke="var(--color-border-secondary)" strokeDasharray="2 4" strokeOpacity={0.6} vertical={false} />
                        <XAxis dataKey="hora" tick={{ fill: "var(--color-text-tertiary)", fontSize: 11 }} tickLine={false} axisLine={false} tickMargin={10} interval="preserveStartEnd" minTickGap={16} />
                        <YAxis tickFormatter={(v) => numberFormatter.format(Number(v))} tick={{ fill: "var(--color-text-tertiary)", fontSize: 11 }} tickLine={false} axisLine={false} tickMargin={8} width={40} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-bg-secondary)", opacity: 0.6 }} />
                        <Bar dataKey="checkins" name="Check-ins" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false}>
                            <LabelList dataKey="checkins" position="top" offset={6} fontSize={10} fontWeight={600} fill="var(--color-text-secondary)" formatter={(v) => numberFormatter.format(Number(v))} />
                            {faixas.map((f) => (
                                <Cell key={f.hora} fill={BAR_COLOR} fillOpacity={f.hora === picoFaixa.hora ? 1 : 0.32} />
                            ))}
                        </Bar>
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </section>
    );
};

/* ------------------------------------------------------------------ */
/*  Validação por setor                                               */
/* ------------------------------------------------------------------ */

const ValidacaoPorSetorCard = ({ setores: setoresView }: { setores: AcessoNode[] }) => {
    // Celular: Vendidos e Validados somem; a linha final abre os números (UI-MOB-005).
    const celular = !useBreakpoint("md");
    const linha = useLinhaAberta<{ titulo: string; apoio?: string; vendidos: number; validados: number }>();
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const entrada = useLinhaFilhaAnimada();
    const indent = (depth: number) => 16 + depth * 24;

    const toggleExpanded = (id: string) =>
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const renderNodes = (list: AcessoNode[], depth: number, parent: AcessoNode | null): ReactNode[] => {
        const out: ReactNode[] = [];
        list.forEach((node) => {
            const hasChildren = !!node.children?.length;
            const isExpanded = expanded.has(node.id);
            const vendidos = sumVendidos(node);
            const validados = sumValidados(node);

            let bar: ReactNode;
            if (depth === 0 || !parent) {
                bar = <OccupancyBar value={validados} total={vendidos} />;
            } else {
                const parentVendidos = sumVendidos(parent);
                const parentValidados = sumValidados(parent);
                const prevValidados = list.slice(0, list.indexOf(node)).reduce((s, c) => s + sumValidados(c), 0);
                const offsetPct = parentVendidos === 0 ? 0 : (prevValidados / parentVendidos) * 100;
                const widthPct = parentVendidos === 0 ? 0 : (validados / parentVendidos) * 100;
                const filledPct = parentVendidos === 0 ? 0 : (parentValidados / parentVendidos) * 100;
                const labelPct = parentValidados === 0 ? 0 : (validados / parentValidados) * 100;
                const boundaries = list.slice(0, -1).map((_, k) => {
                    const sum = list.slice(0, k + 1).reduce((s, c) => s + sumValidados(c), 0);
                    return parentVendidos === 0 ? 0 : (sum / parentVendidos) * 100;
                });
                bar = <SegmentedOccupancyBar offsetPct={offsetPct} widthPct={widthPct} filledPct={filledPct} labelPct={labelPct} boundaries={boundaries} />;
            }

            const labelClass = depth === 0 ? "font-medium text-primary" : "text-secondary";

            const abrirDetalhes = () => linha.abrir({ titulo: node.nome, apoio: parent?.nome, vendidos, validados });
            out.push(
                <Fragment key={node.id}>
                    {/* Linha de tabela, não botão (REL-226): o botão da 1ª célula alterna o grupo; as filhas entram com transição (REL-224). */}
                    <motion.tr
                        {...(depth > 0 ? entrada : {})}
                        {...(hasChildren ? { onClick: () => toggleExpanded(node.id), style: { cursor: "pointer" } } : linhaQueAbre(celular, abrirDetalhes))}
                        className={cx("border-b border-secondary transition duration-100 ease-linear", depth === 0 ? "bg-primary" : "bg-secondary/60", (hasChildren || celular) && "cursor-pointer hover:bg-primary_hover")}
                    >
                        <td className="py-3.5 pr-4 text-sm" style={{ paddingLeft: indent(depth) }}>
                            {hasChildren ? (
                                <AlternarDaArvore aberto={isExpanded} onAlternar={() => toggleExpanded(node.id)}>
                                    <span title={node.nome} className={cx("line-clamp-2", labelClass)}>{node.nome}</span>
                                </AlternarDaArvore>
                            ) : (
                                <AbrirDaLinha ativa={celular} onAbrir={abrirDetalhes} className={cx("line-clamp-2 pl-6", labelClass)}>
                                    {node.nome}
                                </AbrirDaLinha>
                            )}
                        </td>
                        <td className="hidden px-4 py-3.5 text-right text-sm text-tertiary md:table-cell">{numberFormatter.format(vendidos)}</td>
                        <td className="hidden px-4 py-3.5 text-right text-sm text-tertiary md:table-cell">{numberFormatter.format(validados)}</td>
                        <td className="px-4 py-3.5">{bar}</td>
                    </motion.tr>
                    {hasChildren && isExpanded && renderNodes(node.children!, depth + 1, node)}
                </Fragment>,
            );
        });
        return out;
    };

    return (
        <Card title="Validação por grupo">
            <div className="overflow-x-auto overflow-y-clip">
                <table className="w-full table-fixed border-collapse">
                    <colgroup>
                        <col className="w-[50%] md:w-auto" />
                        <col className="hidden md:table-column" />
                        <col className="hidden md:table-column" />
                        <col />
                    </colgroup>
                    <thead className="bg-secondary">
                        <tr className="border-b border-secondary text-left">
                            <th className="px-4 py-3 text-sm font-semibold text-tertiary">Grupo e tipo de ingresso</th>
                            <th className="hidden px-4 py-3 text-right text-sm font-semibold text-tertiary md:table-cell">Vendidos</th>
                            <th className="hidden px-4 py-3 text-right text-sm font-semibold text-tertiary md:table-cell">Validados</th>
                            <th className="px-4 py-3 text-sm font-semibold text-tertiary">Taxa de validação</th>
                        </tr>
                    </thead>
                    <tbody>
                        {setoresView.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-12 text-center text-sm text-tertiary">Nenhum grupo corresponde aos filtros.</td>
                            </tr>
                        ) : (
                            renderNodes(setoresView, 0, null)
                        )}
                    </tbody>
                </table>
            </div>
            {linha.aberta && (
                <DetalhesDaLinha
                    titulo={linha.aberta.titulo}
                    subtitulo={linha.aberta.apoio}
                    grupos={[
                        {
                            campos: [
                                { rotulo: "Vendidos", valor: numberFormatter.format(linha.aberta.vendidos) },
                                { rotulo: "Validados", valor: numberFormatter.format(linha.aberta.validados) },
                                { rotulo: "Taxa de validação", valor: `${linha.aberta.vendidos ? Math.round((linha.aberta.validados / linha.aberta.vendidos) * 100) : 0}%` },
                            ],
                        },
                    ]}
                    onFechar={linha.fechar}
                />
            )}
        </Card>
    );
};

const OccupancyBar = ({ value, total }: { value: number; total: number }) => {
    const pct = total === 0 ? 0 : Math.round((value / total) * 100);
    const clamped = Math.min(100, Math.max(0, pct));
    return (
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
            <div className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-tertiary/90">
                <div className="h-full rounded-full bg-brand-solid transition-all" style={{ width: `${clamped}%` }} />
            </div>
            <span className="w-10 shrink-0 text-right text-sm text-tertiary">{clamped}%</span>
        </div>
    );
};

const SegmentedOccupancyBar = ({ offsetPct, widthPct, filledPct, labelPct, boundaries = [] }: { offsetPct: number; widthPct: number; filledPct: number; labelPct?: number; boundaries?: number[] }) => {
    const clampedOffset = Math.min(100, Math.max(0, offsetPct));
    const clampedWidth = Math.min(100 - clampedOffset, Math.max(0, widthPct));
    const clampedFilled = Math.min(100, Math.max(0, filledPct));
    const display = Math.round(labelPct ?? widthPct);
    return (
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
            <div className="relative h-2 min-w-0 flex-1 overflow-visible rounded-full bg-tertiary/90">
                <div className="absolute h-full rounded-full bg-brand-solid/30 transition-all" style={{ left: 0, width: `${clampedFilled}%` }} />
                <div className="absolute h-full rounded-full bg-brand-solid transition-all" style={{ left: `${clampedOffset}%`, width: `${clampedWidth}%` }} />
                {boundaries.map((b, i) => (
                    <span key={i} aria-hidden="true" className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-primary/70" style={{ left: `${Math.min(100, Math.max(0, b))}%` }} />
                ))}
            </div>
            <span className="w-10 shrink-0 text-right text-sm text-tertiary">{display}%</span>
        </div>
    );
};

/* ------------------------------------------------------------------ */
/*  Controle de acesso — lista                                        */
/* ------------------------------------------------------------------ */

const PER_PAGE = 100;

const SORT_ACCESSORS: Partial<Record<string, (p: PortadorAcesso) => string | number>> = {
    portador: (p) => p.portador,
    qrCode: (p) => p.qrCode,
    grupo: (p) => p.grupo,
    tipoIngresso: (p) => p.tipoIngresso,
    canal: (p) => p.canal,
    horario: (p) => {
        if (!p.horario) return -1;
        const [h, m] = p.horario.split(":").map(Number);
        return h * 60 + m;
    },
    status: (p) => ACESSO_STATUS[p.status].label,
};

const ControleDeAcessoCard = ({ rows }: { rows: PortadorAcesso[] }) => {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    // Entrada aberta na URL (?item=<id>, REL-223): recarregar ou mandar o link abre a mesma.
    const aberta = useItemNaUrl();
    const selected = useMemo(() => (aberta.id ? (rows.find((p) => p.id === aberta.id) ?? null) : null), [rows, aberta.id]);
    const todos = useTodosOsEventos();

    const searched = useMemo(() => {
        const term = search.trim().toLowerCase();
        const digits = search.replace(/\D/g, "");
        if (!term) return rows;
        return rows.filter((p) => {
            const haystack = [p.portador, p.comprador, p.idTransacao, p.idIngresso, p.qrCode, p.grupo, p.canal, p.tipoIngresso, p.evento].join(" ").toLowerCase();
            const cpfMatch = digits.length > 0 && p.cpf.includes(digits);
            return haystack.includes(term) || cpfMatch;
        });
    }, [rows, search]);

    const { sorted, sortKey, sortDir, toggleSort } = useSortableTable(searched as unknown as Record<string, unknown>[], SORT_ACCESSORS as Partial<Record<string, (r: Record<string, unknown>) => string | number>>);
    const sortedRows = sorted as unknown as PortadorAcesso[];

    const totalPages = Math.max(1, Math.ceil(sortedRows.length / PER_PAGE));
    const pagina = Math.min(page, totalPages);
    const pageRows = sortedRows.slice((pagina - 1) * PER_PAGE, pagina * PER_PAGE);

    const onSearch = (v: string) => {
        setSearch(v);
        setPage(1);
    };

    return (
        <Card
            title={
                <>
                    Detalhes da lista de entrada
                    <Badge size="sm" color="gray" type="pill-color">
                        {numberFormatter.format(sortedRows.length)}
                    </Badge>
                </>
            }
        >
            <div className="flex flex-col gap-3 border-b border-secondary px-4 py-3">
                <Input
                    size="sm"
                    icon={SearchLg}
                    aria-label="Buscar entradas"
                    placeholder="Buscar por nome, CPF, Code, ID da transação ou ingresso"
                    value={search}
                    onChange={onSearch}
                    className="w-full max-w-[420px]"
                />
            </div>

            <div className="overflow-x-auto overflow-y-clip">
                <table className="w-full border-collapse">
                    <thead className="bg-secondary">
                        <tr className="border-b border-secondary text-left">
                            <th className="px-4 py-3 text-sm font-semibold text-tertiary"><SortableHeader label="Portador" sortKey="portador" activeKey={sortKey} dir={sortDir} onSort={toggleSort} /></th>
                            <th className="hidden px-4 py-3 text-sm font-semibold text-tertiary md:table-cell"><SortableHeader label="Code" sortKey="qrCode" activeKey={sortKey} dir={sortDir} onSort={toggleSort} /></th>
                            <th className="hidden px-4 py-3 text-sm font-semibold text-tertiary lg:table-cell"><SortableHeader label="Grupo" sortKey="grupo" activeKey={sortKey} dir={sortDir} onSort={toggleSort} /></th>
                            <th className="hidden px-4 py-3 text-sm font-semibold text-tertiary xl:table-cell"><SortableHeader label="Tipo" sortKey="tipoIngresso" activeKey={sortKey} dir={sortDir} onSort={toggleSort} /></th>
                            <th className="hidden px-4 py-3 text-sm font-semibold text-tertiary xl:table-cell"><SortableHeader label="Canal" sortKey="canal" activeKey={sortKey} dir={sortDir} onSort={toggleSort} /></th>
                            <th className="hidden px-4 py-3 text-sm font-semibold text-tertiary sm:table-cell"><SortableHeader label="Horário de entrada" sortKey="horario" activeKey={sortKey} dir={sortDir} onSort={toggleSort} /></th>
                            <th className="hidden px-4 py-3 text-sm font-semibold text-tertiary sm:table-cell"><SortableHeader label="Status" sortKey="status" activeKey={sortKey} dir={sortDir} onSort={toggleSort} /></th>
                            <th className="px-4 py-3" aria-hidden="true" />
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-4 py-12 text-center text-sm text-tertiary">Nenhuma entrada corresponde aos filtros.</td>
                            </tr>
                        )}
                        {pageRows.map((p, i) => {
                            const isLast = i === pageRows.length - 1;
                            const statusMeta = ACESSO_STATUS[p.status];
                            return (
                                // Linha de tabela, não botão (REL-226): o nome do portador é o botão que abre os detalhes.
                                <tr
                                    key={p.id}
                                    onClick={() => aberta.abrir(p.id)}
                                    className={cx("group cursor-pointer transition duration-100 ease-linear hover:bg-primary_hover", !isLast && "border-b border-secondary")}
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            {/* Sem o ponto verde de "online": validado é status, e o selo da coluna Status já diz (REL-229). */}
                                            <Avatar size="sm" initials={getInitials(p.portador)} />
                                            <div className="flex min-w-0 flex-col">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        aberta.abrir(p.id);
                                                    }}
                                                    className="truncate rounded-sm text-left text-sm font-medium text-primary outline-focus-ring focus-visible:outline-2"
                                                >
                                                    {p.portador}
                                                </button>
                                                {/* Em "Todos os eventos", de qual evento é a entrada (REL-227). */}
                                                {todos && <span className="truncate text-sm text-tertiary">{p.evento}</span>}
                                                <span className="truncate text-sm text-tertiary tabular-nums">{formatCPF(p.cpf)}</span>
                                                <span className="truncate text-sm text-tertiary sm:hidden">{statusMeta.label}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="hidden px-4 py-3 md:table-cell">
                                        <span className="inline-flex items-center text-sm text-tertiary tabular-nums">
                                            {p.qrCode}
                                        </span>
                                    </td>
                                    <td className="hidden px-4 py-3 text-sm text-tertiary lg:table-cell">{p.grupo}</td>
                                    <td className="hidden px-4 py-3 text-sm text-tertiary xl:table-cell">{p.tipoIngresso}</td>
                                    <td className="hidden px-4 py-3 text-sm text-tertiary xl:table-cell">{p.canal}</td>
                                    <td className="hidden px-4 py-3 text-sm text-secondary tabular-nums sm:table-cell">{p.horario ?? "—"}</td>
                                    <td className="hidden px-4 py-3 sm:table-cell">
                                        <BadgeWithDot size="sm" color={statusMeta.color} type="pill-color">
                                            {statusMeta.label}
                                        </BadgeWithDot>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <ChevronRight aria-hidden="true" className="ml-auto size-5 text-fg-quaternary transition-transform duration-100 ease-linear group-hover:translate-x-0.5" />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-secondary px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-tertiary tabular-nums">
                    {sortedRows.length === 0 ? "0 registros" : `${(pagina - 1) * PER_PAGE + 1}–${Math.min(pagina * PER_PAGE, sortedRows.length)} de ${numberFormatter.format(sortedRows.length)}`}
                </span>
                <div className="flex items-center gap-3 text-sm text-tertiary">
                    <span className="tabular-nums">Página {pagina} de {totalPages}</span>
                    <div className="flex gap-1">
                        <ButtonUtility size="sm" color="secondary" icon={ChevronLeft} tooltip="Anterior" isDisabled={pagina <= 1} onClick={() => setPage(pagina - 1)} />
                        <ButtonUtility size="sm" color="secondary" icon={ChevronRight} tooltip="Próxima" isDisabled={pagina >= totalPages} onClick={() => setPage(pagina + 1)} />
                    </div>
                </div>
            </div>

            {selected && <AcessoDetailsSlideOut row={selected} onClose={aberta.fechar} />}
        </Card>
    );
};

/* ------------------------------------------------------------------ */
/*  Slideout — detalhes da entrada                                    */
/* ------------------------------------------------------------------ */

// Detalhes no painel lateral do DS (REL-225), no lugar do modal feito à mão de 520 px.
const AcessoDetailsSlideOut = ({ row, onClose }: { row: PortadorAcesso; onClose: () => void }) => (
    <PainelLateral
        titulo="Detalhes da entrada"
        subtitulo={
            <BadgeWithDot size="sm" color={ACESSO_STATUS[row.status].color} type="pill-color" className="w-fit">
                {row.horario ? `${ACESSO_STATUS[row.status].label} às ${row.horario}` : ACESSO_STATUS[row.status].label}
            </BadgeWithDot>
        }
        onFechar={onClose}
    >
        <div className="flex flex-col divide-y divide-secondary">
            <section className="flex flex-col gap-3 py-5">
                <h3 className="text-md font-semibold text-primary">Portador</h3>
                <dl className="flex flex-col gap-3">
                <DetailRow label="Nome" value={row.portador} />
                <DetailRow label="E-mail" value={row.emailPortador} isEmail />
                <DetailRow label="CPF" value={formatCPF(row.cpf)} />
                </dl>
            </section>

            <section className="flex flex-col gap-3 py-5">
                <h3 className="text-md font-semibold text-primary">Ingresso</h3>
                <dl className="flex flex-col gap-3">
                <DetailRow label="Evento" value={row.evento} />
                <DetailRow label="Code" value={row.qrCode} isMono />
                <DetailRow label="ID do ingresso" value={row.idIngresso} isMono />
                <DetailRow label="ID da transação" value={row.idTransacao} isMono />
                <DetailRow label="Sessão" value={row.sessao} />
                <DetailRow label="Canal" value={row.canal} />
                <DetailRow label="Grupo de ingressos" value={row.grupo} />
                <DetailRow label="Tipo de ingresso" value={row.tipoIngresso} />
                <DetailRow label="Portão de entrada" value={row.portao ?? "—"} />
                </dl>
            </section>

            <section className="flex flex-col gap-3 py-5">
                <h3 className="text-md font-semibold text-primary">Comprador</h3>
                <dl className="flex flex-col gap-3">
                <DetailRow label="Nome" value={row.comprador} />
                <DetailRow label="E-mail" value={row.emailComprador} isEmail />
                </dl>
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

/* ------------------------------------------------------------------ */
/*  Shared primitives                                                 */
/* ------------------------------------------------------------------ */

const Card = ({ title, children, headerRight }: { title: ReactNode; children: ReactNode; headerRight?: ReactNode }) => (
    <section className="overflow-clip rounded-xl bg-primary ring-1 ring-border-secondary">
        <header className="flex items-center justify-between gap-3 border-b border-secondary px-4 py-4">
            <h3 className="flex items-center gap-2 text-md font-semibold text-primary">{title}</h3>
            {headerRight}
        </header>
        {children}
    </section>
);
