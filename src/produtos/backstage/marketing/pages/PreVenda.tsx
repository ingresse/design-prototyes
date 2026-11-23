import { useMemo, useState, type FC } from "react";
import { I18nProvider, type DateValue } from "react-aria-components";
import { AlertCircle, ArrowDown, ArrowUp, ChevronDown, Eye, HelpCircle, Plus, Star01, Star06, Ticket01, Trash01, User01 } from "@untitledui/icons";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { Badge, BadgeWithDot, BadgeWithIcon } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { CheckboxBase } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { InputDate } from "@/components/base/input/input-date";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { Tooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import { cx } from "@/utils/cx";
import { BackstageLayout } from "../../components/Backstage";
import { CabecalhoDaPagina } from "../../components/cabecalho-da-pagina";
import { RodapeDePaginacao, usePaginacao } from "../../components/rodape-de-paginacao";
import { BarraDaLista, CabecalhoDaTabela, CarregandoTabela, CartaoDaTabela, Celula, LinhaDaTabela, SemResultados, TituloDaLinha, VazioDaTabela } from "../../components/tabela";
import { SelecionarItensSlideOut } from "../components/SelecionarItensSlideOut";
import { CompartilharValorModal } from "../components/CompartilharValorModal";
import { RemoverItemModal } from "../components/RemoverItemModal";
import { ComoFuncionaModal } from "../components/ComoFuncionaModal";
import { type ItemTipo } from "../data/pre-venda-itens";
import { showErrorToast } from "../utils/toast";
import ticketsEmpty from "../assets/tickets-empty.png";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
});

type TabKey = "todos" | "ingressos" | "combos";

/** Colunas ordenáveis da tabela de itens participantes (pós-criação). */
type SortKey = "nome" | "ofertas" | "ticket" | "valor" | "limite";

type Step = "empty" | "config" | "ready";

const TAB_OPTIONS: { id: TabKey; label: string }[] = [
    { id: "todos", label: "Todos" },
    { id: "ingressos", label: "Ingressos" },
    { id: "combos", label: "Combos" },
];

/** Filtro por tipo: botões segmentados do DS, à direita da busca (BKS-111). */
const FiltroDeTipo = ({ value, onChange }: { value: TabKey; onChange: (v: TabKey) => void }) => (
    <ButtonGroup
        size="sm"
        aria-label="Tipo do item"
        disallowEmptySelection
        selectedKeys={[value]}
        onSelectionChange={(keys) => {
            const [k] = [...keys];
            if (k !== undefined) onChange(String(k) as TabKey);
        }}
        className="w-full sm:w-max"
    >
        {TAB_OPTIONS.map((tab) => (
            <ButtonGroupItem key={tab.id} id={tab.id} className="flex-1 justify-center sm:flex-none">
                {tab.label}
            </ButtonGroupItem>
        ))}
    </ButtonGroup>
);

export function PreVenda() {
    const [step, setStep] = useState<Step>("empty");
    const [transitioning, setTransitioning] = useState(false);
    const [proximo, setProximo] = useState<Step>("empty");
    const [draft, setDraft] = useState<PreVendaDraft | null>(null);
    const [savedItens, setSavedItens] = useState<ConfiguredItem[]>([]);

    // Exibe um loading de página sempre que transiciona entre etapas.
    const goToStep = (next: Step) => {
        setProximo(next);
        setTransitioning(true);
        setTimeout(() => {
            setStep(next);
            setTransitioning(false);
        }, 1600);
    };

    return (
        <BackstageLayout showEventContext={false} showLayoutSwitcher={false}>
            <div className="flex min-w-0 flex-1 flex-col gap-6">
                {transitioning ? (
                    <PageTransitionLoading titulo={proximo === "config" ? "Configuração de pré-venda" : "Pré-venda"} />
                ) : (
                    <>
                        {step === "empty" && <EmptyState onCriar={() => goToStep("config")} />}

                        {step === "config" && (
                            <CreationStep
                                initial={draft}
                                // Ao editar (já existe draft) o voltar retorna à tela criada; ao criar do zero, ao empty.
                                onBack={() => goToStep(draft ? "ready" : "empty")}
                                onSalvar={(items, novoDraft) => {
                                    setSavedItens(items);
                                    setDraft(novoDraft);
                                    goToStep("ready");
                                }}
                            />
                        )}

                        {step === "ready" && <ReadyScreen items={savedItens} onEditar={() => goToStep("config")} />}
                    </>
                )}
            </div>
        </BackstageLayout>
    );
}

/** Carregando entre etapas: o cabeçalho da etapa seguinte e as linhas pulsando (BKS-100, BKS-116). */
const PageTransitionLoading = ({ titulo }: { titulo: string }) => (
    <div className="flex flex-1 flex-col gap-6">
        <CabecalhoDaPagina titulo={titulo} />
        <CarregandoTabela linhas={5} />
    </div>
);

/* ------------------------------------------------------------------ */
/*  Etapa de criação (Configuração de pré-venda)                      */
/* ------------------------------------------------------------------ */

interface CreationStepProps {
    /** Parâmetros previamente informados — preenchidos ao editar uma pré-venda existente. */
    initial?: PreVendaDraft | null;
    onBack: () => void;
    onSalvar: (items: ConfiguredItem[], draft: PreVendaDraft) => void;
}

const CreationStep = ({ initial, onBack, onSalvar }: CreationStepProps) => {
    const [compartilhar, setCompartilhar] = useState(initial?.compartilhar ?? false);
    const [inicio, setInicio] = useState<DateValue | null>(initial?.inicio ?? null);
    const [fim, setFim] = useState<DateValue | null>(initial?.fim ?? null);
    const [itens, setItens] = useState<string[]>(initial?.itens ?? []);
    const [valores, setValores] = useState<Record<string, string>>(initial?.valores ?? {});
    const [limites, setLimites] = useState<Record<string, string>>(initial?.limites ?? {});
    const [limiteEvento, setLimiteEvento] = useState(initial?.limiteEvento ?? "");
    const [triedSave, setTriedSave] = useState(false);
    const [slideoutOpen, setSlideoutOpen] = useState(false);
    const [itensLoading, setItensLoading] = useState(false);

    const inicioInvalid = triedSave && !inicio;
    const fimInvalid = triedSave && !fim;
    const itensInvalid = triedSave && itens.length === 0;
    const hasItens = !itensLoading && itens.length > 0;
    const selectedItens = useMemo(() => buildSelectedItens(itens), [itens]);

    const handleSalvar = () => {
        setTriedSave(true);

        const datasOk = !!inicio && !!fim;
        const itensOk = itens.length > 0;

        if (!itensOk) {
            showErrorToast(
                "Adicione ao menos um item",
                "Para criar a sua pré-venda, selecione ao menos um item participante.",
            );
        }

        if (datasOk && itensOk) {
            const configurados: ConfiguredItem[] = selectedItens.map((item) => ({
                ...item,
                valorMinimo: valores[item.id] ?? "",
                limite: limites[item.id] ?? "",
            }));
            onSalvar(configurados, { inicio, fim, itens, valores, limites, compartilhar, limiteEvento });
        }
    };

    return (
        <>
            <CabecalhoDaPagina
                className="sticky top-6 z-20 bg-primary pb-3 shadow-[0_-24px_0_0_var(--color-bg-primary)]"
                voltar={{ rotulo: "Pré-venda", onClick: onBack }}
                titulo="Configuração de pré-venda"
                acoes={
                    <Button size="md" color="primary" onClick={handleSalvar}>
                        Salvar
                    </Button>
                }
            />

            <main className="flex flex-1 flex-col gap-6">
                {/* Configurações gerais */}
                <section className="flex flex-col gap-4">
                    <h2 className="text-md font-semibold text-primary">Configurações gerais</h2>
                    <div className="flex flex-col gap-4 rounded-xl bg-primary p-6 ring-1 ring-border-secondary">
                        <div className="grid gap-4 md:grid-cols-2">
                            <I18nProvider locale="pt-BR">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <InputDate
                                        size="md"
                                        label="Data de início"
                                        isRequired
                                        granularity="minute"
                                        hourCycle={24}
                                        value={inicio}
                                        onChange={setInicio}
                                        isInvalid={inicioInvalid}
                                        hint={inicioInvalid ? "Campo obrigatório" : undefined}
                                    />
                                    <InputDate
                                        size="md"
                                        label="Data de fim"
                                        isRequired
                                        granularity="minute"
                                        hourCycle={24}
                                        value={fim}
                                        onChange={setFim}
                                        isInvalid={fimInvalid}
                                        hint={fimInvalid ? "Campo obrigatório" : undefined}
                                    />
                                </div>
                            </I18nProvider>
                            <Input
                                size="md"
                                label="Limite de emissões do evento"
                                placeholder="Se vazio, o limite será o definido em cada item"
                                inputMode="numeric"
                                value={limiteEvento}
                                onChange={(v: string) => setLimiteEvento(maskValue(v, "integer"))}
                            />
                        </div>

                        <CompartilharCard isSelected={compartilhar} onChange={setCompartilhar} />
                    </div>
                </section>

                {/* Itens participantes */}
                <section className="flex flex-col gap-4">
                    <CabecalhoDosItens quantidade={hasItens ? itens.length : undefined} onEditar={hasItens ? () => setSlideoutOpen(true) : undefined} />

                    {itensLoading ? (
                        <CarregandoTabela linhas={4} rotulo="Atualizando seus itens…" />
                    ) : itens.length === 0 ? (
                        // Salvar sem itens destaca o bloco em vermelho (MKT-21).
                        <div className={cx("overflow-hidden rounded-2xl transition duration-100 ease-linear", itensInvalid ? "ring-2 ring-error" : "ring-1 ring-secondary")}>
                            <VazioDaTabela
                                icone={Ticket01}
                                titulo="Quais itens estarão na pré-venda?"
                                texto="Clique no botão abaixo e selecione os itens participantes da pré-venda."
                                acao={
                                    <Button size="md" color="primary" iconLeading={Plus} onClick={() => setSlideoutOpen(true)}>
                                        Selecionar itens
                                    </Button>
                                }
                            />
                        </div>
                    ) : (
                        <ItensConfigTable
                            items={selectedItens}
                            valores={valores}
                            setValores={setValores}
                            limites={limites}
                            setLimites={setLimites}
                            onRemove={(id) => setItens((prev) => prev.filter((x) => x !== id))}
                        />
                    )}
                </section>
            </main>

            <SelecionarItensSlideOut
                isOpen={slideoutOpen}
                selectedIds={itens}
                onClose={() => setSlideoutOpen(false)}
                onConfirm={(ids) => {
                    setSlideoutOpen(false);
                    setItensLoading(true);
                    setTimeout(() => {
                        setItens(ids);
                        setItensLoading(false);
                    }, 3000);
                }}
            />
        </>
    );
};

const CompartilharCard = ({
    isSelected,
    onChange,
}: {
    isSelected: boolean;
    onChange: (v: boolean) => void;
}) => (
    <div
        role="checkbox"
        aria-checked={isSelected}
        aria-label="Compartilhar valor do primeiro lote"
        tabIndex={0}
        onClick={() => onChange(!isSelected)}
        onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                onChange(!isSelected);
            }
        }}
        className={cx(
            "flex cursor-pointer items-start gap-3 rounded-xl bg-primary p-4 outline-none transition duration-100 ease-linear hover:bg-primary_hover",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
            isSelected ? "ring-2 ring-brand" : "ring-1 ring-border-secondary",
        )}
    >
        <FeaturedIcon icon={Eye} color="gray" theme="modern" size="md" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-bold text-secondary">
                    Compartilhar valor do primeiro lote
                </span>
                <span className="text-sm text-fg-brand-primary">Recomendado</span>
            </div>
            <p className="text-sm text-tertiary">
                Marque para mostrar ao comprador o valor do primeiro lote do ingresso selecionado
                para ajudá-lo na tomada de decisão.
            </p>
        </div>
        <CheckboxBase size="sm" isSelected={isSelected} className="mt-0.5" />
    </div>
);

/** Título da seção de itens: nome, quantidade e "Editar" (abre o painel de seleção). */
const CabecalhoDosItens = ({ quantidade, onEditar }: { quantidade?: number; onEditar?: () => void }) => (
    <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex items-center gap-2">
                <h2 className="text-md font-semibold text-primary">Itens participantes</h2>
                {quantidade !== undefined && (
                    <Badge size="sm" type="modern" color="gray">
                        {quantidade}
                    </Badge>
                )}
            </div>
            <p className="text-sm text-tertiary">Adicione e gerencie os itens que participarão da pré-venda aqui</p>
        </div>
        {onEditar && (
            <Button size="md" color="secondary" onClick={onEditar} className="shrink-0">
                Editar
            </Button>
        )}
    </header>
);

/* ------------------------------------------------------------------ */
/*  Tabela de itens selecionados (editável)                           */
/* ------------------------------------------------------------------ */

interface SelectedItem {
    id: string;
    nome: string;
    grupo: string;
    tipo: ItemTipo;
}

/** Item já salvo na pré-venda, com valor mínimo e limite ajustados (strings com máscara). */
interface ConfiguredItem extends SelectedItem {
    valorMinimo: string;
    limite: string;
}

/** Todos os parâmetros informados na etapa de criação — reaproveitados ao editar. */
interface PreVendaDraft {
    inicio: DateValue | null;
    fim: DateValue | null;
    itens: string[];
    valores: Record<string, string>;
    limites: Record<string, string>;
    compartilhar: boolean;
    limiteEvento: string;
}

/** Rótulo de cada sessão (nível extra exclusivo dos ingressos). */
const SESSAO_LABEL: Record<string, string> = {
    "1": "05/06/2026 às 16:00",
    "2": "06/06/2026 às 16:00",
};

const buildSelectedItens = (leafIds: string[]): SelectedItem[] =>
    leafIds.map((id) => {
        const isCombo = id.startsWith("com");
        const parts = id.split("-");
        if (isCombo) {
            // `com-grupo-${a|b|c}-${inteira|meia}` — combos não têm sessão.
            const grupoLetra = (parts[2] ?? "").toUpperCase();
            const variante = parts[3] === "meia" ? "Meia" : "Inteira";
            return { id, nome: variante, grupo: `Grupo ${grupoLetra}`, tipo: "combo" as const };
        }
        // `ing-sessao-${n}-grupo-${a|b|c}-${inteira|meia}`
        // Linha 1: nome do ingresso (variante) · Linha 2: Sessão • nome do grupo
        const sessao = SESSAO_LABEL[parts[2]] ?? "";
        const grupoLetra = (parts[4] ?? "").toUpperCase();
        const variante = parts[5] === "meia" ? "Meia" : "Inteira";
        return {
            id,
            nome: variante,
            grupo: sessao ? `${sessao} • Grupo ${grupoLetra}` : `Grupo ${grupoLetra}`,
            tipo: "ingresso" as const,
        };
    });

const thousandsFormatter = new Intl.NumberFormat("pt-BR");

/** Hash simples e estável a partir do id (para dados fake determinísticos). */
const hashId = (id: string) => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return h;
};

/** Converte um valor mascarado em reais (ex.: "R$ 100,00" → 100). */
const parseReais = (masked: string) => Number(masked.replace(/\D/g, "")) / 100 || 0;

/** Dados fake (determinísticos) de ofertas/ticket médio exibidos quando a pré-venda está em andamento. */
const getOfertaData = (item: ConfiguredItem) => {
    const seed = hashId(item.id);
    const base = parseReais(item.valorMinimo) || 100;
    const ofertas = 40 + (seed % 260);
    // A base da faixa nunca pode ficar abaixo do valor mínimo cadastrado no item.
    const faixaMin = base;
    const ticket = base + 20 + (seed % 80);
    const faixaMax = ticket + 20 + (seed % 60);
    return { ofertas, ticket, faixaMin, faixaMax };
};

/** Formata o valor digitado conforme a máscara (centavos para moeda, inteiro para milhares). */
const maskValue = (raw: string, mask: "currency" | "integer") => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return "";
    if (mask === "currency") {
        return currencyFormatter.format(parseInt(digits, 10) / 100);
    }
    return thousandsFormatter.format(parseInt(digits, 10));
};

const CellInput = ({
    placeholder,
    mask,
    rotulo,
    value,
    onChange,
    onShare,
}: {
    placeholder: string;
    mask: "currency" | "integer";
    /** Nome do campo para leitor de tela. */
    rotulo: string;
    value: string;
    onChange: (value: string) => void;
    onShare?: () => void;
}) => (
    <div className="flex w-full min-w-0 flex-1 items-center rounded-lg bg-primary shadow-xs ring-1 ring-primary transition-shadow duration-100 ease-linear focus-within:ring-2 focus-within:ring-brand">
        <input
            type="text"
            inputMode="numeric"
            aria-label={rotulo}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(maskValue(e.target.value, mask))}
            className="w-full min-w-0 bg-transparent px-3 py-2 text-sm text-primary tabular-nums outline-none placeholder:text-placeholder"
        />
        <Tooltip title="Compartilhar dado com outros itens" placement="top">
            <TooltipTrigger
                aria-label="Compartilhar dado com outros itens"
                onPress={onShare}
                isDisabled={!value}
                className="flex size-9 shrink-0 items-center justify-center border-l border-secondary text-fg-quaternary transition duration-100 ease-linear hover:text-fg-secondary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-fg-quaternary"
            >
                <Star06 className="size-4" />
            </TooltipTrigger>
        </Tooltip>
    </div>
);

/** Busca ou filtro sem resultado, dentro do cartão (BKS-118, MKT-40). */
const textoSemResultado = (query: string, tab: TabKey) =>
    query
        ? `Nenhum item encontrado para “${query}”.`
        : `Nenhum item encontrado: sua pré-venda não possui ${tab === "combos" ? "combos" : "ingressos"} selecionados.`;

/** Larguras das colunas no modo tabela (cartão com 704 px ou mais, BKS-115). */
const COL = { valor: "@min-[44rem]:w-48", limite: "@min-[44rem]:w-40", ofertas: "@min-[44rem]:w-24", ticket: "@min-[44rem]:w-48", valorLido: "@min-[44rem]:w-32", limiteLido: "@min-[44rem]:w-24" };

interface ItensConfigTableProps {
    items: SelectedItem[];
    valores: Record<string, string>;
    setValores: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    limites: Record<string, string>;
    setLimites: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    onRemove: (id: string) => void;
}

const ItensConfigTable = ({
    items,
    valores,
    setValores,
    limites,
    setLimites,
    onRemove,
}: ItensConfigTableProps) => {
    const [activeTab, setActiveTab] = useState<TabKey>("todos");
    const [search, setSearch] = useState("");
    const [share, setShare] = useState<{ kind: "valor" | "limite"; sourceId: string } | null>(null);
    const [removeId, setRemoveId] = useState<string | null>(null);

    const handleShareConfirm = (option: "todos" | "sem-preco") => {
        if (!share) return;
        const { kind, sourceId } = share;
        const setMap = kind === "valor" ? setValores : setLimites;
        const sourceValue = (kind === "valor" ? valores : limites)[sourceId] ?? "";

        setMap((prev) => {
            const next = { ...prev };
            items.forEach((item) => {
                const current = next[item.id] ?? "";
                if (option === "todos") {
                    // Sobrescreve todos os campos com o valor de origem.
                    next[item.id] = sourceValue;
                } else if (!current) {
                    // Apenas os vazios são preenchidos; os já informados ficam intactos.
                    next[item.id] = sourceValue;
                }
            });
            return next;
        });

        setShare(null);
    };

    const filtered = useMemo(() => {
        return items.filter((item) => {
            if (activeTab === "ingressos" && item.tipo !== "ingresso") return false;
            if (activeTab === "combos" && item.tipo !== "combo") return false;
            if (search.trim()) {
                const q = search.trim().toLowerCase();
                if (!item.nome.toLowerCase().includes(q) && !item.grupo.toLowerCase().includes(q)) {
                    return false;
                }
            }
            return true;
        });
    }, [items, activeTab, search]);
    // Busca, filtro ou tamanho novo voltam à página 1 (BKS-114).
    const paginacao = usePaginacao(filtered, [activeTab, search]);

    return (
        <>
            <div className="flex flex-col gap-4">
                <BarraDaLista busca={{ valor: search, onChange: setSearch, placeholder: "Buscar por nome ou grupo", rotulo: "Buscar item" }} filtro={<FiltroDeTipo value={activeTab} onChange={setActiveTab} />} />
                <CartaoDaTabela>
                    <CabecalhoDaTabela ordenavel>
                        <span className="min-w-0 flex-1">Nome</span>
                        <span className={cx("inline-flex items-center gap-1", COL.valor)}>
                            Valor mínimo
                            <Dica texto="O valor em que as ofertas devem iniciar." />
                        </span>
                        <span className={cx("inline-flex items-center gap-1", COL.limite)}>
                            Limite
                            <Dica texto="O número máximo de emissões deste ingresso que deve ocorrer durante a pré-venda" />
                        </span>
                        <span className="w-8" />
                    </CabecalhoDaTabela>
                    {filtered.length === 0 ? (
                        <SemResultados
                            texto={textoSemResultado(search.trim(), activeTab)}
                            onLimpar={() => {
                                setSearch("");
                                setActiveTab("todos");
                            }}
                        />
                    ) : (
                        <ul className="flex flex-col divide-y divide-secondary">
                            {paginacao.visiveis.map((item) => (
                                <LinhaDaTabela key={item.id} interativa>
                                    <div className="flex min-w-0 flex-1 flex-col gap-2 @min-[44rem]:flex-row @min-[44rem]:items-center @min-[44rem]:gap-4">
                                        <TituloDaLinha titulo={item.nome} apoio={item.grupo} />
                                        <Celula rotulo="Valor mínimo" className={cx("flex-col items-stretch gap-1.5", COL.valor)}>
                                            <CellInput
                                                placeholder="R$ 0,00"
                                                mask="currency"
                                                rotulo={`Valor mínimo de ${item.nome}, ${item.grupo}`}
                                                value={valores[item.id] ?? ""}
                                                onChange={(v) => setValores((prev) => ({ ...prev, [item.id]: v }))}
                                                onShare={() => setShare({ kind: "valor", sourceId: item.id })}
                                            />
                                        </Celula>
                                        <Celula rotulo="Limite" className={cx("flex-col items-stretch gap-1.5", COL.limite)}>
                                            <CellInput
                                                placeholder="0"
                                                mask="integer"
                                                rotulo={`Limite de ${item.nome}, ${item.grupo}`}
                                                value={limites[item.id] ?? ""}
                                                onChange={(v) => setLimites((prev) => ({ ...prev, [item.id]: v }))}
                                                onShare={() => setShare({ kind: "limite", sourceId: item.id })}
                                            />
                                        </Celula>
                                    </div>
                                    <ButtonUtility
                                        size="sm"
                                        color="tertiary"
                                        icon={Trash01}
                                        tooltip="Remover item"
                                        onClick={() => setRemoveId(item.id)}
                                        className="shrink-0"
                                    />
                                </LinhaDaTabela>
                            ))}
                        </ul>
                    )}
                    <RodapeDePaginacao {...paginacao} />
                </CartaoDaTabela>
            </div>

            <CompartilharValorModal
                isOpen={share !== null}
                kind={share?.kind ?? "valor"}
                onClose={() => setShare(null)}
                onConfirm={handleShareConfirm}
            />

            <RemoverItemModal
                isOpen={removeId !== null}
                onClose={() => setRemoveId(null)}
                onConfirm={() => {
                    if (removeId) onRemove(removeId);
                }}
            />
        </>
    );
};

/* ------------------------------------------------------------------ */
/*  Empty state (entrada do fluxo)                                    */
/* ------------------------------------------------------------------ */

const EmptyState = ({ onCriar }: { onCriar: () => void }) => {
    const [comoFuncionaOpen, setComoFuncionaOpen] = useState(false);
    return (
    <>
        <CabecalhoDaPagina titulo="Pré-venda" />
        <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden pb-40">
            <div className="z-10 flex flex-col items-center gap-6 text-center">
                <div className="flex flex-col items-center">
                    <p className="text-[48px] font-normal italic leading-[56px] text-quaternary">
                        Antecipe vendas
                    </p>
                    <h2 className="-mt-3 text-[56px] font-bold leading-[64px] text-primary">
                        em eventos concorridos
                    </h2>
                </div>
                <p className="max-w-[570px] text-sm leading-5 tracking-[0.28px] text-tertiary">
                    Crie uma pré-venda para eventos de alta demanda, antecipe receita e entenda
                    quanto o público está disposto a pagar antes de abrir os lotes oficiais.
                </p>
                <div className="flex items-center gap-3">
                    <Button size="lg" color="secondary" onClick={() => setComoFuncionaOpen(true)}>
                        Como funciona?
                    </Button>
                    <Button size="lg" color="primary" onClick={onCriar}>
                        Criar pré-venda
                    </Button>
                </div>
            </div>

            <img
                src={ticketsEmpty}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 left-1/2 w-[711px] max-w-[90%] -translate-x-1/2 select-none"
            />
        </main>

        <ComoFuncionaModal
            isOpen={comoFuncionaOpen}
            onClose={() => setComoFuncionaOpen(false)}
            onCriar={onCriar}
        />
    </>
    );
};

/* ------------------------------------------------------------------ */
/*  Header                                                            */
/* ------------------------------------------------------------------ */

const Header = ({ emAndamento, onIniciar, onEditar }: { emAndamento: boolean; onIniciar: () => void; onEditar: () => void }) => {
    const publicado = false;
    return (
    <CabecalhoDaPagina
        className="sticky top-6 z-20 bg-primary pb-6 shadow-[0_-24px_0_0_var(--color-bg-primary)]"
        titulo="Pré-venda"
        selo={
            !publicado ? (
                <BadgeWithDot size="sm" type="pill-color" color="gray">
                    Rascunho
                </BadgeWithDot>
            ) : emAndamento ? (
                <BadgeWithDot size="sm" type="pill-color" color="success">
                    Em andamento
                </BadgeWithDot>
            ) : (
                <button
                    type="button"
                    onClick={onIniciar}
                    title="Simular pré-venda em andamento"
                    className="cursor-pointer rounded-full outline-none transition duration-100 ease-linear hover:opacity-80 focus-visible:ring-2 focus-visible:ring-brand"
                >
                    <BadgeWithDot size="sm" type="pill-color" color="orange">
                        Agendada
                    </BadgeWithDot>
                </button>
            )
        }
        subtitulo={
            <>
                Disponível entre{" "}
                <span className="font-semibold text-secondary">01/02/2026 às 10:00</span> e{" "}
                <span className="font-semibold text-secondary">07/02/2026 às 10:00</span>.
            </>
        }
        acoes={
            <>
                {/* Uma vez em andamento, a pré-venda não pode mais ser cancelada. */}
                {!emAndamento && (
                    <Button size="md" color="secondary">
                        Cancelar pré-venda
                    </Button>
                )}
                <Button size="md" color="secondary" onClick={onEditar}>
                    Editar
                </Button>
            </>
        }
    />
    );
};

/* ------------------------------------------------------------------ */
/*  Publish alert                                                     */
/* ------------------------------------------------------------------ */

const PublishAlert = () => {
    const publicado = false;
    if (publicado) return null;
    return (
    <div className="flex items-start gap-4 rounded-xl bg-primary_alt p-4 shadow-xs ring-1 ring-border-primary">
        <FeaturedIcon className="mt-0.5" icon={AlertCircle} color="warning" theme="outline" size="md" />
        <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-secondary">
                Publique o evento para ativar a pré-venda no período definido
            </p>
            <p className="text-sm text-tertiary">
                A pré-venda só acontecerá se o evento estiver publicado e dentro das datas
                configuradas.
            </p>
        </div>
    </div>
    );
};

/* ------------------------------------------------------------------ */
/*  Metrics                                                           */
/* ------------------------------------------------------------------ */

interface MetricCardProps {
    icon: FC<{ className?: string }>;
    label: string;
    value: string;
    showMenu?: boolean;
}

const MetricCard = ({ icon: Icon, label, value, showMenu }: MetricCardProps) => (
    <div className="flex flex-col gap-4 rounded-xl bg-primary p-5 ring-1 ring-border-secondary">
        <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg text-fg-secondary ring-1 ring-border-secondary">
                    <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="text-sm font-medium text-tertiary">{label}</span>
            </div>
            {showMenu && (
                <button
                    type="button"
                    aria-label="Mais opções"
                    className="flex size-6 items-center justify-center rounded-md text-fg-quaternary transition duration-100 ease-linear hover:bg-primary_hover hover:text-fg-secondary"
                >
                    <span className="flex flex-col items-center gap-0.5">
                        <span className="size-0.5 rounded-full bg-current" />
                        <span className="size-0.5 rounded-full bg-current" />
                        <span className="size-0.5 rounded-full bg-current" />
                    </span>
                </button>
            )}
        </div>
        <p className="text-display-sm font-semibold text-primary">{value}</p>
    </div>
);

const MetricsRow = ({ emAndamento }: { emAndamento: boolean }) => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard icon={User01} label="Ofertas" value={emAndamento ? "12.440" : "0"} showMenu />
        <MetricCard icon={Ticket01} label="Ticket médio" value={emAndamento ? "R$ 200" : "R$ 0"} />
        <MetricCard icon={Star01} label="Maior oferta" value={emAndamento ? "R$ 1.000" : "R$ 0"} />
    </div>
);

/* ------------------------------------------------------------------ */
/*  Acompanhamento de ofertas (pré-venda em andamento)                */
/* ------------------------------------------------------------------ */

interface OfertaPonto {
    dia: string;
    ofertas: number;
    ticketMedio: number;
}

const OFERTAS_CHART: OfertaPonto[] = [
    { dia: "01/02", ofertas: 1200, ticketMedio: 178 },
    { dia: "02/02", ofertas: 1900, ticketMedio: 186 },
    { dia: "03/02", ofertas: 1500, ticketMedio: 193 },
    { dia: "04/02", ofertas: 2100, ticketMedio: 198 },
    { dia: "05/02", ofertas: 1700, ticketMedio: 205 },
    { dia: "06/02", ofertas: 2300, ticketMedio: 211 },
    { dia: "07/02", ofertas: 1740, ticketMedio: 200 },
];

const OfertasTooltip = ({
    active,
    payload,
    label,
}: {
    active?: boolean;
    label?: string;
    payload?: { payload: OfertaPonto }[];
}) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="flex flex-col gap-1 rounded-lg bg-primary px-3 py-2 shadow-lg ring-1 ring-border-secondary">
            <p className="text-xs font-semibold text-primary">{label}</p>
            <p className="text-xs text-tertiary">
                <span className="font-medium text-secondary">{thousandsFormatter.format(d.ofertas)}</span> ofertas
            </p>
            <p className="text-xs text-tertiary">
                Ticket médio{" "}
                <span className="font-medium text-secondary">{currencyFormatter.format(d.ticketMedio)}</span>
            </p>
        </div>
    );
};

const AcompanhamentoOfertasCard = () => (
    <section className="flex flex-col gap-5 overflow-clip rounded-xl bg-primary p-6 ring-1 ring-border-secondary">
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1 text-sm font-semibold text-tertiary">
                Acompanhamento de ofertas
                <ChevronDown className="size-4 text-fg-quaternary" aria-hidden="true" />
            </div>
            <div className="flex items-center gap-3">
                <span className="text-display-sm font-semibold text-primary tabular-nums">12.440</span>
                <BadgeWithIcon size="sm" type="pill-color" color="success" iconLeading={ArrowUp}>
                    2.4%
                </BadgeWithIcon>
            </div>
        </div>
        <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={OFERTAS_CHART} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--color-border-secondary)" />
                    <XAxis
                        dataKey="dia"
                        tickLine={false}
                        axisLine={{ stroke: "var(--color-border-secondary)" }}
                        tick={{ fill: "var(--color-fg-quaternary)", fontSize: 12 }}
                        dy={8}
                    />
                    <YAxis
                        width={44}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "var(--color-fg-quaternary)", fontSize: 12 }}
                        tickFormatter={(v: number) => thousandsFormatter.format(v)}
                    />
                    <RechartsTooltip
                        content={<OfertasTooltip />}
                        cursor={{ stroke: "var(--color-border-secondary)", strokeDasharray: "4 4" }}
                    />
                    <Line
                        type="monotone"
                        dataKey="ofertas"
                        stroke="var(--color-utility-brand-600)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: "var(--color-utility-brand-600)", stroke: "var(--color-bg-primary)", strokeWidth: 2 }}
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    </section>
);

/* ------------------------------------------------------------------ */
/*  Tela final (Pré-venda criada)                                     */
/* ------------------------------------------------------------------ */

const ReadyScreen = ({ items, onEditar }: { items: ConfiguredItem[]; onEditar: () => void }) => {
    const [emAndamento, setEmAndamento] = useState(false);

    return (
        <>
            <Header emAndamento={emAndamento} onIniciar={() => setEmAndamento(true)} onEditar={onEditar} />
            <main className="flex flex-1 flex-col gap-6">
                <PublishAlert />
                <MetricsRow emAndamento={emAndamento} />
                {emAndamento && <AcompanhamentoOfertasCard />}
                <ItensParticipantesCard items={items} onEditar={onEditar} emAndamento={emAndamento} />
            </main>
        </>
    );
};

/* ------------------------------------------------------------------ */
/*  Itens participantes                                               */
/* ------------------------------------------------------------------ */

const ItensParticipantesCard = ({
    items,
    onEditar,
    emAndamento,
}: {
    items: ConfiguredItem[];
    onEditar: () => void;
    emAndamento: boolean;
}) => {
    const [activeTab, setActiveTab] = useState<TabKey>("todos");
    const [search, setSearch] = useState("");

    const filtered = useMemo(() => {
        return items.filter((item) => {
            if (activeTab === "ingressos" && item.tipo !== "ingresso") return false;
            if (activeTab === "combos" && item.tipo !== "combo") return false;
            if (search.trim()) {
                const q = search.trim().toLowerCase();
                if (!item.nome.toLowerCase().includes(q) && !item.grupo.toLowerCase().includes(q)) {
                    return false;
                }
            }
            return true;
        });
    }, [items, activeTab, search]);

    const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);

    const handleSort = (key: SortKey) => {
        setSort((prev) =>
            prev && prev.key === key
                ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
                : { key, dir: "asc" },
        );
    };

    const sorted = useMemo(() => {
        if (!sort) return filtered;
        const value = (item: ConfiguredItem): string | number => {
            switch (sort.key) {
                case "nome":
                    return item.nome.toLowerCase();
                case "ofertas":
                    return emAndamento ? getOfertaData(item).ofertas : 0;
                case "ticket":
                    return emAndamento ? getOfertaData(item).ticket : 0;
                case "valor":
                    return Number(item.valorMinimo.replace(/\D/g, "")) || 0;
                case "limite":
                    return Number(item.limite.replace(/\D/g, "")) || 0;
            }
        };
        const arr = [...filtered].sort((a, b) => {
            const av = value(a);
            const bv = value(b);
            if (av < bv) return -1;
            if (av > bv) return 1;
            return 0;
        });
        return sort.dir === "desc" ? arr.reverse() : arr;
    }, [filtered, sort, emAndamento]);

    // Busca, filtro ou tamanho novo voltam à página 1 (BKS-114).
    const paginacao = usePaginacao(sorted, [activeTab, search]);

    return (
        <section className="flex flex-col gap-4">
            <CabecalhoDosItens quantidade={items.length} onEditar={onEditar} />
            <BarraDaLista busca={{ valor: search, onChange: setSearch, placeholder: "Buscar por nome ou grupo", rotulo: "Buscar item" }} filtro={<FiltroDeTipo value={activeTab} onChange={setActiveTab} />} />
            <CartaoDaTabela>
                <CabecalhoDaTabela ordenavel>
                    <BotaoOrdenar label="Nome" sortKey="nome" sort={sort} onSort={handleSort} className="min-w-0 flex-1" />
                    <BotaoOrdenar label="Ofertas" sortKey="ofertas" sort={sort} onSort={handleSort} className={cx("justify-end", COL.ofertas)} />
                    <BotaoOrdenar label="Ticket médio" sortKey="ticket" hint="Valor médio das ofertas recebidas durante a pré-venda." sort={sort} onSort={handleSort} className={cx("justify-end", COL.ticket)} />
                    <BotaoOrdenar label="Valor mínimo" sortKey="valor" hint="O valor em que as ofertas devem iniciar." sort={sort} onSort={handleSort} className={cx("justify-end", COL.valorLido)} />
                    <BotaoOrdenar label="Limite" sortKey="limite" sort={sort} onSort={handleSort} className={cx("justify-end", COL.limiteLido)} />
                </CabecalhoDaTabela>
                {filtered.length === 0 ? (
                    <SemResultados
                        texto={textoSemResultado(search.trim(), activeTab)}
                        onLimpar={() => {
                            setSearch("");
                            setActiveTab("todos");
                        }}
                    />
                ) : (
                    <ul className="flex flex-col divide-y divide-secondary">
                        {paginacao.visiveis.map((item) => (
                            <ItemRow key={item.id} item={item} emAndamento={emAndamento} />
                        ))}
                    </ul>
                )}
                <RodapeDePaginacao {...paginacao} />
            </CartaoDaTabela>
        </section>
    );
};

/** Ícone de ajuda com a explicação da coluna. */
const Dica = ({ texto }: { texto: string }) => (
    <Tooltip title={texto} placement="top">
        <TooltipTrigger aria-label={texto} className="cursor-help text-fg-quaternary transition duration-100 ease-linear hover:text-fg-quaternary_hover">
            <HelpCircle className="size-3.5" />
        </TooltipTrigger>
    </Tooltip>
);

/** Coluna ordenável — clique alterna asc/desc; a seta aparece só na coluna ativa (BKS-112). */
const BotaoOrdenar = ({
    label,
    sortKey,
    hint,
    sort,
    onSort,
    className,
}: {
    label: string;
    sortKey: SortKey;
    hint?: string;
    sort: { key: SortKey; dir: "asc" | "desc" } | null;
    onSort: (key: SortKey) => void;
    className?: string;
}) => {
    const active = sort?.key === sortKey;
    const Arrow = active && sort?.dir === "desc" ? ArrowDown : ArrowUp;
    return (
        <span className={cx("inline-flex items-center gap-1", className)}>
            <button
                type="button"
                onClick={() => onSort(sortKey)}
                aria-label={`Ordenar por ${label}`}
                className="inline-flex cursor-pointer items-center gap-1 rounded outline-none transition duration-100 ease-linear hover:text-secondary focus-visible:ring-2 focus-visible:ring-brand"
            >
                {label}
                {active && <Arrow className="size-3.5 text-fg-secondary" aria-hidden="true" />}
            </button>
            {hint && <Dica texto={hint} />}
        </span>
    );
};

/** Item da pré-venda criada: tabela a partir de 704 px de cartão; abaixo, bloco com rótulos (BKS-115). */
const ItemRow = ({ item, emAndamento }: { item: ConfiguredItem; emAndamento: boolean }) => {
    const oferta = emAndamento ? getOfertaData(item) : null;
    return (
        <LinhaDaTabela interativa>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 @min-[44rem]:flex-row @min-[44rem]:items-center @min-[44rem]:gap-4">
                <TituloDaLinha titulo={item.nome} apoio={item.grupo} />
                <Celula rotulo="Ofertas" numero className={COL.ofertas}>
                    {oferta ? thousandsFormatter.format(oferta.ofertas) : "0"}
                </Celula>
                <Celula rotulo="Ticket médio" numero className={COL.ticket}>
                    {oferta ? (
                        <span className="@min-[44rem]:block">
                            <span className="block">{currencyFormatter.format(oferta.ticket)}</span>
                            <span className="block text-tertiary">
                                Faixa: {currencyFormatter.format(oferta.faixaMin)} a {currencyFormatter.format(oferta.faixaMax)}
                            </span>
                        </span>
                    ) : (
                        <span className="text-tertiary">Sem ofertas</span>
                    )}
                </Celula>
                <Celula rotulo="Valor mínimo" numero className={COL.valorLido}>
                    {item.valorMinimo || "—"}
                </Celula>
                <Celula rotulo="Limite" numero className={COL.limiteLido}>
                    {item.limite || "—"}
                </Celula>
            </div>
        </LinhaDaTabela>
    );
};
