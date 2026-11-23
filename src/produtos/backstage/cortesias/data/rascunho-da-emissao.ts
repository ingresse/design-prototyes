import { useCallback, useEffect, useState } from "react";
import { usePainel } from "../../components/painel";
import { useEventoAtual } from "../../eventos/data/eventos";

/*
 * Rascunho da emissão de cortesia (COR-53): os itens escolhidos e os e-mails ficam na sessão do
 * navegador (sessionStorage), por painel e evento. Recarregar, voltar da verificação ou usar o voltar
 * do navegador não perde o que foi feito. Enviar ou descartar limpa o rascunho.
 */

export interface RascunhoDaEmissao {
    eventoId: string;
    itemIds: string[];
    emails: string[];
}

type Parte = Partial<Omit<RascunhoDaEmissao, "eventoId">>;

const chave = (painel: string) => `cortesias:rascunho-da-emissao:v1:${painel}`;

function ler(painel: string, eventoId: string): RascunhoDaEmissao {
    const vazio = { eventoId, itemIds: [], emails: [] };
    try {
        const bruto = window.sessionStorage.getItem(chave(painel));
        if (!bruto) return vazio;
        const r = JSON.parse(bruto) as Partial<RascunhoDaEmissao>;
        // Rascunho de outro evento não vale aqui.
        if (r.eventoId !== eventoId) return vazio;
        return { eventoId, itemIds: Array.isArray(r.itemIds) ? r.itemIds : [], emails: Array.isArray(r.emails) ? r.emails : [] };
    } catch {
        return vazio;
    }
}

function gravar(painel: string, r: RascunhoDaEmissao) {
    try {
        window.sessionStorage.setItem(chave(painel), JSON.stringify(r));
    } catch {
        /* sem armazenamento: o rascunho vive só enquanto a tela está aberta */
    }
}

/** O rascunho do evento em contexto, com as ações de mudar e de descartar. */
export function useRascunhoDaEmissao() {
    const painel = usePainel();
    const eventoId = useEventoAtual().id;
    const [rascunho, setRascunho] = useState<RascunhoDaEmissao>(() => ler(painel, eventoId));

    // Trocou de evento: lê o rascunho do outro.
    useEffect(() => setRascunho(ler(painel, eventoId)), [painel, eventoId]);

    const mudar = useCallback(
        (parte: Parte | ((atual: RascunhoDaEmissao) => Parte)) =>
            setRascunho((atual) => {
                const novo = { ...atual, ...(typeof parte === "function" ? parte(atual) : parte), eventoId };
                gravar(painel, novo);
                return novo;
            }),
        [painel, eventoId],
    );

    const descartar = useCallback(() => {
        try {
            window.sessionStorage.removeItem(chave(painel));
        } catch {
            /* nada a limpar */
        }
        setRascunho({ eventoId, itemIds: [], emails: [] });
    }, [painel, eventoId]);

    const temAlgo = rascunho.itemIds.length > 0 || rascunho.emails.length > 0;
    return { rascunho, mudar, descartar, temAlgo };
}

/** Fechar a aba ou sair do site com algo preenchido pergunta antes (o rascunho só vive nesta aba). */
export function useAvisoAoSair(ativo: boolean) {
    useEffect(() => {
        if (!ativo) return;
        const aviso = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", aviso);
        return () => window.removeEventListener("beforeunload", aviso);
    }, [ativo]);
}
