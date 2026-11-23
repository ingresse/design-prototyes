import { Button as AriaButton } from "react-aria-components";
import { AlertCircle, Check } from "@untitledui/icons";
import { ProgressBarBase } from "@/components/base/progress-indicators/progress-indicators";
import { cx } from "@/utils/cx";

/* ------------------------------------------------------------------ */
/*  Barra de passos do assistente (composta do DS)                     */
/*  Mesmo desenho do Progress steps "number" do DS (círculo numerado,  */
/*  concluído em success-solid, atual em brand-solid com anel de       */
/*  foco), com um estado a mais: "com pendência" (warning) e o passo   */
/*  clicável para voltar. No celular: "Etapa 2 de 5: Nome" e a barra   */
/*  de progresso do DS (UI-FRM-002).                                   */
/* ------------------------------------------------------------------ */

export type StatusDoPasso = "concluido" | "atual" | "pendencia" | "futuro";

export interface Passo {
    id: string;
    titulo: string;
    status: StatusDoPasso;
    /** Já visitado: dá para voltar clicando. */
    navegavel: boolean;
}

const CIRCULO: Record<StatusDoPasso, string> = {
    concluido: "bg-success-solid text-white",
    atual: "bg-brand-solid text-white ring-2 ring-focus-ring ring-offset-2 ring-offset-bg-primary",
    pendencia: "bg-warning-solid text-white",
    futuro: "bg-primary text-quaternary ring-1 ring-inset ring-secondary",
};

const DESCRICAO: Record<StatusDoPasso, string> = {
    concluido: "concluído",
    atual: "passo atual",
    pendencia: "com pendência",
    futuro: "não iniciado",
};

export function ProgressoDosPassos({ passos, onIr }: { passos: Passo[]; onIr: (indice: number) => void }) {
    const atual = Math.max(0, passos.findIndex((p) => p.status === "atual"));
    return (
        <nav aria-label="Passos da criação do evento">
            {/* Celular */}
            <div className="flex flex-col gap-2 lg:hidden">
                <p className="text-sm font-semibold text-primary">
                    Etapa {atual + 1} de {passos.length}: {passos[atual]?.titulo}
                </p>
                <ProgressBarBase value={atual + 1} max={passos.length} />
            </div>

            {/* Desktop */}
            <ol className="hidden items-start gap-2 lg:flex">
                {passos.map((p, i) => (
                    <li key={p.id} className="flex min-w-0 flex-1 items-center gap-2">
                        <AriaButton
                            isDisabled={!p.navegavel || p.status === "atual"}
                            onPress={() => onIr(i)}
                            aria-current={p.status === "atual" ? "step" : undefined}
                            aria-label={`${i + 1}. ${p.titulo}, ${DESCRICAO[p.status]}`}
                            className={cx(
                                "group flex min-w-0 items-center gap-2.5 rounded-lg p-1 text-left outline-focus-ring transition duration-100 ease-linear focus-visible:outline-2",
                                p.navegavel && p.status !== "atual" ? "cursor-pointer hover:bg-primary_hover" : "cursor-default",
                            )}
                        >
                            <span className={cx("flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold", CIRCULO[p.status])} aria-hidden="true">
                                {p.status === "concluido" ? (
                                    <Check className="size-4" />
                                ) : p.status === "pendencia" ? (
                                    <AlertCircle className="size-4" />
                                ) : (
                                    i + 1
                                )}
                            </span>
                            <span
                                className={cx(
                                    "truncate text-sm font-semibold",
                                    p.status === "atual" ? "text-brand-secondary" : p.status === "pendencia" ? "text-warning-primary" : p.status === "futuro" ? "text-quaternary" : "text-secondary",
                                )}
                            >
                                {p.titulo}
                            </span>
                        </AriaButton>
                        {i < passos.length - 1 && (
                            <span aria-hidden="true" className={cx("h-0.5 min-w-4 flex-1 rounded-full", p.status === "concluido" ? "bg-brand-solid" : "bg-border-secondary")} />
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}
