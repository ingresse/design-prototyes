import { createContext, useContext, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, Clock, CurrencyDollarCircle } from "@untitledui/icons";
import { EVENT } from "../relatorios/data/event";
import { Button } from "@/components/base/buttons/button";
import { NativeSelect } from "@/components/base/select/select-native";
import { TITULO_PAGINA } from "./titulo-pagina";
import { CabecalhoDaPagina } from "./cabecalho-da-pagina";
import { useTodosOsEventos } from "./escopo-dos-relatorios";

/** Relatórios que somam todos os eventos; os outros avisam em "Todos os eventos" (BKS-27). */
const RELATORIOS_COM_TODOS = new Set([
    "vendas-por-grupo",
    "bordero",
    "relatorio-comissarios",
    "transacoes",
    "acesso",
    "transferencias",
    "relatorio-questionarios",
    "relatorio-personalizado",
    "lista-de-usuarios",
]);
import { Tab, TabList, Tabs } from "@/components/application/tabs/tabs";
import { Badge } from "@/components/base/badges/badges";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { cx } from "@/utils/cx";

/*
 * Navegação dentro das seções que viraram um item só no menu do evento (BKS-25):
 * - Relatórios: menu empilhado à esquerda (como no layout de referência), com a tela ao lado.
 * - Bilheteria e cortesias: abas Cortesia e Bilheteria online, no topo das listas.
 * Fica no layout compartilhado porque as telas vêm de projetos diferentes e são muitas.
 */

export const RELATORIOS: { id: string; label: string; href: string; novo?: boolean; ia?: boolean }[] = [
    { id: "vendas-por-grupo", label: "Vendas", href: "/backstage/relatorios/vendas-por-grupo" },
    { id: "transacoes", label: "Transações", href: "/backstage/relatorios/transacoes" },
    { id: "acesso", label: "Acesso", href: "/backstage/relatorios/acesso" },
    { id: "bordero", label: "Borderô", href: "/backstage/relatorios/bordero" },
    { id: "transferencias", label: "Transferências", href: "/backstage/relatorios/transferencias" },
    // Sem selo "Novo": o selo fica só no que acabou de chegar (BKS-08, REL-239).
    { id: "comparativos", label: "Comparativos", href: "/backstage/relatorios/comparativos" },
    { id: "relatorio-questionarios", label: "Respostas do questionário", href: "/backstage/relatorios/questionarios" },
    { id: "lista-de-usuarios", label: "Lista de usuários", href: "/backstage/relatorios/lista-de-usuarios" },
    // O antigo painel de Comissários da organização, agora relatório dos grupos-comissário (ECO-26).
    { id: "relatorio-comissarios", label: "Comissários", href: "/backstage/relatorios/comissarios", novo: true },
    { id: "relatorio-personalizado", label: "Relatório personalizado", href: "/backstage/relatorios/relatorio-personalizado", ia: true },
];

/**
 * Relatórios, na organização (BKS-26): título "Relatórios" no tamanho padrão e, à esquerda, a lista
 * empilhada; ao lado, o evento selecionado (com troca) e o relatório. O título de cada relatório some
 * da tela (fica para leitor de tela): quem diz o que se vê é a lista e o evento no topo.
 * Vindo do menu do evento (`?de=evento`), aparece o voltar para o evento; vindo da organização, não.
 */
export function LayoutDeRelatorios({
    ativo,
    topo,
    voltarPara,
    dentroDoEvento = false,
    children,
}: {
    ativo?: string;
    topo?: ReactNode;
    voltarPara: () => string;
    /** Aberto pelo menu do evento, com o rail na tela: sem "Voltar para o evento" (BKS-90). */
    dentroDoEvento?: boolean;
    children: ReactNode;
}) {
    const [params] = useSearchParams();
    const deEvento = params.get("de") === "evento";
    const sufixo = deEvento ? "?de=evento" : "";
    const todosSemSoma = useTodosOsEventos() && !!ativo && !RELATORIOS_COM_TODOS.has(ativo);
    const navigate = useNavigate();
    return (
        <div className="flex min-w-0 flex-1 flex-col gap-6">
            <header className="flex flex-col items-start gap-4">
                {deEvento && !dentroDoEvento && (
                    <Button color="tertiary" size="md" iconLeading={ArrowLeft} href={voltarPara()} className="-ml-3">
                        Voltar para o evento
                    </Button>
                )}
                <h1 className={TITULO_PAGINA}>Relatórios</h1>
            </header>
            <div className="flex min-w-0 flex-1 flex-col gap-6 md:flex-row md:gap-8">
                <nav aria-label="Relatórios" className="flex shrink-0 flex-col md:sticky md:top-6 md:w-56 md:self-start">
                    {/* Celular: um select do DS no lugar dos 10 itens, que ocupavam 450 px antes do relatório (REL-238). */}
                    <NativeSelect
                        label="Relatório"
                        className="md:hidden"
                        value={ativo ?? ""}
                        onChange={(e) => {
                            const r = RELATORIOS.find((x) => x.id === e.target.value);
                            if (r) navigate(`${r.href}${sufixo}`);
                        }}
                        options={RELATORIOS.map((r) => ({ value: r.id, label: r.novo ? `${r.label} (novo)` : r.ia ? `${r.label} (IA)` : r.label }))}
                    />
                    <ul className="hidden gap-1 md:flex md:flex-col">
                        {RELATORIOS.map((r) => {
                            const atual = r.id === ativo;
                            return (
                                <li key={r.id}>
                                    <Link
                                        to={`${r.href}${sufixo}`}
                                        aria-current={atual ? "page" : undefined}
                                        className={cx(
                                            "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm font-semibold transition duration-100 ease-linear focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
                                            atual ? "bg-active text-primary" : "text-secondary hover:bg-primary_hover hover:text-secondary_hover",
                                        )}
                                    >
                                        <span className="truncate">{r.label}</span>
                                        {r.novo && (
                                            <Badge size="sm" type="pill-color" color="brand">
                                                Novo
                                            </Badge>
                                        )}
                                        {r.ia && (
                                            <Badge size="sm" type="pill-color" color="brand">
                                                IA
                                            </Badge>
                                        )}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
                <div className="flex min-w-0 flex-1 flex-col gap-6">
                    {/* Evento à esquerda; fuso e moeda na mesma linha, à direita, em todos os relatórios (BKS-28). */}
                    <div className={cx("flex flex-wrap items-center gap-x-6 gap-y-3", topo ? "justify-between" : "justify-end")}>
                        {topo}
                        <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-tertiary">
                            <div className="flex items-center gap-1.5">
                                <dt className="sr-only">Fuso horário</dt>
                                <Clock className="size-4 text-fg-quaternary" aria-hidden="true" />
                                <dd>{EVENT.tzLabel}</dd>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <dt className="sr-only">Moeda</dt>
                                <CurrencyDollarCircle className="size-4 text-fg-quaternary" aria-hidden="true" />
                                <dd>{`Moeda: ${EVENT.currency} (${EVENT.currencyLabel})`}</dd>
                            </div>
                        </dl>
                    </div>
                    {/* Relatórios que ainda não somam eventos dizem isso, em vez de parecer que somaram (BKS-27). */}
                    {todosSemSoma && (
                        <p role="status" className="rounded-xl bg-secondary px-4 py-3 text-sm text-secondary">
                            Este relatório ainda não soma todos os eventos: mostra só o último evento aberto. Escolha um evento acima para ver outro.
                        </p>
                    )}
                    {/* O título de cada relatório sai da tela; o h1 dele fica só para leitor de tela. Só o título do relatório (`.titulo-do-relatorio`): os títulos dos estados vazios aparecem (REL-219). */}
                    <div className="flex min-w-0 flex-1 flex-col [&_.titulo-do-relatorio]:sr-only">{children}</div>
                </div>
            </div>
        </div>
    );
}

/** Rotas de Bilheteria e cortesias que mostram as abas (as listas; os passos dos fluxos não). */
export const ROTAS_COM_ABAS_DE_EMISSAO: Record<string, "cortesia" | "bilheteria"> = {
    "/backstage/cortesias": "cortesia",
    "/backstage/bilheteria": "bilheteria",
};

/** As telas de Emissão sabem se estão sob o título "Bilheteria e cortesias" e as abas (no Backstage) ou sozinhas (no Freepass). */
const DentroDasAbasDeEmissao = createContext(false);

/**
 * Título de uma tela de Emissão (Cortesias, Bilheteria online). Sob as abas, o título da página é
 * "Bilheteria e cortesias" e o da aba fica só para leitor de tela (um h1 por página); fora delas, é o h1.
 */
export function TituloDaEmissao({ children, acoes }: { children: ReactNode; acoes?: ReactNode }) {
    // Sob as abas, o título visível é "Bilheteria e cortesias" e a ação fica abaixo das abas, à esquerda (BKS-25, BKS-104).
    if (useContext(DentroDasAbasDeEmissao))
        return (
            <div className="flex flex-wrap items-center gap-3 empty:hidden">
                <h2 className="sr-only">{children}</h2>
                {acoes}
            </div>
        );
    // Fora das abas (Freepass), o cabeçalho padrão (BKS-100).
    return <CabecalhoDaPagina titulo={children} acoes={acoes} />;
}

/** Bilheteria e cortesias: título igual ao do menu e abas Cortesia e Bilheteria online (cada uma com a própria rota), como Itens (BKS-25). */
export function AbasDeEmissao({ ativa, children }: { ativa: "cortesia" | "bilheteria"; children: ReactNode }) {
    const desktop = useBreakpoint("md");
    return (
        <DentroDasAbasDeEmissao.Provider value={true}>
            {/* 32 px entre o título e as abas (BKS-91). */}
            <CabecalhoDaPagina titulo="Bilheteria e cortesias" className="mb-8" />
            <AbasDaEmissao ativa={ativa} desktop={desktop} />
            {children}
        </DentroDasAbasDeEmissao.Provider>
    );
}

function AbasDaEmissao({ ativa, desktop }: { ativa: "cortesia" | "bilheteria"; desktop: boolean }) {
    // O mesmo TabList da Divulgação (BKS-25): sublinhado; no celular as duas dividem a largura, no desktop cada uma do tamanho do nome.
    return (
        <Tabs selectedKey={ativa} className="mb-6">
            <TabList type="underline" size="sm" fullWidth={!desktop} aria-label="Bilheteria e cortesias">
                <Tab id="cortesia" href="/backstage/cortesias" className={desktop ? undefined : "flex-1 justify-center"}>
                    Cortesia
                </Tab>
                <Tab id="bilheteria" href="/backstage/bilheteria" className={desktop ? undefined : "flex-1 justify-center"}>
                    Bilheteria online
                </Tab>
            </TabList>
        </Tabs>
    );
}
