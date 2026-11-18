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


/**
 * Evento do hub: vem de ?evento= (o atalho da Carteira manda o evento) e fica guardado nesta sessão,
 * para o "Ver outros serviços" da confirmação voltar ao mesmo evento. Sem nenhum, o Festival Aurora.
 */
const CHAVE_HUB = "servicos-adicionais:hub-evento";

export function escolherHub(pedido: string | null, validos: string[], padrao: string): string {
    try {
        if (pedido && validos.includes(pedido)) {
            sessionStorage.setItem(CHAVE_HUB, pedido);
            return pedido;
        }
        const salvo = sessionStorage.getItem(CHAVE_HUB);
        if (salvo && validos.includes(salvo)) return salvo;
    } catch {
        if (pedido && validos.includes(pedido)) return pedido;
    }
    return padrao;
}
