import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import {
    AlertCircle,
    CheckCircle,
    Copy01,
    Edit01,
    Key01,
    LinkBroken02,
    Plus,
    Trash01,
} from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Toggle } from "@/components/base/toggle/toggle";
import { Surgir } from "@/components/foundations/transicao";
import { cx } from "@/utils/cx";
import { BackstageLayout } from "../../components/Backstage";
import { EditarLimiteModal } from "../components/EditarLimiteModal";
import { CabecalhoDaPagina } from "../../components/cabecalho-da-pagina";
import { ModalDeConfirmacao } from "../../components/modal-de-confirmacao";
import { ROTA_CRIAR_PASSKEY } from "../data/rascunho";
import { RodapeDePaginacao, usePaginacao } from "../../components/rodape-de-paginacao";
import { BarraDaLista, CabecalhoDaTabela, CarregandoTabela, CartaoDaTabela, Celula, LinhaDaTabela, SemResultados, TituloDaLinha } from "../../components/tabela";
import { atualizarPasskeys, desvincularPasskeys, linkDaPasskey, removerPasskeys, usePasskeysDoEvento } from "../../components/passkeys-do-evento";

type Filter = "todas" | "ativas" | "inativas";

interface ChaveRow {
    /** O próprio código: único no evento. */
    id: string;
    code: string;
    /** Itens que a Passkey libera. */
    ingressos: number;
    /** Quantidade de vezes que a chave já foi usada. */
    used: number;
    /** Limite de uso. `null` = ilimitado (∞). */
    limit: number | null;
}

const fmt = (n: number) => n.toLocaleString("pt-BR");
const fmtLimit = (limit: number | null) => (limit === null ? "∞" : fmt(limit));

export function ListaChaves() {
    const navigate = useNavigate();
    const location = useLocation();
    // As Passkeys do evento em contexto, gravadas nele (CHA-37).
    const { carregando, evento, passkeys } = usePasskeysDoEvento();
    const eventoId = evento?.id ?? "";
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<Filter>("todas");
    const rows = useMemo<ChaveRow[]>(() => passkeys.map((p) => ({ id: p.codigo, code: p.codigo, ingressos: p.vinculos, used: p.usos, limit: p.limite })), [passkeys]);
    const active = useMemo(() => new Set(passkeys.filter((p) => p.ativa).map((p) => p.codigo)), [passkeys]);
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    // Chaves recém-criadas começam "processando"; cada uma fica pronta individualmente em até 6s (CHA-32).
    const [processing, setProcessing] = useState<Set<string>>(() => new Set(((location.state as { recem?: string[] } | null)?.recem ?? []).slice(0, 12)));

    useEffect(() => {
        const timers = [...processing].map((id, i) =>
            setTimeout(() => setProcessing((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            }), Math.min(6000, 1800 + i * 450)),
        );
        return () => timers.forEach(clearTimeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // Edição do limite de uso de uma linha por vez.
    const [edit, setEdit] = useState<{ id: string; value: string; status: "editing" | "validating" | "error" } | null>(null);
    const [successId, setSuccessId] = useState<string | null>(null);
    const [isEditLimitOpen, setIsEditLimitOpen] = useState(false);
    const [isDesvincularOpen, setIsDesvincularOpen] = useState(false);
    const [isAtivarOpen, setIsAtivarOpen] = useState(false);
    const [isDesativarOpen, setIsDesativarOpen] = useState(false);
    const [isRemoverOpen, setIsRemoverOpen] = useState(false);
    const abrirAdicionarVinculos = (codigos: string[] = [...selectedRows]) =>
        navigate("/backstage/marketing/chave-de-acesso/vincular-itens", { state: { adicionar: true, codigos } });
    // Ações unitárias (por linha).
    const [desvincularRowId, setDesvincularRowId] = useState<string | null>(null);
    const [removerRowId, setRemoverRowId] = useState<string | null>(null);

    // Feedback de sucesso (toast com check verde) reutilizado por todas as ações.
    const showSuccess = (message: string) =>
        toast.success(message, { icon: <CheckCircle className="size-5 text-fg-success-primary" /> });
    const successMassa = (count: number, participio: string) =>
        showSuccess(
            count === 1
                ? `1 Passkey ${participio} com sucesso.`
                : `${count} Passkeys ${participio}s com sucesso.`,
        );

    const copiarLink = (code: string) => {
        if (!evento) return;
        void navigator.clipboard?.writeText(linkDaPasskey(evento, code));
        showSuccess("Link copiado.");
    };

    /** CSV com código, status, uso e limite. */
    const exportar = () => {
        const linhas = [["Passkey", "Status", "Itens vinculados", "Uso", "Limite"], ...rows.map((r) => [r.code, active.has(r.id) ? "Ativa" : "Inativa", String(r.ingressos), String(r.used), r.limit === null ? "Ilimitado" : String(r.limit)])];
        const url = URL.createObjectURL(new Blob([linhas.map((l) => l.join(";")).join("\n")], { type: "text/csv;charset=utf-8" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `passkeys-${evento?.slug ?? "evento"}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const removerChave = (id: string) => {
        void removerPasskeys(eventoId, [id]);
        setSelectedRows((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    };

    const editarLimiteSelecionadas = (limit: number | null) => {
        const count = selectedRows.size;
        void atualizarPasskeys(eventoId, [...selectedRows], { limite: limit });
        // Mantém a seleção inicial das chaves após sair do modal.
        setIsEditLimitOpen(false);
        successMassa(count, "atualizada");
    };

    const startEdit = (row: ChaveRow) => {
        setSuccessId(null);
        setEdit({ id: row.id, value: row.limit === null ? "" : String(row.limit), status: "editing" });
    };

    const submitEdit = (row: ChaveRow) => {
        if (!edit || edit.id !== row.id || edit.status === "validating") return;
        const raw = edit.value;
        setEdit({ id: row.id, value: raw, status: "validating" });
        // Simula a validação (loading) antes de aplicar.
        setTimeout(() => {
            const newLimit = parseInt(raw.replace(/\D/g, ""), 10);
            if (!raw.trim() || Number.isNaN(newLimit)) {
                setEdit(null);
                return;
            }
            if (newLimit < row.used) {
                setEdit({ id: row.id, value: raw, status: "error" });
                // O erro/tooltip some após 15 segundos.
                setTimeout(() => setEdit((cur) => (cur && cur.id === row.id && cur.status === "error" ? null : cur)), 15000);
                return;
            }
            void atualizarPasskeys(eventoId, [row.id], { limite: newLimit });
            setEdit(null);
            setSuccessId(row.id);
            // O ícone de sucesso some após 5 segundos.
            setTimeout(() => setSuccessId((cur) => (cur === row.id ? null : cur)), 5000);
        }, 1100);
    };

    const filtered = useMemo(() => {
        return rows.filter((row) => {
            if (search && !row.code.toLowerCase().includes(search.toLowerCase())) return false;
            if (filter === "ativas") return active.has(row.id);
            if (filter === "inativas") return !active.has(row.id);
            return true;
        });
    }, [search, filter, active, rows]);

    const paginacao = usePaginacao(filtered, [search, filter]);
    const pageRows = paginacao.visiveis;

    // Chaves em processamento não podem ser selecionadas.
    const selectable = filtered.filter((row) => !processing.has(row.id));
    const allSelected = selectable.length > 0 && selectable.every((row) => selectedRows.has(row.id));
    const someSelected = selectable.some((row) => selectedRows.has(row.id));
    const toggleAll = (checked: boolean) => setSelectedRows(checked ? new Set(selectable.map((row) => row.id)) : new Set());
    const toggleRow = (id: string, checked: boolean) =>
        setSelectedRows((prev) => {
            const next = new Set(prev);
            checked ? next.add(id) : next.delete(id);
            return next;
        });

    // Status das chaves selecionadas (define qual ação de status mostrar).
    const selectedArray = [...selectedRows];
    // Mostra "Ativar" se houver alguma selecionada inativa, e "Desativar" se houver alguma ativa.
    // Assim: só ativas, só Desativar; só inativas, só Ativar; status mistos, as duas.
    const hasSelectedInactive = selectedArray.some((id) => !active.has(id));
    const hasSelectedActive = selectedArray.some((id) => active.has(id));

    // Ações em massa mantêm a seleção inicial das chaves.
    const ativarSelecionadas = () => void atualizarPasskeys(eventoId, [...selectedRows], { ativa: true });
    const desativarSelecionadas = () => void atualizarPasskeys(eventoId, [...selectedRows], { ativa: false });
    const excluirSelecionadas = () => {
        void removerPasskeys(eventoId, [...selectedRows]);
        setSelectedRows(new Set());
    };

    // O toggle grava na hora, com aviso e Desfazer, como em Cupons (CHA-44).
    const toggleActive = async (id: string, ativa: boolean, desfazendo = false) => {
        try {
            await atualizarPasskeys(eventoId, [id], { ativa });
            toast.success(ativa ? `Passkey ${id} ativada.` : `Passkey ${id} desativada.`, desfazendo ? undefined : { action: { label: "Desfazer", onClick: () => void toggleActive(id, !ativa, true) } });
        } catch {
            toast.error("Não foi possível mudar a Passkey. Tente de novo.");
        }
    };
    const usoMaximoSelecionadas = rows.filter((r) => selectedRows.has(r.id)).reduce((m, r) => Math.max(m, r.used), 0);

    // Sem Passkey no evento: a entrada mostra o vazio com "Criar Passkey" (CHA-01).
    if (!carregando && passkeys.length === 0) return <Navigate to="/backstage/marketing/chave-de-acesso" replace />;

    return (
        <BackstageLayout activeSection="itens" activeItem="chave-de-acesso">
            <div className="flex min-w-0 flex-1 flex-col md:h-[calc(100dvh-4.5rem)] md:overflow-hidden">
                <CabecalhoDaPagina
                    className="shrink-0"
                    // Abre pelos atalhos de Ingressos e produtos: o voltar leva para lá (BKS-101, BKS-119).
                    voltar={{ rotulo: "Ingressos e produtos", href: "/backstage/catalogo/ingressos" }}
                    titulo="Passkey"
                    acoes={
                        <>
                            <Button size="md" color="primary" iconLeading={Plus} onClick={() => navigate(ROTA_CRIAR_PASSKEY)}>
                                Nova Passkey
                            </Button>
                            <Button size="md" color="secondary" onClick={exportar} isDisabled={rows.length === 0}>
                                Exportar
                            </Button>
                        </>
                    }
                />

                {/* Busca à esquerda e status à direita (BKS-111). */}
                <BarraDaLista
                    className="mt-6 shrink-0"
                    busca={{ valor: search, onChange: setSearch, placeholder: "Buscar Passkeys" }}
                    filtro={
                        <ButtonGroup
                            size="sm"
                            aria-label="Status"
                            selectedKeys={new Set([filter])}
                            onSelectionChange={(keys) => {
                                const value = [...keys][0] as Filter;
                                if (value) setFilter(value);
                            }}
                            disallowEmptySelection
                        >
                            <ButtonGroupItem id="todas">Todas</ButtonGroupItem>
                            <ButtonGroupItem id="ativas">Ativas</ButtonGroupItem>
                            <ButtonGroupItem id="inativas">Inativas</ButtonGroupItem>
                        </ButtonGroup>
                    }
                />

                <CartaoDaTabela className="mt-4 flex flex-col md:min-h-0 md:flex-1">
                    {/* Barra de ações em lote, dentro do cartão, com uma ou mais selecionadas (CHA-45; a mesma de Cupons). */}
                    <Surgir visivel={selectedRows.size > 0} className="shrink-0">
                                <div role="toolbar" aria-label="Ações para as Passkeys selecionadas" className="flex flex-wrap items-center justify-between gap-3 border-b border-secondary bg-secondary_subtle px-5 py-3 md:px-6">
                                    <span className="text-sm font-semibold text-primary">
                                        {selectedRows.size}{" "}
                                        {selectedRows.size === 1 ? "Passkey selecionada" : "Passkeys selecionadas"}
                                    </span>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {hasSelectedInactive && (
                                            <Button size="sm" color="secondary" onClick={() => setIsAtivarOpen(true)}>
                                                Ativar
                                            </Button>
                                        )}
                                        {hasSelectedActive && (
                                            <Button size="sm" color="secondary" onClick={() => setIsDesativarOpen(true)}>
                                                Desativar
                                            </Button>
                                        )}
                                        <Button size="sm" color="secondary" onClick={() => setIsEditLimitOpen(true)}>
                                            Editar limite
                                        </Button>
                                        <Button size="sm" color="secondary" onClick={() => abrirAdicionarVinculos()}>
                                            Adicionar vínculos
                                        </Button>
                                        <Button size="sm" color="secondary" onClick={() => setIsDesvincularOpen(true)}>
                                            Desvincular
                                        </Button>
                                        <Button size="sm" color="secondary" onClick={() => setIsRemoverOpen(true)}>
                                            Remover
                                        </Button>
                                    </div>
                                </div>
                    </Surgir>

                    {/* Cabeçalho das colunas (modo tabela). Reserva o espaço da barra de rolagem das linhas
                        (sempre visível) para as colunas baterem com as das linhas. */}
                    <CabecalhoDaTabela ordenavel className="shrink-0 overflow-y-hidden [scrollbar-gutter:stable]">
                        <SelecionarTodas allSelected={allSelected} someSelected={someSelected} onChange={toggleAll} />
                        <span className="min-w-0 flex-1">Passkey</span>
                        <span className={COLUNA.ativa}>Ativa</span>
                        <span className={cx(COLUNA.uso, "text-right")}>Uso</span>
                        <span className={cx(COLUNA.acoes, "text-right")}>Ações</span>
                    </CabecalhoDaTabela>
                    {/* No modo lista o cabeçalho some; o "selecionar todas" continua aqui. */}
                    {!carregando && filtered.length > 0 && (
                        <div className="flex shrink-0 items-center gap-3 border-b border-secondary bg-secondary_subtle px-5 py-3 text-sm font-medium text-tertiary @min-[44rem]:hidden">
                            <SelecionarTodas allSelected={allSelected} someSelected={someSelected} onChange={toggleAll} />
                            Selecionar todas
                        </div>
                    )}

                    {/* Linhas (área de scroll com scrollbar sempre visível) */}
                    <div className="flex-1 overflow-y-scroll md:min-h-0">
                    {carregando && (
                        <div className="p-4">
                            <CarregandoTabela />
                        </div>
                    )}
                    {!carregando && filtered.length === 0 && (
                        <SemResultados
                            texto={search ? "Nenhuma Passkey com esse código." : filter === "ativas" ? "Nenhuma Passkey ativa." : "Nenhuma Passkey inativa."}
                            onLimpar={() => {
                                setSearch("");
                                setFilter("todas");
                            }}
                        />
                    )}
                    <ul className="flex flex-col divide-y divide-secondary">
                    {pageRows.map((row) => {
                        const isProcessing = processing.has(row.id);
                        const isEditing = edit?.id === row.id;
                        const status = isEditing ? edit!.status : null;
                        // Ícone de estado (loading / erro / sucesso).
                        const icon =
                            status === "validating" ? (
                                <div aria-label="Validando" className="size-5 shrink-0 animate-spin rounded-full border-2 border-secondary border-t-brand motion-reduce:animate-none" />
                            ) : status === "error" ? (
                                <AlertCircle className="size-5 shrink-0 text-fg-error-primary" />
                            ) : !isEditing && successId === row.id ? (
                                <CheckCircle className="size-5 shrink-0 text-fg-success-primary" />
                            ) : null;
                        return (
                        <LinhaDaTabela key={row.id}>
                            <Checkbox
                                size="sm"
                                aria-label={`Selecionar ${row.code}`}
                                isDisabled={isProcessing}
                                isSelected={selectedRows.has(row.id)}
                                onChange={(checked) => toggleRow(row.id, checked)}
                            />
                            <div className="flex min-w-0 flex-1 flex-col gap-2 @min-[44rem]:flex-row @min-[44rem]:items-center @min-[44rem]:gap-4">
                                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                                    <TituloDaLinha
                                        className={cx("transition-opacity duration-300 ease-out motion-reduce:transition-none", isProcessing && "opacity-50")}
                                        titulo={row.code}
                                        apoio={row.ingressos === 0 ? "Nenhum item vinculado" : `${fmt(row.ingressos)} ${row.ingressos === 1 ? "item vinculado" : "itens vinculados"}`}
                                    />
                                    {isProcessing && (
                                        <div role="status" className="flex items-center gap-2">
                                            <div aria-hidden="true" className="size-5 shrink-0 animate-spin rounded-full border-2 border-secondary border-t-brand motion-reduce:animate-none" />
                                            <span className="text-sm text-tertiary">Preparando Passkey...</span>
                                        </div>
                                    )}
                                </div>
                                {/* Coluna "Ativa": o toggle diz o que liga (CHA-46). */}
                                <Celula rotulo="Ativa" className={cx(COLUNA.ativa, "items-center")}>
                                    <Toggle
                                        size="sm"
                                        aria-label={`Passkey ${row.code} ativa`}
                                        isDisabled={isProcessing}
                                        isSelected={!isProcessing && active.has(row.id)}
                                        onChange={(on) => void toggleActive(row.id, on)}
                                    />
                                </Celula>
                                <Celula rotulo="Uso" numero className={cx(COLUNA.uso, "transition-opacity duration-300 ease-out", isProcessing && "pointer-events-none opacity-50")}>
                                    <span className="relative inline-flex items-center gap-1.5 @min-[44rem]:flex @min-[44rem]:justify-end">
                                        {icon}
                                        {isEditing ? (
                                            <>
                                                <span className="text-secondary">{fmt(row.used)} de</span>
                                                <input
                                                    autoFocus
                                                    value={edit!.value}
                                                    onChange={(e) => setEdit({ id: row.id, value: e.target.value, status: status === "error" ? "editing" : status! })}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") submitEdit(row);
                                                    }}
                                                    onBlur={() => submitEdit(row)}
                                                    disabled={status === "validating"}
                                                    aria-label="Novo limite de uso"
                                                    className="h-9 w-20 rounded-lg bg-primary px-2.5 text-sm text-primary shadow-xs ring-1 ring-primary outline-hidden ring-inset focus:ring-2 focus:ring-brand"
                                                />

                                                {status === "error" && (
                                                    /* O mesmo balão do tooltip do DS: fundo sólido, título e apoio. */
                                                    <span role="alert" className="absolute bottom-full left-0 z-10 mb-2 flex w-64 flex-col gap-1 rounded-lg bg-primary-solid p-3 text-left shadow-lg @min-[44rem]:right-8 @min-[44rem]:left-auto">
                                                        <span className="text-sm font-semibold text-white">Limite não alterado</span>
                                                        <span className="text-sm text-tooltip-supporting-text">
                                                            O novo limite não pode ser menor que a quantidade de vezes que o código já foi usado.
                                                        </span>
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-secondary">
                                                    {fmt(row.used)} de {fmtLimit(row.limit)}
                                                </span>
                                                {successId !== row.id && (
                                                    <ButtonUtility size="xs" color="tertiary" icon={Edit01} tooltip="Editar limite de uso" onClick={() => startEdit(row)} />
                                                )}
                                            </>
                                        )}
                                    </span>
                                </Celula>
                                <div className={cx(COLUNA.acoes, "-ml-2 flex items-center gap-1 transition-opacity duration-300 ease-out @min-[44rem]:ml-0 @min-[44rem]:justify-end", isProcessing && "pointer-events-none opacity-50")}>
                                    <RowAction icon={Copy01} tooltip="Copiar link" onClick={() => copiarLink(row.code)} />
                                    <RowAction icon={Key01} tooltip="Editar vínculo de Passkey" onClick={() => abrirAdicionarVinculos([row.code])} />
                                    <RowAction icon={LinkBroken02} tooltip="Desvincular tudo" onClick={() => setDesvincularRowId(row.id)} />
                                    <RowAction icon={Trash01} tooltip="Remover Passkey" onClick={() => setRemoverRowId(row.id)} />
                                </div>
                            </div>
                        </LinhaDaTabela>
                        );
                    })}
                    </ul>
                    </div>

                    {/* Paginação do DS (BKS-114) */}
                    <div className="shrink-0">
                        <RodapeDePaginacao {...paginacao} />
                    </div>
                </CartaoDaTabela>
            </div>

            <EditarLimiteModal isOpen={isEditLimitOpen} usoMaximo={usoMaximoSelecionadas} onClose={() => setIsEditLimitOpen(false)} onSave={editarLimiteSelecionadas} />

            {/* Confirmações: o modal comum do Backstage; desvincular e remover em vermelho (CHA-47). */}
            <ModalDeConfirmacao
                aberto={isDesvincularOpen}
                onFechar={() => setIsDesvincularOpen(false)}
                onConfirmar={() => {
                    const count = selectedRows.size;
                    void desvincularPasskeys(eventoId, [...selectedRows]);
                    setIsDesvincularOpen(false);
                    successMassa(count, "desvinculada");
                }}
                destrutiva
                icone={LinkBroken02}
                titulo="Desvincular as Passkeys selecionadas?"
                descricao="Os itens ficam visíveis para o público se não tiverem outra Passkey."
                confirmar="Desvincular"
            />

            <ModalDeConfirmacao
                aberto={isAtivarOpen}
                onFechar={() => setIsAtivarOpen(false)}
                onConfirmar={() => {
                    const count = selectedRows.size;
                    ativarSelecionadas();
                    setIsAtivarOpen(false);
                    successMassa(count, "ativada");
                }}
                icone={CheckCircle}
                titulo="Ativar as Passkeys selecionadas?"
                descricao="Ativas, elas voltam a liberar os itens vinculados."
                confirmar="Ativar"
            />

            <ModalDeConfirmacao
                aberto={isDesativarOpen}
                onFechar={() => setIsDesativarOpen(false)}
                onConfirmar={() => {
                    const count = selectedRows.size;
                    desativarSelecionadas();
                    setIsDesativarOpen(false);
                    successMassa(count, "desativada");
                }}
                titulo="Desativar as Passkeys selecionadas?"
                descricao="Desativadas, elas param de liberar os itens, que continuam ocultos na compra."
                confirmar="Desativar"
            />

            <ModalDeConfirmacao
                aberto={isRemoverOpen}
                onFechar={() => setIsRemoverOpen(false)}
                onConfirmar={() => {
                    const count = selectedRows.size;
                    excluirSelecionadas();
                    setIsRemoverOpen(false);
                    successMassa(count, "removida");
                }}
                destrutiva
                icone={Trash01}
                titulo="Remover as Passkeys selecionadas?"
                descricao="Elas deixam de existir. Os itens ficam visíveis para o público se não tiverem outra Passkey."
                confirmar="Remover"
            />

            {/* Ações unitárias */}
            <ModalDeConfirmacao
                aberto={desvincularRowId !== null}
                onFechar={() => setDesvincularRowId(null)}
                onConfirmar={() => {
                    if (desvincularRowId !== null) void desvincularPasskeys(eventoId, [desvincularRowId]);
                    setDesvincularRowId(null);
                    showSuccess("Passkey desvinculada com sucesso.");
                }}
                destrutiva
                icone={LinkBroken02}
                titulo="Desvincular esta Passkey de todos os itens?"
                descricao="Ela deixa de liberar os itens vinculados. Os itens ficam visíveis se não tiverem outra Passkey."
                confirmar="Desvincular"
            />

            <ModalDeConfirmacao
                aberto={removerRowId !== null}
                onFechar={() => setRemoverRowId(null)}
                onConfirmar={() => {
                    if (removerRowId !== null) removerChave(removerRowId);
                    setRemoverRowId(null);
                    showSuccess("Passkey removida com sucesso.");
                }}
                destrutiva
                icone={Trash01}
                titulo="Remover esta Passkey?"
                descricao="Ela deixa de existir e não pode mais ser usada. Esta ação não pode ser desfeita."
                confirmar="Remover"
            />
        </BackstageLayout>
    );
}

/* Larguras das colunas no modo tabela (cartão com 44rem ou mais, BKS-115). */
const COLUNA = {
    ativa: "@min-[44rem]:w-20 @min-[44rem]:shrink-0",
    uso: "@min-[44rem]:w-56 @min-[44rem]:shrink-0",
    acoes: "@min-[44rem]:w-40 @min-[44rem]:shrink-0",
};

const SelecionarTodas = ({ allSelected, someSelected, onChange }: { allSelected: boolean; someSelected: boolean; onChange: (checked: boolean) => void }) => (
    <Checkbox size="sm" aria-label="Selecionar todas as Passkeys" isSelected={allSelected} isIndeterminate={someSelected && !allSelected} onChange={onChange} />
);

const RowAction = ({ icon, tooltip, onClick }: { icon: typeof Copy01; tooltip: string; onClick?: () => void }) => (
    <ButtonUtility size="sm" color="tertiary" icon={icon} tooltip={tooltip} tooltipPlacement="bottom" onClick={onClick} />
);
