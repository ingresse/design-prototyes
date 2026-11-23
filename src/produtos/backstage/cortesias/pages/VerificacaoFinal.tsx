import { useCallback, useEffect, useMemo, useRef, useState, type Key } from "react";
import { ChevronLeft, Edit01, SearchLg, Send01, Trash01 } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { PaginationCardAdvanced } from "@/components/application/pagination/pagination";
import { useNavegarNoPainel, usePainel } from "../../components/painel";
import { useEventoAtual } from "../../eventos/data/eventos";
import { useAcessoNoEvento } from "../../freepass/data/minhas-vendas";
import { registrarCortesias } from "@/plataforma/comissarios";
import { BackstageLayout } from "../../components/Backstage";
import { PainelDePassos } from "../../components/painel-de-passos";
import { useAvisoAoSair, useRascunhoDaEmissao } from "../data/rascunho-da-emissao";
import { ETAPAS_DA_EMISSAO, TITULO_DA_EMISSAO } from "./SelecaoItens";
import {
    ConfirmRemoveEmailModal,
    ConfirmSendCortesiasModal,
    EditEmailModal,
    type ConfirmSendCortesiasResult,
} from "../components/EmailModals";
import { showSuccessToast } from "../utils/toast";
import {
    getItemDetails,
    type ComboItemDetails,
    type ProductItemDetails,
    type TicketItemDetails,
} from "../data/cortesia-items";
import { useCortesiasStore } from "../data/cortesias-store";
import { idNoCatalogo, useCatalogoDeCortesia } from "../data/plataforma";
import { cx } from "@/utils/cx";

const DEFAULT_PAGE_SIZE = 10;

type CadastroFilter = "all" | "com" | "sem";

const CADASTRO_FILTER_OPTIONS = [
    { id: "all", label: "Todos os cadastros" },
    { id: "com", label: "Apenas cadastrados" },
    { id: "sem", label: "Apenas sem cadastro" },
];

/** Deterministic hash for stable "tem/sem cadastro" assignment per e-mail. */
function emailHash(email: string): number {
    let h = 0;
    for (let i = 0; i < email.length; i++) {
        h = ((h << 5) - h + email.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
}

/** ~40% of e-mails are marked "sem cadastro" (deterministic, hash-based). */
function emailHasCadastro(email: string): boolean {
    return emailHash(email) % 10 >= 4;
}


export function VerificacaoFinal() {
    const navigate = useNavegarNoPainel();
    // Itens e e-mails vêm do rascunho da sessão (COR-53): recarregar, voltar e avançar de novo não perdem.
    const { rascunho, mudar, descartar, temAlgo } = useRascunhoDaEmissao();
    useAvisoAoSair(temAlgo);
    const itemIds = rascunho.itemIds;
    const emails = rascunho.emails;
    const setEmails = useCallback((fn: (prev: string[]) => string[]) => mudar((atual) => ({ emails: fn(atual.emails) })), [mudar]);
    // Catálogo simulado (`?escala`, COR-54): dá para conferir, mas nada é enviado.
    const { simulado, sessoes, produtos, combos } = useCatalogoDeCortesia();

    // Sem itens ou sem e-mails (aberta direto pela URL), volta ao passo que falta (substitui COR-47).
    // Depois de enviar, o rascunho some de propósito: aí a tela vai para o relatório, não para o passo 1.
    const enviado = useRef(false);
    useEffect(() => {
        if (enviado.current) return;
        if (itemIds.length === 0) navigate("/backstage/itens", { replace: true });
        else if (emails.length === 0) navigate("/backstage/destinatarios", { replace: true });
    }, [itemIds.length, emails.length, navigate]);
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [editingEmail, setEditingEmail] = useState<string | null>(null);
    const [removingEmail, setRemovingEmail] = useState<string | null>(null);
    const [cadastroFilter, setCadastroFilter] = useState<CadastroFilter>("all");
    const [showSendConfirm, setShowSendConfirm] = useState(false);

    // Group the selected items by kind once.
    const groupedItems = useMemo(() => {
        const tickets: TicketItemDetails[] = [];
        const products: ProductItemDetails[] = [];
        const combos: ComboItemDetails[] = [];
        for (const id of itemIds) {
            const details = getItemDetails(id);
            if (!details) continue;
            if (details.kind === "ticket") tickets.push(details);
            else if (details.kind === "product") products.push(details);
            else combos.push(details);
        }
        return { tickets, products, combos };
        // O catálogo chega do banco depois de recarregar: refaz quando ele muda.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itemIds, sessoes, produtos, combos]);

    const itemsPerRecipient = itemIds.length;

    // Freepass: a cota de cortesias que a produtora deu para a pessoa neste evento (COR-94).
    const freepass = usePainel() === "freepass";
    const acesso = useAcessoNoEvento(useEventoAtual().id, freepass);
    const totalCortesias = emails.length * itemsPerRecipient;
    const saldo = acesso?.saldoCortesias ?? null;
    const passouDaCota = saldo !== null && totalCortesias > saldo;

    const emailOccurrences = useMemo(() => {
        const map = new Map<string, number>();
        for (const e of emails) map.set(e, (map.get(e) ?? 0) + 1);
        return map;
    }, [emails]);

    const activeEmails = useMemo(() => {
        // Unique emails, sorted: "sem cadastro" first, then alphabetical.
        return Array.from(emailOccurrences.keys()).sort((a, b) => {
            const aCad = emailHasCadastro(a);
            const bCad = emailHasCadastro(b);
            if (aCad !== bCad) return aCad ? 1 : -1;
            return a.localeCompare(b);
        });
    }, [emailOccurrences]);

    const filteredEmails = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return activeEmails.filter((e) => {
            // Cadastro filter
            if (cadastroFilter !== "all") {
                const hasCad = emailHasCadastro(e);
                if (cadastroFilter === "com" && !hasCad) return false;
                if (cadastroFilter === "sem" && hasCad) return false;
            }
            // Search filter
            if (q && !e.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [activeEmails, searchQuery, cadastroFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredEmails.length / pageSize));
    const safePage = Math.min(page, totalPages - 1);
    const visibleEmails = filteredEmails.slice(
        safePage * pageSize,
        (safePage + 1) * pageSize,
    );

    // Trash button → open confirm modal (does not remove yet).
    const handleRemove = useCallback((email: string) => {
        setRemovingEmail(email);
    }, []);

    // Pencil button → open edit modal (only "sem cadastro" reach this handler).
    const handleEdit = useCallback((email: string) => {
        setEditingEmail(email);
    }, []);

    const handleConfirmRemove = useCallback(() => {
        if (!removingEmail) return;
        setEmails((prev) => prev.filter((e) => e !== removingEmail));
        setRemovingEmail(null);
    }, [removingEmail, setEmails]);

    const handleSaveEdit = useCallback((newEmail: string) => {
        setEmails((prev) => {
            if (!editingEmail) return prev;
            // Drop duplicates that would result from the rename.
            const seen = new Set<string>();
            const out: string[] = [];
            for (const e of prev) {
                const next = e === editingEmail ? newEmail : e;
                if (seen.has(next)) continue;
                seen.add(next);
                out.push(next);
            }
            return out;
        });
        setEditingEmail(null);
    }, [editingEmail, setEmails]);

    const { addPedido } = useCortesiasStore();

    const handleSubmit = useCallback(() => {
        if (activeEmails.length === 0 || passouDaCota || simulado) return;
        setShowSendConfirm(true);
    }, [activeEmails, passouDaCota, simulado]);

    const handleConfirmSend = useCallback(
        ({ orderName }: ConfirmSendCortesiasResult) => {
            const pedido = addPedido({
                nome: orderName,
                emails,
                itemIds,
            });
            // Emitida pelo Freepass, a cortesia conta nas vendas do comissário, sem comissão (FCO-72).
            if (acesso) {
                const itens = itemIds.map(getItemDetails).filter((d): d is NonNullable<typeof d> => !!d);
                registrarCortesias(
                    emails.flatMap((email) =>
                        itens.map((d) => ({
                            comissarioId: acesso.comissario.id,
                            eventoId: acesso.vinculo.eventoId,
                            pedido: pedido.id,
                            comprador: email,
                            vendedor: acesso.pessoa.nome,
                            ingresso: d.name,
                            setor: d.kind === "ticket" ? d.groupName : d.kind === "combo" ? "Combo" : "Produto",
                            quantidade: 1,
                            // Soma no uso do canal Cortesia do grupo dele, quando o item está no canal (ECO-81).
                            itemId: idNoCatalogo(d.id),
                        })),
                    ),
                );
            }
            showSuccessToast(
                "Pedido enviado",
                `${activeEmails.length} ${
                    activeEmails.length === 1
                        ? "destinatário foi notificado"
                        : "destinatários foram notificados"
                }.`,
            );
            setShowSendConfirm(false);
            // Enviado: o rascunho acaba (COR-53).
            enviado.current = true;
            descartar();
            navigate("/backstage/cortesias");
        },
        [emails, activeEmails, itemIds, addPedido, navigate, acesso, descartar],
    );

    const handleBack = useCallback(() => navigate("/backstage/destinatarios"), [navigate]);

    const enviar = (
        <Button size="md" color="primary" iconTrailing={Send01} onClick={handleSubmit} isDisabled={passouDaCota || Boolean(simulado) || activeEmails.length === 0}>
            Enviar cortesias
        </Button>
    );

    return (
        <BackstageLayout activeSection="cortesias" activeItem="emissao-cortesias">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
                <PainelDePassos
                    titulo={TITULO_DA_EMISSAO}
                    passos={ETAPAS_DA_EMISSAO}
                    atual={2}
                    resumoNoCelular={
                        <p className="text-sm font-semibold text-primary">
                            {`${totalCortesias} ${totalCortesias === 1 ? "cortesia" : "cortesias"} para ${activeEmails.length} ${activeEmails.length === 1 ? "destinatário" : "destinatários"}`}
                        </p>
                    }
                    rodapeFim={
                        <>
                            <Button size="md" color="secondary" iconLeading={ChevronLeft} onClick={handleBack}>
                                Voltar
                            </Button>
                            {enviar}
                        </>
                    }
                >
                {simulado && (
                    <p role="status" className="rounded-xl bg-warning-primary px-4 py-3 text-sm text-warning-primary">
                        Catálogo simulado para testar a escala: dá para conferir, mas as cortesias não são enviadas.
                    </p>
                )}
                {saldo !== null && (
                    <p
                        role="status"
                        className={cx(
                            "rounded-xl px-4 py-3 text-sm",
                            passouDaCota ? "bg-error-primary text-error-primary ring-1 ring-error_subtle" : "bg-secondary text-secondary",
                        )}
                    >
                        {passouDaCota
                            ? `Este envio tem ${totalCortesias} cortesias e você só pode enviar mais ${saldo} neste evento. Tire destinatários ou itens, ou peça mais ao organizador.`
                            : `Este envio usa ${totalCortesias} das ${saldo} cortesias que você ainda pode enviar neste evento.`}
                    </p>
                )}
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-4 -mb-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <Input
                                    size="sm"
                                    icon={SearchLg}
                                    placeholder="Busque por e-mail"
                                    aria-label="Busque por e-mail"
                                    value={searchQuery}
                                    onChange={(v: string) => {
                                        setSearchQuery(v);
                                        setPage(0);
                                    }}
                                />
                            </div>
                            <div className="w-full sm:w-56">
                                <Select
                                    size="sm"
                                    aria-label="Filtrar por cadastro"
                                    selectedKey={cadastroFilter}
                                    onSelectionChange={(key: Key) => {
                                        setCadastroFilter(key as CadastroFilter);
                                        setPage(0);
                                    }}
                                    items={CADASTRO_FILTER_OPTIONS}
                                >
                                    {(item: { id: string; label: string }) => (
                                        <Select.Item id={item.id}>{item.label}</Select.Item>
                                    )}
                                </Select>
                            </div>
                        </div>

                    </div>

                    {visibleEmails.length === 0 ? (
                        <div className="rounded-xl bg-secondary_subtle px-6 py-16 text-center text-sm text-tertiary ring-1 ring-border-secondary">
                            Nenhum destinatário encontrado.
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {visibleEmails.map((email) => (
                                <RecipientCard
                                    key={email}
                                    email={email}
                                    quantity={emailOccurrences.get(email) ?? 1}
                                    hasCadastro={emailHasCadastro(email)}
                                    tickets={groupedItems.tickets}
                                    products={groupedItems.products}
                                    combos={groupedItems.combos}
                                    onEdit={() => handleEdit(email)}
                                    onRemove={() => handleRemove(email)}
                                />
                            ))}
                        </div>
                    )}

                    {visibleEmails.length > 0 && (
                        <div className="rounded-xl bg-primary ring-1 ring-border-secondary">
                            <PaginationCardAdvanced
                                page={safePage + 1}
                                total={totalPages}
                                pageSize={pageSize}
                                onPageChange={(p) => setPage(p - 1)}
                                onPageSizeChange={(size) => {
                                    setPageSize(size);
                                    setPage(0);
                                }}
                            />
                        </div>
                    )}
                </div>
                </PainelDePassos>
            </div>

            <EditEmailModal
                isOpen={editingEmail !== null}
                email={editingEmail ?? ""}
                onClose={() => setEditingEmail(null)}
                onSave={handleSaveEdit}
            />
            <ConfirmRemoveEmailModal
                isOpen={removingEmail !== null}
                email={removingEmail ?? ""}
                onClose={() => setRemovingEmail(null)}
                onConfirm={handleConfirmRemove}
            />
            <ConfirmSendCortesiasModal
                isOpen={showSendConfirm}
                recipientCount={activeEmails.length}
                onClose={() => setShowSendConfirm(false)}
                onConfirm={handleConfirmSend}
            />
        </BackstageLayout>
    );
}

/* ------------------------------------------------------------------ */
/*  Recipient card                                                    */
/* ------------------------------------------------------------------ */

interface RecipientCardProps {
    email: string;
    quantity: number;
    hasCadastro: boolean;
    tickets: TicketItemDetails[];
    products: ProductItemDetails[];
    combos: ComboItemDetails[];
    onEdit: () => void;
    onRemove: () => void;
}

const RecipientCard = ({
    email,
    quantity,
    hasCadastro,
    tickets,
    products,
    combos,
    onEdit,
    onRemove,
}: RecipientCardProps) => (
    <div className="rounded-xl bg-secondary ring-1 ring-border-secondary">
        <header className="flex items-center justify-between gap-3 px-4 py-3">
            {/* E-mail inteiro, quebrando linha, em vez de cortado (COR-41). */}
            <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="min-w-0 text-sm font-medium break-all text-primary">{email}</span>
                <Badge
                    size="sm"
                    type="pill-color"
                    color={hasCadastro ? "gray" : "warning"}
                >
                    {hasCadastro ? "Cadastrado" : "Sem cadastro"}
                </Badge>
            </div>
            <div className="flex shrink-0 items-center gap-1">
                {!hasCadastro && (
                    <ButtonUtility
                        size="xs"
                        color="tertiary"
                        icon={Edit01}
                        tooltip={`Editar ${email}`}
                        onClick={onEdit}
                        className="max-md:size-11"
                    />
                )}
                <ButtonUtility
                    size="xs"
                    color="tertiary"
                    icon={Trash01}
                    tooltip={`Remover ${email}`}
                    onClick={onRemove}
                    className="max-md:size-11"
                />
            </div>
        </header>
        <div className="mx-2 mb-2 rounded-lg bg-primary p-4">
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2 lg:grid-cols-3">
                {tickets.map((t) => (
                    <TicketLine key={t.id} item={t} quantity={quantity} />
                ))}
                {products.map((p) => (
                    <ProductLine key={p.id} item={p} quantity={quantity} />
                ))}
                {combos.map((c) => (
                    <ComboLine key={c.id} item={c} quantity={quantity} />
                ))}
            </div>
        </div>
    </div>
);

/* ------------------------------------------------------------------ */
/*  Item lines (per kind)                                             */
/* ------------------------------------------------------------------ */

const Quantity = ({ value = 1 }: { value?: number }) => (
    <span className="text-sm text-tertiary">{value}x</span>
);

const TicketLine = ({
    item,
    quantity = 1,
}: {
    item: TicketItemDetails;
    quantity?: number;
}) => (
    <div className="flex min-w-0 flex-col">
        <div className="flex min-w-0 items-baseline gap-1.5">
            <Quantity value={quantity} />
            <span className="truncate text-sm font-medium text-primary">
                {item.name}, <span className="text-tertiary">{item.ticketType}</span>
            </span>
        </div>
        <span className="truncate pl-5 text-sm text-tertiary">
            {item.groupName}, {item.sessionDate}
        </span>
    </div>
);

const ProductLine = ({
    item,
    quantity = 1,
}: {
    item: ProductItemDetails;
    quantity?: number;
}) => (
    <div className="flex min-w-0 items-center gap-2">
        <img
            src={item.imageUrl}
            alt=""
            className="size-8 shrink-0 rounded-md object-cover ring-1 ring-secondary"
        />
        <Quantity value={quantity} />
        <span className="truncate text-sm font-medium text-primary">{item.name}</span>
    </div>
);

const ComboLine = ({
    item,
    quantity = 1,
}: {
    item: ComboItemDetails;
    quantity?: number;
}) => (
    <div className="flex min-w-0 flex-col">
        <div className="flex min-w-0 items-baseline gap-1.5">
            <Quantity value={quantity} />
            <span className="truncate text-sm font-medium text-primary">{item.name}</span>
        </div>
        <span className="truncate pl-5 text-sm text-tertiary">{item.subtitle}</span>
    </div>
);
