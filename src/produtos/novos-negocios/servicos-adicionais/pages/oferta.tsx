import { useEffect } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router";
import { ArrowLeft } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { useForceLightTheme } from "../../utils/use-force-light-theme";
import { CardEvento, TopoEvento } from "../components/contexto-evento";
import { MosaicoOferta, useBrilho } from "../components/mosaico-oferta";
import { OfertaServico } from "../components/oferta-servico";
import { FundoPagina } from "../components/fundo-pagina";
import { Topo, TopoComImagem } from "../components/topo";
import { SERVICOS, type ServicoId } from "../data/servicos";

/**
 * Página de oferta individual — destino do link enviado por push, WhatsApp ou e-mail.
 * /novos-negocios/servicos-adicionais/uber · /novos-negocios/servicos-adicionais/meep
 */
export function Oferta() {
    useForceLightTheme();
    const { servico: id } = useParams();
    const servico = SERVICOS[id as ServicoId];
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const doChecklist = params.get("de") === "checklist";
    // Um brilho só para todas as cópias do mosaico (desktop, topo do mobile e faixa do header)
    const brilho = useBrilho();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [id]);

    if (!servico) return <Navigate to="/novos-negocios/servicos-adicionais" replace />;

    return (
        <FundoPagina className="lg:bg-primary lg:pb-16">
            {/* Mobile: header vazado sobre o mosaico (ou a imagem do evento, quando o serviço é de um
                evento); o card da oferta desliza por cima */}
            {servico.evento ? (
                <TopoComImagem>
                    <TopoEvento />
                </TopoComImagem>
            ) : (
                <TopoComImagem>
                    <MosaicoOferta brilho={brilho} topo />
                </TopoComImagem>
            )}
            <div className="hidden lg:block">
                <Topo comEvento={false} />
            </div>
            {/* Desktop: quem veio do hub vê o "Voltar" logo abaixo do header, alinhado à margem da página */}
            {doChecklist && (
                <div className="mx-auto hidden w-full max-w-[1264px] px-6 pt-6 lg:block">
                    <Button size="sm" color="link-gray" iconLeading={ArrowLeft} onClick={() => navigate("/novos-negocios/servicos-adicionais/checklist")}>
                        Voltar
                    </Button>
                </div>
            )}
            {/* Desktop: mosaico de fotos à esquerda e conteúdo da oferta (sem moldura de card) à direita, centralizados na vertical */}
            {/* Mobile: -208px = RECUO_CARD_MOBILE do topo (o card começa 24px sobre a foto) */}
            <main className={`relative z-10 mx-auto -mt-[208px] grid w-full max-w-[1264px] grid-cols-1 items-start px-0 lg:mt-0 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-6 ${doChecklist ? "lg:pt-8" : "lg:pt-16"}`}>
                {/* key: trocar de serviço reinicia a seleção */}
                <OfertaServico key={servico.id} servico={servico} />
                <div className={`hidden w-full justify-self-center lg:order-first lg:block ${servico.evento ? "max-w-[400px]" : "max-w-[480px]"}`}>
                    {/* Serviço de um evento (Meep): o card do evento no lugar do mosaico */}
                    {servico.evento ? <CardEvento /> : <MosaicoOferta brilho={brilho} />}
                </div>
            </main>
        </FundoPagina>
    );
}
