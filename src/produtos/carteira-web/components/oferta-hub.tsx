import { XClose } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import fotoHub from "../assets/foto-hub.jpg";
import ingresseSimbolo from "../assets/ingresse-simbolo.svg";

/**
 * Atalho do hub "Prepare seu rolê" na lista de eventos da Carteira web — no lugar do antigo banner da Uber,
 * com as mesmas peças do app. O destino é o hub do Gop Tun em Serviços adicionais.
 */
export const LINK_HUB = "/novos-negocios/servicos-adicionais/checklist?evento=gop-tun";

const TITULO = "Tem mais pra viver no Gop Tun";
const APOIO = "Uber, fotos, seguro e mais";

/** Selo da Ingresse: o hub reúne vários serviços, sem logo de parceiro. */
const SeloIngresse = () => (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-solid">
        <img src={ingresseSimbolo} alt="" aria-hidden="true" className="size-6" />
    </span>
);

/**
 * Celular: banner no topo da lista "Vem aí", antes do primeiro evento — foto do festival à direita, véu escuro
 * com desfoque à esquerda concentrando o texto em branco. O card leva para o hub; o X dispensa.
 */
export function BannerHub({ onAbrir, onDispensar }: { onAbrir: () => void; onDispensar: () => void }) {
    return (
        <div className="relative">
            <button
                type="button"
                onClick={onAbrir}
                className="relative isolate flex min-h-[104px] w-full items-center gap-3 overflow-hidden rounded-2xl bg-black p-4 pr-10 text-left outline-focus-ring transition duration-100 ease-linear focus-visible:outline-2 focus-visible:outline-offset-2 active:opacity-90"
            >
                <img src={fotoHub} alt="" aria-hidden="true" className="absolute inset-y-0 right-0 -z-20 h-full w-[72%] object-cover object-[center_45%]" />
                <img
                    src={fotoHub}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 size-full scale-125 object-cover object-[center_45%] blur-md [mask-image:linear-gradient(to_right,black_35%,transparent_60%)]"
                />
                <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-black/75 via-black/55 via-60% to-black/5" />
                <SeloIngresse />
                <span className="min-w-0 flex-1 text-white">
                    <span className="block text-md font-bold drop-shadow-sm">{TITULO}</span>
                    <span className="block text-sm text-white drop-shadow-sm">{APOIO}</span>
                </span>
            </button>
            <button
                type="button"
                aria-label="Dispensar atalho do Prepare seu rolê"
                onClick={onDispensar}
                className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition duration-100 ease-linear outline-focus-ring hover:bg-black/45 focus-visible:outline-2"
            >
                <XClose className="size-4" />
            </button>
        </div>
    );
}

/**
 * Desktop: o atalho como o primeiro card da grade de eventos — mesmo tamanho dos cards de evento, com a foto do
 * festival ocupando o card inteiro, para não parecer um evento. Um degradê escuro de baixo para cima concentra
 * o selo, o texto em branco e o "Preparar meu rolê". Mesmo hover dos cards de evento. O card abre o hub; o X dispensa.
 */
export function CardHub({ onAbrir, onDispensar }: { onAbrir: () => void; onDispensar: () => void }) {
    return (
        // O card inteiro abre o hub no clique; para teclado e leitor de tela, a ação é o botão "Preparar meu rolê"
        <div
            onClick={onAbrir}
            className="relative isolate flex h-full min-h-[292px] cursor-pointer flex-col justify-end gap-3 overflow-hidden rounded-2xl p-4 transition duration-100 ease-linear hover:-translate-y-0.5 hover:shadow-lg"
        >
            <img src={fotoHub} alt="" aria-hidden="true" className="absolute inset-0 -z-20 size-full object-cover object-[center_40%]" />
            <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/55 via-50% to-black/10" />
            <div className="flex items-center gap-3">
                <SeloIngresse />
                <div className="flex min-w-0 flex-col gap-0.5 text-white">
                    <p className="text-lg font-bold drop-shadow-sm">{TITULO}</p>
                    <p className="text-md text-white/85">{APOIO}</p>
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
                Preparar meu rolê
            </Button>
            <button
                type="button"
                aria-label="Dispensar atalho do Prepare seu rolê"
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
