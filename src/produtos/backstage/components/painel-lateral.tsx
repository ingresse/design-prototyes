import { type ReactNode, useEffect, useId, useState } from "react";
import { Heading as AriaHeading } from "react-aria-components";
import { Dialog, Modal, ModalOverlay } from "@/components/application/slideout-menus/slideout-menu";
import { CloseButton } from "@/components/base/buttons/close-button";
import { ModalDeConfirmacao } from "./modal-de-confirmacao";

/*
 * Painel lateral com título em português (E9, como SEG-64): as peças do slideout do DS montadas aqui,
 * porque o SlideoutMenu pronto fixa "Slideout menu" e "Close". O painel se chama pelo título e o X é
 * "Fechar". No celular ocupa a tela (UI-NAV-003).
 *
 * `useProtecaoDoPreenchido`: com algo preenchido, clicar fora não fecha e Esc, X e "Cancelar"
 * perguntam antes de descartar (UI-NAV-002). Sem alteração, fecha direto.
 */

export function PainelLateral({
    titulo,
    subtitulo,
    aoFechar,
    fechaClicandoFora = true,
    largura = "md:max-w-[640px]",
    children,
}: {
    titulo: string;
    subtitulo?: ReactNode;
    /** Esc, o X e o fundo chamam isto (passe o `pedirParaFechar` da proteção quando houver). */
    aoFechar: () => void;
    fechaClicandoFora?: boolean;
    largura?: string;
    /** Conteúdo e rodapé (use `SlideoutMenu.Content` e `SlideoutMenu.Footer`). */
    children: ReactNode;
}) {
    const tituloId = useId();
    return (
        // O painel é controlado: Esc e o fundo só pedem para fechar (a proteção do preenchido decide).
        <ModalOverlay isOpen isDismissable={fechaClicandoFora} onOpenChange={(v) => !v && aoFechar()} className="z-50 pl-0">
            <Modal className={largura}>
                <Dialog aria-label={undefined} aria-labelledby={tituloId} className="gap-0">
                    <header className="relative z-1 flex w-full flex-col gap-1 px-4 pt-6 pb-4 md:px-6">
                        <AriaHeading id={tituloId} className="pr-8 text-lg font-semibold text-primary">
                            {titulo}
                        </AriaHeading>
                        {subtitulo && <div className="pr-8 text-sm text-tertiary">{subtitulo}</div>}
                        <CloseButton size="sm" label="Fechar" className="absolute top-3 right-3 shrink-0" onPress={aoFechar} />
                    </header>
                    {children}
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}

export function useProtecaoDoPreenchido({
    alterado,
    onFechar,
    titulo = "Descartar o que você preencheu?",
    descricao = "O que você preencheu ainda não foi salvo.",
    avisarAoRecarregar = true,
}: {
    alterado: boolean;
    onFechar: () => void;
    titulo?: string;
    descricao?: string;
    /** Rascunho guardado (ex.: na sessão) volta sozinho: aí recarregar não precisa perguntar. */
    avisarAoRecarregar?: boolean;
}) {
    const [perguntando, setPerguntando] = useState(false);

    // Fechar a aba ou recarregar com algo preenchido: o navegador pergunta antes.
    useEffect(() => {
        if (!alterado || !avisarAoRecarregar) return;
        const segurar = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener("beforeunload", segurar);
        return () => window.removeEventListener("beforeunload", segurar);
    }, [alterado, avisarAoRecarregar]);

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

    return { pedirParaFechar, fechaClicandoFora: !alterado, confirmacao };
}
