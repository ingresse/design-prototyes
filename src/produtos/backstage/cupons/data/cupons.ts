import { atualizarEvento, type Cupom, type Evento } from "@/plataforma";
import { exemplosDoGerador } from "../../components/como-criar-codigos";

/*
 * Regras e gravação dos cupons (CUP), as mesmas do promo-service de produção: código só com letras e
 * números, em maiúsculas e único no evento; percentual até 100; fim depois do início; limites > 0;
 * cupom já usado só muda limites e data final, e não é excluído.
 */

export const LIMITE_AUTOMATICO = 5000;
export const LIMITE_MANUAL = 1000;

export const salvarCupons = (evento: Evento, cupons: Cupom[]) => atualizarEvento(evento.id, { cupons });

/** "10%" ou "R$ 10,50". */
export const formatarDesconto = (c: Pick<Cupom, "tipoDesconto" | "valor">, preco: (v: number) => string) =>
    c.tipoDesconto === "percentual" ? `${c.valor.toLocaleString("pt-BR")}%` : preco(c.valor);

const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Códigos automáticos: prefixo em maiúsculas + 6 letras ou números, sem repetir os do evento. */
export function gerarCodigos(quantidade: number, prefixo: string, existentes: Set<string>): string[] {
    const p = prefixo.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const novos = new Set<string>();
    while (novos.size < quantidade) {
        let s = p;
        for (let i = 0; i < 6; i++) s += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
        if (!existentes.has(s)) novos.add(s);
    }
    return [...novos];
}

/** Exemplos que a tela mostra para o prefixo digitado: do mesmo jeito que o gerador (prefixo + 6). */
export const exemplosDoPrefixo = (prefixo: string) => exemplosDoGerador(prefixo, ALFABETO, () => 6);

/**
 * Arquivo .csv ou .txt: separa por vírgula ou linha, tira o cabeçalho "Cupons" e fica com os 1.000
 * primeiros. Os inválidos vêm junto, para aparecerem destacados (antes, sumiam em silêncio).
 */
export function lerArquivoDeCodigos(texto: string): { codigos: string[]; passou: boolean } {
    const todos = texto
        .split(/[,\n\r;]/)
        .map((s) => s.trim().replace(/^"|"$/g, "").trim())
        .filter(Boolean)
        .filter((s) => !/^(cupons|coupons|cupones|instru[cç][oõ]es)$/i.test(s));
    return { codigos: todos.slice(0, LIMITE_MANUAL), passou: todos.length > LIMITE_MANUAL };
}

/** Modelo de importação: o título "Cupons" na primeira linha e um cupom por linha abaixo. */
export const MODELO_CSV = "Cupons\n";

/** Regras do formulário (passo 2 e edição). */
export interface RegrasDoCupom {
    tipoDesconto: Cupom["tipoDesconto"];
    valor?: number;
    limiteItens?: number;
    limitePorComprador?: number;
    limiteItensPorCompra?: number;
    inicioData: string;
    inicioHora: string;
    fimData: string;
    fimHora: string;
}

export const regrasDoCupom = (c?: Cupom): RegrasDoCupom => ({
    tipoDesconto: c?.tipoDesconto ?? "percentual",
    valor: c?.valor,
    limiteItens: c?.limiteItens,
    limitePorComprador: c?.limitePorComprador,
    limiteItensPorCompra: c?.limiteItensPorCompra,
    inicioData: c?.inicio.slice(0, 10) ?? "",
    inicioHora: c?.inicio.slice(11, 16) ?? "",
    fimData: c?.fim?.slice(0, 10) ?? "",
    fimHora: c?.fim?.slice(11, 16) ?? "",
});

export interface ErrosDasRegras {
    valor?: string;
    limitePorComprador?: string;
    inicio?: string;
    fim?: string;
}

/** CUP-30 a CUP-36. `restrito`: cupom já usado, só limites e data final. */
export function validarRegras(r: RegrasDoCupom, restrito = false): ErrosDasRegras {
    const e: ErrosDasRegras = {};
    if (!restrito) {
        if (r.valor == null) e.valor = "Campo obrigatório";
        else if (r.tipoDesconto === "percentual" && r.valor > 100) e.valor = "O percentual vai de 0 a 100.";
        if (!r.inicioData) e.inicio = "A data inicial é obrigatória.";
    }
    if (r.limiteItens != null && r.limitePorComprador != null && r.limitePorComprador > r.limiteItens)
        e.limitePorComprador = "Não pode ser maior que o limite “Por itens”.";
    if (r.fimData) {
        const inicio = `${r.inicioData}T${r.inicioHora || "00:00"}`;
        const fim = `${r.fimData}T${r.fimHora || "00:00"}`;
        if (r.inicioData && fim <= inicio) e.fim = "A data final não pode ser anterior à data inicial.";
    }
    return e;
}

export const inicioDasRegras = (r: RegrasDoCupom) => `${r.inicioData}T${r.inicioHora || "00:00"}`;
export const fimDasRegras = (r: RegrasDoCupom) => (r.fimData ? `${r.fimData}T${r.fimHora || "00:00"}` : undefined);
