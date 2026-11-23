import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import type { Key, Selection } from "react-aria-components";
import { ChevronDown, ChevronRight, Download01, FilterLines, MessageQuestionCircle, Paperclip, Plus, SearchLg, Ticket01 } from "@untitledui/icons";
import { Avatar } from "@/components/base/avatar/avatar";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Input } from "@/components/base/input/input";
import { MultiSelect } from "@/components/base/select/multi-select";
import { Select } from "@/components/base/select/select";
import { PaginationCardAdvanced } from "@/components/application/pagination/pagination";
import { Tabs } from "@/components/application/tabs/tabs";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { CountBadge, type FilterRow } from "@/components/application/filter-bar/filter-dropdown-menu";
import { cx } from "@/utils/cx";
import { PainelLateral } from "../components/TabelaLista";
import { useItemNaUrl } from "../components/estado-dos-relatorios";
import { FilterPopover } from "../components/FilterPopover";
import { BackstageLayout } from "../../components/Backstage";
import { ExportMenu, RelatorioPageHeader } from "../components/RelatorioPageHeader";
import { RelatorioFiltersProvider, matchRow, type FilterFieldDef } from "../components/relatorio-filters";
import { numberFormatter, percentFormatter } from "../data/event";
import {
    TIPO_RESPOSTA,
    ehEscolha,
    ehTextoLivre,
    useRespostasDoQuestionario,
    type IngressoRespondido,
    type Participante,
    type QuestionarioPergunta,
    type Respondente,
    type RespostaLinha,
} from "../data/questionarios";

const pct = (n: number) => percentFormatter.format(n);
const num = (n: number) => numberFormatter.format(n);
const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/* ------------------------------------------------------------------ */
/*  Filtro composto — campo = pergunta, valor = opção (ou texto).       */
/* ------------------------------------------------------------------ */

const OPERADORES = [
    { id: "contains", label: "inclui" },
    { id: "does-not-contain", label: "não inclui" },
];

/** Campos do filtro: uma pergunta por campo; perguntas de escolha filtram pelas opções. */
const camposDoFiltro = (perguntas: QuestionarioPergunta[], todos: boolean): FilterFieldDef[] =>
    perguntas.map((q) => ({
        id: q.id,
        label: todos ? `${q.titulo} (${q.eventoNome})` : q.titulo,
        multi: q.opcoes ? { options: q.opcoes.map((o) => ({ id: o.label, label: o.label })) } : undefined,
    }));

let nextFilterId = 1;
const novoFiltro = (): FilterRow => ({ id: `qf${nextFilterId++}`, field: "", operator: "contains", value: "" });

export function Questionarios() {
    return (
        <BackstageLayout activeSection="relatorios" activeItem="relatorio-questionarios">
            <RelatorioFiltersProvider>
                <div className="flex min-w-0 flex-1 flex-col">
                    <main className="flex flex-1 flex-col gap-6">
                        <QuestionariosBody />
                    </main>
                </div>
            </RelatorioFiltersProvider>
        </BackstageLayout>
    );
}

const QuestionariosBody = () => {
    const dados = useRespostasDoQuestionario();
    const [tab, setTab] = useState<Key>("resumo");
    const [filters, setFilters] = useState<FilterRow[]>(() => [novoFiltro()]);
    const campos = useMemo(() => camposDoFiltro(dados.perguntas, dados.todos), [dados.perguntas, dados.todos]);

    // Outro evento ou escopo: as perguntas mudam, os filtros e a aba voltam ao início.
    useEffect(() => {
        setFilters([novoFiltro()]);
        setTab("resumo");
    }, [dados.chave]);

    /** Conjunto de respondentes que atendem ao filtro (null = todos). */
    const cohort = useMemo(() => {
        const ativos = filters.filter((f) => f.field && f.value && campos.some((c) => c.id === f.field));
        if (!ativos.length) return null;
        const set = new Set<string>();
        for (const p of dados.participantes) {
            if (matchRow(p.respondente.id, ativos, (rid, field) => dados.valor(rid, field))) set.add(p.respondente.id);
        }
        return set;
    }, [filters, campos, dados]);

    /** Clique numa opção do resumo aplica o filtro daquela pergunta e leva à lista de respostas. */
    const mostrarQuemRespondeu = (perguntaId: string, opcao: string) => {
        setFilters((prev) => {
            if (prev.some((f) => f.field === perguntaId)) {
                return prev.map((f) => (f.field === perguntaId ? { ...f, operator: "contains", value: opcao } : f));
            }
            const vazia = prev.find((f) => !f.field);
            if (vazia) return prev.map((f) => (f.id === vazia.id ? { ...f, field: perguntaId, operator: "contains", value: opcao } : f));
            return [...prev, { ...novoFiltro(), field: perguntaId, operator: "contains", value: opcao }];
        });
        setTab("respostas");
        scrollToTop();
    };

    if (dados.semPerguntas) {
        return (
            <>
                <RelatorioPageHeader title="Respostas do questionário" withFilters={false} />
                <div className="flex items-center justify-center rounded-xl bg-primary px-4 py-16 ring-1 ring-border-secondary">
                    <EmptyState size="sm">
                        <EmptyState.Header>
                            <EmptyState.FeaturedIcon icon={MessageQuestionCircle} color="gray" theme="modern" />
                        </EmptyState.Header>
                        <EmptyState.Content>
                            <EmptyState.Title>{dados.todos ? "Nenhum evento tem questionário" : "Este evento não tem questionário"}</EmptyState.Title>
                            <EmptyState.Description>Crie as perguntas no Questionário, em Ingressos e produtos. As respostas de quem comprar aparecem aqui.</EmptyState.Description>
                        </EmptyState.Content>
                        <EmptyState.Footer>
                            <Button size="md" color="primary" iconLeading={Plus} href="/backstage/catalogo/questionario">
                                Criar perguntas
                            </Button>
                        </EmptyState.Footer>
                    </EmptyState>
                </div>
            </>
        );
    }

    return (
        <>
            <RelatorioPageHeader
                title="Respostas do questionário"
                withFilters={false}
                actions={
                    <>
                        <PerguntasFilter campos={campos} filters={filters} setFilters={setFilters} />
                        <ExportMenu />
                    </>
                }
            />

            <div className="flex flex-col">
                <Tabs selectedKey={tab} onSelectionChange={setTab}>
                    <Tabs.List type="underline">
                        <Tabs.Item id="resumo" label="Resumo" />
                        <Tabs.Item id="respostas" label="Respostas" />
                    </Tabs.List>
                </Tabs>

                {/* Conteúdo fora do <Tabs> (evita o collection-pass) + slide horizontal */}
                <div className="overflow-hidden pt-4">
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={String(tab)}
                        className="px-1 pb-1"
                        initial={{ opacity: 0, x: 24 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -24 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                        {tab === "respostas" ? (
                            <RespostasArea cohort={cohort} participantes={dados.participantes} perguntas={dados.perguntas} />
                        ) : (
                            <ResumoArea cohort={cohort} perguntas={dados.perguntas} todos={dados.todos} onFiltrar={mostrarQuemRespondeu} />
                        )}
                    </motion.div>
                </AnimatePresence>
                </div>
            </div>
        </>
    );
};

/* ------------------------------------------------------------------ */
/*  Filtro (dropdown composto)                                         */
/* ------------------------------------------------------------------ */

function PerguntasFilter({ campos, filters, setFilters }: { campos: FilterFieldDef[]; filters: FilterRow[]; setFilters: (fn: (prev: FilterRow[]) => FilterRow[]) => void }) {
    const aplicados = filters.filter((f) => f.field && f.value).length;

    const add = () => {
        const novo = novoFiltro();
        setFilters((prev) => [...prev, novo]);
    };
    const remove = (id: string) => setFilters((prev) => prev.filter((f) => f.id !== id));
    const change = (id: string, patch: Partial<Omit<FilterRow, "id">>) => setFilters((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    const limpar = () => {
        const novo = novoFiltro();
        setFilters(() => [novo]);
    };

    return (
        <FilterPopover
            className="md:w-[624px]"
            trigger={
                <Button color="secondary" size="sm" iconLeading={FilterLines} iconTrailing={ChevronDown} className={cx(aplicados > 0 && "bg-primary_hover")}>
                    <span className="flex items-center gap-1.5">
                        Filtros
                        {aplicados > 0 && <CountBadge count={aplicados} />}
                    </span>
                </Button>
            }
        >
            {(close) => (
                <div className="flex max-h-[min(70vh,560px)] flex-col">
                    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                        <div className="flex flex-col divide-y divide-secondary px-4">
                            {filters.map((filter) => (
                                <div key={filter.id} className="flex items-start gap-1 py-3 first:pt-4">
                                    <div className="flex min-w-0 flex-1 items-center gap-3">
                                        <LinhaFiltro campos={campos} filter={filter} onChange={(patch) => change(filter.id, patch)} />
                                    </div>
                                    {filters.length > 1 && <CloseButton label="Remover pergunta" size="sm" onPress={() => remove(filter.id)} />}
                                </div>
                            ))}
                        </div>
                        <div className="px-4 pt-3 pb-4">
                            <Button size="sm" color="secondary" iconLeading={Plus} onClick={add}>
                                Adicionar pergunta
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-secondary px-4 py-3">
                        <Button size="sm" color="link-gray" onClick={limpar}>
                            Limpar tudo
                        </Button>
                        <Button size="sm" color="primary" onClick={() => close()}>
                            Aplicar filtro
                        </Button>
                    </div>
                </div>
            )}
        </FilterPopover>
    );
}

function LinhaFiltro({ campos, filter, onChange }: { campos: FilterFieldDef[]; filter: FilterRow; onChange: (patch: Partial<Omit<FilterRow, "id">>) => void }) {
    const def = campos.find((f) => f.id === filter.field);
    return (
        <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Select
                className="w-full"
                size="sm"
                aria-label="Pergunta"
                placeholder="Selecione a pergunta"
                items={campos}
                selectedKey={filter.field || null}
                onSelectionChange={(key: Key | null) => onChange({ field: key ? String(key) : "", value: "" })}
            >
                {(item: FilterFieldDef) => <Select.Item id={item.id}>{item.label}</Select.Item>}
            </Select>
            <div className="flex items-center gap-2">
                <Select
                    className="w-32 shrink-0"
                    size="sm"
                    aria-label="Operador"
                    items={OPERADORES}
                    selectedKey={filter.operator || null}
                    onSelectionChange={(key: Key | null) => onChange({ operator: key ? String(key) : "" })}
                >
                    {(item: { id: string; label: string }) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                </Select>
                <ValorFiltro def={def} filter={filter} onChange={onChange} />
            </div>
        </div>
    );
}

function ValorFiltro({ def, filter, onChange }: { def?: FilterFieldDef; filter: FilterRow; onChange: (patch: Partial<Omit<FilterRow, "id">>) => void }) {
    if (def?.multi) {
        const options = def.multi.options;
        const selectedKeys: Selection = filter.value ? new Set(filter.value.split(",").filter(Boolean)) : new Set();
        const count = selectedKeys instanceof Set ? selectedKeys.size : 0;
        return (
            <MultiSelect
                className="min-w-0 flex-1"
                size="sm"
                aria-label="Valor"
                placeholder="Selecione"
                items={options}
                selectedKeys={selectedKeys}
                onSelectionChange={(keys: Selection) => onChange({ value: keys === "all" ? options.map((o) => o.id).join(",") : Array.from(keys).join(",") })}
                supportingText={count > 0 ? `${count} selecionados` : undefined}
                onReset={() => onChange({ value: "" })}
                onSelectAll={() => onChange({ value: options.map((o) => o.id).join(",") })}
            >
                {(item: { id: string; label: string }) => (
                    <MultiSelect.Item id={item.id} selectionIndicator="checkmark">
                        {item.label}
                    </MultiSelect.Item>
                )}
            </MultiSelect>
        );
    }
    return (
        <Input
            className="min-w-0 flex-1"
            size="sm"
            aria-label="Valor"
            placeholder="Digite um valor"
            value={filter.value}
            onChange={(value: string) => onChange({ value })}
        />
    );
}

/* ------------------------------------------------------------------ */
/*  Aba Resumo — só perguntas de escolha, opção clicável = filtro       */
/* ------------------------------------------------------------------ */

function aplicarCohort(pergunta: QuestionarioPergunta, cohort: Set<string> | null): QuestionarioPergunta {
    if (!cohort) return pergunta;
    const respostas = pergunta.respostas.filter((l) => cohort.has(l.respondente.id));
    const contagem = new Map<string, number>();
    for (const l of respostas) {
        if (pergunta.tipo === "opcao-unica" && l.opcao) contagem.set(l.opcao, (contagem.get(l.opcao) ?? 0) + 1);
        else if (pergunta.tipo === "multipla") for (const o of l.opcoesMultiplas ?? []) contagem.set(o, (contagem.get(o) ?? 0) + 1);
    }
    return {
        ...pergunta,
        respondidas: respostas.length,
        respostas,
        opcoes: pergunta.opcoes ? pergunta.opcoes.map((o) => ({ label: o.label, respostas: contagem.get(o.label) ?? 0 })) : undefined,
    };
}

function ResumoArea({
    cohort,
    perguntas: todas,
    todos,
    onFiltrar,
}: {
    cohort: Set<string> | null;
    perguntas: QuestionarioPergunta[];
    todos: boolean;
    onFiltrar: (perguntaId: string, opcao: string) => void;
}) {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    // Só perguntas de escolha (opção única / múltipla escolha).
    const perguntas = useMemo(() => todas.filter((q) => ehEscolha(q.tipo)).map((q) => aplicarCohort(q, cohort)), [todas, cohort]);

    const totalPages = Math.max(1, Math.ceil(perguntas.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const visiveis = perguntas.slice((safePage - 1) * pageSize, (safePage - 1) * pageSize + pageSize);

    useEffect(() => setPage(1), [cohort]);

    return (
        <div className="flex flex-col gap-4">
            <span className="text-sm text-tertiary">
                Exibindo{" "}
                {perguntas.length === 0
                    ? 0
                    : `${num((safePage - 1) * pageSize + 1)}-${num(Math.min(safePage * pageSize, perguntas.length))}`}{" "}
                de {num(perguntas.length)} perguntas
            </span>

            {perguntas.length === 0 ? (
                <div className="rounded-xl bg-primary px-4 py-12 text-center text-sm text-tertiary ring-1 ring-border-secondary">
                    O resumo mostra perguntas de opção única e múltipla escolha. As respostas de texto, número, telefone e anexo estão na aba Respostas.
                </div>
            ) : (
                <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
                    {visiveis.map((q) => (
                        <ResumoPerguntaCard key={q.id} pergunta={q} todos={todos} onFiltrar={onFiltrar} />
                    ))}
                </div>
            )}

            <div className="overflow-clip rounded-xl bg-primary ring-1 ring-border-secondary">
                <PaginationCardAdvanced
                    className="[&]:border-t-0"
                    page={safePage}
                    total={totalPages}
                    pageSize={pageSize}
                    onPageChange={(p: number) => {
                        setPage(p);
                        scrollToTop();
                    }}
                    onPageSizeChange={(size: number) => {
                        setPageSize(size);
                        setPage(1);
                        scrollToTop();
                    }}
                />
            </div>
        </div>
    );
}

function ResumoPerguntaCard({ pergunta, todos, onFiltrar }: { pergunta: QuestionarioPergunta; todos: boolean; onFiltrar: (perguntaId: string, opcao: string) => void }) {
    const opcoes = pergunta.opcoes ?? [];

    return (
        <section className="flex flex-col gap-4 rounded-2xl bg-primary p-5 ring-1 ring-border-secondary md:p-6">
            <div className="flex items-end justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-0.5">
                    <h2 className="line-clamp-2 text-md font-semibold text-primary">{pergunta.titulo}</h2>
                    <span className="text-sm text-tertiary">
                        {TIPO_RESPOSTA[pergunta.tipo].label}
                        {todos && ` em ${pergunta.eventoNome}`}
                    </span>
                </div>
                <span className="shrink-0 text-sm text-tertiary">{num(pergunta.respondidas)} responderam</span>
            </div>

            <div className="flex flex-col gap-2">
                {opcoes.map((op) => {
                    const fracao = pergunta.respondidas === 0 ? 0 : op.respostas / pergunta.respondidas;
                    return (
                        <button
                            key={op.label}
                            type="button"
                            onClick={() => onFiltrar(pergunta.id, op.label)}
                            className="group -mx-2 flex cursor-pointer flex-col gap-1.5 rounded-lg px-2 py-2 text-left transition duration-100 ease-linear hover:bg-secondary"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <span className="line-clamp-2 min-w-0 text-sm font-medium text-secondary group-hover:line-clamp-1">{op.label}</span>
                                <div className="flex shrink-0 items-center gap-2">
                                    <span className="text-sm text-tertiary">
                                        <span className="font-semibold text-primary">{num(op.respostas)}</span> ({pct(fracao)})
                                    </span>
                                    {/* Surge da direita empurrando a contagem para a esquerda */}
                                    <span className="flex max-w-0 items-center gap-1 overflow-hidden whitespace-nowrap text-sm font-medium text-brand-secondary opacity-0 transition-all duration-200 ease-out group-hover:max-w-56 group-hover:opacity-100">
                                        Ver quem respondeu
                                        <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
                                    </span>
                                </div>
                            </div>
                            <div className="h-2.5 w-full overflow-hidden rounded-full bg-quaternary">
                                <div className="h-full rounded-full bg-brand-solid transition-all duration-300 ease-linear" style={{ width: `${fracao * 100}%` }} />
                            </div>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/*  Aba Respostas — cards de participantes + slideout de detalhes       */
/* ------------------------------------------------------------------ */

function RespostasArea({ cohort, participantes, perguntas }: { cohort: Set<string> | null; participantes: Participante[]; perguntas: QuestionarioPergunta[] }) {
    const [busca, setBusca] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    // Participante aberto na URL (?item=<id>, REL-223).
    const aberto = useItemNaUrl();
    const selected = useMemo(() => (aberto.id ? (participantes.find((p) => p.respondente.id === aberto.id) ?? null) : null), [participantes, aberto.id]);

    const base = useMemo(() => (cohort ? participantes.filter((p) => cohort.has(p.respondente.id)) : participantes), [cohort, participantes]);

    const filtrados = useMemo(() => {
        const termo = busca.trim().toLowerCase();
        if (!termo) return base;
        return base.filter(({ respondente: r }) =>
            r.nome.toLowerCase().includes(termo) || r.email.toLowerCase().includes(termo) || r.documento.toLowerCase().includes(termo),
        );
    }, [busca, base]);

    const totalPages = Math.max(1, Math.ceil(filtrados.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const visiveis = useMemo(() => filtrados.slice((safePage - 1) * pageSize, (safePage - 1) * pageSize + pageSize), [filtrados, safePage, pageSize]);

    useEffect(() => setPage(1), [busca, cohort]);

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-end justify-between gap-3">
                <span className="shrink-0 pb-1.5 text-sm text-tertiary">
                    Exibindo{" "}
                    {filtrados.length === 0
                        ? 0
                        : `${num((safePage - 1) * pageSize + 1)}-${num(Math.min(safePage * pageSize, filtrados.length))}`}{" "}
                    de {num(filtrados.length)} respondentes
                </span>
                <div className="w-full sm:max-w-xs">
                    <Input
                        icon={SearchLg}
                        size="sm"
                        aria-label="Buscar participante"
                        placeholder="Buscar por nome, e-mail ou documento"
                        value={busca}
                        onChange={(v) => setBusca(v)}
                    />
                </div>
            </div>

            {visiveis.length === 0 ? (
                <div className="rounded-xl bg-primary px-4 py-12 text-center text-sm text-tertiary ring-1 ring-border-secondary">Nenhum participante encontrado.</div>
            ) : (
                <div className="flex flex-col gap-3">
                    {visiveis.map((p) => (
                        <ParticipanteCard
                            key={p.respondente.id}
                            participante={p}
                            isSelected={selected?.respondente.id === p.respondente.id}
                            onClick={() => aberto.abrir(p.respondente.id)}
                        />
                    ))}
                </div>
            )}

            <div className="overflow-clip rounded-xl bg-primary ring-1 ring-border-secondary">
                <PaginationCardAdvanced
                    className="[&]:border-t-0"
                    page={safePage}
                    total={totalPages}
                    pageSize={pageSize}
                    onPageChange={(p: number) => {
                        setPage(p);
                        scrollToTop();
                    }}
                    onPageSizeChange={(size: number) => {
                        setPageSize(size);
                        setPage(1);
                        scrollToTop();
                    }}
                />
            </div>

            {selected && <ParticipanteDetailsSlideOut participante={selected} perguntas={perguntas} onClose={aberto.fechar} />}
        </div>
    );
}

const ParticipanteCard = ({ participante, isSelected, onClick }: { participante: Participante; isSelected: boolean; onClick: () => void }) => {
    const { respondente: r } = participante;
    const ingressos = participante.ingressos.length;
    return (
        <button
            type="button"
            onClick={onClick}
            aria-current={isSelected || undefined}
            className={cx(
                "group flex w-full items-center gap-4 rounded-xl px-4 py-4 text-left transition duration-100 ease-linear hover:bg-primary_hover sm:px-5",
                isSelected ? "bg-primary_hover ring-2 ring-brand" : "bg-primary ring-1 ring-border-secondary",
            )}
        >
            <Avatar size="md" initials={getInitials(r.nome)} />
            <div className="flex min-w-0 flex-1 flex-col">
                <span className="line-clamp-2 text-sm font-semibold text-primary">{r.nome}</span>
                <span className="truncate text-sm text-tertiary">{r.email}</span>
            </div>
            <span className="hidden shrink-0 text-sm text-tertiary sm:block">
                {num(ingressos)} {ingressos === 1 ? "ingresso" : "ingressos"}
            </span>
            <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-fg-quaternary transition-transform duration-100 ease-linear group-hover:translate-x-0.5" />
        </button>
    );
};

/* ------------------------------------------------------------------ */
/*  Ingressos do portador (cada um com comprador + respostas)          */
/* ------------------------------------------------------------------ */

interface IngressoResposta {
    pergunta: QuestionarioPergunta;
    linha: RespostaLinha | null;
}
interface IngressoDoPortador {
    grupo: string;
    ingresso: string;
    comprador: Respondente;
    ehComprador: boolean;
    respostas: IngressoResposta[];
}

/** CPF formatado; vazio quando o banco não tem o dado (pessoa real). */
const formatCpf = (cpf: string): string => {
    const d = cpf.replace(/\D/g, "");
    return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : cpf;
};

function buildIngressos(participante: Participante, perguntas: Map<string, QuestionarioPergunta>): IngressoDoPortador[] {
    return participante.ingressos.map((ing: IngressoRespondido) => ({
        grupo: ing.grupo,
        ingresso: ing.ingresso,
        comprador: ing.comprador,
        ehComprador: ing.ehComprador,
        respostas: ing.aplicaveis
            .map((id) => perguntas.get(id))
            .filter((q): q is QuestionarioPergunta => !!q)
            .map((q) => ({ pergunta: q, linha: ing.respostas[q.id] ?? null })),
    }));
}

/* ------------------------------------------------------------------ */
/*  Slideout de detalhes do participante                               */
/* ------------------------------------------------------------------ */

// No painel lateral do DS (REL-225), no lugar do modal feito à mão de 520 px.
const ParticipanteDetailsSlideOut = ({ participante, perguntas, onClose }: { participante: Participante; perguntas: QuestionarioPergunta[]; onClose: () => void }) => (
    <PainelLateral titulo="Detalhes do participante" onFechar={onClose}>
        <SlideoutConteudo key={participante.respondente.id} participante={participante} perguntas={perguntas} />
    </PainelLateral>
);

function SlideoutConteudo({ participante, perguntas }: { participante: Participante; perguntas: QuestionarioPergunta[] }) {
    const [ingressos, setIngressos] = useState<IngressoDoPortador[]>(() => buildIngressos(participante, new Map(perguntas.map((q) => [q.id, q]))));
    // Accordion single-open: abrir um fecha o outro.
    const [aberto, setAberto] = useState<number | null>(null);

    const toggle = (i: number) => setAberto((prev) => (prev === i ? null : i));

    const salvarResposta = (idx: number, perguntaId: string, novaLinha: RespostaLinha) =>
        setIngressos((prev) =>
            prev.map((ing, i) =>
                i === idx ? { ...ing, respostas: ing.respostas.map((r) => (r.pergunta.id === perguntaId ? { ...r, linha: novaLinha } : r)) } : ing,
            ),
        );

    const { respondente: r } = participante;
    const portador = r;

    return (
        <div className="flex flex-col gap-5 py-5">
            {/* Portador — primeiro nível: separador, sem caixa */}
            <div className="flex shrink-0 flex-col gap-4 border-b border-secondary pb-5">
                <div className="flex items-center gap-3">
                    <Avatar size="lg" initials={getInitials(r.nome)} />
                    <div className="flex min-w-0 flex-col">
                        <span className="line-clamp-2 text-md font-semibold text-primary">{r.nome}</span>
                        <span className="text-sm text-tertiary">Portador</span>
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <DetailRow label="Nome" value={portador.nome} />
                    <DetailRow label="E-mail" value={portador.email} isEmail />
                    <DetailRow label="Telefone" value={portador.telefone} />
                    <DetailRow label="Documento" value={formatCpf(portador.documento)} />
                    <DetailRow label="Data de nascimento" value={portador.nascimento} />
                </div>
            </div>

            <span className="shrink-0 text-sm font-semibold text-secondary">Ingressos ({num(ingressos.length)})</span>

            {ingressos.map((ing, idx) => {
                const estaAberto = aberto === idx;
                return (
                    <div key={idx} className="shrink-0 overflow-hidden rounded-xl ring-1 ring-border-secondary">
                        <button
                            type="button"
                            onClick={() => toggle(idx)}
                            aria-expanded={estaAberto}
                            className="flex w-full items-start gap-3 px-4 py-3 text-left transition duration-100 ease-linear hover:bg-primary_hover"
                        >
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-fg-secondary ring-1 ring-border-secondary">
                                <Ticket01 className="size-5" aria-hidden="true" />
                            </span>
                            <div className="flex min-w-0 flex-1 flex-col">
                                <span className="line-clamp-2 text-sm font-semibold text-primary">
                                    {ing.grupo}, {ing.ingresso}
                                </span>
                                <span className="line-clamp-2 text-sm text-tertiary">
                                    {ing.ehComprador ? "Comprado pelo próprio portador" : `Comprado por ${ing.comprador.nome}`}
                                </span>
                            </div>
                            <ChevronDown aria-hidden="true" className={cx("mt-1 size-5 shrink-0 text-fg-quaternary transition-transform duration-150", estaAberto && "rotate-180")} />
                        </button>

                        {estaAberto && (
                            <div className="flex flex-col gap-4 border-t border-secondary p-4">
                                {/* Comprador */}
                                <div className="flex flex-col gap-2 rounded-lg bg-secondary p-3">
                                    <span className="text-sm font-semibold text-secondary">Comprador</span>
                                    <DetailRow label="Nome" value={ing.comprador.nome} />
                                    <DetailRow label="E-mail" value={ing.comprador.email} isEmail />
                                    <DetailRow label="Telefone" value={ing.comprador.telefone} />
                                    <DetailRow label="Documento" value={formatCpf(ing.comprador.documento)} />
                                    <DetailRow label="Data de nascimento" value={ing.comprador.nascimento} />
                                </div>

                                {/* Respostas do ingresso */}
                                <div className="flex flex-col gap-3">
                                    <span className="text-sm font-semibold text-secondary">Respostas do ingresso</span>
                                    {ing.respostas.length === 0 && <span className="text-sm text-tertiary">Nenhuma pergunta vale para este ingresso.</span>}
                                    {ing.respostas.map((rr) => (
                                        <RespostaEditavel
                                            key={rr.pergunta.id}
                                            pergunta={rr.pergunta}
                                            linha={rr.linha}
                                            onSave={(novaLinha) => salvarResposta(idx, rr.pergunta.id, novaLinha)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

const DetailRow = ({ label, value, isEmail = false }: { label: string; value: string; isEmail?: boolean }) => (
    <div className="flex min-w-0 flex-col gap-0.5">
        <dt className="text-sm text-tertiary">{label}</dt>
        <dd className={cx("line-clamp-2 text-sm break-words", isEmail && value ? "text-brand-secondary" : value ? "text-secondary" : "text-quaternary")}>{value || "Não informado"}</dd>
    </div>
);

/* ------------------------------------------------------------------ */
/*  Resposta (view / editar / confirmar) + download de anexo           */
/* ------------------------------------------------------------------ */

function RespostaEditavel({ pergunta, linha, onSave }: { pergunta: QuestionarioPergunta; linha: RespostaLinha | null; onSave: (linha: RespostaLinha) => void }) {
    const [modo, setModo] = useState<"view" | "edit" | "confirm">("view");
    const [txt, setTxt] = useState<string>(linha?.opcao ?? linha?.texto ?? "");
    const [multi, setMulti] = useState<Selection>(new Set(linha?.opcoesMultiplas ?? []));

    const podeEditar = linha !== null && pergunta.tipo !== "anexo";
    const opcoes = (pergunta.opcoes ?? []).map((o) => ({ id: o.label, label: o.label }));

    const iniciarEdicao = () => {
        setTxt(linha?.opcao ?? linha?.texto ?? "");
        setMulti(new Set(linha?.opcoesMultiplas ?? []));
        setModo("edit");
    };

    const confirmar = () => {
        if (!linha) return;
        let nova: RespostaLinha = linha;
        if (pergunta.tipo === "opcao-unica") nova = { ...linha, opcao: txt };
        else if (ehTextoLivre(pergunta.tipo)) nova = { ...linha, texto: txt };
        else if (pergunta.tipo === "multipla") nova = { ...linha, opcoesMultiplas: multi === "all" ? opcoes.map((o) => o.id) : Array.from(multi, String) };
        onSave(nova);
        setModo("view");
        toast.success("Resposta alterada");
    };

    return (
        <div className="flex flex-col gap-2 rounded-lg bg-secondary p-3">
            <div className="flex items-start justify-between gap-2">
                <span className="line-clamp-2 min-w-0 text-sm font-medium text-tertiary">{pergunta.titulo}</span>
                {pergunta.tipo === "anexo" && linha?.anexo ? (
                    <Button size="sm" color="link-color" iconLeading={Download01} onClick={() => toast.success(`Baixando ${linha.anexo?.arquivo}`)}>
                        Baixar
                    </Button>
                ) : (
                    podeEditar && modo === "view" && (
                        <Button size="sm" color="link-gray" onClick={iniciarEdicao}>
                            Editar
                        </Button>
                    )
                )}
            </div>

            {modo === "view" &&
                (linha ? <RespostaCelula linha={linha} tipo={pergunta.tipo} /> : <span className="text-sm text-quaternary">Não respondeu</span>)}

            {modo === "edit" && (
                <div className="flex flex-col gap-2">
                    {pergunta.tipo === "opcao-unica" && (
                        <Select size="sm" aria-label="Nova resposta" items={opcoes} selectedKey={txt || null} onSelectionChange={(k: Key | null) => setTxt(k ? String(k) : "")}>
                            {(item: { id: string; label: string }) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                        </Select>
                    )}
                    {pergunta.tipo === "multipla" && (
                        <MultiSelect size="sm" aria-label="Nova resposta" placeholder="Selecione" items={opcoes} selectedKeys={multi} onSelectionChange={setMulti}>
                            {(item: { id: string; label: string }) => (
                                <MultiSelect.Item id={item.id} selectionIndicator="checkmark">
                                    {item.label}
                                </MultiSelect.Item>
                            )}
                        </MultiSelect>
                    )}
                    {ehTextoLivre(pergunta.tipo) && <Input size="sm" aria-label="Nova resposta" value={txt} onChange={(v: string) => setTxt(v)} />}
                    <div className="flex items-center justify-end gap-2">
                        <Button size="sm" color="link-gray" onClick={() => setModo("view")}>
                            Cancelar
                        </Button>
                        <Button size="sm" color="secondary" onClick={() => setModo("confirm")}>
                            Salvar
                        </Button>
                    </div>
                </div>
            )}

            {modo === "confirm" && (
                <div className="flex flex-col gap-2 rounded-lg bg-primary p-3 ring-1 ring-border-secondary">
                    <p className="text-sm font-medium text-primary">Confirmar alteração desta resposta?</p>
                    <p className="text-sm text-tertiary">A resposta original do participante será substituída.</p>
                    <div className="flex items-center justify-end gap-2">
                        <Button size="sm" color="link-gray" onClick={() => setModo("edit")}>
                            Cancelar
                        </Button>
                        <Button size="sm" color="primary" onClick={confirmar}>
                            Confirmar
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

function RespostaCelula({ linha, tipo }: { linha: RespostaLinha; tipo: QuestionarioPergunta["tipo"] }) {
    if (tipo === "opcao-unica") {
        return <span className="text-sm font-medium text-secondary">{linha.opcao}</span>;
    }
    if (tipo === "multipla") {
        return (
            <div className="flex flex-wrap gap-1">
                {(linha.opcoesMultiplas ?? []).map((o) => (
                    <span key={o} className="rounded-md bg-primary px-2 py-0.5 text-sm text-secondary ring-1 ring-border-secondary">
                        {o}
                    </span>
                ))}
            </div>
        );
    }
    if (tipo === "texto-longo") {
        return <span className="line-clamp-2 text-sm text-secondary">“{linha.texto}”</span>;
    }
    if (ehTextoLivre(tipo)) {
        return <span className="text-sm font-medium text-secondary">{linha.texto}</span>;
    }
    return (
        <span className="inline-flex items-center gap-2 text-sm">
            <Paperclip className="size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />
            <span className="min-w-0 truncate font-medium text-brand-secondary">{linha.anexo?.arquivo}</span>
            <span className="shrink-0 text-tertiary">{linha.anexo?.tamanho}</span>
        </span>
    );
}
