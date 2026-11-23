import type { MetodoDeCriacao } from "../../components/como-criar-codigos";

/*
 * Rotas da Passkey e o rascunho da criação (CHA-40): o que foi preenchido fica na sessão do navegador,
 * por evento. Recarregar, usar o Voltar do navegador ou voltar de Vincular itens devolve as chaves.
 * Sai ao salvar os vínculos ou ao descartar.
 */

export const ROTA_PASSKEY = "/backstage/marketing/chave-de-acesso";
/** A criação tem endereço próprio: `?criar=1` (o roteador é da frente Shell; a rota é a mesma). */
export const ROTA_CRIAR_PASSKEY = `${ROTA_PASSKEY}?criar=1`;
export const ROTA_LISTA_DE_PASSKEYS = `${ROTA_PASSKEY}/lista`;
export const ROTA_VINCULAR_ITENS = `${ROTA_PASSKEY}/vincular-itens`;

export interface RascunhoDaPasskey {
    metodo: MetodoDeCriacao | null;
    limite?: number;
    quantidade?: number;
    prefixo: string;
    texto: string;
    limiteManual?: number;
}

export const RASCUNHO_VAZIO: RascunhoDaPasskey = { metodo: null, prefixo: "", texto: "" };

const chave = (eventoId: string) => `passkey-rascunho:${eventoId}`;

export function lerRascunho(eventoId: string): RascunhoDaPasskey | null {
    try {
        const raw = window.sessionStorage.getItem(chave(eventoId));
        return raw ? { ...RASCUNHO_VAZIO, ...(JSON.parse(raw) as Partial<RascunhoDaPasskey>) } : null;
    } catch {
        return null;
    }
}

export function salvarRascunho(eventoId: string, r: RascunhoDaPasskey) {
    try {
        window.sessionStorage.setItem(chave(eventoId), JSON.stringify(r));
    } catch {
        /* sem armazenamento: o rascunho vive só na tela */
    }
}

export function apagarRascunho(eventoId: string) {
    try {
        window.sessionStorage.removeItem(chave(eventoId));
    } catch {
        /* sem armazenamento: nada a apagar */
    }
}

export const rascunhoAlterado = (r: RascunhoDaPasskey) =>
    !!(r.metodo || r.texto.trim() || r.prefixo.trim() || r.quantidade != null || r.limite != null || r.limiteManual != null);

/** Modelo de importação (CHA-15): o título "Passkeys" na primeira linha e uma Passkey por linha abaixo. */
export const MODELO_CSV = "Passkeys\n";

/** Tira o título "Passkeys" da planilha, se veio junto. */
export const semCabecalho = (codigos: string[]) => codigos.filter((c) => !/^passkeys?$/i.test(c.trim()));
