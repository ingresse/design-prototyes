import { useEditorState } from "@tiptap/react";
import { TextEditor, useEditorContext } from "@/components/base/text-editor/text-editor";
import { EditorButton } from "@/components/base/text-editor/text-editor-button";
import {
    TextEditorAlignCenter,
    TextEditorAlignLeft,
    TextEditorAlignRight,
    TextEditorBold,
    TextEditorBulletList,
    TextEditorItalic,
    TextEditorUnderline,
} from "@/components/base/text-editor/text-editor-extensions";
import { HintText } from "@/components/base/input/hint-text";
import { Tooltip } from "@/components/base/tooltip/tooltip";
import { cx } from "@/utils/cx";

/* ------------------------------------------------------------------ */
/*  Descrição do evento (v0.10, SCE-206)                               */
/*  O mesmo editor do "Sobre o evento" do Criar evento do AWA          */
/*  (eventos/pages/CriarEvento.tsx, EVT-86): editor de texto do DS     */
/*  com a barra negrito, itálico, sublinhado, alinhar à esquerda, ao   */
/*  centro e à direita, lista com marcadores e lista numerada. Sem     */
/*  link (o botão do DS pede a URL num prompt em inglês) e sem imagem  */
/*  no texto. Até 30.000 caracteres, com contador.                     */
/* ------------------------------------------------------------------ */

export const LIMITE_DA_DESCRICAO = 30000;

/** Texto sem as marcações, para contar caracteres e para o resumo da revisão. */
export const textoPuro = (html: string) => (html ? (new DOMParser().parseFromString(html, "text/html").body.textContent ?? "") : "");

/** Ícone de lista numerada (o pacote de ícones do DS não tem um). */
const IconeListaNumerada = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
        <path d="M10 6h11M10 12h11M10 18h11" />
        <path d="M4 4.5h1.5V9" strokeWidth="1.6" />
        <path d="M3.5 15.2c.3-.6.9-.9 1.5-.9.8 0 1.4.5 1.4 1.2 0 1-2.9 1.9-2.9 3.5h3" strokeWidth="1.6" />
    </svg>
);

const ListaNumerada = () => {
    const { editor, isDisabled } = useEditorContext();
    const { ativo } = useEditorState({ editor, selector: ({ editor }) => ({ ativo: editor?.isActive("orderedList") ?? false }) });
    return (
        <EditorButton aria-label="Lista numerada" isDisabled={isDisabled} isActive={ativo} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <IconeListaNumerada className="size-5" />
        </EditorButton>
    );
};

const Separador = () => (
    <div className="p-1.5" aria-hidden="true">
        <div className="h-full w-px rounded-full bg-border-primary" />
    </div>
);

const Barra = () => (
    <div role="toolbar" aria-label="Formatação da descrição" className="flex flex-wrap gap-0.5">
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
        <Tooltip title="Alinhar à direita">
            <TextEditorAlignRight />
        </Tooltip>
        <Separador />
        <Tooltip title="Lista com marcadores">
            <TextEditorBulletList />
        </Tooltip>
        <Tooltip title="Lista numerada">
            <ListaNumerada />
        </Tooltip>
    </div>
);

/** Rodapé: onde aparece à esquerda e a contagem (N/30.000) à direita; acima do limite, vira erro. */
const Rodape = ({ dica, erro, limite }: { dica?: string; erro?: string; limite: number }) => {
    const { editor } = useEditorContext();
    const { total } = useEditorState({ editor, selector: ({ editor }) => ({ total: editor?.storage.characterCount?.characters?.() ?? 0 }) });
    const passou = total > limite;
    return (
        <div className="flex w-full items-start justify-between gap-3">
            <HintText isInvalid={!!erro || passou}>{erro ?? (passou ? `Passou do limite. Use até ${limite.toLocaleString("pt-BR")} caracteres.` : dica)}</HintText>
            <span className={cx("shrink-0 text-sm tabular-nums", passou ? "text-error-primary" : "text-tertiary")} aria-live="polite">
                {total.toLocaleString("pt-BR")}/{limite.toLocaleString("pt-BR")}
            </span>
        </div>
    );
};

/** Editor de texto com a barra do AWA (descrição do evento e texto do termo de uso, v0.11). */
export function EditorDeTexto({
    id,
    rotulo,
    valor,
    onChange,
    erro,
    limite,
    dica,
    placeholder,
    isRequired,
    ocultarRotulo,
}: {
    id: string;
    rotulo: string;
    valor: string;
    onChange: (html: string) => void;
    erro?: string;
    limite: number;
    dica?: string;
    placeholder: string;
    isRequired?: boolean;
    ocultarRotulo?: boolean;
}) {
    return (
        <div id={id} data-erro={erro ? "" : undefined} className="min-w-0 scroll-mt-6">
            <TextEditor.Root
                content={valor}
                limit={limite}
                onUpdate={({ editor }) => {
                    const html = editor.getHTML();
                    onChange(html === "<p></p>" ? "" : html);
                }}
                placeholder={placeholder}
                className="flex min-w-0 flex-col gap-1.5"
                inputClassName="min-h-40 resize-y rounded-none rounded-b-lg bg-transparent px-3.5 pt-2 pb-3 shadow-none ring-0 focus:ring-0"
            >
                <TextEditor.Label isRequired={isRequired} className={ocultarRotulo ? "sr-only" : undefined}>
                    {rotulo}
                </TextEditor.Label>
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
                <Rodape dica={dica} erro={erro} limite={limite} />
            </TextEditor.Root>
        </div>
    );
}

export function CampoDescricao({ id, valor, onChange, erro }: { id: string; valor: string; onChange: (html: string) => void; erro?: string }) {
    return (
        <EditorDeTexto
            id={id}
            rotulo="Descrição (opcional)"
            valor={valor}
            onChange={onChange}
            erro={erro}
            limite={LIMITE_DA_DESCRICAO}
            placeholder="Conte como é a prova: percurso, programação, kit e o que está incluso."
        />
    );
}
