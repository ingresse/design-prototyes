import type { ReactNode } from "react";
import { HelpCircle } from "@untitledui/icons";
import { Tooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";

/*
 * Tooltip do DS com o título legível no tema escuro.
 * Lacuna do DS: no escuro o fundo do Tooltip fica claro e o título continua `text-white` (some).
 * O título recebe o token do fundo da página, que inverte junto com o tooltip.
 */
export const tituloDeTooltip = (texto: ReactNode) => <span className="font-medium text-bg-primary">{texto}</span>;

/** Ícone de ajuda com a definição curta de um termo (glossário dos ajustes v3). */
export const Dica = ({ termo, texto }: { termo: string; texto: string }) => (
    <Tooltip title={tituloDeTooltip(texto)} delay={0} closeDelay={0} arrow>
        <TooltipTrigger aria-label={`O que é ${termo}`} className="flex cursor-pointer rounded-full text-fg-quaternary transition duration-100 ease-linear hover:text-fg-quaternary_hover">
            <HelpCircle className="size-4" aria-hidden="true" />
        </TooltipTrigger>
    </Tooltip>
);
