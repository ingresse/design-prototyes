import { useRef, useState, type ReactNode, type SyntheticEvent } from "react";
import { Crop01, ImagePlus, RefreshCcw01, RefreshCw01, RefreshCw05, Trash01, ZoomIn, ZoomOut } from "@untitledui/icons";
import { Heading as AriaHeading } from "react-aria-components";
import { centerCrop, convertToPixelCrop, makeAspectCrop, type PercentCrop, type PixelCrop } from "react-image-crop";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { CloseButton } from "@/components/base/buttons/close-button";
import { HintText } from "@/components/base/input/hint-text";
import { Label } from "@/components/base/input/label";
import { Cropper } from "@/components/shared-assets/image-cropper/cropper";
import { cx } from "@/utils/cx";
import type { Arquivo } from "../data/tipos";

/* ------------------------------------------------------------------ */
/*  Envio de arquivos do passo Evento (v0.9, SCE-200 a SCE-203)        */
/*  Imagens (banner e percurso) como no Criar evento do AWA            */
/*  (backstage/eventos/components/campo-banner.tsx): escolher abre     */
/*  "Ajustar imagem" com a proporção travada, zoom e rotação; o que    */
/*  fica é o recorte, no tamanho recomendado. Antes de enviar, os      */
/*  requisitos; cada recusa diz o motivo e como corrigir.              */
/*  (v0.11: o termo de uso saiu daqui; é texto, em campo-termo-de-uso.tsx.) */
/* ------------------------------------------------------------------ */

/** Extensão do arquivo enviado, em maiúsculas (ex.: "GIF"), ou o tipo quando não há extensão. */
const extensao = (f: File) => {
    const m = /\.([a-z0-9]+)$/i.exec(f.name);
    return (m?.[1] ?? f.type.split("/")[1] ?? "").toUpperCase();
};

const mb = (bytes: number) => (bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const px = (n: number) => n.toLocaleString("pt-BR");

/** Requisitos de uma imagem: proporção travada no recorte, saída no tamanho recomendado e mínimo aceito. */
export interface RegrasDaImagem {
    /** Ex.: "4:5". */
    proporcao: string;
    recomendado: { largura: number; altura: number };
    minimo: { largura: number; altura: number };
    /** Bytes. */
    limite: number;
}

/** Os requisitos numa frase, para a dica antes de enviar. */
export const textoDosRequisitos = (r: RegrasDaImagem) =>
    `JPG ou PNG, até ${mb(r.limite)} MB. Recomendado: ${px(r.recomendado.largura)} × ${px(r.recomendado.altura)} px (proporção ${r.proporcao}); mínimo ${px(r.minimo.largura)} × ${px(r.minimo.altura)} px.`;

/** Motivo da recusa por formato ou tamanho do arquivo (SCE-23), antes de abrir a imagem. */
const motivoDoArquivo = (f: File, limite: number): string | null => {
    if (!["image/jpeg", "image/png"].includes(f.type) && !/\.(jpe?g|png)$/i.test(f.name)) {
        const ext = extensao(f);
        return ext ? `Formato ${ext} não aceito. Envie JPG ou PNG.` : "Formato não aceito. Envie JPG ou PNG.";
    }
    if (f.size > limite) return `A imagem tem ${mb(f.size)} MB. Envie uma de até ${mb(limite)} MB.`;
    return null;
};

/** Lê as dimensões da imagem; recusa a que não abre. */
const dimensoes = (url: string) =>
    new Promise<{ largura: number; altura: number }>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ largura: img.naturalWidth, altura: img.naturalHeight });
        img.onerror = reject;
        img.src = url;
    });

/** Gera o recorte (JPEG no tamanho recomendado), com o zoom e a rotação aplicados (receita do react-image-crop). */
async function exportarRecorte(img: HTMLImageElement, recorte: PixelCrop, zoom: number, rotacao: number, saida: { largura: number; altura: number }) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const escalaX = img.naturalWidth / img.width;
    const escalaY = img.naturalHeight / img.height;
    canvas.width = saida.largura;
    canvas.height = saida.altura;
    const k = saida.largura / (recorte.width * escalaX);
    ctx.scale(k, k);
    ctx.imageSmoothingQuality = "high";
    const cx0 = img.naturalWidth / 2;
    const cy0 = img.naturalHeight / 2;
    ctx.save();
    ctx.translate(-recorte.x * escalaX, -recorte.y * escalaY);
    ctx.translate(cx0, cy0);
    ctx.rotate((rotacao * Math.PI) / 180);
    ctx.scale(zoom, zoom);
    ctx.translate(-cx0, -cy0);
    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, img.naturalWidth, img.naturalHeight);
    ctx.restore();
    return canvas.toDataURL("image/jpeg", 0.85);
}

/** Proporção "4:5" → 0,8. */
const razao = (p: string) => {
    const [l, a] = p.split(":").map(Number);
    return l / a;
};

/**
 * Imagem com recorte (banner e percurso), no formato compacto do AWA (v0.10, SCE-205): um cartão de uma linha,
 * com o quadro do ícone à esquerda, "Clique para adicionar…" (Opcional) e a orientação essencial numa linha.
 * O resto (para que serve e o mínimo) fica no (?) do rótulo; a nota (ex.: e-mail) numa linha embaixo. Aceita
 * arrastar. Escolher valida formato, tamanho e dimensão mínima (cada um com a sua mensagem) e abre "Ajustar
 * imagem". Depois, a mesma linha com a miniatura do recorte e Ajustar recorte, Trocar e Remover.
 */
export function CampoImagemComRecorte({
    id,
    label,
    titulo,
    regras,
    arquivo,
    dica,
    observacao,
    onAplicar,
    onRemover,
}: {
    id: string;
    label: string;
    /** Chamada do cartão vazio, ex.: "Clique para adicionar um banner". */
    titulo: string;
    regras: RegrasDaImagem;
    /** O recorte aplicado (url = imagem recortada) e o original, para ajustar de novo. */
    arquivo: Arquivo | null;
    /** Para que serve a imagem, em uma frase (vai no (?) do rótulo). */
    dica?: string;
    /** Nota curta embaixo do cartão (ex.: onde mais a imagem aparece). */
    observacao?: ReactNode;
    onAplicar: (a: Arquivo) => void;
    onRemover: () => void;
}) {
    const entrada = useRef<HTMLInputElement>(null);
    const [erro, setErro] = useState<string | null>(null);
    const [sobre, setSobre] = useState(false);
    const [edicao, setEdicao] = useState<{ nome: string; tamanho: number; url: string } | null>(null);
    const proporcao = razao(regras.proporcao);
    const essencial = `JPG ou PNG, até ${mb(regras.limite)} MB, proporção ${regras.proporcao} (${px(regras.recomendado.largura)} × ${px(regras.recomendado.altura)} px)`;
    const ajuda = `${dica ? `${dica} ` : ""}Mínimo de ${px(regras.minimo.largura)} × ${px(regras.minimo.altura)} px. Depois de escolher, você ajusta o recorte.`;

    const aceitar = async (f: File) => {
        const motivo = motivoDoArquivo(f, regras.limite);
        if (motivo) return setErro(motivo);
        const url = URL.createObjectURL(f);
        try {
            const d = await dimensoes(url);
            if (d.largura < regras.minimo.largura || d.altura < regras.minimo.altura)
                return setErro(`A imagem tem ${px(d.largura)} × ${px(d.altura)} px. Envie uma de pelo menos ${px(regras.minimo.largura)} × ${px(regras.minimo.altura)} px.`);
        } catch {
            return setErro("Não foi possível abrir a imagem. Envie outro arquivo JPG ou PNG.");
        }
        setErro(null);
        setEdicao({ nome: f.name, tamanho: f.size, url });
    };
    const abrir = () => entrada.current?.click();
    const caixa = cx(
        "flex w-full items-center gap-4 rounded-xl bg-primary p-2 pr-3 text-left ring-1 ring-secondary transition duration-100 ease-linear ring-inset",
        erro && "ring-error_subtle",
    );

    return (
        <div id={id} data-erro={erro ? "" : undefined} className="flex min-w-0 scroll-mt-6 flex-col gap-1.5">
            <Label isInvalid={!!erro} tooltip={ajuda}>
                {label}
            </Label>
            <input
                ref={entrada}
                type="file"
                accept="image/png,image/jpeg"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void aceitar(f);
                }}
            />
            {arquivo?.url ? (
                <div className={caixa}>
                    <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary">
                        <img src={arquivo.url} alt={`Prévia: ${label}`} className="max-h-full max-w-full object-contain" style={{ aspectRatio: proporcao }} />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-semibold text-primary">{arquivo.nome}</span>
                        <span className="truncate text-sm text-tertiary">
                            Recorte {regras.proporcao}, {px(regras.recomendado.largura)} × {px(regras.recomendado.altura)} px
                        </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        {arquivo.original && (
                            <ButtonUtility
                                icon={Crop01}
                                color="tertiary"
                                size="sm"
                                tooltip="Ajustar recorte"
                                onClick={() => setEdicao({ nome: arquivo.nome, tamanho: arquivo.tamanho, url: arquivo.original! })}
                            />
                        )}
                        <ButtonUtility icon={RefreshCw01} color="tertiary" size="sm" tooltip="Trocar imagem" onClick={abrir} />
                        <ButtonUtility
                            icon={Trash01}
                            color="tertiary"
                            size="sm"
                            tooltip="Remover imagem"
                            onClick={() => {
                                setErro(null);
                                onRemover();
                            }}
                        />
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={abrir}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setSobre(true);
                    }}
                    onDragLeave={() => setSobre(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setSobre(false);
                        const f = e.dataTransfer.files[0];
                        if (f) void aceitar(f);
                    }}
                    aria-describedby={`${id}-orientacao`}
                    className={cx(caixa, "cursor-pointer outline-focus-ring hover:bg-primary_hover focus-visible:outline-2 focus-visible:outline-offset-2", sobre && "ring-2 ring-brand")}
                >
                    <span className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-secondary">
                        <ImagePlus className="size-5 text-fg-secondary" aria-hidden="true" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-sm">
                            <span className="font-semibold text-primary">{titulo}</span> <span className="text-tertiary">(Opcional)</span>
                        </span>
                        <span id={`${id}-orientacao`} className="text-sm text-tertiary">
                            {essencial}
                        </span>
                    </span>
                </button>
            )}
            {/* Recusa: o motivo e como corrigir, embaixo do cartão (HintText do DS). */}
            {erro && <HintText isInvalid>{erro}</HintText>}
            {observacao && <p className="flex items-start gap-1.5 text-sm text-tertiary">{observacao}</p>}
            {edicao && (
                <AjustarImagem
                    imagem={edicao}
                    regras={regras}
                    onCancelar={() => setEdicao(null)}
                    onAplicar={(url) => {
                        onAplicar({ nome: edicao.nome, tamanho: edicao.tamanho, url, original: edicao.url });
                        setEdicao(null);
                    }}
                />
            )}
        </div>
    );
}

/** "Ajustar imagem" (como o do AWA): proporção no título, zoom − e +, rotação, Cancelar e Aplicar recorte (botões do DS). */
function AjustarImagem({
    imagem,
    regras,
    onCancelar,
    onAplicar,
}: {
    imagem: { nome: string; url: string };
    regras: RegrasDaImagem;
    onCancelar: () => void;
    onAplicar: (url: string) => void;
}) {
    // O Img do Cropper não repassa ref: a imagem sai do contêiner.
    const ref = useRef<HTMLDivElement>(null);
    const [recorte, setRecorte] = useState<PercentCrop>();
    const [zoom, setZoom] = useState(1);
    const [rotacao, setRotacao] = useState(0);
    const proporcao = razao(regras.proporcao);

    const aoCarregar = (e: SyntheticEvent<HTMLImageElement>) => {
        const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
        setRecorte(centerCrop(makeAspectCrop({ unit: "%", width: 100 }, proporcao, w, h), w, h));
    };
    const aplicar = async () => {
        const img = ref.current?.querySelector("img");
        if (!img || !recorte) return;
        const url = await exportarRecorte(img, convertToPixelCrop(recorte, img.width, img.height), zoom, rotacao, regras.recomendado);
        if (url) onAplicar(url);
    };

    return (
        <ModalOverlay isOpen onOpenChange={(aberto) => !aberto && onCancelar()} isDismissable>
            <Modal className="sm:max-w-180">
                <Dialog aria-label="Ajustar imagem">
                    <div className="relative w-full overflow-hidden rounded-2xl bg-primary shadow-xl ring-1 ring-border-secondary">
                        <CloseButton theme="light" size="sm" label="Fechar" onPress={onCancelar} className="absolute top-3 right-3 sm:top-4 sm:right-4" />
                        <div className="flex flex-col gap-4 px-4 pt-5 sm:px-6 sm:pt-6">
                            <AriaHeading slot="title" className="flex flex-wrap items-baseline gap-2 pr-8 text-lg font-semibold text-primary">
                                Ajustar imagem <span className="text-sm font-medium text-brand-secondary">Proporção {regras.proporcao}</span>
                            </AriaHeading>
                            {/* Zoom e rotação, como no AWA. */}
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                                <div className="flex items-center gap-1" role="group" aria-label="Zoom">
                                    <span className="mr-1 font-medium text-secondary">Zoom:</span>
                                    <ButtonUtility icon={ZoomOut} color="tertiary" size="sm" tooltip="Diminuir zoom" isDisabled={zoom <= 1} onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(1)))} />
                                    <span className="w-12 text-center text-secondary tabular-nums" aria-live="polite">
                                        {Math.round(zoom * 100)}%
                                    </span>
                                    <ButtonUtility icon={ZoomIn} color="tertiary" size="sm" tooltip="Aumentar zoom" isDisabled={zoom >= 3} onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(1)))} />
                                </div>
                                <div className="flex items-center gap-1" role="group" aria-label="Rotação">
                                    <span className="mr-1 font-medium text-secondary">Rotação:</span>
                                    <ButtonUtility icon={RefreshCcw01} color="tertiary" size="sm" tooltip="Girar para a esquerda" onClick={() => setRotacao((r) => (r - 90) % 360)} />
                                    <span className="w-12 text-center text-secondary tabular-nums" aria-live="polite">
                                        {rotacao}°
                                    </span>
                                    <ButtonUtility icon={RefreshCw05} color="tertiary" size="sm" tooltip="Girar para a direita" onClick={() => setRotacao((r) => (r + 90) % 360)} />
                                </div>
                            </div>
                        </div>
                        <div ref={ref} className="mt-4 flex justify-center bg-secondary px-4 py-4 sm:px-6">
                            <Cropper aspect={proporcao} crop={recorte} keepSelection minWidth={40} onChange={(_p, percent) => setRecorte(percent)}>
                                <Cropper.Img
                                    src={imagem.url}
                                    alt={imagem.nome}
                                    onLoad={aoCarregar}
                                    className="max-h-[55vh] w-auto"
                                    style={{ transform: `scale(${zoom}) rotate(${rotacao}deg)` }}
                                />
                            </Cropper>
                        </div>
                        <p className="px-4 pt-3 text-sm text-tertiary sm:px-6">
                            Arraste a área para escolher o que aparece. A imagem fica em {px(regras.recomendado.largura)} × {px(regras.recomendado.altura)} px.
                        </p>
                        <div className="flex flex-col-reverse gap-3 px-4 pt-5 pb-4 sm:flex-row sm:justify-end sm:px-6 sm:pb-6">
                            <Button color="secondary" size="md" onClick={onCancelar}>
                                Cancelar
                            </Button>
                            <Button color="primary" size="md" isDisabled={!recorte} onClick={() => void aplicar()}>
                                Aplicar recorte
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
