import { Check, XClose } from "@untitledui/icons";
import {
    Button as AriaButton,
    Dialog as AriaDialog,
    Heading as AriaHeading,
    Modal as AriaModal,
    ModalOverlay as AriaModalOverlay,
} from "react-aria-components";
import { COBERTURAS } from "../data/coberturas";
import "./modal-protecao.css";

/**
 * Modal "O que a proteção cobre": abre pelo link "Conheça as coberturas" do aviso de compra sem proteção.
 * Só informa: fecha no "X", em "Entendi", no Esc ou clicando fora, e não muda a escolha da proteção.
 * Figma: 11116:8628 (web, 560px) e 11116:8782 (celular, card centralizado com 16px de margem).
 */
export function ModalCoberturas({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
    return (
        <AriaModalOverlay
            isOpen={aberto}
            onOpenChange={(abrir) => !abrir && onFechar()}
            isDismissable
            className="tc-protecao fixed inset-0 z-50 flex min-h-dvh w-full items-center justify-center p-4 font-['Elza'] outline-hidden sm:p-8"
        >
            <div aria-hidden="true" className="tc-scrim absolute inset-0 bg-[rgba(10,10,10,0.7)]" />
            <AriaModal className="tc-modal-coberturas relative flex max-h-full w-full max-w-[560px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl outline-hidden">
                <AriaDialog className="flex min-h-0 flex-col outline-hidden">
                    <header className="relative flex shrink-0 flex-col gap-0.5 px-6 pt-6 pr-14">
                        <AriaHeading slot="title" className="text-md font-semibold text-[#171717]">
                            O que a proteção cobre
                        </AriaHeading>
                        <p className="text-sm text-[#525252]">
                            Se uma destas situações te impedir de ir ao evento, você pode pedir o reembolso. Cada pedido é analisado conforme as
                            regras da proteção.
                        </p>
                        <AriaButton
                            aria-label="Fechar"
                            onPress={onFechar}
                            className="absolute top-4 right-4 flex size-10 cursor-pointer items-center justify-center rounded-lg text-[#a3a3a3] outline-focus-ring transition duration-100 ease-linear hover:bg-[#fafafa] hover:text-[#737373] focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                            <XClose className="size-6" aria-hidden="true" />
                        </AriaButton>
                    </header>

                    <div className="flex min-h-0 flex-col gap-3 overflow-y-auto px-6 pt-3 pb-8">
                        <h3 className="text-xs font-semibold text-[#525252] sm:text-sm">Situações cobertas</h3>
                        <ul className="grid gap-3 sm:grid-cols-2">
                            {COBERTURAS.map(({ icone: Icone, titulo, casos }) => (
                                <li key={titulo} className="flex flex-col gap-3 rounded-xl bg-[#fafafa] p-3">
                                    <div className="flex items-center gap-3">
                                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-xs-skeuomorphic ring-1 ring-[#d4d4d4] ring-inset">
                                            <Icone className="size-5 text-[#404040]" aria-hidden="true" />
                                        </span>
                                        <span className="text-sm font-semibold text-[#171717]">{titulo}</span>
                                    </div>
                                    <ul className="flex flex-col gap-2">
                                        {casos.map((caso) => (
                                            <li key={caso} className="flex gap-2 text-sm text-[#404040]">
                                                <Check className="mt-0.5 size-4 shrink-0 text-[#ef4444]" aria-hidden="true" />
                                                {caso}
                                            </li>
                                        ))}
                                    </ul>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <footer className="shrink-0 border-t border-[#e5e5e5] p-6">
                        <AriaButton
                            onPress={onFechar}
                            className="flex w-full cursor-pointer items-center justify-center rounded-lg border-2 border-white/12 bg-[#ff271a] bg-clip-padding px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs-skeuomorphic outline-focus-ring transition duration-100 ease-linear hover:bg-[#c81f14] focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                            Entendi
                        </AriaButton>
                    </footer>
                </AriaDialog>
            </AriaModal>
        </AriaModalOverlay>
    );
}
