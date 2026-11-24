import { useLayoutEffect, type ComponentType, type ReactNode } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { Calendar, ChevronDown, FilterLines, InfoCircle } from "@untitledui/icons";
import calendario from "@/assets/iconly/calendar.json";
import grafico from "@/assets/iconly/chart.json";
import pessoas from "@/assets/iconly/users.json";
import carteira from "@/assets/iconly/wallet.json";
import carrinho from "@/assets/iconly/shopping-cart.json";
import sacola from "@/assets/iconly/bag.json";
import grupo from "@/assets/iconly/users-group.json";
import engrenagem from "@/assets/iconly/setting.json";
import { Avatar } from "@/components/base/avatar/avatar";
import { FilterBar } from "@/components/application/filter-bar/filter-bar";
import { Tabs } from "@/components/application/tabs/tabs";
import { Button } from "@/components/base/buttons/button";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { iconeAnimado } from "@/components/foundations/icone-animado";
import { cx } from "@/utils/cx";
import { MultiSelect } from "./multi-select-pt";
import { ATUALIZADO_EM, CENARIOS, ORGANIZACAO, eventosDoCenario, type Cenario, type Evento } from "./dados";

/*
 * Shell dos protótipos de Finanças do produtor.
 *
 * É o menu lateral do Backstage (rail da organização, layout "clássico") refeito aqui com os
 * mesmos tokens e ícones, por dois motivos: um produto não importa de outro, e o BackstageLayout
 * lê a organização do banco compartilhado, onde a Arena Produções não existe. Os outros itens do
 * menu ficam inertes: o teste é só de Finanças.
 *
 * Acima da interface do produto fica a barra do protótipo, com o seletor de cenário. Ela não faz
 * parte da tela que o produtor avalia.
 */

/* ---------------- cenário e navegação por parâmetros ---------------- */

/** Título de página do DS, como na Tela guardiã do Figma (Finanças - AWA): Text xl / Semibold. */
export const TITULO_PAGINA = "text-xl font-semibold text-primary";

const TITULO_DA_ABA = "Finanças · Protótipo de pesquisa";

/** Cenário em `?cenario=`, para o link da entrevista já abrir no estado certo. */
export function useCenario(): [Cenario, (c: Cenario) => void] {
    const [params, setParams] = useSearchParams();
    const { state } = useLocation();
    const bruto = params.get("cenario");
    const cenario = CENARIOS.some((c) => c.id === bruto) ? (bruto as Cenario) : "normal";
    const mudar = (c: Cenario) => {
        // Trocar de cenário fecha painel e tela final: começa do início da tela.
        // O `state` leva a lista de onde a pessoa veio: sem ele, o "voltar" do evento perderia busca e página.
        setParams(c === "normal" ? {} : { cenario: c }, { state });
    };
    return [cenario, mudar];
}

/** Lê e grava um parâmetro da URL sem perder os outros (painel aberto, tela final). */
export function useParametro(nome: string): [string | null, (valor: string | null, extras?: Record<string, string | null>) => void] {
    const [params, setParams] = useSearchParams();
    const { state } = useLocation();
    const mudar = (valor: string | null, extras: Record<string, string | null> = {}) => {
        const novo = new URLSearchParams(params);
        for (const [chave, v] of Object.entries({ [nome]: valor, ...extras })) {
            if (v === null) novo.delete(chave);
            else novo.set(chave, v);
        }
        setParams(novo, { state });
    };
    return [params.get(nome), mudar];
}

/* ---------------- barra do protótipo (fora do produto) ---------------- */

const BarraDoPrototipo = ({ jornada }: { jornada: string }) => {
    const [cenario, setCenario] = useCenario();
    return (
        <div className="sticky top-0 z-40 flex h-12 items-center gap-4 border-b border-secondary bg-secondary px-4">
            <span className="text-xs font-semibold whitespace-nowrap text-secondary">Protótipo de pesquisa</span>
            <span className="text-xs whitespace-nowrap text-tertiary">{jornada}</span>
            <span className="min-w-0 truncate text-xs text-tertiary" title={CENARIOS.find((c) => c.id === cenario)?.muda}>
                {CENARIOS.find((c) => c.id === cenario)?.muda}
            </span>
            <div className="ml-auto flex shrink-0 items-center gap-2">
                <span id="rotulo-cenario" className="text-xs text-tertiary">
                    Cenário
                </span>
                <ButtonGroup
                    size="sm"
                    aria-labelledby="rotulo-cenario"
                    selectedKeys={new Set([cenario])}
                    disallowEmptySelection
                    onSelectionChange={(chaves) => {
                        const escolhido = [...chaves][0];
                        if (escolhido) setCenario(escolhido as Cenario);
                    }}
                >
                    {CENARIOS.map((c) => (
                        <ButtonGroupItem key={c.id} id={c.id}>
                            {c.rotulo}
                        </ButtonGroupItem>
                    ))}
                </ButtonGroup>
            </div>
        </div>
    );
};

/* ---------------- menu lateral da organização ---------------- */

const MENU: Array<{ id: string; icone: ComponentType<{ className?: string }>; rotulo: string }> = [
    { id: "eventos", icone: iconeAnimado(calendario), rotulo: "Eventos" },
    { id: "relatorios", icone: iconeAnimado(grafico), rotulo: "Relatórios" },
    { id: "membros", icone: iconeAnimado(pessoas), rotulo: "Membros" },
    { id: "financas", icone: iconeAnimado(carteira), rotulo: "Finanças" },
    { id: "pedidos", icone: iconeAnimado(carrinho), rotulo: "Pedidos" },
    { id: "produtos", icone: iconeAnimado(sacola), rotulo: "Produtos" },
    { id: "publico", icone: iconeAnimado(grupo), rotulo: "Público" },
    { id: "ajustes", icone: iconeAnimado(engrenagem), rotulo: "Ajustes" },
];

const MenuLateral = () => (
    <aside className="sticky top-18 flex h-[calc(100vh-6rem)] w-25 shrink-0 flex-col items-center overflow-y-auto rounded-2xl bg-primary px-1 py-4">
        <div className="flex flex-col items-center gap-4">
            <div className="flex w-full flex-col items-center gap-1.5 px-1 py-1" aria-label={`Organização: ${ORGANIZACAO.nome}`}>
                <span className="relative">
                    <Avatar size="md" initials={ORGANIZACAO.sigla} alt="" />
                    <span className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-primary ring-1 ring-secondary">
                        <ChevronDown className="size-3 text-fg-quaternary" aria-hidden="true" />
                    </span>
                </span>
                <span className="line-clamp-2 w-full text-center text-sm leading-tight font-medium break-words text-secondary">{ORGANIZACAO.nome}</span>
            </div>
            <nav aria-label="Organização" className="flex flex-col items-center gap-1">
                {MENU.map(({ id, icone: Icone, rotulo }) => {
                    const ativo = id === "financas";
                    return (
                        <button
                            key={id}
                            type="button"
                            aria-current={ativo ? "page" : undefined}
                            className={cx(
                                "flex w-full flex-col items-center gap-1 rounded-md py-2 transition duration-100 ease-linear",
                                ativo ? "text-secondary" : "text-tertiary hover:text-secondary_hover",
                            )}
                        >
                            <span className={cx("flex size-10 items-center justify-center rounded-lg transition duration-100 ease-linear", ativo ? "bg-tertiary" : "hover:bg-secondary_hover")}>
                                <Icone className="size-5" />
                            </span>
                            <span className="text-center text-xs leading-tight font-medium">{rotulo}</span>
                        </button>
                    );
                })}
            </nav>
        </div>
    </aside>
);

/* ---------------- shell ---------------- */

interface FinancasShellProps {
    /** Nome da jornada na barra do protótipo (ex.: "Eventos como pastas"). */
    jornada: string;
    children: ReactNode;
}

export function FinancasShell({ jornada, children }: FinancasShellProps) {
    // Tela escura, como o Backstage atual: vale só enquanto o protótipo está aberto e não mexe
    // na preferência de tema salva pela pessoa.
    useLayoutEffect(() => {
        const raiz = document.documentElement;
        const jaEstava = raiz.classList.contains("dark-mode");
        raiz.classList.add("dark-mode");
        // O ThemeProvider reaplica o tema salvo depois deste efeito: o observador devolve o escuro.
        const observador = new MutationObserver(() => {
            if (!raiz.classList.contains("dark-mode")) raiz.classList.add("dark-mode");
        });
        observador.observe(raiz, { attributes: true, attributeFilter: ["class"] });
        return () => {
            observador.disconnect();
            if (!jaEstava) raiz.classList.remove("dark-mode");
        };
    }, []);

    // Trocar de tela (lista ↔ evento) começa sempre do topo: sem isso a página do evento abria na
    // altura em que a lista estava rolada. Trocar de cenário ou de filtro não muda o caminho e não rola.
    const { pathname } = useLocation();
    useLayoutEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    // O título da aba é do repositório inteiro (index.html): aqui ele vale só enquanto o protótipo está aberto.
    useLayoutEffect(() => {
        const anterior = document.title;
        document.title = TITULO_DA_ABA;
        return () => {
            document.title = anterior;
        };
    }, []);

    return (
        <div className="min-h-screen bg-primary_alt">
            <BarraDoPrototipo jornada={jornada} />
            <div className="flex gap-3 px-3 py-6">
                <MenuLateral />
                <main className="flex min-w-0 flex-1 flex-col px-6 pb-6">
                    <div className="mx-auto flex w-full max-w-310 flex-1 flex-col gap-6">{children}</div>
                </main>
            </div>
        </div>
    );
}

/* ---------------- filtro de eventos (topo de Finanças) ---------------- */

/**
 * Eventos escolhidos no filtro do topo, em `?eventos=id,id`. Sem escolha (ou com todos marcados),
 * vale a organização inteira. O filtro aplica-se a todos os dados da página, nas três abas,
 * inclusive à lista "Saldo por evento".
 */
export function useEventosEscolhidos(): { todos: Evento[]; escolhidos: Evento[]; filtrado: boolean } {
    const [cenario] = useCenario();
    const [params] = useSearchParams();
    const todos = eventosDoCenario(cenario);
    const ids = new Set((params.get("eventos") ?? "").split(",").filter(Boolean));
    const escolhidos = todos.filter((e) => ids.has(e.id));
    const filtrado = escolhidos.length > 0 && escolhidos.length < todos.length;
    return { todos, escolhidos: filtrado ? escolhidos : todos, filtrado };
}

const FiltroDeEventos = () => {
    const { todos, escolhidos, filtrado } = useEventosEscolhidos();
    const [, mudar] = useParametro("eventos");
    if (todos.length === 0) return null;
    const itens = todos.map((e) => ({ id: e.id, label: e.nome }));
    const valor = !filtrado ? "Todos os eventos" : escolhidos.length === 1 ? escolhidos[0].nome : `${escolhidos.length} eventos`;
    return (
        // Barra de filtros da página, abaixo das abas: `FilterBar` do DS dentro de um cartão.
        <FilterBar.Root role="group" aria-label="Filtros de Finanças" className="mt-4 items-center gap-4 rounded-xl bg-primary px-4 py-3 shadow-xs ring-1 ring-secondary ring-inset">
            <FilterBar.Content className="items-center gap-4">
                <span className="flex items-center gap-2 pl-2 text-sm font-semibold text-secondary">
                    <FilterLines aria-hidden="true" className="size-5 text-fg-quaternary" />
                    Filtros
                </span>
                <span aria-hidden="true" className="h-6 w-px bg-border-secondary" />
                <span id="rotulo-filtro-de-evento" className="text-sm font-medium text-tertiary">
                    Evento
                </span>
                <MultiSelect
                    size="sm"
                    className="w-96"
                    popoverClassName="w-96"
                    icon={Calendar}
                    aria-label={`Evento: ${valor}`}
                    placeholder="Todos os eventos"
                    placeholderComoValor
                    items={itens}
                    selectedKeys={new Set(filtrado ? escolhidos.map((e) => e.id) : [])}
                    onSelectionChange={(chaves) => {
                        const ids = chaves === "all" ? [] : [...chaves].map(String);
                        // Tudo marcado é o mesmo que nenhum filtro. Trocar a seleção fecha painel aberto.
                        mudar(ids.length === 0 || ids.length === todos.length ? null : ids.join(","), { detalhe: null, movimento: null, pagina: null });
                    }}
                    onReset={() => mudar(null)}
                    onSelectAll={() => mudar(null)}
                    emptyStateTitle="Nenhum evento encontrado"
                    emptyStateDescription="Confira o nome do evento."
                    selectedCountFormatter={() => valor}
                >
                    {(item) => (
                        <MultiSelect.Item id={item.id} selectionIndicator="checkbox" selectionIndicatorAlign="left">
                            {item.label}
                        </MultiSelect.Item>
                    )}
                </MultiSelect>
                {/* Com filtro, um clique volta para a organização inteira, sem abrir a lista. */}
                {filtrado && (
                    <Button size="sm" color="link-gray" onClick={() => mudar(null)}>
                        Limpar filtros
                    </Button>
                )}
            </FilterBar.Content>
            <FilterBar.Actions className="gap-2 pr-2 text-sm text-tertiary">
                <InfoCircle aria-hidden="true" className="size-4 shrink-0 text-fg-quaternary" />
                Aplica-se a todos os dados da página
            </FilterBar.Actions>
        </FilterBar.Root>
    );
};

/* ---------------- abas de Finanças ---------------- */

export type AbaDeFinancas = "visao-geral" | "calendario" | "extrato";
const ABAS: Array<{ id: AbaDeFinancas; rotulo: string; rota: string }> = [
    { id: "visao-geral", rotulo: "Visão geral", rota: "/payout/financas-eventos" },
    { id: "calendario", rotulo: "Calendário", rota: "/payout/financas-eventos/calendario" },
    { id: "extrato", rotulo: "Extrato", rota: "/payout/financas-eventos/extrato" },
];

/** As três telas de Finanças são um produto só: a aba troca de tela e mantém o cenário do protótipo. */
const AbasDeFinancas = ({ ativa }: { ativa: AbaDeFinancas }) => {
    const navigate = useNavigate();
    const [cenario] = useCenario();
    const [params] = useSearchParams();
    return (
        <Tabs
            selectedKey={ativa}
            onSelectionChange={(chave) => {
                const aba = ABAS.find((a) => a.id === chave);
                if (!aba || aba.id === ativa) return;
                // A troca de aba mantém o cenário do protótipo e os eventos escolhidos no filtro do topo.
                const destino = new URLSearchParams();
                if (cenario !== "normal") destino.set("cenario", cenario);
                if (params.get("eventos")) destino.set("eventos", params.get("eventos")!);
                navigate(`${aba.rota}${destino.size ? `?${destino}` : ""}`);
            }}
        >
            <Tabs.List type="underline" size="sm" aria-label="Telas de Finanças">
                {ABAS.map((a) => (
                    <Tabs.Item key={a.id} id={a.id}>
                        {a.rotulo}
                    </Tabs.Item>
                ))}
            </Tabs.List>
        </Tabs>
    );
};

/** Cabeçalho da página: título e ações na mesma linha; o que vem acima e abaixo não desloca as ações. */
export const CabecalhoDaPagina = ({ titulo, acima, abaixo, acoes, aba }: { titulo: string; acima?: ReactNode; abaixo?: ReactNode; acoes?: ReactNode; aba?: AbaDeFinancas }) => (
    <header className="flex flex-col gap-2">
        {acima}
        <div className="flex min-h-10 items-center justify-between gap-6">
            <h1 className={TITULO_PAGINA}>{titulo}</h1>
            <div className="flex shrink-0 items-center gap-4">
                {/* Mesmo padrão dos relatórios do evento. Informação neutra: só a data e a hora. */}
                <span className="text-sm whitespace-nowrap text-tertiary">Atualizado em {ATUALIZADO_EM}</span>
                {acoes && <div className="flex items-center gap-3">{acoes}</div>}
            </div>
        </div>
        {abaixo}
        {aba && <AbasDeFinancas ativa={aba} />}
        {aba && <FiltroDeEventos />}
    </header>
);
