import { useEffect, useState } from "react";
import bandeira from "../assets/brazil.svg";
import capa from "../assets/capa-evento.png";
import chevron from "../assets/ic-cs-chevrondown.svg";
import ajuda from "../assets/ic-help.svg";
import local from "../assets/ic-location.svg";
import cadeado from "../assets/ic-locked.svg";
import logomark from "../assets/logomark.svg";
import logotext from "../assets/logotext.svg";
import { EVENTO } from "../data/evento";

const ETAPAS = ["Ingressos", "Atribuição", "Pagamento"];

/** Cabeçalho do checkout: marca, etapas da compra e o evento (o bloco do evento só aparece no desktop). */
export function CheckoutTopo() {
    return (
        <header>
            <div className="flex h-11 items-center justify-center bg-primary-solid">
                <span className="flex items-start gap-1" role="img" aria-label="Ingresse">
                    <img src={logomark} alt="" />
                    <img src={logotext} alt="" />
                </span>
            </div>

            <div className="bg-primary py-4">
                <div className="mx-auto flex max-w-[1192px] flex-col gap-4 px-6 xl:px-0">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                        <ol className="flex items-center gap-2 text-sm text-quaternary">
                            {ETAPAS.map((etapa, i) => (
                                <li key={etapa} className="flex items-center gap-2">
                                    {i > 0 && <span aria-hidden="true">•</span>}
                                    {i === ETAPAS.length - 1 ? (
                                        <span aria-current="step" className="font-bold text-[#ff4a40]">
                                            {etapa}
                                        </span>
                                    ) : (
                                        etapa
                                    )}
                                </li>
                            ))}
                        </ol>
                        <div className="flex items-center gap-4">
                            <button type="button" className="flex h-6 items-center gap-2 rounded bg-[#fff1f0] px-3 text-xs font-medium text-[#ef4444]">
                                <img src={ajuda} alt="" />
                                Suporte
                            </button>
                            <button type="button" className="flex items-center gap-1 text-xs text-primary">
                                <img src={bandeira} alt="" />
                                <span className="w-[22px] text-center">PT</span>
                                <img src={chevron} alt="" />
                            </button>
                        </div>
                    </div>

                    <div className="hidden items-stretch gap-4 lg:flex">
                        <img src={capa} alt="" className="size-20 rounded-lg object-cover" />
                        <div className="flex flex-col justify-between">
                            <p className="text-md font-bold text-primary">{EVENTO.nome}</p>
                            <p className="flex items-center gap-1 text-sm text-secondary">
                                <img src={local} alt="" />
                                {EVENTO.local}
                            </p>
                            <p className="flex h-6 items-center gap-4 text-xs font-medium text-[#ff271a]">
                                <a href="#evento" onClick={(e) => e.preventDefault()}>
                                    Ver página do evento
                                </a>
                                <a href="#compartilhar" onClick={(e) => e.preventDefault()}>
                                    Compartilhar
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}

/** Nome do evento, selo de compra segura e o tempo restante da reserva (contagem a partir de 09m15s). */
export function CheckoutTitulo() {
    const [segundos, setSegundos] = useState(9 * 60 + 15);

    useEffect(() => {
        const id = setInterval(() => setSegundos((s) => Math.max(0, s - 1)), 1000);
        return () => clearInterval(id);
    }, []);

    const tempo = `${String(Math.floor(segundos / 60)).padStart(2, "0")}m${String(segundos % 60).padStart(2, "0")}s`;

    return (
        <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-0 lg:gap-2">
                <h1 className="text-xl font-bold text-primary">{EVENTO.nome}</h1>
                <p className="text-sm tracking-[0.28px] text-secondary tabular-nums lg:hidden">Tempo restante: {tempo}</p>
                <p className="flex h-5 items-center gap-2 text-xs text-[#666] max-lg:mt-1">
                    <img src={cadeado} alt="" />
                    Compra 100% segura
                </p>
            </div>
            <p className="hidden text-sm tracking-[0.28px] text-secondary tabular-nums lg:block">Tempo restante: {tempo}</p>
        </div>
    );
}
