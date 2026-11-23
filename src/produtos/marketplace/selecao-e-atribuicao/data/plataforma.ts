import { assinarBanco, contarUsosDasPasskeys, lerDoc, loteAVenda, organizacaoDoEvento, type Evento, type Lote, type Pedido, type TipoIngresso } from "@/plataforma";
import { lerEstadoComissarios, normalizarCodigo as normalizarCodigoDoComissario } from "@/plataforma/comissarios";
import type { DataEvento, Ingresso } from "./combos";
import { TAXA_PADRAO, TAXA_PRODUTO_PADRAO } from "./combos";
import { DEFAULT_CONFIG, type EventConfig } from "./config";

/* ------------------------------------------------------------------ */
/*  Adaptador: evento do banco unificado → config da seleção           */
/*                                                                     */
/*  Cada sessão vira uma "data" de venda avulsa; cada ingresso ativo   */
/*  entra com o lote à venda agora. A chave do carrinho fica           */
/*  `data:<sessaoId>:<ingressoId>`, o que deixa o pedido apontar de    */
/*  volta para o catálogo.                                             */
/* ------------------------------------------------------------------ */

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const p2 = (n: number) => String(n).padStart(2, "0");

/** Termo de uso padrão e ativo da organização, em texto corrido (TDU-40). */
function termoDoEvento(ev: Evento): string {
    const t = lerDoc("organizacoes", organizacaoDoEvento(ev))?.termosDeUso?.find((x) => x.padrao && x.ativo);
    if (!t) return "";
    return t.texto
        .replace(/<\/(p|li|h\d)>/gi, "\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .trim();
}

/* ---------------- Passkeys (CHA) ---------------- */

/** Passkey não distingue maiúsculas (CHA-11). */
const maiusculas = (c: string) => c.trim().toUpperCase();

/**
 * Confere um código digitado contra as Passkeys do evento. `null`: não é Passkey do evento.
 * Desativada ou sem usos sobrando: o motivo, para o comprador ler (SEL-07).
 */
export function conferirPasskey(ev: Evento, codigo: string): { ok: true; codigo: string } | { ok: false; motivo: string } | null {
    const k = (ev.passkeys ?? []).find((p) => maiusculas(p.codigo) === maiusculas(codigo));
    if (!k) return null;
    if (!k.ativa) return { ok: false, motivo: "Esta Passkey está desativada. Confira o código com quem enviou." };
    if (k.limite !== null && k.usos >= k.limite) return { ok: false, motivo: "Esta Passkey já foi usada o máximo de vezes permitido." };
    return { ok: true, codigo: k.codigo };
}

/** Só as Passkeys aplicadas que ainda valem (podem ter sido desativadas ou esgotadas depois). */
export const passkeysValidas = (ev: Evento, aplicadas: string[]) => aplicadas.filter((c) => conferirPasskey(ev, c)?.ok);

const liberaCom = (chaves: string[] | undefined, aplicadas: Set<string>) => !!chaves?.some((c) => aplicadas.has(maiusculas(c)));

/** Ingresso trancado: tem Passkey própria ou é só para quem tem Passkey (`vendas.publico`). */
const ingressoTrancado = (t: TipoIngresso) => !!t.chaves?.length || t.vendas?.publico === "chave";

function ingressoLiberado(t: TipoIngresso, aplicadas: Set<string>) {
    if (t.chaves?.length) return liberaCom(t.chaves, aplicadas);
    // "Só com Passkey" sem chave escolhida: qualquer Passkey válida do evento libera.
    if (t.vendas?.publico === "chave") return aplicadas.size > 0;
    return true;
}

/**
 * Lote à venda no link com as Passkeys aplicadas (SEL-07): ingresso trancado sem a chave não vende;
 * lote com Passkey só entra para quem tem a chave dele; os outros seguem a ordem normal (SEL-01).
 */
export function loteNoLink(ev: Evento, t: TipoIngresso, vendidos: Map<string, number>, aplicadas: string[]): Lote | undefined {
    const set = new Set(aplicadas.map(maiusculas));
    if (!ingressoLiberado(t, set)) return undefined;
    const lotes = t.lotes.filter((l) => !l.chaves?.length || liberaCom(l.chaves, set));
    return loteAVenda(ev, lotes.length === t.lotes.length ? t : { ...t, lotes }, vendidos);
}

/** Algum lote do ingresso aparece com as Passkeys aplicadas (vendendo ou esgotado). */
const temLoteVisivel = (t: TipoIngresso, set: Set<string>) => t.lotes.some((l) => !l.chaves?.length || liberaCom(l.chaves, set));

/** Passkeys que liberaram este ingresso e lote: vão no pedido e contam um uso quando ele é pago. */
export function passkeysDoItem(t: TipoIngresso, lote: Lote | undefined, aplicadas: string[]): string[] {
    const set = new Set(aplicadas.map(maiusculas));
    const doIngresso = (t.chaves ?? []).filter((c) => set.has(maiusculas(c)));
    const doLote = (lote?.chaves ?? []).filter((c) => set.has(maiusculas(c)));
    const publico = !t.chaves?.length && t.vendas?.publico === "chave" ? aplicadas : [];
    return [...new Set([...doIngresso, ...doLote, ...publico])];
}

/* ---------------- código de comissário (ECO) ---------------- */

/**
 * Código de comissário ou de vendedor de um grupo da equipe deste evento (o do grupo é do
 * responsável). Só lê os grupos (`lerEstadoComissarios`); a venda fica registrada no pedido.
 */
export function comissarioDoCodigo(eventoId: string, codigo: string): NonNullable<Pedido["comissario"]> | null {
    const c = normalizarCodigoDoComissario(codigo);
    if (!c) return null;
    for (const g of lerEstadoComissarios().grupos) {
        if (g.eventoId !== eventoId || !g.comissarioId || !g.ativo) continue;
        const nome = (email?: string) => (email ? (g.nomes?.[email] ?? email) : undefined);
        if (g.codigo === c) return { grupoId: g.id, comissarioId: g.comissarioId, codigo: c, vendedor: nome(g.responsavel) };
        const vendedor = Object.entries(g.codigosVendedores ?? {}).find(([, cod]) => cod === c);
        if (vendedor) return { grupoId: g.id, comissarioId: g.comissarioId, codigo: c, vendedor: nome(vendedor[0]) };
    }
    return null;
}

/* O checkout paga o pedido sem saber de Passkey: a cada mudança do banco, pedido pago com Passkey
   soma um uso (CHA, uma vez por pedido). Este módulo é carregado em todas as rotas. */
if (typeof window !== "undefined") {
    assinarBanco(() => setTimeout(() => void contarUsosDasPasskeys(), 0));
}

export function eventoParaConfig(ev: Evento, vendidos: Map<string, number>, passkeys: string[] = []): EventConfig {
    const aplicadas = new Set(passkeys.map(maiusculas));
    const ingressos: Ingresso[] = [];
    // Etiquetas da organização com vínculo neste evento: no grupo inteiro ou no lote à venda (ETQ-50).
    const etiquetas = lerDoc("organizacoes", organizacaoDoEvento(ev))?.etiquetas ?? [];
    const etiquetasDe = (grupoId: string, loteId?: string) =>
        etiquetas.filter((e) => e.vinculos.some((v) => v.eventoId === ev.id && ((v.tipo === "grupo" && v.id === grupoId) || (v.tipo === "lote" && v.id === loteId)))).map((e) => e.nome).slice(0, 3);
    const datas: DataEvento[] = [];
    const quantitativo: EventConfig["quantitativoPorGrupo"] = {};

    for (const s of ev.sessoes) {
        const d = new Date(s.inicio);
        const itens: string[] = [];
        for (const g of s.grupos) {
            const q = (quantitativo[g.nome] ??= { ofertados: 0, ofertadosMeia: 0 });
            for (const t of g.ingressos) {
                const total = t.lotes.reduce((a, l) => a + l.quantidade, 0);
                q.ofertados += total;
                if (t.beneficio === "meia-entrada") q.ofertadosMeia += total;
                if (!t.ativo) continue;
                // Trancado por Passkey: some até o comprador informar a chave (SEL-07, CHA).
                if (!ingressoLiberado(t, aplicadas) || !temLoteVisivel(t, aplicadas)) continue;
                // Conjunto de lotes sincronizados: o lote da vez do conjunto (LSI-31).
                const lote = loteNoLink(ev, t, vendidos, passkeys);
                const exclusivo = ingressoTrancado(t) || !!lote?.chaves?.length;
                ingressos.push({
                    id: t.id,
                    nome: t.nome.toUpperCase(),
                    grupo: g.nome.toUpperCase(),
                    lote: (lote ?? t.lotes[t.lotes.length - 1])?.nome.toUpperCase(),
                    descricao: t.descricao,
                    preco: (lote ?? t.lotes[t.lotes.length - 1])?.preco ?? 0,
                    beneficio: t.beneficio,
                    cotaEsgotada: !lote,
                    etiquetas: [...(exclusivo ? ["Liberado pela Passkey"] : []), ...etiquetasDe(g.id, lote?.id)].slice(0, 3),
                });
                itens.push(t.id);
            }
        }
        datas.push({
            id: s.id,
            iso: s.inicio.slice(0, 16),
            diaSemana: Number.isNaN(d.getTime()) ? "" : DIAS[d.getDay()],
            dia: Number.isNaN(d.getTime()) ? "" : p2(d.getDate()),
            mes: Number.isNaN(d.getTime()) ? "" : MESES[d.getMonth()],
            ano: Number.isNaN(d.getTime()) ? "" : String(d.getFullYear()),
            hora: Number.isNaN(d.getTime()) ? undefined : `${p2(d.getHours())}h${p2(d.getMinutes())}`,
            itens,
            produtos: [],
        });
    }

    return {
        ...DEFAULT_CONFIG,
        nome: ev.nome,
        capa: ev.capa ?? "",
        logo: "",
        mapa: "",
        selo: "",
        corDestaque: "",
        exibirVoltar: true,
        taxaServico: { ...TAXA_PADRAO, aliquota: ev.taxaServico },
        taxaProduto: TAXA_PRODUTO_PADRAO,
        quantitativoPorGrupo: Object.fromEntries(Object.entries(quantitativo).map(([k, v]) => [k.toUpperCase(), v])),
        percentualMeiaVendido: null,
        exibir: { ...DEFAULT_CONFIG.exibir, datas: true, combosFixos: false, combosDinamicos: false },
        ingressos,
        produtos: [],
        datas,
        combosFixos: [],
        combosDinamicos: [],
        perguntas: [],
        termos: termoDoEvento(ev),
        // Cupons do Backstage: aplicados pelo código no link de compra (CUP-50).
        cupons: (ev.cupons ?? []).map((c) => ({ codigo: c.codigo, ajuda: c.tipoDesconto === "percentual" ? `${c.valor}% de desconto nos itens participantes.` : `R$ ${c.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} de desconto em cada item participante.` })),
    };
}
