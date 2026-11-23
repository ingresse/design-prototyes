import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { mover } from "./Alca";

/** Distância da borda da janela, em px, em que arrastar rola a página. */
const BORDA_QUE_ROLA = 80;
const PASSO_DA_ROLAGEM = 12;

/**
 * Arrastar para reordenar numa grade de cards (ITM-152). O `Reorder` do motion só ordena num eixo; na grade,
 * o card sob o ponteiro troca de lugar com o arrastado na hora, e soltar grava. O card sob o ponteiro é achado
 * pela posição de layout (`offsetLeft` e `offsetTop`, relativas à grade), que não muda durante a animação de
 * posição: assim dois cards não ficam trocando de lugar enquanto deslizam. Perto da borda da janela, a página rola.
 *
 * A grade precisa de `position: relative` (é o `offsetParent` dos cards) e cada card, de `data-item-da-grade`
 * com o id dele.
 */
export function useArrastarNaGrade<T>({
    itens,
    id,
    onReordenar,
    onSoltar,
}: {
    itens: T[];
    id: (item: T) => string;
    onReordenar: (prox: T[]) => void;
    onSoltar: () => void;
}) {
    const grade = useRef<HTMLUListElement>(null);
    const [arrastando, setArrastando] = useState<string | null>(null);
    // Os callbacks mudam a cada render; o arrasto em andamento usa sempre os mais novos.
    const atual = useRef({ itens, id, onReordenar, onSoltar });
    atual.current = { itens, id, onReordenar, onSoltar };
    const encerrar = useRef<(() => void) | null>(null);
    useEffect(() => () => encerrar.current?.(), []);

    const iniciar = (itemId: string) => (e: ReactPointerEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        setArrastando(itemId);
        // Mão fechada em toda a página enquanto arrasta: sem isso, o cursor volta ao de link ou de texto ao passar por cima de outro card.
        const cursor = document.createElement("style");
        cursor.textContent = "*{cursor:grabbing!important}";
        document.head.appendChild(cursor);

        const aoMover = (ev: PointerEvent) => {
            const el = grade.current;
            if (!el) return;
            if (ev.clientY < BORDA_QUE_ROLA) window.scrollBy({ top: -PASSO_DA_ROLAGEM });
            else if (ev.clientY > window.innerHeight - BORDA_QUE_ROLA) window.scrollBy({ top: PASSO_DA_ROLAGEM });
            const caixa = el.getBoundingClientRect();
            const x = ev.clientX - caixa.left;
            const y = ev.clientY - caixa.top;
            const sob = [...el.querySelectorAll<HTMLElement>(":scope > [data-item-da-grade]")].find(
                (c) => x >= c.offsetLeft && x <= c.offsetLeft + c.offsetWidth && y >= c.offsetTop && y <= c.offsetTop + c.offsetHeight,
            );
            const alvo = sob?.dataset.itemDaGrade;
            if (!alvo || alvo === itemId) return;
            const { itens: lista, id: idDe, onReordenar: reordenar } = atual.current;
            const de = lista.findIndex((i) => idDe(i) === itemId);
            const para = lista.findIndex((i) => idDe(i) === alvo);
            if (de < 0 || para < 0) return;
            reordenar(mover(lista, de, para));
        };
        const aoSoltar = () => {
            parar();
            atual.current.onSoltar();
        };
        const parar = () => {
            window.removeEventListener("pointermove", aoMover);
            window.removeEventListener("pointerup", aoSoltar);
            window.removeEventListener("pointercancel", aoSoltar);
            cursor.remove();
            encerrar.current = null;
            setArrastando(null);
        };
        window.addEventListener("pointermove", aoMover);
        window.addEventListener("pointerup", aoSoltar);
        window.addEventListener("pointercancel", aoSoltar);
        encerrar.current = parar;
    };

    return { grade, arrastando, iniciar };
}
