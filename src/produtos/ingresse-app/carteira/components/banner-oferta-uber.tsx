import { XClose } from "@untitledui/icons";
import fotoRole from "../../assets/foto-amigos.jpg";
import uberLogo from "../../assets/uber-logo.svg";

/**
 * Banner da oferta de crédito Uber no topo da Carteira (aba Vem aí), antes do primeiro mês.
 * Fundo com uma foto de rolê (a mesma do mosaico da oferta); à esquerda, um véu escuro com desfoque
 * concentra o texto em branco e vai sumindo para a direita, deixando a foto aparecer.
 * O card inteiro leva para a oferta; o X dispensa. Rola junto com a lista (não fica grudado).
 */
export function BannerOfertaUber({ onAbrir, onDispensar }: { onAbrir: () => void; onDispensar: () => void }) {
    return (
        <div className="relative">
            <button
                type="button"
                onClick={onAbrir}
                className="relative isolate flex min-h-[104px] w-full items-center gap-3 overflow-hidden rounded-2xl p-4 pr-10 text-left outline-focus-ring transition duration-100 ease-linear focus-visible:outline-2 focus-visible:outline-offset-2 active:opacity-90"
            >
                {/* Foto de fundo */}
                <span aria-hidden="true" className="absolute inset-0 -z-30 bg-black" />
                {/* A foto ocupa a parte da direita, para os rostos ficarem fora do texto */}
                <img src={fotoRole} alt="" aria-hidden="true" className="absolute inset-y-0 right-0 -z-20 h-full w-[72%] object-cover object-[center_48%]" />
                {/* Desfoque onde fica o texto: uma cópia da foto desfocada (e ampliada, para a borda não clarear),
                    que vai sumindo para a direita. Um backdrop-blur aqui deixava a borda esquerda clara */}
                <img
                    src={fotoRole}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 size-full scale-125 object-cover object-[center_48%] blur-md [mask-image:linear-gradient(to_right,black_35%,transparent_60%)]"
                />
                {/* Véu escuro para o contraste do texto em branco */}
                <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-black/90 via-black/75 via-60% to-black/10" />

                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-black ring-1 ring-white/15">
                    <img src={uberLogo} alt="" aria-hidden="true" className="h-3 w-auto invert" />
                </span>
                <span className="min-w-0 flex-1 text-white">
                    {/* Pergunta no título e a resposta (o benefício) no apoio, cada um numa linha no celular */}
                    <span className="block text-md font-bold drop-shadow-sm">Vai curtir o rolê?</span>
                    <span className="block text-sm text-white drop-shadow-sm">Vá de Uber pagando 5% menos</span>
                </span>
            </button>
            {/* Dispensar fica fora do botão do card (não se aninha botão em botão) */}
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
