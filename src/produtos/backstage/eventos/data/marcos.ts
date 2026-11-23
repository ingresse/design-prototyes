import { useCallback, useEffect, useMemo } from "react";
import { atualizarEvento, lerDoc, useDoc, type Evento as EventoDoBanco, type MarcoDoEvento } from "@/plataforma";

/**
 * Marcos & anotações do evento.
 *
 * O dado sozinho não explica o pico: o produtor registra aqui o que aconteceu
 * (virada de lote, anúncio de atração, ação de marketing) para dar contexto à
 * curva de vendas depois.
 *
 * Ficam no evento, no banco (`Evento.marcos`, EVT-134). Evento que ainda não tem a lista mostra
 * os marcos iniciais, tirados dos dados dele (aberturas de vendas, viradas de lote, sessões,
 * status); a primeira mudança grava a lista inteira no evento (EVT-134). Os do localStorage antigo
 * são migrados uma vez (EVT-135).
 */

export type TipoMarco = MarcoDoEvento["tipo"];

export const TIPO_MARCO_LABEL: Record<TipoMarco, string> = {
    lote: "Virada de lote",
    atracao: "Anúncio de atração",
    marketing: "Ação de marketing",
    externo: "Evento externo",
};

export const TIPO_MARCO_COR: Record<TipoMarco, string> = {
    lote: "var(--color-utility-brand-500)",
    atracao: "var(--color-utility-purple-500)",
    marketing: "var(--color-utility-blue-500)",
    // `utility-gray-400` não existe no tema (UI-DS-011).
    externo: "var(--color-utility-neutral-400)",
};

export type Marco = MarcoDoEvento;

/* ---------------- marcos iniciais, dos dados do evento ---------------- */

const p2 = (n: number) => String(n).padStart(2, "0");
const hojeISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
};
const diaMes = (iso: string) => iso.slice(0, 10).split("-").reverse().slice(0, 2).join("/");
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/** Quantas viradas de lote entram nos iniciais (as mais recentes). */
const MAX_VIRADAS = 4;
/** Quantas sessões já realizadas entram nos iniciais (as mais recentes). */
const MAX_SESSOES = 3;

/**
 * Marcos que já aconteceram, tirados do próprio evento: início das vendas, aberturas de vendas,
 * viradas de lote pela data limite, sessões realizadas e encerramento. Só datas até hoje; início
 * das vendas e criação só antes da primeira sessão. Sem nada disso, a criação do evento. Ids estáveis (`ini-…`) para remover depois de gravar.
 */
export function marcosIniciais(evento: EventoDoBanco, inicioDasVendas?: string, hoje = hojeISO()): Marco[] {
    const lista: Marco[] = [];
    const ate = (data?: string) => !!data && data.slice(0, 10) <= hoje;
    // O que vem antes do evento não pode cair depois da primeira sessão (a série de exemplo e a
    // criação da seed acompanham o relógio e passam da data de eventos já realizados).
    const primeiraSessao = [...evento.sessoes].map((s) => s.inicio).sort()[0] ?? evento.data;
    const antesDoEvento = (data?: string) => ate(data) && data!.slice(0, 10) <= primeiraSessao.slice(0, 10);

    const aberturas = [...(evento.aberturas ?? [])].sort((a, b) => a.inicio.localeCompare(b.inicio));
    if (inicioDasVendas && antesDoEvento(inicioDasVendas) && !aberturas.some((a) => a.inicio.slice(0, 10) === inicioDasVendas.slice(0, 10)))
        lista.push({ id: "ini-vendas", data: inicioDasVendas.slice(0, 10), tipo: "lote", titulo: "Início das vendas" });
    aberturas
        .filter((a) => ate(a.inicio))
        .forEach((a) =>
            lista.push({ id: `ini-abertura-${a.id}`, data: a.inicio.slice(0, 10), tipo: "lote", titulo: `Abertura de vendas: ${a.nome}`, descricao: a.fim ? `Vende até ${diaMes(a.fim)}.` : undefined }),
        );

    const viradas: Marco[] = [];
    for (const s of evento.sessoes)
        for (const g of s.grupos)
            for (const t of g.ingressos)
                t.lotes.forEach((l, i) => {
                    const prox = t.lotes[i + 1];
                    if (!prox || !ate(l.dataLimite)) return;
                    viradas.push({
                        id: `ini-lote-${l.id}`,
                        data: l.dataLimite!.slice(0, 10),
                        tipo: "lote",
                        titulo: `${t.nome} (${g.nome}) foi para o ${prox.nome}`,
                        descricao: l.preco !== prox.preco ? `De ${brl(l.preco)} para ${brl(prox.preco)}.` : undefined,
                    });
                });
    lista.push(...viradas.sort((a, b) => b.data.localeCompare(a.data)).slice(0, MAX_VIRADAS));

    const realizadas = [...evento.sessoes].filter((s) => ate(s.inicio)).sort((a, b) => b.inicio.localeCompare(a.inicio));
    if (evento.sessoes.length > 1)
        realizadas.slice(0, MAX_SESSOES).forEach((s) => lista.push({ id: `ini-sessao-${s.id}`, data: s.inicio.slice(0, 10), tipo: "externo", titulo: `Sessão de ${diaMes(s.inicio)} realizada` }));
    else if (realizadas[0]) lista.push({ id: "ini-dia", data: realizadas[0].inicio.slice(0, 10), tipo: "externo", titulo: "Dia do evento" });

    if (evento.status === "encerrado") {
        const fim = evento.fim ?? [...evento.sessoes].map((s) => s.fim ?? s.inicio).sort().at(-1);
        if (fim && ate(fim)) lista.push({ id: "ini-encerrado", data: fim.slice(0, 10), tipo: "externo", titulo: "Evento encerrado", descricao: "Vendas encerradas." });
    }

    if (lista.length === 0 && antesDoEvento(evento.criadoEm)) lista.push({ id: "ini-criado", data: evento.criadoEm.slice(0, 10), tipo: "externo", titulo: "Evento criado no Backstage" });
    return lista;
}

/* ---------------- migração do localStorage (uma vez) ---------------- */

/** Onde os marcos ficavam antes do banco (até 21/11/2026). */
const CHAVE_ANTIGA = "backstage-marcos";

type MarcoAntigo = Marco & { eventoId: string };

function lerAntigos(): MarcoAntigo[] {
    try {
        const raw = window.localStorage.getItem(CHAVE_ANTIGA);
        const lista = raw ? (JSON.parse(raw) as unknown) : [];
        return Array.isArray(lista) ? (lista as MarcoAntigo[]).filter((m) => m && typeof m.eventoId === "string" && typeof m.data === "string") : [];
    } catch {
        return [];
    }
}

function gravarAntigos(lista: MarcoAntigo[]) {
    try {
        if (lista.length) window.localStorage.setItem(CHAVE_ANTIGA, JSON.stringify(lista));
        else window.localStorage.removeItem(CHAVE_ANTIGA);
    } catch {
        /* storage indisponível: nada a migrar */
    }
}

/**
 * Leva para o evento os marcos que este navegador guardava dele (EVT-135). Só se o evento ainda
 * não tem a lista no banco; depois, as entradas dele saem do localStorage.
 */
function migrarDoNavegador(evento: EventoDoBanco) {
    const antigos = lerAntigos();
    const doEvento = antigos.filter((m) => m.eventoId === evento.id);
    if (doEvento.length === 0) return;
    // Falhou a gravação: os marcos ficam no navegador e a migração tenta de novo na próxima visita.
    if (evento.marcos === undefined)
        atualizarEvento(evento.id, { marcos: doEvento.map(({ eventoId: _e, ...m }) => m) })
            .then(() => gravarAntigos(lerAntigos().filter((m) => m.eventoId !== evento.id)))
            .catch(() => {});
    else gravarAntigos(antigos.filter((m) => m.eventoId !== evento.id));
}

/* ---------------- leitura e gravação ---------------- */

const novoIdDeMarco = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `marco-${Math.random().toString(16).slice(2)}`;

const doMaisRecente = (lista: Marco[]) => [...lista].sort((a, b) => b.data.localeCompare(a.data));

/**
 * Marcos do evento, do mais recente para o mais antigo, com adicionar e remover.
 * `inicioDasVendas`: primeiro dia da curva (Visão geral), para o marco "Início das vendas".
 */
export function useMarcos(eventoId: string, inicioDasVendas?: string) {
    const evento = useDoc("eventos", eventoId);
    useEffect(() => {
        if (evento) migrarDoNavegador(evento);
    }, [evento?.id, evento?.marcos === undefined]);

    const marcos = useMemo(() => (evento ? doMaisRecente(evento.marcos ?? marcosIniciais(evento, inicioDasVendas)) : []), [evento, inicioDasVendas]);

    /** A lista que vale agora (gravada ou a inicial), para a primeira mudança gravar tudo. */
    const atual = useCallback(() => {
        const doc = lerDoc("eventos", eventoId);
        return doc ? { doc, lista: doc.marcos ?? marcosIniciais(doc, inicioDasVendas) } : null;
    }, [eventoId, inicioDasVendas]);

    // Gravar devolve a promessa: a tela mostra o toast, o Desfazer e o erro (EVT-148). Antes, `void` engolia a falha.
    const adicionar = useCallback(
        async (marco: Omit<Marco, "id">) => {
            const a = atual();
            if (!a) throw new Error("Evento não encontrado.");
            const novo: Marco = { ...marco, id: novoIdDeMarco() };
            await atualizarEvento(a.doc.id, { marcos: [novo, ...a.lista] });
            return novo;
        },
        [atual],
    );
    const remover = useCallback(
        async (id: string) => {
            const a = atual();
            if (!a) throw new Error("Evento não encontrado.");
            await atualizarEvento(a.doc.id, { marcos: a.lista.filter((m) => m.id !== id) });
        },
        [atual],
    );
    /** Desfazer: devolve o marco removido (ou tira o que acabou de entrar). */
    const restaurar = useCallback(
        async (marco: Marco) => {
            const a = atual();
            if (!a) throw new Error("Evento não encontrado.");
            if (a.lista.some((m) => m.id === marco.id)) return;
            await atualizarEvento(a.doc.id, { marcos: [marco, ...a.lista] });
        },
        [atual],
    );
    return { marcos, adicionar, remover, restaurar };
}
