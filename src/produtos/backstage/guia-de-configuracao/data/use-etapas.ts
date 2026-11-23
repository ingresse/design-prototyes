import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useLocation, useNavigate } from "react-router";
import { semEventosNaOrganizacao, useEventoAtual, useEventosVersao } from "../../eventos/data/eventos";
import { organizacaoAtualId } from "../../organizacoes/data/organizacao-atual";
import type { Guia } from "./use-guia";
import type { PassoId } from "./passos";

/*
 * Etapas do guia de configuração (GDC-60 a GDC-66): a organização, a meta do primeiro evento e a
 * configuração do evento em contexto. A etapa do evento usa os passos do evento (GDC-02), lidos do
 * estado real; as da organização contam por visita (GDC-62).
 */

export type EtapaId = "organizacao" | "primeiro-evento" | "evento";
export type StatusDoPasso = "complete" | "current" | "incomplete";

export interface PassoDaEtapa {
    id: string;
    rotulo: string;
    acao: string;
    motivo?: string;
    status: StatusDoPasso;
    bloqueado: boolean;
    ir: () => void;
}

export interface Etapa {
    id: EtapaId;
    rotulo: string;
    descricao?: string;
    passos: PassoDaEtapa[];
    feita: boolean;
    /** Etapa inteira travada até a anterior acontecer (o evento, sem evento na organização). */
    bloqueada: boolean;
    motivo?: string;
}

/** Rota de cada passo do evento; `?novoSetor=1` abre a criação rápida de grupo (GDC-11, ITM-131). */
export const ROTA_ABERTURAS = "/backstage/catalogo/aberturas-de-vendas";
export const PARAMETRO_NOVO_SETOR = "novoSetor";
const ROTAS_DO_EVENTO: Record<PassoId, string> = {
    setores: `/backstage/catalogo/ingressos?${PARAMETRO_NOVO_SETOR}=1`,
    ingressos: "/backstage/catalogo/ingressos/novo",
    abertura: ROTA_ABERTURAS,
    // Fora das telas do evento não há modal de status: vai para a Visão geral, que abre o modal já em
    // Publicado (GDC-74). Antes levava a Informações do evento, que não tem status desde 20/11 (EVT-15).
    publicar: "/backstage/evento/visao-geral?status=publicar",
};

/* Passos da organização: o protótipo não tem estado real para eles, então contam como feitos ao abrir a tela (GDC-62). */
const VISITAS = [
    { id: "ajustes", rota: "/backstage/ajustes", rotulo: "Revise os ajustes da organização", acao: "Revisar" },
    { id: "membros", rota: "/backstage/membros", rotulo: "Confira quem faz parte da equipe", acao: "Conferir" },
] as const;
type VisitaId = (typeof VISITAS)[number]["id"];

const chaveDasVisitas = (orgId: string | null) => `backstage-guia-organizacao:${orgId ?? "padrao"}`;
const ouvintes = new Set<() => void>();
const lerVisitas = (orgId: string | null): string => {
    try {
        return window.localStorage.getItem(chaveDasVisitas(orgId)) ?? "";
    } catch {
        return "";
    }
};
const marcarVisita = (orgId: string | null, id: VisitaId) => {
    const atuais = lerVisitas(orgId).split(",").filter(Boolean);
    if (atuais.includes(id)) return;
    try {
        window.localStorage.setItem(chaveDasVisitas(orgId), [...atuais, id].join(","));
    } catch {
        /* sem storage, o passo só não fica gravado */
    }
    ouvintes.forEach((o) => o());
};

/** Primeiro pendente e desbloqueado é o atual (GDC-06). */
function resolver(passos: Array<Omit<PassoDaEtapa, "status"> & { feito: boolean }>): PassoDaEtapa[] {
    const atual = passos.find((p) => !p.feito && !p.bloqueado) ?? passos.find((p) => !p.feito);
    return passos.map(({ feito, ...p }) => ({ ...p, status: feito ? "complete" : p.id === atual?.id ? "current" : "incomplete" }));
}

interface Opcoes {
    guiaDoEvento: Guia;
    /** Na tela do evento, publicar abre o modal de status já em Publicado (GDC-11). */
    abrirModalDeStatus?: (status: "publicado") => void;
    /** Chamado antes de seguir para o passo (fecha o painel no celular, por exemplo). */
    aoIr?: () => void;
}

export function useEtapas({ guiaDoEvento, abrirModalDeStatus, aoIr }: Opcoes): Etapa[] {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const orgId = organizacaoAtualId();
    useEventosVersao();
    const evento = useEventoAtual();
    const semEventos = semEventosNaOrganizacao();
    const visitas = useSyncExternalStore(
        (fn) => {
            ouvintes.add(fn);
            return () => ouvintes.delete(fn);
        },
        () => lerVisitas(orgId),
        () => "",
    );

    // Abrir a tela conta como feito (GDC-62).
    useEffect(() => {
        const visita = VISITAS.find((v) => pathname.startsWith(v.rota));
        if (visita) marcarVisita(orgId, visita.id);
    }, [pathname, orgId]);

    return useMemo(() => {
        const ir = (rota: string) => () => {
            aoIr?.();
            navigate(rota);
        };

        const organizacao = resolver(
            VISITAS.map((v) => ({ id: v.id, rotulo: v.rotulo, acao: v.acao, bloqueado: false, feito: visitas.split(",").includes(v.id), ir: ir(v.rota) })),
        );
        const primeiroEvento = resolver([
            { id: "criar-evento", rotulo: "Crie o primeiro evento", acao: "Criar", bloqueado: false, feito: !semEventos, ir: ir("/backstage/eventos/novo") },
        ]);
        const doEvento: PassoDaEtapa[] = guiaDoEvento.passos.map((p) => ({
            id: p.id,
            rotulo: p.rotulo,
            acao: p.acao,
            motivo: p.motivo,
            status: semEventos ? "incomplete" : p.status,
            bloqueado: semEventos || p.bloqueado,
            ir:
                p.id === "publicar" && abrirModalDeStatus
                    ? () => {
                          aoIr?.();
                          abrirModalDeStatus("publicado");
                      }
                    : ir(ROTAS_DO_EVENTO[p.id]),
        }));

        const etapa = (id: EtapaId, rotulo: string, passos: PassoDaEtapa[], extra: Partial<Etapa> = {}): Etapa => ({
            id,
            rotulo,
            passos,
            feita: passos.every((p) => p.status === "complete"),
            bloqueada: false,
            ...extra,
        });

        return [
            etapa("organizacao", "Organização", organizacao),
            etapa("primeiro-evento", "Crie o primeiro evento", primeiroEvento),
            etapa("evento", "Configure o evento", doEvento, {
                descricao: semEventos ? undefined : evento.nome,
                bloqueada: semEventos,
                motivo: "Crie o primeiro evento antes",
            }),
        ];
    }, [visitas, semEventos, guiaDoEvento.passos, evento.nome, navigate, aoIr, abrirModalDeStatus]);
}
