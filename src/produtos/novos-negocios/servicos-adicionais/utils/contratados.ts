import type { ServicoId } from "../data/servicos";

/**
 * Serviços contratados a partir do Prepare seu rolê, só nesta sessão do protótipo: a confirmação
 * grava o valor e a forma de pagamento, e o card do serviço vira status. Fechar a aba volta tudo
 * ao estado inicial (nada é salvo de verdade).
 */
export type Contratado = { valor: number; forma: string };

const CHAVE = "servicos-adicionais:contratados";

export function lerContratados(): Partial<Record<ServicoId, Contratado>> {
    try {
        return JSON.parse(sessionStorage.getItem(CHAVE) ?? "{}");
    } catch {
        return {};
    }
}

export function marcarContratado(id: ServicoId, contratado: Contratado) {
    try {
        sessionStorage.setItem(CHAVE, JSON.stringify({ ...lerContratados(), [id]: contratado }));
    } catch {
        // Sem sessionStorage (aba privada): o card só não vira status
    }
}

