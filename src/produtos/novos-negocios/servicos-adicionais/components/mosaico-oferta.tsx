import { useEffect, useState } from "react";
import { motion } from "motion/react";
import foto01 from "../assets/mosaico/mosaico-01.jpg";
import foto02 from "../assets/mosaico/mosaico-02.jpg";
import foto03 from "../assets/mosaico/mosaico-03.jpg";
import foto04 from "../assets/mosaico/mosaico-04.jpg";
import foto05 from "../assets/mosaico/mosaico-05.jpg";
import foto06 from "../assets/mosaico/mosaico-06.jpg";
import foto07 from "../assets/mosaico/mosaico-07.jpg";
import foto08 from "../assets/mosaico/mosaico-08.jpg";
import foto09 from "../assets/mosaico/mosaico-09.jpg";
import foto10 from "../assets/mosaico/mosaico-10.jpg";

type Foto = { src: string; posicao?: string; peso: string };

/**
 * Mosaico de fotos com clima de rolê, no lado do conteúdo da oferta no desktop (e no topo do mobile).
 * O tamanho (até 480px, centralizado na coluna) fica em pages/oferta.tsx. Menor e com mais fotos
 * (10, em 3 colunas de alturas desencontradas) para dar o clima sem roubar a atenção da oferta.
 * As fotos verticais ficam nos espaços altos (peso 3) e as horizontais nos baixos (peso 2).
 */
const COLUNAS: Foto[][] = [
    [
        { src: foto05, peso: "flex-[3]", posicao: "object-[center_40%]" }, // tranças e leque
        { src: foto02, peso: "flex-[2]" }, // palco no Museu do Amanhã
        { src: foto01, peso: "flex-[3]", posicao: "object-[center_25%]" }, // pista
    ],
    [
        { src: foto09, peso: "flex-[2]", posicao: "object-[center_35%]" }, // amigos
        { src: foto03, peso: "flex-[3]", posicao: "object-[center_30%]" }, // três amigos
        { src: foto07, peso: "flex-[2]" }, // multidão
        { src: foto10, peso: "flex-[3]", posicao: "object-[center_30%]" }, // leque
    ],
    [
        { src: foto04, peso: "flex-[2]" }, // estádio
        { src: foto06, peso: "flex-[3]", posicao: "object-[center_35%]" }, // carnaval
        { src: foto08, peso: "flex-[3]" }, // galera
    ],
];

const TOTAL = COLUNAS.flat().length;
/** Intervalo entre um brilho e o próximo; o primeiro vem logo no começo, para a página não parecer parada. */
const INTERVALO_BRILHO = 15_000;
const PRIMEIRO_BRILHO = 2_500;

/**
 * Brilho de vidro: a cada 15s uma faixa fosca e clara atravessa uma das fotos na diagonal,
 * sorteada (nunca a mesma duas vezes seguidas). Só efeito, sem interação; parado com
 * "reduzir movimento".
 */
export function useBrilho() {
    const [brilho, setBrilho] = useState<{ foto: number; vez: number } | null>(null);

    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        let anterior = -1;
        let vez = 0;
        const passar = () => {
            let foto = Math.floor(Math.random() * TOTAL);
            if (foto === anterior) foto = (foto + 1) % TOTAL;
            anterior = foto;
            setBrilho({ foto, vez: ++vez });
        };
        let intervalo: number | undefined;
        const inicio = window.setTimeout(() => {
            passar();
            intervalo = window.setInterval(passar, INTERVALO_BRILHO);
        }, PRIMEIRO_BRILHO);
        return () => {
            window.clearTimeout(inicio);
            window.clearInterval(intervalo);
        };
    }, []);

    return { brilho, acabou: () => setBrilho(null) };
}

export type BrilhoMosaico = ReturnType<typeof useBrilho>;

/**
 * `brilho` vem da página (useBrilho) para que todas as cópias — o mosaico do desktop, o topo do
 * mobile e a faixa dele atrás do header fixo — brilhem na mesma foto, ao mesmo tempo.
 * `topo`: ocupa o topo do mobile na largura toda, centralizado na altura e cortado em cima e
 * embaixo (as fotos ficam maiores do que caberiam inteiras em 280px).
 */
export function MosaicoOferta({ brilho: { brilho, acabou }, topo = false }: { brilho: BrilhoMosaico; topo?: boolean }) {
    let n = 0;

    return (
        <div
            aria-hidden="true"
            className={
                topo
                    ? "absolute inset-x-0 top-1/2 grid aspect-square -translate-y-1/2 grid-cols-3 gap-1.5 px-1.5"
                    : "grid aspect-square w-full grid-cols-3 gap-2"
            }
        >
            {COLUNAS.map((coluna, i) => (
                <div key={i} className={`flex min-h-0 flex-col ${topo ? "gap-1.5" : "gap-2"}`}>
                    {coluna.map((foto, j) => {
                        const indice = n++;
                        return (
                            <div key={j} className={`relative isolate min-h-0 overflow-hidden ${topo ? "rounded-xl" : "rounded-2xl"} ${foto.peso}`}>
                                <img src={foto.src} alt="" className={`size-full object-cover ${foto.posicao ?? ""}`} />
                                {brilho?.foto === indice && (
                                    <FaixaBrilho key={brilho.vez} aoTerminar={acabou} />
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

/**
 * A faixa de vidro do brilho: atravessa a imagem na diagonal em 1,6 s. Vai dentro de um
 * contêiner `relative overflow-hidden`; troque a `key` para passar de novo.
 */
export function FaixaBrilho({ aoTerminar }: { aoTerminar?: () => void }) {
    return (
        <motion.div
            aria-hidden="true"
            initial={{ x: "-160%" }}
            animate={{ x: "260%" }}
            transition={{ duration: 1.6, ease: [0.45, 0, 0.25, 1] }}
            onAnimationComplete={aoTerminar}
            className="pointer-events-none absolute -inset-y-6 left-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent backdrop-blur-[2px]"
        />
    );
}

/**
 * Brilho numa imagem só (ex.: o pôster do evento): mesmo ritmo do mosaico — o primeiro logo
 * no começo e depois a cada 15 s; parado com "reduzir movimento". Devolve a vez atual (para a
 * `key` da faixa) ou null quando não há brilho passando.
 */
export function useBrilhoUnico() {
    const [vez, setVez] = useState<number | null>(null);

    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        let n = 0;
        const passar = () => setVez(++n);
        let intervalo: number | undefined;
        const inicio = window.setTimeout(() => {
            passar();
            intervalo = window.setInterval(passar, INTERVALO_BRILHO);
        }, PRIMEIRO_BRILHO);
        return () => {
            window.clearTimeout(inicio);
            window.clearInterval(intervalo);
        };
    }, []);

    return { vez, acabou: () => setVez(null) };
}
