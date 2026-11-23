import { lerDoc, salvar, type Segmentacao } from "@/plataforma";
import { useOrganizacaoAtual } from "../organizacoes/data/organizacao-atual";

/*
 * Segmentações da organização (SEG), num lugar só para quem usa: a tela de Segmentações, a aprovação
 * do formulário de participação e o ingresso limitado a segmentações. Sem gravação, valem as sete PNE.
 */

/** As PNE de exemplo (mesmos ids que ingressos e pedidos já usam). */
export const SEGMENTACOES_PNE = [
    { id: "pne-deficiente-visual", label: "PNE - Deficiente Visual" },
    { id: "pne-deficiente-auditivo", label: "PNE - Deficiente Auditivo" },
    { id: "pne-deficiente-fisico", label: "PNE - Deficiente Físico" },
    { id: "pne-deficiente-intelectual", label: "PNE - Deficiente Intelectual" },
    { id: "pne-membro-inferior", label: "PNE - Membro Inferior" },
    { id: "pne-membro-superior", label: "PNE - Membro Superior" },
    { id: "pne-transplantado", label: "PNE - Transplantado" },
];

const INICIAIS: Segmentacao[] = SEGMENTACOES_PNE.map((s, i) => ({
    id: s.id,
    nome: s.label,
    descricao: "Pessoas com deficiência aprovadas pelo formulário de participação.",
    documentos: [],
    documentoNoCheckout: "nenhum",
    atualizadoEm: new Date(Date.now() - (i + 2) * 86_400_000).toISOString(),
}));

export function useSegmentacoesDaOrganizacao() {
    const org = useOrganizacaoAtual();
    const segmentacoes = org?.segmentacoes ?? INICIAIS;
    const gravar = async (lista: Segmentacao[]) => {
        if (!org) throw new Error("sem organização");
        // Organização que só existe pelos eventos ganha o documento na primeira gravação (como em Ajustes).
        const { eventos: _e, ativos: _a, ...base } = org;
        const doc = lerDoc("organizacoes", org.id) ?? base;
        await salvar("organizacoes", { ...doc, segmentacoes: lista });
    };
    return { carregando: !org, segmentacoes, gravar, opcoes: segmentacoes.map((s) => ({ id: s.id, label: s.nome })) };
}
