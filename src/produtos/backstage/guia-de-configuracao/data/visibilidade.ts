import { useSyncExternalStore } from "react";

/*
 * Escolha feita pelo botão "Guia" (GDC-60): abrir ou fechar o painel vale para a sessão, em todas as
 * telas. Sem escolha (`null`), o painel segue a regra do evento: aparece nas telas do evento enquanto
 * houver passo pendente e o guia não foi fechado (GDC-01, GDC-10).
 */
let escolha: boolean | null = null;
const ouvintes = new Set<() => void>();

/* Cada abertura pelo botão pede o painel expandido, mesmo se estava recolhido na faixa do título. */
let pedidosDeExpandir = 0;
export function definirPainelAberto(aberto: boolean) {
    escolha = aberto;
    if (aberto) pedidosDeExpandir++;
    ouvintes.forEach((o) => o());
}
export function usePedidosDeExpandir(): number {
    return useSyncExternalStore(
        (fn) => {
            ouvintes.add(fn);
            return () => ouvintes.delete(fn);
        },
        () => pedidosDeExpandir,
        () => 0,
    );
}

export function useEscolhaDoPainel(): boolean | null {
    return useSyncExternalStore(
        (fn) => {
            ouvintes.add(fn);
            return () => ouvintes.delete(fn);
        },
        () => escolha,
        () => null,
    );
}

/* O botão precisa saber se o painel está na tela (para alternar e para o aria-expanded). */
let visivel = false;
const ouvintesDaTela = new Set<() => void>();
export function informarPainelVisivel(v: boolean) {
    if (visivel === v) return;
    visivel = v;
    ouvintesDaTela.forEach((o) => o());
}
export function usePainelVisivel(): boolean {
    return useSyncExternalStore(
        (fn) => {
            ouvintesDaTela.add(fn);
            return () => ouvintesDaTela.delete(fn);
        },
        () => visivel,
        () => false,
    );
}
