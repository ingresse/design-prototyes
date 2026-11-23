import { baixarCsv } from "../../components/financas/csv";
import { HOJE, quitado, selosDoEvento, type Evento } from "../../components/financas/dados";

/* Busca, filtro, ordenação e relatório da lista de eventos. Tudo aqui vale só para a lista:
   a conta do topo é sempre da organização inteira. */

export const POR_PAGINA = 10;

export type Situacao = "todos" | "disponivel" | "a-liberar" | "negativo" | "ajuste" | "vendas";
export type Ordem = "pendentes" | "data" | "disponivel" | "a-liberar";

export const SITUACOES: Array<{ id: Situacao; label: string }> = [
    { id: "todos", label: "Todas as situações" },
    { id: "disponivel", label: "Com saldo disponível" },
    { id: "a-liberar", label: "Com valor antecipável" },
    { id: "negativo", label: "Com saldo negativo" },
    { id: "ajuste", label: "Com devolução recente" },
    { id: "vendas", label: "Em vendas" },
];

export const ORDENS: Array<{ id: Ordem; label: string }> = [
    { id: "pendentes", label: "Com valores a receber primeiro" },
    { id: "data", label: "Data do evento" },
    { id: "disponivel", label: "Maior saldo disponível" },
    { id: "a-liberar", label: "Maior valor antecipável" },
];

const NA_SITUACAO: Record<Situacao, (e: Evento) => boolean> = {
    todos: () => true,
    disponivel: (e) => e.disponivel > 0,
    "a-liberar": (e) => e.aLiberar > 0,
    negativo: (e) => e.disponivel < 0,
    ajuste: (e) => selosDoEvento(e).includes("Devolução recente"),
    vendas: (e) => e.emVendas,
};

/** Sem acento e sem diferença de maiúscula: "sao joao" encontra "São João". */
const simples = (texto: string) =>
    texto
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .trim();

/** Dias entre a data do evento e hoje, para qualquer lado: o que está acontecendo agora vem antes. */
const distanciaDeHoje = (e: Evento) => Math.abs(Date.parse(e.data) - Date.parse(HOJE));

export interface Filtros {
    busca: string;
    situacao: Situacao;
    ordem: Ordem;
    /** Período da data do evento (ISO), dos dois lados inclusive. */
    de?: string;
    ate?: string;
}

export function filtrarEOrdenar(eventos: Evento[], { busca, situacao, ordem, de, ate }: Filtros): Evento[] {
    const termo = simples(busca);
    const maisRecentePrimeiro = (a: Evento, b: Evento) => b.data.localeCompare(a.data);
    const pendentesPrimeiro = (a: Evento, b: Evento) => Number(quitado(a)) - Number(quitado(b)) || (quitado(a) ? 0 : distanciaDeHoje(a) - distanciaDeHoje(b));
    return eventos
        .filter((e) => (!termo || simples(e.nome).includes(termo)) && NA_SITUACAO[situacao](e) && (!de || e.data >= de) && (!ate || e.data <= ate))
        .sort((a, b) => (ordem === "disponivel" ? b.disponivel - a.disponivel : ordem === "a-liberar" ? b.aLiberar - a.aLiberar : ordem === "pendentes" ? pendentesPrimeiro(a, b) : 0) || maisRecentePrimeiro(a, b));
}

/** Relatório (CSV) dos eventos do resultado, com os mesmos nomes da tela. */
export function baixarRelatorio(eventos: Evento[]) {
    const colunas: Array<[string, (e: Evento) => string | number]> = [
        ["Evento", (e) => e.nome],
        ["Data do evento", (e) => e.data.split("-").reverse().join("/")],
        ["Vendido", (e) => e.vendido],
        ["Créditos", (e) => e.creditos],
        ["Taxas e custos", (e) => e.taxas],
        ["Devoluções", (e) => e.ajustes],
        ["Líquido", (e) => e.vendido - e.taxas + e.creditos - e.ajustes],
        ["Saldo disponível", (e) => e.disponivel],
        ["Antecipável", (e) => e.aLiberar],
        ["Saque agendado", (e) => e.agendado],
        ["Retido", (e) => e.retidoEvento + e.retidoSeguranca],
        ["Em processamento", (e) => e.processamento],
        ["Sacado", (e) => e.recebido],
    ];
    baixarCsv("financas-eventos.csv", [colunas.map(([nome]) => nome), ...eventos.map((e) => colunas.map(([, valor]) => valor(e)))]);
}
