import type { ReactNode } from "react";
import { motion } from "motion/react";
import { useTransicao } from "@/components/foundations/transicao";

/**
 * Item de lista que entra e sai deslizando a altura e muda de lugar animado (reordenar).
 * Usar dentro de `<AnimatePresence initial={false}>`. Com redução de movimento, só fade (UI-VIS-008).
 */
export const ItemAnimado = ({ children, className, as = "li" }: { children: ReactNode; className?: string; as?: "li" | "div" }) => {
    const transition = useTransicao();
    const Comp = as === "li" ? motion.li : motion.div;
    return (
        <Comp
            layout="position"
            // Corta só durante a animação; depois o anel de foco dos campos não fica cortado.
            initial={{ height: 0, opacity: 0, overflow: "hidden" }}
            animate={{ height: "auto", opacity: 1, transitionEnd: { overflow: "visible" } }}
            exit={{ height: 0, opacity: 0, overflow: "hidden" }}
            transition={transition}
            className={className}
        >
            {children}
        </Comp>
    );
};
