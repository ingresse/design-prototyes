import { useId, type FC, type ReactNode } from "react";
import { parseDateTime } from "@internationalized/date";
import { AlertTriangle } from "@untitledui/icons";
import { ButtonContext as AriaButtonContext, NumberField as AriaNumberField } from "react-aria-components";
import { DateTimePicker } from "@/components/application/date-picker/date-time-picker";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { HintText } from "@/components/base/input/hint-text";
import { InputBase, TextField } from "@/components/base/input/input";
import { InputNumberBase } from "@/components/base/input/input-number";
import { Label } from "@/components/base/input/label";
import { Select } from "@/components/base/select/select";
import { TextArea } from "@/components/base/textarea/textarea";
import { Toggle } from "@/components/base/toggle/toggle";
import { Surgir } from "@/components/foundations/transicao";
import { cx } from "@/utils/cx";
import type { Opcao } from "../data/opcoes";
import { MSG } from "../data/opcoes";

/* ------------------------------------------------------------------ */
/*  Peças do formulário, compostas do DS (UI-DS-009)                   */
/*  - Rótulo com (?): o Label do DS já traz o Tooltip acessível por    */
/*    teclado; aqui ele vai em todos os campos, não só no Select.      */
/*  - Contador: HintText + texto do DS, alinhado à direita.            */
/*  - Vagas: campo de número do DS + Toggle "Sem limite".              */
/* ------------------------------------------------------------------ */

/** Seção do formulário: o único contêiner (cartão). Título e, se precisar, subtítulo (UI-VIS-014). */
export const Secao = ({
    id,
    titulo,
    descricao,
    acao,
    children,
    className,
}: {
    id?: string;
    titulo: ReactNode;
    descricao?: ReactNode;
    acao?: ReactNode;
    children?: ReactNode;
    className?: string;
}) => (
    <section id={id} className={cx("flex scroll-mt-6 flex-col gap-5 rounded-2xl bg-primary p-5 ring-1 ring-secondary md:p-6", className)}>
        <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-0.5">
                <h2 className="text-lg font-semibold text-primary">{titulo}</h2>
                {descricao && <p className="max-w-[65ch] text-sm text-tertiary">{descricao}</p>}
            </div>
            {acao && <div className="flex shrink-0 items-center gap-1">{acao}</div>}
        </div>
        {children}
    </section>
);

/** Subgrupo dentro da seção: título (Text sm Semibold) e linha acima, sem caixa (UI-VIS-019). */
export const Subgrupo = ({
    id,
    titulo,
    descricao,
    acao,
    children,
    semLinha,
}: {
    id?: string;
    titulo: ReactNode;
    descricao?: ReactNode;
    acao?: ReactNode;
    children?: ReactNode;
    semLinha?: boolean;
}) => (
    <div id={id} className={cx("flex scroll-mt-6 flex-col gap-4", !semLinha && "border-t border-secondary pt-5")}>
        <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
                <h3 className="text-sm font-semibold text-primary">{titulo}</h3>
                {descricao && <p className="max-w-[65ch] text-sm text-tertiary">{descricao}</p>}
            </div>
            {acao && <div className="flex shrink-0 items-center gap-1">{acao}</div>}
        </div>
        {children}
    </div>
);

export const Grade = ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={cx("grid gap-4 md:grid-cols-2", className)}>{children}</div>
);

/** Estado vazio de uma lista, composto do EmptyState do DS (o título vira h3: a página já tem h1). */
export const Vazio = ({ icone, titulo, descricao, acao }: { icone: FC<{ className?: string }>; titulo: string; descricao?: string; acao?: ReactNode }) => (
    <EmptyState size="sm" className="py-4">
        <EmptyState.Header pattern="none">
            <EmptyState.FeaturedIcon icon={icone} color="gray" theme="modern" size="md" />
        </EmptyState.Header>
        <EmptyState.Content className="mb-4">
            <h3 className="text-sm font-semibold text-primary">{titulo}</h3>
            {descricao && <EmptyState.Description>{descricao}</EmptyState.Description>}
        </EmptyState.Content>
        {acao && <EmptyState.Footer>{acao}</EmptyState.Footer>}
    </EmptyState>
);

/** Aviso "Revise esta data" no lugar da dica (cópia de evento, RN-07). */
const AvisoRevisar = () => (
    <span className="inline-flex items-center gap-1.5 font-medium text-warning-primary">
        <AlertTriangle className="size-4 shrink-0 text-fg-warning-primary" aria-hidden="true" />
        {MSG.revisarData}
    </span>
);

/** Rodapé do campo: dica ou erro à esquerda e contador à direita. */
const Rodape = ({ hint, isInvalid, contador }: { hint?: ReactNode; isInvalid?: boolean; contador?: ReactNode }) =>
    contador ? (
        <div className="flex w-full items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
                <Surgir visivel={!!hint}>
                    <HintText isInvalid={isInvalid}>{hint}</HintText>
                </Surgir>
            </div>
            <span className="shrink-0 text-sm text-tertiary tabular-nums" aria-hidden="true">
                {contador}
            </span>
        </div>
    ) : (
        <Surgir visivel={!!hint} gap={6} className="w-full">
            <HintText isInvalid={isInvalid}>{hint}</HintText>
        </Surgir>
    );

interface CampoTextoProps {
    id: string;
    label: string;
    valor: string;
    onChange: (v: string) => void;
    onBlur?: () => void;
    erro?: string;
    dica?: ReactNode;
    tooltip?: string;
    placeholder?: string;
    isRequired?: boolean;
    isReadOnly?: boolean;
    limite?: number;
    inputMode?: "text" | "numeric";
    autoFocus?: boolean;
    /** Rótulo só para leitor de tela (linhas de lista com cabeçalho de coluna). */
    ocultarLabel?: boolean;
    className?: string;
}

/** Texto curto: TextField + Label (com ?) + InputBase + HintText do DS, com contador opcional. */
export const CampoTexto = ({ id, label, valor, onChange, onBlur, erro, dica, tooltip, placeholder, isRequired, isReadOnly, limite, inputMode, autoFocus, ocultarLabel, className }: CampoTextoProps) => (
    <div id={id} data-erro={erro ? "" : undefined} className={cx("min-w-0 scroll-mt-6", className)}>
        <TextField
            value={valor}
            onChange={onChange}
            onBlur={onBlur}
            isInvalid={!!erro}
            isRequired={isRequired}
            isReadOnly={isReadOnly}
            maxLength={limite}
            autoFocus={autoFocus}
            inputMode={inputMode}
        >
            <Label isRequired={isRequired} tooltip={tooltip} className={ocultarLabel ? "sr-only" : undefined}>
                {label}
            </Label>
            <InputBase placeholder={placeholder} />
            <Rodape hint={erro ?? dica} isInvalid={!!erro} contador={limite ? `${valor.length}/${limite}` : undefined} />
        </TextField>
    </div>
);

/** Texto longo com contador (TextArea do DS). */
export const CampoTextoLongo = ({ id, label, valor, onChange, onBlur, erro, dica, placeholder, limite }: Omit<CampoTextoProps, "tooltip" | "isRequired" | "isReadOnly" | "inputMode" | "ocultarLabel">) => (
    <div id={id} data-erro={erro ? "" : undefined} className="flex min-w-0 scroll-mt-6 flex-col gap-1.5">
        <TextArea label={label} value={valor} onChange={onChange} onBlur={onBlur} isInvalid={!!erro} placeholder={placeholder} rows={4} maxLength={limite} />
        <Rodape hint={erro ?? dica} isInvalid={!!erro} contador={limite ? `${valor.length}/${limite}` : undefined} />
    </div>
);

/** Formato dos números inteiros: objeto fixo, para o NumberField não reformatar a cada renderização. */
const FORMATO_INTEIRO: Intl.NumberFormatOptions = { maximumFractionDigits: 0, useGrouping: true };

interface CampoNumeroProps {
    id: string;
    label: string;
    valor: number | null;
    onChange: (v: number | null) => void;
    onBlur?: () => void;
    erro?: string;
    dica?: ReactNode;
    tooltip?: string;
    placeholder?: string;
    isRequired?: boolean;
    isDisabled?: boolean;
    formato?: Intl.NumberFormatOptions;
    /** Marca o campo como inválido sem mensagem própria (o erro fica no grupo, ex.: faixa etária). */
    isInvalid?: boolean;
    ocultarLabel?: boolean;
    className?: string;
}

/** Número (e valor em R$ com máscara): NumberField do React Aria com Label, InputNumberBase e HintText do DS. */
export const CampoNumero = ({ id, label, valor, onChange, onBlur, erro, dica, tooltip, placeholder, isRequired, isDisabled, formato, isInvalid, ocultarLabel, className }: CampoNumeroProps) => (
    <div id={id} data-erro={erro ? "" : undefined} className={cx("min-w-0 scroll-mt-6", className)}>
        <AriaNumberField
            value={valor ?? Number.NaN}
            onChange={(v) => onChange(Number.isNaN(v) ? null : v)}
            onBlur={onBlur}
            isInvalid={!!erro || isInvalid}
            isRequired={isRequired}
            isDisabled={isDisabled}
            formatOptions={formato ?? FORMATO_INTEIRO}
            className="group flex h-max w-full flex-col items-start justify-start gap-1.5"
        >
            {/* O NumberField dá aos botões de dentro só os slots "increment" e "decrement"; o (?) do rótulo é um
                botão sem slot e quebrava a tela ("A slot prop is required"). Aqui o rótulo sai desse contexto. */}
            <AriaButtonContext.Provider value={null}>
                <Label isRequired={isRequired} isInvalid={!!erro || isInvalid} tooltip={tooltip} className={ocultarLabel ? "sr-only" : undefined}>
                    {label}
                </Label>
            </AriaButtonContext.Provider>
            <InputNumberBase placeholder={placeholder} isInvalid={!!erro || isInvalid} isDisabled={isDisabled} />
            <Rodape hint={erro ?? dica} isInvalid={!!erro} />
        </AriaNumberField>
    </div>
);

/**
 * Vagas: número ou "Sem limite" (Toggle do DS). Com o toggle ligado, o número fica desabilitado.
 * v0.15: `semLimitePermitido={false}` (modalidade) mostra só o número, obrigatório.
 */
export const CampoVagas = ({
    id,
    label,
    tooltip,
    semLimite,
    vagas,
    onChange,
    onBlur,
    erro,
    dica,
    semLimitePermitido = true,
}: {
    id: string;
    label: string;
    tooltip?: string;
    semLimite: boolean;
    vagas: number | null;
    onChange: (semLimite: boolean, vagas: number | null) => void;
    onBlur?: () => void;
    erro?: string;
    dica?: ReactNode;
    semLimitePermitido?: boolean;
}) => {
    const livre = semLimitePermitido && semLimite;
    return (
        <div className="flex min-w-0 flex-col gap-3">
            <CampoNumero
                id={id}
                label={label}
                tooltip={tooltip}
                valor={livre ? null : vagas}
                placeholder={livre ? "Sem limite" : "Ex.: 500"}
                isDisabled={livre}
                isRequired={!livre}
                onChange={(v) => onChange(false, v)}
                onBlur={onBlur}
                erro={livre ? undefined : erro}
                dica={dica}
            />
            {semLimitePermitido && <Toggle size="sm" label="Sem limite" isSelected={semLimite} onChange={(v) => onChange(v, v ? null : vagas)} />}
        </div>
    );
};

interface CampoSelectProps {
    id: string;
    label: string;
    opcoes: Opcao[];
    valor: string;
    onChange: (v: string) => void;
    onBlur?: () => void;
    erro?: string;
    dica?: string;
    tooltip?: string;
    placeholder?: string;
    isRequired?: boolean;
    className?: string;
}

/**
 * Lista: Select do DS. Com (?), o rótulo fica fora do Select: dentro dele, o Select repassa as props do
 * gatilho a todo botão, e o (?) virava um segundo gatilho da lista.
 */
export const CampoSelect = ({ id, label, opcoes, valor, onChange, onBlur, erro, dica, tooltip, placeholder = "Selecione", isRequired, className }: CampoSelectProps) => {
    const rotuloId = `${id}-rotulo`;
    return (
        <div id={id} data-erro={erro ? "" : undefined} className={cx("flex min-w-0 scroll-mt-6 flex-col gap-1.5", className)}>
            {tooltip && (
                <Label id={rotuloId} isRequired={isRequired} isInvalid={!!erro} tooltip={tooltip}>
                    {label}
                </Label>
            )}
            <Select
                label={tooltip ? undefined : label}
                aria-labelledby={tooltip ? rotuloId : undefined}
                placeholder={placeholder}
                items={opcoes}
                selectedKey={valor || null}
                onSelectionChange={(k) => k != null && onChange(String(k))}
                onBlur={onBlur}
                isRequired={isRequired}
                isInvalid={!!erro}
                hint={erro ?? dica}
            >
                {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
            </Select>
        </div>
    );
};

const paraData = (s: string) => {
    try {
        return s ? parseDateTime(s) : null;
    } catch {
        return null;
    }
};

/** Data e hora num campo só: DateTimePicker do DS, 24 h, minuto como menor unidade (UI-FRM-001). */
export const CampoDataHora = ({
    id,
    label,
    valor,
    onChange,
    onBlur,
    erro,
    dica,
    revisar,
    isRequired,
    className,
    ocultarLabel,
}: {
    id: string;
    label: string;
    valor: string;
    onChange: (v: string) => void;
    onBlur?: () => void;
    erro?: string;
    dica?: ReactNode;
    /** Data copiada de outro evento: avisa "Revise esta data" até a pessoa editar. */
    revisar?: boolean;
    isRequired?: boolean;
    className?: string;
    /** Rótulo só para leitor de tela (linhas de tabela com cabeçalho de coluna). */
    ocultarLabel?: boolean;
}) => (
    <div id={id} data-erro={erro ? "" : undefined} className={cx("min-w-0 scroll-mt-6", className)}>
        <DateTimePicker
            label={ocultarLabel ? undefined : label}
            aria-label={ocultarLabel ? label : undefined}
            granularity="minute"
            hourCycle={24}
            value={paraData(valor)}
            onChange={(v) => onChange(v ? v.toString().slice(0, 16) : "")}
            onBlur={onBlur}
            isRequired={isRequired}
            isInvalid={!!erro}
            hint={erro ?? (revisar ? <AvisoRevisar /> : dica)}
        />
    </div>
);

/** Escolha entre 2 ou 3 opções curtas: Label do DS (com ?) + ButtonGroup do DS. */
export const Escolha = <T extends string>({
    label,
    tooltip,
    valor,
    opcoes,
    onChange,
}: {
    label: string;
    tooltip?: string;
    valor: T;
    opcoes: Opcao<T>[];
    onChange: (v: T) => void;
}) => {
    const rotuloId = useId();
    return (
        <div className="flex min-w-0 flex-col gap-1.5">
            <Label id={rotuloId} tooltip={tooltip}>
                {label}
            </Label>
            <ButtonGroup
                size="sm"
                aria-labelledby={rotuloId}
                selectedKeys={new Set([valor])}
                onSelectionChange={(keys) => {
                    const v = [...keys][0];
                    if (v) onChange(String(v) as T);
                }}
                disallowEmptySelection
                className="max-w-full"
            >
                {opcoes.map((o) => (
                    <ButtonGroupItem key={o.id} id={o.id}>
                        {o.label}
                    </ButtonGroupItem>
                ))}
            </ButtonGroup>
        </div>
    );
};

/** Erro de uma lista inteira (ex.: modalidade sem categoria), no mesmo estilo do HintText. */
export const ErroDaLista = ({ erro }: { erro?: string }) => (
    <Surgir visivel={!!erro}>
        <HintText isInvalid>{erro}</HintText>
    </Surgir>
);
