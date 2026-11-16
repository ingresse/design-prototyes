import { selosDoEvento, type Evento } from "../../components/financas/dados";

/* Busca, filtro, ordenação e relatório da lista de eventos. Tudo aqui vale só para a lista:
   a conta do topo é sempre da organização inteira. */

export const POR_PAGINA = 10;

export type Situacao = "todos" | "disponivel" | "a-liberar" | "negativo" | "ajuste" | "vendas";
export type Ordem = "data" | "disponivel" | "a-liberar";

export const SITUACOES: Array<{ id: Situacao; label: string }> = [
    { id: "todos", label: "Todos os eventos" },
    { id: "disponivel", label: "Com dinheiro disponível" },
    { id: "a-liberar", label: "Com valor a liberar" },
    { id: "negativo", label: "Com saldo negativo" },
    { id: "ajuste", label: "Com ajuste recente" },
    { id: "vendas", label: "Em vendas" },
];

export const ORDENS: Array<{ id: Ordem; label: string }> = [
    { id: "data", label: "Data do evento" },
    { id: "disponivel", label: "Maior disponível" },
    { id: "a-liberar", label: "Maior a liberar" },
];

const NA_SITUACAO: Record<Situacao, (e: Evento) => boolean> = {
    todos: () => true,
    disponivel: (e) => e.disponivel > 0,
    "a-liberar": (e) => e.aLiberar > 0,
    negativo: (e) => e.disponivel < 0,
    ajuste: (e) => selosDoEvento(e).includes("Ajuste recente"),
    vendas: (e) => e.emVendas,
};

/** Sem acento e sem diferença de maiúscula: "sao joao" encontra "São João". */
const simples = (texto: string) =>
    texto
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .trim();

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
    return eventos
        .filter((e) => (!termo || simples(e.nome).includes(termo)) && NA_SITUACAO[situacao](e) && (!de || e.data >= de) && (!ate || e.data <= ate))
        .sort((a, b) => (ordem === "disponivel" ? b.disponivel - a.disponivel : ordem === "a-liberar" ? b.aLiberar - a.aLiberar : 0) || maisRecentePrimeiro(a, b));
}

/** Relatório (CSV) dos eventos do resultado, com os mesmos nomes da tela. */
export function baixarRelatorio(eventos: Evento[]) {
    const colunas: Array<[string, (e: Evento) => string | number]> = [
        ["Evento", (e) => e.nome],
        ["Data do evento", (e) => e.data.split("-").reverse().join("/")],
        ["Vendido", (e) => e.vendido],
        ["Taxas e custos", (e) => e.taxas],
        ["Créditos", (e) => e.creditos],
        ["Ajustes", (e) => e.ajustes],
        ["Seu dinheiro", (e) => e.vendido - e.taxas + e.creditos - e.ajustes],
        ["Em processamento", (e) => e.processamento],
        ["Retido", (e) => e.retidoEvento + e.retidoSeguranca],
        ["A liberar", (e) => e.aLiberar],
        ["Disponível agora", (e) => e.disponivel],
        ["Agendado", (e) => e.agendado],
        ["Já recebido", (e) => e.recebido],
    ];
    const celula = (valor: string | number) => (typeof valor === "number" ? String(valor) : `"${valor.replace(/"/g, '""')}"`);
    const linhas = [colunas.map(([nome]) => celula(nome)), ...eventos.map((e) => colunas.map(([, valor]) => celula(valor(e))))];
    // BOM: o Excel abre com os acentos certos.
    const arquivo = new Blob([`﻿${linhas.map((l) => l.join(";")).join("\n")}`], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(arquivo);
    link.download = "financas-eventos.csv";
    link.click();
    URL.revokeObjectURL(link.href);
}
