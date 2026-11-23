import { useSyncExternalStore } from "react";
import { assinarBanco, lerBanco, lerColecao, lerDoc, salvar } from "./db";
import type { EquipeDoEvento, Evento, Organizacao, Pedido, ProdutoDaOrganizacao } from "./modelo";
import { organizacaoDoEvento } from "./regras";
import {
    atribuirCodigos,
    canaisLigados,
    canalNovo,
    CANAIS_GRUPO,
    comissarioDoGrupo,
    completarCodigos,
    cotaSemLimite,
    geraComissao,
    pessoasDoGrupo,
    vinculoDoGrupo,
    type CanalDoGrupo,
    type CanalGrupo,
    type GrupoEquipe,
    type VendasDeExemplo,
} from "./equipe";

/* ------------------------------------------------------------------ */
/*  Comissários (COM) e Equipe e Comissários (ECO): store único,       */
/*  compartilhado por Backstage e Freepass.                            */
/*                                                                     */
/*  O estado mora no banco da plataforma: os grupos, os repasses, as   */
/*  cortesias registradas pelo Freepass e as condições congeladas      */
/*  ficam em `Evento.equipe`; a marca de "já semeada" fica em          */
/*  `Organizacao.equipeSemeadaEm`. Nada mais em localStorage próprio.  */
/*                                                                     */
/*  As vendas e os pedidos dos grupos não são gravados: são lidos na   */
/*  hora (`derivar`) de três fontes, nesta ordem:                      */
/*  1. pedidos do evento no banco: `Pedido.comissario` (código usado   */
/*     no checkout), bilheteria (`bilheteria.emissor`) e cortesia      */
/*     (`envio.emissor`) de uma pessoa do grupo;                       */
/*  2. cortesias que o Freepass registrou (`registrarCortesias`);      */
/*  3. exemplos gerados do catálogo do evento, sempre iguais (semente: */
/*     evento + grupo, com teto), para as telas não nascerem vazias.   */
/*  O uso de cada canal e o "N emitidos" de cada pessoa saem desses    */
/*  pedidos: o que as telas somam é sempre a soma do que listam.       */
/*                                                                     */
/*  Dois níveis, como Produtos da organização: o comissário é a        */
/*  leitura de um grupo com o canal Comissário (`equipe.ts`). Não é    */
/*  sub-evento: o comprador compra o mesmo evento; muda a atribuição   */
/*  da venda e quanto o comissário ganha por ela.                      */
/* ------------------------------------------------------------------ */

/** Por onde o comissário vende ou emite. */
export type CanalComissario = "online" | "bilheteria" | "cortesia";

export const CANAIS: CanalComissario[] = ["online", "bilheteria", "cortesia"];

export const CANAL_LABEL: Record<CanalComissario, string> = {
    online: "Link de venda",
    bilheteria: "Bilheteria",
    cortesia: "Cortesia",
};

export const CANAL_DICA: Record<CanalComissario, string> = {
    online: "Vende pelo link e pelo cupom dele. O desconto vale aqui.",
    bilheteria: "Vende na bilheteria do Backstage, com a venda no nome dele.",
    cortesia: "Envia cortesias até a cota definida. Cortesia não gera comissão.",
};

/**
 * Como o comissário ganha: % do ingresso, valor fixo por ingresso ou valor a mais (quem compra paga
 * o preço do ingresso mais esse valor, e a diferença é do comissário). MKT-262.
 */
export type TipoComissao = "percentual" | "fixo" | "acrescimo";

/** Condições comerciais. Desconto em % para quem compra pelo link ou cupom (não vale com valor a mais). */
export interface Condicoes {
    tipo: TipoComissao;
    /** % sobre o preço (percentual) ou reais por ingresso (fixo e valor a mais). */
    comissao: number;
    /** `null`: sem desconto. */
    desconto: number | null;
}

/** Preço que quem compra pelo código paga, com o desconto ou o valor a mais do comissário. */
export const precoComCodigo = (preco: number, c: Pick<Condicoes, "tipo" | "comissao" | "desconto">) =>
    c.tipo === "acrescimo" ? preco + c.comissao : c.desconto ? Math.round(preco * (100 - c.desconto)) / 100 : preco;

/** Quanto o comissário ganha por ingresso desse preço. */
export const ganhoPorIngresso = (preco: number, c: Condicoes) =>
    c.tipo === "percentual" ? Math.round(precoComCodigo(preco, c) * c.comissao) / 100 : c.comissao;

/** Quem acessa "Suas vendas" pelo comissário. Responsável vê tudo do comissário; vendedor, só o que vendeu. */
export interface PessoaDoComissario {
    nome: string;
    email: string;
    papel: "responsavel" | "vendedor";
    /** Código de link e cupom da pessoa: o do grupo para o responsável, o próprio para o vendedor (único no evento). */
    codigo?: string;
}

export const PAPEL_LABEL: Record<PessoaDoComissario["papel"], string> = { responsavel: "Responsável", vendedor: "Vendedor" };

/**
 * O comissário. Desde 12/11/2026 não é mais um cadastro da organização: é a leitura de um grupo de
 * Equipe e Comissários com o canal Comissário (`comissarioDoGrupo`, em `equipe.ts`). O id é o do grupo.
 */
export interface Comissario {
    id: string;
    organizacaoId: string;
    nome: string;
    email: string;
    telefone?: string;
    /** Usado no link (/e/<slug>?c=<codigo>) e como cupom. Único no evento. */
    codigo: string;
    padrao: Condicoes;
    /** A primeira é a responsável. */
    pessoas: PessoaDoComissario[];
    ativo: boolean;
    criadoEm: string;
}

/**
 * O comissário dentro de um evento. Não é gravado: é a leitura do grupo da equipe que tem o
 * comissário (`vinculoDoGrupo`, em `equipe.ts`). Um comissário está em no máximo um grupo por evento.
 */
export interface ComissarioNoEvento {
    comissarioId: string;
    eventoId: string;
    /** Grupo da equipe de onde vem esta leitura. */
    grupoId: string;
    /** `null`: usa as condições do cadastro. */
    condicoes: Condicoes | null;
    canais: CanalComissario[];
    /** `null`: todos os ingressos do evento, incluindo os criados depois. */
    ingressos: string[] | null;
    /** Teto de cortesias. `null`: sem cota (só o estoque). */
    cotaCortesia: number | null;
    ativo: boolean;
    adicionadoEm: string;
}

/** De onde vem uma venda ou um pedido do grupo. */
export type OrigemDoPedido = "banco" | "freepass" | "exemplo";

/** Venda ou emissão atribuída a um comissário. */
export interface VendaAtribuida {
    id: string;
    comissarioId: string;
    eventoId: string;
    pedido: string;
    canal: CanalComissario;
    /** Canal do grupo por onde saiu (separa PDV de Bilheteria online). */
    canalGrupo?: CanalGrupo;
    comprador: string;
    /** Pessoa do comissário que fez a venda. */
    vendedor: string;
    /** Código usado na venda (o do grupo é do responsável; o do vendedor atribui a ele). */
    codigo?: string;
    ingresso: string;
    setor: string;
    /** Ingresso do catálogo do evento: soma no uso do canal quando está nele. */
    itemId?: string;
    quantidade: number;
    /** Valor pago por ingresso, já com o desconto ou o valor a mais do comissário. Cortesia: 0. */
    face: number;
    /** Desconto dado por ingresso. */
    desconto: number;
    /** Valor a mais cobrado por ingresso, que vai para o comissário. */
    acrescimo?: number;
    /** Condição da hora da venda (congelada: mudar a condição depois não muda o passado). */
    tipoAplicado: TipoComissao;
    comissaoAplicada: number;
    /** Cancelada estorna a comissão (MKT-262). */
    status: "confirmada" | "cancelada";
    data: string;
    origem?: OrigemDoPedido;
}

/** Pagamento da comissão feito pela organização. */
export interface Repasse {
    id: string;
    comissarioId: string;
    eventoId: string;
    valor: number;
    data: string;
    observacao?: string;
}

/**
 * Uma linha da lista de pedidos do grupo (ECO-74): um item de um pedido, em qualquer canal. Quando
 * a linha conta para o comissário, `venda` traz a venda atribuída (comissão, desconto, valor a mais).
 */
export interface PedidoDoGrupo {
    id: string;
    grupoId: string;
    eventoId: string;
    /** Número do pedido (uuid). */
    pedido: string;
    data: string;
    comprador: string;
    item: string;
    /** Setor, sessão ou tipo do item. */
    detalhe: string;
    itemId?: string;
    quantidade: number;
    canal: CanalGrupo;
    vendedor: string;
    /** E-mail de quem vendeu, quando é uma pessoa do grupo. */
    vendedorEmail?: string;
    /** Total pago. Cortesia: 0. */
    valor: number;
    status: "pago" | "cancelado";
    venda?: VendaAtribuida;
    origem: OrigemDoPedido;
}

/** O que as telas leem: tudo derivado do banco na hora. */
export interface Estado {
    /** Grupos da equipe de todos os eventos, com o uso dos canais e os emitidos lidos dos pedidos. */
    grupos: GrupoEquipe[];
    /** Vendas atribuídas aos comissários (as linhas de pedido que contam para eles). */
    vendas: VendaAtribuida[];
    repasses: Repasse[];
    /** Linhas de pedido de todos os grupos (ECO-74). */
    pedidos: PedidoDoGrupo[];
    /** Organizações que já receberam os exemplos. */
    semeadas: string[];
    /** Eventos que já receberam os grupos de exemplo da equipe. */
    eventosComExemplos: string[];
    comissarios: Comissario[];
    vinculos: ComissarioNoEvento[];
    /** O banco ainda não respondeu. */
    carregando: boolean;
}

/* ------------------------------------------------------------------ */
/*  Catálogo do evento (para os exemplos e os pedidos do banco)        */
/* ------------------------------------------------------------------ */

interface IngressoPlano {
    id: string;
    nome: string;
    setor: string;
    preco: number;
}

/** Todos os ingressos do evento, com o preço do primeiro lote. */
export function ingressosDoEvento(evento: Evento): IngressoPlano[] {
    const vistos = new Map<string, IngressoPlano>();
    for (const s of evento.sessoes ?? [])
        for (const g of s.grupos ?? [])
            for (const i of g.ingressos ?? []) if (!vistos.has(i.id)) vistos.set(i.id, { id: i.id, nome: i.nome, setor: g.nome, preco: i.lotes?.[0]?.preco ?? 0 });
    return [...vistos.values()];
}

/** Setores do evento com os ingressos de cada um (para a seleção em árvore). */
export function setoresDoEvento(evento: Evento): Array<{ id: string; nome: string; ingressos: IngressoPlano[] }> {
    const setores = new Map<string, { id: string; nome: string; ingressos: IngressoPlano[] }>();
    const vistos = new Set<string>();
    for (const s of evento.sessoes ?? [])
        for (const g of s.grupos ?? []) {
            const setor = setores.get(g.nome) ?? { id: g.id, nome: g.nome, ingressos: [] };
            for (const i of g.ingressos ?? []) {
                if (vistos.has(i.id)) continue;
                vistos.add(i.id);
                setor.ingressos.push({ id: i.id, nome: i.nome, setor: g.nome, preco: i.lotes?.[0]?.preco ?? 0 });
            }
            setores.set(g.nome, setor);
        }
    return [...setores.values()].filter((s) => s.ingressos.length > 0);
}

/**
 * Biblioteca de produtos de quem ainda não salvou a sua: o Backstage registra a inicial (que mora
 * nele) para os pedidos de exemplo com produto terem nome e preço. Sem registro, "Produto".
 */
let bibliotecaPadrao: ((organizacaoId: string) => ProdutoDaOrganizacao[]) | null = null;
let versaoBiblioteca = 0;
export function definirBibliotecaPadrao(fn: (organizacaoId: string) => ProdutoDaOrganizacao[]) {
    if (bibliotecaPadrao === fn) return;
    bibliotecaPadrao = fn;
    versaoBiblioteca++;
}

interface ItemDoEvento {
    id: string;
    tipo: "ingresso" | "produto" | "combo";
    nome: string;
    /** Setor (com a sessão quando há mais de uma), "Produto" ou "Combo". */
    detalhe: string;
    setor: string;
    preco: number;
}

const DATA_SESSAO = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" });

function catalogoDoEvento(ev: Evento, org: Organizacao | undefined) {
    const itens = new Map<string, ItemDoEvento>();
    const precoDoLote = new Map<string, number>();
    const variasSessoes = (ev.sessoes ?? []).length > 1;
    for (const s of ev.sessoes ?? []) {
        const rotulo = s.inicio ? DATA_SESSAO.format(new Date(s.inicio)).replace(",", " às") : "";
        for (const g of s.grupos ?? [])
            for (const t of g.ingressos ?? []) {
                for (const l of t.lotes ?? []) precoDoLote.set(l.id, l.preco);
                if (itens.has(t.id)) continue;
                itens.set(t.id, { id: t.id, tipo: "ingresso", nome: t.nome, setor: g.nome, detalhe: variasSessoes && rotulo ? `${g.nome}, ${rotulo}` : g.nome, preco: t.lotes?.[0]?.preco ?? 0 });
            }
    }
    const orgId = org?.id ?? organizacaoDoEvento(ev);
    const biblioteca = org?.produtos ?? (orgId && bibliotecaPadrao ? bibliotecaPadrao(orgId) : []);
    for (const p of ev.produtos ?? []) {
        if (p.ativo === false) continue;
        const b = biblioteca.find((x) => x.id === p.produtoId);
        itens.set(p.produtoId, { id: p.produtoId, tipo: "produto", nome: b?.nome ?? "Produto", setor: "", detalhe: "Produto", preco: p.preco ?? b?.precoBase ?? 0 });
    }
    for (const c of ev.combos ?? []) if (c.ativo !== false) itens.set(c.id, { id: c.id, tipo: "combo", nome: c.nome, setor: "", detalhe: "Combo", preco: c.preco });
    return { itens, precoDoLote };
}

/* ------------------------------------------------------------------ */
/*  Geradores determinísticos (exemplos)                               */
/* ------------------------------------------------------------------ */

/** Gerador determinístico: a mesma semente sempre gera igual. */
function sorteador(semente: string) {
    let h = 2166136261;
    for (let i = 0; i < semente.length; i++) h = Math.imul(h ^ semente.charCodeAt(i), 16777619);
    return () => {
        h = Math.imul(h ^ (h >>> 15), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        h ^= h >>> 16;
        return (h >>> 0) / 4294967296;
    };
}

/** Id de pedido no formato uuid (v4), sorteado de forma estável. */
function uuidDe(r: () => number) {
    const hex = (n: number) => Array.from({ length: n }, () => Math.floor(r() * 16).toString(16)).join("");
    return `${hex(8)}-${hex(4)}-4${hex(3)}-${"89ab"[Math.floor(r() * 4)]}${hex(3)}-${hex(12)}`;
}

const COMPRADORES = [
    "Ana Ribeiro", "Pedro Henrique", "Juliana Martins", "Lucas Ferreira", "Camila Rocha", "Gabriel Souza", "Larissa Melo", "Thiago Barros",
    "Beatriz Lima", "Matheus Araújo", "Fernanda Dias", "Rodrigo Teixeira", "Isabela Castro", "Felipe Moreira", "Carolina Pinto", "Diego Cardoso",
    "Bruno Carvalho", "Eduarda Lima", "Henrique Dias", "Natália Barros", "Otávio Freitas", "Paula Cardoso", "Sérgio Azevedo", "Yasmin Correia",
];

const DIA = 24 * 60 * 60 * 1000;
/** Teto de vendas de exemplo por grupo-comissário e de pedidos de exemplo por canal. */
export const MAX_VENDAS_DE_EXEMPLO = 40;
export const MAX_PEDIDOS_DE_EXEMPLO_POR_CANAL = 40;
/** Referência dos pedidos de exemplo dos grupos novos (fixa na sessão). */
const AGORA = Date.now();

const dataAntes = (base: number, r: () => number) => {
    const d = new Date(base - Math.floor(r() * 30) * DIA);
    d.setHours(9 + Math.floor(r() * 14), Math.floor(r() * 60), 0, 0);
    return d.toISOString();
};

const canalDaVenda = (c: CanalGrupo): CanalComissario => (c === "link" ? "online" : c === "cortesia" ? "cortesia" : "bilheteria");

/** Vendas de exemplo do grupo-comissário semeado: do catálogo do evento, com a condição congelada na semente. */
function vendasDeExemplo(ev: Evento, g: GrupoEquipe, ex: VendasDeExemplo, itens: Map<string, ItemDoEvento>): PedidoDoGrupo[] {
    if (!g.comissarioId) return [];
    const ingressos = [...itens.values()].filter((i) => i.tipo === "ingresso");
    const doLink = ingressos.filter((i) => !ex.ingressos || ex.ingressos.includes(i.id));
    const deCortesia = ingressos.filter((i) => ex.cortesias.includes(i.id));
    const opcoes = (c: CanalGrupo) => (c === "cortesia" ? deCortesia : c === "link" ? doLink : ingressos);
    const canais = ex.canais.filter((c) => opcoes(c).length > 0);
    if (canais.length === 0 || ex.vendedores.length === 0) return [];
    const r = sorteador(`${ev.id}:${g.id}`);
    const base = Date.parse(ex.desde) || AGORA;
    const cond = ex.condicoes;
    const linhas: PedidoDoGrupo[] = [];
    for (let n = 0; n < Math.min(MAX_VENDAS_DE_EXEMPLO, ex.quantidade); n++) {
        const canal = canais[Math.floor(r() * canais.length)];
        const lista = opcoes(canal);
        const ing = lista[Math.floor(r() * lista.length)];
        const cortesia = canal === "cortesia";
        // O valor a mais vale onde ele vende (link, cupom e bilheteria); o desconto, só no link e no cupom.
        const acrescimo = cond.tipo === "acrescimo" && !cortesia ? cond.comissao : 0;
        const desconto = canal === "link" && cond.tipo !== "acrescimo" && cond.desconto ? Math.round(ing.preco * cond.desconto) / 100 : 0;
        const pedido = uuidDe(r);
        const comprador = COMPRADORES[Math.floor(r() * COMPRADORES.length)];
        // Atribuída pelo código usado: o do grupo vai para o responsável; o de cada vendedor, para ele (ECO-28).
        const p = ex.vendedores[Math.floor(r() * ex.vendedores.length)];
        const quantidade = cortesia ? 1 : 1 + Math.floor(r() * 3);
        const face = cortesia ? 0 : ing.preco - desconto + acrescimo;
        const cancelada = !cortesia && r() < 0.06;
        const data = dataAntes(base, r);
        const id = `${g.id}-ex-${n}`;
        const venda: VendaAtribuida = {
            id,
            comissarioId: g.comissarioId,
            eventoId: ev.id,
            pedido,
            canal: canalDaVenda(canal),
            canalGrupo: canal,
            comprador,
            vendedor: p.nome,
            codigo: cortesia ? undefined : p.codigo,
            ingresso: ing.nome,
            setor: ing.setor,
            itemId: ing.id,
            quantidade,
            face,
            desconto: cortesia ? 0 : desconto,
            acrescimo: cortesia ? 0 : acrescimo,
            tipoAplicado: cortesia ? "fixo" : cond.tipo,
            comissaoAplicada: cortesia ? 0 : cond.comissao,
            status: cancelada ? "cancelada" : "confirmada",
            data,
            origem: "exemplo",
        };
        linhas.push(linhaDaVenda(g.id, venda, ing.detalhe, p.email));
    }
    return linhas;
}

/**
 * Pedidos de exemplo dos canais com uso de base gravado (grupos de exemplo, sem comissão): o uso de
 * cada item vira pedidos, sempre iguais (semente: evento + grupo + canal), com no máximo
 * `MAX_PEDIDOS_DE_EXEMPLO_POR_CANAL` linhas por canal. As quantidades somam o uso de base.
 */
function pedidosDoUsoDeBase(ev: Evento, g: GrupoEquipe, itens: Map<string, ItemDoEvento>): PedidoDoGrupo[] {
    const linhas: PedidoDoGrupo[] = [];
    const pessoas = g.operadores.length > 0 ? g.operadores : g.responsavel ? [g.responsavel] : [];
    if (pessoas.length === 0) return linhas;
    const criado = Date.parse(g.criadoEm) || AGORA;
    const janela = Math.min(30 * DIA, Math.max(DIA, AGORA - criado));
    for (const canal of CANAIS_GRUPO) {
        const cfg = g.canais[canal];
        if (!cfg) continue;
        const usos = Object.entries(cfg.uso).filter(([id, n]) => n > 0 && itens.has(id));
        if (usos.length === 0) continue;
        const r = sorteador(`${ev.id}:${g.id}:${canal}`);
        // Linhas por item: cerca de 2,5 unidades cada, reduzidas em proporção para caber no teto.
        let partes = usos.map(([, n]) => Math.max(1, Math.min(n, Math.round(n / (canal === "cortesia" ? 1.5 : 2.5)))));
        const soma = partes.reduce((a, b) => a + b, 0);
        if (soma > MAX_PEDIDOS_DE_EXEMPLO_POR_CANAL) partes = partes.map((k) => Math.max(1, Math.floor((k * MAX_PEDIDOS_DE_EXEMPLO_POR_CANAL) / soma)));
        usos.forEach(([id, n], i) => {
            const item = itens.get(id)!;
            const k = partes[i];
            // Reparte o uso do item em k pedidos de tamanhos variados (cada um com ao menos 1), somando n.
            const pesos = Array.from({ length: k }, () => 0.4 + r());
            const somaPesos = pesos.reduce((a, b) => a + b, 0);
            const qtds = pesos.map((p) => 1 + Math.floor(((n - k) * p) / somaPesos));
            for (let resto = n - qtds.reduce((a, b) => a + b, 0), j = 0; resto > 0; resto--, j = (j + 1) % k) qtds[j]++;
            for (let j = 0; j < k; j++) {
                const quantidade = qtds[j];
                const email = pessoas[Math.floor(r() * pessoas.length)];
                const d = new Date(criado + Math.floor(r() * janela));
                linhas.push({
                    id: `${g.id}-${canal}-${id}-${j}`,
                    grupoId: g.id,
                    eventoId: ev.id,
                    pedido: uuidDe(r),
                    data: d.toISOString(),
                    comprador: COMPRADORES[Math.floor(r() * COMPRADORES.length)],
                    item: item.nome,
                    detalhe: item.detalhe,
                    itemId: id,
                    quantidade,
                    canal,
                    vendedor: g.nomes?.[email] ?? email.split("@")[0],
                    vendedorEmail: email,
                    valor: canal === "cortesia" ? 0 : item.preco * quantidade,
                    status: canal !== "cortesia" && r() < 0.03 ? "cancelado" : "pago",
                    origem: "exemplo",
                });
            }
        });
    }
    return linhas;
}

/* ------------------------------------------------------------------ */
/*  Pedidos do banco: a qual grupo cada um pertence                    */
/* ------------------------------------------------------------------ */

const igual = (a: string | undefined, b: string | undefined) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/** E-mail da pessoa do grupo que é `quem` (e-mail ou nome conhecido), se for uma delas. */
function pessoaDoGrupo(g: GrupoEquipe, quem: string | undefined): string | undefined {
    if (!quem) return undefined;
    return g.operadores.find((e) => igual(e, quem) || igual(g.nomes?.[e], quem));
}

/** Quem vendeu pelo código: o vendedor dono do código, ou o responsável quando é o código do grupo. */
function pessoaDoCodigo(g: GrupoEquipe, codigo: string, vendedor?: string): string | undefined {
    const pelo = pessoaDoGrupo(g, vendedor);
    if (pelo) return pelo;
    const doVendedor = Object.entries(g.codigosVendedores ?? {}).find(([, c]) => igual(c, codigo))?.[0];
    if (doVendedor) return doVendedor;
    return igual(g.codigo, codigo) ? pessoasDoGrupo(g)[0]?.email : undefined;
}

interface Destino {
    grupo: GrupoEquipe;
    canal: CanalGrupo;
    email?: string;
}

/**
 * Grupo e canal de um pedido do evento: pelo código do comissário (`Pedido.comissario`); na
 * bilheteria, pela pessoa que emitiu; na cortesia, pela pessoa que enviou. Pessoa em mais de um
 * grupo: vale o grupo-comissário, depois a ordem da lista. Só grupos com o canal configurado.
 */
function destinoDoPedido(p: Pedido, grupos: GrupoEquipe[]): Destino | undefined {
    if (p.comissario) {
        const g = grupos.find((x) => x.id === p.comissario!.grupoId) ?? grupos.find((x) => !!x.comissarioId && x.comissarioId === p.comissario!.comissarioId);
        if (g) {
            const canal: CanalGrupo = p.canal === "bilheteria" ? (g.canais.bilheteria || !g.canais.pdv ? "bilheteria" : "pdv") : p.canal === "cortesia" ? "cortesia" : "link";
            return { grupo: g, canal, email: pessoaDoCodigo(g, p.comissario.codigo, p.comissario.vendedor) };
        }
    }
    const quem = p.canal === "bilheteria" ? p.bilheteria?.emissor : p.canal === "cortesia" ? p.envio?.emissor : undefined;
    const canal: CanalGrupo | undefined = p.canal === "bilheteria" ? "bilheteria" : p.canal === "cortesia" ? "cortesia" : undefined;
    if (!quem || !canal) return undefined;
    const candidatos = [...grupos.filter((g) => g.comissarioId), ...grupos.filter((g) => !g.comissarioId)].filter((g) => g.canais[canal]);
    for (const g of candidatos) {
        const email = pessoaDoGrupo(g, quem);
        if (email) return { grupo: g, canal, email };
    }
    return undefined;
}

/** A linha conta para o comissário? Link sempre; Cortesia sem comissão; PDV e Bilheteria quando geram (ECO-16). */
const contaParaComissario = (g: GrupoEquipe, canal: CanalGrupo) => !!g.comissarioId && (canal === "link" || canal === "cortesia" || geraComissao(g, canal, g.canais[canal]));

const SEM_CONDICAO: Condicoes = { tipo: "percentual", comissao: 0, desconto: null };
const centavos = (v: number) => Math.round(v * 100) / 100;

function linhaDaVenda(grupoId: string, v: VendaAtribuida, detalhe: string, vendedorEmail?: string): PedidoDoGrupo {
    const canal = v.canalGrupo ?? (v.canal === "online" ? "link" : v.canal === "cortesia" ? "cortesia" : "bilheteria");
    return {
        id: v.id,
        grupoId,
        eventoId: v.eventoId,
        pedido: v.pedido,
        data: v.data,
        comprador: v.comprador,
        item: v.ingresso,
        detalhe,
        itemId: v.itemId,
        quantidade: v.quantidade,
        canal,
        vendedor: v.vendedor,
        vendedorEmail,
        valor: canal === "cortesia" ? 0 : v.face * v.quantidade,
        status: v.status === "cancelada" ? "cancelado" : "pago",
        venda: v,
        origem: v.origem ?? "banco",
    };
}

/** Linhas de um pedido do banco no grupo: uma por item. Ingresso que conta para o comissário vira venda atribuída. */
function linhasDoPedido(ev: Evento, p: Pedido, d: Destino, cond: Condicoes, cat: ReturnType<typeof catalogoDoEvento>): PedidoDoGrupo[] {
    const { grupo: g, canal, email } = d;
    const cortesia = canal === "cortesia";
    const atribui = contaParaComissario(g, canal);
    const cancelado = p.status === "cancelado";
    const data = p.pagamento?.pagoEm ?? p.criadoEm;
    const vendedor = email ? (g.nomes?.[email] ?? email) : (p.comissario?.vendedor ?? p.bilheteria?.emissor ?? p.envio?.emissor ?? "");
    const comprador = p.comprador?.nome || p.comprador?.email || "";
    // Desconto do código lançado como cupom com o mesmo código: sai do valor pago por unidade.
    const cupomDoCodigo = p.cupom && p.comissario && igual(p.cupom.codigo, p.comissario.codigo) ? p.cupom.desconto / Math.max(1, p.cupom.itens) : 0;
    return p.itens.map((it, i) => {
        const item = it.ingressoId ? cat.itens.get(it.ingressoId) : undefined;
        const pago = cortesia ? 0 : Math.max(0, centavos(it.face - (it.tipo === "ingresso" ? cupomDoCodigo : 0)));
        const tabela = it.loteId ? (cat.precoDoLote.get(it.loteId) ?? it.face) : it.face;
        const linha: PedidoDoGrupo = {
            id: `${p.id}:${i}`,
            grupoId: g.id,
            eventoId: ev.id,
            pedido: p.id,
            data,
            comprador,
            item: item?.nome ?? it.nome,
            detalhe: item?.detalhe ?? it.detalhe ?? (it.tipo === "produto" ? "Produto" : ""),
            itemId: it.ingressoId,
            quantidade: it.quantidade,
            canal,
            vendedor,
            vendedorEmail: email,
            valor: pago * it.quantidade,
            status: cancelado ? "cancelado" : "pago",
            origem: "banco",
        };
        if (atribui && it.tipo === "ingresso" && g.comissarioId)
            linha.venda = {
                id: linha.id,
                comissarioId: g.comissarioId,
                eventoId: ev.id,
                pedido: p.id,
                canal: canalDaVenda(canal),
                canalGrupo: canal,
                comprador,
                vendedor,
                codigo: cortesia ? undefined : (p.comissario?.codigo ?? (email ? (g.codigosVendedores?.[email] ?? g.codigo) : g.codigo)),
                ingresso: linha.item,
                setor: item?.setor ?? it.detalhe ?? "",
                itemId: it.ingressoId,
                quantidade: it.quantidade,
                face: pago,
                // Desconto e valor a mais: a diferença entre o preço do lote e o que o pedido gravou como pago.
                desconto: !cortesia && cond.tipo !== "acrescimo" ? Math.max(0, centavos(tabela - pago)) : 0,
                acrescimo: !cortesia && cond.tipo === "acrescimo" ? Math.max(0, centavos(pago - tabela)) : 0,
                tipoAplicado: cortesia ? "fixo" : cond.tipo,
                comissaoAplicada: cortesia ? 0 : cond.comissao,
                status: cancelado ? "cancelada" : "confirmada",
                data,
                origem: "banco",
            };
        return linha;
    });
}

/* ------------------------------------------------------------------ */
/*  Leitura: tudo derivado do banco                                    */
/* ------------------------------------------------------------------ */

/** Uso de cada canal e emitidos de cada pessoa, lidos das linhas do grupo (só as pagas). */
function comUsoDosPedidos(g: GrupoEquipe, linhas: PedidoDoGrupo[]): GrupoEquipe {
    const canais: GrupoEquipe["canais"] = {};
    for (const c of CANAIS_GRUPO) {
        const cfg = g.canais[c];
        if (!cfg) continue;
        const uso: Record<string, number> = {};
        for (const l of linhas) {
            if (l.canal !== c || l.status !== "pago" || !l.itemId) continue;
            // Só itens do canal contam na cota (no link com "Todos os ingressos", qualquer ingresso).
            if (!(cfg.itens.includes(l.itemId) || (c === "link" && cfg.todos))) continue;
            uso[l.itemId] = (uso[l.itemId] ?? 0) + l.quantidade;
        }
        canais[c] = { ...cfg, uso };
    }
    const emitidosPorOperador: Record<string, number> = {};
    for (const l of linhas) if (l.status === "pago" && l.vendedorEmail) emitidosPorOperador[l.vendedorEmail] = (emitidosPorOperador[l.vendedorEmail] ?? 0) + l.quantidade;
    return { ...g, canais, emitidosPorOperador };
}

interface Cache {
    eventos: unknown;
    pedidos: unknown;
    organizacoes: unknown;
    modo: string;
    biblioteca: number;
    estado: Estado;
    /** Condições a congelar: evento → pedido → condição de agora. */
    faltaCongelar: Record<string, Record<string, Condicoes>>;
}
let cache: Cache | null = null;

function derivar(): Cache {
    const { modo, tabelas } = lerBanco();
    if (cache && cache.eventos === tabelas.eventos && cache.pedidos === tabelas.pedidos && cache.organizacoes === tabelas.organizacoes && cache.modo === modo && cache.biblioteca === versaoBiblioteca)
        return cache;
    const grupos: GrupoEquipe[] = [];
    const pedidos: PedidoDoGrupo[] = [];
    const repasses: Repasse[] = [];
    const eventosComExemplos: string[] = [];
    const faltaCongelar: Cache["faltaCongelar"] = {};
    const comEquipe = Object.values(tabelas.eventos).filter((e) => e.equipe && e.equipe.grupos.length + e.equipe.repasses.length > 0);
    const pedidosPorEvento = new Map<string, Pedido[]>();
    if (comEquipe.length > 0)
        for (const p of Object.values(tabelas.pedidos)) {
            if (p.status === "aguardando-pagamento") continue;
            pedidosPorEvento.set(p.eventoId, [...(pedidosPorEvento.get(p.eventoId) ?? []), p]);
        }
    for (const ev of comEquipe) {
        const eq = ev.equipe!;
        if (eq.exemplos) eventosComExemplos.push(ev.id);
        repasses.push(...eq.repasses);
        const org = tabelas.organizacoes[organizacaoDoEvento(ev)] as Organizacao | undefined;
        const cat = catalogoDoEvento(ev, org);
        const linhas: PedidoDoGrupo[] = [];
        // 1. Pedidos do banco.
        const enviosNoBanco = new Set<string>();
        for (const p of pedidosPorEvento.get(ev.id) ?? []) {
            const d = destinoDoPedido(p, eq.grupos);
            if (!d) continue;
            if (p.envio) enviosNoBanco.add(`${d.grupo.id}:${p.envio.id}`);
            const congelada = eq.condicoes?.[p.id];
            if (!congelada && d.grupo.condicoes && contaParaComissario(d.grupo, d.canal)) (faltaCongelar[ev.id] ??= {})[p.id] = d.grupo.condicoes;
            linhas.push(...linhasDoPedido(ev, p, d, congelada ?? d.grupo.condicoes ?? SEM_CONDICAO, cat));
        }
        // 2. Cortesias registradas pelo Freepass (as que já viraram pedido do grupo no banco ficam de fora).
        for (const v of eq.cortesias ?? []) {
            const g = eq.grupos.find((x) => x.comissarioId === v.comissarioId);
            if (!g || enviosNoBanco.has(`${g.id}:${v.pedido}`)) continue;
            const email = pessoasDoGrupo(g).find((x) => x.nome === v.vendedor)?.email;
            linhas.push(linhaDaVenda(g.id, { ...v, canalGrupo: "cortesia", origem: "freepass" }, v.setor, email));
        }
        // 3. Exemplos do catálogo do evento.
        for (const g of eq.grupos) {
            if (g.vendasDeExemplo) linhas.push(...vendasDeExemplo(ev, g, g.vendasDeExemplo, cat.itens));
            linhas.push(...pedidosDoUsoDeBase(ev, g, cat.itens));
        }
        pedidos.push(...linhas);
        for (const g of eq.grupos) grupos.push(comUsoDosPedidos(g, linhas.filter((l) => l.grupoId === g.id)));
    }
    pedidos.sort((a, b) => b.data.localeCompare(a.data));
    const vendas = pedidos.flatMap((p) => (p.venda ? [p.venda] : []));
    const comissarios = grupos.filter((g): g is GrupoEquipe & { comissarioId: string } => !!g.comissarioId);
    const estado: Estado = {
        grupos,
        vendas,
        repasses,
        pedidos,
        semeadas: Object.values(tabelas.organizacoes)
            .filter((o) => o.equipeSemeadaEm)
            .map((o) => o.id),
        eventosComExemplos,
        comissarios: comissarios.map(comissarioDoGrupo),
        vinculos: comissarios.map(vinculoDoGrupo),
        carregando: modo === "carregando",
    };
    cache = { eventos: tabelas.eventos, pedidos: tabelas.pedidos, organizacoes: tabelas.organizacoes, modo, biblioteca: versaoBiblioteca, estado, faltaCongelar };
    return cache;
}

/** Leitura fora do React (ações e validações). */
export const lerEstadoComissarios = (): Estado => derivar().estado;

export function useEstadoComissarios(): Estado {
    return useSyncExternalStore(assinarBanco, lerEstadoComissarios, lerEstadoComissarios);
}

/* ------------------------------------------------------------------ */
/*  Gravação no banco                                                  */
/* ------------------------------------------------------------------ */

const equipeVazia = (): EquipeDoEvento => ({ grupos: [], repasses: [] });

/**
 * O uso gravado é só a base dos exemplos e os emitidos são lidos dos pedidos: o que a tela manda
 * de volta (com o uso derivado) não sobrescreve a base. Canal novo nasce sem base.
 */
function manterBase(antes: GrupoEquipe[], depois: GrupoEquipe[]): GrupoEquipe[] {
    const porId = new Map(antes.map((g) => [g.id, g]));
    return depois.map((g) => {
        const a = porId.get(g.id);
        if (!a) return g;
        const canais: GrupoEquipe["canais"] = {};
        for (const c of CANAIS_GRUPO) {
            const cfg = g.canais[c];
            if (cfg) canais[c] = { ...cfg, uso: a.canais[c]?.uso ?? {} };
        }
        return { ...g, canais, emitidosPorOperador: a.emitidosPorOperador };
    });
}

/** Muda a equipe de um evento e grava o evento. Todo vendedor de grupo-comissário ganha código (ECO-27). */
function gravarEquipe(eventoId: string, fn: (eq: EquipeDoEvento) => EquipeDoEvento) {
    const ev = lerDoc("eventos", eventoId);
    if (!ev) return;
    const antes = ev.equipe ?? equipeVazia();
    const depois = fn(antes);
    void salvar("eventos", { ...ev, equipe: { ...depois, grupos: manterBase(antes.grupos, completarCodigos(depois.grupos)) } });
}

/** Evento de um grupo (os ids dos grupos são únicos entre eventos). */
const eventoDoGrupo = (grupoId: string) => lerColecao("eventos").find((e) => e.equipe?.grupos.some((g) => g.id === grupoId))?.id;

/* ---------------- condições congeladas ---------------- */

let congelando = false;
/** Grava a condição da hora da venda dos pedidos do banco que ainda não têm (uma vez por pedido). */
function agendarCongelamento() {
    if (congelando) return;
    const { faltaCongelar } = derivar();
    if (Object.keys(faltaCongelar).length === 0) return;
    congelando = true;
    setTimeout(() => {
        congelando = false;
        for (const [eventoId, mapa] of Object.entries(derivar().faltaCongelar))
            gravarEquipe(eventoId, (eq) => ({ ...eq, condicoes: { ...mapa, ...(eq.condicoes ?? {}) } }));
    }, 0);
}

/* ---------------- migração do localStorage antigo ---------------- */

/** Até 21/11/2026 o store vivia na chave `backstage-comissarios-v12` deste navegador. */
const CHAVE_ANTIGA = "backstage-comissarios-v12";
const CHAVES_MAIS_ANTIGAS = ["backstage-comissarios-v9", "backstage-comissarios-v10", "backstage-comissarios-v11"];

interface EstadoAntigo {
    grupos: GrupoEquipe[];
    vendas: VendaAtribuida[];
    repasses: Repasse[];
    semeadas: string[];
    eventosComExemplos: string[];
}

/**
 * Desde 21/11/2026 os membros de exemplo usam o domínio de cada organização (MEM-45). Os grupos de
 * exemplo semeados antes guardaram os e-mails no domínio antigo: troca na migração, pela organização do grupo.
 */
const DOMINIO_ANTIGO = "@casamarceneiro.com.br";
function comDominioDaOrganizacao(e: EstadoAntigo): EstadoAntigo {
    if (!JSON.stringify(e).includes(DOMINIO_ANTIGO)) return e;
    const dominio = (g: GrupoEquipe) => `@${g.organizacaoId.replace(/^org_/, "")}.com.br`;
    const comOrg = e.grupos.filter((g) => g.organizacaoId);
    const dominioDo = new Map([...comOrg.map((g) => [g.id, dominio(g)] as const), ...comOrg.filter((g) => g.comissarioId).map((g) => [g.comissarioId!, dominio(g)] as const)]);
    const trocar = <T,>(obj: T, d?: string): T => (d ? JSON.parse(JSON.stringify(obj).split(DOMINIO_ANTIGO).join(d)) : obj);
    return { ...e, grupos: e.grupos.map((g) => trocar(g, dominioDo.get(g.id))), vendas: e.vendas.map((v) => trocar(v, dominioDo.get(v.comissarioId))) };
}

/** Parâmetros das vendas de exemplo a partir do grupo como está (semente e migração). */
function exemploDoGrupo(g: GrupoEquipe, quantidade: number, desde: string): VendasDeExemplo {
    const ligados = canaisLigados({ ...g, ativo: true });
    const link = g.canais.link;
    return {
        quantidade: Math.min(MAX_VENDAS_DE_EXEMPLO, quantidade),
        condicoes: g.condicoes ?? SEM_CONDICAO,
        canais: ligados.filter((c) => c === "link" || c === "cortesia" || geraComissao(g, c, g.canais[c])),
        ingressos: link && !link.todos ? link.itens : null,
        cortesias: g.canais.cortesia?.itens ?? [],
        vendedores: pessoasDoGrupo(g).map((p) => ({ email: p.email, nome: p.nome, codigo: p.codigo })),
        desde,
    };
}

/** Uso zerado em todos os canais (as vendas do grupo-comissário semeado vêm dos exemplos). */
const semUso = (g: GrupoEquipe): GrupoEquipe => ({
    ...g,
    canais: Object.fromEntries(Object.entries(g.canais).map(([c, cfg]) => [c, cfg ? { ...cfg, uso: {} } : cfg])) as GrupoEquipe["canais"],
});

let migrado = false;
/**
 * Leva uma vez o que este navegador tinha na chave antiga para o banco: grupos, repasses, cortesias
 * do Freepass e as marcas de semente. As vendas antigas eram geradas: viram parâmetros de exemplo
 * (mesma quantidade), e os pedidos passam a ser lidos do banco. Evento que já tem equipe no banco
 * não é sobrescrito. Depois, apaga a chave.
 */
function migrar() {
    if (migrado || typeof window === "undefined" || lerBanco().modo === "carregando") return;
    migrado = true;
    let salvo: Partial<EstadoAntigo> | null = null;
    try {
        CHAVES_MAIS_ANTIGAS.forEach((k) => window.localStorage.removeItem(k));
        salvo = JSON.parse(window.localStorage.getItem(CHAVE_ANTIGA) ?? "null");
    } catch {
        salvo = null;
    }
    if (!salvo || !Array.isArray(salvo.grupos)) return;
    const antigo = comDominioDaOrganizacao({ grupos: [], vendas: [], repasses: [], semeadas: [], eventosComExemplos: [], ...salvo } as EstadoAntigo);
    const porEvento = new Map<string, GrupoEquipe[]>();
    for (const g of antigo.grupos) porEvento.set(g.eventoId, [...(porEvento.get(g.eventoId) ?? []), g]);
    for (const [eventoId, grupos] of porEvento) {
        const ev = lerDoc("eventos", eventoId);
        if (!ev || ev.equipe) continue;
        const vendas = antigo.vendas.filter((v) => v.eventoId === eventoId);
        const equipe: EquipeDoEvento = {
            grupos: completarCodigos(
                grupos.map((g) => {
                    // Grupo-comissário semeado: as vendas geradas viram exemplo; o uso passa a vir delas.
                    if (!g.comissarioId || !/-grp-com-\d+$/.test(g.id)) return g;
                    const quantas = vendas.filter((v) => v.comissarioId === g.comissarioId && !v.id.startsWith("ven-cor-")).length;
                    const com = semUso(g);
                    return quantas > 0 ? { ...com, vendasDeExemplo: exemploDoGrupo(g, quantas, g.criadoEm) } : com;
                }),
            ),
            repasses: antigo.repasses.filter((r) => r.eventoId === eventoId),
            cortesias: vendas.filter((v) => v.id.startsWith("ven-cor-")),
            ...(antigo.eventosComExemplos.includes(eventoId) ? { exemplos: true } : {}),
        };
        void salvar("eventos", { ...ev, equipe });
    }
    const agora = new Date().toISOString();
    for (const orgId of antigo.semeadas) {
        const org = lerDoc("organizacoes", orgId);
        if (org && !org.equipeSemeadaEm) void salvar("organizacoes", { ...org, equipeSemeadaEm: agora });
    }
    try {
        window.localStorage.removeItem(CHAVE_ANTIGA);
    } catch {
        /* storage indisponível */
    }
}

if (typeof window !== "undefined")
    assinarBanco(() => {
        if (lerBanco().modo === "carregando") return;
        migrar();
        agendarCongelamento();
    });

/** Recomeça o protótipo: tira a equipe de todos os eventos e as marcas de semente das organizações. */
export function reiniciarComissarios() {
    for (const ev of lerColecao("eventos")) if (ev.equipe) void salvar("eventos", { ...ev, equipe: undefined });
    for (const org of lerColecao("organizacoes")) if (org.equipeSemeadaEm) void salvar("organizacoes", { ...org, equipeSemeadaEm: undefined });
}

/* ------------------------------------------------------------------ */
/*  Semente: exemplos por organização                                  */
/* ------------------------------------------------------------------ */

const EXEMPLOS: Array<Pick<Comissario, "nome" | "email" | "codigo" | "telefone"> & { padrao: Condicoes; ativo?: boolean; vendedores?: string[] }> = [
    { nome: "Vitor Almeida", email: "vitor.almeida@email.com", codigo: "VITOR", telefone: "(11) 98765-4321", padrao: { tipo: "percentual", comissao: 3, desconto: 10 } },
    { nome: "Atlética de Engenharia", email: "contato@atleticaeng.com.br", codigo: "ENGENHARIA", padrao: { tipo: "fixo", comissao: 5, desconto: null }, vendedores: ["Caio Prado", "Letícia Ramos", "João Vitor Sá"] },
    { nome: "Bruna Costa", email: "bruna.costa@email.com", codigo: "BRUNA", telefone: "(21) 99876-1234", padrao: { tipo: "percentual", comissao: 4, desconto: 5 } },
    { nome: "Coletivo Noite Sul", email: "producao@noitesul.com", codigo: "NOITESUL", padrao: { tipo: "percentual", comissao: 6, desconto: 10 }, vendedores: ["Duda Freitas"] },
    { nome: "Atlética de Direito", email: "diretoria@atleticadireito.org", codigo: "DIREITO", padrao: { tipo: "acrescimo", comissao: 20, desconto: null }, vendedores: ["Helena Vaz", "Otávio Brandão"] },
    { nome: "Rafael Nunes", email: "rafa.nunes@email.com", codigo: "RAFA", padrao: { tipo: "percentual", comissao: 3, desconto: null } },
    { nome: "Marina Lopes", email: "marina.lopes@email.com", codigo: "MARINA", padrao: { tipo: "percentual", comissao: 3, desconto: 5 }, ativo: false },
];

/** Parte final do id do modelo ("org-com-3" -> "com-3"), para o id do grupo-comissário. */
const i0 = (id: string) => id.slice(id.lastIndexOf("com-"));

/**
 * Semeia uma organização na primeira vez que ela abre a feature (Backstage ou Freepass): grupos-
 * comissário de exemplo em até 3 eventos, com repasses. As vendas não são gravadas: o grupo guarda
 * os parâmetros (`vendasDeExemplo`) e a leitura as gera do catálogo do evento (COM-107, ECO-86).
 */
export function semear(organizacaoId: string, eventos: Evento[]) {
    if (!organizacaoId || lerBanco().modo === "carregando") return;
    migrar();
    const org = lerDoc("organizacoes", organizacaoId);
    if (!org || org.equipeSemeadaEm) return;
    const agora = new Date().toISOString();
    // Marca antes de gravar os eventos: outra chamada no mesmo ciclo não semeia de novo.
    void salvar("organizacoes", { ...org, equipeSemeadaEm: agora });
    const r = sorteador(organizacaoId);
    // O Vitor (persona do Freepass) vende para poucas organizações; nas outras, o primeiro exemplo é outra pessoa.
    const comVitor = organizacaoId === "org_anitta" || sorteador(`vitor-${organizacaoId}`)() < 0.1;
    const exemplos = comVitor ? EXEMPLOS : [{ ...EXEMPLOS[0], nome: "Lucas Mendes", email: "lucas.mendes@email.com", codigo: "LUCAS" }, ...EXEMPLOS.slice(1)];
    const comissarios: Comissario[] = exemplos.map((e, i) => ({
        id: `${organizacaoId}-com-${i + 1}`,
        organizacaoId,
        nome: e.nome,
        email: e.email,
        telefone: e.telefone,
        codigo: e.codigo,
        padrao: e.padrao,
        pessoas: [
            { nome: e.vendedores ? `Presidência ${e.nome.replace(/^Atlética de /, "")}` : e.nome, email: e.email, papel: "responsavel" },
            ...(e.vendedores ?? []).map((n) => ({ nome: n, email: `${normalizarCodigo(n.split(" ")[0]).toLowerCase()}@${e.email.split("@")[1]}`, papel: "vendedor" as const })),
        ],
        ativo: e.ativo ?? true,
        criadoEm: agora,
    }));
    // Lê cada evento do banco: quem chama pode ter só o espelho, sem o catálogo.
    const doBanco = eventos.map((e) => lerDoc("eventos", e.id) ?? e);
    // Até 3 eventos recebem comissários, primeiro os que estão vendendo; o resto fica sem, para mostrar o vazio.
    const vendendo = doBanco.filter((e) => e.status !== "encerrado" && e.status !== "rascunho").sort((a, b) => b.data.localeCompare(a.data));
    const outros = doBanco.filter((e) => !vendendo.includes(e)).sort((a, b) => b.data.localeCompare(a.data));
    [...vendendo, ...outros].slice(0, 3).forEach((evento, ei) => {
        const quantos = ei === 0 ? 6 : 3;
        // Códigos em uso neste evento: os dos grupos primeiro; os dos vendedores entram ao atribuir.
        const usados = new Set(comissarios.slice(0, quantos).map((c) => c.codigo));
        const ingressos = ingressosDoEvento(evento).map((i) => i.id);
        const cat = catalogoDoEvento(evento, org);
        const grupos: GrupoEquipe[] = [];
        const repasses: Repasse[] = [];
        comissarios.slice(0, quantos).forEach((c, ci) => {
            const personalizado = ci === 0 && ei === 0;
            // No Freepass há quem só emite: nos outros eventos, o primeiro exemplo (o Vitor) só tem
            // bilheteria e cortesia, ou só cortesia, sem link de venda e sem comissão.
            const soEmite = ci === 0 && ei > 0;
            const antigos: CanalComissario[] = soEmite
                ? ei === 1
                    ? ["bilheteria", "cortesia"]
                    : ["cortesia"]
                : ci % 3 === 0
                  ? ["online", "bilheteria", "cortesia"]
                  : ci % 3 === 1
                    ? ["online", "cortesia"]
                    : ["online"];
            const canais: Partial<Record<CanalGrupo, CanalDoGrupo>> = {};
            // O canal Comissário sempre existe no grupo-comissário; quem só emite tem o canal desligado (sem link).
            canais.link = { ...canalNovo("link"), todos: true, ligado: antigos.includes("online") };
            if (antigos.includes("bilheteria")) canais.bilheteria = { ...canalNovo("bilheteria"), itens: ingressos, comissao: !soEmite };
            if (antigos.includes("cortesia"))
                canais.cortesia = { ...canalNovo("cortesia"), itens: ingressos.slice(0, 3), cota: ci % 3 === 2 ? cotaSemLimite() : { tipo: "compartilhada", total: 20, porItem: {} } };
            const id = `${evento.id}-grp-${i0(c.id)}`;
            const grupo: GrupoEquipe = {
                id,
                eventoId: evento.id,
                organizacaoId,
                nome: c.nome,
                ativo: c.ativo,
                criadoEm: agora,
                gruposMembrosIds: [],
                emailsAvulsos: c.pessoas.map((p) => p.email),
                operadores: c.pessoas.map((p) => p.email),
                operadoresInativos: [],
                gruposInativos: [],
                emitidosPorOperador: {},
                comissarioId: id,
                // O Vitor tem outra comissão no evento principal.
                condicoes: personalizado ? { tipo: "percentual", comissao: 5, desconto: c.padrao.desconto } : c.padrao,
                codigo: c.codigo,
                responsavel: c.email,
                nomes: Object.fromEntries(c.pessoas.map((p) => [p.email, p.nome])),
                canais,
            };
            Object.assign(grupo, atribuirCodigos(grupo, usados));
            if (c.ativo && !soEmite) grupo.vendasDeExemplo = exemploDoGrupo(grupo, 6 + Math.floor(r() * 28), agora);
            grupos.push(grupo);
            const comissao = grupo.vendasDeExemplo ? vendasDeExemplo(evento, grupo, grupo.vendasDeExemplo, cat.itens).reduce((s, l) => s + (l.venda ? comissaoDaVenda(l.venda) : 0), 0) : 0;
            if (comissao > 0 && ci % 2 === 0) repasses.push({ id: `${id}-rep`, comissarioId: id, eventoId: evento.id, valor: Math.round(comissao * 0.5 * 100) / 100, data: agora, observacao: "Pix" });
        });
        gravarEquipe(evento.id, (eq) => {
            const ja = new Set(eq.grupos.map((g) => g.id));
            const jaRep = new Set(eq.repasses.map((x) => x.id));
            return { ...eq, grupos: [...eq.grupos, ...grupos.filter((g) => !ja.has(g.id))], repasses: [...eq.repasses, ...repasses.filter((x) => !jaRep.has(x.id))] };
        });
    });
}

/* ------------------------------------------------------------------ */
/*  Cálculos                                                           */
/* ------------------------------------------------------------------ */

/** Comissão bruta de uma venda, antes do estorno: % sobre o valor pago, ou reais por ingresso (fixo e valor a mais). Cortesia não gera. */
export const comissaoBruta = (v: VendaAtribuida) => {
    if (v.canal === "cortesia") return 0;
    return v.tipoAplicado === "percentual" ? Math.round(v.face * v.quantidade * v.comissaoAplicada) / 100 : v.comissaoAplicada * v.quantidade;
};

/** Comissão que conta: só pedido confirmado. Cancelado estorna (MKT-262). */
export const comissaoDaVenda = (v: VendaAtribuida) => (v.status === "cancelada" ? 0 : comissaoBruta(v));

export interface Totais {
    vendidos: number;
    cortesias: number;
    receita: number;
    comissao: number;
    repassado: number;
    aRepassar: number;
    /** Ingressos de pedidos cancelados e a comissão estornada por eles. */
    cancelados: number;
    estornado: number;
    porCanal: Record<CanalComissario, { quantidade: number; receita: number }>;
}

const porCanalVazio = (): Totais["porCanal"] => ({ online: { quantidade: 0, receita: 0 }, bilheteria: { quantidade: 0, receita: 0 }, cortesia: { quantidade: 0, receita: 0 } });

/** Totais das vendas atribuídas (o que conta para o comissário: Freepass). */
export function totais(vendas: VendaAtribuida[], repasses: Repasse[]): Totais {
    const porCanal = porCanalVazio();
    let vendidos = 0;
    let cortesias = 0;
    let receita = 0;
    let comissao = 0;
    let cancelados = 0;
    let estornado = 0;
    for (const v of vendas) {
        if (v.status === "cancelada") {
            cancelados += v.quantidade;
            estornado += comissaoBruta(v);
            continue;
        }
        porCanal[v.canal].quantidade += v.quantidade;
        porCanal[v.canal].receita += v.face * v.quantidade;
        if (v.canal === "cortesia") cortesias += v.quantidade;
        else vendidos += v.quantidade;
        receita += v.face * v.quantidade;
        comissao += comissaoDaVenda(v);
    }
    const repassado = repasses.reduce((s, r) => s + r.valor, 0);
    return { vendidos, cortesias, receita, comissao, repassado, aRepassar: Math.max(0, comissao - repassado), cancelados, estornado, porCanal };
}

/**
 * Totais da lista de pedidos do grupo (ECO-87): somam exatamente as linhas listadas, de todos os
 * canais. A comissão vem só das linhas com venda atribuída. PDV conta junto com a bilheteria.
 */
export function totaisDosPedidos(pedidos: PedidoDoGrupo[], repasses: Repasse[]): Totais {
    const porCanal = porCanalVazio();
    let vendidos = 0;
    let cortesias = 0;
    let receita = 0;
    let comissao = 0;
    let cancelados = 0;
    let estornado = 0;
    for (const p of pedidos) {
        if (p.status === "cancelado") {
            cancelados += p.quantidade;
            if (p.venda) estornado += comissaoBruta(p.venda);
            continue;
        }
        const canal = canalDaVenda(p.canal);
        porCanal[canal].quantidade += p.quantidade;
        porCanal[canal].receita += p.valor;
        if (canal === "cortesia") cortesias += p.quantidade;
        else {
            vendidos += p.quantidade;
            receita += p.valor;
        }
        if (p.venda) comissao += comissaoDaVenda(p.venda);
    }
    const repassado = repasses.reduce((s, r) => s + r.valor, 0);
    return { vendidos, cortesias, receita, comissao, repassado, aRepassar: Math.max(0, comissao - repassado), cancelados, estornado, porCanal };
}

/** Condições valendo para o comissário no evento, e se vêm do cadastro. */
export function condicoesNoEvento(c: Comissario, v: ComissarioNoEvento): Condicoes & { herdadas: boolean } {
    return v.condicoes ? { ...v.condicoes, herdadas: false } : { ...c.padrao, herdadas: true };
}

/** Cortesias já enviadas pelo comissário no evento. */
export const cortesiasEnviadas = (vendas: VendaAtribuida[]) => vendas.filter((v) => v.canal === "cortesia").reduce((s, v) => s + v.quantidade, 0);

/* ------------------------------------------------------------------ */
/*  Ações                                                              */
/* ------------------------------------------------------------------ */

export const normalizarCodigo = (t: string) =>
    t
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 20);

export function registrarRepasse(r: Omit<Repasse, "id">) {
    gravarEquipe(r.eventoId, (eq) => ({ ...eq, repasses: [{ ...r, id: `rep-${Date.now().toString(36)}` }, ...eq.repasses] }));
}

/**
 * Cortesias que o comissário emitiu pelo Freepass entram nas vendas atribuídas dele, sem comissão
 * (FCO-72), e no uso do canal Cortesia do grupo dele quando o item (`itemId`) está no canal (ECO-81).
 * Ficam em `Evento.equipe.cortesias`; o envio que já virou pedido do grupo no banco não conta duas vezes.
 */
export function registrarCortesias(lista: Array<Pick<VendaAtribuida, "comissarioId" | "eventoId" | "pedido" | "comprador" | "vendedor" | "ingresso" | "setor" | "quantidade"> & { itemId?: string }>) {
    if (lista.length === 0) return;
    const data = new Date().toISOString();
    const base = Date.now().toString(36);
    const novas: VendaAtribuida[] = lista.map((v, i) => ({
        ...v,
        id: `ven-cor-${base}-${i}`,
        canal: "cortesia",
        canalGrupo: "cortesia",
        face: 0,
        desconto: 0,
        tipoAplicado: "fixo",
        comissaoAplicada: 0,
        status: "confirmada",
        data,
        origem: "freepass",
    }));
    for (const eventoId of new Set(novas.map((v) => v.eventoId)))
        gravarEquipe(eventoId, (eq) => ({ ...eq, cortesias: [...novas.filter((v) => v.eventoId === eventoId), ...(eq.cortesias ?? [])] }));
}

/* ------------------------------------------------------------------ */
/*  Grupos da equipe do evento (ECO)                                   */
/* ------------------------------------------------------------------ */

export type DadosNovoGrupo = Pick<GrupoEquipe, "eventoId" | "organizacaoId" | "nome" | "gruposMembrosIds" | "emailsAvulsos" | "operadores">;

/** Cria o grupo ativo, sem uso e sem canal: comissário e canais se configuram depois, na tela do grupo. */
export function criarGrupo(dados: DadosNovoGrupo, exemplos: GrupoEquipe[] = []): GrupoEquipe {
    const novo: GrupoEquipe = {
        ...dados,
        id: `grp-${Date.now().toString(36)}`,
        nome: dados.nome.trim(),
        ativo: true,
        criadoEm: new Date().toISOString(),
        operadoresInativos: [],
        gruposInativos: [],
        emitidosPorOperador: {},
        comissarioId: null,
        condicoes: null,
        canais: {},
    };
    gravarEquipe(dados.eventoId, (eq) => {
        // O primeiro grupo de um evento vazio chega com os exemplos (sem repetir o nome do novo).
        const vazio = eq.grupos.length === 0 && !eq.exemplos;
        const extras = vazio ? exemplos.filter((g) => g.nome.toLowerCase() !== novo.nome.toLowerCase()) : [];
        return { ...eq, grupos: [novo, ...eq.grupos, ...extras], exemplos: vazio ? true : eq.exemplos };
    });
    return novo;
}

/** Grupos de exemplo de um evento que já tem grupos semeados (só na primeira vez). */
export function semearExemplosDaEquipe(eventoId: string, exemplos: GrupoEquipe[]) {
    migrar();
    const ev = lerDoc("eventos", eventoId);
    if (!ev || ev.equipe?.exemplos) return;
    gravarEquipe(eventoId, (eq) => {
        const ja = new Set(eq.grupos.map((g) => g.id));
        return { ...eq, grupos: [...eq.grupos, ...exemplos.filter((g) => !ja.has(g.id))], exemplos: true };
    });
}

/** Muda um grupo (a função recebe o grupo gravado). Toda edição de grupo passa por aqui. */
export function alterarGrupo(id: string, fn: (g: GrupoEquipe) => GrupoEquipe) {
    const eventoId = eventoDoGrupo(id);
    if (eventoId) gravarEquipe(eventoId, (eq) => ({ ...eq, grupos: eq.grupos.map((g) => (g.id === id ? fn(g) : g)) }));
}

/** Liga, desliga ou configura um canal; `undefined` volta o canal para "não configurado". */
export function salvarCanal(id: string, canal: CanalGrupo, cfg: CanalDoGrupo | undefined) {
    alterarGrupo(id, (g) => {
        const canais = { ...g.canais };
        if (cfg) canais[canal] = cfg;
        else delete canais[canal];
        return { ...g, canais };
    });
}

/**
 * Liga o canal Comissário: o próprio grupo vira o comissário, com código, responsável e condições
 * (o canal com itens e cota se grava com `salvarCanal`). `null` desfaz: o grupo deixa de ser
 * comissário, o canal sai e PDV e Bilheteria deixam de gerar comissão.
 */
export function tornarComissario(id: string, dados: { codigo: string; responsavel: string; condicoes: Condicoes } | null) {
    alterarGrupo(id, (g) => {
        if (dados) return { ...g, comissarioId: g.id, ...dados };
        const canais = { ...g.canais };
        delete canais.link;
        for (const c of ["pdv", "bilheteria"] as const) if (canais[c]) canais[c] = { ...canais[c]!, comissao: false };
        return { ...g, comissarioId: null, condicoes: null, codigo: undefined, responsavel: undefined, canais };
    });
}

/** Troca o código de um vendedor do grupo-comissário (quem chama valida: 3 a 20, único no evento). */
export function definirCodigoVendedor(grupoId: string, email: string, codigo: string) {
    alterarGrupo(grupoId, (g) => ({ ...g, codigosVendedores: { ...(g.codigosVendedores ?? {}), [email]: codigo } }));
}
