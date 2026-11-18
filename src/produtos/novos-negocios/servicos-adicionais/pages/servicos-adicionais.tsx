import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, ChevronRight } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { SeloServico } from "../components/selo-servico";
import { EVENTO, HUBS, HUB_PADRAO, INDIVIDUAIS, SERVICOS, servicoNoEvento } from "../data/servicos";

/**
 * Entrada do protótipo de Serviços adicionais (nome interno).
 * Cada card abre a oferta como ela abriria a partir de um push, WhatsApp ou e-mail.
 */
export function ServicosAdicionais() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-primary px-4 py-12 md:px-6">
            <div className="mx-auto w-full max-w-3xl">
                <Button size="sm" color="link-gray" iconLeading={ArrowLeft} onClick={() => navigate("/novos-negocios")}>
                    Novos negócios
                </Button>

                <h1 className="mt-5 text-3xl font-bold text-primary">Serviços adicionais</h1>

                <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
                    {INDIVIDUAIS.map((id) => {
                        // Ofertas das comunicações: textos do Festival Aurora
                        const s = servicoNoEvento(SERVICOS[id], EVENTO);
                        return (
                            <CartaoEntrada
                                key={id}
                                onPress={() => navigate(`/novos-negocios/servicos-adicionais/${id}`)}
                                selos={<SeloServico servico={s} tamanho="md" />}
                                titulo={`${s.parceiro} · ${s.categoria}`}
                                descricao={s.descricao}
                            />
                        );
                    })}
                    {/* Página com vários serviços: o hub do evento padrão (Gop Tun), com a capa dele */}
                    <CartaoEntrada
                        onPress={() => navigate(`/novos-negocios/servicos-adicionais/checklist?evento=${HUB_PADRAO}`)}
                        imagem={HUBS[HUB_PADRAO].evento.poster}
                        selos={
                            <span className="flex items-center">
                                {HUBS[HUB_PADRAO].servicos.map((id, n) => (
                                    <SeloServico key={id} servico={SERVICOS[id]} tamanho="md" className={n > 0 ? "-ml-3 ring-2 ring-white" : undefined} />
                                ))}
                            </span>
                        }
                        titulo={`Prepare seu rolê · ${HUBS[HUB_PADRAO].evento.nomeCurto}`}
                        descricao="Os serviços de um evento numa página só, a partir do ingresso."
                    />
                </div>
            </div>
        </div>
    );
}

function CartaoEntrada({ onPress, selos, titulo, descricao, imagem = EVENTO.cover }: { onPress: () => void; selos: ReactNode; titulo: string; descricao: string; imagem?: string }) {
    return (
        <button
            type="button"
            onClick={onPress}
            className="group flex flex-col overflow-hidden rounded-2xl text-left ring-1 ring-border-secondary outline-focus-ring transition duration-150 ease-linear hover:-translate-y-1 hover:ring-brand focus-visible:outline-2 focus-visible:outline-offset-2"
        >
            <div className="relative flex h-36 items-end overflow-hidden p-4">
                <img src={imagem} alt="" aria-hidden="true" className="absolute inset-0 size-full object-cover object-[center_55%]" />
                <span className="relative">{selos}</span>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-secondary bg-secondary/60 px-4 py-4">
                <div className="min-w-0">
                    <p className="text-md font-semibold text-primary">{titulo}</p>
                    <p className="truncate text-sm text-tertiary">{descricao}</p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-fg-quaternary transition group-hover:text-fg-secondary" aria-hidden="true" />
            </div>
        </button>
    );
}
