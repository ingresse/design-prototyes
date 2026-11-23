import type { ReactNode } from "react";
import { ChevronDown, Clock, CurrencyDollarCircle, UploadCloud02, XClose } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { cx } from "@/utils/cx";
import { EVENT } from "../data/event";
import { RelatorioFilterSlideout, RelatorioPeriodoButton } from "./RelatorioFilterSlideout";
import { useRelatorioFilters } from "./relatorio-filters";
import { TITULO_PAGINA } from "@/produtos/backstage/components/titulo-pagina";

/* ------------------------------------------------------------------ */
/*  Export menu (Excel / CSV / PDF) — usado no slot de ações.          */
/* ------------------------------------------------------------------ */

export const ExportMenu = ({
    onExport,
    formats = ["excel", "csv", "pdf"],
    size = "md",
    onEditColumnsAndExport,
}: {
    onExport?: (format: "excel" | "csv" | "pdf") => void;
    formats?: Array<"excel" | "csv" | "pdf">;
    size?: "sm" | "md";
    /** Quando informado, adiciona a opção "Editar colunas e exportar" — mesmo comportamento
     * do botão "Editar colunas" da página (abre o modal de gestão de colunas). */
    onEditColumnsAndExport?: () => void;
}) => {
    const LABELS: Record<"excel" | "csv" | "pdf", string> = {
        excel: "Arquivo Excel",
        csv: "Arquivo .CSV",
        pdf: "Arquivo PDF",
    };
    return (
        <Dropdown.Root>
            <Button color="secondary" size={size} iconLeading={UploadCloud02} iconTrailing={ChevronDown}>
                Exportar
            </Button>
            <Dropdown.Popover>
                <Dropdown.Menu>
                    {formats.map((f) => (
                        <Dropdown.Item key={f} label={LABELS[f]} onAction={() => onExport?.(f)} />
                    ))}
                    {onEditColumnsAndExport && (
                        <>
                            <Dropdown.Separator />
                            <Dropdown.Item label="Editar colunas e exportar" onAction={onEditColumnsAndExport} />
                        </>
                    )}
                </Dropdown.Menu>
            </Dropdown.Popover>
        </Dropdown.Root>
    );
};

/* ------------------------------------------------------------------ */
/*  Chip de filtro ativo                                              */
/* ------------------------------------------------------------------ */

const FilterChip = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary py-1 pl-2.5 pr-1 text-sm font-medium text-secondary ring-1 ring-border-secondary">
        {label}
        <button
            type="button"
            onClick={onRemove}
            aria-label={`Remover filtro ${label}`}
            className="flex size-4 items-center justify-center rounded-full text-fg-quaternary transition duration-100 ease-linear hover:bg-tertiary hover:text-fg-secondary"
        >
            <XClose className="size-3" />
        </button>
    </span>
);

const InfoChip = ({ icon: Icon, label }: { icon: typeof Clock; label: string }) => (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-tertiary">
        <Icon className="size-3.5 text-fg-quaternary" aria-hidden="true" />
        {label}
    </span>
);

/* ------------------------------------------------------------------ */
/*  Tira de filtros aplicados + meta do evento                         */
/* ------------------------------------------------------------------ */

const FiltersStrip = ({ showMeta = true }: { showMeta?: boolean }) => {
    const { fields, sessoes, dateRange, sessao, filters, appliedCount, apply, clear } = useRelatorioFilters();

    const removeSessao = () => apply({ dateRange, sessao: "all", filters });
    const removeFilter = (id: string) => apply({ dateRange, sessao, filters: filters.filter((f) => f.id !== id) });

    const validFilters = filters.filter((f) => f.field && f.value);

    // Sem meta (horário/moeda) e sem nenhum filtro aplicado → não renderiza a tira.
    if (!showMeta && appliedCount === 0) return null;

    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {showMeta && (
                <>
                    <InfoChip icon={Clock} label={EVENT.tzLabel} />
                    <InfoChip icon={CurrencyDollarCircle} label={`Moeda: ${EVENT.currency} (${EVENT.currencyLabel})`} />
                </>
            )}

            {showMeta && appliedCount > 0 && <span className="h-4 w-px bg-border-secondary" aria-hidden="true" />}

            {sessao !== "all" && (
                <FilterChip
                    label={`Sessão: ${sessoes.find((s) => s.id === sessao)?.label ?? sessao}`}
                    onRemove={removeSessao}
                />
            )}
            {validFilters.map((f) => {
                const def = fields.find((x) => x.id === f.field);
                const value = def?.multi
                    ? f.value
                          .split(",")
                          .map((v) => def.multi!.options.find((o) => o.id === v)?.label ?? v)
                          .join(", ")
                    : f.value;
                return <FilterChip key={f.id} label={`${def?.label ?? f.field}: ${value}`} onRemove={() => removeFilter(f.id)} />;
            })}

            {appliedCount > 0 && (
                <Button size="sm" color="link-gray" onClick={clear}>
                    Limpar tudo
                </Button>
            )}
        </div>
    );
};

/** Período (sempre) e Filtros (só se o relatório tiver campos ou sessões). */
const ControlesDeFiltro = ({ soPeriodo, placement }: { soPeriodo: boolean; placement: "bottom start" | "bottom end" }) => {
    const { fields, sessoes } = useRelatorioFilters();
    return (
        <>
            <RelatorioPeriodoButton />
            {!soPeriodo && (fields.length > 0 || sessoes.length > 0) && <RelatorioFilterSlideout placement={placement} />}
        </>
    );
};

/* ------------------------------------------------------------------ */
/*  Barra superior fixa                                               */
/* ------------------------------------------------------------------ */

interface RelatorioPageHeaderProps {
    title: string;
    /** Ações extras (ex.: ExportMenu). O botão de Filtros já é incluído quando withFilters. */
    actions?: ReactNode;
    /** Renderiza o botão de Filtros + tira de filtros (exige RelatorioFiltersProvider). Default true. */
    withFilters?: boolean;
    /** "full" = botão de Período + Filtros (se o relatório tiver campos ou sessões); "period" = só o Período. Default "full". */
    filter?: "full" | "period";
    /** Exibe a meta do evento (fuso horário / moeda) na tira. Default true. */
    showEventMeta?: boolean;
    /** Controles fixos exibidos numa linha dentro do header (ex.: toggles de métrica). */
    toolbar?: ReactNode;
    /** Filtros à esquerda e ações (ex.: Exportar) à direita, em linha própria abaixo do título. */
    splitControls?: boolean;
}

export const RelatorioPageHeader = ({ title, actions, withFilters = true, filter = "full", showEventMeta = true, toolbar, splitControls = false }: RelatorioPageHeaderProps) => {
    // Um controle de período só, o botão de datas, em todos os relatórios (REL-220). Filtros abre só os campos e a sessão.
    // O popover de Filtros abre para a direita do botão: aberto para a esquerda, cobria a lista de relatórios (REL-220).
    const filterControl = <ControlesDeFiltro soPeriodo={filter === "period"} placement="bottom start" />;
    return (
        // O fundo é o da página (bg-primary_alt, o mesmo do shell do Backstage) nos dois modos: o que rola por baixo some sem faixa.
        <div className={cx("sticky top-[var(--bs-header-offset,0px)] z-40 -mx-2 -mt-6 flex flex-col gap-3 border-x-8 border-[var(--color-bg-primary_alt)] bg-primary_alt pb-3 pt-6 shadow-[-8px_0_0_0_var(--color-bg-primary_alt),8px_0_0_0_var(--color-bg-primary_alt)]")}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                {/* `titulo-do-relatorio`: dentro dos Relatórios, só este h1 vai para leitor de tela (navegacao-de-secao). */}
                <h1 className={cx(TITULO_PAGINA, "titulo-do-relatorio")}>{title}</h1>
                {(actions || withFilters) && (
                    <div className="flex flex-wrap items-center gap-3">
                        {splitControls ? (
                            <>
                                {withFilters && filterControl}
                                {actions}
                            </>
                        ) : (
                            <>
                                {actions}
                                {withFilters && filterControl}
                            </>
                        )}
                    </div>
                )}
            </div>
            {/* Fuso e moeda saíram daqui: ficam no topo de todos os relatórios, à direita (BKS-28). */}
            {withFilters && filter !== "period" && <FiltersStrip showMeta={false} />}
            {toolbar && <div className="flex flex-wrap items-end gap-x-6 gap-y-3 overflow-x-auto">{toolbar}</div>}
        </div>
    );
};
