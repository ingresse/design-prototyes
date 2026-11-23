import type { AberturaDeVendas, ConjuntoSincronizado, Cupom, Evento, EventoStatus, Grupo, HistoricoVendas, IngressoEmitido, Lote, Pedido, Sessao, TipoIngresso } from "./modelo";

/* Regras de negócio puras, usadas por todos os produtos. Sem React, sem banco. */

export const agora = () => new Date().toISOString();

export const novoId = (prefixo: string) => `${prefixo}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;

export const slugificar = (texto: string) =>
    texto
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "evento";

/** Id da organização a partir do nome: `org_<slug>`, sem o "e" das listas ("A, B e C" = "A, B, C"). */
export const idDaOrganizacao = (nome: string) => `org_${slugificar(nome).replace(/-e-/g, "-")}`;

/** Sigla do avatar: iniciais das duas primeiras palavras. */
export const siglaDe = (nome: string) =>
    nome
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0])
        .join("")
        .toUpperCase() || "?";

/** Organização do evento: o campo gravado ou, em eventos antigos, a derivada do nome da produtora. */
export const organizacaoDoEvento = (e: { organizacaoId?: string; produtora: string }) => e.organizacaoId ?? idDaOrganizacao(e.produtora);

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Vender só é possível em evento publicado (vitrine + link) ou privado (só link). */
export const vendeNoLink = (s: EventoStatus) => s === "publicado" || s === "privado";
/** O site lista só eventos publicados. */
export const apareceNoSite = (s: EventoStatus) => s === "publicado";

/**
 * Vendidos por lote: ingressos emitidos que valem (cancelado devolve ao estoque) mais as vendas
 * anteriores ao gêmeo (coleção historico). Ids de lote são únicos no banco, então o mapa pode
 * juntar todos os eventos.
 */
export const vendidosPorLote = (ingressos: IngressoEmitido[], historicos: HistoricoVendas[] = []) => {
    const m = new Map<string, number>();
    for (const h of historicos) for (const [lote, qtd] of Object.entries(h.porLote)) m.set(lote, (m.get(lote) ?? 0) + qtd);
    for (const i of ingressos) if (i.status !== "cancelado") m.set(i.loteId, (m.get(i.loteId) ?? 0) + 1);
    return m;
};

/**
 * Quanto tempo uma compra pendente segura o ingresso. Configurado no back; 15 minutos é o padrão.
 * Passado o prazo sem pagamento, o ingresso volta para disponíveis.
 */
export const PRAZO_DA_COMPRA_PENDENTE_MIN = 15;

/**
 * Status de pedido que seguram estoque enquanto a compra não termina. "reservado" ainda não é
 * gerado pelo checkout do protótipo (LACUNA: confirmar o nome com o back).
 */
const STATUS_PENDENTES: readonly string[] = ["aguardando-pagamento", "reservado"];

/** Pendentes por lote: pedidos em pagamento ou reservados, dentro do prazo. Seguram o estoque. */
export const pendentesPorLote = (pedidos: Pedido[], agora = Date.now()) => {
    const m = new Map<string, number>();
    const limite = agora - PRAZO_DA_COMPRA_PENDENTE_MIN * 60_000;
    for (const p of pedidos) {
        if (!STATUS_PENDENTES.includes(p.status) || new Date(p.criadoEm).getTime() < limite) continue;
        for (const i of p.itens) if (i.tipo === "ingresso" && i.loteId) m.set(i.loteId, (m.get(i.loteId) ?? 0) + i.quantidade);
    }
    return m;
};

/** Soma dois mapas por lote (ex.: vendidos + pendentes = o que já saiu do estoque). */
export const somarPorLote = (a: Map<string, number>, b: Map<string, number>) => {
    const m = new Map(a);
    for (const [k, v] of b) m.set(k, (m.get(k) ?? 0) + v);
    return m;
};

/** Lote à venda agora: o primeiro, na ordem, que ainda tem saldo. */
/** Lote à venda: o primeiro, na ordem, com saldo, não pausado e antes da data limite. */
export const loteAtual = (tipo: TipoIngresso, vendidos: Map<string, number>): Lote | undefined =>
    tipo.lotes.find((l) => !l.pausado && (vendidos.get(l.id) ?? 0) < l.quantidade);

export const saldoDoLote = (l: Lote, vendidos: Map<string, number>) => Math.max(0, l.quantidade - (vendidos.get(l.id) ?? 0));

/** Itera todos os ingressos do catálogo com o contexto de sessão e grupo. */
export function* percorrerCatalogo(e: Evento): Generator<{ sessao: Sessao; grupo: Grupo; tipo: TipoIngresso }> {
    for (const sessao of e.sessoes) for (const grupo of sessao.grupos) for (const tipo of grupo.ingressos) yield { sessao, grupo, tipo };
}

/** Menor preço de face à venda (para o "a partir de" da vitrine). Null quando nada está à venda. */
export const precoMinimo = (e: Evento, vendidos: Map<string, number>): number | null => {
    let min: number | null = null;
    for (const { tipo } of percorrerCatalogo(e)) {
        if (!tipo.ativo) continue;
        const l = loteAtual(tipo, vendidos);
        if (l && (min === null || l.preco < min)) min = l.preco;
    }
    return min;
};

export const temIngressoAVenda = (e: Evento, vendidos: Map<string, number>) => precoMinimo(e, vendidos) !== null;

/** Primeira sessão por data: é a data "do evento" nas listagens. */
export const dataDoEvento = (sessoes: Sessao[], fallback: string) =>
    sessoes.map((s) => s.inicio).sort()[0] ?? fallback;

/** Código curto e legível para o QR do ingresso. */
export const codigoIngresso = () =>
    Array.from({ length: 3 }, () => Math.random().toString(36).slice(2, 6).toUpperCase()).join("-");

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** "Sáb, 03 out 2026 · 22h00". Recebe ISO local sem fuso. */
export const dataHoraCurta = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${DIAS[d.getDay()]}, ${String(d.getDate()).padStart(2, "0")} ${MESES[d.getMonth()]} ${d.getFullYear()} · ${hh}h${mm}`;
};

/** Itens da abertura; dados antigos (com configurações) viram uma lista só, sem repetidos. */
export const itensDaAbertura = (a: AberturaDeVendas) => {
    if (a.itens) return a.itens;
    const vistos = new Set<string>();
    return (a.configuracoes ?? []).flatMap((c) => c.itens).filter((i) => !vistos.has(`${i.tipo}:${i.id}`) && !!vistos.add(`${i.tipo}:${i.id}`));
};

/* ------------------------------------------------------------------ */
/*  Lotes sincronizados (LSI): o lote à venda de quem está num conjunto */
/* ------------------------------------------------------------------ */

/** Quantas viradas o conjunto já executou: a virada N roda quando as vendas dos lotes em curso chegam ao gatilho dela. */
export function viradasExecutadas(c: ConjuntoSincronizado, e: Evento, vendidos: Map<string, number>): number {
    const tipos = new Map<string, TipoIngresso>();
    for (const { tipo } of percorrerCatalogo(e)) tipos.set(tipo.id, tipo);
    const itens = c.itens.flatMap((i) => {
        const t = tipos.get(i.ingressoId);
        return t ? [{ t, inicio: Math.max(0, t.lotes.findIndex((l) => l.id === i.loteInicialId)) }] : [];
    });
    let n = 0;
    for (;;) {
        const gatilho = c.gatilhos[n + 1];
        if (gatilho == null) return n;
        let soma = 0;
        let algum = false;
        for (const { t, inicio } of itens) {
            const l = t.lotes[inicio + n];
            if (t.ativo && l) {
                algum = true;
                soma += vendidos.get(l.id) ?? 0;
            }
        }
        if (!algum || soma < gatilho) return n;
        n++;
    }
}

/**
 * Lote à venda agora. Fora de conjunto, o de sempre (`loteAtual`). Num conjunto de lotes sincronizados,
 * o lote inicial + as viradas executadas: o ingresso só muda de lote quando o conjunto vira, e esgota
 * se o lote da vez acabar antes (LSI-21).
 */
export function loteAVenda(e: Evento, tipo: TipoIngresso, vendidos: Map<string, number>): Lote | undefined {
    const c = e.conjuntosSincronizados?.find((x) => x.itens.some((i) => i.ingressoId === tipo.id));
    if (!c) return loteAtual(tipo, vendidos);
    const item = c.itens.find((i) => i.ingressoId === tipo.id)!;
    const inicio = Math.max(0, tipo.lotes.findIndex((l) => l.id === item.loteInicialId));
    const lote = tipo.lotes[inicio + viradasExecutadas(c, e, vendidos)];
    return lote && !lote.pausado && (vendidos.get(lote.id) ?? 0) < lote.quantidade ? lote : undefined;
}

/* ------------------------------------------------------------------ */
/*  Cupons (CUP): validade e desconto, as regras do checkout de produção */
/* ------------------------------------------------------------------ */

/** Por que o cupom não vale agora; `null` quando vale. `usosDoComprador`: pedidos pagos dele com o cupom. */
export function motivoDoCupomInvalido(c: Cupom, agora: Date, usosDoComprador: number): string | null {
    const t = agora.toISOString().slice(0, 16);
    if (!c.ativo) return "Este cupom não está ativo.";
    if (c.inicio && t < c.inicio) return "Este cupom ainda não está valendo.";
    if (c.fim && t > c.fim) return "Este cupom expirou.";
    if (c.limiteItens != null && c.usos >= c.limiteItens) return "Este cupom já foi totalmente utilizado.";
    if (c.limitePorComprador != null && usosDoComprador >= c.limitePorComprador) return "Você já usou este cupom o máximo de vezes.";
    if (!c.vinculos.length) return "Este cupom não vale para nenhum item.";
    return null;
}

/**
 * Desconto do cupom num carrinho (CART-049/051/052): só nos lotes e combos vinculados, nunca em item
 * gratuito; com "por itens da compra" = N, só nas N unidades mais caras; respeita o que ainda resta do
 * limite do evento. Percentual arredonda para baixo; valor fixo nunca deixa o item negativo.
 */
export function descontoDoCupom(c: Cupom, itens: { loteId?: string; comboId?: string; face: number; quantidade: number }[]): { desconto: number; itens: number } {
    const vale = new Set(c.vinculos.map((v) => `${v.tipo}:${v.id}`));
    let unidades = itens.flatMap((i) => {
        const chave = i.loteId ? `lote:${i.loteId}` : i.comboId ? `combo:${i.comboId}` : "";
        return chave && vale.has(chave) && i.face > 0 ? Array.from({ length: i.quantidade }, () => i.face) : [];
    });
    unidades.sort((a, b) => b - a);
    if (c.limiteItensPorCompra != null) unidades = unidades.slice(0, c.limiteItensPorCompra);
    if (c.limiteItens != null) unidades = unidades.slice(0, Math.max(0, c.limiteItens - c.usos));
    const desconto = unidades.reduce((n, face) => n + (c.tipoDesconto === "percentual" ? Math.floor(face * c.valor) / 100 : Math.min(face, c.valor)), 0);
    return { desconto: Math.round(desconto * 100) / 100, itens: unidades.length };
}
