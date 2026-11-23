import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Plus, ShoppingBag01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import type { ProdutoDaOrganizacao } from "@/plataforma";
import { BackstageLayout } from "../../components/Backstage";
import { CabecalhoDaPagina } from "../../components/cabecalho-da-pagina";
import { RodapeDePaginacao, usePaginacao } from "../../components/rodape-de-paginacao";
import { BarraDaLista, CabecalhoDaTabela, CarregandoTabela, CartaoDaTabela, Celula, LinhaDaTabela, SemResultados, TituloDaLinha, VazioDaTabela } from "../../components/tabela";
import { paraBusca } from "../../itens/components/escala";
import { formatar, useTextosItens } from "../../itens/data/textos-itens";
import { useBiblioteca } from "../data/biblioteca";

/* ------------------------------------------------------------------ */
/*  Produtos da organização (POR)                                      */
/*                                                                     */
/*  A biblioteca que todos os eventos usam. Cada linha mostra preço    */
/*  sugerido e em quantos eventos o produto está. Lista do Backstage   */
/*  (BKS-110 a BKS-118): busca, tabela e paginação acima de 10.        */
/* ------------------------------------------------------------------ */

const T = {
    titulo: "Produtos",
    subtitulo: "Cada evento escolhe quais vender, com preço e estoque próprios.",
    criar: "Criar produto",
    buscar: "Buscar produto",
    nada: "Nenhum produto encontrado.",
    colProduto: "Produto",
    colPreco: "Preço sugerido",
    vazio: "Nenhum produto ainda",
    vazioDica: "Crie camisetas, copos, estacionamento e o que mais a organização vende nos eventos.",
    eventos: { one: "Em {n} evento", other: "Em {n} eventos" },
    semEvento: "Em nenhum evento",
    abrir: "Abrir {nome}",
    carregando: "Carregando produtos",
};

export function ProdutosDaOrganizacao() {
    const navigate = useNavigate();
    const { carregando, biblioteca, usos } = useBiblioteca();
    /* A busca mora na URL (POR-08): abrir um produto e voltar devolve a lista filtrada como estava. */
    const [parametros, setParametros] = useSearchParams();
    const busca = parametros.get("busca") ?? "";
    const setBusca = (valor: string) =>
        setParametros(
            (atual) => {
                const proximo = new URLSearchParams(atual);
                if (valor) proximo.set("busca", valor);
                else proximo.delete("busca");
                return proximo;
            },
            { replace: true },
        );
    const termo = paraBusca(busca.trim());
    const ordenados = useMemo(() => [...biblioteca].sort((a, b) => a.nome.localeCompare(b.nome)), [biblioteca]);
    const filtrados = useMemo(() => (termo ? ordenados.filter((p) => paraBusca(p.nome).includes(termo)) : ordenados), [ordenados, termo]);
    // Busca ou tamanho mudou: volta à página 1 (BKS-114).
    const paginacao = usePaginacao(filtrados, [termo]);
    const criar = () => navigate("/backstage/produtos/novo");

    return (
        <BackstageLayout showEventContext={false} activeProducer="produtos" showLayoutSwitcher={false}>
            <div className="flex min-w-0 flex-1 flex-col gap-6">
                <CabecalhoDaPagina
                    titulo={T.titulo}
                    subtitulo={T.subtitulo}
                    acoes={
                        !carregando &&
                        biblioteca.length > 0 && (
                            <Button color="primary" size="md" iconLeading={Plus} onClick={criar}>
                                {T.criar}
                            </Button>
                        )
                    }
                />

                {carregando ? (
                    <CarregandoTabela rotulo={T.carregando} />
                ) : biblioteca.length === 0 ? (
                    <VazioDaTabela
                        icone={ShoppingBag01}
                        titulo={T.vazio}
                        texto={T.vazioDica}
                        acao={
                            <Button color="primary" size="md" iconLeading={Plus} onClick={criar}>
                                {T.criar}
                            </Button>
                        }
                    />
                ) : (
                    <div className="flex flex-col gap-4">
                        <BarraDaLista busca={{ valor: busca, onChange: setBusca, placeholder: T.buscar }} />
                        <CartaoDaTabela>
                            <CabecalhoDaTabela>
                                <span className="min-w-0 flex-1">{T.colProduto}</span>
                                <span className="w-36 text-right">{T.colPreco}</span>
                            </CabecalhoDaTabela>
                            {filtrados.length === 0 ? (
                                <SemResultados texto={T.nada} onLimpar={() => setBusca("")} />
                            ) : (
                                <ul className="flex flex-col divide-y divide-secondary">
                                    {paginacao.visiveis.map((p) => (
                                        <LinhaDoProduto key={p.id} produto={p} usos={usos.get(p.id) ?? 0} onAbrir={() => navigate(`/backstage/produtos/${p.id}`, { state: { de: `?${parametros}` } })} />
                                    ))}
                                </ul>
                            )}
                            <RodapeDePaginacao {...paginacao} />
                        </CartaoDaTabela>
                    </div>
                )}
            </div>
        </BackstageLayout>
    );
}

/** Uma linha (BKS-113): imagem, nome e em quantos eventos está; preço sugerido à direita. O nome abre o produto e cobre a linha. */
function LinhaDoProduto({ produto, usos, onAbrir }: { produto: ProdutoDaOrganizacao; usos: number; onAbrir: () => void }) {
    const { preco, plural } = useTextosItens();
    return (
        <LinhaDaTabela interativa className="relative outline-focus-ring -outline-offset-2 has-[.abrir-linha:focus-visible]:outline-2">
            <div className="flex min-w-0 flex-1 flex-col gap-2 @min-[44rem]:flex-row @min-[44rem]:items-center @min-[44rem]:gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary">
                        {produto.imagem ? <img src={produto.imagem} alt="" className="size-full object-cover" /> : <ShoppingBag01 className="size-5 text-fg-quaternary" aria-hidden="true" />}
                    </span>
                    <TituloDaLinha
                        titulo={
                            <button
                                type="button"
                                onClick={onAbrir}
                                aria-label={formatar(T.abrir, { nome: produto.nome })}
                                className="abrir-linha max-w-full cursor-pointer truncate text-left outline-hidden after:absolute after:inset-0"
                            >
                                {produto.nome}
                            </button>
                        }
                        apoio={usos ? plural(T.eventos, usos) : T.semEvento}
                    />
                </div>
                <Celula rotulo={T.colPreco} numero className="font-medium @min-[44rem]:w-36">
                    {preco(produto.precoBase)}
                </Celula>
            </div>
        </LinhaDaTabela>
    );
}
