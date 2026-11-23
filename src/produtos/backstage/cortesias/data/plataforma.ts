import { useMemo } from "react";
import { loteAVenda, type Evento, type ItemDeCortesia, type ProdutoDaOrganizacao } from "@/plataforma";
import { useCatalogo } from "../../itens/data/catalogo";
import { definirProdutosECombos, definirSessoes, type ComboEntry, type ProductEntry, type SessionSection } from "./cortesia-items";

/* ------------------------------------------------------------------ */
/*  Cortesias ligadas ao banco unificado                               */
/*                                                                     */
/*  O catálogo de cortesia é o do evento em contexto: todo ingresso    */
/*  ativo com lote, os produtos ativos com estoque e os combos ativos  */
/*  com itens. O id do item guarda a referência no catálogo.           */
/* ------------------------------------------------------------------ */

/** Id do item de cortesia: `c:<sessão>:<grupo>:<ingresso>`. */
export const idDoItem = (sessaoId: string, grupoId: string, ingressoId: string) => `c:${sessaoId}:${grupoId}:${ingressoId}`;
/** Id do produto de cortesia: `p:<produto na biblioteca>`. */
export const idDoProduto = (produtoId: string) => `p:${produtoId}`;
/** Id do combo de cortesia: `k:<combo do evento>`. */
export const idDoCombo = (comboId: string) => `k:${comboId}`;

export const lerIdDoItem = (id: string) => {
    const [prefixo, sessaoId, grupoId, ingressoId] = id.split(":");
    return prefixo === "c" && sessaoId && grupoId && ingressoId ? { sessaoId, grupoId, ingressoId } : null;
};

/** Referência que `emitirCortesias` entende, a partir do id do item na tela. */
export function referenciaDoItem(id: string, rotulos: { nome?: string; detalhe?: string } = {}): ItemDeCortesia | null {
    const ingresso = lerIdDoItem(id);
    if (ingresso) return ingresso;
    const [prefixo, ...resto] = id.split(":");
    const ref = resto.join(":");
    if (!ref) return null;
    if (prefixo === "p") return { produtoId: ref, nome: rotulos.nome };
    if (prefixo === "k") return { comboId: ref, detalhe: rotulos.detalhe };
    return null;
}

/** Id do item no catálogo do evento (tipo de ingresso, produto ou combo), como os canais da equipe guardam. */
export const idNoCatalogo = (id: string) => lerIdDoItem(id)?.ingressoId ?? id.replace(/^[pk]:/, "");

/** Data da sessão com `Intl`: "2 out 2026, 23:00" (UI-TXT-009). */
const FORMATO_DA_SESSAO = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
export const dataDaSessao = (inicio: string) => {
    const d = new Date(inicio);
    if (Number.isNaN(d.getTime())) return inicio;
    return FORMATO_DA_SESSAO.formatToParts(d)
        .map((p) => (p.type === "month" ? p.value.replace(".", "") : p.type === "literal" ? p.value.replace(/ de /g, " ") : p.value))
        .join("");
};

export function sessoesDoBanco(evento: Evento, vendidos: Map<string, number>): SessionSection[] {
    return evento.sessoes.map((s) => ({
        id: s.id,
        datetime: dataDaSessao(s.inicio),
        groups: s.grupos
            .map((g) => ({
                id: g.id,
                name: g.nome,
                tickets: g.ingressos
                    .filter((t) => t.ativo && t.lotes.length > 0)
                    .map((t) => ({ id: idDoItem(s.id, g.id, t.id), name: t.nome, type: (loteAVenda(evento, t, vendidos) ?? t.lotes[t.lotes.length - 1]).nome })),
            }))
            .filter((g) => g.tickets.length > 0),
    }));
}

/** Imagem estável pelo id quando o produto não tem foto (mesmo recurso das capas sem upload). */
const imagemDoProduto = (p: ProdutoDaOrganizacao) => p.imagem || `https://picsum.photos/seed/${p.id}/80/80`;

export function produtosDoBanco(evento: Evento, biblioteca: ProdutoDaOrganizacao[]): ProductEntry[] {
    return (evento.produtos ?? []).flatMap((noEvento) => {
        const produto = biblioteca.find((b) => b.id === noEvento.produtoId);
        if (!produto || !noEvento.ativo || noEvento.estoque <= 0) return [];
        return [{ id: idDoProduto(produto.id), name: produto.nome, imageUrl: imagemDoProduto(produto) }];
    });
}

export function combosDoBanco(evento: Evento, biblioteca: ProdutoDaOrganizacao[]): ComboEntry[] {
    const ingressos = new Map(
        evento.sessoes.flatMap((s) => s.grupos.flatMap((g) => g.ingressos.map((t) => [t.id, { nome: t.nome, grupo: g.nome, data: dataDaSessao(s.inicio) }] as const))),
    );
    return (evento.combos ?? [])
        .filter((c) => c.ativo && c.itens.length > 0)
        .map((c) => {
            const subItems = c.itens.map((i) => {
                const qtd = i.quantidade > 1 ? `${i.quantidade}x ` : "";
                if (i.tipo === "ingresso") {
                    const t = ingressos.get(i.id);
                    return { name: `${qtd}${t?.nome ?? "Ingresso removido"}`, type: t?.grupo ?? "Ingresso", date: t?.data ?? "" };
                }
                return { name: `${qtd}${biblioteca.find((b) => b.id === i.id)?.nome ?? "Produto removido"}`, type: "Produto", date: "" };
            });
            const total = c.itens.reduce((s, i) => s + i.quantidade, 0);
            return { id: idDoCombo(c.id), name: c.nome, subtitle: `${total} ${total === 1 ? "item" : "itens"}`, subItems };
        });
}

export interface CatalogoDeCortesia {
    evento?: Evento;
    /** Catálogo simulado com N ingressos (`?escala=N`, COR-54): só na memória, nada é emitido. */
    simulado: number | null;
    sessoes: SessionSection[];
    produtos: ProductEntry[];
    combos: ComboEntry[];
}

/**
 * Troca o catálogo de cortesia pelo do evento em contexto. Chamado pelo provider e pela seleção de itens.
 * Lê pelo catálogo de Itens (`useCatalogo`, sem editá-lo), o mesmo que respeita `?escala=N` (COR-54);
 * vendidos inclui as compras pendentes, que seguram o lote.
 */
export function useCatalogoDeCortesia(): CatalogoDeCortesia {
    const { evento, biblioteca, vendidos, simulado } = useCatalogo();
    const sessoes = useMemo(() => (evento ? sessoesDoBanco(evento, vendidos) : []), [evento, vendidos]);
    const produtos = useMemo(() => (evento ? produtosDoBanco(evento, biblioteca) : []), [evento, biblioteca]);
    const combos = useMemo(() => (evento ? combosDoBanco(evento, biblioteca) : []), [evento, biblioteca]);
    definirSessoes(sessoes);
    definirProdutosECombos(produtos, combos);
    return { evento, simulado, sessoes, produtos, combos };
}
