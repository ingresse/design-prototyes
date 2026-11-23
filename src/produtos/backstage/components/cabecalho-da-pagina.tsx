import type { ReactNode } from "react";
import { ArrowLeft } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import { TITULO_PAGINA } from "./titulo-pagina";

/*
 * Cabeçalho de página do Backstage (BKS-100 a BKS-105), o único: voltar, título, subtítulo e ações.
 *
 * - Voltar: texto com seta, terciário md, acima do título (16 px), com a seta alinhada à primeira letra
 *   do título. O rótulo diz para onde vai ("Pedidos", "Ajustes"), nunca só "Voltar" nem só o ícone.
 * - Título: a escala de título de página (TITULO_PAGINA). Selo opcional ao lado (ex.: status).
 * - Subtítulo: md, terciário, 4 px abaixo do título.
 * - Ações: abaixo do título (e do subtítulo), à esquerda, no desktop e no celular. O canto direito da
 *   linha do título é do sino e do Guia (BKS-92).
 */

export interface VoltarDaPagina {
    /** Nome da tela de destino. */
    rotulo: string;
    href?: string;
    onClick?: () => void;
    /** Quando o rótulo sozinho não basta para leitor de tela (ex.: "Voltar para segmentos"). */
    ariaLabel?: string;
}

export function CabecalhoDaPagina({
    voltar,
    titulo,
    subtitulo,
    selo,
    seloNoPe,
    acoes,
    className,
}: {
    voltar?: VoltarDaPagina;
    titulo: ReactNode;
    subtitulo?: ReactNode;
    selo?: ReactNode;
    /** O selo fica na mesma linha do título, à direita e alinhado ao pé dele, sem quebrar linha (ITM-150). */
    seloNoPe?: boolean;
    acoes?: ReactNode;
    className?: string;
}) {
    return (
        <header className={cx("flex flex-col items-start gap-4", className)}>
            {voltar && (
                <Button
                    color="tertiary"
                    size="md"
                    iconLeading={ArrowLeft}
                    // Com endereço é link; com ação é botão. Passar `href` vazio faria do botão um link sem destino.
                    {...(voltar.href ? { href: voltar.href } : { onClick: voltar.onClick })}
                    aria-label={voltar.ariaLabel}
                    className="-ml-3"
                >
                    {voltar.rotulo}
                </Button>
            )}
            {/* Ações abaixo do título, à esquerda, quebrando linha quando não cabem (BKS-104). */}
            <div className="flex w-full flex-col gap-4">
                <div className="flex min-w-0 flex-col gap-1">
                    <div
                        data-linha-do-titulo
                        // Com o voltar acima, o título fica abaixo da linha do sino e do Guia: o selo no pé vai até a borda direita.
                        className={cx("flex min-w-0 gap-x-3 gap-y-2", seloNoPe ? "items-end justify-between" : "flex-wrap items-center", seloNoPe && voltar && "md:!pr-0")}
                    >
                        <h1 className={cx(TITULO_PAGINA, "min-w-0 break-words", seloNoPe && "flex-1")}>{titulo}</h1>
                        {selo && seloNoPe ? <div className="shrink-0">{selo}</div> : selo}
                    </div>
                    {subtitulo && <p className="text-md text-tertiary">{subtitulo}</p>}
                </div>
                {acoes && <div className="flex max-w-full flex-wrap items-center gap-3">{acoes}</div>}
            </div>
        </header>
    );
}
