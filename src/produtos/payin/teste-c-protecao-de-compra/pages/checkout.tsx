import { useState } from "react";
import { Navigate } from "react-router";
import { AvisoSemProtecao } from "../components/aviso-sem-protecao";
import { CheckoutMetodos } from "../components/checkout-metodos";
import { CheckoutResumo } from "../components/checkout-resumo";
import { CheckoutTitulo, CheckoutTopo } from "../components/checkout-topo";
import { ModalProtecao } from "../components/modal-protecao";
import { usePedido } from "../data/pedido-store";
import { useForceLightTheme } from "../utils/use-force-light-theme";

/**
 * Teste C de proteção de compra (novo modal v.5): /payin/teste-c-protecao-de-compra/checkout.
 * O modal de proteção abre sobre o checkout e só sai com uma das duas escolhas; a resposta atualiza o resumo do pedido.
 */
export function Checkout() {
    useForceLightTheme();
    const { protecao, escolherProtecao, qtdIngressos } = usePedido();
    // Modal reaberto pelo nome "Proteção de compra" no resumo; a escolha atual vale até o comprador decidir de novo
    const [revendoProtecao, setRevendoProtecao] = useState(false);

    // A jornada sempre começa na seleção: checkout sem pedido (URL direta ou página recarregada) volta para lá
    if (qtdIngressos === 0) return <Navigate to="/payin/teste-c-protecao-de-compra" replace />;

    return (
        <div className="min-h-screen bg-secondary font-['Elza'] text-primary">
            <CheckoutTopo />

            <main className="mx-auto flex max-w-[1156px] flex-col gap-6 px-4 pt-4 pb-16 xl:px-0">
                <CheckoutTitulo />
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_448px] lg:items-start">
                    <div className="lg:order-2">
                        <CheckoutResumo onRevisarProtecao={() => setRevendoProtecao(true)} />
                    </div>
                    <div className="min-w-0">
                        <AvisoSemProtecao />
                        <CheckoutMetodos />
                    </div>
                </div>
            </main>

            <ModalProtecao
                aberto={protecao === null || revendoProtecao}
                onEscolher={(com) => {
                    escolherProtecao(com ? "com" : "sem");
                    setRevendoProtecao(false);
                }}
            />
        </div>
    );
}
