import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronRight, XClose } from "@untitledui/icons";
import { cx } from "@/utils/cx";
import meepSimbolo from "../../assets/meep-simbolo.png";
import type { ServicoEvento } from "../data/eventos";

/** Destino de cada serviço: a página da oferta em Serviços adicionais. */
const SERVICOS: Record<ServicoEvento, { titulo: string; apoio: string; simbolo: string; link: string }> = {
    meep: {
        titulo: "Consumo antecipado Meep",
        apoio: "Chegue com saldo pra comer e beber",
        simbolo: meepSimbolo,
        // O app é celular: a oferta abre já na vista mobile do protótipo
        link: "/novos-negocios/servicos-adicionais/meep?vista=mobile",
    },
};

/**
 * A seção fixa fica grudada logo acima da tab bar do app (79px). Nesta página, o padding de baixo
 * da área de rolagem é a altura exata da tab bar (ver pages/Ingressos.tsx), então ela gruda no
 * rodapé dessa área e continua colada na tab bar até o fim da rolagem, sem abrir espaço.
 */
const ALTURA_TAB_BAR = "bottom-0";

/* A versão fixa tem uma sombra para cima, que separa a seção dos ingressos que rolam por baixo. */

/**
 * Serviços ligados ao evento. Começa fixa logo acima da tab bar, no fundo cinza: a lista de
 * ingressos rola por baixo dela, então o serviço fica sempre à vista, por mais ingressos que o
 * evento tenha. O X fecha a versão fixa e a seção passa a ficar no fim da lista de ingressos (a
 * pessoa não é obrigada a ver o serviço o tempo todo). Ao recarregar a página, volta a ficar fixa.
 * Cada serviço é uma linha inteira clicável que abre a oferta; quando o evento tem banner, a linha
 * usa um recorte dele (a faixa das montanhas, sem texto do pôster), escurecido à esquerda, com o
 * texto em branco — como no desktop da carteira web.
 */
export function ServicosEvento({ servicos, fundo }: { servicos?: ServicoEvento[]; fundo?: string }) {
    const navigate = useNavigate();
    const [fixo, setFixo] = useState(true);
    if (!servicos?.length) return null;

    const fechar = () => {
        setFixo(false);
    };
    // Recorte do banner do evento dentro da linha do serviço (só quando o evento tem imagem)
    const comBanner = !!fundo && /^(https?:|\/|data:)/.test(fundo);

    return (
        <section className={cx("px-5", fixo ? `sticky ${ALTURA_TAB_BAR} z-10 border-t border-secondary bg-secondary shadow-[0_-8px_24px_-12px_rgba(10,13,18,0.18)] pt-3 pb-4` : "pb-6")}>
            <div className={cx("flex items-center justify-between gap-2", fixo ? "pb-2" : "pb-3")}>
                <h2 className="text-sm font-semibold text-primary">Prepare seu rolê</h2>
                {fixo && (
                    <button
                        type="button"
                        aria-label="Fechar e mostrar no fim dos ingressos"
                        onClick={fechar}
                        className="-my-1 flex size-8 items-center justify-center rounded-full text-fg-quaternary outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover focus-visible:outline-2 active:bg-tertiary"
                    >
                        <XClose className="size-5" aria-hidden="true" />
                    </button>
                )}
            </div>
            <div className="flex flex-col gap-3">
                {servicos.map((id) => {
                    const s = SERVICOS[id];
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => navigate(s.link)}
                            className={cx(
                                "flex items-center gap-3 rounded-2xl p-4 text-left ring-1 outline-focus-ring transition duration-100 ease-linear focus-visible:outline-2 focus-visible:outline-offset-2",
                                comBanner ? "relative isolate overflow-hidden bg-black ring-black/10 active:opacity-90" : "bg-primary ring-border-secondary active:bg-secondary",
                            )}
                        >
                            {comBanner && (
                                <>
                                    <img src={fundo} alt="" aria-hidden="true" className="absolute inset-0 -z-10 size-full object-cover object-[center_68%]" />
                                    <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/55 to-black/15" />
                                </>
                            )}
                            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary ring-1 ring-secondary ring-inset">
                                <img src={s.simbolo} alt="" aria-hidden="true" className="size-8" />
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span className={cx("text-sm font-bold", comBanner ? "text-white" : "text-primary")}>{s.titulo}</span>
                                <span className={cx("text-sm", comBanner ? "text-white/80" : "text-tertiary")}>{s.apoio}</span>
                            </span>
                            <ChevronRight className={cx("size-5 shrink-0", comBanner ? "text-white/80" : "text-fg-quaternary")} aria-hidden="true" />
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
