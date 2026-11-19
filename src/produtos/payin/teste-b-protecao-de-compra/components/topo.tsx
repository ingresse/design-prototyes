import { ChevronDown, ChevronLeft, HelpCircle, Share01 } from "@untitledui/icons";
import { cx } from "@/utils/cx";
import bandeira from "../assets/brazil.svg";
import logo from "../assets/ingresse-logo-branco.svg";
import { EVENTO } from "../data/evento";

/** Topo da seleção de ingressos: faixa escura com logo e usuário; abaixo, o nome do evento e as ações. */
export function Topo() {
    return (
        <header>
            <div className="bg-primary-solid">
                <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-4 lg:px-9">
                    <img src={logo} alt="Ingresse" className="h-7" />
                    <button type="button" className="flex items-center gap-3 text-xs font-semibold text-white">
                        <span className="flex items-center gap-0.5">
                            <span className="max-sm:sr-only">Laricia Barbosa</span>
                            <ChevronDown className="size-4" aria-hidden="true" />
                        </span>
                        <img src={bandeira} alt="" className="size-5" />
                    </button>
                </div>
            </div>

            <div className="border-b border-secondary bg-primary">
                <div className="mx-auto flex h-[68px] max-w-[1440px] items-center gap-4 px-2 lg:px-4">
                    <button type="button" aria-label="Voltar" className="flex size-10 items-center justify-center rounded-lg text-fg-primary hover:bg-primary_hover">
                        <ChevronLeft className="size-5" aria-hidden="true" />
                    </button>
                    <h1 className="flex-1 text-md font-bold text-primary">{EVENTO.nome}</h1>
                    <div className="flex gap-2">
                        <BotaoContorno icone={Share01} somenteIconeNoMobile>
                            Compartilhar
                        </BotaoContorno>
                        <BotaoContorno icone={HelpCircle} somenteIconeNoMobile>
                            Preciso de ajuda
                        </BotaoContorno>
                    </div>
                </div>
            </div>
        </header>
    );
}

export function BotaoContorno({
    icone: Icone,
    children,
    somenteIconeNoMobile,
}: {
    icone?: typeof Share01;
    children: React.ReactNode;
    /** No celular o texto fica só para leitores de tela, para o nome do evento caber na barra. */
    somenteIconeNoMobile?: boolean;
}) {
    return (
        <button
            type="button"
            className="flex h-11 items-center gap-2 rounded-xl border border-primary bg-primary px-3 text-sm font-semibold text-secondary shadow-xs transition duration-100 ease-linear hover:bg-primary_hover"
        >
            <span className={cx(somenteIconeNoMobile && "sr-only sm:not-sr-only")}>{children}</span>
            {Icone && <Icone className="size-4" aria-hidden="true" />}
        </button>
    );
}
