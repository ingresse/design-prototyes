import { EVENTO, HUBS, HUB_PADRAO, SERVICOS, servicoNoEvento, valorFinal, type Evento, type Servico, type ServicoId } from "../data/servicos";
import { escolherHub } from "./contratados";

/**
 * Evento da oferta: o do endereço (?evento=), o do hub quando a pessoa veio dele (?de=checklist) ou,
 * vindo de uma comunicação, o Festival Aurora (evento das comunicações).
 */
export function eventoDaOferta(params: URLSearchParams): Evento {
    const pedido = params.get("evento");
    if (pedido && HUBS[pedido]) return HUBS[pedido].evento;
    if (params.get("de") === "checklist") return HUBS[escolherHub(null, Object.keys(HUBS), HUB_PADRAO)].evento;
    return EVENTO;
}

/**
 * O serviço como a oferta mostra: textos do evento e, aberto pelo hub, sempre com o evento na
 * página (card do evento no lugar do mosaico), mesmo os que fora do hub são genéricos.
 */
export function servicoDaOferta(id: string | undefined, params: URLSearchParams): Servico | undefined {
    const base = SERVICOS[id as ServicoId];
    if (!base) return undefined;
    const servico = servicoNoEvento(base, eventoDaOferta(params));
    return params.get("de") === "checklist" ? { ...servico, evento: true } : servico;
}

/**
 * Pedido de um serviço (serviço + valor escolhido), lido da rota e da query string
 * (?valor=100). Checkout e confirmação usam o mesmo caminho.
 */
export interface ItemPedido {
    servico: Servico;
    valor: number;
    /** Proteção de compra: quantos ingressos foram protegidos (?ingressos=a,b). */
    ingressos?: number;
}

/** Pacote precisa ser um dos oferecidos; crédito/recarga respeita mínimo e máximo. */
export const valorValido = (servico: Servico, valor: number) =>
    servico.ingressos?.length
        ? valor > 0 && valor <= servico.ingressos.reduce((t, i) => t + i.valor * (servico.percentual ?? 0), 0) + 0.001
        : servico.pacotes
          ? servico.valores.includes(valor)
          : valor >= servico.minimo && valor <= servico.maximo;

export function lerPedido(id: string | undefined, params: URLSearchParams): ItemPedido | null {
    const servico = servicoDaOferta(id, params);
    const valor = Number(params.get("valor"));
    if (!servico || !valor || !valorValido(servico, valor)) return null;
    if (!servico.ingressos?.length) return { servico, valor };
    // Proteção: os ingressos escolhidos vêm na URL; sem eles (link antigo), conta pelo valor
    const ids = (params.get("ingressos") ?? "").split(",").filter((id) => servico.ingressos?.some((i) => i.id === id));
    return { servico, valor, ingressos: ids.length || Math.max(1, Math.round(valor / ((servico.ingressos[0].valor || 1) * (servico.percentual ?? 1)))) };
}

export const totalPedido = ({ servico, valor }: ItemPedido) => valorFinal(servico, valor);

/** Nome do item no resumo: "Crédito Uber" ou "Fotos do rolê · 15 fotos". */
export const nomeItem = ({ servico, valor, ingressos }: ItemPedido) =>
    ingressos ? `${servico.item} · ${ingressos} ${ingressos === 1 ? "ingresso" : "ingressos"}` : servico.pacotes?.[valor] ? `${servico.item} · ${servico.pacotes[valor]}` : servico.item;
