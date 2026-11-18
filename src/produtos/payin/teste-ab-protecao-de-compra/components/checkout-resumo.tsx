import { useState } from "react";
import { cx } from "@/utils/cx";
import capa from "../assets/capa-evento.png";
import chevronUp from "../assets/ic-chevron-up.svg";
import info from "../assets/ic-info.svg";
import { EVENTO, INGRESSO_POR_ID, brl } from "../data/evento";
import { usePedido } from "../data/pedido-store";

const Divisor = () => <hr className="border-t border-secondary" />;

/** Resumo do pedido no checkout. A linha "Proteção de compra" (sem título de seção) só aparece depois que o comprador aceita a proteção no modal; o "Remover" ao lado tira a proteção do pedido. */
export function CheckoutResumo() {
    const { selecionados, protecao, valorProtecao, taxas, taxaServico, taxaProcessamento, total, escolherProtecao } = usePedido();
    const [detalhes, setDetalhes] = useState(true);

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

            {protecao === "com" && (
                <>
                    <Divisor />
                    <p className="flex items-center justify-between text-sm text-secondary">
                        <span className="flex items-center gap-1.5 tracking-[0.28px]">
                            Proteção de compra
                            <span aria-hidden="true" className="text-fg-quaternary">
                                •
                            </span>
                            <button
                                type="button"
                                aria-label="Remover proteção de compra"
                                onClick={() => escolherProtecao("sem")}
                                className="font-semibold tracking-normal text-tertiary transition duration-100 ease-linear hover:text-tertiary_hover"
                            >
                                Remover
                            </button>
                        </span>
                        <span className="tabular-nums">{brl(valorProtecao)}</span>
                    </p>
                </>
            )}

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
                <span className="tabular-nums">{brl(total)}</span>
            </p>
        </aside>
    );
}
