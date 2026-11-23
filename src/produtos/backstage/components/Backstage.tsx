import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ComponentType, type CSSProperties, type FC, type HTMLAttributes, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Link, useLocation, useNavigate, useNavigationType } from "react-router";
import { toast } from "sonner";
import { Button as AriaButton, Link as AriaLink, MenuItem as AriaMenuItem, SubmenuTrigger as AriaSubmenuTrigger, type Key } from "react-aria-components";
import {
    LinkExternal01,
    Announcement01,
    UsersPlus,
    Calendar,
    LayoutGrid01,
    ChevronDown,
    ChevronRight,
    Bell01,
    ChevronSelectorVertical,
    Copy01,
    DotsGrid,
    CoinsHand,
    File03,
    Globe01,
    InfoCircle,
    LayoutLeft,
    LayoutTop,
    LogOut01,
    Menu02,
    Moon01,
    Settings01,
    ShoppingCart01,
    LayersTwo01,
    ClipboardCheck,
    Sun,
    SwitchHorizontal01,
    Ticket01,
    Users01,
    XClose,
} from "@untitledui/icons";
import { Avatar } from "@/components/base/avatar/avatar";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { NavButton } from "@/components/application/app-navigation/base-components/nav-button";
import { NavItemBase } from "@/components/application/app-navigation/base-components/nav-item";
import { TreeView } from "@/components/application/tree-view/tree-view";
import { Dot } from "@/components/foundations/dot-icon";
import { cx } from "@/utils/cx";
import { useDoc } from "@/plataforma";
import LogoBlack from "../../../assets/Company logo_black.svg";
import LogoWhite from "../../../assets/Company logo_white.svg";
import { AlterarStatusModal, ORDEM_STATUS } from "../eventos/components/AlterarStatusModal";
import { EVENTO_STATUS_BADGE_COLOR, EVENTO_STATUS_LABEL, eventos, semEventosNaOrganizacao, setEventoStatus, useEventoAtual, useEventosVersao, type EventoStatus } from "../eventos/data/eventos";

/** Logo da Ingresse, clicável, leva para a home do Backstage.
 *  O alvo era a altura da imagem, 20px: no telefone só acertava quem mirasse bem. O padding leva
 *  o alvo a 44px e as margens negativas devolvem o espaço ao layout, para a barra do telefone não
 *  crescer 8px em toda página. */
const BrandLogo = ({ className }: { className?: string }) => {
    const navigate = useNavigate();
    const painel = usePainel();
    return (
        <button
            type="button"
            onClick={() => navigate(INICIO_DO_PAINEL[painel])}
            aria-label={painel === "freepass" ? "Ir para o início do Freepass" : "Ir para a home do Backstage"}
            className="-mx-1 -my-1.5 flex shrink-0 items-center rounded-md px-1 py-3 transition-opacity duration-100 ease-linear hover:opacity-80"
        >
            <img src={LogoBlack} alt="Ingresse" className={cx("block dark:hidden", className)} />
            <img src={LogoWhite} alt="Ingresse" className={cx("hidden dark:block", className)} />
        </button>
    );
};
import { ICONES_ORGANIZACAO } from "./icones-organizacao";
import { abrirSeletorDeOrganizacao, SeletorOrganizacaoModal } from "../organizacoes/components/SeletorOrganizacaoModal";
import { useOrganizacaoAtual } from "../organizacoes/data/organizacao-atual";
import { useTheme } from "@/providers/theme-provider";
import { ThemeToggle } from "./ThemeToggle";
import { RemixDock } from "./remix/RemixShell";
import { GuiaDeConfiguracao } from "../guia-de-configuracao/components/guia-de-configuracao";
import { estadoDoEvento } from "../guia-de-configuracao/data/use-guia";
import { BotaoDoGuia } from "../guia-de-configuracao/components/botao-do-guia";
import { abrirNovidades, Novidades, useNovidadesNaoVistas } from "./novidades";
import { SeletorDeEvento, type OpcaoDeEvento } from "./seletor-de-evento";
import { trocarDeEvento } from "./troca-de-evento";
import { MENU_DO_EVENTO, opcaoDaTela } from "./grupos-do-evento";
import { AbasDeEmissao, LayoutDeRelatorios, ROTAS_COM_ABAS_DE_EMISSAO } from "./navegacao-de-secao";
import { setTodosOsEventos, useTodosOsEventos } from "./escopo-dos-relatorios";
/** Telas do evento usam o alerta do guia por aqui, sem importar de outro projeto. */
export { AlertaDoGuia, PARAMETRO_NOVO_SETOR } from "../guia-de-configuracao/components/guia-de-configuracao";
export { prepararGuiaDoEventoNovo } from "../guia-de-configuracao/data/memoria";
/** Estado do evento lido pelo guia (setores, ingressos, abertura, publicação): a Visão geral usa no vazio. */
export { estadoDoEvento } from "../guia-de-configuracao/data/use-guia";
import { INICIO_DO_PAINEL, usePainel } from "./painel";
import "./transicao-de-tela.css";
import { USUARIO as USUARIO_FREEPASS, abrirEventoNoPainel, useAcessoNoEvento, useMinhasVendas, useSemearComissarios, type AcessoNoEvento } from "../freepass/data/minhas-vendas";
import { FUNCAO_INFO, funcaoDaTela, setVisualizacao, useFuncoesDisponiveis, useVisualizacao, type Funcao, type Visualizacao } from "../freepass/data/funcoes";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Tooltip } from "@/components/base/tooltip/tooltip";

export type BackstageSection =
    | "visao-geral"
    | "equipe-e-permissoes"
    | "informacoes-evento"
    | "itens"
    | "questionario"
    | "pesquisas"
    | "cortesias"
    | "equipe-e-comissarios"
    | "relatorios"
    | "comissarios"
    | "marketing"
    // Compras em grupo é opção direta do menu do evento desde 22/11/2026 (BKS-07).
    | "compras-em-grupo";

export type BackstageItem =
    | "visao-geral"
    | "informacoes-gerais"
    | "permissao-envio"
    | "catalogo-itens"
    | "catalogo-ingressos"
    | "catalogo-combos"
    | "catalogo-produtos"
    | "catalogo-aberturas"
    | "catalogo-configuracoes"
    | "catalogo-questionario"
    | "emissao-cortesias"
    | "bilheteria-online"
    | "equipe-e-comissarios"
    | "vendas-por-grupo"
    | "transacoes"
    | "acesso"
    | "bordero"
    | "transferencias"
    | "comparativos"
    | "relatorio-personalizado"
    | "relatorio-questionarios"
    | "relatorio-comissarios"
    | "lista-de-usuarios"
    | "chave-de-acesso"
    | "cupons"
    | "lotes-sincronizados"
    | "compras-em-grupo"
    | "minhas-vendas-evento"
    | "formularios-compra"
    | "lista-de-espera"
    // Itens planejados, ainda sem tela (aparecem como "Em breve", BKS-07).
    | "etiquetas"
    | "pixel"
    | "visao-do-dia"
    | "indicadores-de-acesso"
    | "reconciliacao"
    | "repasse";

const DISABLED_KEYS: Key[] = [];

/** Uma única instância do modal de status vive no BackstageLayout — qualquer
 *  gatilho dentro do contexto do evento (card desktop, topo mobile, drawer
 *  mobile, ou uma página inteira como "Informações do evento") abre essa
 *  mesma instância em vez de criar a sua própria. */
const EventStatusModalContext = createContext<(statusInicial?: EventoStatus) => void>(() => {});
export const useAbrirModalDeStatus = () => useContext(EventStatusModalContext);

interface BackstageLayoutProps {
    activeSection?: BackstageSection;
    activeItem?: BackstageItem;
    activeProducer?: string;
    /** Mostra o contexto do evento (card + funcionalidades). Default: true. */
    showEventContext?: boolean;
    /** Mostra o switch flutuante de variante de layout (clássico/topbar). Default: true. */
    showLayoutSwitcher?: boolean;
    /** Telas com a mesma chave contam como uma tela só: trocar entre elas não remonta nem anima a moldura (ex.: abas de Itens). Default: a rota. */
    chaveDaTela?: string;
    /** Tela de formulário com barra de salvar: o Guia de configuração começa recolhido para não cobrir campos (GDC-44). */
    recolherGuia?: boolean;
    children: ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Variante de layout — alterna entre a shell clássica (rails         */
/*  laterais) e a nova (barra da organização no topo). Persistida em   */
/*  localStorage para sobreviver à navegação entre páginas.            */
/* ------------------------------------------------------------------ */

type LayoutVariant = "classic" | "topbar";
// v2: a escolha gravada antes de a barra no topo virar padrão (BKS-02) não vale mais.
const LAYOUT_STORAGE_KEY = "backstage-layout-variant:v2";

function useLayoutVariant(): [LayoutVariant, (v: LayoutVariant) => void] {
    const [variant, setVariant] = useState<LayoutVariant>(() => {
        // Barra no topo é o padrão desde 20/11/2026 (BKS-02); a clássica segue no Shift+L.
        if (typeof window === "undefined") return "topbar";
        return window.localStorage.getItem(LAYOUT_STORAGE_KEY) === "classic" ? "classic" : "topbar";
    });
    const update = useCallback((v: LayoutVariant) => {
        setVariant(v);
        try {
            window.localStorage.setItem(LAYOUT_STORAGE_KEY, v);
        } catch {
            /* ignora ambientes sem storage */
        }
    }, []);
    return [variant, update];
}

// O switch de layout é ferramenta de protótipo: fica oculto e alterna com Shift+L.
// Estado no módulo para continuar visível ao navegar entre páginas.
let switcherVisivel = false;
const switcherListeners = new Set<() => void>();

function useSwitcherVisivel() {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const alvo = e.target as HTMLElement | null;
            const digitando = alvo?.closest("input, textarea, select, [contenteditable='true']");
            if (!e.shiftKey || e.metaKey || e.ctrlKey || e.altKey || e.key.toLowerCase() !== "l" || digitando) return;
            switcherVisivel = !switcherVisivel;
            switcherListeners.forEach((l) => l());
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);
    return useSyncExternalStore(
        (fn) => {
            switcherListeners.add(fn);
            return () => switcherListeners.delete(fn);
        },
        () => switcherVisivel,
    );
}

/**
 * Respiro padrão entre o conteúdo da tela e a moldura do template (rails, topo, Remix), o mesmo da
 * tela de Eventos. Fica só aqui: as telas não definem padding externo próprio.
 */
const RESPIRO_DO_CONTEUDO = "px-4 pb-6 md:px-6";

/** Título da aba fora do Backstage (index.html), devolvido ao sair do layout. */
const TITULO_PADRAO = typeof document === "undefined" ? "" : document.title;
/** Último título que o layout escreveu: título diferente deste e do padrão foi a própria tela que pôs (ex.: detalhe do pedido). */
let tituloDoLayout: string | null = null;

/**
 * Título da aba do navegador (BKS-125): "<título da página> · Backstage", lido do h1 visível da tela
 * (o h1 só para leitor de tela entra quando não há um visível); sem h1, só "Backstage". Relê a cada troca
 * de rota e quando a tela termina de renderizar (MutationObserver). Tela que define o próprio título manda.
 */
function useTituloDaAba(sufixo: string) {
    const { pathname } = useLocation();
    useEffect(() => {
        let quadro = 0;
        const atualizar = () => {
            quadro = 0;
            const atual = document.title;
            if (atual !== TITULO_PADRAO && atual !== tituloDoLayout) return;
            const h1s = [...document.querySelectorAll<HTMLElement>("main h1")];
            const h1 = h1s.find((h) => !h.closest(".sr-only") && h.getClientRects().length > 0) ?? h1s[0];
            const texto = h1?.textContent?.replace(/\s+/g, " ").trim();
            const titulo = texto ? `${texto} · ${sufixo}` : sufixo;
            tituloDoLayout = titulo;
            if (atual !== titulo) document.title = titulo;
        };
        const agendar = () => {
            if (!quadro) quadro = requestAnimationFrame(atualizar);
        };
        atualizar();
        const observador = new MutationObserver(agendar);
        observador.observe(document.body, { childList: true, subtree: true, characterData: true });
        return () => {
            observador.disconnect();
            if (quadro) cancelAnimationFrame(quadro);
            if (document.title === tituloDoLayout) document.title = TITULO_PADRAO;
            tituloDoLayout = null;
        };
    }, [pathname, sufixo]);
}

/** Página do evento no site (o mesmo endereço dos cards do site; abre também o evento ainda não publicado, como prévia). BKS-24. */
const paginaDoEventoNoSite = (eventoId: string) => `/novo-site/Evento.dc.html?ev=${encodeURIComponent(eventoId)}`;

export function BackstageLayout({
    activeSection,
    activeItem,
    activeProducer,
    showEventContext = true,
    showLayoutSwitcher = true,
    chaveDaTela,
    recolherGuia = false,
    children,
}: BackstageLayoutProps) {
    const [menuMobile, setMenuMobile] = useState<MenuMobile>(null);
    const { pathname, search } = useLocation();
    const tipoDeNavegacao = useNavigationType();
    // Página nova começa do topo (ex.: da lista para criar ou editar um ingresso). Voltar pelo navegador
    // (POP) mantém a rolagem que o navegador restaura.
    useLayoutEffect(() => {
        if (tipoDeNavegacao !== "POP") window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }, [pathname]);
    // Navegar fecha o menu do celular (o menu do evento navega pelos links da árvore).
    useEffect(() => setMenuMobile(null), [pathname]);
    const [variant, setVariant] = useLayoutVariant();
    const mostrarSwitcher = useSwitcherVisivel();
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [statusInicial, setStatusInicial] = useState<EventoStatus | undefined>(undefined);
    const eventoAtual = useEventoAtual();
    // Freepass: a mesma shell, sem o que é só da produtora (BKS-60 a BKS-66).
    const freepass = usePainel() === "freepass";
    useSemearComissarios(freepass);
    useTituloDaAba(freepass ? "Freepass" : "Backstage");
    // Relatórios (BKS-26): pelo menu da organização, sem o menu do evento e com Relatórios ativo em cima.
    // Pelo menu do evento (`?de=evento`), ficam dentro do evento: com o rail e sem o seletor de evento
    // no topo do relatório (BKS-90).
    const deEvento = new URLSearchParams(search).get("de") === "evento";
    const telaDeRelatorio = !freepass && activeSection === "relatorios";
    const relatoriosDoEvento = telaDeRelatorio && deEvento;
    const relatoriosNaOrganizacao = telaDeRelatorio && !deEvento;
    if (relatoriosNaOrganizacao) {
        showEventContext = false;
        activeProducer = "relatorios";
    }
    // Escopo dos Relatórios (BKS-27): dentro do evento, sempre o evento; pela organização, abre em
    // "Todos os eventos" na entrada, e trocar de relatório mantém a escolha do topo. Sair de um relatório
    // do evento (`?de=evento`) pelo menu da organização é uma entrada: volta a "Todos" (BKS-27). Antes,
    // a tela anterior contava como relatório e o escopo do evento ficava.
    useLayoutEffect(() => {
        if (relatoriosDoEvento) setTodosOsEventos(false);
        else if (relatoriosNaOrganizacao && !ultimaTelaFoiRelatorioDaOrganizacao) setTodosOsEventos(true);
        ultimaTelaFoiRelatorioDaOrganizacao = relatoriosNaOrganizacao;
    }, [pathname, relatoriosDoEvento, relatoriosNaOrganizacao]);
    // Organização sem evento (EVT-99): tela do evento não tem evento para mostrar. Em vez de herdar o
    // evento da organização anterior, volta para Eventos, que mostra o vazio e o "Criar evento" (BKS-06).
    const irPara = useNavigate();
    const semEventos = !freepass && showEventContext && semEventosNaOrganizacao();
    useEffect(() => {
        if (semEventos) irPara("/backstage/eventos", { replace: true });
    }, [semEventos]);
    // Última tela do evento, para o "voltar para o evento" dos Relatórios.
    useEffect(() => {
        if (!showEventContext || freepass) return;
        try {
            window.sessionStorage.setItem(ULTIMA_TELA_DO_EVENTO, pathname);
        } catch {
            /* sem storage, o voltar cai em Informações do evento */
        }
    }, [showEventContext, freepass, pathname]);
    const visao = useVisualizacao();
    // Freepass por funcionalidade (FCO-85): sem menu do evento; a funcionalidade é o item ativo do
    // menu de cima e o evento se troca numa barra acima da tela.
    const porFuncao = freepass && visao === "funcionalidade";
    const funcaoAtual = porFuncao && showEventContext ? funcaoDaTela(activeSection, activeItem) : null;
    if (funcaoAtual) activeProducer = funcaoAtual;
    const railDoEvento = showEventContext && !porFuncao;
    const barraDoFreepass = freepass && <BarraDoFreepass funcao={funcaoAtual} telaDeEvento={showEventContext} />;

    // Rascunho só publica com a abertura de vendas programada (EVT-130): vale para o rail, o celular e o guia.
    const docDoEvento = useDoc("eventos", eventoAtual.id);
    const publicacaoBloqueada = eventoAtual.status === "rascunho" && estadoDoEvento(docDoEvento, false).abertura === "nenhum";
    const abrirModalDeStatus = useCallback(
        (status?: EventoStatus) => {
            if (publicacaoBloqueada) {
                toast.error("Programe a abertura de vendas antes de publicar o evento.");
                return;
            }
            setStatusInicial(status);
            setStatusModalOpen(true);
        },
        [publicacaoBloqueada],
    );

    // "Publicar" do guia fora da tela do evento chega à Visão geral com `?status=publicar` e abre o modal
    // de status já em Publicado (GDC-74). O parâmetro sai da URL para recarregar não abrir de novo.
    const pedeStatus = new URLSearchParams(search).get("status") === "publicar" && showEventContext && !freepass;
    useEffect(() => {
        if (!pedeStatus) return;
        irPara(pathname, { replace: true });
        abrirModalDeStatus("publicado");
    }, [pedeStatus]);

    useEffect(() => {
        if (!menuMobile) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setMenuMobile(null);
        };
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", onKey);
        };
    }, [menuMobile]);

    const mobileChrome = (
        <>
            <MobileTopBar menu={menuMobile} onMenu={setMenuMobile} showEventContext={railDoEvento} telaDeEvento={showEventContext} />
            {menuMobile === "org" && (
                <PainelMobile topo="56px" rotulo="Menu da organização" onFechar={() => setMenuMobile(null)}>
                    <PainelDaOrganizacao activeProducer={activeProducer} onFechar={() => setMenuMobile(null)} />
                </PainelMobile>
            )}
            {menuMobile === "evento" && railDoEvento && (
                <PainelMobile topo="113px" rotulo="Menu do evento" onFechar={() => setMenuMobile(null)}>
                    <div className="flex-1 px-2 py-3">
                        {/* O mesmo menu do rail (BKS-130): links de 44 px, o atual com o ícone invertido e `aria-current`.
                            Tocar no item da própria tela também fecha a gaveta. O Freepass segue com a árvore. */}
                        {freepass ? (
                            <EventFunctionalitiesList activeSection={activeSection} activeItem={activeItem} />
                        ) : (
                            <MenuDoEvento activeSection={activeSection} activeItem={activeItem} onNavegar={() => setMenuMobile(null)} />
                        )}
                    </div>
                    {!freepass && <StatusNoMenuMobile />}
                </PainelMobile>
            )}
        </>
    );

    const statusModal = showEventContext && !freepass && (
        <AlterarStatusModal
            isOpen={statusModalOpen}
            onClose={() => setStatusModalOpen(false)}
            statusAtual={eventoAtual.status}
            statusInicial={statusInicial}
            onConfirm={(novoStatus) => setEventoStatus(eventoAtual.id, novoStatus)}
        />
    );

    // Seções que viraram um item só no menu (BKS-25): Relatórios com o menu empilhado; Emissão com abas nas listas.
    // A navegação fica fora da transição de tela, para não piscar ao trocar de relatório ou de aba.
    const tela = <TransicaoDeTela chave={chaveDaTela}>{children}</TransicaoDeTela>;
    const abaDeEmissao = !freepass ? ROTAS_COM_ABAS_DE_EMISSAO[pathname] : undefined;
    const corpo =
        telaDeRelatorio ? (
            <LayoutDeRelatorios ativo={activeItem} topo={relatoriosDoEvento ? undefined : <EventoDosRelatorios />} voltarPara={destinoDoVoltarAoEvento} dentroDoEvento={relatoriosDoEvento}>
                {tela}
            </LayoutDeRelatorios>
        ) : abaDeEmissao ? (
            <AbasDeEmissao ativa={abaDeEmissao}>{tela}</AbasDeEmissao>
        ) : (
            tela
        );

    // Guia de configuração do evento (guia-de-configuracao/rules.md): segue o produtor pelas telas do evento.
    // Na barra do topo, o botão "Guia" abre o guia em qualquer tela (GDC-60); na clássica, só nas telas do evento.
    const guiaDeConfiguracao = !freepass && (showEventContext || variant === "topbar") && (
        <GuiaDeConfiguracao
            eventoId={eventoAtual.id}
            telaDeEvento={showEventContext}
            abrirModalDeStatus={abrirModalDeStatus}
            recolher={recolherGuia}
            noTopo={variant === "topbar"}
            // A barra do guia no celular sai de cena com a gaveta aberta: cobria o status do evento no rodapé dela (GDC-75).
            gavetaAberta={menuMobile !== null}
        />
    );

    // Shell padrão do Backstage (BKS-92): rail da organização à esquerda, sem a logo; rail do evento ao lado;
    // sino de novidades e Guia numa faixa no canto superior direito. O Freepass segue com a barra do topo.
    if (variant === "topbar" && !freepass) {
        return (
            <EventStatusModalContext.Provider value={abrirModalDeStatus}>
                <div
                    className="min-h-screen bg-primary_alt"
                    // Sem barra no topo, nada gruda abaixo dela. Os botões do topo terminam a 64 px: o painel do guia abre logo abaixo (GDC-16).
                    style={{ "--bs-header-offset": "0px", "--bs-topo-do-guia": "64px" } as CSSProperties}
                >
                    {mobileChrome}
                    <div className="flex flex-col md:flex-row">
                        <RailDaOrganizacao activeProducer={activeProducer} />
                        <RailDoEventoAnimado visivel={railDoEvento} folga={0} largura={256} render={(fantasma) => <RailMinimoDoEvento activeSection={fantasma ? undefined : activeSection} activeItem={fantasma ? undefined : activeItem} />} />
                        <div className="relative flex min-w-0 flex-1 flex-col md:pr-6 md:pl-6">
                            {/* Sino e Guia na linha do título, centrados nela: o título começa a 24 px do topo e tem 46 px de
                                altura; os botões, 36 px (BKS-92). */}
                            <div className="absolute top-7 right-6 z-10 hidden items-center gap-2 md:flex">
                                <Novidades />
                                <BotaoDoGuia />
                            </div>
                            {/* overflow-x-clip: desenhos decorativos (círculos do estado vazio) não alargam a página no celular (BKS-19).
                                Só a linha do título reserva à direita o lugar do sino e do Guia: as ações da tela ficam abaixo
                                do título, à esquerda (BKS-104), e não disputam esse canto. */}
                            <main className="flex min-w-0 flex-1 flex-col overflow-x-clip pt-3 md:pt-6 md:[&_[data-linha-do-titulo]]:pr-40">
                                <div className={cx("flex w-full flex-1 flex-col", RESPIRO_DO_CONTEUDO, "md:px-0")}>
                                    {corpo}
                                    {/* Fim da página livre do Guia de configuração, que é fixo no canto (GDC-43). */}
                                    <div aria-hidden="true" className="h-(--altura-do-guia,0px) shrink-0" />
                                </div>
                            </main>
                        </div>
                        <RemixDock />
                    </div>
                    {showLayoutSwitcher && mostrarSwitcher && <LayoutSwitcher variant={variant} onChange={setVariant} />}
                    {statusModal}
                    {guiaDeConfiguracao}
                    <SeletorOrganizacaoModal />
                </div>
            </EventStatusModalContext.Provider>
        );
    }

    if (variant === "topbar") {
        return (
            <EventStatusModalContext.Provider value={abrirModalDeStatus}>
                <div
                    className="min-h-screen bg-primary_alt"
                    style={{ "--bs-header-offset": "64px" } as CSSProperties}
                >
                    {mobileChrome}
                    <OrgTopBar activeProducer={activeProducer} telaDeEvento={showEventContext} />
                    <div className="flex flex-col gap-3 px-2 py-3 md:flex-row md:gap-6 md:px-6 md:py-6">
                        {/* Backstage: rail mínimo, integrado à página (BKS-86); o Freepass segue com o rail de card. */}
                        {freepass ? (
                            <RailDoEventoAnimado visivel={railDoEvento} folga={24} render={(fantasma) => <EventRailTop activeSection={fantasma ? undefined : activeSection} activeItem={fantasma ? undefined : activeItem} />} />
                        ) : (
                            <RailDoEventoAnimado visivel={railDoEvento} folga={24} largura={320} render={(fantasma) => <RailMinimoDoEvento activeSection={fantasma ? undefined : activeSection} activeItem={fantasma ? undefined : activeItem} />} />
                        )}
                        {/* overflow-x-clip: desenhos decorativos (círculos do estado vazio) não alargam a página no celular (BKS-19). */}
                        <main className="flex min-w-0 flex-1 flex-col overflow-x-clip">
                            {/* Sem largura máxima: a página ocupa toda a largura disponível (BKS-84). */}
                            {/* md:px-0: a moldura já tem os 24 px da barra do topo; somar o respiro desalinhava o conteúdo do menu (BKS-84). */}
                            <div className={cx("flex w-full flex-1 flex-col", RESPIRO_DO_CONTEUDO, "md:px-0")}>
                                {barraDoFreepass}
                                {corpo}
                                {/* Fim da página livre do Guia de configuração, que é fixo no canto (GDC-43). */}
                                <div aria-hidden="true" className="h-(--altura-do-guia,0px) shrink-0" />
                            </div>
                        </main>
                        {!freepass && <RemixDock />}
                    </div>
                    {showLayoutSwitcher && mostrarSwitcher && <LayoutSwitcher variant={variant} onChange={setVariant} />}
                    {statusModal}
                    {guiaDeConfiguracao}
                    {!freepass && <SeletorOrganizacaoModal />}
                </div>
            </EventStatusModalContext.Provider>
        );
    }

    return (
        <EventStatusModalContext.Provider value={abrirModalDeStatus}>
            <div className="min-h-screen bg-primary_alt">
                {mobileChrome}
                <div className="flex min-h-screen flex-col gap-3 px-2 py-3 md:flex-row md:px-3 md:py-6">
                    <ProducerRail activeProducer={activeProducer} />
                    <RailDoEventoAnimado visivel={railDoEvento} folga={12} render={(fantasma) => <EventRail activeSection={fantasma ? undefined : activeSection} activeItem={fantasma ? undefined : activeItem} />} />
                    {/* overflow-x-clip: desenhos decorativos (círculos do estado vazio) não alargam a página no celular (BKS-19). */}
                    <main className={cx("flex min-w-0 flex-1 flex-col overflow-x-clip", RESPIRO_DO_CONTEUDO)}>
                        {barraDoFreepass}
                        {corpo}
                        {/* Fim da página livre do Guia de configuração, que é fixo no canto (GDC-43). */}
                        <div aria-hidden="true" className="h-(--altura-do-guia,0px) shrink-0" />
                    </main>
                    {!freepass && <RemixDock />}
                </div>
                {showLayoutSwitcher && mostrarSwitcher && <LayoutSwitcher variant={variant} onChange={setVariant} />}
                {statusModal}
                {guiaDeConfiguracao}
                {!freepass && <SeletorOrganizacaoModal />}
            </div>
        </EventStatusModalContext.Provider>
    );
}

/** Remonta a cada troca de tela para a entrada animar (BKS-15, transicao-de-tela.css). */
const TransicaoDeTela = ({ chave, children }: { chave?: string; children: ReactNode }) => {
    const { pathname } = useLocation();
    const eventoId = useEventoAtual().id;
    return (
        <div key={`${chave ?? pathname}:${eventoId}`} className="bs-tela flex min-w-0 flex-1 flex-col">
            {children}
        </div>
    );
};

/* ------------------------------------------------------------------ */
/*  Switch flutuante para alternar entre as duas shells.               */
/* ------------------------------------------------------------------ */

const LAYOUT_OPTIONS = [
    { id: "classic", icon: LayoutLeft, label: "Clássico" },
    { id: "topbar", icon: LayoutTop, label: "Novo" },
] as const;

const LayoutSwitcher = ({ variant, onChange }: { variant: LayoutVariant; onChange: (v: LayoutVariant) => void }) => (
    <div className="fixed bottom-4 right-4 z-50 hidden items-center gap-1 rounded-full bg-primary p-1 shadow-lg ring-1 ring-border-secondary md:flex">
        {LAYOUT_OPTIONS.map((opt) => {
            const active = variant === opt.id;
            return (
                <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChange(opt.id)}
                    aria-pressed={active}
                    className={cx(
                        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition duration-100 ease-linear",
                        active ? "bg-secondary text-primary ring-1 ring-border-secondary" : "text-tertiary hover:text-secondary_hover",
                    )}
                >
                    <opt.icon className="size-4" aria-hidden="true" />
                    {opt.label}
                </button>
            );
        })}
    </div>
);

/* ------------------------------------------------------------------ */
/*  Mobile top bar + drawer                                           */
/* ------------------------------------------------------------------ */

type MenuMobile = "org" | "evento" | null;

/** Botão de menu da barra (☰, grade ou ×), como o "_Nav menu button" do Figma. */
const BotaoDoMenu = ({ aberto, icone: Icone, rotulo, onClick }: { aberto: boolean; icone: FC<{ className?: string }>; rotulo: string; onClick: () => void }) => (
    <button
        type="button"
        onClick={onClick}
        aria-expanded={aberto}
        aria-label={aberto ? `Fechar ${rotulo}` : `Abrir ${rotulo}`}
        className="flex shrink-0 items-center justify-center rounded-md p-2 text-fg-secondary outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover focus-visible:outline-2"
    >
        {aberto ? <XClose className="size-5" aria-hidden="true" /> : <Icone className="size-5" aria-hidden="true" />}
    </button>
);

/**
 * Celular (Figma AFTER DS, "_mobile_org menu" e "navbar-event-mobile"): duas barras empilhadas.
 * A da organização (logo e grade) abre os módulos da organização; a do evento (☰, capa, nome e
 * status) abre o menu do evento. Cada uma abre o próprio painel logo abaixo dela.
 */
const MobileTopBar = ({ menu, onMenu, showEventContext, telaDeEvento }: { menu: MenuMobile; onMenu: (m: MenuMobile) => void; showEventContext?: boolean; telaDeEvento?: boolean }) => {
    const freepass = usePainel() === "freepass";
    const evento = useEventoAtual();
    const alternar = (m: Exclude<MenuMobile, null>) => onMenu(menu === m ? null : m);
    return (
        <header className="sticky top-0 z-40 md:hidden">
            <div className="flex h-14 items-center justify-between border-b border-secondary bg-primary py-3 pr-3 pl-4">
                <BrandLogo className="h-5" />
                <span className="flex items-center gap-1">
                    {freepass && <EngrenagemDoFreepass telaDeEvento={telaDeEvento} />}
                    {/* Novidades também no celular (BKS-81, BKS-121); no Freepass não aparece. */}
                    {!freepass && <Novidades />}
                    <BotaoDoMenu aberto={menu === "org"} icone={DotsGrid} rotulo={freepass ? "menu do Freepass" : "menu da organização"} onClick={() => alternar("org")} />
                </span>
            </div>
            {/* Com o menu da organização aberto, só a barra dela fica (como no Figma). */}
            {showEventContext && menu !== "org" && (
                <div className="flex items-center gap-1 border-b border-secondary bg-primary py-1 pr-2 pl-4">
                    <BotaoDoMenu aberto={menu === "evento"} icone={Menu02} rotulo="menu do evento" onClick={() => alternar("evento")} />
                    {freepass ? (
                        <span className="flex min-w-0 flex-1 items-center gap-3 p-1">
                            <CabecaDoEventoNoCelular />
                        </span>
                    ) : (
                        // A barra do evento abre a troca de evento, como o cartão do rail no desktop (BKS-129).
                        <SeletorDeEvento opcoes={opcoesDeEvento()} selecionado={evento.id} onEscolher={trocarDeEvento} placement="bottom">
                            <AriaButton
                                aria-label={`Evento: ${evento.nome}, ${EVENTO_STATUS_LABEL[evento.status]}. Trocar evento`}
                                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 text-left outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover focus-visible:outline-2"
                            >
                                <CabecaDoEventoNoCelular />
                                <ChevronSelectorVertical className="size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />
                            </AriaButton>
                        </SeletorDeEvento>
                    )}
                </div>
            )}
        </header>
    );
};

/** Capa, nome (nome completo no `title`) e status do evento em contexto, na barra do celular. */
const CabecaDoEventoNoCelular = () => {
    const evento = useEventoAtual();
    return (
        <>
            <img src={evento.cover} alt="" className="h-10 w-[30px] shrink-0 rounded-xxs object-cover" />
            <span className="line-clamp-2 min-w-0 flex-1 text-sm font-medium text-primary" title={evento.nome}>
                {evento.nome}
            </span>
            <Badge size="sm" type="pill-color" color={EVENTO_STATUS_BADGE_COLOR[evento.status]} className="shrink-0">
                {EVENTO_STATUS_LABEL[evento.status]}
            </Badge>
        </>
    );
};

/** Eventos da organização em contexto, com capa, data e status, para a troca de evento (BKS-129). */
const opcoesDeEvento = () => eventos.map((e) => ({ id: e.id, nome: e.nome, capa: e.cover, dataLabel: e.dataLabel, status: e.status }));

/** Painel aberto pela barra: fundo escurecido com desfoque e conteúdo à esquerda, 64 px antes da borda. */
const PainelMobile = ({ topo, rotulo, onFechar, children }: { topo: string; rotulo: string; onFechar: () => void; children: ReactNode }) => (
    <div className="fixed inset-x-0 bottom-0 z-30 flex md:hidden" style={{ top: topo }} role="dialog" aria-modal="true" aria-label={rotulo}>
        <button
            type="button"
            aria-label="Fechar menu"
            tabIndex={-1}
            onClick={onFechar}
            className="absolute inset-0 bg-overlay/70 backdrop-blur-[8px] motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
        />
        <div className="relative flex h-full w-[calc(100%-64px)] flex-col overflow-y-auto bg-primary shadow-xl motion-safe:animate-in motion-safe:slide-in-from-left motion-safe:duration-200">
            {children}
        </div>
    </div>
);

/** Ordem dos módulos na grade do celular, como no Figma. */
const ORDEM_ORG_MOBILE = ["eventos", "equipe", "financas", "produtos", "publico", "pedidos", "ajustes"];

/** Usuário fictício do protótipo (o mesmo do Figma). */
const USUARIO = { nome: "Olivia Rhye", email: "olivia@untitledui.com", iniciais: "OR" };

/** Idiomas do menu da conta (BKS-134). A interface só existe em português; os outros avisam e não traduzem. */
const IDIOMAS = [
    { id: "pt-BR", rotulo: "Português (Brasil)" },
    { id: "en-US", rotulo: "English" },
    { id: "es", rotulo: "Español" },
] as const;
const CHAVE_DO_IDIOMA = "backstage-idioma";
const lerIdioma = () => {
    try {
        return window.localStorage.getItem(CHAVE_DO_IDIOMA) ?? "pt-BR";
    } catch {
        return "pt-BR";
    }
};

/**
 * Itens do menu da conta, os mesmos no rail da organização (desktop) e na gaveta do celular (BKS-134):
 * Idioma num submenu, com o atual marcado, e Sair, que volta à tela inicial do protótipo.
 */
const ItensDaConta = ({ antesDeSair }: { antesDeSair?: () => void }) => {
    const navigate = useNavigate();
    const naoVistas = useNovidadesNaoVistas();
    const [idioma, setIdioma] = useState(lerIdioma);
    const escolher = (id: string) => {
        setIdioma(id);
        try {
            window.localStorage.setItem(CHAVE_DO_IDIOMA, id);
        } catch {
            /* sem storage, vale só nesta visita */
        }
        const rotulo = IDIOMAS.find((i) => i.id === id)?.rotulo;
        if (id !== "pt-BR") toast.info(`O protótipo ainda não tem tradução para ${rotulo}. A interface segue em português.`);
    };
    return (
        <>
            {/* Novidades (BKS-136): a contagem do avatar leva para cá; abre o mesmo painel do sino. */}
            <Dropdown.Item
                id="novidades"
                icon={Bell01}
                label="Novidades"
                addon={naoVistas > 0 ? `${naoVistas} ${naoVistas === 1 ? "nova" : "novas"}` : undefined}
                onAction={() => {
                    antesDeSair?.();
                    abrirNovidades();
                }}
            />
            <AriaSubmenuTrigger>
                <Dropdown.Item id="idioma" icon={Globe01} label="Idioma" addon={IDIOMAS.find((i) => i.id === idioma)?.rotulo} />
                <Dropdown.Popover placement="right top" offset={-6} className="w-56">
                    <Dropdown.Menu
                        aria-label="Idioma"
                        selectionMode="single"
                        disallowEmptySelection
                        selectedKeys={new Set([idioma])}
                        onSelectionChange={(chaves) => {
                            const [id] = [...(chaves as Set<Key>)];
                            if (id) escolher(String(id));
                        }}
                    >
                        {IDIOMAS.map((i) => (
                            <Dropdown.Item key={i.id} id={i.id} label={i.rotulo} selectionIndicator="radio" />
                        ))}
                    </Dropdown.Menu>
                </Dropdown.Popover>
            </AriaSubmenuTrigger>
            <Dropdown.Separator />
            <Dropdown.Item
                id="sair"
                icon={LogOut01}
                label="Sair"
                onAction={() => {
                    antesDeSair?.();
                    navigate("/");
                }}
            />
        </>
    );
};

/**
 * Conta no fim do rail da organização (BKS-134): o avatar do DS abre o menu com o nome e o e-mail no alto,
 * Idioma e Sair.
 */
const MenuDaConta = () => {
    const usuario = USUARIO;
    // No lugar do ponto de "online", a contagem de novidades não vistas (BKS-136).
    const naoVistas = useNovidadesNaoVistas();
    return (
        <Dropdown.Root>
            <AriaButton
                aria-label={naoVistas > 0 ? `Conta: ${usuario.nome}, ${naoVistas} ${naoVistas === 1 ? "novidade não vista" : "novidades não vistas"}` : `Conta: ${usuario.nome}`}
                className="cursor-pointer rounded-full outline-focus-ring transition duration-100 ease-linear focus-visible:outline-2 focus-visible:outline-offset-2"
            >
                <Avatar size="md" initials={usuario.iniciais} count={naoVistas || undefined} alt="" />
            </AriaButton>
            <Dropdown.Popover className="w-64" placement="right bottom">
                <div className="flex items-center gap-3 border-b border-secondary px-4 py-3">
                    <Avatar size="md" initials={usuario.iniciais} alt="" />
                    <span className="flex min-w-0 flex-col text-sm">
                        <span className="truncate font-semibold text-primary">{usuario.nome}</span>
                        <span className="truncate text-tertiary">{usuario.email}</span>
                    </span>
                </div>
                <Dropdown.Menu aria-label="Conta">
                    <ItensDaConta />
                </Dropdown.Menu>
            </Dropdown.Popover>
        </Dropdown.Root>
    );
};

/** Menu da organização no celular: troca de organização, módulos em grade e conta no rodapé. */
const PainelDaOrganizacao = ({ activeProducer, onFechar }: { activeProducer?: string; onFechar: () => void }) => {
    const org = useOrganizacaoAtual();
    const freepass = usePainel() === "freepass";
    const nav = useOrgNav();
    const usuario = freepass ? USUARIO_FREEPASS : USUARIO;
    const naoVistas = useNovidadesNaoVistas();
    const { theme, setTheme } = useTheme();
    const escuro = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    return (
        <>
            <div className="flex flex-1 flex-col gap-5 p-4">
                {/* No Freepass não há troca de organização: a pessoa vê os eventos de todas que a liberaram (BKS-63). */}
                {!freepass && (
                <button
                    type="button"
                    onClick={() => {
                        onFechar();
                        abrirSeletorDeOrganizacao();
                    }}
                    aria-label={org ? `Organização: ${org.nome}. Trocar organização` : "Trocar organização"}
                    className="relative flex w-full items-center gap-2 rounded-xl border border-secondary bg-primary_alt p-3 text-left outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover focus-visible:outline-2"
                >
                    <Avatar size="md" rounded={false} initials={org?.sigla ?? "?"} alt="" />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-primary">{org?.nome ?? "Organização"}</span>
                    <ChevronSelectorVertical className="absolute top-[13px] right-[13px] size-4 text-fg-quaternary" aria-hidden="true" />
                </button>
                )}
                <nav aria-label={freepass ? "Áreas do Freepass" : "Módulos da organização"} className="grid grid-cols-3 gap-x-4 gap-y-6">
                    {(freepass ? nav : ORDEM_ORG_MOBILE.map((id) => nav.find((i) => i.id === id)!)).map((item) => {
                        const atual = activeProducer === item.id || (item.id === "eventos" && !activeProducer);
                        // Como o rail do desktop (BKS-124): link do router com `aria-current` e o atual invertido,
                        // visível nos dois temas. Sem destino, não navega (BKS-05). Navegar fecha a gaveta (troca de
                        // rota); tocar no item da própria tela também fecha.
                        const conteudo = (
                            <>
                                <span
                                    className={cx(
                                        "flex items-center justify-center rounded-md p-3 transition duration-100 ease-linear",
                                        atual ? "bg-fg-primary text-bg-primary" : "text-fg-quaternary group-hover:bg-primary_hover",
                                    )}
                                >
                                    <item.icon className="size-5" />
                                </span>
                                <span className={cx("text-center text-xs text-secondary", atual ? "font-semibold" : "font-medium")}>{item.label}</span>
                            </>
                        );
                        const classe = "group flex flex-col items-center gap-1 rounded-md outline-focus-ring focus-visible:outline-2";
                        if (!item.href)
                            return (
                                <span key={item.id} aria-disabled="true" className={cx(classe, "cursor-not-allowed opacity-50")}>
                                    {conteudo}
                                </span>
                            );
                        return (
                            <Link key={item.id} to={item.href} aria-current={atual ? "page" : undefined} onClick={onFechar} className={classe}>
                                {conteudo}
                            </Link>
                        );
                    })}
                </nav>
            </div>
            <div className="px-4 pb-4">
                <Dropdown.Root>
                    <AriaButton className="flex w-full items-center gap-2 border-t border-secondary pt-4 text-left outline-focus-ring focus-visible:outline-2">
                        <Avatar size="md" initials={usuario.iniciais} count={naoVistas || undefined} alt="" />
                        <span className="flex min-w-0 flex-1 flex-col text-sm">
                            <span className="truncate font-semibold text-primary">{usuario.nome}</span>
                            <span className="truncate text-tertiary">{usuario.email}</span>
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />
                    </AriaButton>
                    <Dropdown.Popover className="w-64" placement="top end">
                        <Dropdown.Menu>
                            <Dropdown.Item
                                id="cores"
                                icon={escuro ? Moon01 : Sun}
                                label="Alterar cores"
                                addon={escuro ? "Escuro" : "Claro"}
                                onAction={() => setTheme(escuro ? "light" : "dark")}
                            />
                            <ItensDaConta antesDeSair={onFechar} />
                        </Dropdown.Menu>
                    </Dropdown.Popover>
                </Dropdown.Root>
            </div>
        </>
    );
};

const SECTION_LABELS: Record<BackstageSection, string> = {
    "visao-geral": "Visão geral",
    "equipe-e-permissoes": "Equipe e Permissões",
    "informacoes-evento": "Informações do evento",
    itens: "Ingressos e produtos",
    questionario: "Questionário",
    pesquisas: "Coleta de dados",
    cortesias: "Bilheteria e cortesias",
    "equipe-e-comissarios": "Equipe e Comissários",
    relatorios: "Relatórios",
    comissarios: "Comissários",
    marketing: "Divulgação",
    "compras-em-grupo": "Compras em grupo",
};

const ITEM_LABELS: Record<BackstageItem, string> = {
    "visao-geral": "Visão geral",
    "permissao-envio": "Permissão de envio",
    "catalogo-itens": "Itens",
    "catalogo-ingressos": "Ingressos",
    "catalogo-combos": "Combos",
    "catalogo-produtos": "Produtos",
    "catalogo-aberturas": "Aberturas de vendas",
    "catalogo-configuracoes": "Configurações de ingressos",
    "catalogo-questionario": "Questionário",
    "emissao-cortesias": "Cortesia",
    "bilheteria-online": "Bilheteria online",
    "equipe-e-comissarios": "Equipe e Comissários",
    "vendas-por-grupo": "Vendas",
    transacoes: "Transações",
    acesso: "Acesso",
    bordero: "Borderô",
    transferencias: "Transferências",
    comparativos: "Comparativos",
    "relatorio-personalizado": "Relatório personalizado",
    "relatorio-questionarios": "Respostas do questionário",
    "relatorio-comissarios": "Comissários",
    "chave-de-acesso": "Passkey",
    "minhas-vendas-evento": "Minhas vendas",
    "formularios-compra": "Perguntas por ingresso",
    "lista-de-espera": "Lista de espera",
};

const MobileSectionSelector = ({
    activeSection,
    activeItem,
}: {
    activeSection?: BackstageSection;
    activeItem?: BackstageItem;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const sectionLabel = activeSection ? SECTION_LABELS[activeSection] : null;
    const itemLabel = activeItem ? ITEM_LABELS[activeItem] : null;
    const breadcrumb = sectionLabel
        ? itemLabel
            ? `${sectionLabel} › ${itemLabel}`
            : sectionLabel
        : "Selecionar seção";

    return (
        <div className="flex flex-col">
            <button
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                aria-expanded={isOpen}
                className={cx(
                    "flex items-center justify-between gap-3 rounded-xl bg-secondary px-4 py-3 text-left ring-1 ring-border-secondary transition duration-100 ease-linear hover:bg-secondary_hover",
                    isOpen && "ring-2 ring-brand",
                )}
            >
                <span className="truncate text-sm font-semibold text-primary">
                    {breadcrumb}
                </span>
                <ChevronDown
                    className={cx(
                        "size-5 shrink-0 text-fg-secondary transition-transform duration-150",
                        isOpen && "rotate-180",
                    )}
                />
            </button>
            {isOpen && (
                <div className="mt-2 rounded-xl bg-secondary p-2 ring-1 ring-border-secondary">
                    <EventFunctionalitiesList
                        activeSection={activeSection}
                        activeItem={activeItem}
                    />
                </div>
            )}
        </div>
    );
};

/* ------------------------------------------------------------------ */
/*  Menu de funcionalidades — versão MOBILE (accordion touch).         */
/* ------------------------------------------------------------------ */

interface EventNavItem {
    id: BackstageItem;
    label: string;
    href: string;
    novo?: boolean;
    ia?: boolean;
    /** Outras telas que marcam este item como atual (ex.: Produtos e Combos marcam Ingressos e produtos). */
    ativoEm?: BackstageItem[];
    /** Ainda sem tela: aparece desativado, com o selo "Em breve" (BKS-07). */
    emBreve?: boolean;
}
interface EventNavSection {
    id: BackstageSection;
    label: string;
    icon: FC<{ className?: string }>;
    novo?: boolean;
    /** Seção que é ela mesma o destino, sem itens (ex.: Gerenciamento de cotas). */
    href?: string;
    /** Mantém o grupo mesmo com um destino só (o nome do destino diz mais que o da seção). */
    grupo?: boolean;
    /** Vazio = seção sem destino (apenas rótulo, desabilitada). */
    items: EventNavItem[];
}

/**
 * Seção que vira um destino só (a linha leva direto à página). Vale para o desktop e o celular, que
 * leem a mesma lista: um menu, um desenho (UI-DS-003).
 */
const ehDestinoUnico = (sec: EventNavSection) => !!sec.href || (sec.items.length === 1 && !sec.grupo);
/** Página da seção que é destino único. */
const destinoDaSecao = (sec: EventNavSection) => sec.href ?? sec.items[0]?.href;
/** Telas que se dizem de outra seção, mas moram dentro de um item do menu (BKS-25): a Bilheteria é aba de Bilheteria e cortesias. */
const SECOES_ABRIGADAS: Record<string, string> = { bilheteria: "cortesias" };

/** Destino que ainda não existe ("#") ou seção sem destino: aparece desativado. */
const ehDesativado = (href?: string) => !href || href === "#";

/**
 * Menu do evento por job do produtor (BKS-07): uma opção por grupo, que abre a central do grupo com
 * as funcionalidades em cartões (jornada-do-evento/rules.md). Os grupos moram em grupos-do-evento.ts.
 */
const EVENT_NAV: EventNavSection[] = MENU_DO_EVENTO.map((o) => ({
    id: o.id as BackstageSection,
    label: o.nome,
    icon: o.icone,
    href: o.href,
    items: [],
}));



/**
 * Menu do evento no Freepass (BKS-65): Minhas vendas e só os canais de emissão que a produtora
 * liberou para a pessoa neste evento, com as mesmas telas do Backstage. Pausado, só Minhas vendas.
 */
function navDoFreepass(acesso: AcessoNoEvento | null): EventNavSection[] {
    const funcoes = acesso?.funcoes ?? [];
    const emissao: EventNavItem[] = [];
    if (funcoes.includes("cortesia")) emissao.push({ id: "emissao-cortesias", label: "Cortesia", href: "/freepass/cortesias" });
    if (funcoes.includes("bilheteria")) emissao.push({ id: "bilheteria-online", label: "Bilheteria online", href: "/freepass/bilheteria" });
    return [
        ...(funcoes.includes("vendas")
            ? [{ id: "comissarios" as const, label: "Minhas vendas", icon: CoinsHand, items: [{ id: "minhas-vendas-evento" as const, label: "Minhas vendas", href: "/freepass/evento/vendas" }] }]
            : []),
        ...(emissao.length > 0 ? [{ id: "cortesias" as const, label: "Emissão de ingressos", icon: Ticket01, grupo: true, items: emissao }] : []),
    ];
}

const ItemBadges = ({ item }: { item: EventNavItem }) => (
    <>
        {item.novo && <Badge size="sm" type="pill-color" color="brand">Novo</Badge>}
        {item.ia && <Badge size="sm" type="pill-color" color="brand">IA</Badge>}
        {item.emBreve && <Badge size="sm" type="pill-color" color="gray">Em breve</Badge>}
    </>
);


interface ProducerRailItemProps {
    icon: ComponentType<{ className?: string }>;
    label: string;
    isActive?: boolean;
    href?: string;
}

/**
 * Item do rail da organização (as duas shells): link do router, com o atual marcado para leitor de tela
 * (`aria-current="page"`) e na tela pelo ícone invertido, como o item atual da barra do topo (BKS-85):
 * fundo `fg-primary` e ícone na cor do fundo, visível nos dois temas (BKS-124). Sem destino, não navega (BKS-05).
 */
const ProducerRailItem = ({ icon: Icon, label, isActive, href }: ProducerRailItemProps) => {
    const classe = cx(
        "group flex w-full flex-col items-center gap-1 rounded-md py-2 outline-focus-ring transition duration-100 ease-linear focus-visible:outline-2",
        isActive ? "text-primary" : "text-tertiary hover:text-secondary_hover",
    );
    const conteudo = (
        <>
            <span
                className={cx(
                    "flex size-10 items-center justify-center rounded-lg transition duration-100 ease-linear",
                    isActive ? "bg-fg-primary text-bg-primary" : "group-hover:bg-secondary_hover",
                )}
            >
                <Icon className="size-5" />
            </span>
            <span className={cx("text-center text-xs leading-tight whitespace-pre-line", isActive ? "font-semibold" : "font-medium")}>{label}</span>
        </>
    );
    if (!href)
        return (
            <span aria-disabled="true" className={cx(classe, "cursor-not-allowed opacity-50")}>
                {conteudo}
            </span>
        );
    return (
        <Link to={href} aria-current={isActive ? "page" : undefined} className={classe}>
            {conteudo}
        </Link>
    );
};

/** Organização em contexto no rail clássico: avatar com a sigla; abre a troca (ORG-20). */
const OrganizacaoRail = () => {
    const org = useOrganizacaoAtual();
    if (usePainel() === "freepass") return <Avatar size="md" initials={USUARIO_FREEPASS.iniciais} alt={USUARIO_FREEPASS.nome} />;
    return (
        <button
            type="button"
            onClick={abrirSeletorDeOrganizacao}
            aria-label={org ? `Organização: ${org.nome}. Trocar organização` : "Trocar organização"}
            title={org?.nome}
            className="flex w-full flex-col items-center gap-1.5 rounded-lg py-1 outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
        >
            <Avatar size="md" initials={org?.sigla ?? "?"} alt="" />
            {/* Nome abaixo do avatar, em até duas linhas, com o seletor à direita (BKS-69). */}
            <span className="flex w-full items-center justify-center gap-0.5">
                <span className="line-clamp-2 min-w-0 text-center text-sm leading-tight font-medium text-secondary break-words">{org?.nome ?? "Organização"}</span>
                <ChevronSelectorVertical className="size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />
            </span>
        </button>
    );
};

/** Chip da organização em contexto: barra do topo e gaveta mobile. Abre a troca (ORG-20). */
/**
 * Organização no canto direito da barra do topo (BKS-83): o chip abre um menu com a troca de
 * organização, Membros, Ajustes e o tema.
 */
const MenuDaOrganizacao = ({ noRail = false }: { noRail?: boolean }) => {
    const org = useOrganizacaoAtual();
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();
    const escuro = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    return (
        <Dropdown.Root>
            {noRail ? (
                // No rail (BKS-92): avatar, nome embaixo em até duas linhas e o seletor à direita do nome (BKS-69).
                <AriaButton
                    aria-label={org ? `Organização: ${org.nome}. Abrir menu da organização` : "Abrir menu da organização"}
                    className="flex w-full flex-col items-center gap-1.5 rounded-lg py-1 outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                    <Avatar size="md" initials={org?.sigla ?? "?"} alt="" />
                    <span className="flex w-full items-center justify-center gap-0.5">
                        <span className="line-clamp-2 min-w-0 text-center text-sm leading-tight font-medium break-words text-secondary">{org?.nome ?? "Organização"}</span>
                        <ChevronSelectorVertical className="size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />
                    </span>
                </AriaButton>
            ) : (
                <AriaButton
                    aria-label={org ? `Organização: ${org.nome}. Abrir menu da organização` : "Abrir menu da organização"}
                    className="flex min-w-0 shrink-0 items-center gap-2 rounded-full bg-secondary py-1.5 pr-2.5 pl-1.5 ring-1 ring-border-secondary outline-focus-ring transition duration-100 ease-linear hover:bg-secondary_hover focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                    <Avatar size="xs" initials={org?.sigla ?? "?"} alt="" />
                    <span className="max-w-48 truncate text-sm font-semibold text-primary">{org?.nome ?? "Organização"}</span>
                    <ChevronDown className="size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />
                </AriaButton>
            )}
            <Dropdown.Popover className="w-64" placement={noRail ? "right top" : "bottom end"}>
                <Dropdown.Menu>
                    <Dropdown.Item id="trocar" icon={SwitchHorizontal01} label="Trocar organização" addon="⌘K" onAction={abrirSeletorDeOrganizacao} />
                    <Dropdown.Separator />
                    <Dropdown.Item id="membros" icon={Users01} label="Membros" onAction={() => navigate("/backstage/membros")} />
                    <Dropdown.Item id="ajustes" icon={Settings01} label="Ajustes" onAction={() => navigate("/backstage/ajustes")} />
                    <Dropdown.Separator />
                    <Dropdown.Item
                        id="tema"
                        icon={escuro ? Moon01 : Sun}
                        label="Trocar tema"
                        addon={escuro ? "Escuro" : "Claro"}
                        onAction={() => setTheme(escuro ? "light" : "dark")}
                    />
                </Dropdown.Menu>
            </Dropdown.Popover>
        </Dropdown.Root>
    );
};

const OrganizacaoChip = ({ className, largo }: { className?: string; largo?: boolean }) => {
    const org = useOrganizacaoAtual();
    if (usePainel() === "freepass")
        return (
            <span className={cx("flex min-w-0 shrink-0 items-center gap-2", className)}>
                <Avatar size="xs" initials={USUARIO_FREEPASS.iniciais} alt="" />
                <span className="max-w-48 truncate text-sm font-semibold text-primary">{USUARIO_FREEPASS.nome}</span>
            </span>
        );
    return (
        <button
            type="button"
            onClick={abrirSeletorDeOrganizacao}
            aria-label={org ? `Organização: ${org.nome}. Trocar organização` : "Trocar organização"}
            className={cx(
                "flex min-w-0 shrink-0 items-center gap-2 rounded-full bg-secondary py-1.5 pr-2.5 pl-1.5 ring-1 ring-border-secondary transition duration-100 ease-linear hover:bg-secondary_hover",
                largo && "w-full rounded-lg py-2",
                className,
            )}
        >
            <Avatar size="xs" initials={org?.sigla ?? "?"} alt="" />
            <span className={cx("truncate text-sm font-semibold text-primary", largo ? "flex-1 text-left" : "max-w-48")}>{org?.nome ?? "Organização"}</span>
            <ChevronDown className="size-4 shrink-0 text-fg-quaternary" />
        </button>
    );
};

const ProducerRail = ({ activeProducer }: { activeProducer?: string }) => {
    const nav = useOrgNav();
    return (
    <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-[100px] shrink-0 flex-col items-center justify-between rounded-2xl p-2 lg:flex">
        <div className="flex w-full flex-col items-center gap-4">
            <OrganizacaoRail />
            <nav className="flex flex-col items-center gap-1">
                {nav.map((item) => (
                    <ProducerRailItem
                        key={item.id}
                        icon={item.icon}
                        label={item.label}
                        href={item.href}
                        isActive={activeProducer === item.id || (item.id === "eventos" && !activeProducer)}
                    />
                ))}
            </nav>
        </div>
        {/* O tema saiu do rail: fica em Ajustes, Tema da interface (ORG-45, BKS-68). */}
    </aside>
    );
};

interface EventRailProps {
    activeSection?: BackstageSection;
    activeItem?: BackstageItem;
}

/** Scrollbar suave (fino, track transparente, thumb em cor de borda) — evita
 *  o contraste alto do scrollbar global dentro do card branco do menu. */
const SOFT_SCROLLBAR =
    "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--color-border-secondary)] hover:[&::-webkit-scrollbar-thumb]:bg-[var(--color-border-primary)]";

/**
 * Rail do evento: cartão compacto e menu. Ao abrir a página, rola até o item ativo e o marca como a
 * página atual (UI-NAV-004), para ele nunca ficar abaixo da dobra.
 */
const RailDoEvento = ({ activeSection, activeItem, className }: EventRailProps & { className: string }) => {
    const ref = useRef<HTMLElement>(null);
    const freepass = usePainel() === "freepass";
    useEffect(() => {
        // Espera o grupo do item abrir (o menu expande num efeito) antes de medir.
        const id = window.setTimeout(() => {
            const rail = ref.current;
            if (!rail) return;
            // Na árvore (Freepass), a linha ativa recebe o `aria-current`; no menu de links, o link já o tem (BKS-130).
            rail.querySelectorAll('[role="row"][aria-current="page"]').forEach((el) => el.removeAttribute("aria-current"));
            const ativo = rail.querySelector(".item-ativo");
            const linha = ativo?.closest('[role="row"]') ?? ativo;
            if (!linha) return;
            if (linha.getAttribute("role") === "row") linha.setAttribute("aria-current", "page");
            const r = rail.getBoundingClientRect();
            const l = linha.getBoundingClientRect();
            if (l.bottom > r.bottom - 12 || l.top < r.top) rail.scrollTop += l.top - r.top - r.height / 3;
        }, 60);
        return () => window.clearTimeout(id);
    }, [activeSection, activeItem]);
    return (
        <aside ref={ref} className={cx("hidden w-[280px] shrink-0 flex-col gap-3 overflow-y-auto rounded-2xl bg-primary md:flex [&>*]:shrink-0", SOFT_SCROLLBAR, className)}>
            {/* Filhos sem encolher: em tela baixa o rail rola, em vez de espremer e cortar o cartão do evento (BKS-66). */}
            <EventDetailsCard />
            {freepass ? <EventFunctionalitiesList activeSection={activeSection} activeItem={activeItem} /> : <MenuDoEvento activeSection={activeSection} activeItem={activeItem} />}
        </aside>
    );
};

const EventRail = (props: EventRailProps) => <RailDoEvento {...props} className="sticky top-6 h-[calc(100vh-3rem)]" />;

/*
 * Rail do evento na barra do topo (BKS-86): sem fundo próprio, integrado à página. No alto, um card
 * mínimo do evento (miniatura, data e nome) que abre a troca de evento, com o status e o link da
 * página; abaixo, o menu do evento em lista vertical (NavItem do DS).
 */
const RailMinimoDoEvento = ({ activeSection, activeItem }: { activeSection?: BackstageSection; activeItem?: BackstageItem }) => {
    useEventosVersao();
    const evento = useEventoAtual();
    const copiarId = () =>
        navigator.clipboard
            ?.writeText(evento.id)
            .then(() => toast.success("ID do evento copiado."))
            .catch(() => toast.error("Não foi possível copiar o ID."));
    return (
        <aside
            aria-label="Evento"
            className={cx(
                // 24 px do topo e do pé da tela, o mesmo respiro do topo das páginas (BKS-133); colado ao rail da organização (BKS-92).
                "sticky top-6 my-6 hidden h-[calc(100dvh-3rem)] w-64 shrink-0 flex-col md:flex",
            )}
        >
            {/* Um card só, da altura do rail: o evento no alto e o menu embaixo (BKS-133). Só a capa encolhe com a
                altura da tela; o resto fica inteiro, e o card só rola se nem a capa mínima couber. */}
            <div className={cx("flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-2xl bg-primary p-2 [&>*]:shrink-0", SOFT_SCROLLBAR)}>
                {/* Capa com o status no canto de cima e a data no de baixo, como o card do evento na lista. Em 3:4
                    quando há altura; em tela baixa, encolhe até 128 px, e a arte aparece inteira (contain). */}
                <div className="relative aspect-[3/4] max-h-full min-h-32 !shrink overflow-hidden rounded-xl">
                    {/* Fundo: a mesma arte em cover, desfocada e a 20%; por cima, a arte inteira em contain, sem recorte (BKS-133). */}
                    {/* `filter: blur` (não backdrop-blur): o desfoque também apaga a borda da própria imagem, então ela passa 48 px
                        de cada lado da área recortada; com só 110% (12 px), as bordas ficavam sem desfoque. */}
                    <img
                        src={evento.cover}
                        alt=""
                        aria-hidden="true"
                        className="absolute -inset-12 h-[calc(100%+6rem)] w-[calc(100%+6rem)] max-w-none object-cover object-center opacity-20 blur-xl"
                    />
                    <img src={evento.cover} alt="" className="absolute inset-0 size-full object-contain object-center" />
                    <Badge size="sm" type="pill-color" color={EVENTO_STATUS_BADGE_COLOR[evento.status]} className="absolute top-2 left-2">
                        {EVENTO_STATUS_LABEL[evento.status]}
                    </Badge>
                    {evento.day && (
                        <span
                            aria-hidden="true"
                            className="absolute right-2 bottom-2 flex min-w-14 flex-col items-center rounded-lg bg-primary/90 px-2 py-1.5 text-primary shadow-xs backdrop-blur-sm"
                        >
                            <span className="text-sm font-medium text-secondary uppercase">{evento.weekday}</span>
                            <span className="text-xl leading-6 font-semibold">{evento.day}</span>
                            <span className="text-sm font-medium text-secondary uppercase">{evento.month}</span>
                        </span>
                    )}
                </div>

                <div className="flex flex-col gap-1 px-1">
                    <div className="flex items-center gap-1">
                        <span className="min-w-0 flex-1 truncate text-sm text-tertiary" title={evento.id}>
                            ID: {evento.id}
                        </span>
                        <ButtonUtility size="xs" color="tertiary" icon={Copy01} tooltip="Copiar ID do evento" onPress={copiarId} className="shrink-0" />
                    </div>
                    {/* Só o nome, sem trocar de evento por aqui (BKS-133, desde 23/11/2026): a troca fica em Eventos, no rail da
                        organização. Até duas linhas; o inteiro fica no `title`. */}
                    <h2 className="line-clamp-2 text-lg leading-6 font-semibold text-primary" title={evento.nome}>
                        {evento.nome}
                    </h2>
                    {evento.produtor && <span className="truncate text-sm text-tertiary">{evento.produtor}</span>}
                </div>

                {/* Abrir a página do evento no site, em outra aba (BKS-24), e o status ao lado (Publicar evento no rascunho). */}
                <div className="flex items-start gap-2 px-1">
                    <ButtonUtility size="sm" color="secondary" icon={LinkExternal01} tooltip="Abrir página do evento" href={paginaDoEventoNoSite(evento.id)} target="_blank" className="shrink-0" />
                    <div className="min-w-0 flex-1">
                        <SeletorDeStatus />
                    </div>
                </div>

                {/* Divisor entre o evento e o menu, que mora no mesmo card. */}
                <hr className="mx-1 border-secondary" />

                {/* Menu do evento (BKS-07, BKS-130). */}
                <MenuDoEvento activeSection={activeSection} activeItem={activeItem} />
            </div>
        </aside>
    );
};

/*
 * Entrada e saída do rail do evento (BKS-29). Cada tela monta o próprio layout, então o rail some e
 * volta a cada rota: guardamos se a tela anterior tinha rail. Entrando no evento, ele desliza da
 * esquerda para a direita; saindo para a organização, uma cópia dele desliza da direita para a
 * esquerda enquanto encolhe, e o conteúdo ocupa o espaço. Entre telas do evento, fica parado.
 */
let railNaTelaAnterior = false;
const ENTRADA_DO_RAIL = { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const };
const SAIDA_DO_RAIL = { duration: 0.3, ease: [0.4, 0, 1, 1] as const };

const RailDoEventoAnimado = ({ visivel, folga, render, largura = 280 }: { visivel: boolean; folga: number; render: (fantasma: boolean) => ReactNode; largura?: number }) => {
    const reduzir = useReducedMotion();
    const [entra] = useState(() => visivel && !railNaTelaAnterior);
    const [sai, setSai] = useState(() => !visivel && railNaTelaAnterior);
    useEffect(() => {
        railNaTelaAnterior = visivel;
    }, [visivel]);

    if (visivel)
        return (
            <motion.div
                className="hidden shrink-0 md:block"
                initial={entra && !reduzir ? { x: -48, opacity: 0 } : false}
                animate={{ x: 0, opacity: 1 }}
                transition={ENTRADA_DO_RAIL}
            >
                {render(false)}
            </motion.div>
        );
    if (!sai || reduzir) return null;
    return (
        <motion.div
            aria-hidden="true"
            inert
            className="hidden shrink-0 overflow-hidden md:block"
            initial={{ width: largura, marginRight: 0, x: 0, opacity: 1 }}
            animate={{ width: 0, marginRight: -folga, x: -48, opacity: 0 }}
            transition={SAIDA_DO_RAIL}
            onAnimationComplete={() => setSai(false)}
        >
            <div className="h-full" style={{ width: largura }}>{render(true)}</div>
        </motion.div>
    );
};

/* ------------------------------------------------------------------ */
/*  Nova shell — barra horizontal da organização no topo.              */
/* ------------------------------------------------------------------ */

const ORG_NAV: Array<{ id: string; icon: ComponentType<{ className?: string }>; label: string; href?: string }> = [
    { id: "eventos", icon: ICONES_ORGANIZACAO.eventos, label: "Eventos", href: "/backstage/eventos" },
    { id: "relatorios", icon: ICONES_ORGANIZACAO.relatorios, label: "Relatórios", href: "/backstage/relatorios/vendas-por-grupo" },
    // Comissários saiu da organização (ECO-09): o item volta a ser só Membros.
    { id: "equipe", icon: ICONES_ORGANIZACAO.membros, label: "Membros", href: "/backstage/membros" },
    { id: "financas", icon: ICONES_ORGANIZACAO.financas, label: "Finanças", href: "/backstage/financas" },
    { id: "pedidos", icon: ICONES_ORGANIZACAO.pedidos, label: "Pedidos", href: "/backstage/pedidos" },
    { id: "produtos", icon: ICONES_ORGANIZACAO.produtos, label: "Produtos", href: "/backstage/produtos" },
    { id: "publico", icon: ICONES_ORGANIZACAO.publico, label: "Público", href: "/backstage/publico" },
    { id: "ajustes", icon: ICONES_ORGANIZACAO.ajustes, label: "Ajustes", href: "/backstage/ajustes" },
];

/**
 * Freepass: só o que é da pessoa (BKS-62). Por evento: Eventos. Por funcionalidade: uma entrada
 * por funcionalidade que ela tem em algum evento. Recebimentos só para quem vende pelo link.
 */
function useOrgNav(): typeof ORG_NAV {
    const freepass = usePainel() === "freepass";
    const visao = useVisualizacao();
    const funcoes = useFuncoesDisponiveis();
    if (!freepass) return ORG_NAV;
    const recebimentos = funcoes.includes("vendas") ? [{ id: "recebimentos", icon: ICONES_ORGANIZACAO.financas, label: "Recebimentos", href: "/freepass/recebimentos" }] : [];
    if (visao === "evento") return [{ id: "eventos", icon: ICONES_ORGANIZACAO.eventos, label: "Eventos", href: "/freepass/eventos" }, ...recebimentos];
    return [...funcoes.map((f) => ({ id: f, icon: FUNCAO_INFO[f].icone, label: FUNCAO_INFO[f].rotulo, href: FUNCAO_INFO[f].lista })), ...recebimentos];
}

/* ------------------------------------------------------------------ */
/*  Freepass: engrenagem da visualização e troca de evento             */
/* ------------------------------------------------------------------ */

const VISUALIZACOES: Array<{ id: Visualizacao; label: string; icon: FC<{ className?: string }> }> = [
    { id: "evento", label: "Por evento", icon: Calendar },
    { id: "funcionalidade", label: "Por funcionalidade", icon: LayoutGrid01 },
];

/**
 * Engrenagem do canto superior direito (FCO-86): alterna entre ver por evento (como o Backstage)
 * e por funcionalidade. Numa tela de evento, fica nela; numa lista, volta para o início da visão.
 */
const EngrenagemDoFreepass = ({ telaDeEvento }: { telaDeEvento?: boolean }) => {
    const navigate = useNavigate();
    const visao = useVisualizacao();
    return (
        <Dropdown.Root>
            <ButtonUtility icon={Settings01} size="sm" color="tertiary" tooltip="Visualização do Freepass" aria-label="Visualização do Freepass" />
            <Dropdown.Popover className="w-60" placement="bottom end">
                <Dropdown.Menu
                    aria-label="Visualização do Freepass"
                    selectionMode="single"
                    selectedKeys={[visao]}
                    onAction={(k) => {
                        const nova = k as Visualizacao;
                        if (nova === visao) return;
                        setVisualizacao(nova);
                        if (!telaDeEvento) navigate("/freepass");
                    }}
                >
                    {VISUALIZACOES.map((v) => (
                        <Dropdown.Item key={v.id} id={v.id} icon={v.icon} label={v.label} />
                    ))}
                </Dropdown.Menu>
            </Dropdown.Popover>
        </Dropdown.Root>
    );
};

/** Troca de evento dentro da funcionalidade, no lugar do menu do evento (FCO-85). */
const ULTIMA_TELA_DO_EVENTO = "backstage-ultima-tela-do-evento";

/** De onde o "voltar para o evento" dos Relatórios volta: a última tela do evento aberta, ou a Visão geral. */
export function destinoDoVoltarAoEvento() {
    try {
        return window.sessionStorage.getItem(ULTIMA_TELA_DO_EVENTO) ?? "/backstage/evento/visao-geral";
    } catch {
        return "/backstage/evento/visao-geral";
    }
}

/** A tela anterior era um relatório pela organização? Sobrevive à troca de página (cada página monta o próprio layout). */
let ultimaTelaFoiRelatorioDaOrganizacao = false;

/** Topo dos Relatórios: qual evento está sendo visto, com a troca entre os eventos da organização (BKS-26). */
const EventoDosRelatorios = () => {
    useEventosVersao();
    const todos = useTodosOsEventos();
    return (
        <CabecaDeEvento
            legenda={todos ? "Relatórios da organização" : "Relatórios do evento"}
            atual={todos ? { id: "todos", nome: "Todos os eventos" } : undefined}
            opcoes={[{ id: "todos", nome: "Todos os eventos" }, ...opcoesDeEvento()]}
            onEscolher={(id) => {
                if (id === "todos") return setTodosOsEventos(true);
                setTodosOsEventos(false);
                trocarDeEvento(id);
            }}
        />
    );
};

/**
 * Evento em contexto com a troca de evento: capa, legenda e o nome que abre a lista. Usado na barra do
 * Freepass (eventos da pessoa) e no topo dos Relatórios (eventos da organização, BKS-26).
 */
export const CabecaDeEvento = ({
    legenda,
    opcoes,
    onEscolher,
    atual,
}: {
    legenda: string;
    opcoes: OpcaoDeEvento[];
    onEscolher: (id: string) => void;
    /** Mostra outra coisa no lugar do evento em contexto (ex.: "Todos os eventos"), com ícone no lugar da capa. */
    atual?: { id: string; nome: string };
}) => {
    const evento = useEventoAtual();
    return (
        <div className="flex min-w-0 items-center gap-3">
            {atual ? (
                <span className="flex h-10 w-[30px] shrink-0 items-center justify-center rounded-xxs bg-secondary ring-1 ring-secondary ring-inset" aria-hidden="true">
                    <LayersTwo01 className="size-4 text-fg-quaternary" />
                </span>
            ) : (
                <img src={evento.cover} alt="" className="h-10 w-[30px] shrink-0 rounded-xxs object-cover" />
            )}
            <div className="flex min-w-0 flex-col">
                <span className="text-sm text-tertiary">{legenda}</span>
                {/* A mesma troca do rail (BKS-129): busca, data e status; o nome inteiro no `title`. */}
                <SeletorDeEvento opcoes={opcoes} selecionado={atual?.id ?? evento.id} onEscolher={onEscolher}>
                    <AriaButton
                        aria-label={`${legenda}: ${atual?.nome ?? evento.nome}. Trocar`}
                        className="flex min-w-0 items-center gap-1 rounded-md text-left text-md font-semibold text-primary outline-focus-ring hover:text-secondary_hover focus-visible:outline-2"
                    >
                        <span className="truncate" title={atual?.nome ?? evento.nome}>
                            {atual?.nome ?? evento.nome}
                        </span>
                        <ChevronDown className="size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />
                    </AriaButton>
                </SeletorDeEvento>
            </div>
        </div>
    );
};

const TrocaDeEvento = ({ funcao }: { funcao: Funcao }) => {
    const { participacoes } = useMinhasVendas();
    const opcoes = participacoes.filter((p) => p.funcoes.includes(funcao));
    return (
        <CabecaDeEvento
            legenda={`${FUNCAO_INFO[funcao].titulo} do evento`}
            opcoes={opcoes.map((p) => ({ id: p.evento.id, nome: p.evento.nome }))}
            onEscolher={(id) => {
                const p = opcoes.find((x) => x.evento.id === id);
                if (p) abrirEventoNoPainel(p.evento);
            }}
        />
    );
};

/**
 * Barra acima da tela no Freepass: a troca de evento (por funcionalidade) e a engrenagem no canto
 * superior direito. No celular a engrenagem fica na barra do topo; na shell Novo, na barra da organização.
 */
const BarraDoFreepass = ({ funcao, telaDeEvento }: { funcao: Funcao | null; telaDeEvento?: boolean }) => {
    const [variant] = useLayoutVariant();
    const engrenagemAqui = variant === "classic";
    if (!funcao && !engrenagemAqui) return null;
    return (
        <div className={cx("flex items-center justify-between gap-3 pb-4", !funcao && "max-md:hidden")}>
            {funcao ? <TrocaDeEvento funcao={funcao} /> : <span />}
            {engrenagemAqui && (
                <span className="max-md:hidden">
                    <EngrenagemDoFreepass telaDeEvento={telaDeEvento} />
                </span>
            )}
        </div>
    );
};

const NO_MENU_DA_ORGANIZACAO = ["equipe", "ajustes"];
const ORDEM_DA_BARRA_DO_TOPO = ["eventos", "produtos", "pedidos", "financas", "relatorios", "publico"];
/** Nomes que mudam só na barra do topo (BKS-87). */
const ROTULOS_DA_BARRA_DO_TOPO: Record<string, string> = { pedidos: "Vendas" };

/**
 * Menu da organização da shell padrão (barra do topo do Freepass e rail da organização, BKS-92): sem
 * Membros e Ajustes (ficam no menu do avatar, BKS-83), na ordem de BKS-89 e com os nomes de BKS-87.
 */
function useNavDaOrganizacao(freepass: boolean) {
    const nav = useOrgNav().filter((item) => freepass || !NO_MENU_DA_ORGANIZACAO.includes(item.id));
    if (!freepass) nav.sort((a, b) => ORDEM_DA_BARRA_DO_TOPO.indexOf(a.id) - ORDEM_DA_BARRA_DO_TOPO.indexOf(b.id));
    return nav.map((item) => ({ ...item, label: (!freepass && ROTULOS_DA_BARRA_DO_TOPO[item.id]) || item.label }));
}

/**
 * Rail da organização da shell padrão (BKS-92): sem a logo; no alto, o avatar que abre o menu da
 * organização; os itens no centro da altura da tela. Sem fundo próprio, integrado à página.
 */
const RailDaOrganizacao = ({ activeProducer }: { activeProducer?: string }) => {
    const nav = useNavDaOrganizacao(false);
    return (
        <aside aria-label="Menu da organização" className="sticky top-0 hidden h-dvh w-[100px] shrink-0 grid-rows-[1fr_auto_1fr] px-2 py-6 md:grid">
            <div className="self-start">
                <MenuDaOrganizacao noRail />
            </div>
            <nav className="flex flex-col items-center gap-1">
                {nav.map((item) => (
                    <ProducerRailItem
                        key={item.id}
                        icon={item.icon}
                        label={item.label}
                        href={item.href}
                        isActive={activeProducer === item.id || (item.id === "eventos" && !activeProducer)}
                    />
                ))}
            </nav>
            {/* Terceira linha: a conta no fim do rail (BKS-134); o menu segue no centro exato da altura. */}
            <div className="flex justify-center self-end">
                <MenuDaConta />
            </div>
        </aside>
    );
};

const OrgTopBar = ({ activeProducer, telaDeEvento }: { activeProducer?: string; telaDeEvento?: boolean }) => {
    const navigate = useNavigate();
    const freepass = usePainel() === "freepass";
    // Membros e Ajustes ficam no menu da organização, no chip à direita (BKS-83).
    const nav = useNavDaOrganizacao(freepass);
    return (
        // Sem fundo próprio: a barra tem a cor da página (opaca só para o conteúdo não aparecer por baixo ao rolar) e uma borda de baixo bem próxima do fundo (BKS-85).
        <header className="sticky top-0 z-30 hidden border-b border-tertiary bg-primary_alt md:block">
            {/* Logo à esquerda e ações à direita; o menu fica no centro exato da tela, por posição absoluta,
                para não deslocar quando os lados têm larguras diferentes (BKS-80). */}
            <div className="relative flex h-16 items-center justify-between gap-3 px-4 md:px-6">
                <BrandLogo className="h-6 shrink-0" />
                <nav className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-0.5">
                    {nav.map((item) => {
                        const current = activeProducer === item.id || (item.id === "eventos" && !activeProducer);
                        return (
                            <NavButton
                                key={item.id}
                                icon={item.icon}
                                current={current}
                                href={item.href ?? "#"}
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (item.href) navigate(item.href);
                                }}
                                tooltipPlacement="bottom"
                                // Item atual invertido: fundo fg-primary com texto e ícone na cor do fundo da página (BKS-85).
                                className={cx(
                                    "bg-transparent text-tertiary",
                                    current && "bg-fg-primary hover:bg-fg-primary [&_span]:!text-bg-primary [&_svg]:!text-bg-primary",
                                )}
                            >
                                {item.label}
                            </NavButton>
                        );
                    })}
                </nav>
                <div className="flex items-center justify-end gap-3">
                    {freepass && <EngrenagemDoFreepass telaDeEvento={telaDeEvento} />}
                    {/* No Backstage o tema fica no menu da organização (BKS-83); no Freepass, que não tem o menu, segue aqui. */}
                    {freepass && <ThemeToggle />}
                    {/* Novidades e o guia da organização (BKS-81, GDC-60); no Freepass não aparecem. */}
                    {!freepass && <Novidades />}
                    {!freepass && <BotaoDoGuia />}
                    <span className="h-6 w-px shrink-0 bg-border-secondary" aria-hidden="true" />
                    {freepass ? <OrganizacaoChip /> : <MenuDaOrganizacao />}
                </div>
            </div>
        </header>
    );
};

/** Menu do evento à esquerda na nova shell (offset abaixo da barra do topo). */
const EventRailTop = (props: EventRailProps) => <RailDoEvento {...props} className="sticky top-22 h-[calc(100vh-7rem)]" />;

/* Mesma paleta que BadgeWithDot usa por trás do badge de status (ver
   colors.styles[cor].addon em badges.tsx) — o ponto ao lado do nome do status
   lê como a mesma cor do badge em qualquer lugar do produto, não uma nova. */
const STATUS_DOT_COR: Record<EventoStatus, string> = {
    rascunho: "text-utility-yellow-500",
    privado: "text-utility-blue-500",
    publicado: "text-utility-green-500",
    encerrado: "text-utility-neutral-500",
};

/** Legenda curta por opção — versão enxuta da explicação mais longa que já existe em
 *  EVENTO_STATUS_DESCRICAO (usada no modal): aqui é só um lembrete de uma linha ao lado
 *  do nome, o modal continua sendo o lugar com a explicação completa antes de confirmar. */
const STATUS_DESCRICAO_CURTA: Record<EventoStatus, string> = {
    rascunho: "Vendas desligadas",
    privado: "Ligadas, só com o link",
    publicado: "Ligadas, sem restrição",
    encerrado: "Vendas encerradas",
};

/**
 * Cartão do evento no rail (desktop). A capa (banner 4:5) fica acima do nome, na largura toda do
 * cartão e sem espaçamento (BKS-24); o resto vem embaixo. O status aparece num lugar só, no seletor.
 */
const EventDetailsCard = () => {
    const evento = useEventoAtual();
    const freepass = usePainel() === "freepass";

    return (
        <div className="flex flex-col gap-3 overflow-hidden rounded-2xl bg-secondary pb-3">
            <img src={evento.cover} alt="" className="aspect-[4/5] w-full object-cover" />
            <div className="flex items-start gap-3 px-3">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm text-tertiary">ID: {evento.id}</span>
                    <h3 className="line-clamp-2 text-sm font-bold text-primary" title={evento.nome}>
                        {evento.nome}
                    </h3>
                </div>
                {/* Abre a página do evento no site, em outra aba (BKS-24). */}
                <ButtonUtility size="sm" color="tertiary" icon={LinkExternal01} tooltip="Abrir página do evento" href={paginaDoEventoNoSite(evento.id)} target="_blank" className="shrink-0" />
            </div>
            <p className="px-4 text-sm text-secondary">{evento.dataLabel}</p>
            {/* No Freepass o status é só leitura: quem muda é a produtora (BKS-64). */}
            {freepass ? (
                <Badge size="sm" type="pill-color" color={EVENTO_STATUS_BADGE_COLOR[evento.status]} className="mx-4 self-start">
                    {EVENTO_STATUS_LABEL[evento.status]}
                </Badge>
            ) : (
            <div className="flex flex-col gap-1.5 px-4">
                {/* Rascunho: só o "Publicar evento", sem rótulo (BKS-72). */}
                {evento.status !== "rascunho" && <span className="text-sm text-quaternary">Status do evento</span>}
                <SeletorDeStatus />
            </div>
            )}
        </div>
    );
};

/** Troca de status no fim do menu do evento no celular, fixa no rodapé do painel (a barra só mostra o selo). */
const StatusNoMenuMobile = () => {
    const evento = useEventoAtual();
    return (
        <div className="sticky bottom-0 flex flex-col gap-1.5 border-t border-secondary bg-primary px-4 pt-4 pb-6">
            {evento.status !== "rascunho" && <span className="text-sm text-quaternary">Status do evento</span>}
            <SeletorDeStatus />
            {/* A página do evento no site, como no rail do desktop (BKS-24); no celular, com o texto à vista. */}
            <Button size="sm" color="link-gray" iconLeading={LinkExternal01} href={paginaDoEventoNoSite(evento.id)} target="_blank" className="mt-2 self-start">
                Abrir página do evento
            </Button>
        </div>
    );
};

/**
 * Status do evento no menu (desktop e celular), conforme o que dá para fazer (BKS-72):
 * rascunho mostra só "Publicar evento" (escolhe privado ou público no modal); encerrado só o selo e
 * o aviso; os outros, a lista de status, em que escolher abre o modal que confirma.
 */
const SeletorDeStatus = () => {
    const evento = useEventoAtual();
    const abrirModalDeStatus = useAbrirModalDeStatus();
    const encerrado = evento.status === "encerrado";
    const doc = useDoc("eventos", evento.id);
    const semAbertura = evento.status === "rascunho" && estadoDoEvento(doc, false).abertura === "nenhum";
    if (evento.status === "rascunho" || encerrado)
        return (
            <div className="flex flex-col gap-2">
                {/* Rascunho: só o botão (o "Publicar evento" já diz que não está no ar). Encerrado: selo e aviso. */}
                {encerrado && (
                    <Badge size="sm" type="pill-color" color={EVENTO_STATUS_BADGE_COLOR[evento.status]} className="self-start">
                        {EVENTO_STATUS_LABEL[evento.status]}
                    </Badge>
                )}
                {encerrado ? (
                    <p className="text-sm text-tertiary">Evento encerrado. O status não pode mais ser alterado.</p>
                ) : semAbertura ? (
                    // Sem abertura de vendas, publicar fica bloqueado; o motivo aparece no tooltip ao passar o mouse ou focar
                    // (EVT-159). O botão fica focável (aria-disabled, não isDisabled) para o tooltip abrir pelo teclado.
                    <Tooltip title="Programe a abertura de vendas para publicar." placement="bottom">
                        <Button
                            size="sm"
                            color="primary"
                            iconLeading={Globe01}
                            className="w-full cursor-not-allowed opacity-50"
                            aria-disabled="true"
                            aria-label="Publicar evento: programe a abertura de vendas para publicar"
                        >
                            Publicar evento
                        </Button>
                    </Tooltip>
                ) : (
                    <Button size="sm" color="primary" iconLeading={Globe01} className="w-full" onClick={() => abrirModalDeStatus()}>
                        Publicar evento
                    </Button>
                )}
            </div>
        );
    return (
        <Dropdown.Root>
            {/* O nome acessível diz o que é, não só o valor ("Publicado"). */}
            <Button size="sm" color="secondary" className="w-full justify-between" iconTrailing={ChevronDown} aria-label={`Status do evento: ${EVENTO_STATUS_LABEL[evento.status]}. Alterar`}>
                <span className="flex min-w-0 items-center gap-1.5">
                    <Dot size="sm" className={STATUS_DOT_COR[evento.status]} aria-hidden="true" />
                    <span className="truncate">{EVENTO_STATUS_LABEL[evento.status]}</span>
                </span>
            </Button>
            <Dropdown.Popover className="w-64" placement="bottom start">
                <Dropdown.Menu>
                    {/* Dropdown.Item tem uma linha só; aqui são duas (nome e legenda), com as mesmas classes do item padrão. */}
                    {ORDEM_STATUS.map((status) => {
                        const isAtual = status === evento.status;
                        return (
                            <AriaMenuItem
                                key={status}
                                id={status}
                                isDisabled={isAtual}
                                textValue={EVENTO_STATUS_LABEL[status]}
                                onAction={() => abrirModalDeStatus(status)}
                                className={(state) => cx("group block cursor-pointer px-1.5 py-px outline-hidden", state.isDisabled && "cursor-not-allowed opacity-50")}
                            >
                                {(state) => (
                                    <div
                                        className={cx(
                                            "relative flex items-start gap-2 rounded-md px-2.5 py-2 outline-focus-ring transition duration-100 ease-linear",
                                            !state.isDisabled && "group-hover:bg-primary_hover",
                                            state.isFocused && "bg-primary_hover",
                                            state.isFocusVisible && "outline-2 -outline-offset-2",
                                        )}
                                    >
                                        <Dot size="sm" className={cx("mt-1 size-2 shrink-0", STATUS_DOT_COR[status])} aria-hidden="true" />
                                        <span className="flex min-w-0 flex-col">
                                            <span className="truncate text-sm font-semibold text-secondary">{EVENTO_STATUS_LABEL[status]}</span>
                                            <span className="truncate text-sm text-tertiary">{isAtual ? "Status atual" : STATUS_DESCRICAO_CURTA[status]}</span>
                                        </span>
                                    </div>
                                )}
                            </AriaMenuItem>
                        );
                    })}
                </Dropdown.Menu>
            </Dropdown.Popover>
        </Dropdown.Root>
    );
};

/*
 * Ícone do item atual do menu do evento, invertido como no rail da organização (BKS-124): fundo
 * `fg-primary` e o ícone na cor do fundo, visível nos dois temas. Um componente por ícone, guardado,
 * para o NavItem não remontar o ícone a cada render.
 */
type IconeDoNavItem = FC<HTMLAttributes<HTMLOrSVGElement>>;
const ICONES_INVERTIDOS = new WeakMap<FC<{ className?: string }>, IconeDoNavItem>();
const iconeInvertido = (Icone: FC<{ className?: string }>): IconeDoNavItem => {
    let invertido = ICONES_INVERTIDOS.get(Icone);
    if (!invertido) {
        invertido = ({ className }) => (
            <span
                aria-hidden="true"
                // O NavItem dá 20 px e 8 px de margem ao ícone; o invertido tem 28 px e a mesma ocupação (28 px), para o texto não pular.
                className={cx(className, "-my-1 -ml-1 mr-1 flex size-7 items-center justify-center rounded-md bg-fg-primary text-bg-primary group-hover/item:text-bg-primary")}
            >
                <Icone className="size-4" />
            </span>
        );
        ICONES_INVERTIDOS.set(Icone, invertido);
    }
    return invertido;
};

/**
 * Menu do evento do Backstage (BKS-07, BKS-130): rail mínimo, rail clássico e gaveta do celular com o
 * mesmo desenho. Links do router (NavItem do DS) de 44 px, `aria-current="page"` no atual, que tem o
 * ícone invertido e o texto em `text-primary`; os outros, em medium. Antes, o atual tinha só um fundo
 * quase igual ao do cartão (1,04:1) e a gaveta usava a árvore, com linhas de 32 px que não eram links.
 */
const MenuDoEvento = ({ activeSection, activeItem, onNavegar }: { activeSection?: BackstageSection; activeItem?: BackstageItem; onNavegar?: () => void }) => (
    <nav aria-label="Menu do evento">
        <ul className="flex flex-col gap-0.5">
            {EVENT_NAV.map((sec) => {
                const atual = opcaoDaTela(activeSection, activeItem) === sec.id;
                return (
                    // Itens com 44 px (o NavItem do DS limita a 36 px); sem fundo próprio, nem no atual: quem marca é o ícone.
                    <li
                        key={sec.id}
                        className={cx(
                            "[&_a]:h-11 [&_a]:max-h-11 [&_a]:bg-transparent [&_a]:px-2 [&_a:hover]:bg-primary_hover",
                            atual ? "item-ativo [&_a>span:last-child]:text-primary" : "[&_a>span:last-child]:font-medium",
                        )}
                    >
                        <NavItemBase type="link" href={sec.href} icon={atual ? iconeInvertido(sec.icon) : sec.icon} current={atual} onClick={onNavegar}>
                            {sec.label}
                        </NavItemBase>
                    </li>
                );
            })}
        </ul>
    </nav>
);

interface EventFunctionalitiesListProps {
    activeSection?: BackstageSection;
    activeItem?: BackstageItem;
}

/** Item da página atual. "item-ativo" marca a linha para o rail rolar até ela e anunciar a página (UI-NAV-004). */
const ACTIVE_CLASS = "item-ativo bg-tertiary hover:bg-tertiary";

const EventFunctionalitiesList = ({ activeSection, activeItem }: EventFunctionalitiesListProps) => {
    // A tela diz a seção dela; o grupo que a abriga é que abre (BKS-07).
    const grupo = opcaoDaTela(activeSection, activeItem);
    const [expandedKeys, setExpandedKeys] = useState<Set<Key>>(
        () => new Set(grupo ? [grupo] : []),
    );

    useEffect(() => {
        if (grupo) {
            setExpandedKeys((prev) => (prev.has(grupo) ? prev : new Set([...prev, grupo])));
        }
    }, [grupo]);

    const freepass = usePainel() === "freepass";
    const eventoId = useEventoAtual().id;
    const acesso = useAcessoNoEvento(eventoId, freepass);
    // Mesma lista do celular (EVENT_NAV): um menu, um desenho (UI-DS-003).
    const nav = freepass ? navDoFreepass(acesso) : EVENT_NAV;
    const desativadas: Key[] = [
        ...DISABLED_KEYS,
        ...nav.filter((sec) => !ehDestinoUnico(sec) && sec.items.length === 0).map((sec) => sec.id),
        ...nav.flatMap((sec) => sec.items.filter((it) => ehDesativado(it.href)).map((it) => it.id)),
    ];
    const ativo = (marcado: boolean) => (marcado ? ACTIVE_CLASS : undefined);

    return (
        <TreeView
            aria-label="Funcionalidades do evento"
            size="sm"
            selectionMode="none"
            disabledKeys={desativadas}
            expandedKeys={expandedKeys}
            onExpandedChange={(keys: Set<Key>) => setExpandedKeys(new Set(keys))}
        >
            {nav.map((sec) => {
                const novo = sec.novo && (
                    <Badge size="sm" type="pill-color" color="brand">
                        Novo
                    </Badge>
                );
                if (ehDestinoUnico(sec) || sec.items.length === 0) {
                    const href = destinoDaSecao(sec);
                    return (
                        <TreeView.Item key={sec.id} id={sec.id} textValue={sec.label} href={ehDesativado(href) ? undefined : href}>
                            <TreeView.ItemContent icon={sec.icon} action={novo} className={ativo(activeSection === sec.id || SECOES_ABRIGADAS[activeSection ?? ""] === sec.id || (!freepass && opcaoDaTela(activeSection, activeItem) === sec.id))}>
                                {sec.label}
                            </TreeView.ItemContent>
                        </TreeView.Item>
                    );
                }
                return (
                    <TreeView.Item key={sec.id} id={sec.id} textValue={sec.label}>
                        <TreeView.ItemContent icon={sec.icon} action={novo}>
                            {sec.label}
                        </TreeView.ItemContent>
                        {sec.items.map((it) => (
                            <TreeView.Item
                                key={it.id}
                                id={it.id}
                                textValue={it.label}
                                href={ehDesativado(it.href) ? undefined : it.href}
                                // Entra deslizando ao abrir o grupo (UI-VIS-008); some sem movimento com redução de movimento.
                                className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-200"
                            >
                                <TreeView.ItemContent className={ativo(activeItem === it.id)} action={<ItemBadges item={it} />}>
                                    {it.label}
                                </TreeView.ItemContent>
                            </TreeView.Item>
                        ))}
                    </TreeView.Item>
                );
            })}
        </TreeView>
    );
};

