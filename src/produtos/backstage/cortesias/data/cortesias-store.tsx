import { createContext, useCallback, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { cancelarIngresso, cancelarItemDeCortesia, cancelarPedido, emitirCortesias, novoId, renomearEnvio, useColecao, useDoc, type ItemDeCortesia } from "@/plataforma";
import { useEventoAtual } from "../../eventos/data/eventos";
import { usePainel } from "../../components/painel";
import { nomeDoMembro, useMembroLogado } from "../../components/membros-store";
import { USUARIO as USUARIO_FREEPASS } from "../../freepass/data/minhas-vendas";
import type { CortesiaItem, ItemStatus } from "./item-types";
import { getItemDetails } from "./cortesia-items";
import { dataDaSessao, referenciaDoItem, useCatalogoDeCortesia } from "./plataforma";

/*
 * Cortesias do evento em contexto, lidas e gravadas no banco unificado (src/plataforma).
 * Um envio vira um pedido por destinatário, no canal cortesia, já emitido: o ingresso vai para a
 * carteira do e-mail. "Pedido" nesta tela é o envio inteiro (todos os destinatários).
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type PedidoStatus = "emitido" | "cancelado";

export interface Pedido {
    id: string;
    nome: string;
    emissor: string;
    status: PedidoStatus;
    dataEnvio: string;
}

export interface AddPedidoInput {
    nome: string;
    emails: string[];
    itemIds: string[];
    emissor?: string;
}

interface CortesiasStoreValue {
    pedidos: Pedido[];
    itens: CortesiaItem[];
    addPedido: (input: AddPedidoInput) => Pedido;
    cancelPedido: (id: string) => void;
    cancelPedidos: (ids: Set<string>) => void;
    cancelItem: (id: string) => void;
    cancelItens: (ids: Set<string>) => void;
    renamePedido: (id: string, nome: string) => void;
}

const CortesiasContext = createContext<CortesiasStoreValue | null>(null);

/** Sem membro na organização (banco ainda carregando): o envio sai em nome do Backstage. */
const EMISSOR_SEM_MEMBRO = "Backstage";

/** Linha de produto ou combo no relatório: `<pedido>#<índice da linha no pedido>`. */
const idDaLinha = (pedidoId: string, indice: number) => `${pedidoId}#${indice}`;
const lerIdDaLinha = (id: string) => {
    const i = id.lastIndexOf("#");
    return i > 0 ? { pedidoId: id.slice(0, i), indice: Number(id.slice(i + 1)) } : null;
};

/** Data de envio com `Intl`: "2 out 2026, 23:00" (UI-TXT-009). */
const FORMATO_DE_DATA = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const formatar = (iso: string) =>
    FORMATO_DE_DATA.formatToParts(new Date(iso))
        .map((p) => (p.type === "month" ? p.value.replace(".", "") : p.type === "literal" ? p.value.replace(/ de /g, " ") : p.value))
        .join("")
        .replace(/\s+/g, " ");

/* ------------------------------------------------------------------ */
/*  Provider                                                          */
/* ------------------------------------------------------------------ */

export function CortesiasProvider({ children }: { children: ReactNode }) {
    // Mantém o catálogo de cortesia (SESSIONS) igual ao do evento em contexto.
    useCatalogoDeCortesia();
    const evento = useEventoAtual();
    const pedidosBanco = useColecao("pedidos");
    const ingressosBanco = useColecao("ingressos");
    const usuarios = useColecao("usuarios");
    const eventoDoc = useDoc("eventos", evento.id);
    // No Freepass a pessoa vê e emite só as próprias cortesias (COR-93).
    const soDoEmissor = usePainel() === "freepass" ? USUARIO_FREEPASS.nome : null;
    // No Backstage, quem emite é o membro logado (MEM-67); envios antigos mantêm o emissor gravado.
    const emissorLogado = nomeDoMembro(useMembroLogado()) || EMISSOR_SEM_MEMBRO;

    const doEvento = useMemo(
        () =>
            pedidosBanco
                .filter((p) => p.canal === "cortesia" && p.eventoId === evento.id && p.envio && (!soDoEmissor || p.envio.emissor === soDoEmissor))
                .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
        [pedidosBanco, evento.id, soDoEmissor],
    );

    const itens = useMemo<CortesiaItem[]>(() => {
        const comConta = new Set(usuarios.map((u) => u.email));
        const envioDoPedido = new Map(doEvento.map((p) => [p.id, p]));
        // Ingresso que veio dentro de um combo aparece na linha do combo, não sozinho.
        const ingressos = ingressosBanco
            .filter((i) => envioDoPedido.has(i.pedidoId) && !i.comboId)
            .map((i) => {
                const pedido = envioDoPedido.get(i.pedidoId)!;
                const inicio = eventoDoc?.sessoes.find((s) => s.id === i.sessaoId)?.inicio;
                const sessao = inicio ? dataDaSessao(inicio) : "";
                // Sem conta Ingresse o ingresso fica pendente até o cadastro com o mesmo e-mail.
                const status: ItemStatus = i.status === "cancelado" ? "cancelado" : comConta.has(i.titular.email) ? "aceito" : "pendente";
                return {
                    id: i.id,
                    kind: "ticket" as const,
                    nome: i.rotulo.ingresso,
                    // Grupo e sessão em frase, sem separador (UI-TXT-010).
                    subtitulo: [i.rotulo.grupo, sessao].filter(Boolean).join(", "),
                    status,
                    emissor: pedido.envio!.emissor,
                    email: i.titular.email,
                    documento: "—",
                    transferido: i.status === "transferido",
                    pedidoId: pedido.envio!.id,
                };
            });
        // Produtos e combos: uma linha por linha do pedido de cada destinatário.
        const linhas = doEvento.flatMap((pedido) =>
            pedido.itens.flatMap((item, indice): CortesiaItem[] => {
                if (item.tipo !== "produto" || (!item.produtoId && !item.comboId)) return [];
                const status: ItemStatus = item.cancelado || pedido.status === "cancelado" ? "cancelado" : comConta.has(pedido.comprador.email) ? "aceito" : "pendente";
                return [
                    {
                        id: idDaLinha(pedido.id, indice),
                        kind: item.comboId ? "combo" : "product",
                        nome: item.nome,
                        subtitulo: item.detalhe ?? (item.comboId ? "Combo" : "Produto"),
                        status,
                        emissor: pedido.envio!.emissor,
                        email: pedido.comprador.email,
                        documento: "—",
                        transferido: false,
                        pedidoId: pedido.envio!.id,
                    },
                ];
            }),
        );
        return [...ingressos, ...linhas];
    }, [ingressosBanco, doEvento, usuarios, eventoDoc]);

    // Status do envio pelos itens (COR-51): cancelar os itens de todos os destinatários cancela o envio, mesmo
    // que o pedido no banco siga emitido. Até 22/11/2026 vinha só do status dos pedidos e nunca mudava pela tela.
    const pedidos = useMemo<Pedido[]>(() => {
        const porEnvio = new Map<string, typeof doEvento>();
        for (const p of doEvento) porEnvio.set(p.envio!.id, [...(porEnvio.get(p.envio!.id) ?? []), p]);
        const itensPorEnvio = new Map<string, CortesiaItem[]>();
        for (const i of itens) itensPorEnvio.set(i.pedidoId, [...(itensPorEnvio.get(i.pedidoId) ?? []), i]);
        return [...porEnvio.entries()].map(([id, lista]) => {
            const doEnvio = itensPorEnvio.get(id) ?? [];
            const cancelado = lista.every((p) => p.status === "cancelado") || (doEnvio.length > 0 && doEnvio.every((i) => i.status === "cancelado"));
            return {
                id,
                nome: lista[0].envio!.nome,
                emissor: lista[0].envio!.emissor,
                status: cancelado ? ("cancelado" as const) : ("emitido" as const),
                dataEnvio: formatar(lista[lista.length - 1].criadoEm),
            };
        });
    }, [doEvento, itens]);

    const addPedido = useCallback(
        (input: AddPedidoInput) => {
            const envio = { id: novoId("env"), nome: input.nome.trim() || "Pedido sem nome", emissor: input.emissor ?? soDoEmissor ?? emissorLogado };
            // Rótulos que a tela já mostra seguem para o pedido (nome do produto, itens do combo).
            const refs = input.itemIds
                .map((id) => {
                    const d = getItemDetails(id);
                    return referenciaDoItem(id, {
                        nome: d?.kind === "product" ? d.name : undefined,
                        detalhe: d?.kind === "combo" ? d.subItems.map((s) => s.name).join(", ") || d.subtitle : undefined,
                    });
                })
                .filter((r): r is ItemDeCortesia => r !== null);
            void emitirCortesias({ eventoId: evento.id, envio, emails: input.emails, itens: refs });
            return { id: envio.id, nome: envio.nome, emissor: envio.emissor, status: "emitido" as const, dataEnvio: formatar(new Date().toISOString()) };
        },
        [evento.id, soDoEmissor, emissorLogado],
    );

    const pedidosDoEnvio = useCallback((ids: Set<string>) => doEvento.filter((p) => ids.has(p.envio!.id)), [doEvento]);

    const cancelPedidos = useCallback((ids: Set<string>) => void Promise.all(pedidosDoEnvio(ids).map((p) => cancelarPedido(p.id))), [pedidosDoEnvio]);
    const cancelPedido = useCallback((id: string) => cancelPedidos(new Set([id])), [cancelPedidos]);
    const cancelItens = useCallback(
        (ids: Set<string>) =>
            void Promise.all(
                [...ids].map((id) => {
                    const linha = lerIdDaLinha(id);
                    return linha ? cancelarItemDeCortesia(linha.pedidoId, linha.indice) : cancelarIngresso(id);
                }),
            ),
        [],
    );
    const cancelItem = useCallback((id: string) => cancelItens(new Set([id])), [cancelItens]);
    const renamePedido = useCallback((id: string, nome: string) => {
        const next = nome.trim();
        if (next) void renomearEnvio(id, next);
    }, []);

    return (
        <CortesiasContext.Provider value={{ pedidos, itens, addPedido, cancelPedido, cancelPedidos, cancelItem, cancelItens, renamePedido }}>
            {children}
        </CortesiasContext.Provider>
    );
}

export function useCortesiasStore() {
    const ctx = useContext(CortesiasContext);
    if (!ctx) {
        throw new Error("useCortesiasStore must be used inside CortesiasProvider");
    }
    return ctx;
}
