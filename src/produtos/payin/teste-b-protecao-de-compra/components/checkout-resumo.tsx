import { useEffect, useRef, useState } from "react";
import { ShieldTick } from "@untitledui/icons";
import { AnimatePresence, animate, motion, useReducedMotion } from "motion/react";
import { cx } from "@/utils/cx";
import capa from "../assets/capa-evento.png";
import chevronUp from "../assets/ic-chevron-up.svg";
import info from "../assets/ic-info.svg";
import { EVENTO, INGRESSO_POR_ID, brl } from "../data/evento";
import { usePedido } from "../data/pedido-store";

const Divisor = () => <hr className="border-t border-secondary" />;

/** Pequena espera para o bloco da oferta trocar de estado antes de o resumo animar. */
const ATRASO_MODAL = 0.15;
const SAIDA_SUAVE = [0.22, 1, 0.36, 1] as const;

/** Valor em reais que "conta" até o novo número quando muda (ex.: total ao aceitar ou recusar a proteção). */
function ValorAnimado({ valor }: { valor: number }) {
    const semMovimento = useReducedMotion();
    const [exibido, setExibido] = useState(valor);
    const anterior = useRef(valor);

    useEffect(() => {
        const de = anterior.current;
        anterior.current = valor;
        if (de === valor) return;
        if (semMovimento) {
            setExibido(valor);
            return;
        }
        const controle = animate(de, valor, { duration: 0.7, delay: ATRASO_MODAL, ease: SAIDA_SUAVE, onUpdate: setExibido });
        return () => controle.stop();
    }, [valor, semMovimento]);

    return (
        <>
            <span aria-hidden="true" className="tabular-nums">
                {brl(exibido)}
            </span>
            <span className="sr-only">{brl(valor)}</span>
        </>
    );
}

/** Resumo do pedido no checkout. A linha "Proteção de compra" (sem título de seção) só aparece depois que o comprador aceita a proteção, com uma animação de confirmação; o nome é clicável e abre as coberturas. */
export function CheckoutResumo({ onRevisarProtecao }: { onRevisarProtecao: () => void }) {
    const { selecionados, protecao, valorProtecao, taxas, taxaServico, taxaProcessamento, total } = usePedido();
    const [detalhes, setDetalhes] = useState(true);
    const semMovimento = useReducedMotion();
    const nomeProtecao = (
        <button
            type="button"
            aria-haspopup="dialog"
            onClick={onRevisarProtecao}
            className="rounded-xs tracking-[0.28px] underline [text-underline-position:from-font] outline-focus-ring transition duration-100 ease-linear hover:text-secondary_hover focus-visible:outline-2 focus-visible:outline-offset-2"
        >
            Proteção de compra
        </button>
    );

    return (
        <aside className="flex flex-col gap-4 rounded-2xl bg-primary px-4 py-5 shadow-[0_0_4px_rgba(0,0,0,0.05),0_0_10px_rgba(0,0,0,0.07)]">
            <div className="flex items-center gap-4">
                <img src={capa} alt="" className="size-20 rounded-lg object-cover" />
                <p className="flex-1 text-md font-bold text-primary">{EVENTO.nome}</p>
            </div>

            <Divisor />

            <section className="flex flex-col gap-2">
                <h2 className="text-md font-bold text-primary">Itens</h2>
                <ul className="flex flex-col gap-2">
                    {selecionados.map(([id, qtd]) => {
                        const ing = INGRESSO_POR_ID[id];
                        return (
                            <li key={id} className="flex items-start justify-between gap-2 text-sm text-secondary">
                                <span className="tracking-[0.28px]">
                                    <span className="font-semibold tracking-normal text-primary">{qtd}</span>&nbsp;&nbsp;{ing.setor} {ing.nome}
                                    <br />
                                    {EVENTO.dataResumo}
                                </span>
                                <span className="shrink-0 tabular-nums">{brl(ing.preco * qtd)}</span>
                            </li>
                        );
                    })}
                </ul>
            </section>

            {/* Ao aceitar a proteção: a linha abre no resumo, pisca em verde, o escudo "carimba" e o total conta até o novo valor */}
            <AnimatePresence initial={false}>
                {protecao === "com" && (
                    <motion.div
                        key="protecao"
                        className="flex flex-col gap-4 overflow-hidden"
                        initial={{ height: 0, opacity: 0, marginTop: -16 }}
                        animate={{ height: "auto", opacity: 1, marginTop: 0 }}
                        exit={{ height: 0, opacity: 0, marginTop: -16 }}
                        transition={semMovimento ? { duration: 0 } : { duration: 0.4, delay: ATRASO_MODAL, ease: SAIDA_SUAVE }}
                    >
                        <Divisor />
                        <p className="relative flex items-center justify-between text-sm text-secondary">
                            {!semMovimento && (
                                <motion.span
                                    aria-hidden="true"
                                    className="pointer-events-none absolute -inset-x-2 -inset-y-1.5 rounded-md bg-utility-green-50"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: [0, 1, 1, 0] }}
                                    transition={{ duration: 1.6, delay: ATRASO_MODAL + 0.15, times: [0, 0.15, 0.6, 1], ease: "easeOut" }}
                                />
                            )}
                            <span className="relative flex items-center gap-1.5">
                                <motion.span
                                    aria-hidden="true"
                                    className="flex"
                                    initial={semMovimento ? false : { scale: 0, rotate: -20 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: "spring", stiffness: 420, damping: 14, delay: ATRASO_MODAL + 0.3 }}
                                >
                                    <ShieldTick className="size-4 text-utility-green-600" />
                                </motion.span>
                                {nomeProtecao}
                            </span>
                            <span className="relative tabular-nums">{brl(valorProtecao)}</span>
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            <Divisor />

            <section className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-md font-bold text-primary">
                        Taxas
                        <img src={info} alt="" />
                    </h2>
                    <span className="text-sm text-secondary tabular-nums">{brl(taxas)}</span>
                </div>
                <button
                    type="button"
                    aria-expanded={detalhes}
                    onClick={() => setDetalhes((d) => !d)}
                    className="flex items-start gap-2 self-start text-sm leading-4 tracking-[0.28px] text-secondary"
                >
                    {detalhes ? "Ocultar detalhes" : "Ver detalhes"}
                    <img src={chevronUp} alt="" className={cx("transition-transform duration-150 ease-out", !detalhes && "rotate-180")} />
                </button>
                {detalhes && (
                    <dl className="ml-2 flex flex-col border-l border-secondary pl-1.5 text-sm text-secondary">
                        <div className="flex justify-between gap-1">
                            <dt>Taxa de serviço</dt>
                            <dd className="tabular-nums">{brl(taxaServico)}</dd>
                        </div>
                        <div className="flex justify-between gap-1">
                            <dt>Taxa de processamento</dt>
                            <dd className="tabular-nums">{brl(taxaProcessamento)}</dd>
                        </div>
                    </dl>
                )}
            </section>

            <Divisor />

            <p className="flex items-center justify-between text-md font-bold text-primary">
                Total do pedido
                <span>
                    <ValorAnimado valor={total} />
                </span>
            </p>
        </aside>
    );
}
