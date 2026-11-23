import { MAPA_DE_STATUS, type CorDeStatus, type StatusDoBackstage } from "../../components/estado-de-pedido";

export type ItemKind = "ticket" | "product" | "combo";

export type ItemStatus =
    | "aceito"
    | "cancelado"
    | "pendente"
    | "processando"
    | "erro";

export interface CortesiaItem {
    id: string;
    kind: ItemKind;
    nome: string;
    subtitulo: string;
    status: ItemStatus;
    emissor: string;
    email: string;
    documento: string;
    transferido: boolean;
    pedidoId: string;
}

/** Status do item no mapa de status do Backstage (`components/estado-de-pedido.tsx`): Cancelado é cinza, como na Bilheteria (COR-52). */
export const ITEM_STATUS_SELO: Record<ItemStatus, StatusDoBackstage> = {
    aceito: "aceito",
    cancelado: "cancelado",
    pendente: "pendente-de-cadastro",
    processando: "processando",
    erro: "erro",
};

export const ITEM_STATUS_META: Record<ItemStatus, { label: string; color: CorDeStatus }> = Object.fromEntries(
    (Object.keys(ITEM_STATUS_SELO) as ItemStatus[]).map((s) => [s, { label: MAPA_DE_STATUS[ITEM_STATUS_SELO[s]].rotulo, color: MAPA_DE_STATUS[ITEM_STATUS_SELO[s]].cor }]),
) as Record<ItemStatus, { label: string; color: CorDeStatus }>;

export const ITEM_STATUS_ORDER: ItemStatus[] = [
    "aceito",
    "cancelado",
    "pendente",
    "processando",
    "erro",
];

export const ITEM_STATUS_OPTIONS = ITEM_STATUS_ORDER.map((id) => ({
    id,
    label: ITEM_STATUS_META[id].label,
}));

export const ITEM_KIND_LABEL: Record<ItemKind, string> = {
    ticket: "Ingresso",
    combo: "Combo",
    product: "Produto",
};

export const ITEM_KIND_OPTIONS: { id: ItemKind; label: string }[] = [
    { id: "ticket", label: ITEM_KIND_LABEL.ticket },
    { id: "combo", label: ITEM_KIND_LABEL.combo },
    { id: "product", label: ITEM_KIND_LABEL.product },
];

/**
 * Status de um destinatário pelos itens dele (COR-51): todos cancelados, Cancelado; alguns, Parcial com o
 * número ("Parcial: 1 de 3 cancelados"); nenhum, Emitido. Até 22/11/2026 vinha do envio inteiro e não mudava.
 */
export function statusDoDestinatario(itens: Pick<CortesiaItem, "status">[]): { status: "emitido" | "parcial" | "cancelado"; rotulo: string; cancelados: number } {
    const cancelados = itens.filter((i) => i.status === "cancelado").length;
    if (itens.length > 0 && cancelados === itens.length) return { status: "cancelado", rotulo: "Cancelado", cancelados };
    if (cancelados > 0) return { status: "parcial", rotulo: `Parcial: ${cancelados} de ${itens.length} cancelados`, cancelados };
    return { status: "emitido", rotulo: "Emitido", cancelados };
}
