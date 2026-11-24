import type { Evento, IngressoEmitido, Pedido, Usuario } from "../modelo";

/* ------------------------------------------------------------------ */
/*  Compras de exemplo da pessoa do novo site (desde 24/11/2026)        */
/*                                                                     */
/*  A conta que o site mostra no menu ("Pessoa Exemplo",               */
/*  pessoa@exemplo.com) com pedidos em situações diferentes, para a     */
/*  área logada (Minhas compras, Carteira) ter o que mostrar. Dado      */
/*  fictício. Os ingressos emitidos entram no estoque como venda.       */
/* ------------------------------------------------------------------ */

export const PESSOA_DO_SITE: Usuario = { id: "u_pessoa-exemplo", nome: "Pessoa Exemplo", email: "pessoa@exemplo.com" };

interface Linha {
    sessao: number;
    grupo: string;
    ingresso: string;
    lote: number;
    quantidade: number;
}
interface DefPedido {
    id: string;
    eventoId: string;
    status: Pedido["status"];
    criadoEm: string;
    linhas: Linha[];
    pagamento?: Pedido["pagamento"];
    /** Titulares diferentes do comprador, por unidade (na ordem das linhas). */
    titulares?: { nome: string; email: string }[];
    /** Unidades transferidas depois da compra (índice da unidade): o ingresso do comprador vira "transferido". */
    transferidos?: number[];
}

const DEFS: DefPedido[] = [
    // Pago no crédito em 3x, dois ingressos: um para a pessoa e um para uma amiga.
    {
        id: "ped-demo-primavera",
        eventoId: "ig-93986",
        status: "pago",
        criadoEm: "2026-10-02T14:12:00.000Z",
        linhas: [{ sessao: 1, grupo: "Pista", ingresso: "Inteira", lote: 1, quantidade: 2 }],
        pagamento: { metodo: "credito", parcelas: 3, pagoEm: "2026-10-02T14:13:00.000Z" },
        titulares: [PESSOA_DO_SITE, { nome: "Marina Alves", email: "marina.alves@exemplo.com" }],
    },
    // Pago no Pix, meia-entrada.
    {
        id: "ped-demo-encontrin",
        eventoId: "ig-110083",
        status: "pago",
        criadoEm: "2026-11-20T22:40:00.000Z",
        linhas: [{ sessao: 1, grupo: "Pista", ingresso: "Meia-entrada", lote: 1, quantidade: 1 }],
        pagamento: { metodo: "pix", pagoEm: "2026-11-20T22:41:00.000Z" },
    },
    // Pago, e um dos ingressos foi transferido para outra pessoa.
    {
        id: "ped-demo-dedge",
        eventoId: "ig-107273",
        status: "pago",
        criadoEm: "2026-11-10T19:05:00.000Z",
        linhas: [{ sessao: 2, grupo: "Pista", ingresso: "Inteira", lote: 2, quantidade: 2 }],
        pagamento: { metodo: "credito", parcelas: 1, pagoEm: "2026-11-10T19:06:00.000Z" },
        transferidos: [1],
    },
    // Aguardando o pagamento do Pix.
    {
        id: "ped-demo-fresno",
        eventoId: "ig-109672",
        status: "aguardando-pagamento",
        criadoEm: "2026-11-24T11:30:00.000Z",
        linhas: [{ sessao: 1, grupo: "Mezanino", ingresso: "Inteira", lote: 1, quantidade: 2 }],
    },
    // Cancelado (o Pix venceu).
    {
        id: "ped-demo-balburdia",
        eventoId: "ig-110130",
        status: "cancelado",
        criadoEm: "2026-11-15T23:50:00.000Z",
        linhas: [{ sessao: 1, grupo: "Pista Open Bar", ingresso: "Full open bar", lote: 1, quantidade: 2 }],
    },
];

const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const CODIGOS = ["K7Q2-M4TX-9PLA", "R3ZD-8WQN-2HVE", "B6YJ-T1CF-5KSU", "N9EH-4PRG-7XWM", "C2LV-6DAB-3QYT", "F8MK-0SJN-1ZRW"];

/** Monta os pedidos e os ingressos emitidos a partir dos eventos da seed (os ids do catálogo saem do evento). */
export function pedidosDeExemplo(eventos: Evento[]): { pedidos: Pedido[]; ingressos: IngressoEmitido[] } {
    const pedidos: Pedido[] = [];
    const ingressos: IngressoEmitido[] = [];
    let c = 0;
    for (const d of DEFS) {
        const ev = eventos.find((e) => e.id === d.eventoId);
        if (!ev) continue;
        const itens: Pedido["itens"] = [];
        for (const l of d.linhas) {
            const sessao = ev.sessoes[l.sessao - 1];
            const grupo = sessao?.grupos.find((g) => g.id === `${sessao.id}-${slug(l.grupo)}`);
            const tipo = grupo?.ingressos.find((t) => t.id === `${grupo.id}-${slug(l.ingresso)}`);
            const lote = tipo?.lotes[l.lote - 1];
            if (!sessao || !grupo || !tipo || !lote) continue;
            itens.push({ tipo: "ingresso", nome: tipo.nome, detalhe: lote.nome, sessaoId: sessao.id, grupoId: grupo.id, ingressoId: tipo.id, loteId: lote.id, quantidade: l.quantidade, face: lote.preco, taxa: Math.round(lote.preco * ev.taxaServico * 100) / 100 });
        }
        if (!itens.length) continue;
        const subtotal = itens.reduce((t, i) => t + i.face * i.quantidade, 0);
        const taxas = itens.reduce((t, i) => t + i.taxa * i.quantidade, 0);
        const atribuicoes = (d.titulares ?? []).map((t, n) => ({ item: 0, nome: t.nome, email: t.email }));
        pedidos.push({
            id: d.id,
            eventoId: ev.id,
            comprador: PESSOA_DO_SITE,
            canal: "site",
            itens,
            atribuicoes,
            subtotal,
            taxas,
            total: subtotal + taxas,
            status: d.status,
            ...(d.pagamento ? { pagamento: d.pagamento } : {}),
            criadoEm: d.criadoEm,
            atualizadoEm: d.pagamento?.pagoEm ?? d.criadoEm,
        });
        if (d.status !== "pago") continue;
        let unidade = 0;
        itens.forEach((item) => {
            const grupo = ev.sessoes.flatMap((s) => s.grupos).find((g) => g.id === item.grupoId);
            for (let n = 0; n < item.quantidade; n++, unidade++) {
                const titular = d.titulares?.[unidade] ?? PESSOA_DO_SITE;
                ingressos.push({
                    id: `${d.id}-ing${unidade + 1}`,
                    pedidoId: d.id,
                    eventoId: ev.id,
                    sessaoId: item.sessaoId!,
                    grupoId: item.grupoId!,
                    ingressoId: item.ingressoId!,
                    loteId: item.loteId!,
                    rotulo: { evento: ev.nome, grupo: grupo?.nome ?? "", ingresso: item.nome, lote: item.detalhe ?? "", acesso: grupo?.acesso },
                    titular: { nome: titular.nome, email: titular.email },
                    codigo: CODIGOS[c++ % CODIGOS.length],
                    status: d.transferidos?.includes(unidade) ? "transferido" : "valido",
                    emitidoEm: d.pagamento!.pagoEm,
                    atualizadoEm: d.pagamento!.pagoEm,
                });
            }
        });
    }
    return { pedidos, ingressos };
}
