import { useState } from "react";
import { Navigate } from "react-router";
import { CheckoutMetodos } from "../components/checkout-metodos";
import { CheckoutResumo } from "../components/checkout-resumo";
import { CheckoutTitulo, CheckoutTopo } from "../components/checkout-topo";
import { ModalCoberturas } from "../components/modal-coberturas";
import { ProtecaoNarrativa } from "../components/protecao-narrativa";
import { usePedido } from "../data/pedido-store";
import { useForceLightTheme } from "../utils/use-force-light-theme";

/**
 * Teste B de proteção de compra: /payin/teste-b-protecao-de-compra/checkout.
 * A oferta de proteção fica dentro do checkout (gancho com perguntas em loop + oferta) e trava os meios de pagamento
 * até o comprador escolher; a resposta atualiza o resumo do pedido.
 */
export function Checkout() {
    useForceLightTheme();
    const { protecao, escolherProtecao, qtdIngressos } = usePedido();
    const [coberturasAbertas, setCoberturasAbertas] = useState(false);

    // A jornada sempre começa na seleção: checkout sem pedido (URL direta ou página recarregada) volta para lá
    if (qtdIngressos === 0) return <Navigate to="/payin/teste-b-protecao-de-compra" replace />;

    return (
        <div className="min-h-screen bg-secondary font-['Elza'] text-primary">
            <CheckoutTopo />

            <main className="mx-auto flex max-w-[1156px] flex-col gap-6 px-4 pt-5 pb-16 xl:px-0">
                <CheckoutTitulo />
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_448px] lg:items-start">
                    <div className="flex min-w-0 flex-col gap-6 lg:gap-3.5">
                        <ProtecaoNarrativa onVerCoberturas={() => setCoberturasAbertas(true)} />
                        <CheckoutMetodos bloqueado={protecao === null} />
                    </div>
                    <CheckoutResumo onRevisarProtecao={() => setCoberturasAbertas(true)} />
                </div>
            </main>

            <ModalCoberturas
                aberto={coberturasAbertas}
                onFechar={() => setCoberturasAbertas(false)}
                onEscolher={(com) => {
                    escolherProtecao(com ? "com" : "sem");
                    setCoberturasAbertas(false);
                }}
            />
        </div>
    );
}
