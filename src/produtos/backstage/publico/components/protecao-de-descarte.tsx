import { useEffect, useState } from "react";
import { ModalDeConfirmacao } from "../../components/modal-de-confirmacao";

/*
 * Fechar sem querer não perde o que foi escolhido ou digitado (PUB-108): com algo alterado, clicar fora
 * não fecha e Esc, "Cancelar" e o X perguntam antes de descartar. Sem alteração, fecha direto.
 */
export function useProtecaoDeDescarte({
    aberto,
    alterado,
    onFechar,
    titulo = "Descartar o que você preencheu?",
    descricao = "O que você escolheu ainda não foi salvo.",
}: {
    aberto: boolean;
    alterado: boolean;
    onFechar: () => void;
    titulo?: string;
    descricao?: string;
}) {
    const [perguntando, setPerguntando] = useState(false);
    useEffect(() => {
        if (!aberto) setPerguntando(false);
    }, [aberto]);

    const pedirParaFechar = () => (alterado ? setPerguntando(true) : onFechar());

    const confirmacao = (
        <ModalDeConfirmacao
            aberto={perguntando}
            titulo={titulo}
            descricao={descricao}
            cancelar="Continuar editando"
            confirmar="Descartar"
            destrutiva
            onConfirmar={() => {
                setPerguntando(false);
                onFechar();
            }}
            onFechar={() => setPerguntando(false)}
        />
    );

    return { pedirParaFechar, isDismissable: !alterado, confirmacao };
}
