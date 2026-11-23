import { useEffect, useMemo } from "react";
import { atualizarEvento, lerColecao, lerDoc, useDoc, type Evento, type SolicitacaoDeParticipacao } from "@/plataforma";

/*
 * Pedidos de participação (PUB-96): cada formulário (um por evento) guarda os seus pedidos no
 * próprio evento (`Evento.solicitacoesDeParticipacao`). Nenhum formulário público grava pedidos
 * ainda, então o formulário que existia antes dessa gravação ganha pedidos de exemplo na primeira
 * abertura (PUB-97); o criado agora nasce sem pedidos (PUB-26).
 */

export type StatusSolicitacao = SolicitacaoDeParticipacao["status"];

export interface Anexo {
    nome: string;
    arquivo: string;
    tamanho: string;
    tipo: "identificacao" | "laudo";
}

/** Pedido como a tela usa: o gravado mais os anexos (fixos, PUB-53). */
export type Solicitacao = SolicitacaoDeParticipacao & { anexos: Anexo[] };

export const STATUS_META: Record<StatusSolicitacao, { label: string; color: "warning" | "success" | "error" }> = {
    pendente: { label: "Pendente", color: "warning" },
    aprovada: { label: "Aprovado", color: "success" },
    rejeitada: { label: "Reprovado", color: "error" },
};

const ANEXOS_PADRAO: Anexo[] = [
    { nome: "Documento de identificação", arquivo: "nomedodoc.pdf", tamanho: "200 KB", tipo: "identificacao" },
    { nome: "Laudo ou documento comprobatório", arquivo: "laudo.pdf", tamanho: "1,2 MB", tipo: "laudo" },
];

/* ---------------- exemplos determinísticos por evento ---------------- */

const PRIMEIROS = [
    "Adriana", "Alícia", "Amanda", "Arthur", "Aurora", "Benício", "Bernardo", "Bianca", "Caio", "Cecília", "Clara", "Daniel",
    "Davi", "Débora", "Eduarda", "Emanuel", "Enzo", "Fabiana", "Gael", "Giovana", "Heitor", "Helena", "Igor", "Iris",
    "Júlia", "Kauã", "Laís", "Leonardo", "Lívia", "Lorena", "Matheus", "Melissa", "Miguel", "Natália", "Otávio", "Paula",
    "Priscila", "Renan", "Sabrina", "Sofia", "Thiago", "Valentina", "Vitor", "Yasmin",
];
const SOBRENOMES = [
    "Andrade", "Antunes", "Araújo", "Azevedo", "Batista", "Brandão", "Cardoso", "Carvalho", "Castro", "Correia", "Cunha", "Dias",
    "Fagundes", "Farias", "Fonseca", "Freitas", "Garcia", "Guimarães", "Leal", "Lopes", "Machado", "Macedo", "Marques", "Medeiros",
    "Mendes", "Monteiro", "Moreira", "Nascimento", "Pacheco", "Peixoto", "Prado", "Queiroz", "Rezende", "Ribeiro", "Sales", "Siqueira",
    "Tavares", "Toledo", "Valente", "Vasconcelos", "Viana", "Xavier",
];
const CIDS = ["H90", "F84", "G80", "Q90", "H54", "F41", "G35", "M41"];

/** Gerador pseudoaleatório com semente: o mesmo resultado a cada chamada com a mesma semente. */
function gerador(semente: string) {
    let h = 2166136261;
    for (const c of semente) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return () => {
        h = Math.imul(h ^ (h >>> 15), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        return ((h ^= h >>> 16) >>> 0) / 4294967296;
    };
}

const doisDigitos = (n: number) => String(n).padStart(2, "0");
const semAcento = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Quantos pedidos de exemplo o formulário do evento recebe: de 4 a 18 pela semente do evento, nunca acima do limite. */
export function quantidadeDeExemplos(evento: Evento): number {
    const r = gerador(`${evento.id}:pedidos`);
    const n = 4 + Math.floor(r() * 15);
    const f = evento.formularioDeParticipacao;
    return f?.limite === "limitado" && f.quantidadeLimite !== undefined ? Math.min(n, f.quantidadeLimite) : n;
}

/** Pedidos de exemplo do evento, todos pendentes. Nomes que já estão em outro evento são pulados. */
function exemplosDoEvento(evento: Evento, usados: Set<string>): SolicitacaoDeParticipacao[] {
    const r = gerador(`${evento.id}:pessoas`);
    const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
    const total = quantidadeDeExemplos(evento);
    const agora = Date.now();
    // Pedidos chegam entre a criação do formulário (no máximo 60 dias atrás) e hoje.
    const criado = Date.parse(evento.formularioDeParticipacao?.criadoEm ?? "");
    const inicio = Math.max(Number.isNaN(criado) ? 0 : criado, agora - 60 * 86_400_000);
    const nomes = new Set<string>();
    const lista: SolicitacaoDeParticipacao[] = [];
    for (let tentativa = 0; lista.length < total && tentativa < total * 50; tentativa++) {
        const primeiro = pick(PRIMEIROS);
        const sobrenome = pick(SOBRENOMES);
        const nome = `${primeiro} ${sobrenome}`;
        if (nomes.has(nome) || usados.has(nome)) continue;
        nomes.add(nome);
        const i = lista.length;
        const cpf = Array.from({ length: 11 }, () => Math.floor(r() * 10)).join("");
        const documento = r() < 0.9 ? `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}` : `CS${100000 + Math.floor(r() * 899999)}`;
        const quando = new Date(inicio + r() * (agora - inicio));
        lista.push({
            id: `${evento.id}-sol-${i + 1}`,
            nome,
            documento,
            email: `${semAcento(primeiro)}.${semAcento(sobrenome)}@email.com`,
            cid: pick(CIDS),
            telefone: `11 9 ${1000 + Math.floor(r() * 8999)} ${1000 + Math.floor(r() * 8999)}`,
            nascimento: `${doisDigitos(1 + Math.floor(r() * 28))}/${doisDigitos(1 + Math.floor(r() * 12))}/${1960 + Math.floor(r() * 46)}`,
            dataLaudo: `${doisDigitos(1 + Math.floor(r() * 28))}/${doisDigitos(1 + Math.floor(r() * 12))}/${2024 + Math.floor(r() * 2)}`,
            data: quando.toISOString().slice(0, 10),
            status: "pendente",
        });
    }
    return lista.sort((a, b) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id));
}

/* ---------------- leitura e gravação ---------------- */

/** Solicitações recebidas pelo formulário: as gravadas ou, antes da primeira abertura, quantas o exemplo vai gravar. */
export const solicitacoesRecebidas = (evento: Evento): number => evento.solicitacoesDeParticipacao?.length ?? quantidadeDeExemplos(evento);

/** Grava os pedidos de exemplo do formulário que ainda não tem pedidos gravados (PUB-97). */
export async function garantirSolicitacoes(eventoId: string) {
    const evento = lerDoc("eventos", eventoId);
    if (!evento?.formularioDeParticipacao || evento.solicitacoesDeParticipacao) return;
    const usados = new Set(lerColecao("eventos").flatMap((e) => (e.id === eventoId ? [] : (e.solicitacoesDeParticipacao ?? []).map((s) => s.nome))));
    await atualizarEvento(eventoId, { solicitacoesDeParticipacao: exemplosDoEvento(evento, usados) });
}

/** Aprova ou reprova um pedido, gravando no evento. */
export async function decidirSolicitacao(eventoId: string, id: string, decisao: { status: StatusSolicitacao; segmento?: string; justificativa?: string }) {
    const evento = lerDoc("eventos", eventoId);
    const lista = evento?.solicitacoesDeParticipacao;
    if (!lista) return;
    const decididaEm = decisao.status === "pendente" ? undefined : new Date().toISOString();
    await atualizarEvento(eventoId, {
        solicitacoesDeParticipacao: lista.map((s) => (s.id === id ? { ...s, status: decisao.status, segmento: decisao.segmento, justificativa: decisao.justificativa, decididaEm } : s)),
    });
}

/** Pedidos do formulário do evento; grava os de exemplo na primeira abertura. */
export function useSolicitacoesDoFormulario(eventoId: string | null) {
    const evento = useDoc("eventos", eventoId);
    const gravadas = evento?.solicitacoesDeParticipacao;
    const temFormulario = !!evento?.formularioDeParticipacao;
    useEffect(() => {
        if (eventoId && temFormulario && !gravadas) void garantirSolicitacoes(eventoId);
    }, [eventoId, temFormulario, gravadas]);
    const solicitacoes = useMemo(() => (gravadas ?? []).map((s): Solicitacao => ({ ...s, anexos: ANEXOS_PADRAO })), [gravadas]);
    return { solicitacoes, prontas: !!gravadas };
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "AAAA-MM-DD" → "26 nov 2026": o formato de data de Público (PUB-109). */
export const formatarData = (iso: string): string => {
    const [ano, mes, dia] = iso.slice(0, 10).split("-");
    return `${Number(dia)} ${MESES[Number(mes) - 1]} ${ano}`;
};

/** ISO → "26 nov 2026, 19:23" no horário do navegador (PUB-109). */
export const formatarDataHora = (iso: string): string => {
    const d = new Date(iso);
    return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}, ${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;
};
