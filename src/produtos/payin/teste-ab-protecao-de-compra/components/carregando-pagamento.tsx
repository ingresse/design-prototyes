import circulo from "../assets/loading-circle.svg";

/**
 * Carregamento entre o "Continuar" da seleção e o checkout: cobre a tela inteira (fundo escurecido e desfocado)
 * com um cartão escuro central. Enquanto aparece, nada atrás dele recebe clique.
 */
export function CarregandoPagamento() {
    return (
        <div
            role="alertdialog"
            aria-modal="true"
            aria-busy="true"
            aria-label="Preparando seu pagamento"
            className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/70 px-4 font-['Elza'] backdrop-blur-[8px] duration-200 ease-out animate-in fade-in motion-reduce:animate-none"
        >
            <div className="flex flex-col items-center gap-4 rounded-2xl bg-[#181818] px-10 py-8 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
                <img src={circulo} alt="" className="animate-spin motion-reduce:animate-none" />
                <p className="text-center text-lg leading-[1.4] font-semibold text-white">Preparando seu pagamento…</p>
            </div>
        </div>
    );
}
