import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type Key,
    type KeyboardEvent,
} from "react";
import { useNavigate } from "react-router";
import {
    Check,
    DownloadCloud01,
    Edit01,
    Eye,
    Gift01,
    RefreshCcw01,
    SlashCircle01,
    XClose
} from "@untitledui/icons";
import type { Selection } from "react-aria-components";
import { Button } from "@/components/base/buttons/button";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { InputBase } from "@/components/base/input/input";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { MultiSelect } from "@/components/base/select/multi-select";
import { Tabs } from "@/components/application/tabs/tabs";
import { useRotaDoPainel } from "../../components/painel";
import { BackstageLayout } from "../../components/Backstage";
import { RodapeDePaginacao, usePaginacao } from "../../components/rodape-de-paginacao";
import { BarraDaLista, CabecalhoDaTabela, CartaoDaTabela, Celula, LinhaDaTabela, SemResultados, TituloDaLinha, VazioDaTabela } from "../../components/tabela";
import { CancelConfirmModal } from "../components/CancelConfirmModal";
import { ItemDetailsSlideOut } from "../components/ItemDetailsSlideOut";
import { PedidoDetailsSlideOut } from "../components/PedidoDetailsSlideOut";
import { ITEM_KIND_LABEL, ITEM_KIND_OPTIONS, ITEM_STATUS_META, ITEM_STATUS_SELO, statusDoDestinatario, type CortesiaItem, type ItemStatus } from "../data/item-types";
import { useCortesiasStore } from "../data/cortesias-store";
import { MetricasDaLista, SeloDeStatus } from "../../components/estado-de-pedido";
import { baixarCsv, nomeComData } from "../utils/baixar-csv";
import { showSuccessToast } from "../utils/toast";
import { TituloDaEmissao } from "@/produtos/backstage/components/navegacao-de-secao";


/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

/** Status de um destinatário, pelos itens dele (COR-51). */
type StatusDoDestinatario = "emitido" | "parcial" | "cancelado";
type FiltroPedido = "todos" | StatusDoDestinatario;
type FiltroItem = "todos" | ItemStatus;

/** Filtro de status da aba Pedidos, em botões segmentados (BKS-111). */
const PEDIDO_STATUS_FILTRO: { id: FiltroPedido; label: string }[] = [
    { id: "todos", label: "Todos" },
    { id: "emitido", label: "Emitidos" },
    { id: "parcial", label: "Parciais" },
    { id: "cancelado", label: "Cancelados" },
];

/** Rótulos curtos do filtro de status da aba Itens: os quatro cabem em 390 px. */
const ITEM_STATUS_FILTRO: Record<ItemStatus, string> = {
    aceito: "Aceitos",
    pendente: "Pendentes",
    cancelado: "Cancelados",
    processando: "Processando",
    erro: "Com erro",
};
const ORDEM_DO_FILTRO: ItemStatus[] = ["aceito", "pendente", "cancelado", "processando", "erro"];
/** Processando e Com erro só entram no filtro quando há item assim (a emissão hoje é imediata). */
const SEMPRE_NO_FILTRO: ItemStatus[] = ["aceito", "pendente", "cancelado"];

/** Larguras das colunas no modo tabela (cartão com 704 px ou mais, BKS-115). */
const COL = {
    flex: "@min-[44rem]:min-w-0 @min-[44rem]:flex-1",
    itens: "@min-[44rem]:w-12",
    statusPedido: "@min-[44rem]:w-44",
    envio: "@min-[44rem]:w-32",
    statusItem: "@min-[44rem]:w-40",
    emissor: "@min-[44rem]:w-28",
};

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export function RelatorioPedidos() {
    const navigate = useNavigate();
    const { pedidos } = useCortesiasStore();
    const [activeTab, setActiveTab] = useState<"pedidos" | "itens">("pedidos");

    const rota = useRotaDoPainel();
    const handleEmitir = useCallback(() => navigate(rota("/backstage/itens")), [navigate, rota]);

    const isEmpty = pedidos.length === 0;

    return (
        <BackstageLayout activeSection="cortesias" activeItem="emissao-cortesias">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
                {isEmpty ? (
                    <>
                        {/* O título fica também no vazio (COR-01): a ação mora no próprio vazio, então o topo não repete o botão. */}
                        <TituloDaEmissao>Cortesias</TituloDaEmissao>
                        {/* Lista vazia: o estado vazio do DS com a ação principal (BKS-117). */}
                        <VazioDaTabela
                            icone={Gift01}
                            titulo="Distribua itens para convidados especiais"
                            texto="Leve mais pessoas para o seu evento com convites exclusivos e fáceis de enviar."
                            acao={
                                <Button size="md" color="primary" onClick={handleEmitir}>
                                    Emitir cortesias
                                </Button>
                            }
                        />
                    </>
                ) : (
                    <>
                        <PageHeader onEmitir={handleEmitir} />
                        <main className="flex flex-1 flex-col gap-6">
                            <Tabs
                                selectedKey={activeTab}
                                onSelectionChange={(key: Key) =>
                                    setActiveTab(key as "pedidos" | "itens")
                                }
                            >
                                <Tabs.List type="underline" size="sm">
                                    <Tabs.Item id="pedidos">Pedidos</Tabs.Item>
                                    <Tabs.Item id="itens">Itens</Tabs.Item>
                                </Tabs.List>
                            </Tabs>

                            {activeTab === "pedidos" ? (
                                <PedidosTabView />
                            ) : (
                                <ItensTabView />
                            )}
                        </main>
                    </>
                )}
            </div>
        </BackstageLayout>
    );
}

/* ------------------------------------------------------------------ */
/*  Page header                                                       */
/* ------------------------------------------------------------------ */

interface PageHeaderProps {
    onEmitir: () => void;
}

const PageHeader = ({ onEmitir }: PageHeaderProps) => (
    <TituloDaEmissao
        acoes={
            <Button size="md" color="primary" onClick={onEmitir}>
                Emitir cortesia
            </Button>
        }
    >
        Cortesias
    </TituloDaEmissao>
);

/* ------------------------------------------------------------------ */
/*  Filtros                                                           */
/* ------------------------------------------------------------------ */

/** Filtro de status: botões segmentados do DS, na largura toda no celular (BKS-111). */
function FiltroDeStatus<T extends string>({
    valor,
    opcoes,
    onChange,
}: {
    valor: T;
    opcoes: { id: T; label: string }[];
    onChange: (v: T) => void;
}) {
    return (
        <ButtonGroup
            size="sm"
            aria-label="Status"
            disallowEmptySelection
            selectedKeys={[valor]}
            onSelectionChange={(keys) => {
                const [k] = [...keys];
                if (k !== undefined) onChange(String(k) as T);
            }}
            className="w-full sm:w-max"
        >
            {opcoes.map((o) => (
                <ButtonGroupItem key={o.id} id={o.id} className="flex-1 justify-center sm:flex-none">
                    {o.label}
                </ButtonGroupItem>
            ))}
        </ButtonGroup>
    );
}

/** Filtro de seleção múltipla (Tipo do item, Emissor responsável), sem rótulo visível: o "Todos" diz o quê. */
const FiltroMultiplo = ({
    rotulo,
    todos,
    keys,
    onChange,
    options,
    showSearch = false,
}: {
    rotulo: string;
    todos: string;
    keys: Set<string>;
    onChange: (keys: Set<string>) => void;
    options: { id: string; label: string }[];
    showSearch?: boolean;
}) => {
    const handleSelection = (selection: Selection) =>
        onChange(selection === "all" ? new Set(options.map((o) => o.id)) : new Set(Array.from(selection).map(String)));
    return (
        <div className="w-full sm:w-52">
            <MultiSelect
                size="sm"
                aria-label={rotulo}
                placeholder={todos}
                items={options}
                selectedKeys={keys}
                onSelectionChange={handleSelection}
                onReset={() => onChange(new Set())}
                onSelectAll={() => onChange(new Set(options.map((o) => o.id)))}
                showSearch={showSearch}
                selectedCountFormatter={(count: number) =>
                    count === options.length ? todos : `${count} ${count === 1 ? "selecionado" : "selecionados"}`
                }
            >
                {(item: { id: string; label: string }) => (
                    <MultiSelect.Item id={item.id} selectionIndicator="checkbox" selectionIndicatorAlign="left">
                        {item.label}
                    </MultiSelect.Item>
                )}
            </MultiSelect>
        </div>
    );
};

/* ------------------------------------------------------------------ */
/*  Selection bar                                                     */
/* ------------------------------------------------------------------ */

interface SelectionBarProps {
    selectedCount: number;
    emptyLabel: string;
    singular: string;
    plural: string;
    cancelLabel: string;
    onClear: () => void;
    onCancel: () => void;
    /** "Selecionar todos da página": no modo lista o cabeçalho das colunas some, então ele vem para cá. */
    todos: { isSelected: boolean; isIndeterminate: boolean; onChange: (s: boolean) => void };
    /** Linhas selecionáveis do filtro atual, em todas as páginas (COR-57). */
    totalDoFiltro: number;
    onSelecionarFiltro: () => void;
}

const SelectionBar = ({ selectedCount, emptyLabel, singular, plural, cancelLabel, onClear, onCancel, todos, totalDoFiltro, onSelecionarFiltro }: SelectionBarProps) => {
    // A página toda marcada e o filtro tem mais: oferece marcar todas as páginas de uma vez (COR-57).
    const ofereceFiltro = todos.isSelected && totalDoFiltro > selectedCount;
    const tudoDoFiltro = selectedCount > 0 && selectedCount >= totalDoFiltro && totalDoFiltro > 0;
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-secondary bg-secondary px-5 py-3 md:px-6">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Checkbox aria-label="Selecionar todos da página" {...todos} className="@min-[44rem]:hidden max-md:-m-3.5 max-md:p-3.5" />
                <p className="text-sm text-tertiary" aria-live="polite">
                    {selectedCount === 0
                        ? emptyLabel
                        : tudoDoFiltro && totalDoFiltro > 1
                          ? `Todos os ${totalDoFiltro} ${plural.replace(" selecionados", "")} do filtro selecionados`
                          : `${selectedCount} ${selectedCount === 1 ? singular : plural}`}
                </p>
                {ofereceFiltro && (
                    <Button size="sm" color="link-color" onClick={onSelecionarFiltro} className="max-md:min-h-11">
                        {`Selecionar todos os ${totalDoFiltro} do filtro`}
                    </Button>
                )}
            </div>
            <div className="flex flex-wrap items-center gap-2 max-md:w-full max-md:[&>*]:min-h-11 max-md:[&>*]:flex-1">
                <Button size="sm" color="secondary" isDisabled={selectedCount === 0} onClick={onClear}>
                    Limpar seleção
                </Button>
                <Button size="sm" color="primary-destructive" isDisabled={selectedCount === 0} onClick={onCancel}>
                    {cancelLabel}
                </Button>
            </div>
        </div>
    );
};

/* ------------------------------------------------------------------ */
/*  Pedidos tab                                                       */
/* ------------------------------------------------------------------ */

interface DestinatarioRow {
    rowId: string; // composite "pedidoId|email"
    pedidoId: string;
    pedidoNome: string;
    emissor: string;
    dataEnvio: string;
    email: string;
    documento: string;
    /** Pelos itens deste destinatário, não pelo envio inteiro (COR-51). */
    status: StatusDoDestinatario;
    statusRotulo: string;
    itemIds: string[];
    itemCount: number;
}

const PedidosTabView = () => {
    const {
        pedidos,
        itens,
        cancelItens: storeCancelItens,
        renamePedido,
    } = useCortesiasStore();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<FiltroPedido>("todos");
    const [emissorKeys, setEmissorKeys] = useState<Set<string>>(new Set());
    const [detailsRowId, setDetailsRowId] = useState<string | null>(null);
    const [pendingCancelRowId, setPendingCancelRowId] = useState<string | null>(null);
    const [showCancelSelectedConfirm, setShowCancelSelectedConfirm] = useState(false);

    const destinatarios = useMemo<DestinatarioRow[]>(() => {
        const pedidoById = new Map(pedidos.map((p) => [p.id, p]));
        const groups = new Map<string, DestinatarioRow & { itens: CortesiaItem[] }>();
        for (const item of itens) {
            const pedido = pedidoById.get(item.pedidoId);
            if (!pedido) continue;
            const key = `${item.pedidoId}|${item.email}`;
            const existing = groups.get(key);
            if (existing) {
                existing.itemIds.push(item.id);
                existing.itens.push(item);
                existing.itemCount += 1;
            } else {
                groups.set(key, {
                    rowId: key,
                    pedidoId: pedido.id,
                    pedidoNome: pedido.nome,
                    emissor: pedido.emissor,
                    dataEnvio: pedido.dataEnvio,
                    email: item.email,
                    documento: item.documento,
                    status: "emitido",
                    statusRotulo: "",
                    itemIds: [item.id],
                    itens: [item],
                    itemCount: 1,
                });
            }
        }
        // O status da linha sai dos itens daquele destinatário: Emitido, Parcial com o número ou Cancelado (COR-51).
        return Array.from(groups.values()).map(({ itens: doDestinatario, ...row }) => {
            const st = statusDoDestinatario(doDestinatario);
            return { ...row, status: st.status, statusRotulo: st.rotulo };
        });
    }, [pedidos, itens]);

    const emissorOptions = useMemo(() => {
        const names = Array.from(new Set(destinatarios.map((d) => d.emissor)));
        return names.sort().map((name) => ({ id: name, label: name }));
    }, [destinatarios]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return destinatarios.filter((d) => {
            if (status !== "todos" && d.status !== status) return false;
            if (emissorKeys.size > 0 && !emissorKeys.has(d.emissor)) return false;
            if (q) {
                const matches =
                    d.pedidoId.toLowerCase().includes(q) ||
                    d.pedidoNome.toLowerCase().includes(q) ||
                    d.email.toLowerCase().includes(q) ||
                    d.documento.toLowerCase().includes(q);
                if (!matches) return false;
            }
            return true;
        });
    }, [destinatarios, search, status, emissorKeys]);

    // Busca, filtro ou tamanho novo voltam à página 1 (BKS-114).
    const paginacao = usePaginacao(filtered, [search, status, emissorKeys]);
    const visibleRows = paginacao.visiveis;
    const limparFiltros = () => {
        setSearch("");
        setStatus("todos");
        setEmissorKeys(new Set());
    };

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
                    if (row.status === "cancelado") continue;
                    if (isSelected) next.add(row.rowId);
                    else next.delete(row.rowId);
                }
                return next;
            });
        },
        [visibleRows],
    );

    const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

    const requestCancelRow = useCallback((rowId: string) => {
        setPendingCancelRowId(rowId);
    }, []);

    const confirmCancelRow = useCallback(() => {
        if (!pendingCancelRowId) return;
        const row = destinatarios.find((d) => d.rowId === pendingCancelRowId);
        if (row) storeCancelItens(new Set(row.itemIds));
        setPendingCancelRowId(null);
    }, [pendingCancelRowId, destinatarios, storeCancelItens]);

    const requestCancelSelected = useCallback(() => {
        if (selectedIds.size === 0) return;
        setShowCancelSelectedConfirm(true);
    }, [selectedIds]);

    const confirmCancelSelected = useCallback(() => {
        const itemIds = new Set<string>();
        for (const row of destinatarios) {
            if (selectedIds.has(row.rowId)) {
                for (const id of row.itemIds) itemIds.add(id);
            }
        }
        storeCancelItens(itemIds);
        setSelectedIds(new Set());
        setShowCancelSelectedConfirm(false);
    }, [selectedIds, destinatarios, storeCancelItens]);

    const handleDetails = useCallback((rowId: string) => {
        setDetailsRowId(rowId);
    }, []);

    const handleCloseDetails = useCallback(() => setDetailsRowId(null), []);

    const detailsRow = useMemo(
        () => (detailsRowId ? destinatarios.find((d) => d.rowId === detailsRowId) ?? null : null),
        [detailsRowId, destinatarios],
    );

    const detailsPedido = useMemo(
        () => (detailsRow ? pedidos.find((p) => p.id === detailsRow.pedidoId) ?? null : null),
        [detailsRow, pedidos],
    );

    const pendingCancelRow = useMemo(
        () =>
            pendingCancelRowId
                ? destinatarios.find((d) => d.rowId === pendingCancelRowId) ?? null
                : null,
        [pendingCancelRowId, destinatarios],
    );

    const selectedRowsList = useMemo(
        () => destinatarios.filter((d) => selectedIds.has(d.rowId)),
        [destinatarios, selectedIds],
    );

    // Métricas contam destinatários, a mesma unidade das linhas (COR-58); "Cancelados em parte" só aparece quando há.
    const metrics = useMemo(() => {
        const parciais = destinatarios.filter((d) => d.status === "parcial").length;
        return [
            { rotulo: "Destinatários com cortesia", valor: destinatarios.filter((d) => d.status !== "cancelado").length },
            ...(parciais > 0 ? [{ rotulo: "Cancelados em parte", valor: parciais }] : []),
            { rotulo: "Destinatários cancelados", valor: destinatarios.filter((d) => d.status === "cancelado").length },
        ];
    }, [destinatarios]);

    // "Parciais" só entra no filtro quando há destinatário assim.
    const statusOptions = useMemo(
        () => PEDIDO_STATUS_FILTRO.filter((o) => o.id !== "parcial" || status === "parcial" || destinatarios.some((d) => d.status === "parcial")),
        [destinatarios, status],
    );

    const selecionaveisDoFiltro = useMemo(() => filtered.filter((r) => r.status !== "cancelado"), [filtered]);
    const selecionarFiltro = useCallback(() => setSelectedIds(new Set(selecionaveisDoFiltro.map((r) => r.rowId))), [selecionaveisDoFiltro]);

    // Exporta as linhas do filtro atual, todas as páginas (COR-56).
    const exportar = useCallback(() => {
        baixarCsv(
            nomeComData("cortesias-pedidos"),
            ["Destinatário", "Documento", "Pedido", "ID do pedido", "Itens", "Status", "Data de envio", "Emissor responsável"],
            filtered.map((d) => [d.email, d.documento, d.pedidoNome, d.pedidoId, d.itemCount, d.statusRotulo, d.dataEnvio, d.emissor]),
        );
    }, [filtered]);

    const selectableVisibleRows = useMemo(
        () => visibleRows.filter((r) => r.status !== "cancelado"),
        [visibleRows],
    );
    const pageSelectedCount = selectableVisibleRows.reduce(
        (acc, r) => acc + (selectedIds.has(r.rowId) ? 1 : 0),
        0,
    );
    const allOnPageSelected =
        selectableVisibleRows.length > 0 &&
        pageSelectedCount === selectableVisibleRows.length;
    const someOnPageSelected = pageSelectedCount > 0 && !allOnPageSelected;
    const todos = { isSelected: allOnPageSelected, isIndeterminate: someOnPageSelected, onChange: toggleAllOnPage };

    return (
        <>
            <MetricasDaLista metricas={metrics} />

            <div className="flex flex-col gap-4">
                <BarraDaLista
                    busca={{ valor: search, onChange: setSearch, placeholder: "Buscar por pedido, e-mail ou documento" }}
                    filtro={<FiltroDeStatus valor={status} opcoes={statusOptions} onChange={setStatus} />}
                >
                    <FiltroMultiplo rotulo="Emissor responsável" todos="Todos os emissores" keys={emissorKeys} onChange={setEmissorKeys} options={emissorOptions} showSearch />
                    <Button size="sm" color="secondary" iconLeading={DownloadCloud01} onClick={exportar} isDisabled={filtered.length === 0}>
                        Exportar em CSV
                    </Button>
                </BarraDaLista>

                <CartaoDaTabela>
                    <SelectionBar
                        selectedCount={selectedIds.size}
                        emptyLabel="Nenhum destinatário selecionado"
                        singular="destinatário selecionado"
                        plural="destinatários selecionados"
                        cancelLabel="Cancelar destinatários selecionados"
                        onClear={clearSelection}
                        onCancel={requestCancelSelected}
                        todos={todos}
                        totalDoFiltro={selecionaveisDoFiltro.length}
                        onSelecionarFiltro={selecionarFiltro}
                    />

                    <CabecalhoDaTabela ordenavel>
                        <Checkbox aria-label="Selecionar todos da página" {...todos} className="shrink-0" />
                        <span className="min-w-0 flex-1">Destinatário</span>
                        <span className="min-w-0 flex-1">Pedido</span>
                        <span className="w-12 text-right">Itens</span>
                        <span className="w-44">Status</span>
                        <span className="w-32">Envio</span>
                        <span className="w-15">
                            <span className="sr-only">Ações</span>
                        </span>
                    </CabecalhoDaTabela>

                    {filtered.length === 0 ? (
                        <SemResultados texto="Nenhum destinatário encontrado." onLimpar={limparFiltros} />
                    ) : (
                        <ul className="flex flex-col divide-y divide-secondary">
                            {visibleRows.map((row) => (
                                <PedidoRow
                                    key={row.rowId}
                                    row={row}
                                    isSelected={selectedIds.has(row.rowId)}
                                    onToggleSelect={toggleSelect}
                                    onCancel={requestCancelRow}
                                    onDetails={handleDetails}
                                    onRename={renamePedido}
                                />
                            ))}
                        </ul>
                    )}

                    <RodapeDePaginacao {...paginacao} />
                </CartaoDaTabela>
            </div>

            <PedidoDetailsSlideOut
                isOpen={detailsPedido !== null}
                pedido={detailsPedido}
                destinatarioEmail={detailsRow?.email ?? null}
                onClose={handleCloseDetails}
                onCancelPedido={() => {
                    if (detailsRow) storeCancelItens(new Set(detailsRow.itemIds));
                }}
            />

            <CancelConfirmModal
                isOpen={pendingCancelRow !== null}
                onClose={() => setPendingCancelRowId(null)}
                onConfirm={confirmCancelRow}
                title="Cancelar este destinatário?"
                description={
                    <>
                        Você está prestes a cancelar os itens enviados para{" "}
                        <span className="font-medium text-primary">
                            {pendingCancelRow?.email}
                        </span>{" "}
                        no pedido{" "}
                        <span className="font-medium text-primary">
                            {pendingCancelRow?.pedidoNome}
                        </span>
                        . Os QR codes serão invalidados e essa ação não pode ser desfeita.
                    </>
                }
                confirmLabel="Cancelar destinatário"
                cancelLabel="Manter destinatário"
            />

            <CancelConfirmModal
                isOpen={showCancelSelectedConfirm}
                onClose={() => setShowCancelSelectedConfirm(false)}
                onConfirm={confirmCancelSelected}
                title={`Cancelar ${selectedRowsList.length} ${selectedRowsList.length === 1 ? "destinatário selecionado" : "destinatários selecionados"}?`}
                description="Os itens dos destinatários selecionados terão os QR codes invalidados e você precisará gerar novos convites caso mude de ideia."
                listLabel="Destinatários cancelados"
                listItems={selectedRowsList.map((d) => (
                    <span className="block truncate" title={d.email}>
                        {d.email}
                    </span>
                ))}
                confirmLabel="Cancelar destinatários"
                cancelLabel="Manter destinatários"
            />
        </>
    );
};

/* ------------------------------------------------------------------ */
/*  Pedidos table                                                     */
/* ------------------------------------------------------------------ */

interface EditableNomeCellProps {
    value: string;
    onSave: (nome: string) => void;
}

const EditableNomeCell = ({ value, onSave }: EditableNomeCellProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!isEditing) setDraft(value);
    }, [value, isEditing]);

    useLayoutEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const commit = () => {
        const next = draft.trim();
        if (next && next !== value) onSave(next);
        setIsEditing(false);
    };

    const cancel = () => {
        setDraft(value);
        setIsEditing(false);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            commit();
        } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
        }
    };

    if (isEditing) {
        return (
            <div className="pointer-events-auto relative z-10 flex min-w-0 flex-1 items-center gap-1">
                {/* Campo do DS (COR-05); até 22/11/2026 era um <input> cru. */}
                <InputBase
                    ref={inputRef}
                    size="sm"
                    type="text"
                    value={draft}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={commit}
                    aria-label="Nome do pedido"
                    wrapperClassName="min-w-0 flex-1"
                />
                <ButtonUtility
                    size="xs"
                    color="tertiary"
                    icon={Check}
                    tooltip="Salvar"
                    onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
                    onClick={commit}
                />
                <ButtonUtility
                    size="xs"
                    color="tertiary"
                    icon={XClose}
                    tooltip="Cancelar"
                    onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
                    onClick={cancel}
                />
            </div>
        );
    }

    return (
        <div className="group/nome flex min-w-0 flex-1 items-center gap-2">
            <span className="block min-w-0 truncate" title={value}>
                {value}
            </span>
            {/* No toque não há hover: o lápis fica sempre visível. */}
            <ButtonUtility
                size="xs"
                color="tertiary"
                icon={Edit01}
                tooltip="Editar nome"
                className="pointer-events-auto relative z-10 shrink-0 opacity-0 transition group-hover/nome:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
                onClick={() => setIsEditing(true)}
            />
        </div>
    );
};

interface PedidoRowProps {
    row: DestinatarioRow;
    isSelected: boolean;
    onToggleSelect: (id: string, selected: boolean) => void;
    onCancel: (rowId: string) => void;
    onDetails: (rowId: string) => void;
    onRename: (pedidoId: string, nome: string) => void;
}

/**
 * Uma linha por destinatário: tabela a partir de 704 px de cartão; abaixo, bloco com rótulos (BKS-115).
 * A linha inteira abre o detalhe (um botão por baixo de tudo); caixa, nome e ações ficam por cima (COR-61).
 * No bloco, as ações têm texto e 44 px de altura; na tabela, ícones com dica.
 */
const PedidoRow = ({ row, isSelected, onToggleSelect, onCancel, onDetails, onRename }: PedidoRowProps) => {
    const isCancelled = row.status === "cancelado";
    return (
        <LinhaDaTabela interativa selecionada={isSelected} className="relative">
            <button
                type="button"
                onClick={() => onDetails(row.rowId)}
                aria-label={`Ver detalhes de ${row.email}`}
                className="absolute inset-0 cursor-pointer outline-focus-ring focus-visible:outline-2 focus-visible:-outline-offset-2"
            />
            <Checkbox
                aria-label={`Selecionar destinatário ${row.email}`}
                isSelected={isSelected}
                isDisabled={isCancelled}
                onChange={(s) => onToggleSelect(row.rowId, s)}
                className="relative z-10 mt-0.5 shrink-0 max-md:-m-3.5 max-md:p-3.5 @min-[44rem]:mt-0"
            />
            <div className="pointer-events-none flex min-w-0 flex-1 flex-col gap-1.5 @min-[44rem]:flex-row @min-[44rem]:items-center @min-[44rem]:gap-4">
                <TituloDaLinha titulo={<span className="break-all whitespace-normal">{row.email}</span>} apoio={`Documento: ${row.documento}`} />
                <Celula rotulo="Pedido" className={COL.flex}>
                    <span className="flex min-w-0 flex-1 flex-col">
                        <EditableNomeCell value={row.pedidoNome} onSave={(nome) => onRename(row.pedidoId, nome)} />
                        <span className="block truncate text-tertiary" title={row.pedidoId}>
                            ID: {row.pedidoId}
                        </span>
                    </span>
                </Celula>
                <Celula rotulo="Itens" numero className={COL.itens}>
                    {row.itemCount}
                </Celula>
                <Celula rotulo="Status" className={COL.statusPedido}>
                    <SeloDeStatus status={row.status} rotulo={row.statusRotulo} />
                </Celula>
                {/* No modo tabela, data e emissor dividem a coluna Envio. */}
                <Celula rotulo="Emissor responsável" className="@min-[44rem]:hidden">
                    {row.emissor}
                </Celula>
                <Celula rotulo="Data de envio" className={COL.envio}>
                    <span className="tabular-nums">{row.dataEnvio}</span>
                    <span className="hidden truncate text-tertiary @min-[44rem]:block">{row.emissor}</span>
                </Celula>
                {/* Bloco (celular): ações com texto, 44 px. */}
                <div className="pointer-events-auto relative z-10 mt-1 flex flex-wrap gap-2 @min-[44rem]:hidden">
                    <Button size="sm" color="secondary" iconLeading={SlashCircle01} isDisabled={isCancelled} onClick={() => onCancel(row.rowId)} className="min-h-11">
                        Cancelar
                    </Button>
                    <Button size="sm" color="secondary" iconLeading={Eye} onClick={() => onDetails(row.rowId)} className="min-h-11">
                        Detalhes
                    </Button>
                </div>
                <div className="pointer-events-auto relative z-10 hidden shrink-0 gap-1 @min-[44rem]:flex @min-[44rem]:w-15 @min-[44rem]:justify-end">
                    <ButtonUtility size="xs" color="tertiary" icon={SlashCircle01} tooltip="Cancelar" isDisabled={isCancelled} onClick={() => onCancel(row.rowId)} />
                    <ButtonUtility size="xs" color="tertiary" icon={Eye} tooltip="Detalhes" onClick={() => onDetails(row.rowId)} />
                </div>
            </div>
        </LinhaDaTabela>
    );
};

/* ------------------------------------------------------------------ */
/*  Itens tab                                                         */
/* ------------------------------------------------------------------ */

const ItensTabView = () => {
    const {
        itens,
        cancelItem: storeCancelItem,
        cancelItens: storeCancelItens,
    } = useCortesiasStore();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<FiltroItem>("todos");
    const [kindKeys, setKindKeys] = useState<Set<string>>(new Set());
    const [emissorKeys, setEmissorKeys] = useState<Set<string>>(new Set());
    const [pendingCancelItemId, setPendingCancelItemId] = useState<string | null>(null);
    const [showCancelSelectedConfirm, setShowCancelSelectedConfirm] = useState(false);
    const [detailsItemId, setDetailsItemId] = useState<string | null>(null);

    const emissorOptions = useMemo(() => {
        const names = Array.from(new Set(itens.map((it) => it.emissor)));
        return names.sort().map((name) => ({ id: name, label: name }));
    }, [itens]);

    // Aceitos, Pendentes e Cancelados sempre; Processando e Com erro só quando há item assim.
    const statusOptions = useMemo<{ id: FiltroItem; label: string }[]>(
        () => [
            { id: "todos", label: "Todos" },
            ...ORDEM_DO_FILTRO.filter((s) => SEMPRE_NO_FILTRO.includes(s) || s === status || itens.some((it) => it.status === s)).map((s) => ({ id: s, label: ITEM_STATUS_FILTRO[s] })),
        ],
        [itens, status],
    );

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return itens.filter((it) => {
            if (status !== "todos" && it.status !== status) return false;
            if (kindKeys.size > 0 && !kindKeys.has(it.kind)) return false;
            if (emissorKeys.size > 0 && !emissorKeys.has(it.emissor)) return false;
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
    }, [itens, search, status, kindKeys, emissorKeys]);

    // Busca, filtro ou tamanho novo voltam à página 1 (BKS-114).
    const paginacao = usePaginacao(filtered, [search, status, kindKeys, emissorKeys]);
    const visibleRows = paginacao.visiveis;
    const limparFiltros = () => {
        setSearch("");
        setStatus("todos");
        setKindKeys(new Set());
        setEmissorKeys(new Set());
    };

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

    const cancelItemNow = useCallback(
        (id: string) => storeCancelItem(id),
        [storeCancelItem],
    );

    const requestCancelItem = useCallback((id: string) => {
        setPendingCancelItemId(id);
    }, []);

    const confirmCancelItem = useCallback(() => {
        if (pendingCancelItemId) cancelItemNow(pendingCancelItemId);
        setPendingCancelItemId(null);
    }, [pendingCancelItemId, cancelItemNow]);

    const requestCancelSelected = useCallback(() => {
        if (selectedIds.size === 0) return;
        setShowCancelSelectedConfirm(true);
    }, [selectedIds]);

    const confirmCancelSelected = useCallback(() => {
        storeCancelItens(selectedIds);
        setSelectedIds(new Set());
        setShowCancelSelectedConfirm(false);
    }, [selectedIds, storeCancelItens]);

    const pendingCancelItem = useMemo(
        () =>
            pendingCancelItemId
                ? itens.find((it) => it.id === pendingCancelItemId) ?? null
                : null,
        [pendingCancelItemId, itens],
    );

    const selectedItensList = useMemo(
        () => itens.filter((it) => selectedIds.has(it.id)),
        [itens, selectedIds],
    );

    const handleResend = useCallback(
        (id: string) => {
            const item = itens.find((it) => it.id === id);
            if (!item) return;
            showSuccessToast(
                "Cortesia reenviada",
                `Reenviamos ${item.nome} para ${item.email}`,
            );
        },
        [itens],
    );

    const handleDetails = useCallback((id: string) => {
        setDetailsItemId(id);
    }, []);

    const detailsItem = useMemo(
        () => (detailsItemId ? itens.find((it) => it.id === detailsItemId) ?? null : null),
        [detailsItemId, itens],
    );

    // Os três últimos somam o total: com cadastro (Aceito), pendentes de cadastro e cancelados (COR-59).
    // "Itens validados" saiu em 22/11/2026: contava os aceitos, e "validar" é passar na portaria.
    const metrics = useMemo(
        () => [
            { rotulo: "Itens emitidos", valor: itens.length },
            { rotulo: "Itens com cadastro", valor: itens.filter((it) => it.status === "aceito").length },
            { rotulo: "Itens com cadastro pendente", valor: itens.filter((it) => it.status === "pendente").length },
            { rotulo: "Itens cancelados", valor: itens.filter((it) => it.status === "cancelado").length },
        ],
        [itens],
    );

    const selecionaveisDoFiltro = useMemo(() => filtered.filter((r) => r.status !== "cancelado" && r.status !== "erro"), [filtered]);
    const selecionarFiltro = useCallback(() => setSelectedIds(new Set(selecionaveisDoFiltro.map((r) => r.id))), [selecionaveisDoFiltro]);

    // Exporta as linhas do filtro atual, todas as páginas (COR-56).
    const exportar = useCallback(() => {
        baixarCsv(
            nomeComData("cortesias-itens"),
            ["ID do item", "Item", "Detalhe", "Tipo", "Status", "Destinatário", "Documento", "Emissor responsável", "ID do pedido"],
            filtered.map((it) => [it.id, it.nome, it.subtitulo, ITEM_KIND_LABEL[it.kind], ITEM_STATUS_META[it.status].label, it.email, it.documento, it.emissor, it.pedidoId]),
        );
    }, [filtered]);

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
    const todos = { isSelected: allOnPageSelected, isIndeterminate: someOnPageSelected, onChange: toggleAllOnPage };

    return (
        <>
            <MetricasDaLista metricas={metrics} />

            <div className="flex flex-col gap-4">
                <BarraDaLista
                    busca={{ valor: search, onChange: setSearch, placeholder: "Buscar por nome, e-mail, ID ou documento" }}
                    filtro={<FiltroDeStatus valor={status} opcoes={statusOptions} onChange={setStatus} />}
                >
                    <FiltroMultiplo rotulo="Tipo do item" todos="Todos os tipos" keys={kindKeys} onChange={setKindKeys} options={ITEM_KIND_OPTIONS} />
                    <FiltroMultiplo rotulo="Emissor responsável" todos="Todos os emissores" keys={emissorKeys} onChange={setEmissorKeys} options={emissorOptions} showSearch />
                    <Button size="sm" color="secondary" iconLeading={DownloadCloud01} onClick={exportar} isDisabled={filtered.length === 0}>
                        Exportar em CSV
                    </Button>
                </BarraDaLista>

                <CartaoDaTabela>
                    <SelectionBar
                        selectedCount={selectedIds.size}
                        emptyLabel="Nenhum item selecionado"
                        singular="item selecionado"
                        plural="itens selecionados"
                        cancelLabel="Cancelar itens selecionados"
                        onClear={clearSelection}
                        onCancel={requestCancelSelected}
                        todos={todos}
                        totalDoFiltro={selecionaveisDoFiltro.length}
                        onSelecionarFiltro={selecionarFiltro}
                    />

                    <CabecalhoDaTabela ordenavel>
                        <Checkbox aria-label="Selecionar todos da página" {...todos} className="shrink-0" />
                        <span className="min-w-0 flex-1">Item</span>
                        <span className="w-40">Status</span>
                        <span className="min-w-0 flex-1">Destinatário</span>
                        {/* Sem o "?" que não explicava nada (COR-60): o nome da coluna basta. */}
                        <span className="w-28">Emissor</span>
                        <span className="w-23">
                            <span className="sr-only">Ações</span>
                        </span>
                    </CabecalhoDaTabela>

                    {filtered.length === 0 ? (
                        <SemResultados texto="Nenhum item encontrado." onLimpar={limparFiltros} />
                    ) : (
                        <ul className="flex flex-col divide-y divide-secondary">
                            {visibleRows.map((row) => (
                                <ItemRow
                                    key={row.id}
                                    row={row}
                                    isSelected={selectedIds.has(row.id)}
                                    onToggleSelect={toggleSelect}
                                    onCancel={requestCancelItem}
                                    onResend={handleResend}
                                    onDetails={handleDetails}
                                />
                            ))}
                        </ul>
                    )}

                    <RodapeDePaginacao {...paginacao} />
                </CartaoDaTabela>
            </div>

            <CancelConfirmModal
                isOpen={pendingCancelItem !== null}
                onClose={() => setPendingCancelItemId(null)}
                onConfirm={confirmCancelItem}
                title="Cancelar este item?"
                description={
                    pendingCancelItem ? (
                        <>
                            <span className="font-medium text-primary">
                                {pendingCancelItem.email}
                            </span>{" "}
                            terá o QR code para{" "}
                            <span className="font-medium text-primary">
                                {pendingCancelItem.nome}
                            </span>{" "}
                            invalidado e você precisará gerar novos convites caso mude de ideia.
                            Esta ação não pode ser desfeita.
                        </>
                    ) : null
                }
                confirmLabel="Cancelar cortesia"
                cancelLabel="Manter cortesia"
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

            <ItemDetailsSlideOut
                isOpen={detailsItem !== null}
                item={detailsItem}
                onClose={() => setDetailsItemId(null)}
                onCancel={cancelItemNow}
                onResend={handleResend}
            />
        </>
    );
};

/* ------------------------------------------------------------------ */
/*  Itens table                                                       */
/* ------------------------------------------------------------------ */

interface ItemRowProps {
    row: CortesiaItem;
    isSelected: boolean;
    onToggleSelect: (id: string, selected: boolean) => void;
    onCancel: (id: string) => void;
    onResend: (id: string) => void;
    onDetails: (id: string) => void;
}

/** Uma linha por item emitido: tabela a partir de 704 px de cartão; abaixo, bloco com rótulos (BKS-115). A linha inteira abre o detalhe (COR-61). */
const ItemRow = ({ row, isSelected, onToggleSelect, onCancel, onResend, onDetails }: ItemRowProps) => {
    const isCancelled = row.status === "cancelado";
    const isErro = row.status === "erro";
    return (
        <LinhaDaTabela interativa selecionada={isSelected} className="relative">
            <button
                type="button"
                onClick={() => onDetails(row.id)}
                aria-label={`Ver detalhes de ${row.nome} para ${row.email}`}
                className="absolute inset-0 cursor-pointer outline-focus-ring focus-visible:outline-2 focus-visible:-outline-offset-2"
            />
            <Checkbox
                aria-label={`Selecionar item ${row.id}`}
                isSelected={isSelected}
                isDisabled={isCancelled || isErro}
                onChange={(s) => onToggleSelect(row.id, s)}
                className="relative z-10 mt-0.5 shrink-0 max-md:-m-3.5 max-md:p-3.5 @min-[44rem]:mt-0"
            />
            <div className="pointer-events-none flex min-w-0 flex-1 flex-col gap-1.5 @min-[44rem]:flex-row @min-[44rem]:items-center @min-[44rem]:gap-4">
                <TituloDaLinha titulo={row.nome} apoio={row.subtitulo} />
                <Celula rotulo="Status" className={COL.statusItem}>
                    <SeloDeStatus status={ITEM_STATUS_SELO[row.status]} />
                </Celula>
                <Celula rotulo="Destinatário" className={COL.flex}>
                    <span className="flex min-w-0 flex-1 flex-col">
                        <span className="flex min-w-0 items-center gap-2">
                            <span className="break-all @min-[44rem]:truncate" title={row.email}>
                                {row.email}
                            </span>
                            {/* Transferido em texto, não só no ícone (COR-10). */}
                            {row.transferido && <span className="shrink-0 text-tertiary">(transferido)</span>}
                        </span>
                        <span className="truncate text-tertiary">Documento: {row.documento}</span>
                    </span>
                </Celula>
                <Celula rotulo="Emissor responsável" className={COL.emissor}>
                    <span className="block truncate">{row.emissor}</span>
                </Celula>
                {/* Bloco (celular): ações com texto, 44 px. Reenviar fica desativado no cancelado (COR-12). */}
                <div className="pointer-events-auto relative z-10 mt-1 flex flex-wrap gap-2 @min-[44rem]:hidden">
                    <Button size="sm" color="secondary" iconLeading={SlashCircle01} isDisabled={isCancelled} onClick={() => onCancel(row.id)} className="min-h-11">
                        Cancelar
                    </Button>
                    <Button size="sm" color="secondary" iconLeading={RefreshCcw01} isDisabled={isCancelled || isErro} onClick={() => onResend(row.id)} className="min-h-11">
                        Reenviar
                    </Button>
                    <Button size="sm" color="secondary" iconLeading={Eye} onClick={() => onDetails(row.id)} className="min-h-11">
                        Detalhes
                    </Button>
                </div>
                <div className="pointer-events-auto relative z-10 hidden shrink-0 gap-1 @min-[44rem]:flex @min-[44rem]:w-23 @min-[44rem]:justify-end">
                    <ButtonUtility size="xs" color="tertiary" icon={SlashCircle01} tooltip="Cancelar" isDisabled={isCancelled} onClick={() => onCancel(row.id)} />
                    <ButtonUtility size="xs" color="tertiary" icon={RefreshCcw01} tooltip="Reenviar" isDisabled={isCancelled || isErro} onClick={() => onResend(row.id)} />
                    <ButtonUtility size="xs" color="tertiary" icon={Eye} tooltip="Detalhes" onClick={() => onDetails(row.id)} />
                </div>
            </div>
        </LinhaDaTabela>
    );
};
