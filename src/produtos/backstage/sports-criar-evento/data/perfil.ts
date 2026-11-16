import { useSyncExternalStore } from "react";

/* ------------------------------------------------------------------ */
/*  Organizações e perfil de quem usa (item de protótipo, SCE-120)     */
/*  RN-09: na cópia de evento e na cópia de perguntas, o organizador   */
/*  vê só os eventos da própria organização; o administrador da        */
/*  plataforma vê os de todas, com o nome da organização.              */
/* ------------------------------------------------------------------ */

export interface Organizacao {
    id: string;
    nome: string;
    sigla: string;
}

/** Nomes fictícios. */
export const ORGANIZACOES: Organizacao[] = [
    { id: "sul-run", nome: "Sul Run Eventos", sigla: "SR" },
    { id: "liga-corrida", nome: "Liga Paulista de Corrida", sigla: "LP" },
    { id: "trilhas-brasil", nome: "Trilhas Brasil", sigla: "TB" },
];

/** Organização em contexto no protótipo. */
export const ORGANIZACAO_ATUAL = ORGANIZACOES[0];

export const nomeDaOrganizacao = (id: string) => ORGANIZACOES.find((o) => o.id === id)?.nome ?? "";

export type Perfil = "organizador" | "admin";

export const PERFIS: { id: Perfil; label: string }[] = [
    { id: "organizador", label: "Organizador" },
    { id: "admin", label: "Administrador da plataforma" },
];

export const ehPerfil = (v: string | null | undefined): v is Perfil => v === "organizador" || v === "admin";

const CHAVE = "sports-criar-evento-perfil";

const ler = (): Perfil => {
    try {
        const v = localStorage.getItem(CHAVE);
        return ehPerfil(v) ? v : "organizador";
    } catch {
        return "organizador";
    }
};

let perfil: Perfil = typeof window === "undefined" ? "organizador" : ler();
const ouvintes = new Set<() => void>();

export function escolherPerfil(v: Perfil) {
    if (v === perfil) return;
    perfil = v;
    try {
        localStorage.setItem(CHAVE, v);
    } catch {
        /* vale só nesta aba */
    }
    ouvintes.forEach((o) => o());
}

const assinar = (o: () => void) => {
    ouvintes.add(o);
    return () => ouvintes.delete(o);
};

export function usePerfil() {
    return useSyncExternalStore(assinar, () => perfil, () => perfil);
}

/** RN-09: o que o perfil pode ver. */
export const podeVer = (p: Perfil, organizacaoId: string) => p === "admin" || organizacaoId === ORGANIZACAO_ATUAL.id;
