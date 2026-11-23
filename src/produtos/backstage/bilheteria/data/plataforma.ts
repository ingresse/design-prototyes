import { useMemo } from "react";
import {
    cancelarPedido,
    criarPedido,
    lerColecao,
    loteAVenda,
    lerDoc,
    organizacaoDoEvento,
    pagarPedido,
    slugificar,
    vendidosPorLote,
    type Evento,
    type ItemPedido,
    type Pedido as PedidoBanco,
    type ProdutoDaOrganizacao,
    type RegrasDeVenda,
    type Usuario,
} from "@/plataforma";
import { bibliotecaDe, useCatalogo } from "../../itens/data/catalogo";
import { cartLines, type Cart } from "./carrinho";
import {
    definirProdutosECombos,
    definirRegrasDoEvento,
    definirSessoes,
    formatarDataHora,
    isEmail,
    type Buyer,
    type ComboCategory,
    type ComboItem,
    type ProductItem,
    type TicketSession,
} from "./catalogo";
import type { PedidoStatus, PedidoTipo } from "./pedidos";

/* ------------------------------------------------------------------ */
/*  Bilheteria ligada ao banco unificado                               */
/*                                                                     */
/*  Ingressos, produtos e combos à venda = catálogo do evento em       */
/*  contexto (ingresso no lote atual). Regras (limite por documento e  */
/*  identificação) vêm das Regras de compra e acesso do evento.        */
/*  A venda vira pedido no banco, no canal                             */
/*  bilheteria: link de pagamento espera o checkout; "só a taxa" já    */
/*  nasce pago e emite os ingressos na carteira de quem comprou.       */
/* ------------------------------------------------------------------ */

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MESES_LONGOS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/** Produto e combo na bilheteria: `p:<produto da organização>` e `c:<combo do evento>`. */
const idDoProduto = (produtoId: string) => `p:${produtoId}`;
const idDoCombo = (comboId: string) => `c:${comboId}`;

/** Id do ingresso na bilheteria: `b:<sessão>:<grupo>:<ingresso>`. O lote é o atual na hora da venda. */
const idDoTicket = (sessaoId: string, grupoId: string, ingressoId: string) => `b:${sessaoId}:${grupoId}:${ingressoId}`;
const lerIdDoTicket = (id: string) => {
    const [prefixo, sessaoId, grupoId, ingressoId] = id.split(":");
    return prefixo === "b" && sessaoId && grupoId && ingressoId ? { sessaoId, grupoId, ingressoId } : null;
};

/** Item sem canal escolhido vende em todos; com canais, só se a bilheteria estiver entre eles. */
const vendeNaBilheteria = (v?: RegrasDeVenda) => !v?.canais?.length || v.canais.includes("bilheteria");

const rotuloCurto = (inicio: string) => formatarDataHora(inicio);

export function sessoesDoBanco(evento: Evento, vendidos: Map<string, number>): TicketSession[] {
    return evento.sessoes.map((s) => {
        const d = new Date(s.inicio);
        const dia = String(d.getDate()).padStart(2, "0");
        const hora = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        const longa = `${dia} de ${MESES_LONGOS[d.getMonth()]}`;
        const tickets = s.grupos.flatMap((g) =>
            g.ingressos
                .filter((t) => t.ativo && vendeNaBilheteria(t.vendas))
                .flatMap((t) => {
                    // Conjunto de lotes sincronizados: o lote da vez (LSI-31).
                    const lote = loteAVenda(evento, t, vendidos);
                    if (!lote) return [];
                    return [
                        {
                            id: idDoTicket(s.id, g.id, t.id),
                            // O nome é o do ingresso; o grupo vem no agrupador e na linha de apoio (sem "Pista · Inteira").
                            name: t.nome,
                            group: g.nome,
                            type: t.nome,
                            lote: lote.nome,
                            // Grupo com reconhecimento facial: o ingresso exige comprador identificado (BIL-33).
                            access: g.tipoAcesso === "facial" ? ("facial" as const) : ("qrcode" as const),
                            // A descrição do ingresso é HTML do editor do Backstage: aqui vai como texto.
                            // Sem descrição, nada: a frase padrão repetida em toda linha saiu (BIL-101).
                            description: t.descricao?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || "",
                            price: lote.preco,
                        },
                    ];
                }),
        );
        return {
            id: s.id,
            label: `${longa} às ${hora}`,
            shortDate: formatarDataHora(s.inicio),
            weekday: DIAS[d.getDay()],
            day: dia,
            month: MESES[d.getMonth()],
            year: String(d.getFullYear()),
            time: hora,
            soldOut: tickets.length === 0,
            tickets,
        };
    });
}

/** Produtos do evento ativos, com estoque e à venda na bilheteria, com nome, foto e preço da biblioteca. */
export function produtosDoBanco(evento: Evento, biblioteca: ProdutoDaOrganizacao[]): ProductItem[] {
    return (evento.produtos ?? []).flatMap((p) => {
        const doCatalogo = biblioteca.find((b) => b.id === p.produtoId);
        if (!p.ativo || p.estoque <= 0 || !doCatalogo || !vendeNaBilheteria(doCatalogo.vendas)) return [];
        return [{ id: idDoProduto(p.produtoId), name: doCatalogo.nome, price: p.preco ?? doCatalogo.precoBase, image: doCatalogo.imagem }];
    });
}

const COMBO_DESCRICAO = "Os ingressos do combo são emitidos juntos e valem para as datas e os grupos da composição.";

/**
 * Combos do evento ativos e à venda na bilheteria, num agrupador só ("Combos"). Combo com ingresso
 * sem lote à venda ou com limite zerado fica de fora.
 */
export function combosDoBanco(evento: Evento, vendidos: Map<string, number>, biblioteca: ProdutoDaOrganizacao[]): ComboCategory[] {
    const ingressos = new Map(evento.sessoes.flatMap((s) => s.grupos.flatMap((g) => g.ingressos.map((t) => [t.id, { s, g, t }] as const))));
    const lista = (evento.combos ?? []).flatMap((c): ComboItem[] => {
        if (!c.ativo || c.limite === 0 || !vendeNaBilheteria(c.vendas) || c.itens.length === 0) return [];
        let esgotado = false;
        const composicao = c.itens.map((it) => {
            if (it.tipo === "produto") return { quantity: it.quantidade, ticketName: biblioteca.find((b) => b.id === it.id)?.nome ?? "Produto", loteName: "", date: "" };
            const ref = ingressos.get(it.id);
            const lote = ref && ref.t.ativo ? loteAVenda(evento, ref.t, vendidos) : undefined;
            if (!lote) esgotado = true;
            return { quantity: it.quantidade, ticketName: ref ? `${ref.t.nome}, ${ref.g.nome}` : "Ingresso", loteName: lote?.nome ?? "", date: ref ? rotuloCurto(ref.s.inicio) : "" };
        });
        if (esgotado) return [];
        const primeiro = c.itens.map((it) => ingressos.get(it.id)).find(Boolean);
        const datas = [...new Set(composicao.map((x) => x.date).filter(Boolean))];
        return [{ id: idDoCombo(c.id), name: c.nome, group: primeiro?.g.nome ?? "Produtos", type: "Combo", dates: datas, description: c.descricao || COMBO_DESCRICAO, price: c.preco, shortDate: datas[0] ?? "", composicao }];
    });
    return lista.length ? [{ id: "combos-do-evento", name: "Combos", combos: lista }] : [];
}

/**
 * Regras da bilheteria lidas do evento (Regras de compra e acesso, ITM-66 e ITM-67):
 * - limite por documento: só com "Limite por comprador na Bilheteria online" em "Aplicar limites";
 *   vale o limite por pessoa da categoria Ingresso (sem ele, o geral; sem nenhum, sem limite);
 * - identificação obrigatória: evento com acesso por face (serviço escolhido ou grupo facial ativo).
 */
export function regrasDoEvento(evento: Evento | undefined) {
    const limites = evento?.limites;
    const limitePorDocumento = evento?.avancado?.limiteBilheteriaOnline === "aplicar" ? (limites?.porCategoria.ingresso ?? limites?.geral ?? 0) : 0;
    const identificacaoObrigatoria =
        // "nenhum" é a opção "Não usar acesso por face" (eventos/data/opcoes-evento.ts).
        (!!evento?.avancado?.acessoFacialId && evento.avancado.acessoFacialId !== "nenhum") || !!evento?.sessoes.some((s) => s.grupos.some((g) => g.tipoAcesso === "facial" && g.ingressos.some((t) => t.ativo)));
    return { limitePorDocumento: limitePorDocumento ?? 0, identificacaoObrigatoria };
}

/**
 * Catálogo da bilheteria para o evento em contexto. Troca as sessões, os produtos, os combos e as
 * regras do módulo de catálogo na renderização, antes dos passos da venda lerem. Devolve as
 * sessões (vazio = nada à venda).
 */
export function useCatalogoDoBanco(): { evento?: Evento; sessoes: TicketSession[]; simulado: number | null } {
    // Pelo catálogo de Itens (sem editá-lo), que respeita `?escala=N`: com a simulação, as sessões e os
    // ingressos são os simulados, só na memória, e a venda não grava (BIL-102).
    const { evento, biblioteca, vendidos, simulado } = useCatalogo();
    const catalogo = useMemo(() => {
        if (!evento) return { sessoes: [], produtos: [], combos: [] };
        return { sessoes: sessoesDoBanco(evento, vendidos), produtos: produtosDoBanco(evento, biblioteca), combos: combosDoBanco(evento, vendidos, biblioteca) };
    }, [evento, biblioteca, vendidos]);
    definirSessoes(catalogo.sessoes);
    definirProdutosECombos(catalogo.produtos, catalogo.combos);
    definirRegrasDoEvento(regrasDoEvento(evento));
    return { evento, sessoes: catalogo.sessoes, simulado };
}

/* ---------------- compradores ---------------- */

const iniciais = (nome: string) =>
    nome
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]!.toUpperCase())
        .join("") || "?";

/**
 * Compradores da organização do evento, achados nos pedidos do banco (`pedido.comprador`), em
 * qualquer evento dela. E-mail: igual, sem diferenciar maiúsculas. Texto sem números (3 letras ou
 * mais): parte do nome. Documento: o banco não guarda documento do comprador, então não acha.
 */
export function buscarCompradores(termo: string, evento: Evento | undefined): Buyer[] {
    const valor = termo.trim().toLowerCase();
    if (!valor || !evento) return [];
    const org = organizacaoDoEvento(evento);
    const daOrganizacao = new Set(lerColecao("eventos").filter((e) => organizacaoDoEvento(e) === org).map((e) => e.id));
    const porEmail = isEmail(valor);
    const porNome = !porEmail && !/\d/.test(valor) && valor.length >= 3;
    const achados = new Map<string, Buyer>();
    for (const p of lerColecao("pedidos")) {
        const c = p.comprador;
        if (!daOrganizacao.has(p.eventoId) || c.id === "u_bilheteria" || achados.has(c.id)) continue;
        const bate = porEmail ? c.email.toLowerCase() === valor : porNome && c.nome.toLowerCase().includes(valor);
        if (bate) achados.set(c.id, { id: c.id, name: c.nome, email: c.email, initials: iniciais(c.nome) });
    }
    return [...achados.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

/* ---------------- venda ---------------- */

interface VendaInput {
    eventoId: string;
    cart: Cart;
    buyer: Buyer | null;
    fallbackEmail?: string;
    tipo: PedidoTipo;
}

function comprador(buyer: Buyer | null, fallbackEmail?: string): Usuario {
    if (buyer) return { id: `u_${slugificar(buyer.email)}`, nome: buyer.name, email: buyer.email.toLowerCase() };
    const email = fallbackEmail?.trim().toLowerCase();
    if (email) return { id: `u_${slugificar(email)}`, nome: email.split("@")[0], email };
    // Venda sem identificação: o ingresso fica com a bilheteria (impresso no PDF).
    return { id: "u_bilheteria", nome: "Venda sem identificação", email: "bilheteria@exemplo.com" };
}

/**
 * Grava a venda como pedido do canal bilheteria. Link: aguarda pagamento no checkout.
 * Só a taxa: a produtora paga a taxa pelo saldo, o comprador não paga e os ingressos saem na hora.
 */
export async function gravarVenda({ eventoId, cart, buyer, fallbackEmail, tipo }: VendaInput): Promise<PedidoBanco> {
    const evento = lerDoc("eventos", eventoId);
    const taxa = evento?.taxaServico ?? 0.1;
    const itens: ItemPedido[] = cartLines(cart).flatMap((line): ItemPedido[] => {
        const ref = lerIdDoTicket(line.id);
        const tipoIngresso = ref && evento?.sessoes.find((s) => s.id === ref.sessaoId)?.grupos.find((g) => g.id === ref.grupoId)?.ingressos.find((t) => t.id === ref.ingressoId);
        const lote = tipoIngresso?.lotes.find((l) => l.nome === line.lote);
        const face = tipo === "saldo" ? 0 : line.unitPrice;
        const taxaItem = Math.round(line.unitPrice * taxa * 100) / 100;
        if (ref && tipoIngresso && lote) {
            return [{ tipo: "ingresso", nome: tipoIngresso.nome, detalhe: lote.nome, ...ref, loteId: lote.id, quantidade: line.quantity, face, taxa: taxaItem }];
        }
        const combo = line.id.startsWith("c:") ? evento?.combos?.find((c) => idDoCombo(c.id) === line.id) : undefined;
        if (evento && combo) return itensDoCombo(evento, combo, line.unitPrice, line.quantity, tipo, taxa);
        // Produto do evento: entra no pedido, não emite ingresso.
        return [{ tipo: "produto", nome: line.name, detalhe: line.meta, quantidade: line.quantity, face, taxa: taxaItem }];
    });
    const pedido = await criarPedido({ eventoId, comprador: comprador(buyer, fallbackEmail), canal: "bilheteria", itens, atribuicoes: [] });
    if (tipo === "saldo") await pagarPedido(pedido.id, "saldo");
    return lerDoc("pedidos", pedido.id) ?? pedido;
}

const centavos = (v: number) => Math.round(v * 100) / 100;

/**
 * Combo vendido: abre nos itens dele. Cada ingresso sai no lote à venda e é emitido como os avulsos;
 * cada produto entra como produto. O preço do combo é rateado pelo preço avulso de cada item.
 */
function itensDoCombo(evento: Evento, combo: NonNullable<Evento["combos"]>[number], preco: number, quantidade: number, tipo: PedidoTipo, taxa: number): ItemPedido[] {
    const vendidos = vendidosPorLote(lerColecao("ingressos"), lerColecao("historico"));
    const biblioteca = bibliotecaDe(lerDoc("organizacoes", organizacaoDoEvento(evento)), organizacaoDoEvento(evento));
    const partes = combo.itens.flatMap((it) => {
        if (it.tipo === "produto") {
            const avulso = evento.produtos?.find((p) => p.produtoId === it.id)?.preco ?? biblioteca.find((b) => b.id === it.id)?.precoBase ?? 0;
            return [{ it, avulso, produto: biblioteca.find((b) => b.id === it.id)?.nome ?? "Produto" }];
        }
        for (const s of evento.sessoes)
            for (const g of s.grupos) {
                const t = g.ingressos.find((x) => x.id === it.id);
                const lote = t && loteAVenda(evento, t, vendidos);
                if (t && lote) return [{ it, avulso: lote.preco, ingresso: { sessaoId: s.id, grupoId: g.id, ingressoId: t.id, loteId: lote.id, nome: t.nome, lote: lote.nome } }];
            }
        return [];
    });
    const somaAvulso = partes.reduce((a, p) => a + p.avulso * p.it.quantidade, 0);
    const unidades = partes.reduce((a, p) => a + p.it.quantidade, 0) || 1;
    return partes.map((p): ItemPedido => {
        const unitario = somaAvulso > 0 ? (preco * p.avulso) / somaAvulso : preco / unidades;
        const base = { quantidade: p.it.quantidade * quantidade, face: tipo === "saldo" ? 0 : centavos(unitario), taxa: centavos(unitario * taxa) };
        if ("ingresso" in p) {
            const { nome, lote, ...ref } = p.ingresso;
            return { tipo: "ingresso", nome, detalhe: lote, ...ref, ...base };
        }
        return { tipo: "produto", nome: "produto" in p ? p.produto : "Produto", detalhe: combo.nome, ...base };
    });
}

/** Link de pagamento real: abre o checkout com o pedido. */
export const linkDePagamento = (pedidoId: string) =>
    `${typeof window === "undefined" ? "" : window.location.origin}/checkout/melhorias-de-compra?pedido=${pedidoId}`;

/** Status do pedido do banco como a gestão da bilheteria mostra. */
export const statusDoBanco = (p: PedidoBanco | undefined): PedidoStatus | undefined =>
    !p ? undefined : p.status === "pago" ? "aprovado" : p.status === "cancelado" ? "cancelado" : "pendente";

export const cancelarNoBanco = (ids: string[]) => Promise.all(ids.map((id) => cancelarPedido(id)));
