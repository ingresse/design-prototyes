import { XClose } from "@untitledui/icons";
import fotoHub from "../../assets/foto-hub.jpg";
import ingresseSimbolo from "../../assets/ingresse-simbolo.svg";

/** Destino do banner: o hub "Prepare seu rolê" do Gop Tun, na vista de celular. */
export const LINK_HUB = "/novos-negocios/servicos-adicionais/checklist?evento=gop-tun&vista=mobile";

/**
 * Banner do hub "Prepare seu rolê" no topo da Carteira (aba Vem aí), antes do primeiro mês — no lugar
 * do antigo banner da Uber, com a mesma estrutura: foto do festival à direita e, à esquerda, um véu escuro
 * com desfoque que concentra o texto em branco. Selo da Ingresse (hub tem vários serviços, sem parceiro).
 * O card inteiro leva para o hub; o X dispensa. Rola junto com a lista (não fica grudado).
 */
export function BannerHub({ onAbrir, onDispensar }: { onAbrir: () => void; onDispensar: () => void }) {
    return (
        <div className="relative">
            <button
                type="button"
                onClick={onAbrir}
                className="relative isolate flex min-h-[104px] w-full items-center gap-3 overflow-hidden rounded-2xl p-4 pr-10 text-left outline-focus-ring transition duration-100 ease-linear focus-visible:outline-2 focus-visible:outline-offset-2 active:opacity-90"
            >
                <span aria-hidden="true" className="absolute inset-0 -z-30 bg-black" />
                {/* A foto ocupa a parte da direita, para a multidão ficar fora do texto */}
                <img src={fotoHub} alt="" aria-hidden="true" className="absolute inset-y-0 right-0 -z-20 h-full w-[72%] object-cover object-[center_45%]" />
                {/* Desfoque onde fica o texto: cópia da foto desfocada e ampliada, sumindo para a direita */}
                <img
                    src={fotoHub}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 size-full scale-125 object-cover object-[center_45%] blur-md [mask-image:linear-gradient(to_right,black_35%,transparent_60%)]"
                />
                {/* Véu escuro para o contraste do texto em branco */}
                <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-black/75 via-black/55 via-60% to-black/5" />

                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-solid">
                    <img src={ingresseSimbolo} alt="" aria-hidden="true" className="size-6" />
                </span>
                <span className="min-w-0 flex-1 text-white">
                    <span className="block text-md font-bold drop-shadow-sm">Tem mais pra viver no Gop&nbsp;Tun</span>
                    <span className="block text-sm text-white drop-shadow-sm">Uber, fotos, seguro e mais</span>
                </span>
            </button>
            {/* Dispensar fica fora do botão do card (não se aninha botão em botão) */}
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
