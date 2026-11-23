import { useCallback, useEffect, useMemo, useState } from "react";
import { SlashCircle01, XClose } from "@untitledui/icons";
import {
    Dialog as AriaDialog,
    Modal as AriaModal,
    ModalOverlay as AriaModalOverlay,
} from "react-aria-components";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { cx } from "@/utils/cx";
import { RodapeDePaginacao, usePaginacao } from "../../components/rodape-de-paginacao";
import { BarraDaLista, CabecalhoDaTabela, CartaoDaTabela, Celula, LinhaDaTabela, SemResultados, TituloDaLinha } from "../../components/tabela";
import {
    useCortesiasStore,
    type Pedido as PedidoSummaryStore,
    type PedidoStatus as StorePedidoStatus,
} from "../data/cortesias-store";
import { ITEM_STATUS_SELO, statusDoDestinatario, type CortesiaItem } from "../data/item-types";
import { SeloDeStatus } from "../../components/estado-de-pedido";
import { CancelConfirmModal } from "./CancelConfirmModal";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type PedidoStatus = StorePedidoStatus;

export type PedidoSummary = PedidoSummaryStore;

type ItemStatus = CortesiaItem["status"];

/* ------------------------------------------------------------------ */
/*  Static option lists                                               */
/* ------------------------------------------------------------------ */

/** Filtro de status em botões segmentados (BKS-111): Processando e Com erro só quando há item assim. */
const ITEM_STATUS_FILTRO: { id: ItemStatus; label: string; sempre?: boolean }[] = [
    { id: "aceito", label: "Aceitos", sempre: true },
    { id: "pendente", label: "Pendentes", sempre: true },
    { id: "cancelado", label: "Cancelados", sempre: true },
    { id: "processando", label: "Processando" },
    { id: "erro", label: "Com erro" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export interface PedidoDetailsSlideOutProps {
    isOpen: boolean;
    pedido: PedidoSummary | null;
    /** If provided, only items for this destinatário are shown / cancellable. */
    destinatarioEmail?: string | null;
    onClose: () => void;
    onCancelPedido: (id: string) => void;
}

export function PedidoDetailsSlideOut({
    isOpen,
    pedido,
    destinatarioEmail,
    onClose,
    onCancelPedido,
}: PedidoDetailsSlideOutProps) {
    const {
        itens: allItens,
        cancelItens: storeCancelItens,
    } = useCortesiasStore();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<"todos" | ItemStatus>("todos");
    const [showCancelPedidoConfirm, setShowCancelPedidoConfirm] = useState(false);
    const [showCancelSelectedConfirm, setShowCancelSelectedConfirm] = useState(false);

    const itens = useMemo(() => {
        if (!pedido) return [];
        return allItens.filter((it) => {
            if (it.pedidoId !== pedido.id) return false;
            if (destinatarioEmail && it.email !== destinatarioEmail) return false;
            return true;
        });
    }, [allItens, pedido, destinatarioEmail]);

    // Reset transient state every time the slideout opens for a different pedido.
    useEffect(() => {
        if (isOpen && pedido) {
            setSelectedIds(new Set());
            setSearch("");
            setStatus("todos");
            setShowCancelPedidoConfirm(false);
            setShowCancelSelectedConfirm(false);
        }
    }, [isOpen, pedido, destinatarioEmail]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return itens.filter((it) => {
            if (status !== "todos" && it.status !== status) return false;
            if (q) {
                const matches =
                    it.id.toLowerCase().includes(q) ||
                    it.nome.toLowerCase().includes(q) ||
                    it.email.toLowerCase().includes(q) ||
                    it.documento.toLowerCase().includes(q);
                if (!matches) return false;
            }
            return true;
        });
    }, [itens, search, status]);

    // Busca, filtro ou tamanho novo voltam à página 1 (BKS-114).
    const paginacao = usePaginacao(filtered, [search, status, pedido?.id, destinatarioEmail]);
    const visibleRows = paginacao.visiveis;
    const statusOptions = ITEM_STATUS_FILTRO.filter((o) => o.sempre || o.id === status || itens.some((it) => it.status === o.id));

    const toggleSelect = useCallback((id: string, isSelected: boolean) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (isSelected) next.add(id);
            else next.delete(id);
            return next;
        });
    }, []);

    const toggleAllOnPage = useCallback(
        (isSelected: boolean) => {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                for (const row of visibleRows) {
                    if (row.status === "cancelado" || row.status === "erro") continue;
                    if (isSelected) next.add(row.id);
                    else next.delete(row.id);
                }
                return next;
            });
        },
        [visibleRows],
    );

    const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

    const requestCancelSelected = useCallback(() => {
        if (selectedIds.size === 0) return;
        setShowCancelSelectedConfirm(true);
    }, [selectedIds]);

    const confirmCancelSelected = useCallback(() => {
        storeCancelItens(selectedIds);
        setSelectedIds(new Set());
        setShowCancelSelectedConfirm(false);
    }, [selectedIds, storeCancelItens]);

    const requestCancelPedido = useCallback(() => {
        setShowCancelPedidoConfirm(true);
    }, []);

    const confirmCancelPedido = useCallback(() => {
        if (!pedido) return;
        // Parent handler calls store.cancelPedido which already cascades to items.
        onCancelPedido(pedido.id);
        setShowCancelPedidoConfirm(false);
    }, [pedido, onCancelPedido]);

    const selectedItensList = useMemo(
        () => itens.filter((it) => selectedIds.has(it.id)),
        [itens, selectedIds],
    );

    const selectableVisibleRows = useMemo(
        () =>
            visibleRows.filter(
                (r) => r.status !== "cancelado" && r.status !== "erro",
            ),
        [visibleRows],
    );
    const pageSelectedCount = selectableVisibleRows.reduce(
        (acc, r) => acc + (selectedIds.has(r.id) ? 1 : 0),
        0,
    );
    const allOnPageSelected =
        selectableVisibleRows.length > 0 &&
        pageSelectedCount === selectableVisibleRows.length;
    const someOnPageSelected = pageSelectedCount > 0 && !allOnPageSelected;

    // Aberto pela linha de um destinatário, o status e o cancelamento são dele (COR-51); senão, do envio.
    const doDestinatario = destinatarioEmail ? statusDoDestinatario(itens) : null;
    const isPedidoCancelado = doDestinatario ? doDestinatario.status === "cancelado" : pedido?.status === "cancelado";

    return (
        <>
        <AriaModalOverlay
            isOpen={isOpen}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
            isDismissable
            className={({ isEntering, isExiting }) =>
                cx(
                    "fixed inset-0 z-50 flex justify-end bg-overlay/70 outline-hidden backdrop-blur-[2px]",
                    isEntering && "duration-300 ease-out animate-in fade-in",
                    isExiting && "duration-200 ease-in animate-out fade-out",
                )
            }
        >
            <AriaModal
                className={({ isEntering, isExiting }) =>
                    cx(
                        "h-full w-full max-w-[760px] bg-primary shadow-xl outline-hidden",
                        isEntering && "duration-300 ease-out animate-in slide-in-from-right",
                        isExiting && "duration-200 ease-in animate-out slide-out-to-right",
                    )
                }
            >
                <AriaDialog className="flex h-full flex-col outline-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-4 border-b border-secondary px-6 py-5">
                        <h2 className="text-lg font-semibold text-primary">
                            Detalhes do pedido
                        </h2>
                        <ButtonUtility
                            size="sm"
                            color="tertiary"
                            icon={XClose}
                            tooltip="Fechar"
                            onClick={onClose}
                        />
                    </div>

                    {/* Scrollable content */}
                    <div className="flex flex-1 flex-col overflow-y-auto">
                        {pedido && (
                            <div className="flex flex-col gap-4 px-6 pt-6 pb-5">
                                <h3
                                    className="text-md font-semibold break-words text-primary"
                                    title={pedido.nome}
                                >
                                    {pedido.nome}
                                </h3>
                                <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                                    <DetailRow label="Status:">
                                        {doDestinatario ? (
                                            <SeloDeStatus status={doDestinatario.status} rotulo={doDestinatario.rotulo} />
                                        ) : (
                                            <SeloDeStatus status={pedido.status} />
                                        )}
                                    </DetailRow>
                                    <DetailRow label="Emissor responsável:">
                                        <span className="text-sm text-secondary">
                                            {pedido.emissor}
                                        </span>
                                    </DetailRow>
                                    <DetailRow label="ID do pedido:">
                                        <span
                                            className="text-sm break-all text-secondary"
                                            title={pedido.id}
                                        >
                                            {pedido.id}
                                        </span>
                                    </DetailRow>
                                    <DetailRow label="Data de envio:">
                                        <span className="text-sm text-secondary">
                                            {pedido.dataEnvio}
                                        </span>
                                    </DetailRow>
                                </dl>
                            </div>
                        )}

                        <div className="mx-6 border-t border-secondary" />

                        <div className="flex flex-col gap-3 px-6 pt-5 pb-4">
                            <h3 className="text-md font-semibold text-primary">Ações</h3>
                            <div>
                                <Button
                                    size="sm"
                                    color="secondary"
                                    iconLeading={SlashCircle01}
                                    isDisabled={isPedidoCancelado}
                                    onClick={requestCancelPedido}
                                >
                                    {destinatarioEmail ? "Cancelar destinatário" : "Cancelar pedido completo"}
                                </Button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 px-6 pb-6">
                            <BarraDaLista
                                busca={{ valor: search, onChange: setSearch, placeholder: "Buscar por nome, e-mail, ID ou documento" }}
                                filtro={
                                    <ButtonGroup
                                        size="sm"
                                        aria-label="Status"
                                        disallowEmptySelection
                                        selectedKeys={[status]}
                                        onSelectionChange={(keys) => {
                                            const [k] = [...keys];
                                            if (k !== undefined) setStatus(String(k) as "todos" | ItemStatus);
                                        }}
                                        className="w-full sm:w-max"
                                    >
                                        {[{ id: "todos", label: "Todos" }, ...statusOptions].map((o) => (
                                            <ButtonGroupItem key={o.id} id={o.id} className="flex-1 justify-center sm:flex-none">
                                                {o.label}
                                            </ButtonGroupItem>
                                        ))}
                                    </ButtonGroup>
                                }
                            />
                            <CartaoDaTabela>
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-secondary bg-secondary px-5 py-3 md:px-6">
                                    <div className="flex items-center gap-4">
                                        {/* No modo lista o cabeçalho das colunas some: o "selecionar todos" vem para cá. */}
                                        <Checkbox
                                            aria-label="Selecionar todos da página"
                                            isSelected={allOnPageSelected}
                                            isIndeterminate={someOnPageSelected}
                                            onChange={toggleAllOnPage}
                                            className="@min-[44rem]:hidden"
                                        />
                                        <p className="text-sm text-tertiary">
                                            {selectedIds.size === 0
                                                ? "Nenhum item selecionado"
                                                : `${selectedIds.size} ${selectedIds.size === 1 ? "item selecionado" : "itens selecionados"}`}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                            size="sm"
                                            color="secondary"
                                            iconLeading={XClose}
                                            isDisabled={selectedIds.size === 0}
                                            onClick={clearSelection}
                                        >
                                            Limpar seleção
                                        </Button>
                                        <Button
                                            size="sm"
                                            color="primary-destructive"
                                            iconLeading={SlashCircle01}
                                            isDisabled={selectedIds.size === 0}
                                            onClick={requestCancelSelected}
                                        >
                                            Cancelar itens selecionados
                                        </Button>
                                    </div>
                                </div>

                                <CabecalhoDaTabela ordenavel>
                                    <Checkbox
                                        aria-label="Selecionar todos da página"
                                        isSelected={allOnPageSelected}
                                        isIndeterminate={someOnPageSelected}
                                        onChange={toggleAllOnPage}
                                        className="shrink-0"
                                    />
                                    <span className="min-w-0 flex-1">Item</span>
                                    <span className="w-40">Status</span>
                                    <span className="min-w-0 flex-1">Destinatário</span>
                                </CabecalhoDaTabela>

                                {filtered.length === 0 ? (
                                    <SemResultados
                                        texto="Nenhum item encontrado."
                                        onLimpar={() => {
                                            setSearch("");
                                            setStatus("todos");
                                        }}
                                    />
                                ) : (
                                    <ul className="flex flex-col divide-y divide-secondary">
                                        {visibleRows.map((row) => (
                                            <ItemRow key={row.id} row={row} isSelected={selectedIds.has(row.id)} onToggleSelect={toggleSelect} />
                                        ))}
                                    </ul>
                                )}

                                <RodapeDePaginacao {...paginacao} />
                            </CartaoDaTabela>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-2 border-t border-secondary px-6 py-4">
                        <Button size="sm" color="secondary" onClick={onClose}>
                            Fechar
                        </Button>
                    </div>
                </AriaDialog>
            </AriaModal>
        </AriaModalOverlay>

        <CancelConfirmModal
            isOpen={showCancelPedidoConfirm}
            onClose={() => setShowCancelPedidoConfirm(false)}
            onConfirm={confirmCancelPedido}
            title={destinatarioEmail ? "Cancelar este destinatário?" : "Cancelar este pedido de cortesia?"}
            description={
                destinatarioEmail ? (
                    <>
                        Você está prestes a cancelar os itens enviados para{" "}
                        <span className="font-medium break-all text-primary">{destinatarioEmail}</span> no pedido{" "}
                        <span className="font-medium text-primary">{pedido?.nome}</span>. Os QR codes serão invalidados e essa ação não pode ser desfeita.
                    </>
                ) : (
                    <>
                        Você está prestes a cancelar o pedido <span className="font-medium text-primary">{pedido?.id}</span>. Isso interromperá o envio para
                        todos os destinatários vinculados a este pedido. Esta ação não pode ser desfeita.
                    </>
                )
            }
            confirmLabel={destinatarioEmail ? "Cancelar destinatário" : "Cancelar pedido"}
            cancelLabel={destinatarioEmail ? "Manter destinatário" : "Manter pedido"}
        />

        <CancelConfirmModal
            isOpen={showCancelSelectedConfirm}
            onClose={() => setShowCancelSelectedConfirm(false)}
            onConfirm={confirmCancelSelected}
            title={`Cancelar ${selectedItensList.length} ${selectedItensList.length === 1 ? "item selecionado" : "itens selecionados"}?`}
            description="Os itens selecionados terão os QR codes invalidados e você precisará gerar novos convites caso mude de ideia."
            listLabel="Itens cancelados"
            listItems={selectedItensList.map((it) => (
                <div className="flex flex-col">
                    <span className="font-medium text-primary">{it.nome}</span>
                    <span className="text-sm text-tertiary">{it.subtitulo}</span>
                </div>
            ))}
            confirmLabel="Cancelar itens"
            cancelLabel="Manter itens"
        />
        </>
    );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

interface DetailRowProps {
    label: string;
    children: React.ReactNode;
}

const DetailRow = ({ label, children }: DetailRowProps) => (
    <div className="flex flex-wrap items-center gap-2">
        <dt className="text-sm text-tertiary">{label}</dt>
        <dd className="text-sm text-secondary">{children}</dd>
    </div>
);

/** Uma linha por item: tabela a partir de 704 px de cartão; abaixo, bloco com rótulos (BKS-115). */
const ItemRow = ({ row, isSelected, onToggleSelect }: { row: CortesiaItem; isSelected: boolean; onToggleSelect: (id: string, selected: boolean) => void }) => {
    const showEmail = row.status !== "cancelado" || row.email;
    const isCheckboxDisabled = row.status === "cancelado" || row.status === "erro";
    return (
        <LinhaDaTabela interativa selecionada={isSelected}>
            <Checkbox
                aria-label={`Selecionar item ${row.id}`}
                isSelected={isSelected}
                isDisabled={isCheckboxDisabled}
                onChange={(s) => onToggleSelect(row.id, s)}
                className="mt-0.5 shrink-0 @min-[44rem]:mt-0"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 @min-[44rem]:flex-row @min-[44rem]:items-center @min-[44rem]:gap-4">
                <TituloDaLinha titulo={row.nome} apoio={row.subtitulo} />
                <Celula rotulo="Status" className="@min-[44rem]:w-40">
                    <SeloDeStatus status={ITEM_STATUS_SELO[row.status]} />
                </Celula>
                <Celula rotulo="Destinatário" className="@min-[44rem]:min-w-0 @min-[44rem]:flex-1">
                    {row.status === "cancelado" && !showEmail ? (
                        <span className="text-tertiary">-</span>
                    ) : (
                        <span className="flex min-w-0 flex-1 flex-col">
                            <span className="flex min-w-0 items-center gap-2">
                                <span className="break-all">{row.email}</span>
                                {row.transferido && (
                                    <Badge size="sm" color="gray" type="modern" className="shrink-0">
                                        Transferido
                                    </Badge>
                                )}
                            </span>
                            <span className="truncate text-tertiary">Documento: {row.documento}</span>
                        </span>
                    )}
                </Celula>
            </div>
        </LinhaDaTabela>
    );
};
