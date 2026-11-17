/* "Entrar como [dependente]" na Carteira Web: qual perfil a carteira está usando agora (mesma lógica do app). */

import { useSyncExternalStore } from "react";
import { MULTIPERFIS } from "./funcionalidades";

export type PerfilAtivo = {
    id: string;
    nome: string;
    iniciais: string;
    cpf: string;
    /** Ingressos visíveis nesse perfil: só os que quem entrou comprou ou atribuiu ao dependente. */
    carteira: { eventId: string; itens: string[] }[];
};

let ativo: PerfilAtivo | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
};

// Com os multiperfis desligados, nunca há perfil de dependente em uso: a Carteira mostra a própria conta.
export const getPerfilAtivo = () => (MULTIPERFIS ? ativo : null);
export const usePerfilAtivo = () => {
    const perfil = useSyncExternalStore(subscribe, () => ativo);
    return MULTIPERFIS ? perfil : null;
};

export const entrarNoPerfil = (perfil: PerfilAtivo) => {
    if (!MULTIPERFIS) return;
    ativo = perfil;
    notify();
};

export const sairDoPerfil = () => {
    ativo = null;
    notify();
};

/** Ids dos itens do evento que aparecem no perfil ativo (undefined = perfil próprio, mostra tudo). */
export const itensDoPerfil = (eventId?: string) => (MULTIPERFIS && ativo ? (ativo.carteira.find((c) => c.eventId === eventId)?.itens ?? []) : undefined);
