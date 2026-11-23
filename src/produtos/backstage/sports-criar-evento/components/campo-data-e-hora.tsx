import { type ReactNode, useContext, useEffect, useState } from "react";
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

/* ------------------------------------------------------------------ */
/*  v0.29 (validação com design, 18/11): data e hora em dois campos.   */
/*  No campo único, a pessoa escolhia o dia e achava que tinha         */
/*  terminado (3 de 3 pessoas erraram). Mesmo padrão do Criar evento   */
/*  de entretenimento (campos-de-data-e-hora.tsx): data digitável com  */
/*  calendário e hora num campo próprio ao lado.                       */
/* ------------------------------------------------------------------ */

const segmento = (isPlaceholder: boolean, type: string) =>
    cx(
        "rounded px-0.5 text-primary tabular-nums caret-transparent focus:bg-brand-solid focus:font-medium focus:text-white focus:outline-hidden",
        isPlaceholder && "text-placeholder uppercase",
        type === "literal" && "text-fg-quaternary",
    );

/** Clicar em qualquer ponto do campo abre o calendário; o foco segue no segmento para digitar. */
const GrupoClicavel = ({ children, desabilitado }: { children: ReactNode; desabilitado?: boolean }) => {
    const state = useContext(DatePickerStateContext);
    return (
        <AriaGroup
            onClickCapture={(e) => {
                if (desabilitado || e.detail === 0 || state?.isOpen) return;
                state?.open();
            }}
            className={({ isFocusWithin, isInvalid }) =>
                cx(
                    "relative flex w-full items-center rounded-lg bg-primary shadow-xs ring-1 ring-primary transition-shadow duration-100 ease-linear ring-inset",
                    desabilitado ? "cursor-not-allowed bg-disabled_subtle opacity-70" : "cursor-pointer",
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

const paraDia = (s?: string) => {
    try {
        return s ? parseDate(s.slice(0, 10)) : null;
    } catch {
        return null;
    }
};

/** O relógio nativo do campo de hora acompanha o tema; sem isso, fica escuro sobre o fundo escuro. */
const HORA_COM_CONTRASTE = "[color-scheme:light] dark:[color-scheme:dark]";

export interface CampoDataEHoraProps {
    id: string;
    label: string;
    /** `AAAA-MM-DDTHH:mm` ou vazio. Só sai completo: com data e hora preenchidas. */
    valor: string;
    onChange: (v: string) => void;
    onBlur?: () => void;
    erro?: string;
    hint?: ReactNode;
    isRequired?: boolean;
    /** Dias antes deste ficam bloqueados; o calendário abre no mês dele. */
    minimo?: string;
    /** Dias depois deste ficam bloqueados. */
    maximo?: string;
    desabilitado?: boolean;
    /** Rótulo só para leitor de tela (linhas de tabela com cabeçalho de coluna). */
    ocultarLabel?: boolean;
    className?: string;
}

export function CampoDataEHora({ id, label, valor, onChange, onBlur, erro, hint, isRequired, minimo, maximo, desabilitado, ocultarLabel, className }: CampoDataEHoraProps) {
    // Guarda a metade preenchida enquanto a outra está vazia; o formulário só recebe o valor completo.
    const [dia, setDia] = useState(valor.slice(0, 10));
    const [hora, setHora] = useState(valor.slice(11, 16));
    useEffect(() => {
        if (valor) {
            setDia(valor.slice(0, 10));
            setHora(valor.slice(11, 16));
        }
    }, [valor]);

    const emitir = (d: string, h: string) => onChange(d && h ? `${d}T${h}` : "");
    const invalido = !!erro;
    const minDia = paraDia(minimo);

    return (
        <div id={id} data-erro={erro ? "" : undefined} className={cx("flex min-w-0 scroll-mt-6 flex-col gap-1.5", className)} onBlur={onBlur}>
            {!ocultarLabel && (
                <Label isRequired={isRequired} isInvalid={invalido}>
                    {label}
                </Label>
            )}
            <div className="flex min-w-0 items-start gap-2">
                <AriaDatePicker
                    aria-label={`${label}: data`}
                    value={paraDia(dia)}
                    onChange={(v: DateValue | null) => {
                        const d = v ? v.toString() : "";
                        setDia(d);
                        emitir(d, hora);
                    }}
                    minValue={minDia ?? undefined}
                    maxValue={paraDia(maximo) ?? undefined}
                    placeholderValue={minDia ?? undefined}
                    isDisabled={desabilitado}
                    isRequired={isRequired}
                    isInvalid={invalido}
                    granularity="day"
                    className="min-w-0 flex-1"
                >
                    <GrupoClicavel desabilitado={desabilitado}>
                        <AriaDateInput className="flex w-full min-w-0 py-2 pr-1 pl-3 text-md">
                            {(s) => <AriaDateSegment segment={s} className={segmento(s.isPlaceholder, s.type)} />}
                        </AriaDateInput>
                        <AriaButton
                            aria-label="Abrir calendário"
                            className="mr-1 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-quaternary outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover hover:text-fg-quaternary_hover focus-visible:outline-2 disabled:cursor-not-allowed"
                        >
                            <CalendarIcon className="size-5" />
                        </AriaButton>
                    </GrupoClicavel>
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
                            {/* Escolher o dia fecha o calendário; a hora vem no campo ao lado. */}
                            <Calendar>
                                <></>
                            </Calendar>
                        </AriaDialog>
                    </AriaPopover>
                </AriaDatePicker>
                <div className="w-28 shrink-0">
                    <Input
                        aria-label={`${label}: horário`}
                        type="time"
                        inputClassName={cx(HORA_COM_CONTRASTE, invalido && "[&::-webkit-calendar-picker-indicator]:hidden")}
                        isRequired={isRequired}
                        isDisabled={desabilitado}
                        isInvalid={invalido}
                        value={hora}
                        onChange={(h) => {
                            setHora(h);
                            emitir(dia, h);
                        }}
                    />
                </div>
            </div>
            {hint && <HintText isInvalid={invalido}>{hint}</HintText>}
        </div>
    );
}
