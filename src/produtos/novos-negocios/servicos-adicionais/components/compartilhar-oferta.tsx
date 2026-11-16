import { useRef, useState, type PointerEvent } from "react";
import { Dialog as AriaDialog, Heading as AriaHeading, Modal as AriaModal, ModalOverlay as AriaModalOverlay } from "react-aria-components";
import { Check, Copy01, Share07, XClose } from "@untitledui/icons";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { cx } from "@/utils/cx";
import type { Servico } from "../data/servicos";
import { MetodoPagamento } from "./metodos-pagamento";
import { SeloServico } from "./selo-servico";

/**
 * Compartilhar a oferta: botão discreto só com ícone, na linha da marca (o fim da página fica
 * só com o CTA). Abre um modal no desktop e um bottom sheet no mobile, com a prévia do que vai
 * ser compartilhado e duas opções: enviar no WhatsApp e copiar o link.
 * Tooltip no botão só no desktop: no mobile não há hover.
 */
export function CompartilharOferta({ servico }: { servico: Servico }) {
    const [aberto, setAberto] = useState(false);
    if (!servico.compartilhar) return null;
    const { rotulo } = servico.compartilhar;

    return (
        <>
            {/* Desktop: com tooltip no hover */}
            <ButtonUtility size="sm" color="secondary" icon={Share07} tooltip={rotulo} onClick={() => setAberto(true)} className="hidden lg:inline-flex" />
            {/* Mobile: sem tooltip; o rótulo fica para leitores de tela */}
            <ButtonUtility size="sm" color="secondary" icon={Share07} aria-label={rotulo} onClick={() => setAberto(true)} className="lg:hidden" />

            <AriaModalOverlay
                isOpen={aberto}
                onOpenChange={setAberto}
                isDismissable
                className={({ isEntering, isExiting }) =>
                    cx(
                        // Mobile: preso embaixo (bottom sheet); desktop: centralizado (modal)
                        "fixed inset-0 z-50 flex items-end justify-center bg-overlay/70 backdrop-blur-[6px] lg:items-center lg:p-8",
                        isEntering && "duration-200 ease-out animate-in fade-in motion-reduce:animate-none",
                        isExiting && "duration-200 ease-in animate-out fade-out motion-reduce:animate-none",
                    )
                }
            >
                <AriaModal
                    className={({ isEntering, isExiting }) =>
                        cx(
                            "w-full outline-hidden lg:max-w-[440px]",
                            isEntering && "duration-300 ease-out animate-in slide-in-from-bottom lg:duration-200 lg:zoom-in-95 lg:slide-in-from-bottom-0 motion-reduce:animate-none",
                            isExiting && "duration-200 ease-in animate-out slide-out-to-bottom lg:zoom-out-95 lg:slide-out-to-bottom-0 motion-reduce:animate-none",
                        )
                    }
                >
                    <AriaDialog className="outline-hidden">
                        {({ close }) => <Conteudo servico={servico} fechar={close} />}
                    </AriaDialog>
                </AriaModal>
            </AriaModalOverlay>
        </>
    );
}

function Conteudo({ servico, fechar }: { servico: Servico; fechar: () => void }) {
    const { titulo, legenda, mensagem } = servico.compartilhar!;
    const [copiado, setCopiado] = useState(false);
    // O link é o da oferta, sem marcações de origem (ex.: ?de=checklist)
    const url = window.location.href.split("?")[0];

    const whatsapp = () => window.open(`https://wa.me/?text=${encodeURIComponent(`${mensagem} ${url}`)}`, "_blank", "noopener");
    const copiar = () => {
        navigator.clipboard?.writeText(url).catch(() => {});
        setCopiado(true);
        window.setTimeout(() => setCopiado(false), 2000);
    };

    // Mobile: arrastar a alça para baixo fecha o bottom sheet (mais de 80px); menos que isso, volta
    const folha = useRef<HTMLDivElement>(null);
    const inicio = useRef<number | null>(null);
    const mover = (dy: number, animado = false) => {
        if (!folha.current) return;
        folha.current.style.transition = animado ? "transform 200ms ease-out" : "none";
        folha.current.style.transform = dy > 0 ? `translateY(${dy}px)` : "";
    };
    const aoPressionar = (e: PointerEvent) => {
        inicio.current = e.clientY;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };
    const aoArrastar = (e: PointerEvent) => inicio.current != null && mover(e.clientY - inicio.current);
    const aoSoltar = (e: PointerEvent) => {
        if (inicio.current == null) return;
        const dy = e.clientY - inicio.current;
        inicio.current = null;
        if (dy > 80) fechar();
        else mover(0, true);
    };

    return (
        <div ref={folha} className="flex flex-col gap-5 rounded-t-2xl bg-primary px-4 pb-[max(24px,env(safe-area-inset-bottom))] shadow-xl lg:rounded-2xl lg:p-6">
            {/* Mobile: alça do bottom sheet — arrastar para baixo fecha. A área de toque é maior que a barrinha */}
            <div
                aria-hidden="true"
                onPointerDown={aoPressionar}
                onPointerMove={aoArrastar}
                onPointerUp={aoSoltar}
                onPointerCancel={aoSoltar}
                className="-mb-3 flex h-6 cursor-grab touch-none items-end justify-center lg:hidden"
            >
                <span className="h-1 w-10 rounded-full bg-quaternary" />
            </div>

            <div className="flex items-start gap-3">
                <div className="flex flex-1 flex-col gap-1">
                    <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                        {titulo}
                    </AriaHeading>
                    <p className="text-md text-tertiary">{legenda}</p>
                </div>
                {/* Fechar visível só no desktop; no mobile fica só a alça (e o botão segue para leitores de tela) */}
                <button
                    type="button"
                    aria-label="Fechar"
                    onClick={fechar}
                    className="max-lg:sr-only -mr-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-quaternary outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover hover:text-fg-secondary focus-visible:outline-2"
                >
                    <XClose className="size-5" />
                </button>
            </div>

            {/* Prévia do que vai no link */}
            <div className="flex items-center gap-3 rounded-xl bg-secondary p-3">
                <SeloServico servico={servico} tamanho="sm" />
                <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold text-primary">{servico.titulo}</span>
                    <span className="truncate text-xs text-tertiary">{url.replace(/^https?:\/\//, "")}</span>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <MetodoPagamento
                    icone={<LogoWhatsapp />}
                    rotulo="Enviar no WhatsApp"
                    onPress={whatsapp}
                />
                <MetodoPagamento
                    icone={copiado ? <Check className="size-4 text-fg-success-primary" aria-hidden="true" /> : <Copy01 className="size-4 text-fg-secondary" aria-hidden="true" />}
                    rotulo={copiado ? "Link copiado!" : "Copiar link"}
                    onPress={copiar}
                />
            </div>
            <span role="status" className="sr-only">
                {copiado ? "Link copiado" : ""}
            </span>
        </div>
    );
}

/** Logo do WhatsApp, na cor oficial da marca. */
function LogoWhatsapp() {
    return (
        <svg viewBox="0 0 24 24" className="size-[18px]" fill="#25D366" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
        </svg>
    );
}
