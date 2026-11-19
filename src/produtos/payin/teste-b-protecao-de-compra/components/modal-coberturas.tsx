import type { FC } from "react";
import { ActivityHeart, Bus, Check, Home02, Scales02, ShieldTick, XClose } from "@untitledui/icons";
import { Heading as AriaHeading } from "react-aria-components";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { brl } from "../data/evento";
import { usePedido } from "../data/pedido-store";

interface Cobertura {
    icone: FC<{ className?: string }>;
    titulo: string;
    casos: string[];
}

const COBERTURAS: Cobertura[] = [
    { icone: ActivityHeart, titulo: "Saúde", casos: ["Acidente, doença ou lesão", "Condição médica preexistente", "Infecção por COVID-19 e isolamento"] },
    { icone: Bus, titulo: "Imprevistos no caminho", casos: ["Falha no transporte público", "Falha de veículo privado"] },
    { icone: Home02, titulo: "Emergências em casa", casos: ["Emergência doméstica", "Chamada de serviços de emergência"] },
    { icone: Scales02, titulo: "Documentos e questões judiciais", casos: ["Roubo de documentos", "Intimação judicial"] },
];

/**
 * "Conheça as coberturas!": detalha o que a proteção cobre, sem tirar o comprador do checkout.
 * Fecha no "X", clicando fora ou no Esc, sem mudar a escolha; os dois botões respondem à oferta daqui mesmo.
 * Desktop: card central de 480px. Celular: folha ancorada no rodapé.
 */
export function ModalCoberturas({ aberto, onFechar, onEscolher }: { aberto: boolean; onFechar: () => void; onEscolher: (comProtecao: boolean) => void }) {
    const { valorProtecao } = usePedido();

    return (
        <ModalOverlay isOpen={aberto} isDismissable onOpenChange={(abre) => !abre && onFechar()} className="max-sm:px-0 max-sm:pt-11 max-sm:pb-0">
            <Modal className="max-w-[480px] max-sm:max-w-none max-sm:rounded-none">
                <Dialog>
                    <div className="relative flex max-h-[calc(100dvh-44px)] w-full flex-col gap-4 overflow-y-auto rounded-t-3xl bg-primary px-4 py-7 font-['Elza'] shadow-[0_16px_48px_rgba(0,0,0,0.18)] sm:max-h-[calc(100dvh-64px)] sm:rounded-[20px] sm:p-8">
                        <button
                            type="button"
                            aria-label="Fechar"
                            onClick={onFechar}
                            className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-lg text-fg-quaternary outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover hover:text-fg-secondary focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                            <XClose className="size-5" aria-hidden="true" />
                        </button>

                        <header className="flex items-start gap-3.5 pr-8">
                            <span className="flex size-[52px] shrink-0 items-center justify-center rounded-lg bg-utility-green-50">
                                <ShieldTick className="size-[26px] text-utility-green-600" aria-hidden="true" />
                            </span>
                            <AriaHeading slot="title" className="flex min-h-[52px] flex-1 items-center text-lg leading-6 font-semibold text-primary sm:text-display-xs">
                                O que a proteção cobre
                            </AriaHeading>
                        </header>

                        <p className="text-md leading-5 text-tertiary sm:leading-[1.4]">
                            Se uma destas situações te impedir de ir ao evento, você pode solicitar o reembolso.
                        </p>

                        <ul className="grid gap-4 sm:grid-cols-2">
                            {COBERTURAS.map(({ icone: Icone, titulo, casos }) => (
                                <li key={titulo} className="flex flex-col gap-2 rounded-xl bg-tertiary p-4">
                                    <span className="flex items-center gap-2">
                                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary bg-primary">
                                            <Icone className="size-[18px] text-fg-secondary" aria-hidden="true" />
                                        </span>
                                        <span className="flex-1 text-sm leading-[1.2] font-semibold text-primary">{titulo}</span>
                                    </span>
                                    <ul className="flex flex-col gap-1.5">
                                        {casos.map((caso) => (
                                            <li key={caso} className="flex items-start gap-1.5 text-[13px] leading-[1.4] text-secondary">
                                                <Check className="size-4 shrink-0 text-[#ff271a]" aria-hidden="true" />
                                                <span className="flex-1">{caso}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </li>
                            ))}
                        </ul>

                        <div className="flex flex-col items-center gap-3">
                            <button
                                type="button"
                                onClick={() => onEscolher(true)}
                                className="w-full rounded-lg bg-[#ff271a] px-4 py-2.5 text-md font-semibold text-white tabular-nums shadow-xs-skeuomorphic outline-focus-ring transition duration-100 ease-linear hover:bg-[#c81f14] focus-visible:outline-2 focus-visible:outline-offset-2"
                            >
                                Continuar com proteção · {brl(valorProtecao)}
                            </button>
                            <button
                                type="button"
                                onClick={() => onEscolher(false)}
                                className="rounded-xs text-md font-semibold text-tertiary outline-focus-ring transition duration-100 ease-linear hover:text-tertiary_hover focus-visible:outline-2 focus-visible:outline-offset-2"
                            >
                                Prefiro correr o risco
                            </button>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
