import { useId, useRef, useState, useSyncExternalStore, type SyntheticEvent } from "react";
import { Crop01, ImageUp, Plus, RefreshCw01, Star01, Trash01 } from "@untitledui/icons";
import { Heading as AriaHeading } from "react-aria-components";
import { centerCrop, makeAspectCrop, type PercentCrop } from "react-image-crop";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { CloseButton } from "@/components/base/buttons/close-button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { Cropper } from "@/components/shared-assets/image-cropper/cropper";
import { cx } from "@/utils/cx";
import { CampoDeParticulas, useCorDeParticulas } from "../../components/campo-de-particulas";

/*
 * Banners do evento (EVT-79 a EVT-82, EVT-164): vários, o primeiro é o principal (vira a capa). Enviar abre o modal de recorte do DS (o `Cropper` de
 * shared-assets/image-cropper, no layout do exemplo `image-crop-modal` do Untitled UI) com a
 * proporção fixa do banner, 4:5. A prévia mostra só a parte recortada; "Ajustar recorte" reabre.
 */

/** Proporção do banner: largura ÷ altura (1080 × 1350). */
export const PROPORCAO_BANNER = 1080 / 1350;
const SAIDA = { largura: 1080, altura: 1350, qualidade: 0.85 };

export interface ImagemDoBanner {
    nome: string;
    url: string;
}

/** Recorte em % da imagem original (formato do react-image-crop, usado pelo Cropper do DS). */
export type Recorte = PercentCrop;

/** Desktop (a partir de 1024 px): o banner ocupa a coluna da esquerda da página do evento (EVT-79). */
const CONSULTA_DESKTOP = "(min-width: 1024px)";
export function useBannerNaColuna(): boolean {
    return useSyncExternalStore(
        (fn) => {
            const m = window.matchMedia(CONSULTA_DESKTOP);
            m.addEventListener("change", fn);
            return () => m.removeEventListener("change", fn);
        },
        () => window.matchMedia(CONSULTA_DESKTOP).matches,
        () => false,
    );
}

/** Gera o banner recortado (JPEG 1080 × 1350) para gravar no evento. */
export async function exportarRecorte(img: ImagemDoBanner, r: Recorte): Promise<string> {
    const imagem = new Image();
    imagem.src = img.url;
    await imagem.decode();
    const iw = imagem.naturalWidth;
    const ih = imagem.naturalHeight;
    const canvas = document.createElement("canvas");
    canvas.width = SAIDA.largura;
    canvas.height = SAIDA.altura;
    canvas
        .getContext("2d")
        ?.drawImage(imagem, (r.x / 100) * iw, (r.y / 100) * ih, (r.width / 100) * iw, (r.height / 100) * ih, 0, 0, SAIDA.largura, SAIDA.altura);
    return canvas.toDataURL("image/jpeg", SAIDA.qualidade);
}

/** A parte recortada, preenchendo uma moldura 4:5 (a moldura e o recorte têm a mesma proporção). */
function ImagemRecortada({ imagem, recorte, className }: { imagem: ImagemDoBanner; recorte: Recorte; className?: string }) {
    return (
        <div className={cx("relative aspect-[4/5] overflow-hidden bg-primary_alt", className)}>
            <img
                src={imagem.url}
                alt=""
                draggable={false}
                className="absolute max-w-none"
                style={{
                    width: `${10000 / recorte.width}%`,
                    height: `${10000 / recorte.height}%`,
                    left: `${(-recorte.x / recorte.width) * 100}%`,
                    top: `${(-recorte.y / recorte.height) * 100}%`,
                }}
            />
        </div>
    );
}

/** Um banner do evento: a imagem enviada e a parte dela que vale (EVT-81). */
export interface BannerDoEvento {
    imagem: ImagemDoBanner;
    recorte: Recorte;
}

/** Até 5 banners por evento (EVT-164): o banco do protótipo guarda as imagens no navegador. */
export const MAXIMO_DE_BANNERS = 5;

interface CampoBannerProps {
    /** Banners na ordem; o primeiro é o principal, que vira a capa (EVT-164). */
    banners: BannerDoEvento[];
    onChange: (banners: BannerDoEvento[]) => void;
    /** Recusa formatos fora de PNG e JPG (EVT-63). */
    validar: (file: File) => boolean;
}

/** Imagem em edição no modal. Cancelar uma imagem nova descarta; cancelar um ajuste mantém o anterior. */
interface Edicao {
    imagem: ImagemDoBanner;
    recorte?: Recorte;
    /** Índice do banner que muda (ajuste ou troca) ou "novo", para acrescentar no fim. */
    alvo: number | "novo";
}

/** Nome do banner na tela e para leitor de tela: o primeiro é o principal. */
const nomeDoBanner = (i: number) => (i === 0 ? "Banner principal" : `Banner ${i + 1}`);

/**
 * Lista de banners (EVT-164): qual está em foco, o seletor de arquivo, o modal de recorte e as ações
 * (acrescentar, trocar, ajustar, remover e tornar principal). O desktop e o celular usam o mesmo.
 */
function useBanners({ banners, onChange, validar }: CampoBannerProps) {
    const [selecionado, setSelecionado] = useState(0);
    const atual = Math.min(selecionado, Math.max(0, banners.length - 1));
    const [edicao, setEdicao] = useState<Edicao | null>(null);
    const entrada = useRef<HTMLInputElement>(null);
    // Para onde vai o arquivo escolhido no seletor: o banner em foco (trocar) ou um novo.
    const destino = useRef<number | "novo">("novo");
    const podeAcrescentar = banners.length < MAXIMO_DE_BANNERS;

    const receber = (file: File, alvo: number | "novo") => {
        if (!validar(file)) return;
        setEdicao({ imagem: { nome: file.name, url: URL.createObjectURL(file) }, alvo });
    };
    const abrirSeletor = (alvo: number | "novo") => {
        destino.current = alvo;
        entrada.current?.click();
    };
    const ajustar = () => {
        const b = banners[atual];
        if (b) setEdicao({ imagem: b.imagem, recorte: b.recorte, alvo: atual });
    };
    const remover = () => {
        onChange(banners.filter((_, i) => i !== atual));
        setSelecionado(Math.max(0, atual - 1));
    };
    // Tornar principal leva o banner para o primeiro lugar; os outros seguem na mesma ordem.
    const tornarPrincipal = () => {
        if (atual === 0) return;
        onChange([banners[atual], ...banners.filter((_, i) => i !== atual)]);
        setSelecionado(0);
    };

    const seletor = (
        <input
            ref={entrada}
            type="file"
            accept="image/png,image/jpeg"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) receber(file, destino.current);
                e.target.value = "";
            }}
        />
    );
    const modal = edicao && (
        <ModalDeRecorte
            key={edicao.imagem.url}
            imagem={edicao.imagem}
            recorteInicial={edicao.recorte}
            onCancelar={() => setEdicao(null)}
            onAplicar={(r) => {
                const novo = { imagem: edicao.imagem, recorte: r };
                if (edicao.alvo === "novo") {
                    onChange([...banners, novo]);
                    setSelecionado(banners.length);
                } else {
                    const alvo = edicao.alvo;
                    onChange(banners.map((b, i) => (i === alvo ? novo : b)));
                }
                setEdicao(null);
            }}
        />
    );
    // Ações do banner em foco. "Tornar principal" só aparece fora do primeiro.
    const acoes = (
        <>
            <ButtonUtility icon={Crop01} color="tertiary" size="sm" tooltip="Ajustar recorte" onClick={ajustar} />
            {atual > 0 && <ButtonUtility icon={Star01} color="tertiary" size="sm" tooltip="Tornar principal" onClick={tornarPrincipal} />}
            <ButtonUtility icon={RefreshCw01} color="tertiary" size="sm" tooltip="Trocar imagem" onClick={() => abrirSeletor(atual)} />
            <ButtonUtility icon={Trash01} color="tertiary" size="sm" tooltip={`Remover ${nomeDoBanner(atual).toLowerCase()}`} onClick={remover} />
        </>
    );
    const miniaturas = banners.length > 0 && (
        <Miniaturas
            banners={banners}
            selecionado={atual}
            onSelecionar={setSelecionado}
            onAcrescentar={podeAcrescentar ? () => abrirSeletor("novo") : undefined}
            onSoltar={podeAcrescentar ? (file) => receber(file, "novo") : undefined}
        />
    );
    return { atual, banner: banners[atual], abrirSeletor, receber, ajustar, acoes, miniaturas, seletor, modal };
}

/**
 * Miniaturas dos banners, na ordem (EVT-164): clicar põe o banner em foco (na prévia e nas ações); o
 * primeiro é o principal. No fim, o quadro tracejado acrescenta outro banner, até o máximo.
 */
function Miniaturas({
    banners,
    selecionado,
    onSelecionar,
    onAcrescentar,
    onSoltar,
}: {
    banners: BannerDoEvento[];
    selecionado: number;
    onSelecionar: (i: number) => void;
    onAcrescentar?: () => void;
    onSoltar?: (file: File) => void;
}) {
    const [sobre, setSobre] = useState(false);
    return (
        <div role="group" aria-label="Banners do evento" className="flex flex-wrap gap-2">
            {banners.map((b, i) => (
                <button
                    key={`${b.imagem.url}-${i}`}
                    type="button"
                    onClick={() => onSelecionar(i)}
                    aria-label={nomeDoBanner(i)}
                    aria-pressed={i === selecionado}
                    className={cx(
                        "w-12 shrink-0 cursor-pointer overflow-hidden rounded-lg ring-1 ring-secondary transition duration-100 ease-linear focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
                        i === selecionado ? "ring-2 ring-brand" : "opacity-70 hover:opacity-100",
                    )}
                >
                    <ImagemRecortada imagem={b.imagem} recorte={b.recorte} />
                </button>
            ))}
            {onAcrescentar && (
                <button
                    type="button"
                    onClick={onAcrescentar}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setSobre(true);
                    }}
                    onDragLeave={() => setSobre(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setSobre(false);
                        const file = e.dataTransfer.files[0];
                        if (file) onSoltar?.(file);
                    }}
                    aria-label="Adicionar banner"
                    title="Adicionar banner"
                    className={cx(
                        "flex aspect-[4/5] w-12 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-dashed border-primary text-fg-quaternary transition duration-100 ease-linear hover:bg-primary_hover hover:text-fg-quaternary_hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
                        sobre && "border-brand bg-primary_hover",
                    )}
                >
                    <Plus className="size-5" aria-hidden="true" />
                </button>
            )}
        </div>
    );
}

/** Desktop: bloco 4:5 sem rótulo visível. Vazio, é o botão de envio sobre as partículas. */
export function CampoBanner(props: CampoBannerProps) {
    const { atual, banner, abrirSeletor, receber, ajustar, acoes, miniaturas, seletor, modal } = useBanners(props);

    return (
        <div className="flex flex-col gap-3">
            {/* Sem rótulo visível na coluna: o bloco já diz o que é; o nome fica para leitor de tela. */}
            <span className="sr-only" id="banner-rotulo">
                Banner
            </span>
            {seletor}
            {banner ? (
                <>
                    {/* A prévia também abre o ajuste: é o alvo maior. */}
                    <button
                        type="button"
                        onClick={ajustar}
                        aria-label={`Ajustar recorte do ${nomeDoBanner(atual).toLowerCase()}`}
                        className="cursor-pointer overflow-hidden rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                    >
                        <ImagemRecortada imagem={banner.imagem} recorte={banner.recorte} />
                    </button>
                    <div className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 flex-col">
                            <span className="text-sm font-semibold text-primary">{nomeDoBanner(atual)}</span>
                            <span className="truncate text-sm text-tertiary">{banner.imagem.nome}</span>
                        </span>
                        <div className="flex shrink-0 items-center gap-1">{acoes}</div>
                    </div>
                    {miniaturas}
                </>
            ) : (
                <AreaDeEnvio onClique={() => abrirSeletor("novo")} onSoltar={(file) => receber(file, "novo")} />
            )}
            {modal}
        </div>
    );
}

/** Estado vazio: o bloco inteiro é o botão de envio, sobre o campo de partículas. Aceita arrastar. */
function AreaDeEnvio({ onClique, onSoltar }: { onClique: () => void; onSoltar: (file: File) => void }) {
    const [sobre, setSobre] = useState(false);
    const [emFoco, setEmFoco] = useState(false);
    // 40% menos opacas que o valor anterior do banner (0,22 e 0,2), para o texto ler melhor.
    const corPadrao = useCorDeParticulas({ escuro: 0.132, claro: 0.12 });
    // No hover, as partículas ficam no vermelho da marca. Os tokens `brand` deste tema são neutros, então vai o
    // valor do sólido de marca do AFTER DS (#ff271a), o mesmo que a proteção de compra usa.
    const cor = emFoco || sobre ? "#ff271a" : corPadrao;

    return (
        <button
            type="button"
            onClick={onClique}
            onPointerEnter={() => setEmFoco(true)}
            onPointerLeave={() => setEmFoco(false)}
            onDragOver={(e) => {
                e.preventDefault();
                setSobre(true);
            }}
            onDragLeave={() => setSobre(false)}
            onDrop={(e) => {
                e.preventDefault();
                setSobre(false);
                const file = e.dataTransfer.files[0];
                if (file) onSoltar(file);
            }}
            aria-labelledby="banner-rotulo"
            aria-describedby="banner-dica"
            className={cx(
                "group relative isolate flex aspect-[4/5] w-full cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl bg-primary_alt p-6 text-center transition-colors duration-250 ease-out motion-reduce:transition-none",
                "hover:bg-primary_hover/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
                sobre && "bg-primary_hover/10 ring-2 ring-brand",
            )}
        >
            <CampoDeParticulas cor={cor} densidade={1.5} escala={2} className="absolute inset-0 -z-10 size-full" />
            <span className="flex size-12 items-center justify-center rounded-full bg-primary shadow-xs ring-1 ring-secondary ring-inset">
                <ImageUp className="size-6 text-fg-secondary" aria-hidden="true" />
            </span>
            <span className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-primary">Clique para enviar o banner</span>
                <span className="text-sm text-tertiary">ou arraste a imagem para cá</span>
            </span>
            <span id="banner-dica" className="flex flex-col text-sm text-tertiary">
                <span>PNG ou JPG</span>
                <span>1080 × 1350 px</span>
            </span>
        </button>
    );
}

/**
 * Celular e telas médias (EVT-80): a versão do desktop, enxuta. Uma caixa sem padding, com o banner
 * pequeno (4:5) à esquerda e o texto à direita, centralizado na altura. Vazia, a caixa inteira é o
 * botão de envio, sobre o mesmo campo de partículas do desktop.
 */
export function CampoBannerCompacto(props: CampoBannerProps) {
    const { atual, banner, abrirSeletor, receber, ajustar, acoes, miniaturas, seletor, modal } = useBanners(props);

    return (
        <div className="flex flex-col gap-3">
            {seletor}
            {banner ? (
                <div className={CAIXA}>
                    <button
                        type="button"
                        onClick={ajustar}
                        aria-label={`Ajustar recorte do ${nomeDoBanner(atual).toLowerCase()}`}
                        className="w-24 shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring"
                    >
                        <ImagemRecortada imagem={banner.imagem} recorte={banner.recorte} />
                    </button>
                    <div className="flex min-w-0 flex-1 items-center gap-1 pr-2 pl-4">
                        <span className="flex min-w-0 flex-1 flex-col">
                            <span className="text-sm font-semibold text-primary">{nomeDoBanner(atual)}</span>
                            <span className="truncate text-sm text-tertiary">{banner.imagem.nome}</span>
                        </span>
                        {acoes}
                    </div>
                </div>
            ) : (
                <CaixaDeEnvio titulo="Enviar o banner" dica="PNG ou JPG, 1080 × 1350 px" onClique={() => abrirSeletor("novo")} onSoltar={(file) => receber(file, "novo")} />
            )}
            {miniaturas}
            {modal}
        </div>
    );
}

/** Caixa enxuta do banner (EVT-80): sem padding, ícone num quadro 4:5 à esquerda e o texto à direita. */
const CAIXA = "relative isolate flex w-full items-stretch overflow-hidden rounded-2xl bg-primary_alt ring-1 ring-secondary ring-inset";

/**
 * Envio de imagem vazio, na caixa enxuta do banner (EVT-80): a caixa inteira é o botão, sobre o campo de
 * partículas, e aceita arrastar. É o único desenho de envio de imagem da criação: o banner no celular e o
 * mapa usam esta caixa (antes o mapa usava a área de envio genérica, com outro desenho).
 */
export function CaixaDeEnvio({ titulo, dica, onClique, onSoltar }: { titulo: string; dica: string; onClique: () => void; onSoltar: (file: File) => void }) {
    const id = useId();
    const [sobre, setSobre] = useState(false);
    const [emFoco, setEmFoco] = useState(false);
    const corPadrao = useCorDeParticulas({ escuro: 0.132, claro: 0.12 });
    // No hover, o vermelho da marca do AFTER DS, como no banner do desktop (EVT-79).
    const cor = emFoco || sobre ? "#ff271a" : corPadrao;
    return (
        <button
            type="button"
            onClick={onClique}
            onPointerEnter={() => setEmFoco(true)}
            onPointerLeave={() => setEmFoco(false)}
            onDragOver={(e) => {
                e.preventDefault();
                setSobre(true);
            }}
            onDragLeave={() => setSobre(false)}
            onDrop={(e) => {
                e.preventDefault();
                setSobre(false);
                const file = e.dataTransfer.files[0];
                if (file) onSoltar(file);
            }}
            aria-labelledby={`${id}-titulo`}
            aria-describedby={`${id}-dica`}
            className={cx(
                CAIXA,
                "cursor-pointer text-left transition-colors duration-250 ease-out hover:bg-primary_hover/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring motion-reduce:transition-none",
                sobre && "bg-primary_hover/10 ring-2 ring-brand",
            )}
        >
            {/* Partículas na caixa toda, sumindo para a direita, onde fica o texto. */}
            <CampoDeParticulas
                cor={cor}
                densidade={1.5}
                escala={2}
                className="absolute inset-0 -z-10 size-full [mask-image:linear-gradient(to_right,black_0%,black_25%,transparent_80%)]"
            />
            <span className="flex aspect-[4/5] w-24 shrink-0 items-center justify-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary shadow-xs ring-1 ring-secondary ring-inset">
                    <ImageUp className="size-5 text-fg-secondary" aria-hidden="true" />
                </span>
            </span>
            <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-4 py-3">
                <span id={`${id}-titulo`} className="text-sm font-semibold text-primary">
                    {titulo}
                </span>
                <span id={`${id}-dica`} className="text-sm text-tertiary">
                    {dica}
                </span>
            </span>
        </button>
    );
}

/** Modal de recorte do DS (layout de `image-crop-modal`), com a proporção travada em 4:5. */
function ModalDeRecorte({
    imagem,
    recorteInicial,
    onCancelar,
    onAplicar,
}: {
    imagem: ImagemDoBanner;
    recorteInicial?: Recorte;
    onCancelar: () => void;
    onAplicar: (r: Recorte) => void;
}) {
    const [recorte, setRecorte] = useState<Recorte | undefined>(recorteInicial);

    // Imagem nova: começa no maior recorte 4:5 possível, centralizado.
    const aoCarregar = (e: SyntheticEvent<HTMLImageElement>) => {
        if (recorteInicial) return;
        const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
        setRecorte(centerCrop(makeAspectCrop({ unit: "%", width: 100 }, PROPORCAO_BANNER, w, h), w, h));
    };

    return (
        // Clicar fora não fecha: arrastar o recorte até a borda e soltar fora descartava a imagem (EVT-141, T6).
        // Fecham Cancelar, X e Esc (EVT-81).
        <ModalOverlay isOpen onOpenChange={(aberto) => !aberto && onCancelar()}>
            <Modal className="sm:max-w-140">
                <Dialog>
                    <div className="relative w-full overflow-hidden rounded-2xl bg-primary shadow-xl ring-1 ring-border-secondary">
                        <CloseButton theme="light" size="sm" label="Fechar" onPress={onCancelar} className="absolute top-3 right-3 sm:top-4 sm:right-4" />
                        <div className="flex gap-4 px-4 pt-5 sm:px-6 sm:pt-6">
                            <FeaturedIcon color="gray" size="md" theme="modern" icon={Crop01} className="max-sm:hidden" />
                            <div className="z-10 flex flex-col gap-0.5 pr-8">
                                <AriaHeading slot="title" className="text-md font-semibold text-primary">
                                    Recortar banner
                                </AriaHeading>
                                <p className="text-sm text-tertiary">Arraste a área para escolher o que aparece. O banner fica em 1080 × 1350 px.</p>
                            </div>
                        </div>
                        <div className="h-5 w-full" />
                        <div className="flex justify-center px-4 sm:px-6">
                            <Cropper aspect={PROPORCAO_BANNER} crop={recorte} keepSelection minWidth={40} onChange={(_pixel, percent) => setRecorte(percent)}>
                                <Cropper.Img src={imagem.url} alt={imagem.nome} onLoad={aoCarregar} className="max-h-[55vh] w-auto" />
                            </Cropper>
                        </div>
                        <div className="z-10 flex flex-col pt-6 pb-4 sm:pt-8 sm:pb-6">
                            <div className="w-full border-t border-secondary max-md:hidden" />
                            <div className="h-4 w-full max-md:hidden sm:h-6" />
                            <div className="flex flex-1 flex-col-reverse gap-3 px-4 sm:flex-row sm:justify-end sm:px-6">
                                <Button color="secondary" size="md" onClick={onCancelar}>
                                    Cancelar
                                </Button>
                                <Button color="primary" size="md" isDisabled={!recorte} onClick={() => recorte && onAplicar(recorte)}>
                                    Aplicar recorte
                                </Button>
                            </div>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
