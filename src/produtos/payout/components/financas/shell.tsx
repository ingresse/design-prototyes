import { useLayoutEffect, type ComponentType, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import { ChevronDown } from "@untitledui/icons";
import calendario from "@/assets/iconly/calendar.json";
import grafico from "@/assets/iconly/chart.json";
import pessoas from "@/assets/iconly/users.json";
import carteira from "@/assets/iconly/wallet.json";
import carrinho from "@/assets/iconly/shopping-cart.json";
import sacola from "@/assets/iconly/bag.json";
import grupo from "@/assets/iconly/users-group.json";
import engrenagem from "@/assets/iconly/setting.json";
import { Avatar } from "@/components/base/avatar/avatar";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { iconeAnimado } from "@/components/foundations/icone-animado";
import { cx } from "@/utils/cx";
import { CENARIOS, ORGANIZACAO, type Cenario } from "./dados";

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

/** Mesmo título de página do Backstage (backstage/components/titulo-pagina.ts). */
export const TITULO_PAGINA = "text-display-xs leading-tight font-bold tracking-tight text-balance text-primary md:text-display-md";

/** Cenário em `?cenario=`, para o link da entrevista já abrir no estado certo. */
export function useCenario(): [Cenario, (c: Cenario) => void] {
    const [params, setParams] = useSearchParams();
    const bruto = params.get("cenario");
    const cenario = CENARIOS.some((c) => c.id === bruto) ? (bruto as Cenario) : "normal";
    const mudar = (c: Cenario) => {
        // Trocar de cenário fecha painel e tela final: começa do início da tela.
        setParams(c === "normal" ? {} : { cenario: c });
    };
    return [cenario, mudar];
}

/** Lê e grava um parâmetro da URL sem perder os outros (painel aberto, tela final). */
export function useParametro(nome: string): [string | null, (valor: string | null, extras?: Record<string, string | null>) => void] {
    const [params, setParams] = useSearchParams();
    const mudar = (valor: string | null, extras: Record<string, string | null> = {}) => {
        const novo = new URLSearchParams(params);
        for (const [chave, v] of Object.entries({ [nome]: valor, ...extras })) {
            if (v === null) novo.delete(chave);
            else novo.set(chave, v);
        }
        setParams(novo);
    };
    return [params.get(nome), mudar];
}

/* ---------------- barra do protótipo (fora do produto) ---------------- */

const BarraDoPrototipo = ({ jornada }: { jornada: string }) => {
    const [cenario, setCenario] = useCenario();
    return (
        <div className="sticky top-0 z-40 flex h-12 items-center gap-4 border-b border-secondary bg-secondary px-4">
            <span className="text-xs font-semibold text-secondary">Protótipo de pesquisa</span>
            <span className="text-xs text-tertiary">{jornada}</span>
            <div className="ml-auto flex items-center gap-2">
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
    <aside className="sticky top-18 flex h-[calc(100vh-6rem)] w-[100px] shrink-0 flex-col items-center overflow-y-auto rounded-2xl bg-primary px-1 py-4">
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
    /** Nome da jornada na barra do protótipo (ex.: "Cascata que fecha"). */
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
        return () => {
            if (!jaEstava) raiz.classList.remove("dark-mode");
        };
    }, []);

    return (
        <div className="min-h-screen bg-primary_alt">
            <BarraDoPrototipo jornada={jornada} />
            <div className="flex gap-3 px-3 py-6">
                <MenuLateral />
                <main className="flex min-w-0 flex-1 flex-col px-6 pb-6">
                    <div className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col gap-6">{children}</div>
                </main>
            </div>
        </div>
    );
}

/** Cabeçalho da página: título à esquerda, ações à direita. */
export const CabecalhoDaPagina = ({ titulo, acima, abaixo, acoes }: { titulo: string; acima?: ReactNode; abaixo?: ReactNode; acoes?: ReactNode }) => (
    <header className="flex items-end justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-2">
            {acima}
            <h1 className={TITULO_PAGINA}>{titulo}</h1>
            {abaixo}
        </div>
        {acoes && <div className="flex shrink-0 items-center gap-3">{acoes}</div>}
    </header>
);
