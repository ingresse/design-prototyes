import { useId, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, SearchLg, ShoppingBag01, Trash01 } from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { FileUploadDropZone } from "@/components/application/file-upload/file-upload-base";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { Label } from "@/components/base/input/label";
import { TextArea } from "@/components/base/textarea/textarea";
import { Surgir } from "@/components/foundations/transicao";
import type { ProdutoDaOrganizacao, RegrasDeVenda } from "@/plataforma";
import { BackstageLayout } from "../../components/Backstage";
import { CabecalhoDaPagina } from "../../components/cabecalho-da-pagina";
import { setEventoAtual } from "../../eventos/data/eventos";
import { BarraDeSalvar, CampoPreco, CamposDeVendas, ConfirmarSaida, SecaoDoItem, irParaPrimeiroErro } from "../../itens/components/comuns";
import { novoId } from "../../itens/data/catalogo";
import { formatar, useTextosItens } from "../../itens/data/textos-itens";
import { useBiblioteca } from "../data/biblioteca";

/* ------------------------------------------------------------------ */
/*  Detalhe do produto na organização (POR)                            */
/*                                                                     */
/*  Nome, descrição, imagem, preço sugerido e quantidade por pedido    */
/*  valem para todos os eventos. Preço, estoque, transferência e       */
/*  à venda são de cada evento (Itens › Produtos).                     */
/* ------------------------------------------------------------------ */

const LISTA = "/backstage/produtos";
/* POR-09: o arquivo pode ter até 10 MB; no envio a imagem é reduzida para no máximo 600 px de lado e
   comprimida, e só o resultado vai para o banco. Antes o limite era 400 KB do arquivo original, gravado
   como veio dentro do documento da organização. */
const MAX_ARQUIVO = 10 * 1024 * 1024;
const LADO_MAXIMO = 600;

const T = {
    voltar: "Produtos",
    novo: "Novo produto",
    novoDica: "Depois de criado, adicione o produto aos eventos em Ingressos e produtos.",
    eventos: { one: "Em {n} evento.", other: "Em {n} eventos." },
    semEvento: "Ainda não está em nenhum evento.",
    naoEncontrado: "Produto não encontrado",
    naoEncontradoDica: "Ele pode ter sido excluído. Volte para a lista e escolha outro.",
    voltarParaLista: "Voltar para produtos",
    carregando: "Carregando produto",
    info: "Informações",
    nome: "Nome",
    nomePlaceholder: "Ex.: Camiseta oficial",
    nomeErro: "Dê um nome ao produto.",
    descricao: "Descrição",
    descricaoPlaceholder: "Material, tamanhos e o que mais ajuda a decidir a compra.",
    imagem: "Imagem",
    imagemDica: "PNG ou JPG até 10 MB, quadrada de preferência. A imagem é reduzida no envio.",
    imagemGrande: "Escolha uma imagem de até {maximo} MB: esta tem {tamanho} MB.",
    imagemErro: "Tente outra imagem: não foi possível ler este arquivo.",
    removerImagem: "Remover imagem",
    precoBase: "Preço sugerido",
    precoBaseDica: "Cada evento começa com este preço e pode mudar.",
    precoBaseErro: "Informe um preço de zero ou mais.",
    revise: "Revise os campos destacados para salvar o produto.",
    criado: "{nome} criado.",
    excluir: "Excluir produto",
    excluirEmUso: { one: "Para excluir, tire o produto deste evento antes:", other: "Para excluir, tire o produto destes {n} eventos antes:" },
    abrirProdutosDoEvento: "Abrir os produtos de {evento}",
    excluirTitulo: "Excluir {nome}?",
    excluirDica: "O produto sai da organização. Esta ação não pode ser desfeita.",
    cancelar: "Cancelar",
    confirmar: "Excluir",
    excluido: "{nome} excluído.",
};

interface Rascunho {
    nome: string;
    descricao: string;
    imagem?: string;
    precoBase: number;
    vendas?: RegrasDeVenda;
}

const VAZIO: Rascunho = { nome: "", descricao: "", precoBase: 0 };

const limparVendas = (v: RegrasDeVenda | undefined): RegrasDeVenda | undefined =>
    v?.limitePorPedido != null ? { limitePorPedido: v.limitePorPedido, ...((v.minimoPorPedido ?? 1) > 1 ? { minimoPorPedido: v.minimoPorPedido } : {}) } : undefined;

const paraRascunho = (p: ProdutoDaOrganizacao): Rascunho => ({ nome: p.nome, descricao: p.descricao ?? "", imagem: p.imagem, precoBase: p.precoBase, vendas: limparVendas(p.vendas) });
const assinatura = (r: Rascunho) => JSON.stringify({ ...r, nome: r.nome.trim(), descricao: r.descricao.trim(), vendas: limparVendas(r.vendas) });

export function ProdutoDaOrganizacaoDetalhe() {
    const { id = "" } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    /* Volta para a lista como ela estava (a busca vem na URL, POR-08). */
    const lista = `${LISTA}${(location.state as { de?: string } | null)?.de ?? ""}`;
    const { t, plural } = useTextosItens();
    const { carregando, biblioteca, usos, eventosDoProduto, gravar } = useBiblioteca();
    const novo = id === "novo";
    const produto = useMemo(() => biblioteca.find((p) => p.id === id), [biblioteca, id]);
    const base = useMemo(() => (novo ? VAZIO : produto ? paraRascunho(produto) : null), [novo, produto]);

    const [rascunho, setRascunho] = useState<{ id: string; valor: Rascunho } | null>(null);
    const atual = rascunho && rascunho.id === id ? rascunho.valor : base;
    const [versao, setVersao] = useState(0);
    const [tentou, setTentou] = useState(0);
    const [salvando, setSalvando] = useState(false);
    const [sair, setSair] = useState(false);
    const [excluir, setExcluir] = useState(false);

    const mudou = !!atual && !!base && assinatura(atual) !== assinatura(base);
    const erroNome = atual && !atual.nome.trim() ? T.nomeErro : undefined;
    const erroPreco = atual && (!Number.isFinite(atual.precoBase) || atual.precoBase < 0) ? T.precoBaseErro : undefined;
    const mostrar = tentou > 0;
    const usadoEm = produto ? (usos.get(produto.id) ?? 0) : 0;
    const eventosEmUso = produto ? (eventosDoProduto.get(produto.id) ?? []) : [];
    /* Leva aos produtos do evento, já com o evento em contexto, para tirar o produto de lá. */
    const abrirProdutosDoEvento = (eventoId: string) => {
        setEventoAtual(eventoId);
        navigate("/backstage/catalogo/produtos");
    };

    const editar = (patch: Partial<Rascunho>) => atual && setRascunho({ id, valor: { ...atual, ...patch } });
    const descartar = () => {
        setRascunho(null);
        setTentou(0);
        setVersao((v) => v + 1);
    };
    const voltar = () => (mudou ? setSair(true) : navigate(lista));

    const salvar = async () => {
        if (!atual) return;
        if (erroNome || erroPreco) {
            setTentou((n) => n + 1);
            toast.error(T.revise);
            irParaPrimeiroErro();
            return;
        }
        const vendas = limparVendas(atual.vendas);
        const montar = (anterior: Pick<ProdutoDaOrganizacao, "id" | "criadoEm">): ProdutoDaOrganizacao => ({
            ...anterior,
            nome: atual.nome.trim(),
            ...(atual.descricao.trim() ? { descricao: atual.descricao.trim() } : {}),
            ...(atual.imagem ? { imagem: atual.imagem } : {}),
            precoBase: atual.precoBase,
            ...(vendas ? { vendas } : {}),
        });
        setSalvando(true);
        try {
            if (novo) {
                const criado = montar({ id: novoId("prd"), criadoEm: new Date().toISOString() });
                await gravar([...biblioteca, criado]);
                setRascunho(null);
                setTentou(0);
                toast.success(formatar(T.criado, { nome: criado.nome }));
                navigate(`${LISTA}/${criado.id}`, { replace: true });
                return;
            }
            if (!produto) return;
            const salvo = montar(produto);
            await gravar(biblioteca.map((p) => (p.id === salvo.id ? salvo : p)));
            setRascunho(null);
            setTentou(0);
            setVersao((v) => v + 1);
            toast.success(t.salvo);
        } catch {
            toast.error(t.erroAoSalvar);
        } finally {
            setSalvando(false);
        }
    };

    const confirmarExclusao = async () => {
        if (!produto) return;
        try {
            await gravar(biblioteca.filter((p) => p.id !== produto.id));
            toast.success(formatar(T.excluido, { nome: produto.nome }));
            navigate(lista);
        } catch {
            toast.error(t.erroAoSalvar);
        }
    };

    const voltarBotao = (
        <Button color="tertiary" size="md" iconLeading={ArrowLeft} onClick={voltar} className="-ml-3 self-start">
            {T.voltar}
        </Button>
    );

    if (carregando || !atual || !base) {
        return (
            <BackstageLayout showEventContext={false} activeProducer="produtos" showLayoutSwitcher={false}>
                <div className="flex min-w-0 flex-1 flex-col gap-6">
                    {voltarBotao}
                    {carregando ? (
                        <div role="status" aria-label={T.carregando} className="mx-auto flex w-full max-w-[732px] flex-col gap-4">
                            {[0, 1].map((i) => (
                                <span key={i} aria-hidden="true" className="h-[72px] w-full animate-pulse rounded-2xl bg-secondary motion-reduce:animate-none" />
                            ))}
                        </div>
                    ) : (
                        /* Com a saída no próprio vazio (POR-10): antes o vazio do DS não tinha ação. */
                        <div className="flex items-center justify-center py-16">
                            <EmptyState size="sm">
                                <EmptyState.Header>
                                    <EmptyState.FeaturedIcon icon={SearchLg} color="gray" theme="modern" />
                                </EmptyState.Header>
                                <EmptyState.Content>
                                    <EmptyState.Title>{T.naoEncontrado}</EmptyState.Title>
                                    <EmptyState.Description>{T.naoEncontradoDica}</EmptyState.Description>
                                </EmptyState.Content>
                                <EmptyState.Footer>
                                    <Button color="secondary" size="md" iconLeading={ArrowLeft} onClick={() => navigate(lista)}>
                                        {T.voltarParaLista}
                                    </Button>
                                </EmptyState.Footer>
                            </EmptyState>
                        </div>
                    )}
                </div>
            </BackstageLayout>
        );
    }

    return (
        <BackstageLayout showEventContext={false} activeProducer="produtos" showLayoutSwitcher={false}>
            <div className="flex min-w-0 flex-1 flex-col gap-6">
                <CabecalhoDaPagina
                    voltar={{ rotulo: T.voltar, onClick: voltar }}
                    titulo={novo ? atual.nome.trim() || T.novo : base.nome}
                    subtitulo={novo ? T.novoDica : usadoEm ? plural(T.eventos, usadoEm) : T.semEvento}
                />

                <div className="mx-auto flex w-full max-w-[732px] min-w-0 flex-col gap-4">
                    <SecaoDoItem
                        titulo={T.info}
                        alerta={mostrar && !!(erroNome || erroPreco)}
                    >
                        <Input
                            label={T.nome}
                            placeholder={T.nomePlaceholder}
                            isRequired
                            value={atual.nome}
                            onChange={(nome) => editar({ nome })}
                            isInvalid={mostrar && !!erroNome}
                            hint={mostrar ? erroNome : undefined}
                        />
                        <TextArea label={T.descricao} placeholder={T.descricaoPlaceholder} rows={4} value={atual.descricao} onChange={(descricao) => editar({ descricao })} />
                        <CampoImagem imagem={atual.imagem} onChange={(imagem) => editar({ imagem })} />
                        <div className="sm:max-w-60">
                            <CampoPreco
                                key={`base-${versao}`}
                                label={T.precoBase}
                                isRequired
                                valor={atual.precoBase}
                                onChange={(precoBase) => editar({ precoBase })}
                                isInvalid={mostrar && !!erroPreco}
                                hint={mostrar && erroPreco ? erroPreco : T.precoBaseDica}
                            />
                        </div>
                    </SecaoDoItem>

                    <SecaoDoItem titulo={t.vendas.titulo}>
                        <CamposDeVendas key={`vendas-${versao}`} valor={atual.vendas} onChange={(vendas) => editar({ vendas })} />
                    </SecaoDoItem>

                    {!novo && (
                        <div className="flex flex-col gap-2 pt-2">
                            {usadoEm > 0 ? (
                                /* POR-07: diz em quais eventos o produto está e leva até eles. Antes só dizia
                                   "Está em N eventos", sem nome nem caminho. */
                                <div className="flex flex-col gap-1">
                                    <p className="text-sm text-tertiary">{plural(T.excluirEmUso, usadoEm)}</p>
                                    <ul className="flex flex-col items-start gap-1">
                                        {eventosEmUso.map((evento) => (
                                            <li key={evento.id}>
                                                <Button
                                                    color="link-color"
                                                    size="md"
                                                    className="min-h-11 text-left"
                                                    aria-label={formatar(T.abrirProdutosDoEvento, { evento: evento.nome })}
                                                    onClick={() => abrirProdutosDoEvento(evento.id)}
                                                >
                                                    {evento.nome}
                                                </Button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : (
                                <Button color="secondary-destructive" size="md" iconLeading={Trash01} className="self-start" onClick={() => setExcluir(true)}>
                                    {T.excluir}
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {/* Só aparece depois que algo muda, também no produto novo (POR-11): antes ela abria
                    junto com a tela vazia, pedindo para salvar o que ninguém tinha digitado. */}
                <BarraDeSalvar visivel={mudou} salvando={salvando} onSalvar={salvar} onDescartar={descartar} />
            </div>

            <ConfirmarSaida aberto={sair} onFechar={() => setSair(false)} onSair={() => navigate(lista)} />

            <ModalOverlay isOpen={excluir} onOpenChange={setExcluir} isDismissable>
                <Modal className="sm:max-w-[400px]">
                    <Dialog aria-label={formatar(T.excluirTitulo, { nome: base.nome })}>
                        <div className="flex w-full flex-col gap-5 rounded-2xl bg-primary p-6 shadow-xl ring-1 ring-border-secondary">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-lg font-semibold text-primary">{formatar(T.excluirTitulo, { nome: base.nome })}</h2>
                                <p className="text-sm text-tertiary">{T.excluirDica}</p>
                            </div>
                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <Button color="secondary" size="md" onClick={() => setExcluir(false)}>
                                    {T.cancelar}
                                </Button>
                                <Button color="primary-destructive" size="md" onClick={confirmarExclusao}>
                                    {T.confirmar}
                                </Button>
                            </div>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </BackstageLayout>
    );
}

/**
 * Lê a imagem, reduz para no máximo LADO_MAXIMO de lado e comprime (POR-09). Sai em WebP quando o
 * navegador sabe gravar WebP; senão em JPEG (foto) ou PNG (mantém a transparência).
 */
const reduzirImagem = (file: File) =>
    new Promise<string>((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            const escala = Math.min(1, LADO_MAXIMO / Math.max(img.naturalWidth, img.naturalHeight));
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(img.naturalWidth * escala));
            canvas.height = Math.max(1, Math.round(img.naturalHeight * escala));
            const ctx = canvas.getContext("2d");
            if (!ctx) return reject(new Error("sem canvas"));
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const webp = canvas.toDataURL("image/webp", 0.85);
            if (webp.startsWith("data:image/webp")) return resolve(webp);
            resolve(file.type === "image/png" ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("imagem ilegível"));
        };
        img.src = url;
    });

/**
 * Imagem do produto: mostra a atual e troca por PNG/JPG, reduzida no envio (POR-09).
 *
 * POR-12: a prévia fica direto no cartão da seção, sem moldura própria (era uma caixa dentro do
 * cartão), e o rótulo é o Label do DS ligado ao grupo do campo (era um span solto).
 */
function CampoImagem({ imagem, onChange }: { imagem?: string; onChange: (v: string | undefined) => void }) {
    const idRotulo = useId();
    const escolher = async (file: File) => {
        if (file.size > MAX_ARQUIVO) {
            toast.error(formatar(T.imagemGrande, { maximo: Math.round(MAX_ARQUIVO / 1024 / 1024), tamanho: (file.size / 1024 / 1024).toFixed(1).replace(".", ",") }));
            return;
        }
        try {
            onChange(await reduzirImagem(file));
        } catch {
            toast.error(T.imagemErro);
        }
    };
    return (
        <div role="group" aria-labelledby={idRotulo} className="flex flex-col gap-1.5">
            <Label id={idRotulo} isRequired={false}>
                {T.imagem}
            </Label>
            <Surgir visivel={!!imagem}>
                <div className="flex items-center gap-3">
                    <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary">
                        {imagem ? <img src={imagem} alt="" className="size-full object-cover" /> : <ShoppingBag01 className="size-6 text-fg-quaternary" aria-hidden="true" />}
                    </span>
                    <span className="min-w-0 flex-1 text-sm text-tertiary">{T.imagemDica}</span>
                    <ButtonUtility icon={Trash01} color="tertiary" tooltip={T.removerImagem} aria-label={T.removerImagem} onClick={() => onChange(undefined)} className="size-11" />
                </div>
            </Surgir>
            <Surgir visivel={!imagem}>
                <FileUploadDropZone
                    // "ou arraste o arquivo" alinhado ao meio do botão de 44 px.
                    className="[&_label+span]:self-center"
                    accept="image/png,image/jpeg"
                    allowsMultiple={false}
                    hint={T.imagemDica}
                    onDropFiles={(files) => {
                        const file = files[0];
                        if (file) void escolher(file);
                    }}
                />
            </Surgir>
        </div>
    );
}
