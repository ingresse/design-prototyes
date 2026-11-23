import { useMemo } from "react";
import { anotarPedidoDaBilheteria, lerColecao, lerDoc, useColecao, useDoc, type Evento, type Pedido as PedidoBanco } from "@/plataforma";
import { useEventoAtual } from "../../eventos/data/eventos";
import { cartLines, cartTotal, type Cart } from "./carrinho";
import { formatarDataHora, type Buyer } from "./catalogo";
import type { Pedido, PedidoItem, PedidoTipo } from "./pedidos";
import { cancelarNoBanco, linkDePagamento, statusDoBanco } from "./plataforma";

/**
 * Pedidos da bilheteria (BIL), lidos do banco unificado: os pedidos do canal bilheteria do evento
 * em contexto. O que a gestão mostra além do pedido (tipo de cobrança, quem emitiu, link vencido,
 * reenvios) fica gravado no próprio pedido (`Pedido.bilheteria`). Assim a venda feita em outro
 * navegador ou aparelho aparece aqui também.
 */

/** Antes de 21/11/2026 esses dados ficavam no navegador: lidos só para completar pedidos antigos. */
const LEGADO_KEY = "bilheteria-pedidos:v2";
let legado: Map<string, Pedido> | null = null;
function lerLegado(): Map<string, Pedido> {
    if (legado) return legado;
    legado = new Map();
    if (typeof window === "undefined") return legado;
    try {
        const lista = JSON.parse(window.localStorage.getItem(LEGADO_KEY) ?? "[]") as Pedido[];
        for (const p of lista) legado.set(p.id, p);
    } catch {
        /* sem legado */
    }
    return legado;
}

const pad = (value: number) => value.toString().padStart(2, "0");
const rotuloDaSessao = (inicio: string) => {
    const d = new Date(inicio);
    return formatarDataHora(d);
};

/** Pedido do banco como a gestão da bilheteria mostra. */
function paraTela(p: PedidoBanco, evento: Evento | undefined, antigo: Pedido | undefined): Pedido {
    const meta = p.bilheteria;
    const criado = new Date(p.criadoEm);
    const itens: PedidoItem[] = p.itens.map((it, i) => {
        const sessao = it.sessaoId ? evento?.sessoes.find((s) => s.id === it.sessaoId) : undefined;
        const grupo = sessao?.grupos.find((g) => g.id === it.grupoId);
        const data = sessao ? rotuloDaSessao(sessao.inicio) : undefined;
        return {
            id: `${p.id}-${i}`,
            quantity: it.quantidade,
            name: it.nome,
            subtitle: it.tipo === "ingresso" ? [grupo?.nome, data].filter(Boolean).join(", ") || undefined : it.detalhe,
            data,
            lote: it.tipo === "ingresso" ? it.detalhe : undefined,
            unitPrice: it.face,
            access: it.tipo === "ingresso" ? "qrcode" : undefined,
        };
    });
    const datas = [...new Set(itens.filter((it) => it.lote).map((it) => it.data).filter(Boolean))] as string[];
    const expirado = (meta?.expirado ?? antigo?.status === "expirado") && p.status === "aguardando-pagamento";
    return {
        id: p.id,
        eventoId: p.eventoId,
        status: expirado ? "expirado" : statusDoBanco(p)!,
        tipo: meta?.tipo ?? antigo?.tipo ?? (p.pagamento?.metodo === "saldo" ? "saldo" : "link"),
        title: itens[0]?.name ?? "Venda na bilheteria",
        sessions: datas.join(" | ") || "—",
        sessionShort: datas[0] ?? "—",
        emissor: meta?.emissor ?? antigo?.emissor ?? "Bilheteria",
        destinatario: p.comprador.id === "u_bilheteria" ? "Sem identificação" : p.comprador.email,
        dataVenda: p.criadoEm,
        dataVendaLabel: formatarDataHora(criado),
        valor: p.total,
        paymentLink: linkDePagamento(p.id),
        itens,
        resentAt: meta?.reenviadoEm ?? antigo?.resentAt,
        contaPendente: meta?.contaPendente ?? antigo?.contaPendente,
        envios: meta?.envios ?? antigo?.envios,
    };
}

/** Pedidos da bilheteria no evento em contexto, do mais recente para o mais antigo. */
export function usePedidos(): Pedido[] {
    const ctx = useEventoAtual();
    const evento = useDoc("eventos", ctx.id);
    const doBanco = useColecao("pedidos");
    return useMemo(() => {
        const antigos = lerLegado();
        return doBanco
            .filter((p) => p.canal === "bilheteria" && p.eventoId === ctx.id)
            .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
            .map((p) => paraTela(p, evento, antigos.get(p.id)));
    }, [doBanco, evento, ctx.id]);
}

/** Grava no pedido do banco o que a gestão precisa da venda que acabou de sair. */
export function addPedido(pedido: Pedido) {
    void anotarPedidoDaBilheteria(pedido.id, {
        tipo: pedido.tipo,
        emissor: pedido.emissor,
        contaPendente: pedido.contaPendente,
        expirado: pedido.status === "expirado" || undefined,
    });
}

export function cancelPedidos(ids: string[]) {
    void cancelarNoBanco(ids);
}

export function registerResend(id: string, at: string, canal?: "email" | "whatsapp", destino?: string) {
    const antigo = lerLegado().get(id);
    const envios = lerDoc("pedidos", id)?.bilheteria?.envios ?? antigo?.envios ?? [];
    void anotarPedidoDaBilheteria(id, { reenviadoEm: at, envios: canal && destino ? [...envios, { canal, destino, at }] : envios });
}

/* ------------------------------------------------------------------ */
/*  Criação de um pedido a partir da venda concluída                   */
/* ------------------------------------------------------------------ */

export const formatDateTime = (date: Date) => formatarDataHora(date);

const isoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Taxa de serviço aplicada sobre o subtotal — espelha a do passo 3. */
const SERVICE_FEE_RATE = 0.1;

interface CreatePedidoInput {
    /** Id do pedido já gravado no banco. */
    id: string;
    eventoId: string;
    cart: Cart;
    buyer: Buyer | null;
    /** E-mail informado quando a conta não foi encontrada. */
    fallbackEmail?: string;
    tipo: PedidoTipo;
    emissor: string;
    paymentLink: string;
}

/**
 * Atalho de teste: vender para este e-mail cria o pedido já com o link vencido.
 * A expiração acontece dias depois da venda, fora da tela — sem um gatilho não
 * dá para exercitar a gestão desse estado.
 */
export const EMAIL_TESTE_EXPIRADO = "expirado@mail.com";

export function createPedido({ id, eventoId, cart, buyer, fallbackEmail, tipo, emissor, paymentLink }: CreatePedidoInput): Pedido {
    const lines = cartLines(cart);
    const subtotal = cartTotal(cart);
    const now = new Date();

    const itens: PedidoItem[] = lines.map((line) => ({
        id: line.id,
        quantity: line.quantity,
        name: line.name,
        subtitle: [line.meta, line.date].filter(Boolean).join(", ") || undefined,
        lote: line.lote,
        unitPrice: line.unitPrice,
        access: line.access,
    }));

    const sessions = [...new Set(lines.map((line) => line.date).filter(Boolean))].join(" | ");

    const destinatario = buyer?.email ?? fallbackEmail ?? "Sem identificação";
    const testeExpirado = destinatario.trim().toLowerCase() === EMAIL_TESTE_EXPIRADO;

    return {
        id,
        eventoId,
        // Link de pagamento nasce pendente; sem cobrança do comprador já é aprovado.
        status: testeExpirado ? "expirado" : tipo === "link" ? "pendente" : "aprovado",
        tipo,
        title: lines[0]?.name ?? "Venda na bilheteria",
        sessions: sessions || "—",
        sessionShort: lines[0]?.date ?? "—",
        emissor,
        destinatario,
        dataVenda: isoDate(now),
        dataVendaLabel: formatarDataHora(now),
        valor: tipo === "saldo" ? 0 : subtotal * (1 + SERVICE_FEE_RATE),
        paymentLink,
        itens,
        // Sem conta, o ingresso só chega na carteira depois do cadastro.
        contaPendente: !buyer && Boolean(fallbackEmail),
    };
}

/* ------------------------------------------------------------------ */
/*  Atalhos de teste                                                   */
/*                                                                     */
/*  O fluxo de venda só produz pedido pendente ou aprovado. Expirado    */
/*  acontece depois, fora da tela: sem um jeito de forçar não dá para   */
/*  testar a gestão desse estado. Só em dev, sem UI.                    */
/* ------------------------------------------------------------------ */

if (import.meta.env.DEV && typeof window !== "undefined") {
    const marcar = async (expirado: boolean, id?: string) => {
        const lista = lerColecao("pedidos").filter((p) => p.canal === "bilheteria");
        const alvo = id ? lista.find((p) => p.id === id) : lista.find((p) => p.status === "aguardando-pagamento" && !!p.bilheteria?.expirado !== expirado);
        if (!alvo) return `Nenhum pedido ${id ? `com id ${id}` : "pendente"} para alterar.`;
        await anotarPedidoDaBilheteria(alvo.id, { expirado });
        return `Pedido ${alvo.id} agora é ${expirado ? "expirado" : "pendente"}.`;
    };

    (window as unknown as Record<string, unknown>).bilheteria = {
        /** Expira o primeiro pendente, ou o pedido do id informado. */
        expirar: (id?: string) => marcar(true, id),
        /** Devolve um pedido expirado para pendente, para repetir o teste. */
        reabrir: (id?: string) => marcar(false, id),
    };
}
