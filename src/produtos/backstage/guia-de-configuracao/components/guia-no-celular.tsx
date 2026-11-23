import { useEffect, type Ref } from "react";
import { ChevronDown, ChevronUp } from "@untitledui/icons";
import { motion, useReducedMotion } from "motion/react";
import { Dialog as AriaDialog, Modal as AriaModal, ModalOverlay as AriaModalOverlay } from "react-aria-components";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { CloseButton } from "@/components/base/buttons/close-button";
import { cx } from "@/utils/cx";
import type { Etapa } from "../data/use-etapas";
import { AcordeaoDoGuia, BarraDeProgresso, TITULO_DO_GUIA } from "./painel-do-guia";

interface GuiaNoCelularProps {
    etapas: Etapa[];
    /** No meio de uma configuração (formulário, barra de salvar, tela de um passo): a barra desce e sai (GDC-71). */
    escondido: boolean;
    folhaAberta: boolean;
    onAlternarFolha: (aberta: boolean) => void;
    onFechar: () => void;
    barraRef?: Ref<HTMLDivElement>;
}

/* Sai deslizando para baixo e volta deslizando para cima (GDC-71). */
const DESLIZAR = { duration: 0.32, ease: [0.16, 1, 0.3, 1] as const };

/**
 * Guia no celular (GDC-70 a GDC-72): barra presa no pé da tela com o título, o progresso e o próximo
 * passo; tocar abre o guia inteiro numa folha que sobe de baixo (bottom sheet).
 */
export function GuiaNoCelular({ etapas, escondido, folhaAberta, onAlternarFolha, onFechar, barraRef }: GuiaNoCelularProps) {
    const reduzir = useReducedMotion();
    const passos = etapas.flatMap((e) => (e.bloqueada ? [] : e.passos));
    const total = etapas.reduce((n, e) => n + e.passos.length, 0);
    const feitos = etapas.reduce((n, e) => n + e.passos.filter((p) => p.status === "complete").length, 0);
    const proximo = passos.find((p) => p.status === "current" && !p.bloqueado);

    // Escondida, a folha também fecha: quem foi configurar não quer a folha por cima.
    useEffect(() => {
        if (escondido && folhaAberta) onAlternarFolha(false);
    }, [escondido, folhaAberta, onAlternarFolha]);

    return (
        <>
            <motion.div
                ref={barraRef}
                role="region"
                aria-label={TITULO_DO_GUIA}
                className="fixed inset-x-0 bottom-0 z-30 rounded-t-2xl border-t border-secondary bg-primary px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg"
                initial={reduzir ? false : { y: "110%" }}
                animate={{ y: escondido ? "110%" : 0 }}
                transition={reduzir ? { duration: 0 } : DESLIZAR}
                {...(escondido ? { inert: "" as unknown as boolean, "aria-hidden": true } : {})}
            >
                <button
                    type="button"
                    onClick={() => onAlternarFolha(true)}
                    aria-expanded={folhaAberta}
                    aria-label={`${TITULO_DO_GUIA}, ${feitos} de ${total} passos feitos. Abrir guia`}
                    className="flex w-full items-center justify-between gap-3 rounded-lg py-1 text-left outline-focus-ring focus-visible:outline-2"
                >
                    <span className="text-md font-semibold text-primary">{TITULO_DO_GUIA}</span>
                    <ChevronUp className="size-5 text-fg-quaternary" aria-hidden="true" />
                </button>
                <BarraDeProgresso feitos={feitos} total={total} className="mt-2" />
                {proximo && (
                    <p className="mt-2 truncate text-sm text-tertiary">
                        Próxima:{" "}
                        <button type="button" onClick={proximo.ir} className="font-semibold text-brand-secondary outline-focus-ring hover:text-brand-secondary_hover focus-visible:outline-2">
                            {proximo.rotulo}
                        </button>
                    </p>
                )}
            </motion.div>

            <AriaModalOverlay
                isOpen={folhaAberta}
                onOpenChange={onAlternarFolha}
                isDismissable
                className={(s) =>
                    cx(
                        "fixed inset-0 z-50 flex items-end bg-overlay/70 backdrop-blur-[2px]",
                        s.isEntering && "duration-200 ease-out animate-in fade-in motion-reduce:animate-none",
                        s.isExiting && "duration-200 ease-in animate-out fade-out motion-reduce:animate-none",
                    )
                }
            >
                <AriaModal
                    className={(s) =>
                        cx(
                            "flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-primary pb-[env(safe-area-inset-bottom)] shadow-xl outline-hidden",
                            s.isEntering && "duration-300 ease-out animate-in slide-in-from-bottom motion-reduce:animate-none",
                            s.isExiting && "duration-200 ease-in animate-out slide-out-to-bottom motion-reduce:animate-none",
                        )
                    }
                >
                    <AriaDialog aria-label={TITULO_DO_GUIA} className="flex min-h-0 flex-col outline-hidden">
                        <div className="flex shrink-0 flex-col gap-3 px-4 pt-3 pb-4">
                            <div className="mx-auto h-1 w-10 rounded-full bg-quaternary" aria-hidden="true" />
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-md font-semibold text-primary">{TITULO_DO_GUIA}</p>
                                <div className="flex items-center gap-0.5">
                                    <span className="mr-1.5 text-sm text-tertiary tabular-nums">
                                        {feitos} de {total}
                                    </span>
                                    <ButtonUtility size="sm" color="tertiary" icon={ChevronDown} tooltip="Recolher" onClick={() => onAlternarFolha(false)} />
                                    <CloseButton size="sm" label="Fechar guia" onPress={onFechar} />
                                </div>
                            </div>
                            <BarraDeProgresso feitos={feitos} total={total} />
                        </div>
                        <AcordeaoDoGuia etapas={etapas} className="max-h-none flex-1" />
                    </AriaDialog>
                </AriaModal>
            </AriaModalOverlay>
        </>
    );
}

