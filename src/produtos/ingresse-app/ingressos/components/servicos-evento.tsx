import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronRight, XClose } from "@untitledui/icons";
import { cx } from "@/utils/cx";
import ingresseSimbolo from "../../assets/ingresse-simbolo.svg";
import type { ServicoEvento } from "../data/eventos";

type Destino = { titulo: string; apoio: string; rotulo?: string; comida?: boolean; link: (eventoId: string) => string };

/** Textos do atalho do hub por evento (copy: agente de Writing com ux-copy). */
const HUB: Record<string, { titulo: string; apoio: string; rotulo: string }> = {
    "gop-tun": {
        titulo: "Tem mais pra viver no Gop Tun",
        apoio: "Uber, fotos, seguro e mais",
        rotulo: "Tem mais pra viver no Gop Tun: Uber, fotos, seguro e mais. Abrir",
    },
};

/**
 * Destino de cada serviço: a oferta do consumo antecipado (Meep) ou o hub de serviços do evento, em Serviços adicionais.
 * O app é celular: abre já na vista mobile do protótipo.
 */
/** Atalho de cada caso: a oferta direta (evento com um serviço só) ou o hub (mais de um). */
const SERVICOS: Partial<Record<ServicoEvento | "hub", (eventoId: string) => Destino | null>> = {
    meep: () => ({
        titulo: "Chegue com saldo pra comer e beber",
        apoio: "Consumo antecipado no evento",
        comida: true,
        link: () => "/novos-negocios/servicos-adicionais/meep?vista=mobile",
    }),
    hub: (eventoId) =>
        HUB[eventoId] ? { ...HUB[eventoId], link: (id) => `/novos-negocios/servicos-adicionais/checklist?evento=${id}&vista=mobile` } : null,
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
export function ServicosEvento({ servicos, fundo, eventoId }: { servicos?: ServicoEvento[]; fundo?: string; eventoId: string }) {
    const navigate = useNavigate();
    const [fixo, setFixo] = useState(true);
    if (!servicos?.length) return null;

    const fechar = () => {
        setFixo(false);
    };
    // Recorte do banner do evento dentro da linha do serviço (só quando o evento tem imagem)
    const comBanner = !!fundo && /^(https?:|\/|data:)/.test(fundo);

    return (
        <section className={cx("px-5", fixo ? `sticky ${ALTURA_TAB_BAR} z-10 mt-auto border-t border-secondary bg-secondary shadow-[0_-8px_24px_-12px_rgba(10,13,18,0.18)] pt-3 pb-4` : "pb-6")}>
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
                {(servicos.length > 1 ? (["hub"] as const) : servicos).map((id) => {
                    const s = SERVICOS[id]?.(eventoId);
                    if (!s) return null;
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => navigate(s.link(eventoId))}
                            aria-label={s.rotulo}
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
                            {s.comida ? (
                                <SeloComida />
                            ) : (
                                // Hub: vários serviços, sem logo de parceiro — selo da Ingresse
                                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-solid">
                                    <img src={ingresseSimbolo} alt="" aria-hidden="true" className="size-7" />
                                </span>
                            )}
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

/** Selo do consumo antecipado: hambúrguer (Iconly Light), que diz pra que serve o saldo melhor que o logo da Meep. */
function SeloComida() {
    return (
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-utility-orange-600 text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-6">
                <path d="M18.6192 10.6693C19.7397 10.6693 20.5782 9.75839 20.3088 8.81516C19.3529 5.47612 15.8728 3 11.7266 3C7.58052 3 4.10043 5.47612 3.14446 8.81516C2.87511 9.75839 3.71354 10.6693 4.83406 10.6693H18.6192Z" />
                <path d="M17.211 21H6.78834C4.74809 21 3.09375 19.3457 3.09375 17.3054C3.09375 17.0194 3.32491 16.7882 3.61091 16.7882H20.3894C20.6744 16.7882 20.9055 17.0194 20.9055 17.3054C20.9055 19.3457 19.2512 21 17.211 21Z" />
                <path d="M3.09375 13.6686C3.55606 13.9938 3.98116 14.3425 4.89403 14.3425C6.61203 14.3425 6.61203 13.1152 8.33004 13.1152C10.049 13.1152 10.049 14.3425 11.7553 14.3425C13.4733 14.3425 13.4733 13.1152 15.1923 13.1152C16.9103 13.1152 16.9103 14.3425 18.6283 14.3425C19.4922 14.3425 19.927 14.0359 20.359 13.7293" />
                <path d="M11.8082 6.38704H11.7269" />
                <path d="M15.5768 7.79887H15.4955" />
                <path d="M8.04504 7.79887H7.96374" />
            </svg>
        </span>
    );
}
