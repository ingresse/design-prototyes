import { type FC, useState } from "react";
import { ActivityHeart, Bus, ChevronDown, Home02, Scales02, ShieldTick } from "@untitledui/icons";
import { Heading as AriaHeading } from "react-aria-components";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { cx } from "@/utils/cx";

interface Cobertura {
    icone: FC<{ className?: string }>;
    /** Duas linhas no desktop (quebra do Figma); no celular vira uma linha só. */
    titulo: [string, string];
    /** Casos de produção daquele tipo de imprevisto: aparecem em "Ver todas as coberturas". */
    casos: string[];
}

const COBERTURAS: Cobertura[] = [
    { icone: ActivityHeart, titulo: ["Doença, acidente", "ou lesão"], casos: ["Acidente, doença ou lesão", "Condição médica preexistente", "COVID-19 ou necessidade de isolamento"] },
    { icone: Bus, titulo: ["Falha no", "transporte"], casos: ["Problemas no transporte público", "Problemas com veículo particular"] },
    { icone: Home02, titulo: ["Emergência", "em casa"], casos: ["Emergência doméstica", "Atendimento emergencial"] },
    { icone: Scales02, titulo: ["Roubo de", "documentos"], casos: ["Roubo de documentos", "Intimação judicial"] },
];

/**
 * Variante B do teste A/B: a oferta de proteção abre sobre o checkout, antes dos meios de pagamento.
 * Não tem "X" nem fecha ao clicar fora ou no Esc: as duas saídas são "Continuar com proteção" e "Prefiro correr o risco".
 * Desktop: card central de 480px. Celular: folha ancorada no rodapé.
 */
export function ModalProtecao({ aberto, onEscolher }: { aberto: boolean; onEscolher: (comProtecao: boolean) => void }) {
    const [todasAbertas, setTodasAbertas] = useState(false);

    return (
        <ModalOverlay isOpen={aberto} isDismissable={false} isKeyboardDismissDisabled className="max-sm:px-0 max-sm:pt-16 max-sm:pb-0">
            <Modal className="max-w-[480px] max-sm:max-w-none max-sm:rounded-none">
                <Dialog>
                    <div className="flex max-h-[calc(100dvh-64px)] w-full flex-col gap-4 overflow-y-auto rounded-t-3xl bg-primary px-4 py-8 font-['Elza'] shadow-[0_16px_48px_rgba(0,0,0,0.18)] sm:rounded-[20px] sm:p-8">
                        <header className="flex items-start gap-3.5">
                            <span className="flex size-[52px] shrink-0 items-center justify-center rounded-lg bg-[#fff1f0]">
                                <ShieldTick className="size-[26px] text-[#ff271a]" aria-hidden="true" />
                            </span>
                            <AriaHeading slot="title" className="flex-1 text-lg font-semibold text-primary sm:text-display-xs">
                                Imprevistos acontecem. Proteja sua compra.
                            </AriaHeading>
                        </header>

                        <p className="text-sm font-medium text-tertiary">
                            Se um imprevisto coberto impedir sua ida ao evento, você pode solicitar o reembolso dos ingressos.
                        </p>

                        <h3 className="text-xs font-semibold tracking-[0.72px] text-quaternary uppercase sm:leading-5 sm:tracking-normal">
                            Quando você pode contar com a proteção
                        </h3>

                        <ul className="flex flex-col gap-2 sm:grid sm:grid-cols-2 sm:gap-x-3 sm:gap-y-4">
                            {COBERTURAS.map(({ icone, titulo, casos }) => (
                                <li key={titulo.join(" ")} className="flex flex-col gap-2 rounded-xl border border-secondary bg-primary px-3 py-2.5 sm:py-4">
                                    <span className="flex items-center gap-2.5">
                                        <FeaturedIcon icon={icone} color="gray" theme="modern" size="md" className="max-sm:size-9" />
                                        <span className="flex-1 text-sm font-semibold text-primary">
                                            {titulo[0]} <br className="max-sm:hidden" />
                                            {titulo[1]}
                                        </span>
                                    </span>
                                    {todasAbertas && (
                                        <ul className="flex list-disc flex-col gap-0.5 pl-5 text-sm text-tertiary">
                                            {casos.map((caso) => (
                                                <li key={caso}>{caso}</li>
                                            ))}
                                        </ul>
                                    )}
                                </li>
                            ))}
                        </ul>

                        <button
                            type="button"
                            aria-expanded={todasAbertas}
                            onClick={() => setTodasAbertas((a) => !a)}
                            className="flex items-center gap-1 self-start text-sm font-semibold text-[#c81f14] transition duration-100 ease-linear hover:text-[#a1160e]"
                        >
                            Ver todas as coberturas
                            <ChevronDown className={cx("size-4 transition-transform duration-150 ease-out", todasAbertas && "rotate-180")} aria-hidden="true" />
                        </button>

                        <p className="text-[13px] leading-[1.35] text-[#6b7380]">
                            Ao aderir à proteção de compra, você declara estar de acordo com os{" "}
                            <a href="#termos" onClick={(e) => e.preventDefault()} className="text-[#ff271a]">
                                Termos e condições
                            </a>
                            .
                        </p>

                        <div className="flex flex-col items-center gap-3">
                            <button
                                type="button"
                                onClick={() => onEscolher(true)}
                                className="w-full rounded-lg bg-[#ff271a] px-4 py-2.5 text-md font-semibold text-white shadow-xs-skeuomorphic transition duration-100 ease-linear hover:bg-[#c81f14]"
                            >
                                Continuar com proteção
                            </button>
                            <button
                                type="button"
                                onClick={() => onEscolher(false)}
                                className="text-md font-semibold text-tertiary transition duration-100 ease-linear hover:text-tertiary_hover"
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
