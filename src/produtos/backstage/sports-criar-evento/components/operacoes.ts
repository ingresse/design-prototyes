import type { Categoria, Lote, Modalidade, Rascunho } from "../data/tipos";

/* Atualizações imutáveis do rascunho, por modalidade, categoria e lote. */

export const comModalidade = (id: string, fn: (m: Modalidade) => Modalidade) => (r: Rascunho): Rascunho => ({
    ...r,
    modalidades: r.modalidades.map((m) => (m.id === id ? fn(m) : m)),
});

export const comCategoria = (modId: string, catId: string, fn: (c: Categoria) => Categoria) =>
    comModalidade(modId, (m) => ({ ...m, categorias: m.categorias.map((c) => (c.id === catId ? fn(c) : c)) }));

export const comLote = (modId: string, catId: string, loteId: string, fn: (l: Lote) => Lote) =>
    comCategoria(modId, catId, (c) => ({ ...c, lotes: c.lotes.map((l) => (l.id === loteId ? fn(l) : l)) }));

/** Move o item `id` uma posição para cima (-1) ou para baixo (+1). */
export const mover = <T extends { id: string }>(lista: T[], id: string, direcao: -1 | 1): T[] => {
    const i = lista.findIndex((x) => x.id === id);
    const j = i + direcao;
    if (i < 0 || j < 0 || j >= lista.length) return lista;
    const nova = [...lista];
    [nova[i], nova[j]] = [nova[j], nova[i]];
    return nova;
};

/** Insere `item` logo depois do item `id`. */
export const inserirDepois = <T extends { id: string }>(lista: T[], id: string, item: T): T[] => {
    const i = lista.findIndex((x) => x.id === id);
    const nova = [...lista];
    nova.splice(i + 1, 0, item);
    return nova;
};
