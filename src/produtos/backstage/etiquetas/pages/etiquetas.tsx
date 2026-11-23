import { useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { DotsVertical, Edit01, LinkBroken02, Plus, Tag01, Trash01 } from "@untitledui/icons";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Input } from "@/components/base/input/input";
import { novoId, type Etiqueta, type Evento, type VinculoDaEtiqueta } from "@/plataforma";
import { combosDoEvento, produtosDoEvento, SeletorDeVinculos, useResumoDosVinculos, useVinculos } from "../../components/arvore-de-vinculos";
import { BackstageLayout } from "../../components/Backstage";
import { CabecalhoDaFuncionalidade } from "../../components/cabecalho-da-funcionalidade";
import { ModalDeConfirmacao } from "../../components/modal-de-confirmacao";
import { PainelLateral, useProtecaoDoPreenchido } from "../../components/painel-lateral";
import { RodapeDePaginacao, usePaginacao } from "../../components/rodape-de-paginacao";
import { BarraDaLista, CabecalhoDaTabela, CarregandoTabela, CartaoDaTabela, LinhaDaTabela, SemResultados, TituloDaLinha, VazioDaTabela } from "../../components/tabela";
import { useCatalogo } from "../../itens/data/catalogo";
import { useTextosItens } from "../../itens/data/textos-itens";
import { chaveDoVinculo, LIMITE_DO_NOME, LIMITE_POR_ITEM, salvarEtiquetas, useEtiquetas, vinculosNoEvento } from "../data/etiquetas";

/*
 * Etiquetas (etiquetas/rules.md): o gêmeo da tela de produção `tags`. Lista das etiquetas da
 * organização com os vínculos deste evento; criar abre o nome e, gravado, os itens onde ela aparece.
 * `/etiquetas/nova` e `/etiquetas/:id` abrem o painel por cima da lista, como em produção.
 */

const T = {
    titulo: "Etiquetas",
    buscar: "Buscar etiqueta",
    coluna: "Etiqueta",
    nenhumVinculo: "Nenhum vínculo",
    umVinculo: "1 vínculo",
    vinculos: "{n} vínculos",
    nova: "Nova etiqueta",
    opcoes: "Opções de etiqueta",
    editarVinculos: "Editar vínculos",
    desvincular: "Desvincular tudo",
    remover: "Remover etiqueta",
    vazioTitulo: "Crie etiquetas para destacar seus itens",
    vazioTexto: "As etiquetas ajudam a destacar informações importantes como “Últimos itens”, “Esgotando” ou “Área VIP” diretamente nos seus itens.",
    semResultadosTexto: "Nenhuma etiqueta encontrada para essa busca.",
    desvincularTitulo: "Desvincular tudo deste evento?",
    desvincularTexto: { one: "A etiqueta “{nome}” sai de {n} item deste evento. Os vínculos em outros eventos continuam.", other: "A etiqueta “{nome}” sai de {n} itens deste evento. Os vínculos em outros eventos continuam." },
    desvincularConfirmar: "Desvincular",
    desvinculado: "Vínculos deste evento removidos.",
    erroDesvincular: "Erro ao desvincular etiqueta. Tente novamente.",
    removerTitulo: "Remover etiqueta?",
    removerTexto: "Esta ação não pode ser desfeita. A etiqueta sai de todos os eventos da organização.",
    removerConfirmar: "Remover",
    removida: "Etiqueta removida com sucesso.",
    erroRemover: "Erro ao remover etiqueta. Tente novamente.",
    cancelar: "Cancelar",
    // Painel
    criarTitulo: "Criar nova etiqueta",
    nome: "Nome da etiqueta",
    nomePlaceholder: "Ex: Últimos ingressos",
    erroNome: "O nome é obrigatório.",
    erroLongo: "Máximo de 30 caracteres.",
    erroRepetido: "Já existe uma etiqueta com esse nome.",
    erroCriar: "Erro ao criar etiqueta. Tente novamente.",
    voltar: "Voltar",
    criar: "Criar etiqueta",
    vinculosTitulo: "Quais itens podem usar essa etiqueta?",
    arvore: "Ingressos para a etiqueta",
    salvar: "Salvar",
    atualizada: "Etiqueta atualizada com sucesso.",
    erroAtualizar: "Erro ao atualizar etiqueta. Tente novamente.",
    limiteItem: { one: "Tire {n} item para salvar: ele já tem 3 etiquetas.", other: "Tire {n} itens para salvar: eles já têm 3 etiquetas." },
    eMais: { one: "e mais {n}", other: "e mais {n}" },
    semItens: "Sem itens cadastrados",
    semItensTexto: "Crie ingressos para vinculá-los aqui.",
    descartarTitulo: "Descartar o que você preencheu?",
    descartarNome: "O nome da etiqueta ainda não foi salvo.",
    descartarVinculos: "Os itens marcados ainda não foram salvos.",
};

const ROTA = "/backstage/marketing/etiquetas";

const contagem = (n: number) => (n === 0 ? T.nenhumVinculo : n === 1 ? T.umVinculo : T.vinculos.replace("{n}", n.toLocaleString("pt-BR")));

export function Etiquetas() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const criando = useLocation().pathname.endsWith("/nova");
    const { evento, organizacao, orgId, etiquetas, carregando } = useEtiquetas();
    const { plural } = useTextosItens();
    const [busca, setBusca] = useState("");
    const [confirmacao, setConfirmacao] = useState<{ tipo: "desvincular" | "remover"; etiqueta: Etiqueta } | null>(null);
    const [gravando, setGravando] = useState(false);

    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    const filtradas = useMemo(() => (termo ? etiquetas.filter((e) => e.nome.toLocaleLowerCase("pt-BR").includes(termo)) : etiquetas), [etiquetas, termo]);
    const paginacao = usePaginacao(filtradas, [termo]);

    const gravar = (lista: Etiqueta[]) => salvarEtiquetas(organizacao, orgId, lista);

    const confirmar = async () => {
        if (!confirmacao || !evento) return;
        const { tipo, etiqueta } = confirmacao;
        setGravando(true);
        try {
            if (tipo === "remover") await gravar(etiquetas.filter((e) => e.id !== etiqueta.id));
            // Desvincular tira só os vínculos deste evento; os de outros eventos ficam (ETQ-51).
            else await gravar(etiquetas.map((e) => (e.id === etiqueta.id ? { ...e, vinculos: e.vinculos.filter((v) => v.eventoId !== evento.id) } : e)));
            toast.success(tipo === "remover" ? T.removida : T.desvinculado);
            setConfirmacao(null);
        } catch {
            toast.error(tipo === "remover" ? T.erroRemover : T.erroDesvincular);
        } finally {
            setGravando(false);
        }
    };

    const ultima = useRef(confirmacao);
    if (confirmacao) ultima.current = confirmacao;
    const mostrada = confirmacao ?? ultima.current;
    const remover = mostrada?.tipo === "remover";
    const noEvento = mostrada && evento ? vinculosNoEvento(mostrada.etiqueta, evento.id).length : 0;

    const fechar = () => navigate(ROTA);
    const editando = id ? etiquetas.find((e) => e.id === id) : undefined;
    const temEtiquetas = !carregando && !!evento && etiquetas.length > 0;

    return (
        <BackstageLayout activeSection="itens" activeItem="etiquetas" chaveDaTela={ROTA}>
            <div className="flex min-w-0 flex-1 flex-col gap-6">
                {/* Criar fica no cabeçalho, como nas outras listas (BKS-104). */}
                <CabecalhoDaFuncionalidade
                    titulo={T.titulo}
                    acao={
                        temEtiquetas && (
                            <Button color="primary" size="md" iconLeading={Plus} href={`${ROTA}/nova`}>
                                {T.nova}
                            </Button>
                        )
                    }
                />

                {carregando || !evento ? (
                    <CarregandoTabela />
                ) : etiquetas.length === 0 ? (
                    <VazioDaTabela
                        icone={Tag01}
                        titulo={T.vazioTitulo}
                        texto={T.vazioTexto}
                        acao={
                            <Button color="primary" size="md" iconLeading={Plus} href={`${ROTA}/nova`}>
                                {T.nova}
                            </Button>
                        }
                    />
                ) : (
                    <div className="flex flex-col gap-4">
                        <BarraDaLista busca={{ valor: busca, onChange: setBusca, placeholder: T.buscar }} />
                        <CartaoDaTabela>
                            <CabecalhoDaTabela>
                                <span className="flex-1">{T.coluna}</span>
                                <span className="w-9" />
                            </CabecalhoDaTabela>
                            {filtradas.length === 0 ? (
                                <SemResultados texto={T.semResultadosTexto} onLimpar={() => setBusca("")} />
                            ) : (
                                <ul className="flex flex-col divide-y divide-secondary">
                                    {paginacao.visiveis.map((e) => (
                                        <LinhaDaTabela key={e.id} className="items-center">
                                            <TituloDaLinha titulo={e.nome} apoio={contagem(vinculosNoEvento(e, evento.id).length)} />
                                            <Dropdown.Root>
                                                <ButtonUtility icon={DotsVertical} color="tertiary" size="sm" tooltip={T.opcoes} />
                                                <Dropdown.Popover className="w-52" placement="bottom end">
                                                    <Dropdown.Menu
                                                        aria-label={T.opcoes}
                                                        disabledKeys={vinculosNoEvento(e, evento.id).length === 0 ? ["desvincular"] : []}
                                                        onAction={(k) => {
                                                            if (k === "editar") navigate(`${ROTA}/${e.id}`);
                                                            else setConfirmacao({ tipo: k as "desvincular" | "remover", etiqueta: e });
                                                        }}
                                                    >
                                                        <Dropdown.Item id="editar" icon={Edit01} label={T.editarVinculos} />
                                                        <Dropdown.Item id="desvincular" icon={LinkBroken02} label={T.desvincular} />
                                                        <Dropdown.Separator />
                                                        <Dropdown.Item id="remover" icon={Trash01} label={T.remover} />
                                                    </Dropdown.Menu>
                                                </Dropdown.Popover>
                                            </Dropdown.Root>
                                        </LinhaDaTabela>
                                    ))}
                                </ul>
                            )}
                            <RodapeDePaginacao {...paginacao} />
                        </CartaoDaTabela>
                    </div>
                )}
            </div>

            {evento && (criando || editando) && (
                <PainelDaEtiqueta
                    key={criando ? "nova" : editando!.id}
                    evento={evento}
                    etiqueta={criando ? undefined : editando}
                    etiquetas={etiquetas}
                    gravar={gravar}
                    onFechar={fechar}
                    onCriada={(nova) => navigate(`${ROTA}/${nova.id}`, { replace: true })}
                />
            )}

            <ModalDeConfirmacao
                aberto={!!confirmacao}
                titulo={remover ? T.removerTitulo : T.desvincularTitulo}
                descricao={remover ? T.removerTexto : plural(T.desvincularTexto, noEvento, { nome: mostrada?.etiqueta.nome ?? "" })}
                confirmar={remover ? T.removerConfirmar : T.desvincularConfirmar}
                cancelar={T.cancelar}
                destrutiva
                icone={remover ? Trash01 : LinkBroken02}
                carregando={gravando}
                onConfirmar={() => void confirmar()}
                onFechar={() => setConfirmacao(null)}
            />
        </BackstageLayout>
    );
}

/** Painel da etiqueta: sem etiqueta, o nome (passo 1); com, os itens onde ela aparece neste evento (passo 2). */
function PainelDaEtiqueta({
    evento,
    etiqueta,
    etiquetas,
    gravar,
    onFechar,
    onCriada,
}: {
    evento: Evento;
    etiqueta?: Etiqueta;
    etiquetas: Etiqueta[];
    gravar: (lista: Etiqueta[]) => Promise<unknown>;
    onFechar: () => void;
    onCriada: (e: Etiqueta) => void;
}) {
    const [nome, setNome] = useState("");
    const [tocado, setTocado] = useState(false);
    const [erroServidor, setErroServidor] = useState<string>();
    const [gravando, setGravando] = useState(false);

    const n = nome.trim();
    const erroNome = !n ? T.erroNome : n.length > LIMITE_DO_NOME ? T.erroLongo : etiquetas.some((e) => e.nome.trim().toLocaleLowerCase("pt-BR") === n.toLocaleLowerCase("pt-BR")) ? T.erroRepetido : undefined;
    const protecao = useProtecaoDoPreenchido({ alterado: !etiqueta && !!n, onFechar, titulo: T.descartarTitulo, descricao: T.descartarNome });

    const criar = async () => {
        setTocado(true);
        if (erroNome) return;
        setGravando(true);
        const nova: Etiqueta = { id: novoId("etq"), nome: n, vinculos: [], criadoEm: new Date().toISOString() };
        try {
            await gravar([...etiquetas, nova]);
            onCriada(nova);
        } catch {
            setErroServidor(T.erroCriar);
            toast.error(T.erroCriar);
        } finally {
            setGravando(false);
        }
    };

    if (etiqueta) return <VinculosDaEtiqueta evento={evento} etiqueta={etiqueta} etiquetas={etiquetas} gravar={gravar} onFechar={onFechar} />;

    return (
        <PainelLateral titulo={T.criarTitulo} aoFechar={protecao.pedirParaFechar} fechaClicandoFora={protecao.fechaClicandoFora} largura="md:max-w-[682px]">
            <SlideoutMenu.Content>
                <form
                    noValidate
                    onSubmit={(e) => {
                        e.preventDefault();
                        void criar();
                    }}
                    className="flex flex-col gap-1.5"
                >
                    <Input
                        label={T.nome}
                        placeholder={T.nomePlaceholder}
                        autoFocus
                        maxLength={LIMITE_DO_NOME}
                        value={nome}
                        onChange={(v) => (setNome(v), setErroServidor(undefined))}
                        onBlur={() => setTocado(true)}
                        isInvalid={(tocado && !!erroNome) || !!erroServidor}
                        hint={(tocado && erroNome) || erroServidor}
                    />
                    {/* O contador já diz o limite; a dica "Limite de 30 caracteres." saiu (repetia). */}
                    <span className={nome.length >= LIMITE_DO_NOME ? "self-end text-sm text-warning-primary tabular-nums" : "self-end text-sm text-tertiary tabular-nums"}>{`${nome.length}/${LIMITE_DO_NOME}`}</span>
                </form>
            </SlideoutMenu.Content>
            <SlideoutMenu.Footer className="mt-auto flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button color="secondary" size="md" onClick={protecao.pedirParaFechar}>
                    {T.voltar}
                </Button>
                <Button color="primary" size="md" isLoading={gravando} showTextWhileLoading onClick={() => void criar()}>
                    {T.criar}
                </Button>
            </SlideoutMenu.Footer>
            {protecao.confirmacao}
        </PainelLateral>
    );
}

/** Passo 2: os itens deste evento onde a etiqueta aparece (ETQ-52). */
function VinculosDaEtiqueta({ evento, etiqueta, etiquetas, gravar, onFechar }: { evento: Evento; etiqueta: Etiqueta; etiquetas: Etiqueta[]; gravar: (lista: Etiqueta[]) => Promise<unknown>; onFechar: () => void }) {
    const { biblioteca } = useCatalogo();
    const { preco, plural } = useTextosItens();
    const resumir = useResumoDosVinculos();
    const [iniciais] = useState(() => {
        const v = vinculosNoEvento(etiqueta, evento.id);
        const de = (t: VinculoDaEtiqueta["tipo"]) => v.filter((x) => x.tipo === t).map((x) => x.id);
        return { grupos: de("grupo"), lotes: de("lote"), combos: de("combo"), produtos: de("produto") };
    });
    const vinculos = useVinculos(evento, iniciais);
    const [gravando, setGravando] = useState(false);
    const [estouram, setEstouram] = useState<string[]>([]);
    const combos = useMemo(() => combosDoEvento(evento, preco), [evento, preco]);
    const produtos = useMemo(() => produtosDoEvento(evento, biblioteca, preco), [evento, biblioteca, preco]);
    const protecao = useProtecaoDoPreenchido({ alterado: vinculos.alterado, onFechar, titulo: T.descartarTitulo, descricao: T.descartarVinculos });

    const nomeDoItem = (v: VinculoDaEtiqueta): string => {
        if (v.tipo === "combo") return combos.find((c) => c.id === v.id)?.nome ?? v.id;
        if (v.tipo === "produto") return produtos.find((p) => p.id === v.id)?.nome ?? v.id;
        for (const s of evento.sessoes)
            for (const g of s.grupos) {
                if (v.tipo === "grupo" && g.id === v.id) return g.nome;
                if (v.tipo === "lote") for (const t of g.ingressos) for (const l of t.lotes) if (l.id === v.id) return `${g.nome}, ${t.nome}, ${l.nome}`;
            }
        return v.id;
    };

    const salvarVinculos = async () => {
        const r = vinculos.resultado();
        const novos: VinculoDaEtiqueta[] = [
            ...r.grupos.map((id) => ({ eventoId: evento.id, tipo: "grupo" as const, id })),
            ...r.lotesForaDosGrupos.map((id) => ({ eventoId: evento.id, tipo: "lote" as const, id })),
            ...r.combos.map((id) => ({ eventoId: evento.id, tipo: "combo" as const, id })),
            ...r.produtos.map((id) => ({ eventoId: evento.id, tipo: "produto" as const, id })),
        ];
        // No máximo 3 etiquetas por item (ETQ-21): diz quais itens estouram, no painel (ETQ-53).
        const usos = new Map<string, number>();
        for (const e of etiquetas) if (e.id !== etiqueta.id) for (const v of e.vinculos) if (v.eventoId === evento.id) usos.set(chaveDoVinculo(v), (usos.get(chaveDoVinculo(v)) ?? 0) + 1);
        const fora = novos.filter((v) => (usos.get(chaveDoVinculo(v)) ?? 0) >= LIMITE_POR_ITEM);
        setEstouram(fora.map(nomeDoItem));
        if (fora.length) return;
        setGravando(true);
        try {
            const outros = etiqueta.vinculos.filter((v) => v.eventoId !== evento.id);
            await gravar(etiquetas.map((e) => (e.id === etiqueta.id ? { ...e, vinculos: [...outros, ...novos] } : e)));
            toast.success(T.atualizada);
            onFechar();
        } catch {
            toast.error(T.erroAtualizar);
        } finally {
            setGravando(false);
        }
    };

    return (
        <PainelLateral titulo={T.vinculosTitulo} subtitulo={etiqueta.nome} aoFechar={protecao.pedirParaFechar} fechaClicandoFora={protecao.fechaClicandoFora} largura="md:max-w-[682px]">
            <SlideoutMenu.Content className="pb-6">
                {estouram.length > 0 && (
                    <div role="alert" className="flex flex-col gap-1 rounded-lg bg-error-primary p-3 text-sm text-error-primary ring-1 ring-error_subtle">
                        <span className="font-semibold">{plural(T.limiteItem, estouram.length)}</span>
                        <span>
                            {estouram.slice(0, 5).join("; ")}
                            {estouram.length > 5 ? ` ${plural(T.eMais, estouram.length - 5)}` : ""}
                        </span>
                    </div>
                )}
                <SeletorDeVinculos
                    vinculos={vinculos}
                    rotulo={T.arvore}
                    combos={combos}
                    produtos={produtos}
                    comConferir
                    vazio={
                        <div className="flex flex-col gap-1 py-6 text-center">
                            <p className="text-sm font-semibold text-primary">{T.semItens}</p>
                            <p className="text-sm text-tertiary">{T.semItensTexto}</p>
                        </div>
                    }
                />
            </SlideoutMenu.Content>
            <SlideoutMenu.Footer className="mt-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-tertiary" role="status">
                    {resumir(vinculos)}
                </span>
                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                    <Button color="secondary" size="md" onClick={protecao.pedirParaFechar}>
                        {T.cancelar}
                    </Button>
                    <Button color="primary" size="md" isLoading={gravando} showTextWhileLoading onClick={() => void salvarVinculos()}>
                        {T.salvar}
                    </Button>
                </div>
            </SlideoutMenu.Footer>
            {protecao.confirmacao}
        </PainelLateral>
    );
}
