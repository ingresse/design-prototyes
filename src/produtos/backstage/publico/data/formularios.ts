import { useMemo } from "react";
import { atualizarEvento, lerDoc, organizacaoDoEvento, useColecao, type Evento } from "@/plataforma";
import { useOrganizacaoAtual } from "../../organizacoes/data/organizacao-atual";
import { garantirSolicitacoes, solicitacoesRecebidas } from "./solicitacoes";

/*
 * Formulários de participação (PUB): um por evento da organização, gravado no próprio evento
 * (`Evento.formularioDeParticipacao`). A lista mostra os eventos da organização que têm formulário;
 * o "Novo formulário" oferece os que ainda não têm.
 */

export type LimiteSolicitacoes = "ilimitado" | "limitado";

export interface FormularioParticipacao {
    /** Id do evento: um formulário por evento. */
    id: string;
    titulo: string;
    /** Data de exibição já formatada (ex.: "31 dez 2026, 20:00"). */
    data: string;
    imagem: string;
    /** Evento ainda em rascunho. */
    rascunho: boolean;
    ativo: boolean;
    limite: LimiteSolicitacoes;
    quantidadeLimite?: number;
    solicitacoesRecebidas: number;
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
/** Um formato de data em Público: "26 nov 2026, 20:00" (sem hora quando o evento não tem). */
export const dataDoEvento = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const dia = `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
    return iso.includes("T") ? `${dia}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : dia;
};

const paraFormulario = (e: Evento): FormularioParticipacao => ({
    id: e.id,
    titulo: e.nome,
    data: dataDoEvento(e.data),
    imagem: e.capa ?? "",
    rascunho: e.status === "rascunho",
    ativo: e.formularioDeParticipacao!.ativo,
    limite: e.formularioDeParticipacao!.limite,
    quantidadeLimite: e.formularioDeParticipacao!.quantidadeLimite,
    // Pedidos do formulário deste evento (PUB-96).
    solicitacoesRecebidas: solicitacoesRecebidas(e),
});

/** Formulários dos eventos da organização em contexto e os eventos que ainda podem ganhar um. */
export function useFormulariosDaOrganizacao() {
    const org = useOrganizacaoAtual();
    const todos = useColecao("eventos");
    return useMemo(() => {
        const daOrg = todos.filter((e) => org && organizacaoDoEvento(e) === org.id).sort((a, b) => a.data.localeCompare(b.data));
        return {
            carregando: !org,
            formularios: daOrg.filter((e) => e.formularioDeParticipacao).map(paraFormulario),
            eventosSemFormulario: daOrg.filter((e) => !e.formularioDeParticipacao && e.status !== "encerrado").map((e) => ({ id: e.id, titulo: e.nome, data: dataDoEvento(e.data) })),
        };
    }, [todos, org?.id]);
}

/**
 * Cria ou atualiza o formulário do evento. Criar começa sem pedidos (PUB-26); atualizar um formulário
 * que ainda não gravou pedidos grava antes os de exemplo, para o limite valer sobre eles (PUB-97).
 */
export async function salvarFormulario(eventoId: string, dados: { ativo: boolean; limite: LimiteSolicitacoes; quantidadeLimite?: number }) {
    const atual = lerDoc("eventos", eventoId);
    if (!atual) return;
    const existente = atual.formularioDeParticipacao;
    if (existente) await garantirSolicitacoes(eventoId);
    return atualizarEvento(eventoId, {
        formularioDeParticipacao: { ...dados, criadoEm: existente?.criadoEm ?? new Date().toISOString() },
        ...(existente ? {} : { solicitacoesDeParticipacao: atual.solicitacoesDeParticipacao ?? [] }),
    });
}
