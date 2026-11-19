import { type FC, useState } from "react";
import { ActivityHeart, Bus, Check, ChevronDown, Home02, Scales02, ShieldTick } from "@untitledui/icons";
import { Heading as AriaHeading } from "react-aria-components";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { cx } from "@/utils/cx";
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
 * Variante B do teste A/B: a oferta de proteção abre sobre o checkout, antes dos meios de pagamento.
 * Não tem "X" nem fecha ao clicar fora ou no Esc: as duas saídas são "Proteger meu ingresso" e "Prefiro correr o risco".
 * As coberturas ficam recolhidas atrás de "Conheça as coberturas"; o valor da proteção aparece antes dos botões.
 * Desktop: card central de 480px. Celular: folha ancorada no rodapé.
 */
export function ModalProtecao({ aberto, onEscolher }: { aberto: boolean; onEscolher: (comProtecao: boolean) => void }) {
    const { valorProtecao } = usePedido();
    const [coberturasAbertas, setCoberturasAbertas] = useState(false);

    return (
        <ModalOverlay isOpen={aberto} isDismissable={false} isKeyboardDismissDisabled className="max-sm:px-0 max-sm:pt-11 max-sm:pb-0">
            <Modal className="max-w-[480px] max-sm:max-w-none max-sm:rounded-none">
                <Dialog>
                    <div className="flex max-h-[calc(100dvh-44px)] w-full flex-col gap-4 overflow-y-auto rounded-t-3xl bg-primary px-4 py-7 font-['Elza'] shadow-[0_16px_48px_rgba(0,0,0,0.18)] sm:max-h-[calc(100dvh-64px)] sm:rounded-[20px] sm:p-8">
                        <header className="flex items-start gap-3.5">
                            <span className="flex size-[52px] shrink-0 items-center justify-center rounded-lg bg-utility-green-50">
                                <ShieldTick className="size-[26px] text-utility-green-600" aria-hidden="true" />
                            </span>
                            <AriaHeading slot="title" className="flex-1 text-lg leading-6 font-semibold text-primary sm:text-display-xs">
                                Imprevistos acontecem. Proteja sua compra.
                            </AriaHeading>
                        </header>

                        <div className="flex flex-col gap-4 sm:gap-2">
                            <p className="text-md leading-5 text-tertiary sm:leading-[1.4]">
                                Se um imprevisto coberto te impedir de ir ao evento, você pode pedir o reembolso do valor pago.
                            </p>

                            <button
                                type="button"
                                aria-expanded={coberturasAbertas}
                                aria-controls="coberturas-protecao"
                                onClick={() => setCoberturasAbertas((a) => !a)}
                                className="flex items-center justify-between rounded-xs text-left text-[15px] leading-[1.4] font-semibold text-[#ff271a] outline-focus-ring transition duration-100 ease-linear hover:text-[#c81f14] focus-visible:outline-2 focus-visible:outline-offset-2 sm:justify-start sm:self-start"
                            >
                                Conheça as coberturas
                                <ChevronDown
                                    className={cx("size-5 shrink-0 transition-transform duration-150 ease-out motion-reduce:transition-none", coberturasAbertas && "rotate-180")}
                                    aria-hidden="true"
                                />
                            </button>
                        </div>

                        {coberturasAbertas && (
                            <ul id="coberturas-protecao" className="grid gap-4 sm:grid-cols-2">
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
                        )}

                        <p className="flex items-center justify-between rounded-[10px] border border-primary bg-tertiary px-4 py-3.5">
                            <span className="text-sm text-tertiary">Valor da proteção</span>
                            <span className="text-md font-semibold text-primary tabular-nums">{brl(valorProtecao)}</span>
                        </p>

                        <div className="flex flex-col items-center gap-3">
                            <button
                                type="button"
                                onClick={() => onEscolher(true)}
                                className="w-full rounded-lg bg-[#ff271a] px-4 py-2.5 text-md font-semibold text-white shadow-xs-skeuomorphic outline-focus-ring transition duration-100 ease-linear hover:bg-[#c81f14] focus-visible:outline-2 focus-visible:outline-offset-2"
                            >
                                Proteger meu ingresso
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
