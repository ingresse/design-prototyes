import { ShieldOff, ShieldTick } from "@untitledui/icons";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { brl } from "../data/evento";
import { usePedido } from "../data/pedido-store";

/** Espera o modal sair de cena antes de o aviso abrir, para o comprador ver a transição. */
const ATRASO_MODAL = 0.25;
const SAIDA_SUAVE = [0.22, 1, 0.36, 1] as const;

/**
 * Aviso acima dos meios de pagamento para quem escolheu "Prefiro correr o risco": lembra que a compra está sem proteção
 * deixa rever as coberturas e aceitar ali mesmo ("Proteger por R$ X"). Card do Figma "Aviso / Compra sem proteção"
 * (11109:7715 web, 11056:8860 celular). Abre e recolhe com uma transição leve; os meios de pagamento acompanham.
 */
export function AvisoSemProtecao({ onVerCoberturas }: { onVerCoberturas: () => void }) {
    const { protecao, valorProtecao, escolherProtecao } = usePedido();
    const semMovimento = useReducedMotion();
    const instantaneo = { duration: 0 };

    return (
        <AnimatePresence initial={false}>
            {protecao === "sem" && (
                <motion.div
                    key="aviso"
                    className="overflow-hidden"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{
                        height: "auto",
                        opacity: 1,
                        transition: semMovimento ? instantaneo : { duration: 0.45, delay: ATRASO_MODAL, ease: SAIDA_SUAVE },
                    }}
                    exit={{ height: 0, opacity: 0, transition: semMovimento ? instantaneo : { duration: 0.35, ease: SAIDA_SUAVE } }}
                >
                    {/* O espaço até "Escolha como pagar" fica dentro do bloco animado, para recolher junto */}
                    <div className="pb-6">
                        <motion.section
                            aria-label="Proteção de compra"
                            className="flex flex-col gap-3 rounded-xl border border-[#ffc4c0] bg-[#fff1f0] p-3 sm:flex-row sm:items-center sm:gap-3.5 sm:p-4"
                            initial={semMovimento ? false : { y: 10 }}
                            animate={{ y: 0 }}
                            transition={semMovimento ? instantaneo : { duration: 0.45, delay: ATRASO_MODAL, ease: SAIDA_SUAVE }}
                        >
                            <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-3.5">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white">
                                    <ShieldOff className="size-5 text-[#ef4444]" aria-hidden="true" />
                                </span>
                                <p className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm text-[#525252]">
                                    <span className="text-md font-semibold text-[#171717]">Sua compra está sem proteção.</span>
                                    <span>
                                        Com a proteção, se uma situação coberta impedir sua ida, você pode solicitar o reembolso.{" "}
                                        <button
                                            type="button"
                                            onClick={onVerCoberturas}
                                            className="rounded-xs text-sm font-semibold text-[#c81f14] underline outline-focus-ring transition duration-100 ease-linear hover:text-[#a8170e] focus-visible:outline-2 focus-visible:outline-offset-2"
                                        >
                                            Conheça as coberturas
                                        </button>
                                    </span>
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => escolherProtecao("com")}
                                className="flex shrink-0 items-center justify-center gap-1 rounded-lg border-2 border-white/12 bg-[#ff271a] bg-clip-padding px-3.5 py-2.5 text-sm font-semibold text-white tabular-nums shadow-xs-skeuomorphic outline-focus-ring transition duration-100 ease-linear hover:bg-[#c81f14] focus-visible:outline-2 focus-visible:outline-offset-2"
                            >
                                <ShieldTick className="size-5" aria-hidden="true" />
                                <span className="px-0.5">Proteger por {brl(valorProtecao)}</span>
                            </button>
                        </motion.section>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
