import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { InfoCircle, Trash01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { cx } from "@/utils/cx";
import { atualizarEvento, type Evento, type RastreamentoDoEvento } from "@/plataforma";
import { BackstageLayout } from "../../components/Backstage";
import { AbasDeDivulgacao, CHAVE_DA_DIVULGACAO } from "../../components/abas-de-divulgacao";
import { ModalDeConfirmacao } from "../../components/modal-de-confirmacao";
import { useCatalogo } from "../../itens/data/catalogo";
import { ModalDeInstrucoes } from "../components/modal-de-instrucoes";
import { erroDoCampo, PLATAFORMAS, type CampoDoPixel, type PlataformaDePixel } from "../data/plataformas";

/*
 * Pixel de rastreamento (pixel-de-rastreamento/rules.md): o gêmeo da tela de produção `tracking`.
 * Uma linha por plataforma; cada uma salva e exclui sozinha, sem mexer nas outras.
 */

const T = {
    titulo: "Pixel de rastreamento",
    subtitulo: "Configure pixels de rastreamento para monitorar o comportamento dos usuários nas suas páginas.",
    instrucoes: "Instruções",
    salvar: "Salvar",
    excluir: "Excluir ID",
    salvo: "Pixel salvo com sucesso.",
    erroSalvar: "Não foi possível salvar o pixel. Tente novamente.",
    removido: "ID removido com sucesso.",
    erroRemover: "Não foi possível remover o ID. Tente novamente.",
    excluirTitulo: (nome: string) => `Excluir o ID do ${nome}?`,
    excluirTexto: "A página de compra para de enviar eventos para essa plataforma.",
    excluirConfirmar: "Sim, excluir",
    cancelar: "Cancelar",
    carregando: "Carregando...",
};

export function PixelDeRastreamento() {
    const { evento, carregando } = useCatalogo();
    return (
        <BackstageLayout activeSection="marketing" activeItem="pixel" chaveDaTela={CHAVE_DA_DIVULGACAO}>
            <div className="flex min-w-0 flex-1 flex-col gap-8">
                <AbasDeDivulgacao ativa="pixel" />
                <h2 className="sr-only">{T.titulo}</h2>
                {carregando || !evento ? (
                    <div role="status" aria-label={T.carregando} className="flex flex-col gap-px overflow-hidden rounded-2xl ring-1 ring-secondary">
                        {PLATAFORMAS.map((p) => (
                            <span key={p.id} aria-hidden="true" className="h-20 w-full animate-pulse bg-secondary motion-reduce:animate-none" />
                        ))}
                    </div>
                ) : (
                    // Trocar de evento recomeça os rascunhos.
                    <ListaDePixels key={evento.id} evento={evento} />
                )}
            </div>
        </BackstageLayout>
    );
}

const valoresDe = (r: RastreamentoDoEvento | undefined) =>
    Object.fromEntries(PLATAFORMAS.flatMap((p) => p.campos.map((c) => [c.chave, r?.[c.chave] ?? ""]))) as Record<CampoDoPixel, string>;

/** Rascunho dos pixels na sessão do navegador, por evento (PIX-09): trocar de aba e voltar não apaga o digitado. */
const chaveDoRascunho = (eventoId: string) => `pixel:rascunho:v1:${eventoId}`;
function lerRascunho(eventoId: string): Partial<Record<CampoDoPixel, string>> {
    try {
        return JSON.parse(window.sessionStorage.getItem(chaveDoRascunho(eventoId)) ?? "{}");
    } catch {
        return {};
    }
}

function ListaDePixels({ evento }: { evento: Evento }) {
    const salvos = valoresDe(evento.rastreamento);
    const [rascunho, setRascunho] = useState(() => ({ ...salvos, ...lerRascunho(evento.id) }));
    const reduzir = useReducedMotion();
    const pendentes = PLATAFORMAS.some((p) => p.campos.some((c) => rascunho[c.chave].trim() !== salvos[c.chave]));

    // Guarda só o que difere do salvo; sem diferença, limpa.
    useEffect(() => {
        const diferentes = Object.fromEntries(Object.entries(rascunho).filter(([k, v]) => v.trim() !== salvos[k as CampoDoPixel]));
        try {
            if (Object.keys(diferentes).length) window.sessionStorage.setItem(chaveDoRascunho(evento.id), JSON.stringify(diferentes));
            else window.sessionStorage.removeItem(chaveDoRascunho(evento.id));
        } catch {
            /* sem armazenamento: o rascunho vive só enquanto a tela está aberta */
        }
    });

    // Fechar a aba ou sair do site com ID não salvo pergunta antes.
    useEffect(() => {
        if (!pendentes) return;
        const aviso = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", aviso);
        return () => window.removeEventListener("beforeunload", aviso);
    }, [pendentes]);
    const [salvando, setSalvando] = useState<string | null>(null);
    const [instrucoes, setInstrucoes] = useState<PlataformaDePixel | null>(null);
    const [excluindo, setExcluindo] = useState<PlataformaDePixel | null>(null);

    // Grava só os campos da linha, por cima do que já está salvo (PIX-06).
    const gravar = async (p: PlataformaDePixel, valores: Partial<Record<CampoDoPixel, string>>) => {
        await atualizarEvento(evento.id, { rastreamento: { ...evento.rastreamento, ...valores } });
    };

    const salvar = async (p: PlataformaDePixel) => {
        const valores = Object.fromEntries(p.campos.map((c) => [c.chave, rascunho[c.chave].trim()]));
        setSalvando(p.id);
        try {
            await gravar(p, valores);
            setRascunho((r) => ({ ...r, ...valores }));
            toast.success(T.salvo);
        } catch {
            toast.error(T.erroSalvar);
        } finally {
            setSalvando(null);
        }
    };

    const excluir = async () => {
        if (!excluindo) return;
        const p = excluindo;
        const vazios = Object.fromEntries(p.campos.map((c) => [c.chave, ""]));
        setSalvando(p.id);
        try {
            await gravar(p, vazios);
            setRascunho((r) => ({ ...r, ...vazios }));
            toast.success(T.removido);
            setExcluindo(null);
        } catch {
            toast.error(T.erroRemover);
        } finally {
            setSalvando(null);
        }
    };

    return (
        <>
            <ul className="flex flex-col divide-y divide-secondary rounded-2xl bg-primary ring-1 ring-secondary">
                {PLATAFORMAS.map((p) => {
                    const alterado = p.campos.some((c) => rascunho[c.chave].trim() !== salvos[c.chave]);
                    const temSalvo = p.campos.some((c) => salvos[c.chave] !== "");
                    const erros = p.campos.map((c) => erroDoCampo(rascunho[c.chave], c));
                    const ocupado = salvando === p.id;
                    return (
                        <li key={p.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:gap-6 md:p-6">
                            {/* Marca, nome e instruções: no celular, a instrução vira ícone ao lado do nome. */}
                            <div className="flex min-h-11 items-center gap-3 md:w-52 md:shrink-0 lg:w-64">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-fg-secondary">
                                    <p.marca className="size-5" />
                                </span>
                                <div className="flex min-w-0 flex-1 flex-col items-start">
                                    <span className="text-md font-semibold text-primary">
                                        {p.nome} {p.complemento && <span className="font-normal text-tertiary">{p.complemento}</span>}
                                    </span>
                                    <Button color="link-color" size="sm" onClick={() => setInstrucoes(p)} className="hidden md:inline-flex">
                                        {T.instrucoes}
                                    </Button>
                                </div>
                                <ButtonUtility icon={InfoCircle} color="tertiary" size="sm" tooltip={p.instrucoes.titulo} onClick={() => setInstrucoes(p)} className="md:hidden" />
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start">
                                {p.campos.map((c, i) => (
                                    <div key={c.chave} className="min-w-0 flex-1">
                                        <Input
                                            label={c.rotulo}
                                            placeholder={c.placeholder}
                                            value={rascunho[c.chave]}
                                            onChange={(v) => setRascunho((r) => ({ ...r, [c.chave]: v }))}
                                            isInvalid={!!erros[i]}
                                            hint={erros[i]}
                                            isDisabled={ocupado}
                                            autoComplete="off"
                                        />
                                    </div>
                                ))}
                            </div>
                            {/*
                              Salvar só com alteração; a lixeira só com ID salvo (PIX-05, PIX-07). No desktop o lugar das
                              ações fica reservado (o campo não encolhe quando o Salvar aparece) e alinhado ao campo,
                              abaixo do rótulo; o Salvar entra esmaecendo.
                            */}
                            <div className={cx("flex items-center gap-2 md:min-h-11 md:w-32 md:shrink-0 md:pt-6.5", !(alterado || temSalvo) && "max-md:hidden")}>
                                <AnimatePresence initial={false}>
                                    {alterado && (
                                        <motion.div
                                            key="salvar"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: reduzir ? 0.12 : 0.2 }}
                                        >
                                            <Button color="secondary" size="md" onClick={() => void salvar(p)} isLoading={ocupado} showTextWhileLoading isDisabled={erros.some(Boolean)}>
                                                {T.salvar}
                                            </Button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                {temSalvo && (
                                    // Vermelho só no hover e no foco: a lixeira parada é neutra.
                                    <ButtonUtility
                                        icon={Trash01}
                                        color="tertiary"
                                        tooltip={T.excluir}
                                        onClick={() => setExcluindo(p)}
                                        isDisabled={ocupado}
                                        className="hover:text-fg-error-secondary focus-visible:text-fg-error-secondary"
                                    />
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>

            <ModalDeInstrucoes plataforma={instrucoes} onFechar={() => setInstrucoes(null)} />
            <ModalDeConfirmacao
                aberto={!!excluindo}
                titulo={T.excluirTitulo(excluindo?.nome ?? "")}
                descricao={T.excluirTexto}
                confirmar={T.excluirConfirmar}
                cancelar={T.cancelar}
                destrutiva
                icone={Trash01}
                carregando={!!excluindo && salvando === excluindo.id}
                onConfirmar={() => void excluir()}
                onFechar={() => setExcluindo(null)}
            />
        </>
    );
}
