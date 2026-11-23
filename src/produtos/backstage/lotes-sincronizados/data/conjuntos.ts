import { atualizarEvento, type ConjuntoSincronizado, type Evento, type Grupo, type Lote, type Sessao, type TipoIngresso } from "@/plataforma";

/*
 * Lotes sincronizados (LSI), as regras de produção (ING-400 a ING-422) sobre o catálogo do protótipo:
 * o conjunto junta ingressos que viram de lote juntos. A virada dispara quando a soma das vendas dos
 * lotes em curso chega ao gatilho; então cada item fecha o lote e abre o seguinte. Viradas = (mais
 * lotes restantes entre os itens, a contar do lote inicial) − 1. Tudo aqui é derivado das vendas.
 */

export const LIMITE_DO_NOME = 120;

export const salvarConjuntos = (evento: Evento, conjuntosSincronizados: ConjuntoSincronizado[]) => atualizarEvento(evento.id, { conjuntosSincronizados });

export interface IngressoNoCatalogo {
    tipo: TipoIngresso;
    grupo: Grupo;
    sessao: Sessao;
}

export function ingressosDoEvento(evento: Evento): Map<string, IngressoNoCatalogo> {
    const m = new Map<string, IngressoNoCatalogo>();
    for (const sessao of evento.sessoes) for (const grupo of sessao.grupos) for (const tipo of grupo.ingressos) m.set(tipo.id, { tipo, grupo, sessao });
    return m;
}

/** Lote vigente: o primeiro com saldo e não pausado (o mesmo que a compra usa). */
export const loteVigente = (t: TipoIngresso, vendidos: Map<string, number>): Lote | undefined => t.lotes.find((l) => !l.pausado && (vendidos.get(l.id) ?? 0) < l.quantidade);

/** Viradas possíveis com estes itens: o item com mais lotes restantes, menos um. */
export function viradasPossiveis(itens: { tipo: TipoIngresso; inicio: number }[]) {
    return Math.max(0, ...itens.map((i) => i.tipo.lotes.length - i.inicio)) - 1;
}

/** Em qual conjunto o ingresso já está (um item só pode estar num conjunto ativo). */
export const conjuntoDoIngresso = (evento: Evento, ingressoId: string) => (evento.conjuntosSincronizados ?? []).find((c) => c.itens.some((i) => i.ingressoId === ingressoId));

export type StatusDaVirada = "concluida" | "ativa" | "aguardando";

export interface AvancoDoItem {
    ingressoId: string;
    nome: string;
    grupo: string;
    ativo: boolean;
    /** Números de lote (1, 2, 3…): de qual para qual. `para` ausente: sem próximo lote. */
    de: number;
    para?: number;
}

export interface Virada {
    numero: number;
    status: StatusDaVirada;
    gatilho?: number;
    /** Vendas (aprovadas + pendentes) dos lotes em curso nesta virada. */
    vendidos: number;
    pendentes: number;
    itens: AvancoDoItem[];
}

export interface EstadoDoConjunto {
    conjunto: ConjuntoSincronizado;
    itens: (IngressoNoCatalogo & { inicio: number })[];
    viradas: Virada[];
    executadas: number;
    /** Virada em curso (a primeira não concluída), ou `null` quando todas rodaram. */
    atual: Virada | null;
    /** Há viradas sem gatilho depois da próxima: lotes novos entraram (banner de produção). */
    novasSemGatilho: boolean;
}

export function estadoDoConjunto(conjunto: ConjuntoSincronizado, evento: Evento, vendidos: Map<string, number>, pendentes: Map<string, number>): EstadoDoConjunto {
    const mapa = ingressosDoEvento(evento);
    const itens = conjunto.itens.flatMap((i) => {
        const c = mapa.get(i.ingressoId);
        if (!c) return [];
        const inicio = Math.max(0, c.tipo.lotes.findIndex((l) => l.id === i.loteInicialId));
        return [{ ...c, inicio }];
    });
    const total = viradasPossiveis(itens.map((i) => ({ tipo: i.tipo, inicio: i.inicio })));
    const viradas: Virada[] = [];
    let executadas = 0;
    let bloqueou = false;
    for (let n = 1; n <= total; n++) {
        // Na virada n, cada item está no lote inicio + n − 1.
        let soma = 0;
        let pend = 0;
        const avancos: AvancoDoItem[] = [];
        for (const it of itens) {
            const idx = it.inicio + n - 1;
            const lote = it.tipo.lotes[idx];
            const ativo = it.tipo.ativo && !!lote;
            if (ativo) {
                soma += vendidos.get(lote.id) ?? 0;
                pend += pendentes.get(lote.id) ?? 0;
            }
            avancos.push({ ingressoId: it.tipo.id, nome: it.tipo.nome, grupo: it.grupo.nome, ativo, de: idx + 1, para: it.tipo.lotes[idx + 1] ? idx + 2 : undefined });
        }
        const gatilho = conjunto.gatilhos[n];
        const concluiu = !bloqueou && gatilho != null && soma >= gatilho;
        if (concluiu) executadas++;
        const status: StatusDaVirada = concluiu ? "concluida" : !bloqueou && gatilho != null ? "ativa" : "aguardando";
        // Virada sem gatilho, ou que ainda não chegou ao gatilho, segura as seguintes (ING-407).
        if (!concluiu) bloqueou = true;
        viradas.push({ numero: n, status, gatilho, vendidos: soma, pendentes: pend, itens: avancos });
    }
    const atual = viradas.find((v) => v.status !== "concluida") ?? null;
    const novasSemGatilho = viradas.some((v) => v.gatilho == null && v.numero > executadas + 1);
    return { conjunto, itens, viradas, executadas, atual, novasSemGatilho };
}
