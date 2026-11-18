import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { MotionConfig, motion } from "motion/react";
import { useForceLightTheme } from "../../utils/use-force-light-theme";
import { ChecklistServicos, preencher } from "../components/checklist-servicos";
import { Compartilhar, PreviaTexto } from "../components/compartilhar-oferta";
import { CardEvento, TopoEvento } from "../components/contexto-evento";
import { FundoPagina } from "../components/fundo-pagina";
import { Topo, TopoComImagem } from "../components/topo";
import { HUBS, HUB_PADRAO, ROLE, textoDoEvento, type Evento } from "../data/servicos";
import { escolherHub } from "../utils/contratados";

/**
 * Prepare seu rolê — /novos-negocios/servicos-adicionais/checklist
 * Os serviços de um evento (o "ver todos" a partir do ingresso), na estrutura das ofertas de
 * evento: no desktop, o card do evento (pôster, local e data) à esquerda e o conteúdo à direita;
 * no mobile, a imagem do evento no topo e o card da página sobe por cima. O título e a legenda
 * celebram o ingresso garantido e convidam a descobrir; os serviços vêm pelo momento do dia.
 */
export function Checklist() {
    useForceLightTheme();
    const [params] = useSearchParams();
    // Hub do evento pedido pelo atalho da Carteira (?evento=gop-tun), ou o último aberto nesta sessão
    const hub = escolherHub(params.get("evento"), Object.keys(HUBS), HUB_PADRAO);
    const { evento, servicos } = HUBS[hub];
    const titulo = preencher(ROLE.titulo, undefined, evento);
    // O link compartilhado abre o hub deste evento, sem outras marcações
    const link = `${window.location.origin}${window.location.pathname}?evento=${hub}`;
    const compartilhar = {
        rotulo: ROLE.compartilhar.rotulo,
        titulo: textoDoEvento(ROLE.compartilhar.titulo, evento),
        legenda: textoDoEvento(ROLE.compartilhar.legenda, evento),
        mensagem: textoDoEvento(ROLE.compartilhar.mensagem, evento),
    };

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <MotionConfig reducedMotion="user">
            <FundoPagina className="lg:bg-primary lg:pb-16">
                <TopoComImagem>
                    <TopoEvento contagem evento={evento} />
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
                            {/* Compartilhar à direita do título, discreto como nas ofertas (SAD-08) */}
                            <div className="flex w-full items-start justify-between gap-4">
                                <h1 className="text-display-xs font-bold text-primary sm:text-display-sm">
                                    {/* O emoji fica preso à última palavra: nunca quebra sozinho numa linha */}
                                    {titulo.slice(0, titulo.lastIndexOf(" ") + 1)}
                                    <span className="whitespace-nowrap">
                                        {titulo.slice(titulo.lastIndexOf(" ") + 1)} <span aria-hidden="true">{ROLE.emoji}</span>
                                    </span>
                                </h1>
                                <Compartilhar
                                    textos={compartilhar}
                                    url={link}
                                    className="mt-1 shrink-0"
                                    previa={
                                        <>
                                            <MiniaturaEvento evento={evento} />
                                            <PreviaTexto titulo={`${titulo} ${ROLE.emoji}`} url={link} />
                                        </>
                                    }
                                />
                            </div>
                            <p className="text-md text-tertiary sm:text-lg">{preencher(ROLE.apoio, undefined, evento)}</p>
                        </motion.header>
                        <ChecklistServicos evento={evento} servicos={servicos} />
                    </div>

                    {/* Desktop: o card do evento à esquerda, como nas ofertas de evento */}
                    <div className="hidden w-full max-w-[400px] justify-self-center lg:order-first lg:block">
                        <CardEvento contagem evento={evento} />
                    </div>
                </main>
            </FundoPagina>
        </MotionConfig>
    );
}

/** Miniatura do pôster na prévia do link (ou o degradê do evento, sem pôster). */
function MiniaturaEvento({ evento }: { evento: Evento }) {
    return evento.poster ? (
        <img src={evento.poster} alt="" className="h-12 w-9 shrink-0 rounded-md object-cover" />
    ) : (
        <span aria-hidden="true" className="h-12 w-9 shrink-0 rounded-md" style={{ background: evento.fundo }} />
    );
}
