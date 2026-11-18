import { CATEGORIAS, GRUPOS_DE_TAG, TAGS, type CategoriaDoMapa, type GrupoDeTag, type Tag } from "./categorias-catalogo";
import { salvar } from "./db";
import type { Categoria, CriacaoDeEvento, Evento } from "./modelo";
import { agora, novoId } from "./regras";

/* ------------------------------------------------------------------ */
/*  Categorias e tags de evento                                        */
/*                                                                     */
/*  Categoria: uma por evento, escolhida pela pessoa (dropdown). As 10 */
/*  do mapa do Grupo estão na coleção `categorias` (seed).             */
/*                                                                     */
/*  Tags: o texto aberto, o nome, a descrição e a leitura do banner    */
/*  (feita pelo Claude, ver ia-local/plugin.ts) viram um vetor no      */
/*  modelo do Hugging Face, comparado com cada tag do catálogo.        */
/*  Embedding sozinho erra fácil em tags curtas (calourada saía        */
/*  "Oktoberfest"), então entra a tag citada no que foi escrito, ou,   */
/*  só no gênero musical, a que o embedding aponta com nota alta e     */
/*  folga. Ocasião, sazonais e comodidades só entram citadas, e as     */
/*  sazonais só com o evento perto da data.                            */
/* ------------------------------------------------------------------ */

export const MODELO_EMBEDDING = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
/** Sem citação, a tag entra só com esta similaridade... */
export const LIMIAR_SEM_CITACAO = 0.74;
/** ...e com esta folga sobre a segunda mais parecida do mesmo grupo. */
export const FOLGA_SEM_CITACAO = 0.05;
/** Peso de cada parte no vetor do evento. O texto escrito sobre o evento é o que mais diz. */
const PESOS = { texto: 0.45, banner: 0.25, nome: 0.15, descricao: 0.15 };

/* ---------------- vetores ---------------- */

const cosseno = (a: number[], b: number[]) => {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
};

const normalizar = (v: number[]) => {
    const n = Math.hypot(...v) || 1;
    return v.map((x) => x / n);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let extrator: Promise<any> | null = null;
const cacheDeVetores = new Map<string, number[]>();

/** Embedding de um texto, no navegador. O modelo baixa do Hugging Face na primeira vez e fica em cache. */
export async function vetorDe(texto: string): Promise<number[]> {
    const chave = texto.trim();
    const pronto = cacheDeVetores.get(chave);
    if (pronto) return pronto;
    extrator ??= import("@xenova/transformers").then(({ pipeline, env }) => {
        env.allowLocalModels = false;
        return pipeline("feature-extraction", MODELO_EMBEDDING);
    });
    // Falhou (sem rede, por exemplo): a próxima chamada tenta de novo.
    const ext = await extrator.catch((e) => {
        extrator = null;
        throw e;
    });
    const saida = await ext(chave, { pooling: "mean", normalize: true });
    const v = Array.from(saida.data as Float32Array);
    cacheDeVetores.set(chave, v);
    return v;
}

export interface DadosParaLer {
    texto: string;
    nome?: string;
    /** Descrição em texto puro. Só o começo entra no vetor (o modelo lê até umas 128 palavras). */
    descricao?: string;
    bannerDescricao?: string;
}

/** Vetor do evento: média ponderada das partes que existem. */
export async function vetorDoEvento(d: DadosParaLer): Promise<number[] | null> {
    const partes = (
        [
            [d.texto, PESOS.texto],
            [d.bannerDescricao, PESOS.banner],
            [d.nome, PESOS.nome],
            [d.descricao?.slice(0, 600), PESOS.descricao],
        ] as const
    ).filter(([t]) => t?.trim());
    if (!partes.length) return null;
    const vetores = await Promise.all(partes.map(async ([t, peso]) => ({ v: await vetorDe(t!), peso })));
    const soma = new Array<number>(vetores[0].v.length).fill(0);
    for (const { v, peso } of vetores) v.forEach((x, i) => (soma[i] += peso * x));
    return normalizar(soma);
}

/* ---------------- catálogo de tags ---------------- */

let vetoresDasTags: Promise<Map<string, number[]>> | null = null;

/** Vetores pré-calculados (ia-local/vetores-catalogo.mjs). Tag nova ou mudada é calculada aqui. */
function carregarTags() {
    vetoresDasTags ??= import("./categorias-catalogo-vetores.json").then(async ({ default: arquivo }) => {
        const gravados = (arquivo as { vetores: Record<string, { assinatura: string; vetor: number[] }> }).vetores;
        const mapa = new Map<string, number[]>();
        for (const t of TAGS) {
            const textos = [t.nome, ...t.termos];
            const gravado = gravados[t.id];
            if (gravado?.assinatura === textos.join("|")) mapa.set(t.id, gravado.vetor);
            else {
                const vs = await Promise.all(textos.map(vetorDe));
                mapa.set(t.id, normalizar(vs[0].map((_, i) => vs.reduce((s, v) => s + v[i], 0))));
            }
        }
        return mapa;
    });
    return vetoresDasTags;
}

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const soPalavras = (t: string) => ` ${semAcento(t).replace(/[^a-z0-9]+/g, " ").trim()} `;

/** O texto cita a tag pelo nome ou por um termo dela, como palavra inteira. */
const citada = (escrito: string, t: Tag) => [t.nome, ...t.termos].some((x) => escrito.includes(soPalavras(x)));

/* ---------------- leitura das tags ---------------- */

export interface TagLida {
    id: string;
    /** Similaridade do evento com a tag (0 a 1). */
    nota: number;
    /** Citada no que foi escrito (texto, nome, descrição ou banner). */
    citada: boolean;
}

export interface LeituraDeTags {
    /** Todas as que passaram, de todos os grupos. A categoria escolhida filtra depois (`tagsValidas`). */
    tags: TagLida[];
    vetor: number[] | null;
}

/** Lê as tags do evento: citação no que foi escrito, ou embedding com nota alta e folga. */
export async function lerTags(d: DadosParaLer): Promise<LeituraDeTags> {
    const vetor = await vetorDoEvento(d);
    if (!vetor) return { tags: [], vetor: null };
    const vetores = await carregarTags();
    const escrito = soPalavras([d.texto, d.nome, d.descricao, d.bannerDescricao].filter(Boolean).join(" "));

    const achadas = new Map<string, TagLida>();
    for (const g of GRUPOS_DE_TAG) {
        const notas = TAGS.filter((t) => t.grupo === g.id)
            .map((t) => ({ t, nota: cosseno(vetor, vetores.get(t.id)!), citada: citada(escrito, t) }))
            .sort((a, b) => b.nota - a.nota);
        for (const [i, n] of notas.entries()) {
            const folga = n.nota - (notas[i + 1]?.nota ?? 0);
            const pelaLeitura = !g.soCitada && i === 0 && n.nota >= LIMIAR_SEM_CITACAO && folga >= FOLGA_SEM_CITACAO;
            if (n.citada || pelaLeitura) achadas.set(n.t.id, { id: n.t.id, nota: arredondar(n.nota), citada: n.citada });
        }
    }
    // Techno também é eletrônica: a tag mais ampla entra junto, com a nota dela.
    for (const a of [...achadas.values()]) {
        for (const id of TAG_POR_ID.get(a.id)?.inclui ?? []) {
            if (!achadas.has(id)) achadas.set(id, { id, nota: arredondar(cosseno(vetor, vetores.get(id)!)), citada: false });
        }
    }
    return { tags: [...achadas.values()], vetor };
}

const arredondar = (x: number) => Math.round(x * 100) / 100;

export interface ContextoDasTags {
    categoriaId?: string;
    /** Início e fim do evento (ISO). Sem início, nenhuma sazonal vale. */
    inicio?: string;
    fim?: string;
    /** Tags que a pessoa tirou no campo. */
    removidas?: string[];
}

/**
 * Tags que valem para o evento, com o máximo por grupo (citadas primeiro, depois pela nota).
 * Gênero musical só em eventos de entretenimento; Clássico e Final só em futebol e esportes; sazonais
 * só com o evento dentro da janela da data.
 */
export function tagsValidas<T extends { id: string; nota?: number; citada?: boolean }>(tags: T[], contexto: ContextoDasTags): T[] {
    const porGrupo = new Map<GrupoDeTag, T[]>();
    for (const l of tags) {
        const t = TAG_POR_ID.get(l.id);
        if (!t || contexto.removidas?.includes(t.id) || !valeNaCategoria(t, contexto.categoriaId) || !valeNaData(t, contexto)) continue;
        porGrupo.set(t.grupo, [...(porGrupo.get(t.grupo) ?? []), l]);
    }
    return GRUPOS_DE_TAG.flatMap((g) =>
        (porGrupo.get(g.id) ?? []).sort((a, b) => Number(!!b.citada) - Number(!!a.citada) || (b.nota ?? 0) - (a.nota ?? 0)).slice(0, g.maximo),
    );
}

function valeNaCategoria(t: Tag, categoriaId: string | undefined) {
    const doGrupo = GRUPO_POR_ID.get(t.grupo)?.categorias;
    // Sem categoria escolhida ainda, mostra tudo: a escolha filtra depois.
    if (!categoriaId) return true;
    return (!doGrupo || doGrupo.includes(categoriaId)) && (!t.categorias || t.categorias.includes(categoriaId));
}

const DIA = 24 * 60 * 60 * 1000;

/** O evento toca alguma janela da tag? Olha dia a dia do início ao fim (até 60 dias). */
function valeNaData(t: Tag, { inicio, fim }: ContextoDasTags) {
    if (!t.janelas) return true;
    if (!inicio) return false;
    const comeco = new Date(inicio.slice(0, 10) + "T12:00:00");
    const final = fim ? new Date(fim.slice(0, 10) + "T12:00:00") : comeco;
    if (Number.isNaN(comeco.getTime())) return false;
    for (let n = 0, d = comeco.getTime(); n <= 60; n++, d += DIA) {
        const iso = new Date(d).toISOString().slice(0, 10);
        if (t.janelas.some((j) => naJanela(iso, j))) return true;
        if (d >= final.getTime()) break;
    }
    return false;
}

function naJanela(iso: string, [de, ate]: [string, string]) {
    // Com ano: só aquele período.
    if (de.length === 10) return iso >= de && iso <= ate;
    // Sem ano: todo ano, e a janela pode virar o ano (26/12 a 02/01).
    const md = iso.slice(5);
    return de <= ate ? md >= de && md <= ate : md >= de || md <= ate;
}

/* ---------------- consultas ---------------- */

export const TAG_POR_ID = new Map(TAGS.map((t) => [t.id, t]));
export const GRUPO_POR_ID = new Map(GRUPOS_DE_TAG.map((g) => [g.id, g]));
export const CATEGORIA_POR_ID = new Map(CATEGORIAS.map((c) => [c.id, c]));

/** Só as categorias do mapa: a coleção pode ter documentos da lista anterior, com ids que não estão no mapa. */
export const doMapa = (categorias: Categoria[]) => categorias.filter((c) => CATEGORIA_POR_ID.has(c.id) && typeof c.ordem === "number");

/** Categorias que a criação de um tipo oferece no dropdown. */
export const categoriasDoTipo = (categorias: Categoria[], tipo: Evento["tipo"]) => categorias.filter((c) => c.tipo === tipo).sort((a, b) => a.ordem - b.ordem);

/* ---------------- eventos que já existiam ---------------- */

/** Categoria da vitrine do novo site para a categoria do mapa. */
const DA_VITRINE: Record<string, string> = {
    eletronica: "festas-e-baladas",
    sertanejo: "shows",
    rock: "shows",
    rap: "shows",
    teatro: "artes-cenicas",
    festival: "festivais",
    standup: "humor",
};

/**
 * Categoria do evento. Os criados agora gravam a sua; os da seed e os de antes do mapa saem do tipo
 * (futebol, esportivo) ou da categoria da vitrine.
 */
export function categoriaDoEvento(e: Pick<Evento, "categoria" | "tipo" | "vitrine">): string | undefined {
    if (e.categoria && CATEGORIA_POR_ID.has(e.categoria)) return e.categoria;
    if (e.tipo === "futebol") return "futebol";
    if (e.tipo === "esportivo") return "esportes";
    const v = e.vitrine;
    if (v?.categoria === "esportes") return v.tags?.some((t) => soPalavras(t) === " futebol ") ? "futebol" : "esportes";
    return v?.categoria ? DA_VITRINE[v.categoria] : undefined;
}

/**
 * Tags do evento. Os criados agora gravam as suas; os da seed saem das tags soltas da vitrine,
 * quando batem com o nome ou um termo de uma tag do catálogo.
 */
export function tagsDoEvento(e: Pick<Evento, "tags" | "categoria" | "tipo" | "vitrine" | "data" | "fim">): string[] {
    if (e.tags) return e.tags;
    const soltas = (e.vitrine?.tags ?? []).map(soPalavras);
    const achadas = TAGS.filter((t) => [t.nome, ...t.termos].some((x) => soltas.includes(soPalavras(x)))).map((t) => ({ id: t.id, citada: true }));
    const comAmplas = [...achadas, ...achadas.flatMap((a) => (TAG_POR_ID.get(a.id)?.inclui ?? []).map((id) => ({ id, citada: false })))];
    const unicas = [...new Map(comAmplas.map((a) => [a.id, a])).values()];
    return tagsValidas(unicas, { categoriaId: categoriaDoEvento(e), inicio: e.data, fim: e.fim }).map((t) => t.id);
}

/* ---------------- gravação ---------------- */

/** Grava a criação: o que foi escrito, a leitura do banner, o vetor e o resultado. Chamado ao criar o evento. */
export async function registrarCriacao(dados: DadosParaLer & { eventoId: string; produtora: string; nome: string; categoriaId?: string; tags: string[] }, vetor: number[] | null) {
    const criacao: CriacaoDeEvento = {
        id: novoId("criacao"),
        eventoId: dados.eventoId,
        produtora: dados.produtora,
        nome: dados.nome,
        texto: dados.texto.trim(),
        descricao: dados.descricao || undefined,
        bannerDescricao: dados.bannerDescricao || undefined,
        vetor: vetor?.map((x) => Math.round(x * 1e4) / 1e4),
        categoriaId: dados.categoriaId,
        tags: dados.tags,
        criadoEm: agora(),
    };
    await salvar("criacoes", criacao);
    return criacao;
}

/* ---------------- banner ---------------- */

/**
 * Leitura do banner pelo Claude logado nesta máquina (ia-local/plugin.ts, só no `npm run dev`).
 * Sem a ponte ou com erro, devolve null e a leitura segue sem o banner.
 */
export async function lerBanner(dataUrl: string): Promise<string | null> {
    try {
        const res = await fetch("/api/ia-local", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ imagem: dataUrl }) });
        if (!res.ok || !(res.headers.get("content-type") ?? "").includes("application/json")) return null;
        const r = (await res.json()) as { ok: boolean; descricao?: string };
        return r.ok && r.descricao ? r.descricao : null;
    } catch {
        return null;
    }
}

export { CATEGORIAS, GRUPOS_DE_TAG, TAGS, type CategoriaDoMapa, type GrupoDeTag, type Tag };
