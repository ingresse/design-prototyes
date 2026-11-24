import { Check, XClose } from "@untitledui/icons";
import { Dialog as AriaDialog, Heading as AriaHeading, Modal as AriaModal, ModalOverlay as AriaModalOverlay } from "react-aria-components";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import type { Servico } from "../data/servicos";

/**
 * "O que a proteção cobre": as situações cobertas, em grupos (o mesmo conteúdo do modal de produção).
 * Modal no desktop e bottom sheet no celular, como o compartilhar das ofertas. Abre pelo link do benefício.
 */
export function CoberturasProtecao({ servico, aberto, onFechar }: { servico: Servico; aberto: boolean; onFechar: () => void }) {
    const coberturas = servico.coberturas;
    if (!coberturas) return null;
    return (
        <AriaModalOverlay
            isOpen={aberto}
            onOpenChange={(v) => !v && onFechar()}
            isDismissable
            className={({ isEntering, isExiting }) =>
                cx(
                    "fixed inset-0 z-50 flex items-end justify-center bg-overlay/70 backdrop-blur-[6px] lg:items-center lg:p-8",
                    isEntering && "duration-200 ease-out animate-in fade-in motion-reduce:animate-none",
                    isExiting && "duration-200 ease-in animate-out fade-out motion-reduce:animate-none",
                )
            }
        >
            <AriaModal
                className={({ isEntering, isExiting }) =>
                    cx(
                        "w-full outline-hidden lg:max-w-[600px]",
                        isEntering && "duration-300 ease-out animate-in slide-in-from-bottom lg:duration-200 lg:zoom-in-95 lg:slide-in-from-bottom-0 motion-reduce:animate-none",
                        isExiting && "duration-200 ease-in animate-out slide-out-to-bottom lg:zoom-out-95 lg:slide-out-to-bottom-0 motion-reduce:animate-none",
                    )
                }
            >
                <AriaDialog className="outline-hidden">
                    {({ close }) => (
                        <div className="flex max-h-[85dvh] flex-col overflow-hidden rounded-t-3xl bg-primary lg:rounded-2xl">
                            <div className="flex items-start justify-between gap-4 px-5 pt-6 lg:px-6">
                                <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                    {coberturas.titulo}
                                </AriaHeading>
                                <button
                                    type="button"
                                    aria-label="Fechar"
                                    onClick={close}
                                    className="-mt-1 -mr-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-fg-quaternary outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover focus-visible:outline-2"
                                >
                                    <XClose className="size-5" />
                                </button>
                            </div>
                            <div className="flex flex-col gap-5 overflow-y-auto px-5 pt-3 pb-6 lg:px-6">
                                <p className="text-md text-tertiary">{coberturas.descricao}</p>
                                <h3 className="text-sm font-semibold text-tertiary">Situações cobertas</h3>
                                <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                    {coberturas.grupos.map((grupo) => (
                                        <li key={grupo.titulo} className="flex flex-col gap-3 rounded-xl bg-secondary p-4">
                                            <span className="text-md font-semibold text-primary">{grupo.titulo}</span>
                                            <ul className="flex flex-col gap-2">
                                                {grupo.itens.map((item) => (
                                                    <li key={item} className="flex items-start gap-2 text-sm text-secondary">
                                                        <Check className="mt-0.5 size-4 shrink-0 text-fg-brand-primary" aria-hidden="true" />
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="border-t border-secondary px-5 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] lg:px-6">
                                <Button size="lg" color="primary" className="w-full" onClick={close}>
                                    Entendi
                                </Button>
                            </div>
                        </div>
                    )}
                </AriaDialog>
            </AriaModal>
        </AriaModalOverlay>
    );
}
