import { MotionConfig } from "motion/react";
import { useEffect, useState, type FC, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { Button as AriaButton } from "react-aria-components";
import { toast } from "sonner";
import {
    Announcement01,
    BarChart01,
    CheckCircle,
    ChevronDown,
    ChevronRight,
    ClipboardCheck,
    Copy01,
    Edit05,
    Image01,
    InfoCircle,
    LinkExternal01,
    Menu01,
    ShoppingCart01,
    User01,
    Users03,
    XClose,
} from "@untitledui/icons";
import { Avatar } from "@/components/base/avatar/avatar";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Tooltip } from "@/components/base/tooltip/tooltip";
import { Surgir } from "@/components/foundations/transicao";
import { cx } from "@/utils/cx";
import { ICONES_ORGANIZACAO } from "../../components/icones-organizacao";
import { FORA_DO_ESCOPO, TITULO_FORMULARIO } from "../data/opcoes";
import { useVocabulario } from "../data/vocabulario";
import { ORGANIZACAO_ATUAL } from "../data/perfil";
import { atualizarRascunho, useRascunho } from "../data/rascunho";
import { validar } from "../data/validacao";

/* ------------------------------------------------------------------ */
/*  Shell do AWA, fiel ao Backstage de hoje (SCE-140 a SCE-143)        */
/*  Rail da organização (Eventos, Membros, Produtos, Público,          */
/*  Finanças, Ajustes, usuário embaixo) e, dentro do evento, o cartão  */
/*  do evento e o menu do evento com os rótulos de hoje. O que não é   */
/*  deste protótipo fica visível e não navega: avisa "Fora do escopo   */
/*  do protótipo". Não usa o BackstageLayout porque o menu dele já     */
/*  é outro (BKS-07) e os itens dele navegam para outros protótipos.   */
/* ------------------------------------------------------------------ */

export type DestinoDoEvento = "informacoes" | "inscricoes" | "perguntas" | "aberturas" | "revisao";

interface MenuDoEvento {
    ativo: DestinoDoEvento | null;
    onIr: (d: DestinoDoEvento) => void;
}

const foraDoEscopo = () => toast(FORA_DO_ESCOPO);

const ORG_NAV: { id: string; label: string; icon: FC<{ className?: string }>; rota?: string }[] = [
    { id: "eventos", label: "Eventos", icon: ICONES_ORGANIZACAO.eventos, rota: "/backstage/sports" },
    { id: "membros", label: "Membros", icon: ICONES_ORGANIZACAO.membros },
    { id: "produtos", label: "Produtos", icon: ICONES_ORGANIZACAO.produtos },
    { id: "publico", label: "Público", icon: ICONES_ORGANIZACAO.publico },
    { id: "financas", label: "Finanças", icon: ICONES_ORGANIZACAO.financas },
    { id: "ajustes", label: "Ajustes", icon: ICONES_ORGANIZACAO.ajustes },
];

export function ShellAwa({ evento, children }: { evento?: MenuDoEvento; children: ReactNode }) {
    const [menuAberto, setMenuAberto] = useState(false);
    return (
        // v0.69 (critique UI-VIS-008 · WCAG 2.3.3): com "reduzir movimento" no sistema, as animações viram fade ou somem.
        <MotionConfig reducedMotion="user">
        <div className="min-h-screen bg-primary_alt">
            {/* Celular e tablet: barra no topo; o menu abre por baixo dela. */}
            <div className="sticky top-0 z-30 border-b border-secondary bg-primary_alt lg:hidden">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="flex min-w-0 items-center gap-2">
                        <Avatar size="sm" initials={ORGANIZACAO_ATUAL.sigla} alt="" />
                        <span className="truncate text-sm font-semibold text-primary">{ORGANIZACAO_ATUAL.nome}</span>
                    </span>
                    <ButtonUtility
                        icon={menuAberto ? XClose : Menu01}
                        color="tertiary"
                        size="sm"
                        tooltip={menuAberto ? "Fechar menu" : "Abrir menu"}
                        aria-expanded={menuAberto}
                        onClick={() => setMenuAberto((v) => !v)}
                    />
                </div>
                <Surgir visivel={menuAberto}>
                    <div className="flex max-h-[70dvh] flex-col gap-4 overflow-y-auto px-4 pb-4">
                        <NavDaOrganizacao horizontal />
                        {evento && <RailDoEvento evento={evento} />}
                    </div>
                </Surgir>
            </div>

            <div className="flex min-h-screen flex-col gap-3 px-2 py-3 lg:flex-row lg:px-3 lg:py-6">
                <aside className="sticky top-6 hidden h-[calc(100dvh-3rem)] w-25 shrink-0 flex-col items-center justify-between rounded-2xl bg-primary px-1 py-4 lg:flex">
                    <div className="flex flex-col items-center gap-4">
                        <BotaoDaOrganizacao />
                        <NavDaOrganizacao />
                    </div>
                    <Tooltip title="Sua conta">
                        <AriaButton aria-label="Sua conta" onPress={foraDoEscopo} className="cursor-pointer rounded-full outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2">
                            <Avatar size="sm" alt="" placeholderIcon={User01} />
                        </AriaButton>
                    </Tooltip>
                </aside>
                {evento && (
                    <aside className="sticky top-6 hidden h-[calc(100dvh-3rem)] w-72 shrink-0 overflow-y-auto rounded-2xl bg-primary p-3 lg:block">
                        <RailDoEvento evento={evento} />
                    </aside>
                )}
                <main className="flex min-w-0 flex-1 flex-col overflow-x-clip px-2 pb-6 md:px-6">{children}</main>
            </div>
        </div>
        </MotionConfig>
    );
}

const BotaoDaOrganizacao = () => (
    <AriaButton
        onPress={foraDoEscopo}
        aria-label={`Organização: ${ORGANIZACAO_ATUAL.nome}. Trocar organização`}
        className="flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-lg px-1 py-1 outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
    >
        <span className="relative">
            <Avatar size="md" initials={ORGANIZACAO_ATUAL.sigla} alt="" />
            <span className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-primary ring-1 ring-secondary">
                <ChevronDown className="size-3 text-fg-quaternary" />
            </span>
        </span>
        <span className="line-clamp-2 w-full text-center text-sm leading-tight font-medium break-words text-secondary">{ORGANIZACAO_ATUAL.nome}</span>
    </AriaButton>
);

function NavDaOrganizacao({ horizontal }: { horizontal?: boolean }) {
    const navigate = useNavigate();
    return (
        <nav aria-label="Menu da organização" className={cx("flex gap-1", horizontal ? "flex-wrap" : "flex-col items-center")}>
            {ORG_NAV.map((item) => {
                const Icone = item.icon;
                const ativo = item.id === "eventos";
                const botao = (
                    <AriaButton
                        key={item.id}
                        onPress={() => (item.rota ? navigate(item.rota) : foraDoEscopo())}
                        aria-current={ativo ? "page" : undefined}
                        className={cx(
                            "flex cursor-pointer flex-col items-center gap-1 rounded-md py-2 outline-focus-ring transition duration-100 ease-linear focus-visible:outline-2",
                            horizontal ? "w-20" : "w-full",
                            ativo ? "text-secondary" : "text-tertiary hover:text-secondary_hover",
                        )}
                    >
                        <span className={cx("flex size-10 items-center justify-center rounded-lg", ativo ? "bg-tertiary" : "hover:bg-secondary_hover")}>
                            <Icone className="size-5" />
                        </span>
                        <span className="text-center text-xs leading-tight font-medium">{item.label}</span>
                    </AriaButton>
                );
                return item.rota ? (
                    botao
                ) : (
                    <Tooltip key={item.id} title={FORA_DO_ESCOPO} placement="right">
                        {botao}
                    </Tooltip>
                );
            })}
        </nav>
    );
}

/* ---------------- menu do evento ---------------- */

interface ItemDoMenu {
    id: string;
    label: string;
    icon?: FC<{ className?: string }>;
    destino?: DestinoDoEvento;
    filhos?: ItemDoMenu[];
}

/**
 * Menu do evento do AWA, ajustado ao esporte na v0.3 (SCE-142): sem Gerenciamento de cotas, Emissão de
 * ingressos e Combos; "Ingressos" vira "Inscrições" (vocabulário) e "Coleta de dados › Perguntas por
 * ingresso" vira "Formulário de inscrição › Perguntas". O resto fica como hoje e não navega.
 */
const menuDoEvento = (inscricoes: string): ItemDoMenu[] => [
    { id: "informacoes", label: "Informações do evento", icon: InfoCircle, destino: "informacoes" },
    {
        id: "itens",
        label: "Itens",
        icon: ShoppingCart01,
        filhos: [
            { id: "inscricoes", label: inscricoes, destino: "inscricoes" },
            { id: "produtos", label: "Produtos" },
            { id: "aberturas", label: "Aberturas de vendas", destino: "aberturas" },
        ],
    },
    { id: "estrategias", label: "Estratégias de venda", icon: Users03, filhos: [{ id: "grupos", label: "Grupos e assessorias" }] },
    { id: "relatorios", label: "Relatórios", icon: BarChart01, filhos: [] },
    { id: "marketing", label: "Marketing", icon: Announcement01, filhos: [] },
    { id: "formulario", label: TITULO_FORMULARIO, icon: ClipboardCheck, filhos: [{ id: "perguntas", label: "Perguntas", destino: "perguntas" }] },
];

const formatarDia = (iso: string) => {
    const d = new Date(iso);
    if (!iso || Number.isNaN(d.getTime())) return null;
    const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", o).format(d).replace(".", "").toUpperCase();
    return { semana: f({ weekday: "short" }), dia: f({ day: "2-digit" }), mes: f({ month: "short" }) };
};

function RailDoEvento({ evento }: { evento: MenuDoEvento }) {
    const { rascunho: r } = useRascunho();
    const dia = formatarDia(r.largada);
    const { t } = useVocabulario();
    const MENU_DO_EVENTO = menuDoEvento(t.tituloDaSecao); // v0.47 (SCE-295): o nome do passo, ex.: "Modalidades e categorias"
    const [abertos, setAbertos] = useState<Set<string>>(new Set(["itens", "formulario"]));
    // v0.61 (SCE-329): os atalhos da revisão abrem o grupo e destacam o item no menu por alguns segundos.
    const [destaque, setDestaque] = useState<string | null>(null);
    useEffect(() => {
        const ouvir = (e: Event) => {
            const id = (e as CustomEvent<string>).detail;
            const pai = MENU_DO_EVENTO.find((i) => i.filhos?.some((f) => f.id === id));
            if (pai) setAbertos((s) => new Set(s).add(pai.id));
            setDestaque(id);
            setTimeout(() => document.querySelector(`[data-menu="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
            setTimeout(() => setDestaque(null), 3200);
        };
        window.addEventListener("sce-destacar-menu", ouvir);
        return () => window.removeEventListener("sce-destacar-menu", ouvir);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    const alternar = (id: string) => setAbertos((s) => (s.has(id) ? (s.delete(id), new Set(s)) : new Set(s).add(id)));
    const publicado = r.publicado;
    const faltam = validar(r, t).length;

    return (
        <div className="flex flex-col gap-4">
            {/* Cartão do evento: capa, status, data, ID, nome, local e status de publicação. */}
            <div className="flex flex-col gap-3 rounded-2xl bg-secondary p-3">
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-tertiary">
                    {r.imagem?.url ? (
                        <img src={r.imagem.url} alt="" className="size-full object-cover" />
                    ) : (
                        <span className="flex size-full items-center justify-center">
                            <Image01 className="size-8 text-fg-quaternary" aria-hidden="true" />
                        </span>
                    )}
                    <span className="absolute top-3 left-3 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary uppercase">
                        {publicado ? "Público" : "Rascunho"}
                    </span>
                    {dia && (
                        <span className="absolute right-3 bottom-3 flex flex-col items-center rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary">
                            <span>{dia.semana}</span>
                            <span className="text-lg leading-tight">{dia.dia}</span>
                            <span>{dia.mes}</span>
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1 text-xs text-tertiary">
                    <span className="truncate">ID: rascunho-sports-0001</span>
                    <ButtonUtility icon={Copy01} color="tertiary" size="xs" tooltip="Copiar ID" onClick={foraDoEscopo} />
                </div>
                <div className="flex flex-col gap-0.5">
                    <p className="line-clamp-3 text-md font-bold text-primary uppercase">{r.nome.trim() || "Evento sem nome"}</p>
                    <p className="truncate text-sm text-tertiary">{r.local?.nome ?? "Local a definir"}</p>
                </div>
                <div className="flex items-center gap-2">
                    <ButtonUtility icon={LinkExternal01} color="secondary" size="sm" tooltip="Abrir página do evento" onClick={foraDoEscopo} />
                    {/* v0.56 (SCE-316): em rascunho, o status leva à Revisão (onde se publica). */}
                    <AriaButton
                        onPress={() => (publicado ? foraDoEscopo() : evento.onIr("revisao"))}
                        className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary ring-1 ring-secondary outline-focus-ring ring-inset focus-visible:outline-2"
                    >
                        {publicado ? "Publicado" : "Rascunho"}
                        <Edit05 className="size-4 text-fg-quaternary" aria-hidden="true" />
                    </AriaButton>
                </div>
            </div>

            <nav aria-label="Menu do evento">
                <ul className="flex flex-col gap-0.5">
                    {/* v0.56 (SCE-316): "Revisar e publicar" no topo, só em rascunho, com o que falta. */}
                    {!publicado && (
                        <li className="mb-1">
                            <AriaButton
                                onPress={() => evento.onIr("revisao")}
                                aria-current={evento.ativo === "revisao" ? "page" : undefined}
                                className={cx(
                                    "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-sm outline-focus-ring ring-1 transition duration-100 ease-linear ring-inset focus-visible:outline-2",
                                    evento.ativo === "revisao" ? "bg-tertiary font-semibold text-primary ring-transparent" : "font-semibold text-primary ring-secondary hover:bg-primary_hover",
                                )}
                            >
                                <CheckCircle className="size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />
                                <span className="flex-1 truncate">Revisar e publicar</span>
                                <span
                                    className={cx(
                                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                                        // v0.57 (SCE-323): enquanto monta, o que falta é neutro (cinza); pronto fica verde.
                                        faltam ? "bg-tertiary text-secondary" : "bg-success-primary text-success-primary",
                                    )}
                                >
                                    {faltam ? (faltam === 1 ? "falta 1" : `faltam ${faltam}`) : "Pronto"}
                                </span>
                            </AriaButton>
                        </li>
                    )}
                    {MENU_DO_EVENTO.map((item) => (
                        <li key={item.id}>
                            <ItemDoMenuDoEvento item={item} evento={evento} aberto={abertos.has(item.id)} onAlternar={() => alternar(item.id)} />
                            {item.filhos && item.filhos.length > 0 && (
                                <Surgir visivel={abertos.has(item.id)}>
                                    <ul className="flex flex-col gap-0.5 py-0.5 pl-6">
                                        {item.filhos.map((f) => (
                                            <li key={f.id}>
                                                <ItemDoMenuDoEvento item={f} evento={evento} filho destacado={destaque === f.id} />
                                            </li>
                                        ))}
                                    </ul>
                                </Surgir>
                            )}
                        </li>
                    ))}
                </ul>
            </nav>
        </div>
    );
}

function ItemDoMenuDoEvento({ item, evento, aberto, onAlternar, filho, destacado }: { item: ItemDoMenu; evento: MenuDoEvento; aberto?: boolean; onAlternar?: () => void; filho?: boolean; destacado?: boolean }) {
    const Icone = item.icon;
    const ativo = !!item.destino && evento.ativo === item.destino;
    const grupo = !!item.filhos;
    const acao = () => {
        if (grupo && item.filhos!.length) return onAlternar?.();
        if (item.destino) return evento.onIr(item.destino);
        // Item de protótipo: Grupos e assessorias e Produtos são outras telas do AWA; aqui só se liga o módulo.
        if (item.id === "grupos" || item.id === "produtos") {
            const nome = item.id === "grupos" ? "Grupos e assessorias" : "Produtos adicionais";
            return toast(`${nome}: configuração fora deste protótipo.`, {
                action: { label: "Simular ativado", onClick: () => atualizarRascunho((r) => ({ ...r, modulos: { ...r.modulos, [item.id]: true } })) },
            });
        }
        foraDoEscopo();
    };
    return (
        <AriaButton
            onPress={acao}
            data-menu={item.id}
            aria-expanded={grupo && item.filhos!.length ? aberto : undefined}
            aria-current={ativo ? "page" : undefined}
            className={cx(
                "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-sm outline-focus-ring transition duration-100 ease-linear focus-visible:outline-2",
                ativo ? "bg-tertiary font-semibold text-primary" : "font-medium text-secondary hover:bg-primary_hover",
                destacado && "bg-brand-primary_alt text-primary ring-2 ring-brand ring-inset motion-safe:animate-pulse",
                !item.destino && !grupo && "text-tertiary",
            )}
        >
            {grupo ? (
                aberto ? (
                    <ChevronDown className="size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />
                ) : (
                    <ChevronRight className="size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />
                )
            ) : filho ? (
                <span className="size-1 shrink-0 rounded-full bg-fg-quaternary" aria-hidden="true" />
            ) : null}
            {Icone && <Icone className="size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />}
            <span className="truncate">{item.label}</span>
        </AriaButton>
    );
}
