import { useRef, useState } from "react";
import { toast } from "sonner";
import { DotsVertical, Eye, FileCheck02, Plus, XClose } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Input } from "@/components/base/input/input";
import { Toggle } from "@/components/base/toggle/toggle";
import { lerDoc, novoId, salvar, type TermoDeUso } from "@/plataforma";
import { BackstageLayout } from "../../components/Backstage";
import { CabecalhoDaPagina } from "../../components/cabecalho-da-pagina";
import { DescricaoRica } from "../../components/descricao-rica";
import { ModalDeConfirmacao } from "../../components/modal-de-confirmacao";
import { useOrganizacaoAtual } from "../../organizacoes/data/organizacao-atual";
import { CabecalhoDaTabela, CarregandoTabela, CartaoDaTabela, LinhaDaTabela, VazioDaTabela } from "../../components/tabela";

/*
 * Termos de uso (termos-de-uso/rules.md): o gêmeo de `settings/terms-of-use` de produção. Lista com
 * ativar e desativar, "Novo termo de uso" e "Visualizar" (só leitura; dá para tornar padrão).
 */

const T = {
    titulo: "Termos de uso",
    voltar: "Ajustes",
    novo: "Novo termo de uso",
    colNome: "Termo",
    colAtivo: "Ativo na compra",
    padrao: "Termo padrão",
    visualizar: "Visualizar",
    opcoes: "Mais opções",
    ativado: "Termo de uso ativado com sucesso!",
    desativado: "Termo de uso desativado com sucesso!",
    erroStatus: "Erro ao atualizar status do termo de uso",
    desfazer: "Desfazer",
    desativarPadraoTitulo: "Desativar o termo padrão?",
    desativarPadraoTexto: "Sem um termo padrão ativo, o link de compra dos seus eventos deixa de pedir o aceite dos termos. O termo continua salvo e pode ser ativado de novo.",
    desativarPadraoConfirmar: "Desativar termo",
    descartarTitulo: "Descartar o novo termo?",
    descartarTexto: "O nome e o texto que você escreveu não ficam salvos.",
    descartar: "Descartar",
    continuar: "Continuar editando",
    vazioTitulo: "Nenhum termo de uso cadastrado",
    vazioTexto: "Crie seu primeiro termo de uso para começar.",
    // Modal
    novoDica: "Preencha as informações do novo termo de uso.",
    nome: "Nome do termo",
    nomePlaceholder: "Dê um nome para o termo de uso",
    nomeDica: "Este nome será visto pelo comprador.",
    erroNome: "Nome é obrigatório",
    conteudo: "Texto do termo",
    conteudoPlaceholder: "Insira aqui o texto do termo de uso",
    erroConteudo: "Conteúdo é obrigatório",
    erroLongo: "Descrição deve ter no máximo 5000 caracteres",
    tornarPadrao: "Tornar termo de uso padrão",
    tornarPadraoDica: "Este termo será automaticamente associado a novos eventos. Se já houver um termo de uso padrão, ele será substituído.",
    salvarNovo: "Salvar novo termo",
    criado: "Termo de uso criado com sucesso!",
    definido: "Termo definido como padrão com sucesso!",
    erro: "Ocorreu um erro durante a operação. Tente novamente.",
    visualizarTitulo: "Visualizar termo de uso",
    fechar: "Fechar",
    cancelar: "Cancelar",
};

const LIMITE = 5000;
const textoPuro = (html: string) => html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();

export function TermosDeUso() {
    const org = useOrganizacaoAtual();
    const termos = org?.termosDeUso ?? [];
    const [modal, setModal] = useState<{ tipo: "novo" } | { tipo: "ver"; termo: TermoDeUso } | null>(null);

    const gravar = async (lista: TermoDeUso[]) => {
        if (!org) return;
        // Organização que só existe pelos eventos ganha o documento na primeira gravação (como em Ajustes).
        const { eventos: _e, ativos: _a, ...base } = org;
        const doc = lerDoc("organizacoes", org.id) ?? base;
        await salvar("organizacoes", { ...doc, termosDeUso: lista });
    };

    const [desativandoPadrao, setDesativandoPadrao] = useState<TermoDeUso | null>(null);

    // Grava o status e oferece Desfazer no aviso (TDU-42). `antes` é a lista para voltar.
    const alternar = async (t: TermoDeUso, ativo: boolean, desfazendo = false) => {
        const antes = termos;
        try {
            await gravar(termos.map((x) => (x.id === t.id ? { ...x, ativo } : x)));
            toast.success(ativo ? T.ativado : T.desativado, desfazendo ? undefined : { action: { label: T.desfazer, onClick: () => void gravar(antes).catch(() => toast.error(T.erroStatus)) } });
        } catch {
            toast.error(T.erroStatus);
        }
    };

    // Desligar o termo padrão muda a compra (TDU-40): pergunta antes, dizendo o efeito (TDU-41).
    const pedirAlternar = (t: TermoDeUso, ativo: boolean) => (!ativo && t.padrao ? setDesativandoPadrao(t) : void alternar(t, ativo));

    return (
        <BackstageLayout activeProducer="ajustes" showEventContext={false} showLayoutSwitcher={false}>
            <div className="flex w-full min-w-0 flex-1 flex-col gap-6">
                <CabecalhoDaPagina
                    voltar={{ rotulo: T.voltar, href: "/backstage/ajustes" }}
                    titulo={T.titulo}
                    acoes={
                        termos.length > 0 && (
                            <Button color="secondary" size="md" iconLeading={Plus} onClick={() => setModal({ tipo: "novo" })}>
                                {T.novo}
                            </Button>
                        )
                    }
                />

                {!org ? (
                    <CarregandoTabela />
                ) : termos.length === 0 ? (
                    // Vazio do DS com a ação principal (TDU-43).
                    <VazioDaTabela
                        icone={FileCheck02}
                        titulo={T.vazioTitulo}
                        texto={T.vazioTexto}
                        acao={
                            <Button color="primary" size="md" iconLeading={Plus} onClick={() => setModal({ tipo: "novo" })}>
                                {T.novo}
                            </Button>
                        }
                    />
                ) : (
                    // Tabela com as peças comuns (BKS-110, TDU-44): o nome abre o termo; o toggle ativa na compra.
                    <CartaoDaTabela>
                        <CabecalhoDaTabela>
                            <span className="min-w-0 flex-1">{T.colNome}</span>
                            <span className="w-32">{T.colAtivo}</span>
                            <span className="w-8" />
                        </CabecalhoDaTabela>
                        <ul className="flex flex-col divide-y divide-secondary">
                            {termos.map((t) => (
                                <LinhaDaTabela key={t.id} interativa className="relative items-center">
                                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setModal({ tipo: "ver", termo: t })}
                                            className="min-w-0 cursor-pointer truncate rounded-sm text-left text-sm font-semibold text-primary outline-focus-ring after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2"
                                        >
                                            {t.nome}
                                        </button>
                                        {t.padrao && (
                                            <Badge type="pill-color" color="brand" size="sm">
                                                {T.padrao}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="relative z-10 flex shrink-0 items-center gap-2 @min-[44rem]:w-32">
                                        <Toggle size="sm" aria-label={`${T.colAtivo}: ${t.nome}`} isSelected={t.ativo} onChange={(on) => pedirAlternar(t, on)} />
                                        <span className="text-sm text-tertiary @min-[44rem]:sr-only">{t.ativo ? "Ativo" : "Inativo"}</span>
                                    </div>
                                    <div className="relative z-10">
                                        <Dropdown.Root>
                                            <ButtonUtility icon={DotsVertical} color="tertiary" size="sm" tooltip={T.opcoes} aria-label={`${T.opcoes}: ${t.nome}`} />
                                            <Dropdown.Popover className="w-44" placement="bottom end">
                                                <Dropdown.Menu aria-label={T.opcoes} onAction={() => setModal({ tipo: "ver", termo: t })}>
                                                    <Dropdown.Item id="ver" icon={Eye} label={T.visualizar} />
                                                </Dropdown.Menu>
                                            </Dropdown.Popover>
                                        </Dropdown.Root>
                                    </div>
                                </LinhaDaTabela>
                            ))}
                        </ul>
                    </CartaoDaTabela>
                )}
            </div>

            {modal && <ModalDoTermo key={modal.tipo === "ver" ? modal.termo.id : "novo"} termo={modal.tipo === "ver" ? termos.find((x) => x.id === modal.termo.id) ?? modal.termo : undefined} termos={termos} gravar={gravar} onFechar={() => setModal(null)} />}
            <ModalDeConfirmacao
                aberto={!!desativandoPadrao}
                titulo={T.desativarPadraoTitulo}
                descricao={T.desativarPadraoTexto}
                confirmar={T.desativarPadraoConfirmar}
                onConfirmar={() => {
                    if (desativandoPadrao) void alternar(desativandoPadrao, false);
                    setDesativandoPadrao(null);
                }}
                onFechar={() => setDesativandoPadrao(null)}
            />
        </BackstageLayout>
    );
}

/** Novo termo (TDU-10) ou visualizar (TDU-20): o mesmo formulário, só leitura quando visualiza. */
function ModalDoTermo({ termo, termos, gravar, onFechar }: { termo?: TermoDeUso; termos: TermoDeUso[]; gravar: (l: TermoDeUso[]) => Promise<void>; onFechar: () => void }) {
    const [nome, setNome] = useState(termo?.nome ?? "");
    const [texto, setTexto] = useState(termo?.texto ?? "");
    const [padrao, setPadrao] = useState(termo?.padrao ?? false);
    const [tentou, setTentou] = useState(false);
    const [gravando, setGravando] = useState(false);
    const leitura = !!termo;
    const puro = textoPuro(texto);
    const erroNome = !nome.trim() ? T.erroNome : undefined;
    const erroTexto = !puro ? T.erroConteudo : puro.length > LIMITE ? T.erroLongo : undefined;
    const valido = !erroNome && !erroTexto;
    const conteudo = useRef<HTMLDivElement>(null);
    const [descartando, setDescartando] = useState(false);
    // Novo termo com algo escrito: clicar fora não fecha; Esc, X e Cancelar perguntam antes (TDU-45, T6).
    const alterado = !leitura && (!!nome.trim() || !!puro || padrao);
    const fechar = () => (gravando ? undefined : alterado ? setDescartando(true) : onFechar());

    const salvarNovo = async () => {
        setTentou(true);
        if (!valido) return;
        setGravando(true);
        const novo: TermoDeUso = { id: novoId("tdu"), nome: nome.trim(), texto, padrao, ativo: true, criadoEm: new Date().toISOString() };
        try {
            // Um padrão só: o novo padrão substitui o anterior.
            await gravar([...termos.map((t) => (padrao ? { ...t, padrao: false } : t)), novo]);
            toast.success(T.criado);
            onFechar();
        } catch {
            toast.error(T.erro);
        } finally {
            setGravando(false);
        }
    };

    const tornarPadrao = async () => {
        if (!termo) return;
        setPadrao(true);
        try {
            await gravar(termos.map((t) => ({ ...t, padrao: t.id === termo.id })));
            toast.success(T.definido);
        } catch {
            setPadrao(false);
            toast.error(T.erro);
        }
    };

    return (
        <ModalOverlay isOpen onOpenChange={(o) => !o && fechar()} isDismissable={!gravando && !alterado}>
            <Modal>
                <Dialog aria-label={leitura ? T.visualizarTitulo : T.novo}>
                    <div className="relative flex max-h-[90dvh] w-full max-w-2xl flex-col rounded-2xl bg-primary shadow-xl ring-1 ring-secondary">
                        <ButtonUtility size="sm" color="tertiary" icon={XClose} tooltip={T.fechar} onClick={fechar} className="absolute top-4 right-4" />
                        <div className="flex flex-col gap-1 px-6 pt-6 pr-14">
                            <h2 className="text-lg font-semibold text-primary">{leitura ? T.visualizarTitulo : T.novo}</h2>
                            {!leitura && <p className="text-sm text-tertiary">{T.novoDica}</p>}
                        </div>
                        <div ref={conteudo} className="flex min-w-0 flex-col gap-5 overflow-y-auto px-6 py-5">
                            <Input label={T.nome} isRequired placeholder={T.nomePlaceholder} value={nome} onChange={setNome} isDisabled={leitura} isInvalid={tentou && !!erroNome} hint={tentou && erroNome ? erroNome : T.nomeDica} />
                            {leitura ? (
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-sm font-medium text-secondary">{T.conteudo}</span>
                                    {/* Só leitura: o texto do termo como o comprador vê. */}
                                    <div className="prose-sm max-h-80 overflow-y-auto rounded-lg bg-secondary_subtle p-4 text-sm text-secondary ring-1 ring-secondary" dangerouslySetInnerHTML={{ __html: termo.texto }} />
                                </div>
                            ) : (
                                <div className="flex flex-col gap-1">
                                    <DescricaoRica label={T.conteudo} isRequired valor={texto} onChange={setTexto} placeholder={T.conteudoPlaceholder} erro={tentou ? erroTexto : undefined} />
                                    <span className={puro.length > LIMITE ? "self-end text-sm text-error-primary tabular-nums" : "self-end text-sm text-tertiary tabular-nums"}>{`${puro.length.toLocaleString("pt-BR")}/${LIMITE.toLocaleString("pt-BR")}`}</span>
                                </div>
                            )}
                            {/* w-full: o Toggle do DS é w-max, e a dica longa esticava o modal até 890 px (TDU-46). */}
                            <Toggle
                                className="w-full"
                                size="sm"
                                label={T.tornarPadrao}
                                hint={T.tornarPadraoDica}
                                isSelected={padrao}
                                // Visualizando, só liga (nunca desliga) e só se ainda não for o padrão.
                                isDisabled={leitura && termo.padrao}
                                onChange={(on) => (leitura ? on && void tornarPadrao() : setPadrao(on))}
                            />
                        </div>
                        <div className="flex flex-col-reverse gap-3 border-t border-secondary px-6 py-4 sm:flex-row sm:justify-end">
                            <Button size="lg" color="secondary" onClick={fechar} isDisabled={gravando}>
                                {leitura ? T.fechar : T.cancelar}
                            </Button>
                            {!leitura && (
                                <Button size="lg" color="primary" isLoading={gravando} showTextWhileLoading onClick={() => void salvarNovo()}>
                                    {T.salvarNovo}
                                </Button>
                            )}
                        </div>
                    </div>
                    <ModalDeConfirmacao aberto={descartando} titulo={T.descartarTitulo} descricao={T.descartarTexto} confirmar={T.descartar} cancelar={T.continuar} destrutiva onConfirmar={onFechar} onFechar={() => setDescartando(false)} />
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
