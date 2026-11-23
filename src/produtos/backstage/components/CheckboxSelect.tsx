import { type ReactNode } from "react";
import { ChevronDown, SearchLg, XClose } from "@untitledui/icons";
import { useFilter } from "react-aria";
import {
    Autocomplete as AriaAutocomplete,
    Button as AriaButton,
    Input as AriaInput,
    ListBox as AriaListBox,
    Popover as AriaPopover,
    SearchField as AriaSearchField,
    Select as AriaSelect,
    SelectValue as AriaSelectValue,
} from "react-aria-components";
import { Surgir } from "@/components/foundations/transicao";
import { HintText } from "@/components/base/input/hint-text";
import { Label } from "@/components/base/input/label";
import { SelectItem } from "@/components/base/select/select-item";
import { SelectContext } from "@/components/base/select/select-shared";
import { cx } from "@/utils/cx";

export interface CheckboxSelectOption {
    id: string;
    label: string;
    sub?: string;
}

interface CheckboxSelectProps {
    label?: string;
    placeholder: string;
    options: CheckboxSelectOption[];
    selected: Set<string>;
    onChange: (next: Set<string>) => void;
    /** Marca o label com asterisco de obrigatório (o mesmo do Label do DS). */
    required?: boolean;
    /** Texto de apoio abaixo do campo. */
    hint?: ReactNode;
    /** Erro do campo: troca o texto de apoio e pinta o campo de erro. */
    erro?: ReactNode;
    /** Renderiza chips das opções selecionadas (com × para remover). Default: true. */
    showChips?: boolean;
}

/**
 * Seleção múltipla com busca: Select do React Aria em `selectionMode="multiple"`, com a busca
 * (Autocomplete) e a lista (ListBox) num Popover. O botão é ligado ao rótulo, abre uma lista com
 * semântica de listbox, setas e Enter marcam as opções, e Esc fecha só a lista (não o modal).
 * Os itens são o `SelectItem` do DS com checkbox à esquerda.
 */
export function CheckboxSelect({ label, placeholder, options, selected, onChange, required, hint, erro, showChips = true }: CheckboxSelectProps) {
    const { contains } = useFilter({ sensitivity: "base" });
    const isInvalid = Boolean(erro);

    const toggle = (id: string) => {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        onChange(next);
    };

    const resumo = (() => {
        if (selected.size === 0) return placeholder;
        if (selected.size === 1) return options.find((o) => selected.has(o.id))?.label ?? "1 selecionado";
        return `${selected.size} selecionados`;
    })();

    const chips = showChips ? options.filter((o) => selected.has(o.id)) : [];

    return (
        <SelectContext.Provider value={{ size: "sm" }}>
            <AriaSelect
                selectionMode="multiple"
                value={[...selected]}
                onChange={(keys) => onChange(new Set(keys.map(String)))}
                placeholder={placeholder}
                isRequired={required}
                isInvalid={isInvalid}
                validationBehavior="aria"
                aria-label={label ? undefined : placeholder}
                className="flex flex-col gap-1.5"
            >
                {label && (
                    <Label isRequired={required} isInvalid={isInvalid}>
                        {label}
                    </Label>
                )}

                <AriaButton
                    className={(state) =>
                        cx(
                            "flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg bg-primary px-3 py-2.5 text-left shadow-xs ring-1 outline-hidden transition duration-100 ease-linear ring-inset",
                            isInvalid ? "ring-error_subtle" : "ring-primary",
                            !state.isFocusVisible && !state.isPressed && "hover:bg-primary_hover",
                            (state.isFocusVisible || state.isPressed) && (isInvalid ? "ring-2 ring-error" : "ring-2 ring-brand"),
                        )
                    }
                >
                    <AriaSelectValue className={cx("truncate text-sm", selected.size === 0 ? "text-placeholder" : "text-primary")}>{resumo}</AriaSelectValue>
                    <ChevronDown className="size-5 shrink-0 text-fg-quaternary" aria-hidden="true" />
                </AriaButton>

                <AriaPopover
                    placement="bottom"
                    offset={4}
                    containerPadding={8}
                    className={(state) =>
                        cx(
                            "flex w-(--trigger-width) origin-(--trigger-anchor-point) flex-col overflow-hidden rounded-lg bg-primary shadow-lg ring-1 ring-secondary_alt outline-hidden",
                            state.isEntering && "duration-150 ease-out animate-in fade-in placement-top:slide-in-from-bottom-0.5 placement-bottom:slide-in-from-top-0.5",
                            state.isExiting && "duration-100 ease-in animate-out fade-out",
                        )
                    }
                >
                    <AriaAutocomplete filter={contains}>
                        <AriaSearchField aria-label={label ? `Buscar em ${label}` : "Buscar opções"} autoFocus className="shrink-0 border-b border-secondary p-2">
                            <div className="flex items-center gap-2 rounded-md bg-secondary px-2.5 py-2">
                                <SearchLg className="size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />
                                <AriaInput
                                    placeholder="Buscar"
                                    className="min-w-0 flex-1 bg-transparent text-sm text-primary outline-hidden placeholder:text-placeholder [&::-webkit-search-cancel-button]:hidden"
                                />
                            </div>
                        </AriaSearchField>
                        <AriaListBox
                            // Sem isso, a lista se rotula pelo próprio conteúdo (todas as opções) antes do rótulo do campo.
                            aria-label="Opções"
                            items={options}
                            className="max-h-64 min-h-0 overflow-y-auto py-1 outline-hidden"
                            renderEmptyState={() => <p className="px-3.5 py-3 text-sm text-tertiary">Nenhuma opção encontrada.</p>}
                        >
                            {(option) => (
                                <SelectItem id={option.id} label={option.label} supportingText={option.sub} selectionIndicator="checkbox" selectionIndicatorAlign="left" />
                            )}
                        </AriaListBox>
                    </AriaAutocomplete>
                </AriaPopover>

                {/* Os chips entram e saem com a altura animada; o campo fica no lugar (MEM-75). */}
                <Surgir visivel={chips.length > 0} gap={6}>
                    <ul className="flex flex-wrap gap-1.5" aria-label={label ? `${label} selecionados` : "Selecionados"}>
                        {chips.map((c) => (
                            <li key={c.id} className="inline-flex max-w-full items-center gap-0.5 rounded-md bg-secondary py-0.5 pr-0.5 pl-2 text-sm text-secondary ring-1 ring-secondary">
                                <span className="truncate">{c.label}</span>
                                {/* Botão nativo: dentro do Select, um Button do React Aria viraria o gatilho. Alvo de 24 px. */}
                                <button
                                    type="button"
                                    onClick={() => toggle(c.id)}
                                    aria-label={`Remover ${c.label}`}
                                    className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-fg-quaternary outline-focus-ring transition duration-100 ease-linear hover:bg-tertiary hover:text-fg-secondary focus-visible:outline-2"
                                >
                                    <XClose className="size-3.5" aria-hidden="true" />
                                </button>
                            </li>
                        ))}
                    </ul>
                </Surgir>

                {(erro || hint) && <HintText isInvalid={isInvalid}>{erro ?? hint}</HintText>}
            </AriaSelect>
        </SelectContext.Provider>
    );
}

