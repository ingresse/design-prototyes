import { useEffect, useRef, type CSSProperties } from "react";
import { useForceLightTheme } from "../../utils/use-force-light-theme";
import { ChecklistServicos } from "../components/checklist-servicos";
import { FrasesRotativas, useRotacaoFrases } from "../components/frases-rotativas";
import { FundoPagina } from "../components/fundo-pagina";
import { CORES_BRILHO, FundoVidro } from "../components/painel-checklist";
import { Topo, TopoComImagem, recuoCardMobile } from "../components/topo";
import { useCantosDoCard } from "../utils/use-cantos-do-card";

/** Altura do topo de vidro do mobile (header + frase + respiro do card que sobe). */
const ALTURA_TOPO_MOBILE = 260;

/** Frases do título, exibidas uma de cada vez. */
const FRASES = ["Viva o evento", "Prepare tudo", "Aproveite mais", "Experiência completa", "Seu rolê começa aqui"];

/**
 * Checklist do rolê — /novos-negocios/servicos-adicionais/checklist
 * Desktop: sem banner — frases rotativas em vermelho à esquerda, centralizadas na altura;
 * legenda e linha do tempo à direita.
 * Mobile: o topo é o fundo de vidro (brilhos coloridos atrás do header vazado) com as frases em
 * branco; os brilhos trocam de cor junto com a frase. O conteúdo vem num card branco
 * arredondado que sobe por cima do topo ao rolar.
 */
export function Checklist() {
    useForceLightTheme();
    const card = useRef<HTMLDivElement>(null);
    useCantosDoCard(card);
    // Um índice só para as frases (mobile e desktop) e a cor do fundo de vidro
    const indice = useRotacaoFrases(FRASES.length);
    const cor = CORES_BRILHO[indice % CORES_BRILHO.length];

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <FundoPagina className="lg:bg-primary">
            <TopoComImagem altura={ALTURA_TOPO_MOBILE} faixa={<FundoVidro cor={cor} />}>
                <FundoVidro cor={cor}>
                    <div className="flex h-full flex-col justify-end px-4 pt-24 pb-12">
                        <FrasesRotativas frases={FRASES} indice={indice} className="text-display-md font-bold" />
                    </div>
                </FundoVidro>
            </TopoComImagem>
            <div className="hidden lg:block">
                <Topo comEvento={false} />
            </div>

            <main
                style={{ "--recuo": `${recuoCardMobile(ALTURA_TOPO_MOBILE)}px` } as CSSProperties}
                className="relative z-10 mx-auto -mt-[var(--recuo)] grid w-full max-w-[1264px] grid-cols-1 items-start lg:mt-0 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-6 lg:pt-16 lg:pb-16"
            >
                {/* Mobile: card branco arredondado por cima do topo; desktop: coluna sem moldura */}
                <div
                    ref={card}
                    className="min-h-[calc(100dvh-72px)] rounded-t-3xl bg-primary px-4 pt-8 pb-10 lg:min-h-0 lg:rounded-none lg:bg-transparent lg:p-0"
                >
                    <p className="mb-8 text-display-xs font-bold text-primary sm:text-display-sm lg:mb-10">Encontre serviços e benefícios disponíveis para o seu evento</p>
                    <ChecklistServicos />
                </div>

                {/* Desktop: só as frases à esquerda, centralizadas na altura do conteúdo */}
                <div className="hidden lg:order-first lg:block">
                    <FrasesRotativas frases={FRASES} indice={indice} className="text-display-lg font-bold text-brand-secondary" />
                </div>
            </main>
        </FundoPagina>
    );
}
