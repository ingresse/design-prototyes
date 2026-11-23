import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronLeftDouble, ChevronRight, ChevronRightDouble } from "@untitledui/icons";
import { PaginationCardAdvanced } from "@/components/application/pagination/pagination";
import { Button } from "@/components/base/buttons/button";

/*
 * Paginação das listas do Backstage (BKS-114): uma só, a do DS ("Página X de Y", "Linhas por página"
 * 10, 25, 50, 100 e as setas). Paginação no navegador; aparece com mais de 10 itens.
 */

export const TAMANHOS_DE_PAGINA = [10, 25, 50, 100];

/** Página atual e tamanho; volta à primeira quando a lista muda de tamanho (filtro, busca). */
export function usePaginacao<T>(itens: T[], reiniciarCom: unknown[] = []) {
    const [pagina, setPagina] = useState(1);
    const [tamanho, setTamanho] = useState(TAMANHOS_DE_PAGINA[0]);
    const paginas = Math.max(1, Math.ceil(itens.length / tamanho));
    useEffect(() => setPagina(1), reiniciarCom);
    useEffect(() => {
        if (pagina > paginas) setPagina(paginas);
    }, [pagina, paginas]);
    const atual = Math.min(pagina, paginas);
    const inicio = (atual - 1) * tamanho;
    return {
        pagina: atual,
        paginas,
        tamanho,
        setPagina: (p: number) => setPagina(Math.min(Math.max(1, Math.round(p) || 1), paginas)),
        setTamanho: (t: number) => (setTamanho(t), setPagina(1)),
        visiveis: itens.slice(inicio, inicio + tamanho),
        inicio,
        total: itens.length,
    };
}

/** Largura do cartão a partir da qual a paginação mostra "Página X de Y", linhas por página e as páginas. */
const LARGURA_COMPLETA = 704;

/**
 * A paginação do DS decide o layout pela largura da TELA (md), mas o cartão pode ser estreito numa tela
 * larga (menu lateral aberto em 768–1024 px): aí o campo de página e o seletor de linhas estouravam o
 * cartão e escondiam as setas. O rodapé mede o próprio cartão (BKS-114, BKS-115): com menos de 704 px,
 * usa o modo compacto do próprio DS (primeira, anterior, "Página X de Y", próxima, última).
 */
export function RodapeDePaginacao({ pagina, paginas, tamanho, total, setPagina, setTamanho }: ReturnType<typeof usePaginacao>) {
    const ref = useRef<HTMLDivElement>(null);
    const [estreito, setEstreito] = useState(false);
    const visivel = total > TAMANHOS_DE_PAGINA[0];
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const medir = () => setEstreito(el.getBoundingClientRect().width < LARGURA_COMPLETA);
        medir();
        const ro = new ResizeObserver(medir);
        ro.observe(el);
        return () => ro.disconnect();
    }, [visivel]);
    if (!visivel) return null;
    return (
        <div ref={ref}>
            {estreito ? (
                <nav aria-label="Paginação" className="flex items-center gap-3 border-t border-secondary px-4 py-3">
                    <div className="flex gap-2">
                        <Button
                            aria-label="Primeira página"
                            iconLeading={ChevronLeftDouble}
                            color="secondary"
                            size="sm"
                            isDisabled={pagina === 1}
                            onClick={() => setPagina(1)}
                        />
                        <Button
                            aria-label="Página anterior"
                            iconLeading={ChevronLeft}
                            color="secondary"
                            size="sm"
                            isDisabled={pagina === 1}
                            onClick={() => setPagina(pagina - 1)}
                        />
                    </div>
                    <p className="flex flex-1 justify-center text-sm whitespace-pre text-fg-secondary" aria-live="polite">
                        Página <span className="font-medium">{pagina}</span> de <span className="font-medium">{paginas}</span>
                    </p>
                    <div className="flex gap-2">
                        <Button
                            aria-label="Próxima página"
                            iconLeading={ChevronRight}
                            color="secondary"
                            size="sm"
                            isDisabled={pagina === paginas}
                            onClick={() => setPagina(pagina + 1)}
                        />
                        <Button
                            aria-label="Última página"
                            iconLeading={ChevronRightDouble}
                            color="secondary"
                            size="sm"
                            isDisabled={pagina === paginas}
                            onClick={() => setPagina(paginas)}
                        />
                    </div>
                </nav>
            ) : (
                <PaginationCardAdvanced page={pagina} total={paginas} pageSize={tamanho} onPageChange={setPagina} onPageSizeChange={setTamanho} />
            )}
        </div>
    );
}
