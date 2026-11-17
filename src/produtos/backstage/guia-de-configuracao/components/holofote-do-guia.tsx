import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CampoDeParticulas } from "../../components/campo-de-particulas";
import { useCorDasParticulas } from "../utils/cor-das-particulas";

/** Tempo para ler as duas linhas e achar o painel. Clicar em qualquer lugar encerra antes (GDC-14). */
const PERMANENCIA_MS = 9000;

/**
 * O teste de usabilidade cobre o protótipo com perguntas e briefings e marca o <body> com
 * `data-teste-sobreposto`. Enquanto a marca existe, o holofote espera: só aparece, e só começa a
 * contar, quando a pessoa volta para o protótipo.
 */
function useCobertoPeloTeste() {
    const ler = () => typeof document !== "undefined" && document.body.hasAttribute("data-teste-sobreposto");
    const [coberto, setCoberto] = useState(ler);
    useEffect(() => {
        const obs = new MutationObserver(() => setCoberto(ler()));
        obs.observe(document.body, { attributes: true, attributeFilter: ["data-teste-sobreposto"] });
        setCoberto(ler());
        return () => obs.disconnect();
    }, []);
    return coberto;
}

const ESMAECER = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const } },
    exit: { opacity: 0, transition: { duration: 0.8, ease: [0.4, 0, 1, 1] as const } },
};
const TEXTO = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] as const } },
};

/**
 * Apresentação do guia logo depois de criar o evento: escurece a tela a partir do canto do painel,
 * acende o canto com partículas e diz o que vem agora. Some em 9 s ou no primeiro clique em qualquer
 * lugar; o clique segue para o que estava embaixo (pointer-events-none), então clicar numa opção do
 * guia já faz a ação (GDC-14). É aria-hidden: a informação que importa está no painel.
 */
export function HolofoteDoGuia({ onConcluir }: { onConcluir: () => void }) {
    const reduzir = useReducedMotion();
    const cor = useCorDasParticulas("holofote");

    const coberto = useCobertoPeloTeste();

    // Os 9 s e o clique para fechar só valem com o holofote à vista (no teste, depois do "Começar").
    useEffect(() => {
        if (coberto) return;
        const t = window.setTimeout(onConcluir, PERMANENCIA_MS);
        // Cliques na camada do teste de usabilidade (barra da tarefa) não contam: o holofote é do protótipo.
        const fechar = (e: PointerEvent) => {
            if ((e.target as Element | null)?.closest?.("[data-camada-do-teste]")) return;
            onConcluir();
        };
        document.addEventListener("pointerdown", fechar, true);
        return () => {
            window.clearTimeout(t);
            document.removeEventListener("pointerdown", fechar, true);
        };
    }, [onConcluir, coberto]);

    if (coberto) return null;

    return (
        <motion.div aria-hidden="true" className="pointer-events-none fixed inset-0 z-20 overflow-hidden" {...(reduzir ? {} : ESMAECER)}>
            {/* Camadas, na ordem do DOM: escurecer, acender, texturizar. */}
            <div className="absolute inset-0 bg-[radial-gradient(190%_180%_at_100%_100%,var(--color-bg-overlay)_0%,color-mix(in_srgb,var(--color-bg-overlay)_58%,transparent)_38%,transparent_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-bg-warning-solid)_32%,var(--color-bg-error-solid)_92%)] opacity-80 [mask-image:radial-gradient(82%_82%_at_100%_100%,black_18%,transparent_70%)]" />
            <CampoDeParticulas
                cor={cor}
                densidade={1}
                escala={5}
                parada={0}
                className="absolute inset-0 size-full [mask-image:radial-gradient(75%_75%_at_100%_100%,black_0%,transparent_72%)]"
            />
            <motion.div
                className="absolute inset-x-6 bottom-[23rem] flex flex-col items-start gap-3 sm:inset-x-auto sm:right-[26rem] sm:bottom-10 sm:max-w-md"
                {...(reduzir ? {} : TEXTO)}
            >
                <h2 className="text-display-sm font-semibold text-[#fff]">Evento criado! Agora, configure as vendas</h2>
                <p className="text-md text-[#fff]/80">Siga as etapas do guia para criar os ingressos, programar as vendas e publicar o evento.</p>
            </motion.div>
        </motion.div>
    );
}
