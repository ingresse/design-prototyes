import { useSyncExternalStore } from "react";
import { assinarBanco, lerBanco, type Evento as EventoBanco } from "@/plataforma";
import { assinarEventoAtual, eventoAtualId, eventos as eventosDaOrganizacao } from "../../eventos/data/eventos";
import { assinarEscopoDosRelatorios, escopoDosRelatorios } from "../../components/escopo-dos-relatorios";

/* ------------------------------------------------------------------ */
/*  Meta canônica do evento (compartilhada por todas as páginas de     */
/*  relatório). Fonte única de fuso horário, moeda, janela de vendas   */
/*  e sessões — para manter dados mockados coerentes entre as telas.   */
/* ------------------------------------------------------------------ */

export interface Sessao {
    /** Chave estável usada em filtros e agregações. */
    id: string;
    /** Rótulo curto exibido em chips e colunas (ex.: "15/06"; em "Todos os eventos", "Nome do evento (15/06)"). */
    label: string;
    /** Descrição completa (ex.: "15 jun 2026, 18:00"; em "Todos os eventos", "Nome do evento, 15 jun 2026, 18:00"). */
    descricao: string;
    /** Nome do evento da sessão (a origem da linha em "Todos os eventos", REL-227). */
    evento: string;
    /** Data da sessão em formato dd/mm/aaaa. */
    data: string;
}

/* ------------------------------------------------------------------ */
/*  Evento dos relatórios: espelho do evento em contexto ou, no escopo */
/*  "todos os eventos" (BKS-27), da organização inteira. Nome, sessões */
/*  e janela de vendas vêm do banco (desde 21/11/2026; antes era fixo  */
/*  em "Botafogo x Chapecoense").                                      */
/* ------------------------------------------------------------------ */

export const EVENT = {
    nome: "",
    locale: "pt-BR",
    currency: "BRL",
    /** Código exibido em alguns lugares como prefixo de moeda. */
    currencyLabel: "R$",
    timeZone: "America/Sao_Paulo",
    tzLabel: "Horário de Brasília (GMT-3)",
    /** Janela de vendas (dd/mm/aaaa): do primeiro dia com venda ao dia do evento (ou hoje, se depois). */
    salesStart: "",
    salesEnd: "",
    sessoes: [] as Sessao[],
};

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const p2 = (n: number) => String(n).padStart(2, "0");
const br = (d: Date) => `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`;

let versao = 0;
const ouvintes = new Set<() => void>();
let chave = "";

function espelhar() {
    const { tabelas } = lerBanco();
    const todos = escopoDosRelatorios() === "todos";
    const ids = todos ? eventosDaOrganizacao.map((e) => e.id) : [eventoAtualId()];
    const docs = ids.map((id) => tabelas.eventos[id]).filter((e): e is EventoBanco => !!e);
    const novaChave = `${todos}|${docs.map((d) => `${d.id}:${d.atualizadoEm}`).join(",")}|${ids.map((id) => tabelas.historico[id]?.serie.length ?? 0).join(",")}`;
    if (novaChave === chave) return;
    chave = novaChave;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const inicios = docs.map((e) => {
        const dias = tabelas.historico[e.id]?.serie.length ?? 0;
        const criado = new Date(e.criadoEm);
        const peloHistorico = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - dias);
        return dias ? Math.min(peloHistorico.getTime(), criado.getTime()) : criado.getTime();
    });
    const fins = docs.map((e) => new Date(e.data).getTime());
    EVENT.nome = todos ? "Todos os eventos" : (docs[0]?.nome ?? "");
    EVENT.salesStart = br(new Date(inicios.length ? Math.min(...inicios) : hoje.getTime()));
    EVENT.salesEnd = br(new Date(Math.max(hoje.getTime(), ...fins)));
    EVENT.sessoes = docs.flatMap((e) =>
        e.sessoes.map((s) => {
            const d = new Date(s.inicio);
            const label = `${p2(d.getDate())}/${p2(d.getMonth() + 1)}`;
            return {
                id: s.id,
                label: todos ? `${e.nome} (${label})` : label,
                descricao: todos ? `${e.nome}, ${dataEHora(d)}` : dataEHora(d),
                evento: e.nome,
                data: br(d),
            };
        }),
    );
    versao++;
    ouvintes.forEach((o) => o());
}

if (typeof window !== "undefined") {
    assinarBanco(espelhar);
    assinarEventoAtual(espelhar);
    assinarEscopoDosRelatorios(espelhar);
    espelhar();
}

/** O evento dos relatórios, assinado: a tela redesenha quando o evento, o escopo ou o banco mudam. */
export function useEventoDosRelatorios() {
    useSyncExternalStore(
        (fn) => {
            ouvintes.add(fn);
            return () => ouvintes.delete(fn);
        },
        () => versao,
        () => 0,
    );
    return EVENT;
}

/* ------------------------------------------------------------------ */
/*  Formatters derivados (substituem os duplicados em cada página).    */
/* ------------------------------------------------------------------ */

export const currencyFormatter = new Intl.NumberFormat(EVENT.locale, {
    style: "currency",
    currency: EVENT.currency,
});

export const numberFormatter = new Intl.NumberFormat(EVENT.locale);

export const percentFormatter = new Intl.NumberFormat(EVENT.locale, {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
});

/** Data e hora num formato só, nos relatórios (T9): "26 nov 2026, 20:00". */
export function dataEHora(d: Date) {
    return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}, ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

/** Formata uma data dd/mm/aaaa (ou Date) no padrão do evento. */
export const dateFormatter = new Intl.DateTimeFormat(EVENT.locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: EVENT.timeZone,
});

/** Converte uma string dd/mm/aaaa[, HH:MM] num Date local (ou null). */
export const parseEventDate = (s: string): Date | null => {
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2}))?/);
    if (!m) return null;
    return new Date(
        Number(m[3]),
        Number(m[2]) - 1,
        Number(m[1]),
        m[4] ? Number(m[4]) : 0,
        m[5] ? Number(m[5]) : 0,
    );
};
