import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { cx } from "@/utils/cx";

/** Tempo de cada frase na tela. */
const INTERVALO = 3_000;

/**
 * Índice da frase da vez, separado do desenho para que mais de uma cópia (e o fundo de vidro do
 * mobile, que troca de cor junto) andem no mesmo passo. Com "reduzir movimento", fica na primeira.
 */
export function useRotacaoFrases(total: number) {
    const [indice, setIndice] = useState(0);
    const [reduzirMovimento] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    useEffect(() => {
        if (reduzirMovimento || total < 2) return;
        const t = window.setInterval(() => setIndice((i) => (i + 1) % total), INTERVALO);
        return () => window.clearInterval(t);
    }, [reduzirMovimento, total]);

    return indice;
}

/**
 * Título com frases que se revezam, uma de cada vez: a atual sai para cima e a próxima entra
 * de baixo. Todas ocupam a mesma célula do grid, então a altura é a da frase mais longa e a
 * página não pula na troca. Leitores de tela ouvem só a primeira frase, sem anúncio a cada troca.
 */
export function FrasesRotativas({ frases, indice, className }: { frases: string[]; indice: number; className?: string }) {
    return (
        <h1 className={className}>
            <span className="sr-only">{frases[0]}</span>
            <span aria-hidden="true" className="grid overflow-hidden">
                {frases.map((frase, i) => {
                    const ativa = i === indice;
                    const anterior = i === (indice - 1 + frases.length) % frases.length;
                    return (
                        <motion.span
                            key={frase}
                            initial={false}
                            animate={{ opacity: ativa ? 1 : 0, y: ativa ? "0%" : anterior ? "-60%" : "60%" }}
                            transition={{ duration: anterior || ativa ? 0.45 : 0, ease: [0.22, 1, 0.36, 1] }}
                            className={cx("col-start-1 row-start-1", !ativa && "pointer-events-none")}
                        >
                            {frase}
                        </motion.span>
                    );
                })}
            </span>
        </h1>
    );
}
