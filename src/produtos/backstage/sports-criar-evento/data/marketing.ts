import { agoraIsoLocal, formatarReais } from "./campos";
import { novoId } from "./modelos";
import type { Categoria, ChaveDeAcesso, CupomDeDesconto, Lote, Rascunho } from "./tipos";

/* ------------------------------------------------------------------ */
/*  Cupons de desconto e chaves de acesso (v0.37, SCE-279 a SCE-284)   */
/*  Reaproveitam o backend do AWA: os dois são do evento e se ligam    */
/*  aos lotes. Na categoria, o atalho age em todos os lotes dela; no   */
/*  lote, só nele. A gestão completa continua no menu do evento.       */
/* ------------------------------------------------------------------ */

export type Recurso = "cupom" | "chave";

/** Onde o atalho foi aberto: a categoria inteira (todos os lotes) ou um lote. */
export type Alvo = { categoria: Categoria; lote?: Lote };

export const cuponsDe = (r: Pick<Rascunho, "cupons">) => r.cupons ?? [];
export const chavesDe = (r: Pick<Rascunho, "chaves">) => r.chaves ?? [];

export const lotesDoAlvo = (a: Alvo) => (a.lote ? [a.lote.id] : a.categoria.lotes.map((l) => l.id));

/** Itens (cupons ou chaves) ligados a algum lote do alvo, com quantos lotes do alvo cobrem. */
export function vinculadosAoAlvo<T extends { lotes: string[] }>(itens: T[], a: Alvo) {
    const ids = lotesDoAlvo(a);
    return itens
        .map((item) => ({ item, cobertos: ids.filter((id) => item.lotes.includes(id)).length, total: ids.length }))
        .filter((x) => x.cobertos > 0);
}

export const contarNoAlvo = (itens: { lotes: string[] }[], a: Alvo) => vinculadosAoAlvo(itens, a).length;

/** Códigos: só letras e números, sem diferenciar maiúsculas (como no AWA, CHA-11). */
export const normalizarCodigo = (s: string) => s.toUpperCase().replace(/\s+/g, "");
export const codigoValido = (s: string) => /^[A-Z0-9]+$/.test(s);

const LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const gerarCodigo = (prefixo = "", tamanho = 6) => {
    let c = "";
    for (let i = 0; i < tamanho; i++) c += LETRAS[Math.floor(Math.random() * LETRAS.length)];
    return `${normalizarCodigo(prefixo)}${c}`;
};

export const textoDoDesconto = (c: Pick<CupomDeDesconto, "tipo" | "valor">) =>
    c.valor == null ? "Desconto a definir" : c.tipo === "percentual" ? `${c.valor.toLocaleString("pt-BR")}% de desconto` : `${formatarReais(c.valor)} de desconto`;

export const textoDoUso = (x: { usados: number; limite: number | null }) => (x.limite == null ? `${x.usados} usos, sem limite` : `${x.usados} de ${x.limite} usos`);

/** Menor preço entre os lotes do alvo (para não deixar o cupom de valor fixo passar do preço). */
export const menorPrecoDoAlvo = (a: Alvo) => {
    const lotes = a.lote ? [a.lote] : a.categoria.lotes;
    const valores = lotes.map((l) => l.valor).filter((v): v is number => v != null);
    return valores.length ? Math.min(...valores) : null;
};

export const novoCupom = (parcial: Partial<CupomDeDesconto> = {}): CupomDeDesconto => ({
    id: novoId("cupom"),
    codigo: "",
    tipo: "percentual",
    valor: null,
    limite: null,
    usados: 0,
    validoDe: agoraIsoLocal(),
    validoAte: "",
    ativo: true,
    lotes: [],
    ...parcial,
});

export const novaChave = (parcial: Partial<ChaveDeAcesso> = {}): ChaveDeAcesso => ({
    id: novoId("chave"),
    codigo: "",
    limite: null,
    usados: 0,
    ativo: true,
    lotes: [],
    ...parcial,
});

/** Liga ou desliga os lotes do alvo num item. */
export const comLotes = <T extends { lotes: string[] }>(item: T, ids: string[], ligar: boolean): T => ({
    ...item,
    lotes: ligar ? [...new Set([...item.lotes, ...ids])] : item.lotes.filter((l) => !ids.includes(l)),
});

/** Lote fica oculto quando tem ao menos uma chave ativa (SCE-281). */
export const loteOculto = (r: Pick<Rascunho, "chaves">, loteId: string) => chavesDe(r).some((c) => c.ativo && c.lotes.includes(loteId));
