/* Evento mock do Teste B (mesmo evento do carrinho em produção: cart.ingresse.com). */

export interface IngressoEvento {
    id: string;
    /** Setor/grupo do ingresso: aparece em negrito no resumo ("Pista"). */
    setor: string;
    /** Nome do ingresso: título da linha e linha de apoio no resumo. */
    nome: string;
    data: string;
    lote: string;
    preco: number;
}

export interface SetorEvento {
    id: string;
    nome: string;
    ingressos: IngressoEvento[];
}

export const EVENTO = {
    nome: "Dawn Patrol",
    local: "São Paulo - SP",
    diaSemana: "sexta, 21h00",
    data: "20 de novembro de 2026",
    /** Data como aparece no resumo do checkout. */
    dataResumo: "Sex, 20/11/26 às 21h00",
};

const ingresso = (id: string, setor: string, nome: string, lote: string, preco: number): IngressoEvento => ({
    id,
    setor,
    nome,
    data: "sex, 20/11/26 • 21h00",
    lote,
    preco,
});

export const SETORES: SetorEvento[] = [
    {
        id: "pista",
        nome: "Pista",
        ingressos: [
            ingresso("pista-fem-meia", "Pista", "Feminino Meia/Solidária", "Lote 03", 150),
            ingresso("pista-masc-meia", "Pista", "Masculino Meia/Solidária", "Lote 03", 150),
        ],
    },
    {
        id: "backstage",
        nome: "Backstage Open Bar",
        ingressos: [
            ingresso("bk-fem-meia", "Backstage Open Bar", "Feminino Meia/Solidária", "Lote 02", 240),
            ingresso("bk-masc-meia", "Backstage Open Bar", "Masculino Meia/Solidária", "Lote 02", 240),
            ingresso("bk-inteira", "Backstage Open Bar", "Inteira", "Lote 02", 480),
        ],
    },
];

export const INGRESSO_POR_ID: Record<string, IngressoEvento> = Object.fromEntries(SETORES.flatMap((s) => s.ingressos).map((i) => [i.id, i]));

/** Proteção de compra: percentual sobre o valor dos ingressos (valor de experimento). */
export const PROTECAO_PERCENTUAL = 0.08;
/** Taxa de serviço: percentual sobre o valor dos ingressos (valor de experimento). */
export const TAXA_SERVICO_PERCENTUAL = 0.05;
/** Taxa de processamento: valor fixo por ingresso (valor de experimento). */
export const TAXA_PROCESSAMENTO_POR_INGRESSO = 10;

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
