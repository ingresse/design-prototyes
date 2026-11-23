import { useCallback } from "react";
import { useReducedMotion } from "motion/react";
import { useSearchParams } from "react-router";
import { useBanco } from "@/plataforma";

/* ------------------------------------------------------------------ */
/*  Estados comuns dos relatórios                                      */
/*                                                                     */
/*  Carregando (REL-222), item aberto na URL (REL-223) e a entrada     */
/*  das linhas filhas das tabelas em árvore (REL-224).                 */
/* ------------------------------------------------------------------ */

/** true enquanto o banco ainda não respondeu. Sem atraso fixo: some assim que os dados chegam. */
export function useRelatorioCarregando() {
    return useBanco().modo === "carregando";
}

/** Esqueleto do relatório: o painel de métricas e dois blocos, pulsando (parado com "reduzir movimento"). */
export function CarregandoRelatorio({ rotulo = "Carregando relatório", metricas = 3 }: { rotulo?: string; metricas?: number }) {
    const bloco = "animate-pulse bg-secondary motion-reduce:animate-none";
    return (
        <div role="status" aria-label={rotulo} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-px overflow-clip rounded-2xl bg-secondary ring-1 ring-secondary ring-inset sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: metricas }, (_, i) => (
                    <div key={i} className="flex flex-col gap-3 bg-primary px-5 py-5">
                        <span aria-hidden="true" className={`h-4 w-24 rounded ${bloco}`} />
                        <span aria-hidden="true" className={`h-7 w-32 rounded ${bloco}`} />
                    </div>
                ))}
            </div>
            <span aria-hidden="true" className={`h-72 w-full rounded-2xl ${bloco}`} />
            <span aria-hidden="true" className={`h-48 w-full rounded-2xl ${bloco}`} />
        </div>
    );
}

/**
 * Item aberto no painel lateral, guardado na URL (`?item=<id>`): recarregar ou mandar o link abre o
 * mesmo item. Abrir e fechar trocam a URL sem empilhar histórico.
 */
export function useItemNaUrl(chave = "item") {
    const [params, setParams] = useSearchParams();
    const id = params.get(chave);
    const abrir = useCallback(
        (novo: string) =>
            setParams(
                (p) => {
                    const n = new URLSearchParams(p);
                    n.set(chave, novo);
                    return n;
                },
                { replace: true },
            ),
        [chave, setParams],
    );
    const fechar = useCallback(
        () =>
            setParams(
                (p) => {
                    const n = new URLSearchParams(p);
                    n.delete(chave);
                    return n;
                },
                { replace: true },
            ),
        [chave, setParams],
    );
    return { id, abrir, fechar };
}

/**
 * Entrada e saída das linhas filhas de uma tabela em árvore (REL-224): 180 ms, aparecendo e descendo
 * 4 px. Com "reduzir movimento", só troca, sem animar. Use em `motion.tr` dentro de `AnimatePresence`.
 */
export function useLinhaFilhaAnimada() {
    const reduzir = useReducedMotion();
    if (reduzir) return { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 0, transition: { duration: 0 } } };
    return {
        initial: { opacity: 0, y: -4 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -4 },
        transition: { duration: 0.18, ease: "easeOut" as const },
    };
}
