/* ------------------------------------------------------------------ */
/*  Adaptador do Backstage para o store único de Equipe e Comissários. */
/*                                                                     */
/*  O modelo do grupo mora em @/plataforma/equipe e o estado no store  */
/*  de @/plataforma/comissarios (lido também pelo Freepass), gravado   */
/*  no banco da plataforma (`Evento.equipe`). Vendas e pedidos do      */
/*  grupo vêm do store: pedidos do evento no banco + exemplos. Aqui    */
/*  entram o que depende do Backstage: o cadastro de Membros (pessoas  */
/*  exatas de cada grupo), o catálogo do evento em contexto e a        */
/*  semente dos comissários e dos exemplos.                            */
/* ------------------------------------------------------------------ */

import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
    alterarGrupo as alterarGrupoNoBanco,
    criarGrupo as criarGrupoNoBanco,
    definirCodigoVendedor as definirCodigoNoBanco,
    salvarCanal as salvarCanalNoBanco,
    semearExemplosDaEquipe,
    tornarComissario as tornarComissarioNoBanco,
    totaisDosPedidos,
    type Comissario,
    type PedidoDoGrupo,
    type Repasse,
    type Totais,
    type VendaAtribuida,
} from "@/plataforma/comissarios";
import { usoDoGrupo, type GrupoEquipe } from "@/plataforma/equipe";
import { useComissariosDaOrganizacao } from "../../comissarios/data/comissarios";
import { useEventoAtual } from "../../eventos/data/eventos";
import { ITEM_POR_ID, naSimulacao, useCatalogoDaEquipe } from "./catalogo-evento";
import { gruposDeExemplo } from "./grupos-exemplo";
import { GRUPO_MEMBROS_POR_ID, useGruposDeMembros } from "./membros";

export * from "@/plataforma/equipe";
export {
    lerEstadoComissarios,
    totais,
    totaisDosPedidos,
    comissaoDaVenda,
    normalizarCodigo,
    comissaoBruta,
    condicoesNoEvento,
    cortesiasEnviadas,
    setoresDoEvento,
    CANAIS,
    CANAL_LABEL,
    type Comissario,
    type VendaAtribuida,
    type Repasse,
    type Totais,
    type Condicoes,
    type PedidoDoGrupo,
} from "@/plataforma/comissarios";

/*
 * Na simulação de escala (`?escala=N`, UI-LST-005) a Equipe lê o catálogo simulado de Itens e nada é
 * gravado, como em Itens: os ids simulados não podem ir para o banco. A tela avisa com um toast.
 */
const AVISO_SIMULACAO = "Simulação de escala: nada é gravado.";
function seGravar<A extends unknown[], R>(fn: (...a: A) => R, semGravar: R) {
    return (...a: A): R => {
        if (!naSimulacao()) return fn(...a);
        toast.info(AVISO_SIMULACAO);
        return semGravar;
    };
}
export const alterarGrupo = seGravar(alterarGrupoNoBanco, undefined as ReturnType<typeof alterarGrupoNoBanco>);
export const salvarCanal = seGravar(salvarCanalNoBanco, undefined as ReturnType<typeof salvarCanalNoBanco>);
export const tornarComissario = seGravar(tornarComissarioNoBanco, undefined as ReturnType<typeof tornarComissarioNoBanco>);
export const definirCodigoVendedor = seGravar(definirCodigoNoBanco, undefined as ReturnType<typeof definirCodigoNoBanco>);
/** Na simulação devolve `null`: o grupo não é criado. */
export const criarGrupo = seGravar(criarGrupoNoBanco as (...a: Parameters<typeof criarGrupoNoBanco>) => GrupoEquipe | null, null);

export const NOME_MAX = 40;
export const BASE = "/backstage/evento/equipe";

/** Item ainda existe no catálogo do evento em contexto (itens que saíram não contam, ECO-45). */
export const itemValido = (id: string) => !!ITEM_POR_ID[id];

/** Junta os membros dos grupos de Membros e os e-mails avulsos, sem repetição. */
export function operadoresDe(grupos: string[], emails: string[]) {
    return [...new Set([...grupos.flatMap((id) => GRUPO_MEMBROS_POR_ID[id]?.emails ?? []), ...emails])];
}

/** Ligada = não foi desligada sozinha e entra por um caminho ligado: e-mail avulso ou grupo de Membros ligado (ECO-62). */
export function operadorAtivo(g: GrupoEquipe, email: string) {
    if (g.operadoresInativos.includes(email)) return false;
    if (g.emailsAvulsos.includes(email)) return true;
    return g.gruposMembrosIds.some((m) => !g.gruposInativos.includes(m) && GRUPO_MEMBROS_POR_ID[m]?.emails.includes(email));
}

/** Uso somando os canais ligados, contando só os itens do catálogo. */
export const usoNoCatalogo = (g: GrupoEquipe) => usoDoGrupo(g, itemValido);

export interface DadosDoGrupo {
    grupo: GrupoEquipe;
    comissario?: Comissario;
    /** Pedidos do grupo em todos os canais (ECO-74): banco, Freepass e exemplos. */
    pedidos: PedidoDoGrupo[];
    /** As linhas que contam para o comissário. */
    vendas: VendaAtribuida[];
    repasses: Repasse[];
    /** Soma exata dos pedidos listados e dos repasses (ECO-87). */
    t: Totais;
}

/**
 * Grupos do evento em contexto, com o comissário, os pedidos, as vendas e os repasses. Semeia os
 * comissários da organização na primeira leitura e, num evento que já tem grupos semeados, os 6
 * exemplos (ECO-06).
 */
export function useEquipeDoEvento() {
    useCatalogoDaEquipe();
    useGruposDeMembros();
    const evento = useEventoAtual();
    const { carregando, estado, organizacao } = useComissariosDaOrganizacao();
    const doEvento = useMemo(() => estado.grupos.filter((g) => g.eventoId === evento.id), [estado.grupos, evento.id]);
    const precisaExemplos = !carregando && !naSimulacao() && doEvento.length > 0 && !estado.eventosComExemplos.includes(evento.id);
    useEffect(() => {
        if (precisaExemplos) semearExemplosDaEquipe(evento.id, gruposDeExemplo(evento.id, organizacao?.id ?? ""));
    }, [precisaExemplos, evento.id, organizacao?.id]);

    const grupos = useMemo<DadosDoGrupo[]>(
        () =>
            doEvento.map((grupo) => {
                // O comissário é o próprio grupo (ECO-09): lido do store, sem depender da organização gravada.
                const comissario = grupo.comissarioId ? estado.comissarios.find((c) => c.id === grupo.comissarioId) : undefined;
                const pedidos = estado.pedidos.filter((p) => p.grupoId === grupo.id);
                const repasses = comissario ? estado.repasses.filter((r) => r.comissarioId === comissario.id && r.eventoId === evento.id) : [];
                return {
                    grupo,
                    comissario,
                    pedidos,
                    vendas: pedidos.flatMap((p) => (p.venda ? [p.venda] : [])),
                    repasses,
                    t: totaisDosPedidos(pedidos, repasses),
                };
            }),
        [doEvento, estado.comissarios, estado.pedidos, estado.repasses, evento.id],
    );

    return { carregando, evento, organizacao, grupos };
}
