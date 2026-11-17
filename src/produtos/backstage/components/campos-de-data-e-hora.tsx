import { type ReactNode, useContext } from "react";
import { parseDate } from "@internationalized/date";
import { Calendar as CalendarIcon } from "@untitledui/icons";
import type { DateValue } from "react-aria-components";
import {
    Button as AriaButton,
    DateInput as AriaDateInput,
    DatePicker as AriaDatePicker,
    DatePickerStateContext,
    DateSegment as AriaDateSegment,
    Dialog as AriaDialog,
    Group as AriaGroup,
    Popover as AriaPopover,
} from "react-aria-components";
import { Calendar } from "@/components/application/date-picker/calendar";
import { HintText } from "@/components/base/input/hint-text";
import { Input } from "@/components/base/input/input";
import { Label } from "@/components/base/input/label";
import { cx } from "@/utils/cx";

/*
 * Data e hora em dois campos (UI-FRM-008): a data num campo com calendário e digitação, a hora num
 * campo próprio ao lado. Composto do DS: DatePicker do React Aria com Label, HintText e Calendar do
 * DS; a hora usa o Input do DS.
 */

const segmento = (isPlaceholder: boolean, type: string) =>
    cx(
        "rounded px-0.5 text-primary tabular-nums caret-transparent focus:bg-brand-solid focus:font-medium focus:text-base-white focus:outline-hidden",
        isPlaceholder && "text-placeholder uppercase",
        type === "literal" && "text-fg-quaternary",
    );

/** Clicar em qualquer ponto do campo abre o calendário (UI-FRM-001); o foco segue no segmento para digitar. */
const GrupoClicavel = ({ children }: { children: ReactNode }) => {
    const state = useContext(DatePickerStateContext);
    return (
        <AriaGroup
            onClickCapture={(e) => {
                if (e.detail === 0 || state?.isOpen) return;
                state?.open();
            }}
            className={({ isFocusWithin, isInvalid }) =>
                cx(
                    "relative flex w-full cursor-pointer items-center rounded-lg bg-primary shadow-xs ring-1 ring-primary transition-shadow duration-100 ease-linear ring-inset",
                    (isFocusWithin || state?.isOpen) && "ring-2 ring-brand",
                    isInvalid && "ring-error_subtle",
                    isInvalid && isFocusWithin && "ring-2 ring-error",
                )
            }
        >
            {children}
        </AriaGroup>
    );
};

interface CampoDataProps {
    label: string;
    /** `AAAA-MM-DD` ou vazio. */
    valor: string;
    onChange: (v: string) => void;
    isRequired?: boolean;
    isInvalid?: boolean;
    hint?: ReactNode;
    /** `AAAA-MM-DD`: dias antes dele ficam bloqueados. */
    minimo?: string;
    className?: string;
}

/** Só a data: segmentos digitáveis e calendário; escolher o dia fecha o calendário. */
export function CampoData({ label, valor, onChange, isRequired, isInvalid, hint, minimo, className }: CampoDataProps) {
    let value: DateValue | null = null;
    try {
        value = valor ? parseDate(valor) : null;
    } catch {
        value = null;
    }
    return (
        <AriaDatePicker
            value={value}
            onChange={(v) => onChange(v ? v.toString() : "")}
            minValue={minimo ? parseDate(minimo) : undefined}
            isRequired={isRequired}
            isInvalid={isInvalid}
            granularity="day"
            className={cx("flex w-full flex-col gap-1.5", className)}
        >
            <Label isRequired={isRequired} isInvalid={isInvalid}>
                {label}
            </Label>
            <GrupoClicavel>
                <AriaDateInput className="flex w-full py-2 pr-1 pl-3 text-md">
                    {(s) => <AriaDateSegment segment={s} className={segmento(s.isPlaceholder, s.type)} />}
                </AriaDateInput>
                <AriaButton
                    aria-label="Abrir calendário"
                    className="mr-1 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-quaternary outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover hover:text-fg-quaternary_hover focus-visible:outline-2"
                >
                    <CalendarIcon className="size-5" />
                </AriaButton>
            </GrupoClicavel>
            {hint && <HintText isInvalid={isInvalid}>{hint}</HintText>}
            <AriaPopover
                offset={6}
                placement="bottom start"
                className={({ isEntering, isExiting }) =>
                    cx(
                        "w-(--trigger-width) min-w-[288px] overflow-y-auto rounded-2xl will-change-transform",
                        isEntering && "duration-150 ease-out animate-in fade-in motion-reduce:animate-none",
                        isExiting && "duration-100 ease-in animate-out fade-out motion-reduce:animate-none",
                    )
                }
            >
                <AriaDialog
                    aria-label={label}
                    className={cx(
                        "rounded-2xl bg-primary p-4 shadow-xl ring ring-secondary_alt outline-hidden",
                        "[&_table]:w-full [&_table]:table-fixed [&_th>div]:w-full [&_[role=gridcell]>div]:h-10 [&_[role=gridcell]>div]:w-full [&_[role=gridcell]>div>div]:mx-auto [&_[role=gridcell]>div>div]:size-10",
                    )}
                >
                    {/* Sem a linha de data digitada do Calendar: o próprio campo é a entrada digitável. */}
                    <Calendar>
                        <></>
                    </Calendar>
                </AriaDialog>
            </AriaPopover>
        </AriaDatePicker>
    );
}

/** O relógio nativo do campo de hora acompanha o tema; sem isso, fica escuro sobre o fundo escuro. */
const HORA_COM_CONTRASTE = "[color-scheme:light] dark:[color-scheme:dark]";

interface CampoHoraProps {
    label: string;
    /** `HH:mm` ou vazio. */
    valor: string;
    onChange: (v: string) => void;
    isRequired?: boolean;
    isInvalid?: boolean;
    hint?: string;
}

/** Só a hora, 24 h, digitável: o mesmo campo de hora do Criar evento. */
export function CampoHora({ label, valor, onChange, isRequired, isInvalid, hint }: CampoHoraProps) {
    // Com erro, o ícone de alerta do Input ocupa o fim do campo: o relógio nativo sai para não ficar por baixo.
    const inputClassName = cx(HORA_COM_CONTRASTE, isInvalid && "[&::-webkit-calendar-picker-indicator]:hidden");
    return <Input label={label} type="time" inputClassName={inputClassName} isRequired={isRequired} value={valor} onChange={onChange} isInvalid={isInvalid} hint={hint} />;
}
