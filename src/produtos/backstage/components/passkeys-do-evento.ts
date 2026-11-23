import { useMemo } from "react";
import { atualizarEvento, lerDoc, useBanco, useDoc, type Evento, type Passkey, type Sessao } from "@/plataforma";
import { useEventoAtual } from "../eventos/data/eventos";

/*
 * Passkeys do evento em contexto (CHA), num lugar só para quem usa: Ingressos e produtos › Passkey e o botão
 * de Passkeys dos ingressos (Ingressos e produtos). A lista fica no evento (`Evento.passkeys`); o
 * que cada uma libera fica em `chaves` do ingresso, do lote, do combo e do produto, que o fluxo de
 * compra lê.
 */

export const LIMITE_DE_PASSKEYS_NO_EVENTO = 5000;

/** Chave em maiúsculas: as Passkeys não distinguem caixa (CHA-11). */
export const normalizarCodigo = (c: string) => c.trim().toUpperCase();
export const codigoValido = (c: string) => /^[A-Za-z0-9]+$/.test(c.trim());

export interface PasskeyNaLista extends Passkey {
    /** Itens que ela libera: ingressos inteiros, lotes, combos e produtos. */
    vinculos: number;
}

/** Quantos itens do catálogo cada código libera. */
export function vinculosPorCodigo(evento: Evento | undefined): Map<string, number> {
    const mapa = new Map<string, number>();
    if (!evento) return mapa;
    const somar = (chaves?: string[]) => chaves?.forEach((c) => mapa.set(c, (mapa.get(c) ?? 0) + 1));
    for (const s of evento.sessoes) for (const g of s.grupos) for (const t of g.ingressos) {
        somar(t.chaves);
        t.lotes.forEach((l) => somar(l.chaves));
    }
    evento.combos?.forEach((c) => somar(c.chaves));
    evento.produtos?.forEach((p) => somar(p.chaves));
    return mapa;
}

const codigosCache = new WeakMap<Evento, string[]>();
/** Códigos que os ingressos podem receber: as Passkeys do evento e as que já estão em algum item. */
export function codigosDoEvento(evento: Evento | undefined): string[] {
    if (!evento) return [];
    const pronto = codigosCache.get(evento);
    if (pronto) return pronto;
    const codigos = [...new Set([...(evento.passkeys ?? []).map((p) => p.codigo), ...vinculosPorCodigo(evento).keys()])];
    codigosCache.set(evento, codigos);
    return codigos;
}

export function usePasskeysDoEvento() {
    const { modo } = useBanco();
    const ctx = useEventoAtual();
    const evento = useDoc("eventos", ctx.id);
    const passkeys = useMemo<PasskeyNaLista[]>(() => {
        const vinculos = vinculosPorCodigo(evento);
        return [...(evento?.passkeys ?? [])].sort((a, b) => b.criadaEm.localeCompare(a.criadaEm)).map((p) => ({ ...p, vinculos: vinculos.get(p.codigo) ?? 0 }));
    }, [evento]);
    return { carregando: modo === "carregando" || !evento, evento, passkeys };
}

/** Gera `quantidade` códigos com o prefixo, sem repetir os do evento. */
export function gerarCodigos(quantidade: number, prefixo: string, existentes: Iterable<string>): string[] {
    const usados = new Set(existentes);
    const base = normalizarCodigo(prefixo).replace(/[^A-Z0-9]/g, "");
    const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const tamanho = Math.max(4, 8 - base.length);
    const novos: string[] = [];
    while (novos.length < quantidade) {
        let c = base;
        for (let i = 0; i < tamanho; i++) c += letras[Math.floor(Math.random() * letras.length)];
        if (!usados.has(c)) {
            usados.add(c);
            novos.push(c);
        }
    }
    return novos;
}

/** Itens marcados em Vincular itens. */
export interface AlvosDaPasskey {
    lotes: string[];
    combos: string[];
    produtos: string[];
}

const juntar = (atuais: string[] | undefined, novos: string[]) => [...new Set([...(atuais ?? []), ...novos])];
const tirar = (atuais: string[] | undefined, fora: Set<string>) => {
    if (!atuais?.length) return atuais;
    const resto = atuais.filter((c) => !fora.has(c));
    return resto.length ? resto : undefined;
};

/** Aplica uma troca em `chaves` de todo item do catálogo. */
function emCadaItem(evento: Evento, fn: (chaves: string[] | undefined, tipo: "ingresso" | "lote" | "combo" | "produto", id: string) => string[] | undefined): Pick<Evento, "sessoes" | "combos" | "produtos"> {
    const sessoes: Sessao[] = evento.sessoes.map((s) => ({
        ...s,
        grupos: s.grupos.map((g) => ({
            ...g,
            ingressos: g.ingressos.map((t) => ({ ...t, chaves: fn(t.chaves, "ingresso", t.id), lotes: t.lotes.map((l) => ({ ...l, chaves: fn(l.chaves, "lote", l.id) })) })),
        })),
    }));
    return {
        sessoes,
        combos: evento.combos?.map((c) => ({ ...c, chaves: fn(c.chaves, "combo", c.id) })),
        produtos: evento.produtos?.map((p) => ({ ...p, chaves: fn(p.chaves, "produto", p.produtoId) })),
    };
}

/** Cria as Passkeys (se ainda não existem) e vincula os itens marcados. */
export async function salvarPasskeys(eventoId: string, codigos: string[], alvos: AlvosDaPasskey, limite?: number | null) {
    const evento = lerDoc("eventos", eventoId);
    if (!evento) return;
    const existentes = new Set((evento.passkeys ?? []).map((p) => p.codigo));
    const agora = new Date().toISOString();
    const novas = codigos.filter((c) => !existentes.has(c)).map((codigo): Passkey => ({ codigo, ativa: true, limite: limite ?? null, usos: 0, criadaEm: agora }));
    const lotes = new Set(alvos.lotes);
    const combos = new Set(alvos.combos);
    const produtos = new Set(alvos.produtos);
    const catalogo = emCadaItem(evento, (chaves, tipo, id) =>
        (tipo === "lote" && lotes.has(id)) || (tipo === "combo" && combos.has(id)) || (tipo === "produto" && produtos.has(id)) ? juntar(chaves, codigos) : chaves,
    );
    await atualizarEvento(eventoId, { ...catalogo, passkeys: [...novas, ...(evento.passkeys ?? [])] });
}

/** Ativa, desativa ou muda o limite. */
export async function atualizarPasskeys(eventoId: string, codigos: string[], patch: Partial<Pick<Passkey, "ativa" | "limite">>) {
    const evento = lerDoc("eventos", eventoId);
    if (!evento) return;
    const alvo = new Set(codigos);
    await atualizarEvento(eventoId, { passkeys: (evento.passkeys ?? []).map((p) => (alvo.has(p.codigo) ? { ...p, ...patch } : p)) });
}

/** Tira as Passkeys de todos os itens; elas continuam no evento. */
export async function desvincularPasskeys(eventoId: string, codigos: string[]) {
    const evento = lerDoc("eventos", eventoId);
    if (!evento) return;
    const fora = new Set(codigos);
    await atualizarEvento(eventoId, emCadaItem(evento, (chaves) => tirar(chaves, fora)));
}

/** Remove do evento e de todos os itens. */
export async function removerPasskeys(eventoId: string, codigos: string[]) {
    const evento = lerDoc("eventos", eventoId);
    if (!evento) return;
    const fora = new Set(codigos);
    await atualizarEvento(eventoId, { ...emCadaItem(evento, (chaves) => tirar(chaves, fora)), passkeys: (evento.passkeys ?? []).filter((p) => !fora.has(p.codigo)) });
}

/** Link de compra que já aplica a Passkey. */
export const linkDaPasskey = (evento: Evento, codigo: string) =>
    `${typeof window === "undefined" ? "" : window.location.origin}/e/${evento.slug}?passkey=${encodeURIComponent(codigo)}`;
