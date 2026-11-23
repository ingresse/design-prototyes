import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight, Bell01, Maximize02, PauseCircle, PlayCircle } from "@untitledui/icons";
import { useNavigate } from "react-router";
import { DialogTrigger as AriaDialogTrigger, Heading as AriaHeading } from "react-aria-components";
import { Dialog as DialogDoModal, Modal as ModalCentral, ModalOverlay as FundoDoModal } from "@/components/application/modals/modal";
import { Dialog, Modal, ModalOverlay, SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Button } from "@/components/base/buttons/button";
import { Badge } from "@/components/base/badges/badges";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { CloseButton } from "@/components/base/buttons/close-button";
import { cx } from "@/utils/cx";
import { CampoDeParticulas } from "./campo-de-particulas";

interface Novidade {
    id: string;
    /** AAAA-MM-DD: mostrada com `Intl` e ano ("22 nov 2026"). */
    data: string;
    titulo: string;
    texto: string;
    href: string;
    video?: string;
    poster?: string;
}

/**
 * Novidades do Backstage, da mais nova para a mais antiga (BKS-81). `video`: gravação da interface com
 * zoom e um cursor que a câmera segue, mostrando a novidade (BKS-121); `poster` é o primeiro quadro.
 */
const NOVIDADES: Novidade[] = [
    {
        // Menu do evento de 22/11/2026 (BKS-07). Sem vídeo por enquanto.
        id: "menu-do-evento-2026-11-22",
        data: "2026-11-22",
        titulo: "Menu do evento mais direto",
        texto: "O evento abre pela Visão geral. Divulgação e Compras em grupo viraram opções do menu, e Informações do evento abre pela Visão geral, em “Editar informações”.",
        href: "/backstage/evento/visao-geral",
    },
    {
        id: "equipe-e-comissarios",
        data: "2026-11-12",
        titulo: "Equipe e Comissários num lugar só",
        texto: "O comissário agora é um grupo da equipe do evento. Convide, defina o acesso e acompanhe as vendas na mesma tela.",
        href: "/backstage/evento/equipe",
        video: "/backstage/novidades/equipe-e-comissarios.webm",
        poster: "/backstage/novidades/equipe-e-comissarios.jpg",
    },
    {
        id: "relatorios-da-organizacao",
        data: "2026-11-11",
        titulo: "Relatórios da organização",
        // Reescrita em 22/11/2026: Relatórios voltou ao menu do evento (BKS-07, BKS-90).
        texto: "No menu da organização, Relatórios soma todos os eventos, com Vendas e Borderô. No menu do evento, mostra só os relatórios daquele evento.",
        href: "/backstage/relatorios/vendas-por-grupo",
        video: "/backstage/novidades/relatorios-da-organizacao.webm",
        poster: "/backstage/novidades/relatorios-da-organizacao.jpg",
    },
    {
        id: "itens",
        data: "2026-11-11",
        titulo: "Ingressos, produtos e combos numa página só",
        texto: "Tudo o que o evento vende fica em Ingressos e produtos, uma aba para cada coisa.",
        href: "/backstage/catalogo/ingressos",
        video: "/backstage/novidades/itens.webm",
        poster: "/backstage/novidades/itens.jpg",
    },
];

const dataDaNovidade = (iso: string) => {
    const partes = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric" }).formatToParts(new Date(`${iso}T12:00:00`));
    const parte = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((p) => p.type === tipo)?.value.replace(".", "") ?? "";
    return `${parte("day")} ${parte("month")} ${parte("year")}`;
};

const CHAVE = "backstage-novidades-vista";
const listeners = new Set<() => void>();
const lerVista = () => {
    try {
        return window.localStorage.getItem(CHAVE);
    } catch {
        return null;
    }
};
const marcarVista = (id: string) => {
    try {
        window.localStorage.setItem(CHAVE, id);
    } catch {
        /* sem storage, o ponto volta na próxima visita */
    }
    listeners.forEach((l) => l());
};

/** Quantas novidades ainda não foram vistas: as que vêm antes da última vista na lista (BKS-136). */
const contarNaoVistas = (vista: string | null) => {
    const i = vista ? NOVIDADES.findIndex((n) => n.id === vista) : -1;
    return i === -1 ? NOVIDADES.length : i;
};
const assinar = (fn: () => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
};
/** Número de novidades não vistas, para o selo do avatar da conta (BKS-136). */
export function useNovidadesNaoVistas() {
    return contarNaoVistas(useSyncExternalStore(assinar, lerVista, () => null));
}
/** Abre o painel de Novidades de qualquer lugar (o item "Novidades" do menu da conta, BKS-136). */
export const abrirNovidades = () => window.dispatchEvent(new Event("abrir-novidades"));

/**
 * Vídeo da novidade (BKS-131, WCAG 2.2.2): sem som e em repetição, toca enquanto o mouse está sobre o cartão
 * e pausa ao sair; nada toca sozinho. O botão toca e pausa (no toque, onde não há hover, é o único jeito).
 * Carrega só quando vai tocar (`preload="none"`, com o primeiro quadro como capa).
 */
function VideoDaNovidade({ novidade, emFoco }: { novidade: Novidade; emFoco: boolean }) {
    const ref = useRef<HTMLVideoElement>(null);
    // Ampliado (BKS-137): o vídeo abre grande, num modal por cima do painel, com os controles do navegador.
    const [ampliado, setAmpliado] = useState(false);
    // `null`: segue o hover; `true` ou `false`: a pessoa escolheu pelo botão.
    const [escolha, setEscolha] = useState<boolean | null>(null);
    const tocar = escolha ?? emFoco;
    const [tocando, setTocando] = useState(false);

    useEffect(() => {
        const video = ref.current;
        if (!video) return;
        if (tocar) video.play().catch(() => setTocando(false));
        else video.pause();
    }, [tocar]);
    // Ao sair do cartão, a escolha feita no hover perde a vez.
    useEffect(() => {
        if (!emFoco) setEscolha(null);
    }, [emFoco]);

    return (
        <div className="relative order-first md:order-none">
            <video
                ref={ref}
                src={novidade.video}
                poster={novidade.poster}
                muted
                loop
                playsInline
                preload="none"
                aria-label={`Vídeo: ${novidade.titulo}`}
                onPlay={() => setTocando(true)}
                onPause={() => setTocando(false)}
                onClick={() => setAmpliado(true)}
                className="block aspect-[16/10] w-full cursor-zoom-in rounded-lg bg-secondary object-cover ring-1 ring-secondary"
            />
            <ButtonUtility
                size="sm"
                color="secondary"
                icon={tocando ? PauseCircle : PlayCircle}
                tooltip={tocando ? "Pausar vídeo" : "Tocar vídeo"}
                aria-label={tocando ? `Pausar vídeo: ${novidade.titulo}` : `Tocar vídeo: ${novidade.titulo}`}
                onPress={() => setEscolha(!tocando)}
                className="absolute bottom-2 left-2"
            />
            <ButtonUtility
                size="sm"
                color="secondary"
                icon={Maximize02}
                tooltip="Ver vídeo maior"
                aria-label={`Ver vídeo maior: ${novidade.titulo}`}
                onPress={() => setAmpliado(true)}
                className="absolute right-2 bottom-2"
            />
            <FundoDoModal isOpen={ampliado} onOpenChange={setAmpliado} isDismissable className="z-[60]">
                <ModalCentral className="max-w-5xl">
                    <DialogDoModal aria-label={`Vídeo: ${novidade.titulo}`}>
                        {({ close }) => (
                            <div className="relative w-full overflow-hidden rounded-2xl bg-primary shadow-xl ring-1 ring-secondary">
                                <video
                                    src={novidade.video}
                                    poster={novidade.poster}
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                    controls
                                    aria-label={`Vídeo: ${novidade.titulo}`}
                                    className="block aspect-[16/10] w-full bg-secondary object-contain"
                                />
                                <CloseButton size="md" label="Fechar" theme="dark" className="absolute top-3 right-3" onPress={close} />
                            </div>
                        )}
                    </DialogDoModal>
                </ModalCentral>
            </FundoDoModal>
        </div>
    );
}

/** Sino de novidades: ponto enquanto houver novidade não vista; abrir marca como vista (BKS-81). */
export function Novidades() {
    const navigate = useNavigate();
    const tituloId = useId();
    const [aberto, setAberto] = useState(false);
    // Cartão sob o mouse: o vídeo dele toca (BKS-131). Toque não conta como hover.
    const [emFoco, setEmFoco] = useState<string | null>(null);
    const vista = useSyncExternalStore(assinar, lerVista, () => null);
    const maisNova = NOVIDADES[0].id;
    // O item "Novidades" do menu da conta abre este painel (BKS-136). O sino existe no desktop e no celular, um
    // deles escondido pelo CSS: só o visível responde, para não abrir dois painéis.
    const sinoRef = useRef<HTMLSpanElement>(null);
    useEffect(() => {
        const abrir = () => {
            if (!sinoRef.current || sinoRef.current.offsetParent === null) return;
            setAberto(true);
            marcarVista(maisNova);
        };
        window.addEventListener("abrir-novidades", abrir);
        return () => window.removeEventListener("abrir-novidades", abrir);
    }, [maisNova]);
    const naoVista = vista !== maisNova;

    return (
        <AriaDialogTrigger
            isOpen={aberto}
            onOpenChange={(abrir) => {
                setAberto(abrir);
                if (abrir) marcarVista(maisNova);
            }}
        >
            <span ref={sinoRef} className="relative inline-flex">
                <ButtonUtility size="sm" color="tertiary" icon={Bell01} tooltip="Novidades" tooltipPlacement="bottom" aria-label={naoVista ? "Novidades, há novidade não vista" : "Novidades"} />
                {naoVista && <span aria-hidden="true" className="pointer-events-none absolute top-1 right-1 size-2 rounded-full bg-brand-solid ring-2 ring-bg-primary" />}
            </span>
            {/* Slideout da direita, montado com as peças do DS para ter título e botões em pt-BR (como SEG-64): o
                SlideoutMenu pronto se anunciava "Slideout menu" e "Close". 704 px no desktop: o vídeo fica ao lado
                do texto (BKS-121); no celular, tela cheia e empilhado. */}
            <ModalOverlay isDismissable className="z-50 pl-0">
                <Modal className="md:max-w-[44rem]">
                    <Dialog aria-label={undefined} aria-labelledby={tituloId} className="gap-0">
                        {({ close }) => (
                            <>
                                <header className="relative z-1 w-full px-4 pt-6 pb-5 md:px-6">
                                    <AriaHeading slot="title" id={tituloId} className="pr-8 text-lg font-semibold text-primary">
                                        Novidades
                                    </AriaHeading>
                                    <CloseButton size="sm" label="Fechar" className="absolute top-3 right-3 shrink-0" onPress={close} />
                                </header>
                                <SlideoutMenu.Content role="region" aria-label="Lista de novidades" className="gap-3 pb-6">
                                    <ul className="flex flex-col gap-3">
                                        {NOVIDADES.map((n, i) => (
                                            <li
                                                key={n.id}
                                                onPointerEnter={(e) => e.pointerType === "mouse" && setEmFoco(n.id)}
                                                onPointerLeave={(e) => e.pointerType === "mouse" && setEmFoco((atual) => (atual === n.id ? null : atual))}
                                                className={cx(
                                                    "relative isolate overflow-hidden rounded-xl p-4 ring-1 ring-secondary ring-inset",
                                                    n.video ? "grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] md:items-center" : "flex flex-col gap-2",
                                                )}
                                            >
                                                {/* Fundo: o holofote do guia (GDC-14), do azul 800 ao roxo 900 (pedido do Victor, 23/11/2026; antes amarelo e vermelho), acendendo do canto de baixo à direita,
                                                    atrás do vídeo, com as partículas por cima. Decorativo. Só nos cartões com vídeo: sem vídeo, o degradê na lateral
                                                    fica solto (pedido do Victor, 23/11/2026). */}
                                                {n.video && (
                                                    <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                                                        <span className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-blue-800)_32%,var(--color-purple-900)_92%)] opacity-60 [mask-image:radial-gradient(115%_170%_at_100%_100%,black_12%,transparent_72%)]" />
                                                        <CampoDeParticulas
                                                            cor="rgba(255,255,255,0.22)"
                                                            densidade={1}
                                                            escala={3}
                                                            parada={0}
                                                            className="absolute inset-0 size-full [mask-image:radial-gradient(100%_150%_at_100%_100%,black_0%,transparent_72%)]"
                                                        />
                                                    </span>
                                                )}
                                                <div className="flex min-w-0 flex-col gap-2">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-sm font-medium text-quaternary">{dataDaNovidade(n.data)}</span>
                                                        {i === 0 && (
                                                            <Badge size="sm" color="brand" type="pill-color">
                                                                Novo
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <h3 className="text-md font-semibold text-primary">{n.titulo}</h3>
                                                    <p className="text-sm text-tertiary">{n.texto}</p>
                                                    <Button
                                                        size="sm"
                                                        color="link-color"
                                                        iconTrailing={ArrowRight}
                                                        className="self-start"
                                                        aria-label={`Ver novidade: ${n.titulo}`}
                                                        onClick={() => {
                                                            close();
                                                            navigate(n.href);
                                                        }}
                                                    >
                                                        Ver novidade
                                                    </Button>
                                                </div>
                                                {n.video && <VideoDaNovidade novidade={n} emFoco={emFoco === n.id} />}
                                            </li>
                                        ))}
                                    </ul>
                                </SlideoutMenu.Content>
                            </>
                        )}
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </AriaDialogTrigger>
    );
}
