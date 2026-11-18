import { useEffect } from "react";
import { MotionConfig, motion } from "motion/react";
import { useForceLightTheme } from "../../utils/use-force-light-theme";
import { ChecklistServicos, preencher } from "../components/checklist-servicos";
import { CardEvento, TopoEvento } from "../components/contexto-evento";
import { FundoPagina } from "../components/fundo-pagina";
import { Topo, TopoComImagem } from "../components/topo";
import { ROLE } from "../data/servicos";

/**
 * Prepare seu rolê — /novos-negocios/servicos-adicionais/checklist
 * Os serviços de um evento (o "ver todos" a partir do ingresso), na estrutura das ofertas de
 * evento: no desktop, o card do evento (pôster, local e data) à esquerda e o conteúdo à direita;
 * no mobile, a imagem do evento no topo e o card da página sobe por cima. O título e a legenda
 * celebram o ingresso garantido e convidam a descobrir; os serviços vêm pelo momento do dia.
 */
export function Checklist() {
    useForceLightTheme();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <MotionConfig reducedMotion="user">
            <FundoPagina className="lg:bg-primary lg:pb-16">
                <TopoComImagem>
                    <TopoEvento contagem />
                </TopoComImagem>
                <div className="hidden lg:block">
                    <Topo comEvento={false} />
                </div>

                {/* Mobile: -208px = RECUO_CARD_MOBILE do topo (o card começa 24px sobre a imagem) */}
                <main className="relative z-10 mx-auto -mt-[208px] grid w-full max-w-[1264px] grid-cols-1 items-start lg:mt-0 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-6 lg:pt-16">
                    <div className="min-h-[calc(100dvh-72px)] rounded-t-3xl bg-primary px-4 pt-8 pb-10 lg:min-h-0 lg:rounded-none lg:bg-transparent lg:p-0">
                        <motion.header
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, ease: "easeOut" }}
                            className="mb-8 flex flex-col items-start gap-3"
                        >
                            <h1 className="text-display-xs font-bold text-primary sm:text-display-sm">
                                {preencher(ROLE.titulo)} <span aria-hidden="true">{ROLE.emoji}</span>
                            </h1>
                            <p className="text-md text-tertiary sm:text-lg">{preencher(ROLE.apoio)}</p>
                        </motion.header>
                        <ChecklistServicos />
                    </div>

                    {/* Desktop: o card do evento à esquerda, como nas ofertas de evento */}
                    <div className="hidden w-full max-w-[400px] justify-self-center lg:order-first lg:block">
                        <CardEvento contagem />
                    </div>
                </main>
            </FundoPagina>
        </MotionConfig>
    );
}
