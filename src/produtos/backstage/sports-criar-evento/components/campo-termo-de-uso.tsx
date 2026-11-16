import { useState } from "react";
import { toast } from "sonner";
import { Eye, Plus } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { HintText } from "@/components/base/input/hint-text";
import { Label } from "@/components/base/input/label";
import { Select } from "@/components/base/select/select";
import { Toggle } from "@/components/base/toggle/toggle";
import { FORA_DO_ESCOPO } from "../data/opcoes";
import { criarTermo, LIMITE_DO_TERMO, termoPorId, useTermos } from "../data/termos";
import { CampoTexto } from "./campos";
import { EditorDeTexto, textoPuro } from "./campo-descricao";

/* ------------------------------------------------------------------ */
/*  Termo de uso do evento (v0.11, SCE-207)                            */
/*  Como "Políticas › Termos de uso" do evento no AWA: uma lista com   */
/*  os termos ativos da organização, já com o padrão dela escolhido.   */
/*  "Ver" abre o texto; "Criar novo termo" abre o modal do AWA (nome,  */
/*  texto até 5.000 caracteres, "Tornar termo de uso padrão"); salvar  */
/*  cadastra na organização e escolhe para o evento.                   */
/* ------------------------------------------------------------------ */

/** Texto do termo, só leitura (o HTML vem do editor do DS ou do termo padrão). */
const TextoDoTermo = ({ html }: { html: string }) => (
    <div className="flex flex-col gap-3 text-sm leading-6 text-secondary [&_li]:ml-6 [&_ol]:list-decimal [&_strong]:font-semibold [&_ul]:list-disc" dangerouslySetInnerHTML={{ __html: html }} />
);

export function CampoTermoDeUso({ id, termoId, onEscolher }: { id: string; termoId: string | null; onEscolher: (id: string) => void }) {
    const termos = useTermos();
    const ativos = termos.filter((t) => t.ativo);
    const escolhido = termoPorId(termoId);
    const [vendo, setVendo] = useState(false);
    const [criando, setCriando] = useState(false);

    return (
        <div id={id} className="flex min-w-0 scroll-mt-6 flex-col gap-1.5">
            <Label id={`${id}-rotulo`} tooltip="Antes de iniciar a inscrição, o atleta vê o termo e marca que leu e aceita para seguir. Os termos são da organização: o padrão já vem escolhido.">
                Termo de uso
            </Label>
            <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1 basis-full @2xl:basis-64">
                    <Select
                        aria-labelledby={`${id}-rotulo`}
                        items={ativos.map((t) => ({ id: t.id, label: t.nome, supportingText: t.padrao ? "Padrão da organização" : undefined }))}
                        selectedKey={escolhido?.id ?? null}
                        onSelectionChange={(k) => k != null && onEscolher(String(k))}
                        placeholder="Escolha um termo"
                    >
                        {(item) => (
                            <Select.Item id={item.id} supportingText={item.supportingText}>
                                {item.label}
                            </Select.Item>
                        )}
                    </Select>
                </div>
                <Button color="secondary" size="md" iconLeading={Eye} isDisabled={!escolhido} onClick={() => setVendo(true)}>
                    Ver
                </Button>
                <Button color="secondary" size="md" iconLeading={Plus} onClick={() => setCriando(true)}>
                    Criar novo termo
                </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                {/* "Padrão da organização" já aparece no campo e na lista (texto de apoio do item). */}
                <HintText>O atleta aceita este termo antes de iniciar a inscrição.</HintText>
                <Button color="link-gray" size="sm" onClick={() => toast(FORA_DO_ESCOPO)}>
                    Gerenciar termos da organização
                </Button>
            </div>

            {/* Ver: título e texto, só leitura. */}
            <ModalOverlay isOpen={vendo} onOpenChange={setVendo} isDismissable>
                <Modal className="sm:max-w-2xl">
                    <Dialog aria-label={escolhido?.nome ?? "Termo de uso"}>
                        <div className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-2xl bg-primary shadow-xl ring-1 ring-border-secondary">
                            <div className="flex shrink-0 items-start justify-between gap-3 px-6 pt-6 pb-4">
                                <div className="flex flex-col gap-1">
                                    <h2 className="text-lg font-semibold text-primary">{escolhido?.nome}</h2>
                                    {escolhido?.padrao && <span className="text-sm text-tertiary">Termo de uso padrão da organização</span>}
                                </div>
                                <CloseButton theme="light" size="sm" label="Fechar" onPress={() => setVendo(false)} />
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto border-t border-secondary px-6 py-5">{escolhido && <TextoDoTermo html={escolhido.html} />}</div>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>

            {criando && (
                <NovoTermo
                    onFechar={() => setCriando(false)}
                    onCriado={(novo) => {
                        onEscolher(novo);
                        setCriando(false);
                    }}
                />
            )}
        </div>
    );
}

/** "Novo termo de uso", como o modal do AWA: nome (visto pelo atleta), texto até 5.000 caracteres e "Tornar termo de uso padrão". */
function NovoTermo({ onFechar, onCriado }: { onFechar: () => void; onCriado: (id: string) => void }) {
    const [nome, setNome] = useState("");
    const [html, setHtml] = useState("");
    const [padrao, setPadrao] = useState(false);
    const [tentou, setTentou] = useState(false);
    const caracteres = textoPuro(html).length;
    const erros = {
        nome: !nome.trim() ? "Dê um nome ao termo de uso" : undefined,
        texto: !textoPuro(html).trim() ? "Escreva o texto do termo de uso" : caracteres > LIMITE_DO_TERMO ? `Use até ${LIMITE_DO_TERMO.toLocaleString("pt-BR")} caracteres no texto do termo` : undefined,
    };
    const salvar = () => {
        setTentou(true);
        if (erros.nome || erros.texto) return;
        const id = criarTermo(nome.trim(), html, padrao);
        toast.success(padrao ? `"${nome.trim()}" criado e definido como padrão da organização` : `"${nome.trim()}" criado e escolhido para este evento`);
        onCriado(id);
    };
    return (
        <ModalOverlay isOpen onOpenChange={(v) => !v && onFechar()} isDismissable>
            <Modal className="sm:max-w-2xl">
                <Dialog aria-label="Novo termo de uso">
                    <div className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-primary shadow-xl ring-1 ring-border-secondary">
                        <div className="flex shrink-0 items-start justify-between gap-3 px-6 pt-6 pb-4">
                            <div className="flex flex-col gap-0.5">
                                <h2 className="text-lg font-semibold text-primary">Novo termo de uso</h2>
                                <p className="text-sm text-tertiary">Fica nos termos da organização e já é escolhido para este evento.</p>
                            </div>
                            <CloseButton theme="light" size="sm" label="Fechar" onPress={onFechar} />
                        </div>
                        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto border-t border-secondary px-6 py-5">
                            <CampoTexto
                                id="novo-termo-nome"
                                label="Nome"
                                isRequired
                                autoFocus
                                placeholder="Dê um nome para o termo de uso"
                                dica="Este nome será visto pelo atleta."
                                valor={nome}
                                onChange={setNome}
                                erro={tentou ? erros.nome : undefined}
                            />
                            <EditorDeTexto
                                id="novo-termo-texto"
                                rotulo="Texto do termo"
                                isRequired
                                valor={html}
                                onChange={setHtml}
                                limite={LIMITE_DO_TERMO}
                                placeholder="Insira aqui o texto do termo de uso"
                                erro={tentou ? erros.texto : undefined}
                            />
                            {/* A dica fica fora do Toggle: dentro dele, o texto não quebra e passa da largura do modal. */}
                            <div className="flex flex-col gap-0.5">
                                <Toggle size="sm" label="Tornar termo de uso padrão" isSelected={padrao} onChange={setPadrao} aria-describedby="novo-termo-padrao-dica" />
                                <p id="novo-termo-padrao-dica" className="pl-11 text-sm text-tertiary">
                                    Este termo será automaticamente associado a novos eventos. Se já houver um termo de uso padrão, ele será substituído.
                                </p>
                            </div>
                        </div>
                        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-secondary px-6 py-4 sm:flex-row sm:justify-end">
                            <Button color="secondary" size="md" onClick={onFechar}>
                                Cancelar
                            </Button>
                            <Button color="primary" size="md" onClick={salvar}>
                                Salvar novo termo
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
