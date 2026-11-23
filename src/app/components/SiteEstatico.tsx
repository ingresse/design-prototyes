import { useEffect } from "react";

/**
 * O novo site é uma cópia estática (public/novo-site), fora do React. Os endereços antigos do site (/novo-site/home…)
 * recarregam a página certa da cópia, levando junto a query de quem chamou (ex.: ?ev=<id do Backstage>).
 */
export function SiteEstatico({ pagina }: { pagina: string }) {
    useEffect(() => {
        const alvo = new URL(`/novo-site/${pagina}`, window.location.origin);
        new URLSearchParams(window.location.search).forEach((v, k) => alvo.searchParams.set(k, v));
        window.location.replace(alvo.pathname + alvo.search + window.location.hash);
    }, [pagina]);
    return null;
}
