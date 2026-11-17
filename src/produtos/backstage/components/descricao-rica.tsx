import { useRef } from "react";
import { Image01 } from "@untitledui/icons";
import { TextEditor, useEditorContext } from "@/components/base/text-editor/text-editor";
import { EditorButton } from "@/components/base/text-editor/text-editor-button";
import {
    TextEditorAlignCenter,
    TextEditorAlignLeft,
    TextEditorBold,
    TextEditorBulletList,
    TextEditorItalic,
    TextEditorUnderline,
} from "@/components/base/text-editor/text-editor-extensions";
import { Tooltip } from "@/components/base/tooltip/tooltip";
import { cx } from "@/utils/cx";

/*
 * Descrição em rich text do Backstage: o editor do DS com uma barra própria (negrito, itálico,
 * sublinhado, alinhamento, lista e imagem), sem cor nem fonte, porque a página do comprador usa as
 * cores e a tipografia da Ingresse. Usado no "Sobre o evento" (EVT-86) e na descrição do ingresso.
 */

const lerComoDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = reject;
        r.readAsDataURL(file);
    });

/** Parágrafos em texto puro de um HTML do editor (blocos e itens de lista viram um parágrafo cada). */
export function paragrafosDoHtml(html: string): string[] {
    if (!html) return [];
    const doc = new DOMParser().parseFromString(html, "text/html");
    const blocos = doc.body.querySelectorAll("p, li, h1, h2, h3, h4, blockquote");
    const textos = blocos.length ? [...blocos].map((b) => b.textContent ?? "") : [doc.body.textContent ?? ""];
    return textos.map((t) => t.trim()).filter(Boolean);
}

const Separador = () => (
    <div className="p-1.5" aria-hidden="true">
        <div className="h-full w-px rounded-full bg-border-primary" />
    </div>
);

/**
 * Imagem no meio da descrição. O botão do DS grava um endereço temporário do navegador, que some ao
 * recarregar; aqui a imagem entra como data URL, sem limite de tamanho (EVT-86).
 */
const InserirImagem = () => {
    const { editor, isDisabled } = useEditorContext();
    const arquivo = useRef<HTMLInputElement>(null);
    return (
        <>
            <input
                ref={arquivo}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    editor.chain().focus().setImage({ src: await lerComoDataUrl(file), alt: "" }).run();
                }}
            />
            <EditorButton aria-label="Inserir imagem" isDisabled={isDisabled} onClick={() => arquivo.current?.click()}>
                <Image01 className="size-5" />
            </EditorButton>
        </>
    );
};

/** Sem link, porque o editor pede a URL num prompt em inglês. */
const Barra = () => (
    <div role="toolbar" aria-label="Formatação da descrição" className="flex w-max flex-wrap gap-0.5">
        <Tooltip title="Negrito ⌘B">
            <TextEditorBold />
        </Tooltip>
        <Tooltip title="Itálico ⌘I">
            <TextEditorItalic />
        </Tooltip>
        <Tooltip title="Sublinhado ⌘U">
            <TextEditorUnderline />
        </Tooltip>
        <Separador />
        <Tooltip title="Alinhar à esquerda">
            <TextEditorAlignLeft />
        </Tooltip>
        <Tooltip title="Centralizar">
            <TextEditorAlignCenter />
        </Tooltip>
        <Separador />
        <Tooltip title="Lista">
            <TextEditorBulletList />
        </Tooltip>
        <Separador />
        <Tooltip title="Inserir imagem">
            <InserirImagem />
        </Tooltip>
    </div>
);

interface DescricaoRicaProps {
    label: string;
    /** HTML do editor; vazio quando não há texto. */
    valor: string;
    onChange: (html: string) => void;
    placeholder?: string;
    isRequired?: boolean;
    erro?: string;
    /** Texto de apoio abaixo do campo, quando não há erro. */
    hint?: string;
    className?: string;
}

export function DescricaoRica({ label, valor, onChange, placeholder, isRequired, erro, hint, className }: DescricaoRicaProps) {
    return (
        <TextEditor.Root
            content={valor}
            onUpdate={({ editor }) => {
                const html = editor.getHTML();
                onChange(html === "<p></p>" ? "" : html);
            }}
            // Imagem redimensionável pelos cantos, mantendo a proporção (EVT-86). O editor do DS não expõe a
            // opção; ela é ligada antes de o editor montar, quando as visualizações dos nós ainda não existem.
            onBeforeCreate={({ editor }) => {
                // As opções são recalculadas a cada leitura (addOptions): troca a função, não o objeto.
                const imagem = editor.extensionManager.extensions.find((e) => e.name === "image");
                if (!imagem) return;
                const anteriores = imagem.options;
                imagem.config.addOptions = () => ({
                    ...anteriores,
                    resize: { enabled: true, alwaysPreserveAspectRatio: true, minWidth: 80, minHeight: 40, directions: ["top-left", "top-right", "bottom-left", "bottom-right"] },
                });
            }}
            placeholder={placeholder}
            className={cx("flex min-w-0 flex-1 flex-col gap-1.5", className)}
            inputClassName={cx(
                "min-h-40 resize-y rounded-none rounded-b-lg bg-transparent px-3.5 pt-2 pb-3 shadow-none ring-0 focus:ring-0",
                // Mesmo visual do recorte do banner (Cropper do DS): contorno de 2 px em utility-brand-600 e alças
                // quadradas brancas de 12 px com borda de 2 px. Aparecem ao passar o mouse ou com a imagem selecionada.
                "[&_[data-resize-container]]:my-3 [&_[data-resize-wrapper]]:max-w-full [&_[data-resize-wrapper]_img]:h-auto! [&_[data-resize-wrapper]_img]:max-w-full",
                "[&_[data-resize-wrapper]]:outline-2 [&_[data-resize-wrapper]]:-outline-offset-2 [&_[data-resize-wrapper]]:outline-transparent [&_[data-resize-wrapper]]:transition-[outline-color] [&_[data-resize-wrapper]]:duration-100",
                "[&_[data-resize-container]:hover_[data-resize-wrapper]]:outline-utility-brand-600 [&_.ProseMirror-selectednode_[data-resize-wrapper]]:outline-utility-brand-600 [&_[data-resize-state=true]_[data-resize-wrapper]]:outline-utility-brand-600",
                "[&_[data-resize-handle]]:z-10 [&_[data-resize-handle]]:size-3 [&_[data-resize-handle]]:border-2 [&_[data-resize-handle]]:border-utility-brand-600 [&_[data-resize-handle]]:bg-white [&_[data-resize-handle]]:opacity-0 [&_[data-resize-handle]]:transition-opacity [&_[data-resize-handle]]:duration-100",
                "[&_[data-resize-container]:hover_[data-resize-handle]]:opacity-100 [&_.ProseMirror-selectednode_[data-resize-handle]]:opacity-100 [&_[data-resize-state=true]_[data-resize-handle]]:opacity-100",
                "[&_[data-resize-handle=top-left]]:-translate-1/2 [&_[data-resize-handle=top-left]]:cursor-nwse-resize [&_[data-resize-handle=bottom-right]]:translate-1/2 [&_[data-resize-handle=bottom-right]]:cursor-nwse-resize",
                "[&_[data-resize-handle=top-right]]:translate-x-1/2 [&_[data-resize-handle=top-right]]:-translate-y-1/2 [&_[data-resize-handle=top-right]]:cursor-nesw-resize [&_[data-resize-handle=bottom-left]]:-translate-x-1/2 [&_[data-resize-handle=bottom-left]]:translate-y-1/2 [&_[data-resize-handle=bottom-left]]:cursor-nesw-resize",
            )}
        >
            <TextEditor.Label isRequired={isRequired}>{label}</TextEditor.Label>
            <div
                className={cx(
                    "flex flex-col overflow-hidden rounded-lg bg-primary shadow-xs ring-1 ring-primary transition duration-100 ease-linear ring-inset focus-within:ring-2 focus-within:ring-brand",
                    erro && "ring-error_subtle focus-within:ring-error",
                )}
            >
                <div className="border-b border-secondary px-2 py-1.5">
                    <Barra />
                </div>
                <TextEditor.Content />
            </div>
            {erro ? <p className="text-sm text-error-primary">{erro}</p> : hint ? <p className="text-sm text-tertiary">{hint}</p> : null}
        </TextEditor.Root>
    );
}
