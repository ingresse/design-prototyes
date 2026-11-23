import type { ReactNode } from "react";
import { CabecalhoDaPagina } from "./cabecalho-da-pagina";

/*
 * Topo das telas que abrem pelos atalhos de Ingressos e produtos (BKS-119): o cabeçalho de página
 * padrão (BKS-100) com "Ingressos e produtos" para voltar.
 */
export function CabecalhoDaFuncionalidade({ titulo, subtitulo, acao }: { titulo: string; subtitulo?: string; acao?: ReactNode }) {
    return (
        <CabecalhoDaPagina
            voltar={{ rotulo: "Ingressos e produtos", href: "/backstage/catalogo/ingressos" }}
            titulo={titulo}
            subtitulo={subtitulo}
            acoes={acao}
        />
    );
}
