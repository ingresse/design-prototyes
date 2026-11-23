import { agoraIsoLocal } from "./campos";
import { novoId } from "./modelos";
import type { AberturaDeVendas, CanalDeVenda, Categoria, ConfiguracaoDeVenda, Modalidade, Rascunho } from "./tipos";

/* ------------------------------------------------------------------ */
/*  Aberturas de vendas (v0.51, SCE-306 a SCE-310)                     */
/*  Modelo do AWA: a abertura é o período (nome, início e fim) e tem   */
/*  configurações (Vender para, Modalidades e categorias, Canais).    */
/*  Mesmo backend do AWA.                                              */
/* ------------------------------------------------------------------ */

/** Canais desta versão (SCE-298). */
export const CANAIS: { id: CanalDeVenda; label: string }[] = [
    { id: "site", label: "Site" },
    { id: "grupos", label: "Vendas em grupo" },
];

export const nomeDoCanal = (c: CanalDeVenda) => CANAIS.find((x) => x.id === c)?.label ?? c;

/** "Site", "Site e Vendas em grupo". */
export const listaDeCanais = (canais: CanalDeVenda[]) => {
    const nomes = CANAIS.filter((c) => canais.includes(c.id)).map((c) => c.label);
    return nomes.length <= 1 ? (nomes[0] ?? "") : `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
};

/**
 * "Vender para" (SCE-270): público geral ou uma segmentação do público da organização (Público › Segmentações no
 * AWA). As listas são exemplos do protótipo; PCD vem do formulário de participação do evento (SCE-236).
 */
export const SEGMENTACOES: { id: string; label: string; ajuda: string }[] = [
    { id: "geral", label: "Público geral", ajuda: "Qualquer pessoa pode comprar." },
    { id: "pcd", label: "PCD aprovados", ajuda: "Só atletas com o pedido aprovado no formulário de participação do evento." },
    { id: "assessorias", label: "Assessorias parceiras", ajuda: "Lista de documentos das assessorias parceiras." },
    { id: "socios", label: "Sócios do clube", ajuda: "Lista de documentos dos sócios." },
];
export const nomeDoPublico = (id: string) => SEGMENTACOES.find((s) => s.id === id)?.label ?? "";

const p2 = (n: number) => String(n).padStart(2, "0");
const isoLocal = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`;

/** Véspera da largada às 23:59 (fim sugerido). */
export const vesperaDaLargada = (largada: string) => {
    if (!largada) return "";
    const d = new Date(largada);
    if (Number.isNaN(d.getTime())) return "";
    d.setDate(d.getDate() - 1);
    d.setHours(23, 59, 0, 0);
    return isoLocal(d);
};

const proximaHoraCheia = () => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return isoLocal(d);
};

const ORDINAIS = ["Primeira", "Segunda", "Terceira", "Quarta", "Quinta", "Sexta", "Sétima", "Oitava", "Nona", "Décima"];
/** Nome padrão (SCE-306): "Primeira abertura", "Segunda abertura"… e "Abertura 11" em diante. */
export const nomePadraoDaAbertura = (n: number) => (n <= ORDINAIS.length ? `${ORDINAIS[n - 1]} abertura` : `Abertura ${n}`);

export const todasAsCategorias = (ms: Modalidade[]) => ms.flatMap((m) => m.categorias.filter((c) => !c.nova));

/** Configuração nova: a primeira já vem com o caso comum; as seguintes, vazias, como no AWA. */
export const novaConfiguracao = (ms: Modalidade[], comum = false): ConfiguracaoDeVenda => ({
    id: novoId("config"),
    publico: comum ? "geral" : "",
    canais: comum ? ["site"] : [],
    categorias: comum ? todasAsCategorias(ms).map((c) => c.id) : [],
});

/**
 * Abertura nova (SCE-306): nome "Primeira abertura" (ou a seguinte); a primeira vem da próxima hora cheia até a
 * véspera da largada, com a configuração comum (Público geral, todas as categorias, Site).
 */
export const novaAbertura = (r: Pick<Rascunho, "largada" | "aberturas" | "modalidades">): AberturaDeVendas => {
    const existentes = r.aberturas ?? [];
    const n = existentes.length + 1;
    const primeira = n === 1;
    // v0.57 (SCE-318): a seguinte também vem com período sugerido: começa quando a última termina e vai até a
    // véspera da largada (se a véspera já passou do início, o fim fica para a pessoa preencher).
    const ultimoFim = existentes.map((a) => a.fim).filter(Boolean).sort().pop() ?? "";
    const inicio = primeira || !ultimoFim ? proximaHoraCheia() : ultimoFim;
    const vespera = vesperaDaLargada(r.largada);
    return {
        id: novoId("abertura"),
        nome: nomePadraoDaAbertura(n),
        inicio,
        fim: vespera && vespera > inicio ? vespera : "",
        configuracoes: [novaConfiguracao(r.modalidades, primeira)],
    };
};

/** Rascunhos antigos sem `configuracoes` ou com outro formato ficam fora. */
export const aberturasDe = (r: Pick<Rascunho, "aberturas">): AberturaDeVendas[] => (r.aberturas ?? []).filter((a) => Array.isArray(a.configuracoes));

/** Ids das categorias à venda numa configuração (só as que existem). */
export const categoriasDaConfiguracao = (c: ConfiguracaoDeVenda, ms: Modalidade[]) => {
    const marcadas = new Set(c.categorias);
    return todasAsCategorias(ms)
        .map((x) => x.id)
        .filter((id) => marcadas.has(id));
};

/* Datas: "25 de nov. às 10:00" (com o ano só quando não é o ano atual). */
export const dataCurta = (iso: string) => {
    const d = new Date(iso);
    if (!iso || Number.isNaN(d.getTime())) return "";
    const mesmoAno = d.getFullYear() === new Date().getFullYear();
    const dia = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", ...(mesmoAno ? {} : { year: "numeric" }) }).format(d);
    const hora = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(d);
    return `${dia} às ${hora}`;
};

export const periodoCurto = (v: { inicio: string; fim: string }) =>
    v.inicio && v.fim ? `${dataCurta(v.inicio)} – ${dataCurta(v.fim)}` : v.inicio ? `A partir de ${dataCurta(v.inicio)}` : v.fim ? `Até ${dataCurta(v.fim)}` : "Período a definir";

export type EstadoDaAbertura = "rascunho" | "agendada" | "aberta" | "encerrada";

export function estadoDaAbertura(a: AberturaDeVendas, publicado: boolean, agora = agoraIsoLocal()): { tipo: EstadoDaAbertura; texto: string } {
    if (!a.inicio || !a.fim) return { tipo: "rascunho", texto: "Período a definir" };
    if (a.fim <= agora) return { tipo: "encerrada", texto: "Encerrada" };
    if (a.inicio <= agora) return publicado ? { tipo: "aberta", texto: "Aberta agora" } : { tipo: "agendada", texto: "Abre ao publicar" };
    return { tipo: "agendada", texto: "Agendada" };
}

export type TipoDeStatusDeVenda = "a-venda" | "programada" | "nao-programada" | "esgotada" | "encerrada" | "pausada";

export interface StatusDeVenda {
    tipo: TipoDeStatusDeVenda;
    rotulo: string;
    detalhe?: string;
}

/** Aberturas com datas válidas que vendem a categoria (em alguma configuração com canal). */
const aberturasDaCategoria = (r: Rascunho, c: Categoria) =>
    aberturasDe(r).filter((a) => a.inicio && a.fim && a.fim > a.inicio && a.configuracoes.some((cfg) => cfg.canais.length && cfg.categorias.includes(c.id)));

/** Item de protótipo (SCE-264): a última categoria à venda da primeira modalidade aparece esgotada. */
const esgotadaNaSimulacao = (r: Rascunho, c: Categoria, agora: string) => {
    const m = r.modalidades[0];
    if (!r.simularPublicado || !m) return false;
    const vendendo = m.categorias.filter((x) => aberturasDaCategoria(r, x).some((a) => a.inicio <= agora && a.fim > agora));
    return vendendo.length > 1 && vendendo[vendendo.length - 1].id === c.id;
};

/** Estado de venda da categoria (SCE-263), pelas aberturas que a incluem. */
export function statusDeVenda(r: Rascunho, c: Categoria, agora = agoraIsoLocal()): StatusDeVenda {
    const publicado = r.publicado || !!r.simularPublicado;
    // v0.58 (SCE-324): categoria ou modalidade desligada não vende, com ou sem abertura.
    if (c.ativa === false) return { tipo: "pausada", rotulo: "Pausada", detalhe: "Desligada" };
    if (c.lotes.length > 0 && c.lotes.every((l) => l.ativo === false)) return { tipo: "pausada", rotulo: "Pausada", detalhe: "Todos os lotes desligados" };
    const as = aberturasDaCategoria(r, c);
    if (!as.length) return { tipo: "nao-programada", rotulo: "Não programada", detalhe: "Fora das aberturas" };
    const agoraAberta = as.filter((a) => a.inicio <= agora && a.fim > agora).sort((a, b) => b.fim.localeCompare(a.fim))[0];
    if (agoraAberta) {
        if (esgotadaNaSimulacao(r, c, agora)) return { tipo: "esgotada", rotulo: "Esgotada", detalhe: "Todas as vagas vendidas" };
        return publicado ? { tipo: "a-venda", rotulo: "À venda", detalhe: `Até ${dataCurta(agoraAberta.fim)}` } : { tipo: "programada", rotulo: "Programada", detalhe: "Abre ao publicar" };
    }
    const proxima = as.filter((a) => a.inicio > agora).sort((a, b) => a.inicio.localeCompare(b.inicio))[0];
    if (proxima) return { tipo: "programada", rotulo: "Programada", detalhe: `Abre ${dataCurta(proxima.inicio)}` };
    return { tipo: "encerrada", rotulo: "Encerrada", detalhe: `Em ${dataCurta(as.sort((a, b) => b.fim.localeCompare(a.fim))[0].fim)}` };
}

/** v0.61 (SCE-328): aberturas que vendem por Vendas em grupo com o módulo Grupos e assessorias desligado. */
export const aberturasComGruposSemModulo = (r: Rascunho) =>
    r.modulos?.grupos ? [] : aberturasDe(r).filter((a) => a.configuracoes.some((c) => c.canais.includes("grupos")));

/** Destaca um item do menu do evento (abre o grupo e pisca o item). Usado pelos atalhos da revisão. */
export const destacarNoMenu = (id: "produtos" | "grupos") => window.dispatchEvent(new CustomEvent("sce-destacar-menu", { detail: id }));

/**
 * v0.69 (SCE-339): o lote não pode ser editado depois que as vendas dele começaram. Começaram quando o evento está
 * publicado, a categoria já abriu (à venda, esgotada ou encerrada) e o lote é o que vende agora ou um anterior a ele.
 * Pausar e retomar continuam permitidos.
 */
export function loteComVendasIniciadas(r: Rascunho, c: Categoria, loteId: string, agora = agoraIsoLocal()) {
    if (!(r.publicado || r.simularPublicado)) return false;
    const status = aberturasDaCategoria(r, c).some((a) => a.inicio <= agora);
    if (!status) return false;
    const tipo = statusDeVenda(r, c, agora).tipo;
    if (tipo === "esgotada" || tipo === "encerrada") return true;
    const ativos = c.lotes.filter((l) => l.ativo !== false);
    const atual = c.lotes.findIndex((l) => l.id === ativos[0]?.id);
    const i = c.lotes.findIndex((l) => l.id === loteId);
    return i >= 0 && (atual < 0 || i <= atual);
}

export const AVISO_LOTE_BLOQUEADO = "As vendas deste lote já começaram: preço, quantidade, nome e data limite não mudam mais. Para outro valor, crie um novo lote.";
