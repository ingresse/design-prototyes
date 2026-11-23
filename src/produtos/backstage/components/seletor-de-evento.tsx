import { type ReactNode } from "react";
import { Check, LayersTwo01, SearchLg } from "@untitledui/icons";
import { useFilter } from "react-aria";
import {
    Autocomplete as AriaAutocomplete,
    Dialog as AriaDialog,
    DialogTrigger as AriaDialogTrigger,
    Input as AriaInput,
    ListBox as AriaListBox,
    ListBoxItem as AriaListBoxItem,
    Popover as AriaPopover,
    SearchField as AriaSearchField,
    type Placement,
} from "react-aria-components";
import { Badge } from "@/components/base/badges/badges";
import { cx } from "@/utils/cx";
import { EVENTO_STATUS_BADGE_COLOR, EVENTO_STATUS_LABEL, type EventoStatus } from "../eventos/data/eventos";

/** Uma opção da troca: um evento (com capa, data e status) ou uma escolha como "Todos os eventos". */
export interface OpcaoDeEvento {
    id: string;
    nome: string;
    capa?: string;
    dataLabel?: string;
    status?: EventoStatus;
}

interface SeletorDeEventoProps {
    /** O botão que abre a troca (um `Button` do React Aria). */
    children: ReactNode;
    opcoes: OpcaoDeEvento[];
    selecionado?: string;
    onEscolher: (id: string) => void;
    placement?: Placement;
}

/**
 * Troca de evento da shell (BKS-129): busca por nome e, em cada linha, capa, nome inteiro (até duas
 * linhas, com o nome completo no `title`), data e status. Um desenho só para o rail do evento, a barra
 * do celular, o topo dos Relatórios e o Freepass. Antes era um Dropdown só com o nome cortado.
 */
export function SeletorDeEvento({ children, opcoes, selecionado, onEscolher, placement = "bottom start" }: SeletorDeEventoProps) {
    const { contains } = useFilter({ sensitivity: "base" });
    return (
        <AriaDialogTrigger>
            {children}
            <AriaPopover
                placement={placement}
                offset={6}
                containerPadding={16}
                className={(s) =>
                    cx(
                        "flex w-[min(22rem,calc(100vw-2rem))] origin-(--trigger-anchor-point) flex-col overflow-hidden rounded-xl bg-primary shadow-lg ring-1 ring-secondary_alt outline-hidden",
                        s.isEntering && "duration-150 ease-out animate-in fade-in placement-bottom:slide-in-from-top-0.5 motion-reduce:animate-none",
                        s.isExiting && "duration-100 ease-in animate-out fade-out motion-reduce:animate-none",
                    )
                }
            >
                <AriaDialog aria-label="Trocar evento" className="flex min-h-0 flex-col outline-hidden">
                    {({ close }) => (
                        <AriaAutocomplete filter={contains}>
                            <AriaSearchField aria-label="Buscar evento" autoFocus className="shrink-0 border-b border-secondary p-2">
                                <div className="flex items-center gap-2 rounded-md bg-secondary px-2.5 py-2">
                                    <SearchLg className="size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />
                                    <AriaInput
                                        placeholder="Buscar evento"
                                        className="min-w-0 flex-1 bg-transparent text-sm text-primary outline-hidden placeholder:text-placeholder [&::-webkit-search-cancel-button]:hidden"
                                    />
                                </div>
                            </AriaSearchField>
                            <AriaListBox
                                aria-label="Eventos"
                                items={opcoes}
                                onAction={(k) => {
                                    close();
                                    onEscolher(String(k));
                                }}
                                className="max-h-[min(24rem,60dvh)] min-h-0 overflow-y-auto p-1 outline-hidden"
                                renderEmptyState={() => <p className="px-3 py-3 text-sm text-tertiary">Nenhum evento encontrado.</p>}
                            >
                                {(o) => (
                                    <AriaListBoxItem
                                        id={o.id}
                                        textValue={o.nome}
                                        className={(s) =>
                                            cx(
                                                "flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 outline-focus-ring transition duration-100 ease-linear",
                                                (s.isFocused || s.isHovered) && "bg-primary_hover",
                                                s.isFocusVisible && "outline-2 -outline-offset-2",
                                            )
                                        }
                                    >
                                        {() => (
                                            <>
                                                {o.capa ? (
                                                    <img src={o.capa} alt="" className="h-10 w-[30px] shrink-0 rounded-xxs object-cover" />
                                                ) : (
                                                    <span
                                                        className="flex h-10 w-[30px] shrink-0 items-center justify-center rounded-xxs bg-secondary ring-1 ring-secondary ring-inset"
                                                        aria-hidden="true"
                                                    >
                                                        <LayersTwo01 className="size-4 text-fg-quaternary" />
                                                    </span>
                                                )}
                                                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                                    <span className="line-clamp-2 text-sm font-semibold text-primary" title={o.nome}>
                                                        {o.nome}
                                                    </span>
                                                    {(o.dataLabel || o.status) && (
                                                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                            {o.dataLabel && <span className="text-sm text-tertiary">{o.dataLabel}</span>}
                                                            {o.status && (
                                                                <Badge size="sm" type="pill-color" color={EVENTO_STATUS_BADGE_COLOR[o.status]}>
                                                                    {EVENTO_STATUS_LABEL[o.status]}
                                                                </Badge>
                                                            )}
                                                        </span>
                                                    )}
                                                </span>
                                                {/* O atual: check na tela e "atual" para leitor de tela; escolher o atual só fecha a lista. */}
                                                {o.id === selecionado && (
                                                    <>
                                                        <Check className="size-5 shrink-0 text-fg-brand-primary" aria-hidden="true" />
                                                        <span className="sr-only">(atual)</span>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </AriaListBoxItem>
                                )}
                            </AriaListBox>
                        </AriaAutocomplete>
                    )}
                </AriaDialog>
            </AriaPopover>
        </AriaDialogTrigger>
    );
}
