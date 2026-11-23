import { useLayoutEffect, useRef, useState, type FC, type ReactNode } from "react";
import { Button as AriaButton } from "react-aria-components";
import { cx } from "@/utils/cx";

/** Altura do campo fechado, raio dos cantos e raio dos recortes laterais, em px. */
const ALTURA = 88;
const CANTO = 12;
const RECORTE = 10;

/** Contorno de ingresso em px: cantos arredondados e um recorte em meia-lua no meio de cada lado. */
function contornoDeIngresso(l: number, a: number) {
    const m = a / 2;
    return [
        `M${CANTO} 0.75`,
        `H${l - CANTO}`,
        `A${CANTO} ${CANTO} 0 0 1 ${l - 0.75} ${CANTO}`,
        `V${m - RECORTE}`,
        `A${RECORTE} ${RECORTE} 0 0 0 ${l - 0.75} ${m + RECORTE}`,
        `V${a - CANTO}`,
        `A${CANTO} ${CANTO} 0 0 1 ${l - CANTO} ${a - 0.75}`,
        `H${CANTO}`,
        `A${CANTO} ${CANTO} 0 0 1 0.75 ${a - CANTO}`,
        `V${m + RECORTE}`,
        `A${RECORTE} ${RECORTE} 0 0 0 0.75 ${m - RECORTE}`,
        `V${CANTO}`,
        `A${CANTO} ${CANTO} 0 0 1 ${CANTO} 0.75`,
        "Z",
    ].join(" ");
}

/** Contorno retangular em px, com os mesmos cantos: o do grupo, para não se confundir com o ingresso. */
function contornoRetangular(l: number, a: number) {
    return [
        `M${CANTO} 0.75`,
        `H${l - CANTO}`,
        `A${CANTO} ${CANTO} 0 0 1 ${l - 0.75} ${CANTO}`,
        `V${a - CANTO}`,
        `A${CANTO} ${CANTO} 0 0 1 ${l - CANTO} ${a - 0.75}`,
        `H${CANTO}`,
        `A${CANTO} ${CANTO} 0 0 1 0.75 ${a - CANTO}`,
        `V${CANTO}`,
        `A${CANTO} ${CANTO} 0 0 1 ${CANTO} 0.75`,
        "Z",
    ].join(" ");
}

/** Ingresso (com os recortes) para criar ingresso; retângulo para criar grupo (ITM-130). */
export type Formato = "ingresso" | "retangulo";

/**
 * Desenha o contorno de ingresso atrás do conteúdo. Mede a própria camada (que cobre o pai inteiro),
 * então os recortes ficam redondos em qualquer largura e altura. Medir a si mesma evita depender da
 * ref do pai, que ainda não existe quando o efeito do filho roda.
 */
function Contorno({ className, tracejado, formato = "ingresso" }: { className: string; tracejado?: boolean; formato?: Formato }) {
    const ref = useRef<HTMLSpanElement>(null);
    const [tamanho, setTamanho] = useState({ l: 0, a: 0 });
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const medir = () => {
            const r = el.getBoundingClientRect();
            setTamanho({ l: r.width, a: r.height });
        };
        medir();
        const observador = new ResizeObserver(medir);
        observador.observe(el);
        return () => observador.disconnect();
    }, []);
    return (
        <span ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0">
            {tamanho.l > 0 && tamanho.a > 0 && (
                <svg width={tamanho.l} height={tamanho.a} className="absolute inset-0">
                    <path
                        d={(formato === "retangulo" ? contornoRetangular : contornoDeIngresso)(tamanho.l, tamanho.a)}
                        className={cx("transition duration-100 ease-linear", className)}
                        strokeWidth="1.5"
                        strokeDasharray={tracejado ? "0.5 5" : undefined}
                        strokeLinecap="round"
                    />
                </svg>
            )}
        </span>
    );
}

/**
 * Campo em formato de ingresso (ITM-130): largura toda, fundo transparente, borda pontilhada com os
 * recortes laterais de um ingresso e o rótulo no centro, com a cara do botão terciário. O campo
 * inteiro é o botão: no hover o ingresso ganha o fundo de hover, a borda escurece e o rótulo acende.
 */
export function CampoDeIngresso({
    children,
    icone: Icone,
    dica,
    onPress,
    className,
    altura = ALTURA,
    formato = "ingresso",
    alinhamento = "centro",
    ...dados
}: {
    /** "inicio": o rótulo começa onde começa o nome do nível dele; o recuo vem no className (ITM-134). */
    alinhamento?: "centro" | "inicio";
    children: ReactNode;
    /** "retangulo" no criar grupo, para diferenciar do criar ingresso. */
    formato?: Formato;
    /** Altura do campo, em px (88 na sessão; menor no grupo). "preencher": ocupa a altura da linha da grade de cards, com 76 px no mínimo (ITM-152). */
    altura?: number | "preencher";
    icone?: FC<{ className?: string }>;
    /** Atributos data-* (ex.: para devolver o foco a este campo). */
    [dado: `data-${string}`]: string | undefined;
    /** Texto de apoio abaixo do rótulo. */
    dica?: string;
    onPress: () => void;
    className?: string;
}) {
    return (
        <AriaButton
            {...dados}
            onPress={onPress}
            className={cx(
                "group relative flex w-full cursor-pointer items-center rounded-xl",
                alinhamento === "centro" ? "justify-center" : "justify-start",
                "outline-brand focus-visible:outline-2 focus-visible:outline-offset-2",
                className,
            )}
            style={altura === "preencher" ? { height: "100%", minHeight: 76 } : { height: altura }}
        >
            <Contorno
                tracejado
                formato={formato}
                className="fill-transparent stroke-border-primary group-hover:fill-bg-primary_hover group-hover:stroke-fg-quaternary group-data-pressed:fill-bg-secondary"
            />
            <span className={cx("relative flex flex-col gap-1.5", alinhamento === "centro" ? "items-center px-4 text-center" : "items-start text-left")}>
                {/* Mesma tipografia e cores do botão terciário md do DS. */}
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-tertiary transition duration-100 ease-linear group-hover:text-tertiary_hover">
                    {Icone && <Icone className="size-5 shrink-0 text-fg-quaternary transition duration-100 ease-linear group-hover:text-fg-quaternary_hover" />}
                    {children}
                </span>
                {dica && <span className="text-sm text-quaternary">{dica}</span>}
            </span>
        </AriaButton>
    );
}

/**
 * O mesmo campo, aberto (ITM-131): mesmo formato (retângulo no grupo, ingresso no ingresso) e fundo transparente, com a borda em linha
 * contínua no lugar da pontilhada e o conteúdo (a criação rápida do grupo) dentro. A altura acompanha o conteúdo; os recortes ficam no meio dela.
 */
export function IngressoAberto({ children, className, formato = "ingresso" }: { children: ReactNode; className?: string; formato?: Formato }) {
    return (
        // Mesmo recuo do cabeçalho do cartão do grupo, para o texto não saltar ao trocar um pelo outro.
        <div className={cx("relative w-full px-5 py-5 md:px-6", className)} style={{ minHeight: ALTURA }}>
            <Contorno formato={formato} className="fill-transparent stroke-border-primary" />
            <div className="relative">{children}</div>
        </div>
    );
}
