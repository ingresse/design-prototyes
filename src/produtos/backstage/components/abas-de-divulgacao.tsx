import { Tab, TabList, Tabs } from "@/components/application/tabs/tabs";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { CabecalhoDaPagina } from "./cabecalho-da-pagina";

/*
 * Divulgação (BKS-120): uma página com título e duas abas, Lista de espera e Pixel de rastreamento,
 * cada uma com a própria rota (a aba fica na URL), como Ingressos e produtos (BKS-17). O título de
 * cada aba fica só para leitor de tela, num h2 dentro da tela dela.
 */

export type AbaDeDivulgacao = "lista-de-espera" | "pixel";

const ABAS: { id: AbaDeDivulgacao; label: string; href: string }[] = [
    { id: "lista-de-espera", label: "Lista de espera", href: "/backstage/marketing/lista-de-espera" },
    { id: "pixel", label: "Pixel de rastreamento", href: "/backstage/marketing/pixel" },
];

/** As duas telas contam como uma só: trocar de aba não remonta nem anima a moldura (BKS-15). */
export const CHAVE_DA_DIVULGACAO = "divulgacao";

export function AbasDeDivulgacao({ ativa }: { ativa: AbaDeDivulgacao }) {
    const desktop = useBreakpoint("md");
    return (
        // 32 px entre o título e as abas (BKS-91).
        <div className="flex flex-col gap-8">
            <CabecalhoDaPagina titulo="Divulgação" />
            {/* No celular as duas dividem a largura; no desktop, cada aba do tamanho do nome. */}
            <Tabs selectedKey={ativa}>
                <TabList type="underline" size="sm" fullWidth={!desktop} aria-label="Divulgação">
                    {ABAS.map((a) => (
                        <Tab key={a.id} id={a.id} href={a.href} className={desktop ? undefined : "flex-1 justify-center"}>
                            {a.label}
                        </Tab>
                    ))}
                </TabList>
            </Tabs>
        </div>
    );
}
