import { type ReactNode, useState } from "react";
import { Tab, TabList, Tabs } from "@/components/application/tabs/tabs";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { AvisoDeEscala } from "../itens/components/escala";
import { useCatalogo } from "../itens/data/catalogo";
import { AtalhosDosItens } from "./atalhos-dos-itens";
import { AlertaDoGuia } from "./Backstage";
import { CabecalhoDaPagina } from "./cabecalho-da-pagina";
import { PainelDaAbertura } from "./painel-da-abertura";

/*
 * Itens numa página só (BKS-17): título "Ingressos e produtos" (BKS-88), os atalhos das funcionalidades de
 * ingressos (BKS-119) e três abas, uma por coisa que o evento vende (Ingressos, Produtos, Combos), cada uma
 * com a própria rota (a aba fica na URL). Três abas cabem numa linha também no celular (390 px).
 * Aberturas de vendas e Regras de compra e acesso não são listas de itens: abrem pelos atalhos, cada uma
 * com página própria e "Ingressos e produtos" para voltar; o Questionário também abre pelo atalho.
 * A faixa do catálogo simulado (`?escala`, ITM-85) aparece aqui, logo abaixo do título, em todas elas.
 * Fica nos componentes compartilhados porque as telas vêm de projetos diferentes (itens/,
 * aberturas-de-vendas/), que não importam uns dos outros.
 */

export type AbaDeItens = "ingressos" | "produtos" | "combos" | "aberturas" | "configuracoes";

const ABAS: { id: AbaDeItens; label: string; href: string }[] = [
    { id: "ingressos", label: "Ingressos", href: "/backstage/catalogo/ingressos" },
    { id: "produtos", label: "Produtos", href: "/backstage/catalogo/produtos" },
    { id: "combos", label: "Combos", href: "/backstage/catalogo/combos" },
];

/** Páginas que abrem pelos atalhos (BKS-119) e moram nas rotas do catálogo: título e subtítulo próprios, com voltar para Ingressos e produtos. */
const PAGINAS: Partial<Record<AbaDeItens, { titulo: string; subtitulo: string }>> = {
    aberturas: { titulo: "Aberturas de vendas", subtitulo: "Quando cada ingresso, produto e combo vende." },
    // O subtítulo não repete o título (UI-VIS-014).
    configuracoes: { titulo: "Regras de compra e acesso", subtitulo: "Valem para todos os ingressos do evento." },
};

/** `acoes`: a ação principal da página, abaixo do título, à esquerda (BKS-104); só nas páginas próprias (Aberturas, Regras). */
export function AbasDeItens({ ativa, acoes }: { ativa: AbaDeItens; acoes?: ReactNode }) {
    const desktop = useBreakpoint("md");
    const { evento, biblioteca } = useCatalogo();
    // "Programar abertura de vendas" do aviso abre o painel aqui mesmo, sem sair de Ingressos e produtos (ABV-11, GDC-10).
    const [criandoAbertura, setCriandoAbertura] = useState(false);
    const pagina = PAGINAS[ativa];

    if (pagina) {
        return (
            // Abertura e Regras abrem pelos atalhos de Ingressos e produtos (BKS-119): o voltar leva para lá.
            <>
                <CabecalhoDaPagina
                    voltar={{ rotulo: "Ingressos e produtos", href: "/backstage/catalogo/ingressos" }}
                    titulo={pagina.titulo}
                    subtitulo={pagina.subtitulo}
                    acoes={acoes}
                />
                <AvisoDeEscala />
            </>
        );
    }

    return (
        // 32 px entre o título, os atalhos e as abas (BKS-91, BKS-119).
        <div className="flex flex-col gap-8">
            <CabecalhoDaPagina titulo="Ingressos e produtos" />
            {/* Catálogo simulado: a faixa vem logo abaixo do título, igual em todas as abas (M9). */}
            <AvisoDeEscala />
            {/* O aviso do guia (ex.: "Nada programado para entrar à venda") vem antes dos atalhos, na aba Ingressos (GDC). */}
            {ativa === "ingressos" && <AlertaDoGuia eventoId={evento?.id} onAcao={evento ? () => setCriandoAbertura(true) : undefined} />}
            <AtalhosDosItens />
            {/* No celular as três dividem a largura; no desktop, cada aba do tamanho do nome. */}
            <Tabs selectedKey={ativa}>
                <TabList type="underline" size="sm" fullWidth={!desktop} aria-label="Itens do evento">
                    {ABAS.map((a) => (
                        <Tab key={a.id} id={a.id} href={a.href} className={desktop ? undefined : "flex-1 justify-center"}>
                            {a.label}
                        </Tab>
                    ))}
                </TabList>
            </Tabs>
            {criandoAbertura && evento && <PainelDaAbertura evento={evento} biblioteca={biblioteca} onFechar={() => setCriandoAbertura(false)} />}
        </div>
    );
}
