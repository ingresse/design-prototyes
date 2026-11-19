import { useEffect, useRef, useState } from "react";
import { ChevronDown, Ticket01 } from "@untitledui/icons";
import { AnimatePresence, motion } from "motion/react";
import { cx } from "@/utils/cx";
import banner from "../assets/banner-evento.png";
import { EVENTO, brl } from "../data/evento";

export interface LinhaResumo {
    id: string;
    quantidade: number;
    titulo: string;
    subtitulo: string;
    valor: number;
}

interface PropsResumo {
    linhas: LinhaResumo[];
    total: number;
    qtdItens: number;
    onRemover: (id: string) => void;
    onRemoverTudo: () => void;
    onContinuar: () => void;
}

/**
 * "Resumo da compra" da seleção. Desktop: sem ingressos mostra o banner do evento; com ingressos, o card lateral.
 * Celular: barra fixa no rodapé que abre como gaveta. Aqui não há oferta de proteção: ela acontece no checkout.
 */
export function Resumo(props: PropsResumo) {
    return (
        <>
            <ResumoDesktop {...props} />
            <ResumoMobile {...props} />
        </>
    );
}

function ResumoDesktop({ linhas, total, onRemover, onRemoverTudo, onContinuar }: PropsResumo) {
    if (linhas.length === 0) {
        return <img src={banner} alt={`Banner do evento ${EVENTO.nome}`} className="hidden h-[440px] w-full rounded-2xl object-cover lg:block" />;
    }

    return (
        <aside className="hidden min-h-[440px] flex-col overflow-hidden rounded-2xl border border-primary bg-primary lg:flex">
            <h2 className="border-b border-secondary bg-secondary_subtle px-4 pt-3.5 pb-2.5 text-sm font-medium text-primary">Resumo da compra</h2>

            <div className="flex flex-1 flex-col gap-4 px-4 pb-4">
                <ListaItens linhas={linhas} onRemover={onRemover} onRemoverTudo={onRemoverTudo} />
            </div>

            <footer className="flex flex-col gap-4 border-t border-secondary p-4">
                <p className="flex items-start text-md text-primary">
                    <span className="flex-1 font-medium">Total</span>
                    <span className="font-bold tabular-nums">{brl(total)} + taxas</span>
                </p>
                <BotaoContinuar onClick={onContinuar} />
            </footer>
        </aside>
    );
}

function ResumoMobile({ linhas, total, qtdItens, onRemover, onRemoverTudo, onContinuar }: PropsResumo) {
    const [aberto, setAberto] = useState(false);
    const barraRef = useRef<HTMLDivElement>(null);
    const [altura, setAltura] = useState(0);
    const temItens = linhas.length > 0;

    // Reserva no fim da página a altura da barra fechada, para ela não cobrir o último setor
    useEffect(() => {
        const el = barraRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => {
            if (!aberto) setAltura(el.offsetHeight);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, [temItens, aberto]);

    useEffect(() => {
        if (!temItens) setAberto(false);
    }, [temItens]);

    return (
        <>
            {temItens && <div className="lg:hidden" style={{ height: altura }} aria-hidden="true" />}

            <AnimatePresence>
                {aberto && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={() => setAberto(false)}
                        className="fixed inset-0 z-40 bg-overlay/60 lg:hidden"
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {temItens && (
                    <motion.div
                        ref={barraRef}
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", stiffness: 320, damping: 34 }}
                        className="fixed inset-x-0 bottom-0 z-40 flex flex-col rounded-t-2xl bg-primary shadow-[0_-4px_24px_rgba(0,0,0,0.08)] lg:hidden"
                    >
                        <button
                            type="button"
                            onClick={() => setAberto((a) => !a)}
                            aria-expanded={aberto}
                            className="flex items-center justify-between gap-3 border-b border-secondary px-4 py-3 text-sm font-medium text-primary"
                        >
                            Resumo da compra
                            <ChevronDown className={cx("size-5 transition-transform duration-300", aberto && "rotate-180")} aria-hidden="true" />
                        </button>

                        <AnimatePresence initial={false}>
                            {aberto && (
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: "auto" }}
                                    exit={{ height: 0 }}
                                    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                                    className="overflow-hidden"
                                >
                                    <div className="flex max-h-[50vh] flex-col gap-4 overflow-y-auto border-b border-secondary px-4 pb-4">
                                        <ListaItens linhas={linhas} onRemover={onRemover} onRemoverTudo={onRemoverTudo} />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex flex-col gap-3 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
                            <p className="flex items-baseline justify-between gap-3">
                                <span className="flex items-baseline gap-1">
                                    <span className="text-md font-semibold text-primary tabular-nums">{brl(total)}</span>
                                    <span className="text-sm text-quaternary">+ taxas</span>
                                </span>
                                <span className="text-sm text-quaternary">
                                    {qtdItens} {qtdItens === 1 ? "item" : "itens"}
                                </span>
                            </p>
                            <BotaoContinuar onClick={onContinuar} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

function ListaItens({ linhas, onRemover, onRemoverTudo }: Pick<PropsResumo, "linhas" | "onRemover" | "onRemoverTudo">) {
    return (
        <>
            <div className="flex items-center gap-2 pt-3 pb-2">
                <span className="text-xs font-bold tracking-[0.24px] text-secondary">Itens</span>
                <span className="h-px flex-1 border-t border-dashed border-primary" />
                <button type="button" onClick={onRemoverTudo} className="text-xs tracking-[0.24px] text-primary underline underline-offset-2">
                    Remover itens
                </button>
            </div>

            <ul className="flex flex-col gap-4">
                {linhas.map(({ id, quantidade, titulo, subtitulo, valor }) => (
                    <li key={id} className="flex items-start gap-2">
                        <span className="flex w-10 shrink-0 items-center justify-center gap-0.5 rounded-xl bg-secondary text-sm font-bold text-primary tabular-nums">
                            {quantidade}
                            <Ticket01 className="size-[15px]" aria-hidden="true" />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="truncate text-sm font-bold text-primary">{titulo}</span>
                            <span className="text-sm text-primary">{subtitulo}</span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                            <span className="text-sm font-semibold text-primary tabular-nums">{brl(valor)}</span>
                            <button type="button" onClick={() => onRemover(id)} className="text-xs text-primary underline underline-offset-2">
                                Remover
                            </button>
                        </span>
                    </li>
                ))}
            </ul>
        </>
    );
}

/** CTA do carrinho no vermelho Ingresse (o tema global do protótipo pinta "brand" de cinza). */
function BotaoContinuar({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full rounded-lg bg-[#ff271a] px-4 py-2.5 text-md font-semibold text-white shadow-xs-skeuomorphic transition duration-100 ease-linear hover:bg-[#c81f14]"
        >
            Continuar
        </button>
    );
}
