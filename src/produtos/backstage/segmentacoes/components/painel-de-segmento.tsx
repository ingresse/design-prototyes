import { useId, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Check, CreditCard01, Database01, FileCheck02, Upload01, User01, XClose } from "@untitledui/icons";
import { Heading as AriaHeading } from "react-aria-components";
import { Dialog, Modal, ModalOverlay, SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { CloseButton } from "@/components/base/buttons/close-button";
import { FileTrigger } from "@/components/base/file-upload-trigger/file-upload-trigger";
import { HintText } from "@/components/base/input/hint-text";
import { Input } from "@/components/base/input/input";
import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { TextArea } from "@/components/base/textarea/textarea";
import type { Segmentacao } from "@/plataforma";
import { CampoNumero } from "../../components/campo-numero";
import { ModalDeConfirmacao } from "../../components/modal-de-confirmacao";
import { ARQUIVO_MAX_BYTES, juntarDocumentos, lerDocumentos, LIMITE_POR_ARQUIVO, LIMITE_POR_SEGMENTO, LIMITE_POR_VEZ, novaSegmentacao, resumoDaIdade } from "../data/segmentacoes";

/*
 * Painel do segmento (SEG-20 a SEG-29, SEG-60 a SEG-66): "Novo segmento" ou "Editar segmento". Nome e os
 * critérios abertos, um abaixo do outro; a lista manual soma documentos à existente (a caixa começa vazia
 * ao editar). Fechar com algo alterado pergunta antes de descartar.
 */

const T = {
    criar: "Novo segmento",
    editar: "Editar segmento",
    identificacao: "Identificação do segmento",
    nome: "Nome do segmento",
    nomePlaceholder: "Ex.: Sócios ouro",
    nomeDica: "Dá para mudar depois.",
    erroNome: "Dê um nome ao segmento.",
    criterios: "Critérios",
    criteriosDica: "Quem cumpre os critérios faz parte do segmento. Quanto mais critérios, menor o grupo.",
    idade: "Idade",
    idadeInicial: "Idade inicial",
    idadeFinal: "Idade final",
    idadeDica: "Deixe em branco para não limitar.",
    erroIdade: "Use uma idade inicial menor ou igual à final.",
    lista: "Lista manual",
    listaDica: "CPF ou passaporte, separados por vírgula, espaço ou linha. Até 1.000 por vez e 100.000 no segmento. Os novos somam aos que já estão no segmento.",
    listaPlaceholder: "Ex.: 123.456.789-09, AB123456",
    umInvalido: "Corrija ou apague o documento destacado: não é um CPF nem um passaporte válido.",
    invalidos: "Corrija ou apague os {n} documentos destacados: não são CPF nem passaporte válidos.",
    acimaPorVez: "Envie até 1.000 documentos por vez. Para mais, use o arquivo CSV.",
    importar: "Importar CSV",
    alterarArquivo: "Trocar arquivo",
    importarDica: "Arquivo CSV com os documentos separados por vírgula: até 10.000 documentos e 2 MB.",
    importado: "Arquivo importado",
    removerArquivo: "Remover arquivo importado",
    travadoTexto: "Com um arquivo importado, a caixa fica bloqueada. Remova o arquivo para digitar.",
    travadoArquivo: "Com documentos na caixa, a importação fica bloqueada. Limpe a caixa para importar.",
    erroArquivoTitulo: "Não foi possível importar",
    erroTamanho: "Envie um arquivo de até 2 MB.",
    erroFormato: "Envie um arquivo CSV (.csv).",
    erroArquivoCheio: "Envie um arquivo com até 10.000 documentos. Este tem {n}.",
    planos: "Planos de provedores externos",
    planosVazio: "Nenhum provedor externo (sócio-torcedor, clube de assinatura) está conectado a esta organização.",
    documento: "Documento exigido no checkout",
    novo: "Novo",
    salvar: "Salvar",
    cancelar: "Cancelar",
    criado: "Segmento criado",
    criadoDica: "{nome} foi criado.",
    atualizado: "Segmento atualizado",
    atualizadoDica: "{nome} foi atualizado.",
    erroCriar: "Tente de novo: não foi possível criar o segmento.",
    erroAtualizar: "Tente de novo: não foi possível atualizar o segmento.",
    documentosNoSegmento: "{n} já estão neste segmento.",
    descartarTitulo: "Descartar o que você preencheu?",
    descartarTexto: "O que você preencheu ainda não foi salvo.",
};

const f = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
const n = (v: number) => v.toLocaleString("pt-BR");

/** Um critério: ícone, nome, resumo à direita e o conteúdo sempre aberto (SEG-61). */
function Criterio({ icone: Icone, titulo, resumo, children }: { icone: typeof User01; titulo: ReactNode; resumo?: ReactNode; children: ReactNode }) {
    const id = useId();
    return (
        <section aria-labelledby={id} className="overflow-hidden rounded-lg ring-1 ring-secondary">
            <div className="flex items-center gap-3 border-b border-secondary px-4 py-3">
                <Icone className="size-5 shrink-0 text-fg-quaternary" aria-hidden="true" />
                <h4 id={id} className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold text-primary">
                    {titulo}
                </h4>
                {resumo}
            </div>
            <div className="bg-secondary_subtle px-4 py-3">{children}</div>
        </section>
    );
}

export function PainelDeSegmento({
    segmento,
    segmentacoes,
    gravar,
    onFechar,
}: {
    segmento?: Segmentacao;
    segmentacoes: Segmentacao[];
    gravar: (l: Segmentacao[]) => Promise<void>;
    onFechar: (salvo?: Segmentacao) => void;
}) {
    const [s, setS] = useState<Segmentacao>(() => segmento ?? novaSegmentacao());
    const [inicial] = useState(() => JSON.stringify(segmento ?? s));
    const [texto, setTexto] = useState("");
    const [arquivo, setArquivo] = useState<{ nome: string; validos: Segmentacao["documentos"]; invalidos: string[] } | null>(null);
    const [erroArquivo, setErroArquivo] = useState<string | null>(null);
    const [gravando, setGravando] = useState(false);
    const [tentou, setTentou] = useState(false);
    const [perguntando, setPerguntando] = useState(false);
    const tituloId = useId();
    const nomeId = useId();
    const listaId = useId();

    const digitados = lerDocumentos(texto);
    const invalidos = arquivo ? arquivo.invalidos : digitados.invalidos;
    const novos = arquivo ? arquivo.validos : digitados.validos;
    const idadeInvalida = s.idadeMinima != null && s.idadeMaxima != null && s.idadeMinima > s.idadeMaxima;
    const acimaPorVez = !arquivo && novos.length > LIMITE_POR_VEZ;
    const faltaNome = !s.nome.trim();
    const alterado = JSON.stringify(s) !== inicial || texto.trim().length > 0 || arquivo !== null;

    // Fechar com algo alterado pergunta antes (SEG-62).
    const pedirParaFechar = () => (alterado && !gravando ? setPerguntando(true) : onFechar());

    const importar = async (lista: FileList | null) => {
        const a = lista?.[0];
        if (!a) return;
        if (!/\.csv$/i.test(a.name)) return setErroArquivo(T.erroFormato);
        if (a.size > ARQUIVO_MAX_BYTES) return setErroArquivo(T.erroTamanho);
        const lido = lerDocumentos(await a.text());
        const total = lido.validos.length + lido.invalidos.length;
        if (total > LIMITE_POR_ARQUIVO) return setErroArquivo(f(T.erroArquivoCheio, { n: n(total) }));
        setArquivo({ nome: a.name, ...lido });
        toast.success(T.importado, { description: `${a.name}: ${n(lido.validos.length)} ${lido.validos.length === 1 ? "documento" : "documentos"}.` });
    };

    // Salvar fica sempre habilitado: ao clicar, os erros aparecem e o foco vai ao primeiro (SEG-63).
    const salvar = async () => {
        setTentou(true);
        if (faltaNome) return void requestAnimationFrame(() => document.getElementById(nomeId)?.focus());
        if (idadeInvalida) return;
        if (invalidos.length > 0 || acimaPorVez) return void requestAnimationFrame(() => document.getElementById(listaId)?.focus());
        setGravando(true);
        const pronto: Segmentacao = { ...s, nome: s.nome.trim(), documentos: juntarDocumentos(s.documentos, novos).slice(0, LIMITE_POR_SEGMENTO), atualizadoEm: new Date().toISOString() };
        try {
            await gravar(segmento ? segmentacoes.map((x) => (x.id === pronto.id ? pronto : x)) : [...segmentacoes, pronto]);
            if (segmento) toast.success(T.atualizado, { description: f(T.atualizadoDica, { nome: pronto.nome }) });
            else toast.success(T.criado, { description: f(T.criadoDica, { nome: pronto.nome }) });
            onFechar(pronto);
        } catch {
            toast.error(segmento ? T.erroAtualizar : T.erroCriar);
        } finally {
            setGravando(false);
        }
    };

    const resumo = (conteudo: ReactNode, erro = false) => <span className={erro ? "text-xs text-error-primary" : "text-xs text-tertiary tabular-nums"}>{conteudo}</span>;

    return (
        // Peças do painel lateral do DS montadas aqui para o painel ter o nome do título e o "Fechar" em português (SEG-64):
        // o SlideoutMenu pronto fixa "Slideout menu" e "Close".
        <ModalOverlay isOpen isDismissable={!alterado} onOpenChange={(v) => !v && pedirParaFechar()} className="z-50 pl-0">
            <Modal className="md:max-w-[640px]">
                <Dialog aria-label={undefined} aria-labelledby={tituloId} className="gap-0">
                    <header className="relative z-1 w-full px-4 pt-6 pb-4 md:px-6">
                        <AriaHeading id={tituloId} className="pr-8 text-lg font-semibold text-primary">
                            {segmento ? T.editar : T.criar}
                        </AriaHeading>
                        {segmento && <p className="pr-8 text-sm text-tertiary">{segmento.nome}</p>}
                        <CloseButton size="sm" label="Fechar" className="absolute top-3 right-3 shrink-0" onPress={pedirParaFechar} />
                    </header>
                    <SlideoutMenu.Content role="region" aria-label="Formulário do segmento" className="gap-8 pb-6">
                        <section className="flex flex-col gap-3">
                            <h3 className="text-md font-semibold text-primary">{T.identificacao}</h3>
                            <Input
                                id={nomeId}
                                label={T.nome}
                                isRequired
                                autoFocus
                                placeholder={T.nomePlaceholder}
                                value={s.nome}
                                onChange={(v) => setS({ ...s, nome: v })}
                                isInvalid={tentou && faltaNome}
                                hint={tentou && faltaNome ? T.erroNome : T.nomeDica}
                            />
                        </section>
                        <section className="flex flex-col gap-3">
                            <div className="flex flex-col gap-1">
                                <h3 className="text-md font-semibold text-primary">{T.criterios}</h3>
                                <p className="text-sm text-tertiary">{T.criteriosDica}</p>
                            </div>
                            <div className="flex flex-col gap-3">
                                <Criterio icone={User01} titulo={T.idade} resumo={resumo(resumoDaIdade(s.idadeMinima, s.idadeMaxima))}>
                                    <div className="flex flex-col gap-2">
                                        <div className="grid grid-cols-2 gap-3">
                                            <CampoNumero label={T.idadeInicial} placeholder="Sem mínimo" valor={s.idadeMinima} vazio onChange={(v) => setS({ ...s, idadeMinima: v })} isInvalid={idadeInvalida} />
                                            <CampoNumero label={T.idadeFinal} placeholder="Sem máximo" valor={s.idadeMaxima} vazio onChange={(v) => setS({ ...s, idadeMaxima: v })} isInvalid={idadeInvalida} />
                                        </div>
                                        <HintText isInvalid={idadeInvalida}>{idadeInvalida ? T.erroIdade : T.idadeDica}</HintText>
                                    </div>
                                </Criterio>
                                <Criterio
                                    icone={FileCheck02}
                                    titulo={T.lista}
                                    resumo={s.documentos.length > 0 ? resumo(`${n(s.documentos.length)} ${s.documentos.length === 1 ? "documento" : "documentos"}`) : undefined}
                                >
                                    <div className="flex flex-col gap-3">
                                        <p className="text-sm text-tertiary">{T.listaDica}</p>
                                        {segmento && s.documentos.length > 0 && (
                                            <p className="text-sm text-secondary">
                                                {f(T.documentosNoSegmento, { n: `${n(s.documentos.length)} ${s.documentos.length === 1 ? "documento" : "documentos"}` })}
                                            </p>
                                        )}
                                        {/* Caixa e arquivo são exclusivos (SEG-25): um trava o outro, com o motivo visível (SEG-65). */}
                                        <TextArea
                                            id={listaId}
                                            aria-label={T.lista}
                                            rows={5}
                                            placeholder={T.listaPlaceholder}
                                            value={texto}
                                            onChange={setTexto}
                                            isDisabled={!!arquivo}
                                            isInvalid={invalidos.length > 0 || acimaPorVez}
                                            hint={arquivo ? T.travadoTexto : undefined}
                                        />
                                        {invalidos.length > 0 && (
                                            <div className="flex flex-col gap-2" role="alert">
                                                <p className="text-sm text-error-primary">{invalidos.length === 1 ? T.umInvalido : f(T.invalidos, { n: n(invalidos.length) })}</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {invalidos.slice(0, 20).map((d, i) => (
                                                        <span key={`${d}-${i}`} className="rounded-md bg-error-primary px-2 py-0.5 font-mono text-sm text-error-primary ring-1 ring-error_subtle">
                                                            {d}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {acimaPorVez && (
                                            <p role="alert" className="text-sm text-error-primary">
                                                {T.acimaPorVez}
                                            </p>
                                        )}
                                        <div className="flex flex-wrap items-center gap-3">
                                            <FileTrigger acceptedFileTypes={[".csv", "text/csv"]} onSelect={(fl) => void importar(fl)}>
                                                <Button color="secondary" size="sm" iconLeading={arquivo ? Check : Upload01} isDisabled={!!texto.trim()}>
                                                    {arquivo ? T.alterarArquivo : T.importar}
                                                </Button>
                                            </FileTrigger>
                                            {arquivo && (
                                                <span className="flex items-center gap-1 rounded-md bg-secondary py-1 pr-1 pl-2 text-sm text-secondary">
                                                    {`${arquivo.nome}: ${n(arquivo.validos.length)} ${arquivo.validos.length === 1 ? "documento" : "documentos"}`}
                                                    <ButtonUtility icon={XClose} color="tertiary" size="xs" tooltip={T.removerArquivo} onClick={() => setArquivo(null)} />
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-tertiary">{texto.trim() ? T.travadoArquivo : T.importarDica}</p>
                                    </div>
                                </Criterio>
                                <Criterio icone={Database01} titulo={T.planos}>
                                    <p className="text-sm text-tertiary">{T.planosVazio}</p>
                                </Criterio>
                                <Criterio
                                    icone={CreditCard01}
                                    titulo={
                                        <>
                                            {T.documento}
                                            <Badge type="pill-color" color="brand" size="sm">
                                                {T.novo}
                                            </Badge>
                                        </>
                                    }
                                >
                                    <RadioGroup
                                        aria-label={T.documento}
                                        value={s.documentoNoCheckout}
                                        onChange={(v) => setS({ ...s, documentoNoCheckout: v as Segmentacao["documentoNoCheckout"] })}
                                        className="gap-3"
                                    >
                                        <RadioButton value="nenhum" label="Nenhum" />
                                        <RadioButton value="cie" label="CIE (Carteira de Identificação Estudantil)" />
                                    </RadioGroup>
                                </Criterio>
                            </div>
                        </section>
                    </SlideoutMenu.Content>
                    <SlideoutMenu.Footer className="mt-auto flex justify-end gap-3">
                        <Button color="secondary" size="md" onClick={pedirParaFechar} isDisabled={gravando}>
                            {T.cancelar}
                        </Button>
                        <Button color="primary" size="md" isLoading={gravando} showTextWhileLoading onClick={() => void salvar()}>
                            {T.salvar}
                        </Button>
                    </SlideoutMenu.Footer>
                    <ModalDeConfirmacao aberto={!!erroArquivo} titulo={T.erroArquivoTitulo} descricao={erroArquivo} confirmar="Entendi" onFechar={() => setErroArquivo(null)} />
                    <ModalDeConfirmacao
                        aberto={perguntando}
                        titulo={T.descartarTitulo}
                        descricao={T.descartarTexto}
                        cancelar="Continuar editando"
                        confirmar="Descartar"
                        destrutiva
                        onConfirmar={() => {
                            setPerguntando(false);
                            onFechar();
                        }}
                        onFechar={() => setPerguntando(false)}
                    />
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
