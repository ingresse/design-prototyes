import { ShieldOff } from "@untitledui/icons";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { brl } from "../data/evento";
import { usePedido } from "../data/pedido-store";

/** Espera o modal sair de cena antes de o aviso abrir, para o comprador ver a transição. */
const ATRASO_MODAL = 0.25;
const SAIDA_SUAVE = [0.22, 1, 0.36, 1] as const;

/**
 * Aviso acima dos meios de pagamento para quem escolheu "Prefiro correr o risco": lembra que a compra está sem proteção
 * e deixa aceitar ali mesmo ("Proteger por R$ X"). Abre e recolhe com uma transição leve; os meios de pagamento acompanham.
 */
export function AvisoSemProtecao() {
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
                            className="flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-xl border border-[#e5e5e5] bg-primary p-4"
                            initial={semMovimento ? false : { y: 10 }}
                            animate={{ y: 0 }}
                            transition={semMovimento ? instantaneo : { duration: 0.45, delay: ATRASO_MODAL, ease: SAIDA_SUAVE }}
                        >
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-tertiary">
                                <ShieldOff className="size-5 text-fg-quaternary" aria-hidden="true" />
                            </span>
                            <p className="flex min-w-[200px] flex-1 flex-col text-sm text-tertiary">
                                <span className="font-semibold text-primary">Imprevistos acontecem. Sua compra está sem proteção.</span>
                                <span>Se um imprevisto impedir sua ida, você fica sem o reembolso da proteção.</span>
                            </p>
                            <button
                                type="button"
                                onClick={() => escolherProtecao("com")}
                                className="shrink-0 rounded-xs text-sm font-semibold text-[#c81f14] tabular-nums outline-focus-ring transition duration-100 ease-linear hover:text-[#a8170e] focus-visible:outline-2 focus-visible:outline-offset-2 max-sm:ml-[54px]"
                            >
                                Proteger por {brl(valorProtecao)}
                            </button>
                        </motion.section>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
