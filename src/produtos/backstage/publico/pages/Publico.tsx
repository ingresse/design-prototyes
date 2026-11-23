import { Link } from "react-router";
import { ChevronRight } from "@untitledui/icons";
import { BackstageLayout } from "../../components/Backstage";
import { CabecalhoDaPagina } from "../../components/cabecalho-da-pagina";
import { CartaoDaTabela, LinhaDaTabela, TituloDaLinha } from "../../components/tabela";

const CARDS = [
    {
        id: "segmentacoes",
        titulo: "Segmentações",
        descricao: "Grupos de pessoas por idade ou documento, para limitar ingressos e benefícios.",
        href: "/backstage/publico/segmentacoes",
    },
    {
        id: "formulario",
        titulo: "Formulário de participação",
        descricao: "Revise os pedidos recebidos e aprove quem entra numa segmentação.",
        href: "/backstage/publico/formularios",
    },
];

/** Backstage → Público: as duas funcionalidades, numa lista no cartão comum (BKS-110, PUB-104). */
export function Publico() {
    return (
        <BackstageLayout showEventContext={false} showLayoutSwitcher={false} activeProducer="publico">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
                <CabecalhoDaPagina titulo="Público" />

                <CartaoDaTabela>
                    <ul className="flex flex-col divide-y divide-secondary">
                        {CARDS.map((card) => (
                            // O nome é o link e cobre a linha (BKS-113).
                            <LinhaDaTabela key={card.id} interativa className="relative items-center outline-focus-ring -outline-offset-2 has-[a:focus-visible]:outline-2">
                                <TituloDaLinha
                                    titulo={
                                        <Link to={card.href} className="outline-hidden after:absolute after:inset-0">
                                            {card.titulo}
                                        </Link>
                                    }
                                    apoio={<span className="whitespace-normal">{card.descricao}</span>}
                                />
                                <ChevronRight className="size-5 shrink-0 self-center text-fg-quaternary" aria-hidden="true" />
                            </LinhaDaTabela>
                        ))}
                    </ul>
                </CartaoDaTabela>
            </div>
        </BackstageLayout>
    );
}
