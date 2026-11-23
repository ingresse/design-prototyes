import { useSyncExternalStore } from "react";
import { definirMoeda, horaAgora } from "./campos";
import { rascunhoVazio } from "./modelos";
import type { Rascunho } from "./tipos";

/* ------------------------------------------------------------------ */
/*  Rascunho em memória, salvo automaticamente (SCE-04)                */
/*  O mesmo rascunho vale para as duas versões (assistente e página    */
/*  única): trocar de versão no seletor de protótipo não perde nada.   */
/*  Persiste na sessão do navegador; arquivos guardam só nome e        */
/*  tamanho (a prévia da imagem some ao recarregar).                   */
/* ------------------------------------------------------------------ */

const CHAVE = "sports-criar-evento-rascunho";

interface Estado {
    rascunho: Rascunho;
    salvando: boolean;
}

const ler = (): Rascunho | null => {
    try {
        const bruto = sessionStorage.getItem(CHAVE);
        return bruto ? { ...rascunhoVazio(), ...(JSON.parse(bruto) as Rascunho) } : null;
    } catch {
        return null;
    }
};

const gravar = (r: Rascunho) => {
    try {
        sessionStorage.setItem(CHAVE, JSON.stringify(r));
    } catch {
        /* sem armazenamento: o rascunho fica só em memória */
    }
};

let estado: Estado = { rascunho: ler() ?? rascunhoVazio(), salvando: false };
const ouvintes = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;

const emitir = () => {
    definirMoeda(estado.rascunho.moeda);
    ouvintes.forEach((o) => o());
};
definirMoeda(estado.rascunho.moeda);

const assinar = (o: () => void) => {
    ouvintes.add(o);
    return () => ouvintes.delete(o);
};

/** Altera o rascunho e agenda o salvamento automático (~1 s depois da última mudança). */
export function atualizarRascunho(fn: (r: Rascunho) => Rascunho) {
    estado = { rascunho: fn(estado.rascunho), salvando: true };
    emitir();
    clearTimeout(timer);
    timer = setTimeout(() => {
        estado = { rascunho: { ...estado.rascunho, salvoEm: horaAgora() }, salvando: false };
        gravar(estado.rascunho);
        emitir();
    }, 900);
}

/** Salva agora (botão "Salvar rascunho"). */
export function salvarAgora() {
    clearTimeout(timer);
    estado = { rascunho: { ...estado.rascunho, salvoEm: horaAgora() }, salvando: false };
    gravar(estado.rascunho);
    emitir();
}

/** Começa um rascunho novo (do zero ou copiado). */
export function iniciarRascunho(r: Rascunho) {
    clearTimeout(timer);
    estado = { rascunho: { ...r, salvoEm: horaAgora() }, salvando: false };
    gravar(estado.rascunho);
    emitir();
}

export function useRascunho() {
    return useSyncExternalStore(assinar, () => estado, () => estado);
}

/** Há um rascunho com algo preenchido e ainda não publicado. */
export const temRascunhoEmAndamento = (r: Rascunho) =>
    !r.publicado && (r.nome.trim() !== "" || r.modalidades.length > 0 || r.esporte !== "" || r.origem === "copia");
