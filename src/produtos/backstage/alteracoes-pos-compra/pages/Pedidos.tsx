import { useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { motion } from "motion/react";
import { ShoppingBag01 } from "@untitledui/icons";
import { Select } from "@/components/base/select/select";
import { cx } from "@/utils/cx";
import { BackstageLayout } from "../../components/Backstage";
import { eventos as eventosDaOrganizacao, semEventosNaOrganizacao, useEventosVersao } from "../../eventos/data/eventos";
import { FaixaAtencaoPedidos } from "../components/FaixaAtencaoPedidos";
import { FOCO } from "../components/pos-compra-ui";
import {
    EVENTOS,
    formatarMoeda,
    getConta,
    getEvento,
    totaisDoPedido,
    usePedidos,
    uuidCurto,
    type Pedido,
} from "../data/pos-compra-store";
import { CabecalhoDaPagina } from "../../components/cabecalho-da-pagina";
import { RodapeDePaginacao } from "../../components/rodape-de-paginacao";
import { BarraDaLista, CabecalhoDaTabela, CartaoDaTabela, Celula, LinhaDaTabela, SemResultados, TituloDaLinha, VazioDaTabela } from "../../components/tabela";

/* PED-100: o total cobrado (itens, taxa de serviço, proteção e juros), o mesmo número do cartão do
   pedido e da compra no histórico. Somar só os itens dava um valor que o cliente não acha no extrato. */
const totalPago = (pedido: Pedido) => totaisDoPedido(pedido).pago;

const TODOS = "todos";

/* Larguras das colunas no modo tabela (cartão com 44rem ou mais, BKS-115); no modo lista cada valor vira uma linha com rótulo. */
const COLUNA = {
    pedido: "@min-[44rem]:w-24 @min-[44rem]:shrink-0",
    evento: "min-w-0 @min-[44rem]:w-56 @min-[44rem]:shrink-0",
    total: "@min-[44rem]:w-28 @min-[44rem]:shrink-0",
};

export function Pedidos() {
    const navigate = useNavigate();
    const todosPedidos = usePedidos();
    const versaoEventos = useEventosVersao();
    /* PED-92: só pedidos de eventos da organização em contexto (BKS-14). Os eventos de demonstração
       (fora do banco) não são de organização nenhuma e saíram da lista e do filtro. */
    const daOrganizacao = useMemo(() => {
        // Organização sem evento: a lista de eventos guarda a da anterior, então nada é dela.
        const ids = new Set(semEventosNaOrganizacao() ? [] : eventosDaOrganizacao.map((e) => e.id));
        return (eventoId: string) => ids.has(eventoId);
    }, [versaoEventos]);
    const pedidos = useMemo(() => todosPedidos.filter((p) => daOrganizacao(p.eventoId)), [todosPedidos, daOrganizacao]);
    const location = useLocation();
    /* Busca, filtros e página moram na URL: abrir um pedido e voltar devolve a lista como estava,
       e o endereço pode ser colado para um colega ver o mesmo recorte. */
    const [parametros, setParametros] = useSearchParams();
    const busca = parametros.get("busca") ?? "";
    const eventoId = parametros.get("evento") ?? TODOS;
    const porPagina = Number(parametros.get("porPagina") ?? 25) || 25;
    const pagina = Number(parametros.get("pagina") ?? 1) || 1;
    const definir = (mudancas: Record<string, string | number>) =>
        setParametros(
            (atual) => {
                const proximo = new URLSearchParams(atual);
                Object.entries(mudancas).forEach(([chave, valor]) => {
                    const padrao = chave === "pagina" ? "1" : chave === "porPagina" ? "25" : chave === "busca" ? "" : TODOS;
                    if (String(valor) === padrao) proximo.delete(chave);
                    else proximo.set(chave, String(valor));
                });
                return proximo;
            },
            { replace: true },
        );
    const setPagina = (valor: number) => definir({ pagina: valor });
    const abrirPedido = (pedidoId: string) => navigate(`/backstage/pedidos/${pedidoId}`, { state: { de: location.search } });

    const termo = busca.trim().toLowerCase();
    const filtrados = useMemo(
        () =>
            pedidos.filter((pedido) => {
                if (eventoId !== TODOS && pedido.eventoId !== eventoId) return false;
                if (!termo) return true;
                const comprador = getConta(pedido.compradorId)?.nome.toLowerCase() ?? "";
                const evento = getEvento(pedido.eventoId)?.nome.toLowerCase() ?? "";
                return (
                    pedido.id.toLowerCase().includes(termo) || comprador.includes(termo) || evento.includes(termo)
                );
            }),
        [pedidos, termo, eventoId],
    );

    const eventosFiltro = [{ id: TODOS, label: "Todos os eventos" }, ...EVENTOS.filter((e) => daOrganizacao(e.id)).map((e) => ({ id: e.id, label: e.nome }))];

    /* Qualquer mudança de filtro recomeça a leitura: manter a página 7 depois de filtrar confunde. */
    const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
    const paginaAtual = Math.min(pagina, totalPaginas);
    const inicio = (paginaAtual - 1) * porPagina;
    const visiveis = filtrados.slice(inicio, inicio + porPagina);
    /* Uma escrita só na URL: duas seguidas (filtro e página) fariam a segunda apagar a primeira. */
    const aoFiltrar = (chave: "busca" | "evento") => (valor: string) => definir({ [chave]: valor, pagina: 1 });
    /* A paginação do DS (BKS-114) com o estado da URL: mesma forma de `usePaginacao`, mas página e
       tamanho moram no endereço (PED-04) e mudar o tamanho volta à página 1 (PED-05). */
    const paginacao = {
        pagina: paginaAtual,
        paginas: totalPaginas,
        tamanho: porPagina,
        total: filtrados.length,
        inicio,
        visiveis,
        setPagina: (valor: number) => setPagina(Math.min(Math.max(1, Math.round(valor) || 1), totalPaginas)),
        setTamanho: (valor: number) => definir({ porPagina: valor, pagina: 1 }),
    };

    return (
        <BackstageLayout showEventContext={false} activeProducer="pedidos">
            <motion.div
                className="flex min-w-0 flex-1 flex-col gap-5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
            >
                {/* O subtítulo diz o que se faz aqui, na voz de quem atende (PED-119). Era a lista das
                    três operações com o nome interno delas. */}
                <CabecalhoDaPagina titulo="Pedidos" subtitulo="Encontre o pedido do cliente para transferir, trocar itens ou corrigir respostas." />

                <FaixaAtencaoPedidos pedidos={pedidos} onAbrir={abrirPedido} />

                {pedidos.length === 0 ? (
                    /* Organização sem pedido nenhum: vazio, não "sem resultado" (BKS-117, PED-98). Sem ação:
                       pedido nasce da compra, não daqui. */
                    <VazioDaTabela
                        icone={ShoppingBag01}
                        titulo="Nenhum pedido ainda"
                        texto="Os pedidos dos eventos desta organização aparecem aqui assim que forem pagos."
                    />
                ) : (
                    <div className="flex flex-col gap-4">
                        {/* Busca à esquerda; o filtro aqui é de evento, não de status (BKS-111): eventos são
                            muitos e mudam por organização, então ficam num seletor, não em botões. */}
                        <BarraDaLista
                            busca={{ valor: busca, onChange: aoFiltrar("busca"), placeholder: "ID do pedido, participante ou evento", rotulo: "Buscar pedido" }}
                            filtro={
                                <Select
                                    aria-label="Evento"
                                    size="sm"
                                    selectedKey={eventoId}
                                    onSelectionChange={(key) => aoFiltrar("evento")(String(key))}
                                    items={eventosFiltro}
                                    className="w-full sm:w-64"
                                >
                                    {(evento) => <Select.Item id={evento.id}>{evento.label}</Select.Item>}
                                </Select>
                            }
                        />
                        <CartaoDaTabela>
                            <CabecalhoDaTabela>
                                <span className="min-w-0 flex-1">Comprador</span>
                                <span className={COLUNA.pedido}>Pedido</span>
                                <span className={COLUNA.evento}>Evento</span>
                                {/* A contagem de itens saiu: era um número solto que não respondia nada
                                    sozinho. O que decide a triagem na lista é quanto saiu do bolso. */}
                                <span className={cx(COLUNA.total, "text-right")}>Total pago</span>
                            </CabecalhoDaTabela>
                            {filtrados.length === 0 ? (
                                /* Texto de gente, com o que fazer (PED-120): era "Nenhum pedido encontrado para essa busca." */
                                <SemResultados
                                    texto={
                                        busca.trim()
                                            ? `Nenhum pedido com “${busca.trim()}”. Confira a grafia ou busque pelo ID do pedido.`
                                            : "Nenhum pedido neste evento ainda. Escolha outro evento ou veja todos."
                                    }
                                    onLimpar={() => definir({ busca: "", evento: TODOS, pagina: 1 })}
                                />
                            ) : (
                                <ul className="flex flex-col divide-y divide-secondary">
                                    {visiveis.map((pedido) => {
                                        const comprador = getConta(pedido.compradorId);
                                        return (
                                            <LinhaDaTabela key={pedido.id} interativa className="relative">
                                                <div className="flex min-w-0 flex-1 flex-col gap-1 @min-[44rem]:flex-row @min-[44rem]:items-center @min-[44rem]:gap-4">
                                                    {/* O nome lidera: o atendente tem o nome na mão, e é por ele que a busca casa.
                                                        O botão cobre a linha inteira (after:inset-0): tocar em qualquer ponto abre o pedido. */}
                                                    <TituloDaLinha
                                                        titulo={
                                                            <button
                                                                type="button"
                                                                onClick={() => abrirPedido(pedido.id)}
                                                                className={cx("text-left after:absolute after:inset-0 after:content-['']", FOCO)}
                                                            >
                                                                {comprador?.nome ?? "Comprador sem nome"}
                                                            </button>
                                                        }
                                                        apoio={comprador?.email}
                                                    />
                                                    {/* A forma curta que o resto do produto já usa nos títulos; o ID inteiro fica no
                                                        detalhe, com o botão de copiar, e continua valendo na busca. */}
                                                    <Celula rotulo="Pedido" className={COLUNA.pedido}>
                                                        <span className="font-mono">{uuidCurto(pedido.id)}</span>
                                                    </Celula>
                                                    {/* Quebra linha em vez de cortar (PED-119): truncado, o nome do evento
                                                        sumia no meio e não havia onde ler o resto. */}
                                                    <Celula rotulo="Evento" className={COLUNA.evento}>
                                                        <span className="break-words">{getEvento(pedido.eventoId)?.nome}</span>
                                                    </Celula>
                                                    <Celula rotulo="Total pago" numero className={COLUNA.total}>
                                                        {formatarMoeda(totalPago(pedido))}
                                                    </Celula>
                                                </div>
                                                {/* Sem o olho "Detalhes": a linha inteira já abre o pedido (PED-07), e o
                                                    olho era um segundo alvo para a mesma ação. */}
                                            </LinhaDaTabela>
                                        );
                                    })}
                                </ul>
                            )}
                            {/* Paginação do DS (BKS-114), com página e tamanho na URL (PED-04). */}
                            <RodapeDePaginacao {...paginacao} />
                        </CartaoDaTabela>
                    </div>
                )}
            </motion.div>
        </BackstageLayout>
    );
}
