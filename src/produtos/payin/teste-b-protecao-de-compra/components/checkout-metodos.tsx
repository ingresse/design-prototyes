import { toast } from "sonner";
import { cx } from "@/utils/cx";
import chevron from "../assets/ic-chevron-down.svg";
import clickToPay from "../assets/ic-clicktopay.svg";
import credito from "../assets/ic-creditcard.svg";
import debito from "../assets/ic-debit.svg";
import google from "../assets/ic-google.png";
import pix from "../assets/ic-pix.svg";

const METODOS = [
    { id: "pix", nome: "Pix", icone: pix, selo: "Aprovação imediata" },
    { id: "credito", nome: "Cartão de crédito", icone: credito },
    { id: "debito", nome: "Cartão de débito", icone: debito },
    { id: "google-pay", nome: "Google Pay", icone: google },
    { id: "click-to-pay", nome: "Click To Pay", icone: clickToPay },
];

/**
 * "Escolha como pagar": enquanto o comprador não responde à oferta de proteção, os meios ficam travados (esmaecidos).
 * Depois da escolha eles liberam, mas não abrem: o pagamento em si não faz parte deste teste.
 */
export function CheckoutMetodos({ bloqueado }: { bloqueado: boolean }) {
    return (
        <section aria-labelledby="titulo-pagamento" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
                <h2 id="titulo-pagamento" className="text-md font-bold text-primary">
                    Escolha como pagar
                </h2>
                {bloqueado && (
                    <p id="aviso-pagamento" className="text-sm leading-[1.4] text-secondary">
                        Escolha uma das opções de proteção acima para liberar o pagamento.
                    </p>
                )}
            </div>
            <ul className="flex flex-col gap-4">
                {METODOS.map(({ id, nome, icone, selo }) => (
                    <li key={id} className="relative">
                        <button
                            type="button"
                            disabled={bloqueado}
                            aria-describedby={bloqueado ? "aviso-pagamento" : undefined}
                            onClick={() => toast(`${nome} não faz parte deste protótipo`, { description: "O teste termina na escolha da proteção." })}
                            className={cx(
                                "flex w-full items-center justify-between rounded-2xl bg-primary px-4 py-3 text-left shadow-[0_0_2px_rgba(0,0,0,0.05),0_0_5px_rgba(0,0,0,0.07)] transition duration-200 ease-out hover:bg-primary_hover disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary",
                                selo && "border border-[#dcdee1]",
                            )}
                        >
                            <span className="flex items-center gap-3">
                                <span className="flex size-8 items-center justify-center rounded-full border border-secondary">
                                    <img src={icone} alt="" className="size-[18px]" />
                                </span>
                                <span className="text-sm font-medium text-primary">{nome}</span>
                            </span>
                            <img src={chevron} alt="" />
                        </button>
                        {selo && (
                            <span
                                className={cx(
                                    "absolute -top-2.5 right-2 rounded-3xl bg-[#16a34a] px-2 py-0.5 text-xs leading-4 font-medium tracking-[0.24px] text-white transition duration-200 ease-out",
                                    bloqueado && "opacity-50",
                                )}
                            >
                                {selo}
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        </section>
    );
}
