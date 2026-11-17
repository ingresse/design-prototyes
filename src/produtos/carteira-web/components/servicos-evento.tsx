import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronRight, XClose } from "@untitledui/icons";
import { cx } from "@/utils/cx";
import meepSimbolo from "../assets/meep-simbolo.png";
import type { ServicoEvento } from "../data/eventos";

/** Destino de cada serviço: a página da oferta em Serviços adicionais. */
const SERVICOS: Record<ServicoEvento, { titulo: string; apoio: string; simbolo: string; link: string }> = {
    meep: {
        titulo: "Consumo antecipado Meep",
        apoio: "Chegue com saldo pra comer e beber",
        simbolo: meepSimbolo,
        link: "/novos-negocios/servicos-adicionais/meep",
    },
};

/* A versão fixa tem uma sombra para cima, que separa a seção dos ingressos que rolam por baixo. */

/**
 * Serviços ligados ao evento, depois dos ingressos (o ingresso continua sendo o primeiro conteúdo).
 * Cada serviço é uma linha inteira clicável que abre a oferta na mesma vista (desktop ou celular). No desktop segue o tamanho dos
 * acordeões de ingresso; no celular, o dos cards de ingresso. Só aparece em eventos com serviço
 * ligado e nunca em eventos que já aconteceram. Com `fixo` (celular), começa grudada no rodapé da
 * área de rolagem: a lista de ingressos rola por baixo e o serviço fica sempre à vista. O X fecha
 * a versão fixa e a seção passa para o fim da lista de ingressos; ao recarregar a página, volta a ficar fixa.
 * Quando o evento tem banner, a linha do serviço usa um recorte dele (a faixa das montanhas, sem
 * texto do pôster), escurecido à esquerda, com o texto em branco; a seção fica no fundo cinza.
 * No desktop (a pessoa não usa o ingresso pelo computador), vem antes da lista de ingressos, no
 * fundo cinza da página, e a linha do serviço usa um recorte do banner do evento (texto em branco),
 * sem fixar e sem X.
 */
export function ServicosEvento({
    servicos,
    fundo,
    finalizado,
    desktop,
    fixo: podeFixar,
}: {
    servicos?: ServicoEvento[];
    /** Banner do evento (imagem), desfocado atrás da versão fixa. */
    fundo?: string;
    finalizado?: boolean;
    desktop?: boolean;
    fixo?: boolean;
}) {
    const navigate = useNavigate();
    const [fechado, setFechado] = useState(false);
    if (!servicos?.length || finalizado) return null;
    const fixo = podeFixar && !fechado;
    // Banner do evento desfocado no fundo: na versão fixa do celular e no card do desktop
    const ehImagem = !!fundo && /^(https?:|\/|data:)/.test(fundo);
    // Desktop e celular: fundo cinza na seção e recorte do banner dentro da própria linha do serviço
    const linhaComBanner = ehImagem;

    const fechar = () => {
        setFechado(true);
    };

    return (
        <section
            className={cx(
                "flex flex-col",
                desktop ? "gap-4" : "gap-3",
                fixo && "sticky bottom-0 z-10 gap-2 bg-secondary shadow-[0_-8px_24px_-12px_rgba(10,13,18,0.18)] px-5 pt-3 pb-4",
                fixo && "border-t border-secondary",
                podeFixar && !fixo && "px-5 pb-6",
            )}
        >
            <div className="flex items-center justify-between gap-2">
                <h3 className={cx("text-primary", desktop ? "text-md font-semibold" : "text-sm font-semibold")}>Prepare seu rolê</h3>
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
            {servicos.map((id) => {
                const s = SERVICOS[id];
                return (
                    <button
                        key={id}
                        type="button"
                        onClick={() => navigate(`${s.link}?vista=${desktop ? "desktop" : "mobile"}`)}
                        className={cx(
                            "group flex w-full items-center gap-4 rounded-2xl text-left ring-1 outline-focus-ring transition duration-100 ease-linear focus-visible:outline-2 focus-visible:outline-offset-2",
                            linhaComBanner
                                ? cx("relative isolate overflow-hidden bg-black ring-black/10", desktop ? "p-6 hover:-translate-y-0.5 hover:shadow-lg" : "gap-3 p-4 active:opacity-90")
                                : cx("bg-primary ring-border-secondary", desktop ? "p-6 hover:bg-primary_hover" : "gap-3 p-4 active:bg-secondary"),
                        )}
                    >
                        {/* Desktop: recorte do banner do evento na linha, escurecido à esquerda para o texto em branco */}
                        {linhaComBanner && (
                            <>
                                <img src={fundo} alt="" aria-hidden="true" className="absolute inset-0 -z-10 size-full object-cover object-[center_68%] transition duration-300 ease-out group-hover:scale-105" />
                                <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/55 to-black/15" />
                            </>
                        )}
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary ring-1 ring-secondary ring-inset">
                            <img src={s.simbolo} alt="" aria-hidden="true" className="size-8" />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className={cx("font-bold", desktop ? "text-md" : "text-sm", linhaComBanner ? "text-white" : "text-primary")}>{s.titulo}</span>
                            <span className={cx("text-sm", linhaComBanner ? "text-white/80" : "text-tertiary")}>{s.apoio}</span>
                        </span>
                        <ChevronRight className={cx("size-5 shrink-0", linhaComBanner ? "text-white/80" : "text-fg-quaternary")} aria-hidden="true" />
                    </button>
                );
            })}
        </section>
    );
}
