import { HelpCircle } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import { definirPainelAberto, usePainelVisivel } from "../data/visibilidade";

/** Botão "Guia" da barra do topo: abre e fecha o painel do guia de configuração, em qualquer tela (GDC-60). */
export function BotaoDoGuia() {
    const aberto = usePainelVisivel();
    return (
        <Button
            size="sm"
            // Sem borda: tertiary, como o sino ao lado (BKS-82).
            color="tertiary"
            iconLeading={HelpCircle}
            aria-expanded={aberto}
            onClick={() => definirPainelAberto(!aberto)}
            className={cx(aberto && "bg-active")}
        >
            Guia
        </Button>
    );
}
