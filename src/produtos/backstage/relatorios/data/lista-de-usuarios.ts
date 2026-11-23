/*
 * Lista de usuários (LUS): inscritos nas listas de interesse do evento (pré-venda, lista de espera,
 * interessados). Em produção vem do BigQuery (`awa_waitlist_info`). Aqui a tela mostra só o banco
 * (lista de espera do link de compra, LUS-08); estes inscritos fictícios só entram quando o produtor
 * simula (LUS-09), determinísticos por evento, com a mesma forma dos dados de produção (documento só
 * quando a pessoa tem cadastro).
 */

/** Quantas inscrições a simulação cria por evento. */
export const QUANTIDADE_SIMULADA = 137;

export interface InscritoNaLista {
    id: string;
    nome: string;
    email: string;
    telefone: string;
    documento: string;
    tipoDeDocumento: "cpf" | "cnpj" | "passport" | "";
    /** "AAAA-MM-DDTHH:mm:ss", no horário do evento. */
    inscritoEm: string;
}

const NOMES = ["Ana", "Bruno", "Carla", "Diego", "Elisa", "Felipe", "Gabriela", "Henrique", "Isabela", "João", "Karina", "Lucas", "Mariana", "Nicolas", "Olívia", "Pedro", "Rafaela", "Samuel", "Tatiane", "Vinícius"];
const SOBRENOMES = ["Almeida", "Barbosa", "Costa", "Duarte", "Esteves", "Ferraz", "Gomes", "Henriques", "Lima", "Moraes", "Nogueira", "Oliveira", "Pereira", "Ramos", "Souza", "Teixeira"];

/** Gerador pseudoaleatório com semente: a mesma lista a cada abertura do mesmo evento. */
function gerador(semente: string) {
    let h = 2166136261;
    for (const c of semente) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return () => {
        h = Math.imul(h ^ (h >>> 15), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        return ((h ^= h >>> 16) >>> 0) / 4294967296;
    };
}

/** Inscrições simuladas do evento, nos 40 dias antes de `ate` (a hora da simulação, para as datas não andarem). */
export function inscritosDoEvento(eventoId: string, quantidade = QUANTIDADE_SIMULADA, ate: string = new Date().toISOString()): InscritoNaLista[] {
    const r = gerador(eventoId);
    const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
    const fim = Date.parse(ate);
    const base = (Number.isNaN(fim) ? Date.now() : fim) - 40 * 86_400_000;
    return Array.from({ length: quantidade }, (_, i) => {
        const nome = `${pick(NOMES)} ${pick(SOBRENOMES)}`;
        const tipo: InscritoNaLista["tipoDeDocumento"] = r() < 0.9 ? "cpf" : r() < 0.6 ? "passport" : "";
        const documento = tipo === "cpf" ? String(Math.floor(10_000_000_000 + r() * 89_999_999_999)) : tipo === "passport" ? `CS${Math.floor(100000 + r() * 899999)}` : "";
        const quando = new Date(base + r() * 40 * 86_400_000);
        return {
            id: `lus-${eventoId}-${i}`,
            nome,
            email: `${nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(" ", ".")}${i}@exemplo.com`,
            telefone: `119${Math.floor(10_000_000 + r() * 89_999_999)}`,
            documento,
            tipoDeDocumento: tipo,
            inscritoEm: quando.toISOString().slice(0, 19),
        };
    });
}

export const ROTULO_DO_DOCUMENTO: Record<string, string> = { cpf: "CPF", cnpj: "CNPJ", passport: "Passaporte" };
