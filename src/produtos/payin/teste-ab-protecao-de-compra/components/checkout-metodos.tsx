import { toast } from "sonner";
import chevron from "../assets/ic-chevron-down.svg";
import clickToPay from "../assets/ic-clicktopay.svg";
import credito from "../assets/ic-creditcard.svg";
import debito from "../assets/ic-debit.svg";
import google from "../assets/ic-google.png";
import pix from "../assets/ic-pix.svg";

const METODOS = [
    { id: "pix", nome: "Pix", icone: pix },
    { id: "credito", nome: "Cartão de crédito", icone: credito },
    { id: "debito", nome: "Cartão de débito", icone: debito },
    { id: "google-pay", nome: "Google Pay", icone: google },
    { id: "click-to-pay", nome: "Click To Pay", icone: clickToPay },
];

/** "Escolha como pagar": os meios de pagamento ficam fechados; o pagamento em si não faz parte deste teste. */
export function CheckoutMetodos() {
    return (
        <section aria-labelledby="titulo-pagamento" className="flex flex-col gap-3.5">
            <h2 id="titulo-pagamento" className="text-md font-bold text-primary">
                Escolha como pagar
            </h2>
            <ul className="flex flex-col gap-4">
                {METODOS.map(({ id, nome, icone }) => (
                    <li key={id}>
                        <button
                            type="button"
                            onClick={() => toast(`${nome} não faz parte deste protótipo`, { description: "O teste termina na escolha da proteção." })}
                            className="flex w-full items-center justify-between rounded-2xl border border-tertiary bg-primary px-4 py-3 text-left shadow-[0_0_2px_rgba(0,0,0,0.05),0_0_5px_rgba(0,0,0,0.07)] transition duration-100 ease-linear hover:bg-primary_hover"
                        >
                            <span className="flex items-center gap-3">
                                <span className="flex size-8 items-center justify-center rounded-full border border-secondary">
                                    <img src={icone} alt="" className="size-[18px]" />
                                </span>
                                <span className="text-sm font-medium text-primary">{nome}</span>
                            </span>
                            <img src={chevron} alt="" />
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );
}
