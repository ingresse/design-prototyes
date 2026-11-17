import { XClose } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import fotoAmigos from "../assets/foto-amigos.jpg";
import uberLogo from "../assets/uber-logo.svg";
import { BotaoFechar, Dialogo } from "./dialogo";

/**
 * Comunicação da oferta de crédito Uber na Carteira web — as mesmas peças do app (Início e Carteira).
 * O destino é a página da oferta em Serviços adicionais.
 */
export const LINK_OFERTA_UBER = "/novos-negocios/servicos-adicionais/uber";

const SeloUber = ({ grande }: { grande?: boolean }) => (
    <span className={`flex shrink-0 items-center justify-center bg-black ring-1 ring-white/15 ${grande ? "size-12 rounded-xl" : "size-11 rounded-xl"}`}>
        <img src={uberLogo} alt="" aria-hidden="true" className="h-3 w-auto invert" />
    </span>
);

/**
 * Modal (desktop) ou bottom sheet (celular) da oferta ao abrir a Carteira: banner com a foto dos amigos e o
 * selo da Uber com o desconto, o mesmo título da página da oferta, "Aproveitar desconto" e "Não tenho interesse".
 * No desktop há também o X para fechar; no celular, o fundo e "Não tenho interesse" fecham.
 */
export function OfertaUberDialogo({ aberto, compact, onFechar, onAproveitar }: { aberto: boolean; compact: boolean; onFechar: () => void; onAproveitar: () => void }) {
    return (
        <Dialogo aberto={aberto} compact={compact} label="Oferta de crédito Uber" largura="max-w-[440px]" onFechar={onFechar}>
            <div className="flex flex-col items-center text-center">
                {compact ? <span aria-hidden="true" className="-mt-2 mb-5 h-1 w-10 rounded-full bg-quaternary" /> : <div className="-mt-1 mb-3 flex w-full justify-end"><BotaoFechar onClick={onFechar} /></div>}

                <div className="relative isolate h-40 w-full overflow-hidden rounded-2xl">
                    <img src={fotoAmigos} alt="" aria-hidden="true" className="absolute inset-0 -z-10 size-full object-cover object-[center_45%]" />
                    <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                    <div className="absolute bottom-3 left-3 flex items-center gap-2">
                        <SeloUber grande />
                        <Badge color="success" type="pill-color" size="md">
                            5% off
                        </Badge>
                    </div>
                </div>

                <h2 className="mt-5 text-xl font-bold text-primary">Menos na corrida, mais pro rolê</h2>
                <p className="mt-2 text-md text-tertiary">Compre crédito{" "}Uber com 5% de desconto aqui na Ingresse e vá e volte do rolê com mais tranquilidade.</p>

                <div className="mt-6 flex w-full flex-col gap-2">
                    <Button size="lg" color="primary" className="w-full" onClick={onAproveitar}>
                        Aproveitar desconto
                    </Button>
                    <Button size="lg" color="link-gray" className="self-center" onClick={onFechar}>
                        Não tenho interesse
                    </Button>
                </div>
            </div>
        </Dialogo>
    );
}

/**
 * Banner da oferta no topo da lista "Vem aí", antes do primeiro evento: foto dos amigos à direita, véu escuro
 * com desfoque à esquerda concentrando o texto em branco. O card leva para a oferta; o X dispensa.
 */
export function BannerOfertaUber({ onAbrir, onDispensar }: { onAbrir: () => void; onDispensar: () => void }) {
    return (
        <div className="relative">
            <button
                type="button"
                onClick={onAbrir}
                className="relative isolate flex min-h-[104px] w-full items-center gap-3 overflow-hidden rounded-2xl bg-black p-4 pr-10 text-left outline-focus-ring transition duration-100 ease-linear focus-visible:outline-2 focus-visible:outline-offset-2 active:opacity-90"
            >
                <img src={fotoAmigos} alt="" aria-hidden="true" className="absolute inset-y-0 right-0 -z-20 h-full w-[72%] object-cover object-[center_48%]" />
                <img
                    src={fotoAmigos}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 size-full scale-125 object-cover object-[center_48%] blur-md [mask-image:linear-gradient(to_right,black_35%,transparent_60%)]"
                />
                <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-black/90 via-black/75 via-60% to-black/10" />
                <SeloUber />
                <span className="min-w-0 flex-1 text-white">
                    <span className="block text-md font-bold drop-shadow-sm">Vai curtir o rolê?</span>
                    <span className="block text-sm text-white drop-shadow-sm">Vá de Uber pagando 5% menos</span>
                </span>
            </button>
            <button
                type="button"
                aria-label="Dispensar oferta da Uber"
                onClick={onDispensar}
                className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition duration-100 ease-linear outline-focus-ring hover:bg-black/45 focus-visible:outline-2"
            >
                <XClose className="size-4" />
            </button>
        </div>
    );
}

/**
 * Desktop: a oferta como o primeiro card da grade de eventos — mesmo tamanho dos cards de evento (a linha
 * da grade iguala a altura), mas com a foto dos amigos ocupando o card inteiro, para não parecer um evento.
 * Um degradê escuro de baixo para cima concentra o selo, o texto em branco e o "Aproveitar desconto".
 * Mesmo hover dos cards de evento (sobe um pouco e ganha sombra). O card abre a oferta; o X dispensa.
 */
export function CardOfertaUber({ onAbrir, onDispensar }: { onAbrir: () => void; onDispensar: () => void }) {
    return (
        // O card inteiro abre a oferta no clique; para teclado e leitor de tela, a ação é o botão "Aproveitar desconto"
        <div
            onClick={onAbrir}
            className="relative isolate flex h-full min-h-[292px] cursor-pointer flex-col justify-end gap-3 overflow-hidden rounded-2xl p-4 transition duration-100 ease-linear hover:-translate-y-0.5 hover:shadow-lg"
        >
            <img src={fotoAmigos} alt="" aria-hidden="true" className="absolute inset-0 -z-20 size-full object-cover object-[center_35%]" />
            <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/40 via-55% to-black/0" />
            {/* Selo da Uber à esquerda do texto */}
            <div className="flex items-center gap-3">
                <SeloUber />
                <div className="flex min-w-0 flex-col gap-0.5 text-white">
                    <p className="text-lg font-bold drop-shadow-sm">Vai curtir o rolê?</p>
                    <p className="text-md text-white/85">Vá de Uber pagando 5% menos</p>
                </div>
            </div>
            <Button
                size="sm"
                color="secondary"
                className="self-start"
                onClick={(e) => {
                    e.stopPropagation();
                    onAbrir();
                }}
            >
                Aproveitar desconto
            </Button>
            <button
                type="button"
                aria-label="Dispensar oferta da Uber"
                onClick={(e) => {
                    e.stopPropagation();
                    onDispensar();
                }}
                className="absolute top-3 right-3 flex size-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition duration-100 ease-linear outline-focus-ring hover:bg-black/55 focus-visible:outline-2"
            >
                <XClose className="size-4" />
            </button>
        </div>
    );
}
