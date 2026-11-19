import { useSyncExternalStore } from "react";
import { INGRESSO_POR_ID, PROTECAO_PERCENTUAL, TAXA_PROCESSAMENTO_POR_INGRESSO, TAXA_SERVICO_PERCENTUAL } from "./evento";

/** Escolha da proteção: `null` enquanto o comprador ainda não respondeu ao modal. */
export type EscolhaProtecao = "com" | "sem" | null;

interface Pedido {
    quantidades: Record<string, number>;
    protecao: EscolhaProtecao;
}

let pedido: Pedido = { quantidades: {}, protecao: null };
const ouvintes = new Set<() => void>();

const publicar = (proximo: Pedido) => {
    pedido = proximo;
    ouvintes.forEach((o) => o());
};

const assinar = (ouvinte: () => void) => {
    ouvintes.add(ouvinte);
    return () => {
        ouvintes.delete(ouvinte);
    };
};

/** Pedido em memória, compartilhado entre a seleção e o checkout (some ao recarregar a página). */
export function usePedido() {
    const atual = useSyncExternalStore(assinar, () => pedido);

    const selecionados = Object.entries(atual.quantidades).filter(([, q]) => q > 0);
    const qtdIngressos = selecionados.reduce((s, [, q]) => s + q, 0);
    const subtotal = selecionados.reduce((s, [id, q]) => s + INGRESSO_POR_ID[id].preco * q, 0);
    const valorProtecao = Math.round(subtotal * PROTECAO_PERCENTUAL * 100) / 100;
    const taxaServico = Math.round(subtotal * TAXA_SERVICO_PERCENTUAL * 100) / 100;
    const taxaProcessamento = qtdIngressos * TAXA_PROCESSAMENTO_POR_INGRESSO;
    const taxas = taxaServico + taxaProcessamento;
    const total = subtotal + taxas + (atual.protecao === "com" ? valorProtecao : 0);

    return {
        ...atual,
        selecionados,
        qtdIngressos,
        subtotal,
        valorProtecao,
        taxaServico,
        taxaProcessamento,
        taxas,
        total,
        mudarQuantidade: (id: string, qtd: number) => publicar({ ...pedido, quantidades: { ...pedido.quantidades, [id]: Math.max(0, qtd) } }),
        limpar: () => publicar({ ...pedido, quantidades: {} }),
        escolherProtecao: (protecao: EscolhaProtecao) => publicar({ ...pedido, protecao }),
    };
}
