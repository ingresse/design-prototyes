import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { ArrowDown, ArrowUp, Eye, SlashCircle01, Tag01 } from "@untitledui/icons";
import { toast } from "sonner";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Select } from "@/components/base/select/select";
import { cx } from "@/utils/cx";
import { useNavegarNoPainel } from "../../components/painel";
import { BackstageLayout } from "../../components/Backstage";
import { RodapeDePaginacao, usePaginacao } from "../../components/rodape-de-paginacao";
import { BarraDaLista, CabecalhoDaTabela, CartaoDaTabela, Celula, LinhaDaTabela, SemResultados, TituloDaLinha, VazioDaTabela } from "../../components/tabela";
import { CancelPedidosModal } from "../components/CancelPedidosModal";
import { PedidoDetailsSlideOut, type PedidoDownload, type ResendChannel } from "../components/PedidoDetailsSlideOut";
import { gerarIngressosCsv, gerarIngressosPdf } from "../utils/gerar-ingressos";
import { formatBRL } from "../data/catalogo";
import { PEDIDO_TIPO_LABEL, type Pedido } from "../data/pedidos";
import { cancelPedidos, formatDateTime, registerResend, usePedidos } from "../data/pedidos-store";
import { useCatalogoDoBanco } from "../data/plataforma";
import { TituloDaEmissao } from "@/produtos/backstage/components/navegacao-de-secao";
import { MetricasDaLista, SeloDeStatus } from "../../components/estado-de-pedido";

const STATUS_OPTIONS = [
    { id: "todos", label: "Todos" },
    { id: "pendente", label: "Pendente" },
    { id: "aprovado", label: "Aprovado" },
    { id: "expirado", label: "Expirado" },
    { id: "cancelado", label: "Cancelado" },
];

const TODOS = { id: "todos", label: "Todos" };

/* Larguras das colunas no modo tabela (cartão com 44rem ou mais, BKS-115); no modo lista cada valor vira uma linha com rótulo. */
const COLUNA = {
    pagamento: "@min-[44rem]:w-28 @min-[44rem]:shrink-0",
    emissor: "min-w-0 @min-[44rem]:flex-1",
    data: "@min-[44rem]:w-32 @min-[44rem]:shrink-0",
    valor: "@min-[44rem]:w-36 @min-[44rem]:shrink-0",
    acoes: "w-[68px] shrink-0",
};

export function PedidosBilheteria() {
    const navigate = useNavegarNoPainel();

    const [searchParams] = useSearchParams();
    /** `?sem-itens=1` demonstra o empty state de evento sem itens cadastrados. */
    const { sessoes } = useCatalogoDoBanco();
    const hasCatalog = searchParams.get("sem-itens") !== "1" && sessoes.some((s) => s.tickets.length > 0);

    const rows = usePedidos();
    const [term, setTerm] = useState("");
    const [status, setStatus] = useState<string>("todos");
    const [emissor, setEmissor] = useState<string>("todos");
    const [sortAsc, setSortAsc] = useState(false);
    const [detail, setDetail] = useState<Pedido | null>(null);
    const [pendingCancel, setPendingCancel] = useState<Pedido[] | null>(null);

    const filtered = useMemo(() => {
        const query = term.trim().toLowerCase();
        return rows
            .filter((row) => (status === "todos" ? true : row.status === status))
            .filter((row) => (emissor === "todos" ? true : row.emissor === emissor))
            .filter((row) => (query ? `${row.id} ${row.destinatario}`.toLowerCase().includes(query) : true))
            .sort((a, b) => (sortAsc ? a.dataVenda.localeCompare(b.dataVenda) : b.dataVenda.localeCompare(a.dataVenda)));
    }, [rows, term, status, emissor, sortAsc]);

    const emissorOptions = useMemo(
        () => [TODOS, ...[...new Set(rows.map((row) => row.emissor))].map((email) => ({ id: email, label: email }))],
        [rows],
    );

    const resumo = useMemo(
        () => ({
            aprovados: rows.filter((row) => row.status === "aprovado").length,
            pendentes: rows.filter((row) => row.status === "pendente").length,
            expirados: rows.filter((row) => row.status === "expirado").length,
            cancelados: rows.filter((row) => row.status === "cancelado").length,
        }),
        [rows],
    );

    // Paginação do DS (BKS-114): 10 por página; busca e filtros voltam à página 1.
    const paginacao = usePaginacao(filtered, [term, status, emissor]);

    const applyCancel = (targets: Pedido[]) => {
        const ids = targets.map((row) => row.id);
        cancelPedidos(ids);
        setDetail((current) => (current && ids.includes(current.id) ? { ...current, status: "cancelado" } : current));
        toast.success(targets.length === 1 ? "Pedido cancelado" : `${targets.length} pedidos cancelados`);
    };

    const handleResend = (pedido: Pedido, canal: ResendChannel, destino: string) => {
        const at = formatDateTime(new Date());
        registerResend(pedido.id, at, canal, destino);
        setDetail((current) =>
            current && current.id === pedido.id
                ? { ...current, resentAt: at, envios: [...(current.envios ?? []), { canal, destino, at }] }
                : current,
        );
        // Sem link de pagamento, o que é enviado são os próprios ingressos.
        const assunto = pedido.tipo === "link" ? "Link de pagamento" : "Ingressos";
        toast.success(canal === "email" ? `${assunto} enviado para ${destino}` : `${assunto} enviado no WhatsApp ${destino}`);
    };

    const handleDownload = (pedido: Pedido, formato: PedidoDownload) => {
        if (formato === "csv") return gerarIngressosCsv(pedido);
        if (formato === "zebra") return toast("Impressão Zebra ainda não está disponível neste protótipo");
        gerarIngressosPdf(pedido);
    };

    return (
        <BackstageLayout activeSection="bilheteria" activeItem="bilheteria-online">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
                <TituloDaEmissao
                    acoes={
                        rows.length > 0 && (
                            <Button size="md" color="primary" onClick={() => navigate("/backstage/bilheteria/vender")}>
                                Vender ingressos
                            </Button>
                        )
                    }
                >
                    Bilheteria online
                </TituloDaEmissao>

                {rows.length === 0 ? (
                    <VazioDaTabela
                        icone={Tag01}
                        titulo={hasCatalog ? "Venda ingressos no balcão" : "Você ainda não tem ingressos à venda"}
                        texto={
                            hasCatalog
                                ? "Identifique o comprador, escolha os itens e gere um link de pagamento ou emita os ingressos na hora. Os pedidos aparecem aqui."
                                : "Crie um ingresso e deixe pelo menos um ativo para vender no balcão."
                        }
                        acao={
                            <Button size="md" color="primary" onClick={() => navigate(hasCatalog ? "/backstage/bilheteria/vender" : "/backstage/catalogo/ingressos")}>
                                {hasCatalog ? "Vender ingressos" : "Criar ingresso"}
                            </Button>
                        }
                    />
                ) : (
                    <>
                        {/* Expirado ganha cartão próprio: é venda perdida que dá para recuperar. */}
                        {/* Colunas pela largura que sobra, não pela tela: com os trilhos abertos a área útil
                            num tablet é estreita, e quatro colunas fixas espremiam os números. */}
                        <MetricasDaLista
                            metricas={[
                                { rotulo: "Pedidos aprovados", valor: resumo.aprovados },
                                { rotulo: "Pedidos pendentes", valor: resumo.pendentes },
                                { rotulo: "Links expirados", valor: resumo.expirados },
                                { rotulo: "Pedidos cancelados", valor: resumo.cancelados },
                            ]}
                        />

                        <div className="@container flex flex-col gap-4">
                            {/* Busca à esquerda; status em botões segmentados e emissor à direita (BKS-111). Os cinco
                                status não cabem em botões num cartão estreito: abaixo de 30rem viram um seletor. */}
                            <BarraDaLista busca={{ valor: term, onChange: setTerm, placeholder: "Buscar por pedido ou e-mail do comprador", rotulo: "Buscar pedido" }}
                                filtro={
                                    <>
                                        <ButtonGroup
                                            size="sm"
                                            aria-label="Status"
                                            selectedKeys={new Set([status])}
                                            onSelectionChange={(keys) => setStatus(String([...keys][0] ?? "todos"))}
                                            disallowEmptySelection
                                            className="hidden @min-[30rem]:inline-flex"
                                        >
                                            {STATUS_OPTIONS.map((item) => (
                                                <ButtonGroupItem key={item.id} id={item.id}>
                                                    {item.label}
                                                </ButtonGroupItem>
                                            ))}
                                        </ButtonGroup>
                                        <Select
                                            aria-label="Status"
                                            size="sm"
                                            selectedKey={status}
                                            onSelectionChange={(key) => setStatus(String(key))}
                                            items={STATUS_OPTIONS}
                                            className="w-full @min-[30rem]:hidden"
                                        >
                                            {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                                        </Select>
                                    </>
                                }
                            >
                                <Select
                                    aria-label="Emissor responsável"
                                    placeholder="Emissor responsável"
                                    size="sm"
                                    selectedKey={emissor}
                                    onSelectionChange={(key) => setEmissor(String(key))}
                                    items={emissorOptions}
                                    className="w-full @min-[30rem]:w-56"
                                >
                                    {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                                </Select>
                            </BarraDaLista>

                            <CartaoDaTabela>
                                <CabecalhoDaTabela ordenavel>
                                    <span className="min-w-0 flex-1">Pedido</span>
                                    <span className={COLUNA.pagamento}>Pagamento</span>
                                    <span className={COLUNA.emissor}>Emissor responsável</span>
                                    <span className={COLUNA.data}>
                                        <button
                                            type="button"
                                            onClick={() => setSortAsc((asc) => !asc)}
                                            aria-label={sortAsc ? "Data da venda, mais antiga primeiro" : "Data da venda, mais nova primeiro"}
                                            className="flex items-center gap-1 transition duration-100 ease-linear hover:text-secondary_hover"
                                        >
                                            Data da venda
                                            {sortAsc ? <ArrowUp className="size-4" aria-hidden="true" /> : <ArrowDown className="size-4" aria-hidden="true" />}
                                        </button>
                                    </span>
                                    <span className={cx(COLUNA.valor, "text-right")}>Valor</span>
                                    <span className={COLUNA.acoes} />
                                </CabecalhoDaTabela>
                                {filtered.length === 0 ? (
                                    <SemResultados
                                        texto="Nenhum pedido encontrado para os filtros."
                                        onLimpar={() => {
                                            setTerm("");
                                            setStatus("todos");
                                            setEmissor("todos");
                                        }}
                                    />
                                ) : (
                                    <ul className="flex flex-col divide-y divide-secondary">
                                        {paginacao.visiveis.map((row) => (
                                            // A linha inteira abre o detalhe (um botão por baixo de tudo); as ações ficam por cima (BIL-106).
                                            <LinhaDaTabela key={row.id} interativa className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() => setDetail(row)}
                                                    aria-label={`Ver detalhes do pedido ${row.id}`}
                                                    className="absolute inset-0 cursor-pointer outline-focus-ring focus-visible:outline-2 focus-visible:-outline-offset-2"
                                                />
                                                <div className="pointer-events-none flex min-w-0 flex-1 flex-col gap-1 @min-[44rem]:flex-row @min-[44rem]:items-center @min-[44rem]:gap-4">
                                                    <TituloDaLinha titulo={row.id} apoio={PEDIDO_TIPO_LABEL[row.tipo]} />
                                                    <Celula rotulo="Pagamento" className={COLUNA.pagamento}>
                                                        <SeloDeStatus status={row.status} />
                                                    </Celula>
                                                    <Celula rotulo="Emissor responsável" className={COLUNA.emissor}>
                                                        <span className="min-w-0 break-all @min-[44rem]:block @min-[44rem]:truncate">{row.emissor}</span>
                                                    </Celula>
                                                    <Celula rotulo="Data da venda" className={COLUNA.data}>
                                                        <span className="whitespace-nowrap">{row.dataVendaLabel}</span>
                                                    </Celula>
                                                    {/* A coluna diz o que o número é: o que o comprador paga no link, ou a taxa que a produtora paga no "só a taxa" (BIL-110). */}
                                                    <Celula rotulo="Valor" numero className={COLUNA.valor}>
                                                        <span className="flex flex-col items-start @min-[44rem]:items-end">
                                                            <span className="whitespace-nowrap">{formatBRL(row.valor)}</span>
                                                            <span className="text-sm whitespace-nowrap text-tertiary">{row.tipo === "saldo" ? "taxa da produtora" : "pago pelo comprador"}</span>
                                                        </span>
                                                    </Celula>
                                                    {/* Bloco (celular): ações com texto e 44 px (UI-MOB-005). */}
                                                    <div className="pointer-events-auto relative z-10 mt-1 flex flex-wrap gap-2 @min-[44rem]:hidden">
                                                        <Button
                                                            size="sm"
                                                            color="secondary"
                                                            iconLeading={SlashCircle01}
                                                            isDisabled={row.status === "cancelado"}
                                                            onClick={() => setPendingCancel([row])}
                                                            className="min-h-11"
                                                        >
                                                            Cancelar pedido
                                                        </Button>
                                                        <Button size="sm" color="secondary" iconLeading={Eye} onClick={() => setDetail(row)} className="min-h-11">
                                                            Detalhes
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className={cx(COLUNA.acoes, "pointer-events-auto relative z-10 hidden items-center justify-end gap-1 @min-[44rem]:flex")}>
                                                    <ButtonUtility
                                                        size="xs"
                                                        color="tertiary"
                                                        icon={SlashCircle01}
                                                        tooltip="Cancelar pedido"
                                                        isDisabled={row.status === "cancelado"}
                                                        onClick={() => setPendingCancel([row])}
                                                    />
                                                    <ButtonUtility size="xs" color="tertiary" icon={Eye} tooltip="Detalhes" onClick={() => setDetail(row)} />
                                                </div>
                                            </LinhaDaTabela>
                                        ))}
                                    </ul>
                                )}
                                <RodapeDePaginacao {...paginacao} />
                            </CartaoDaTabela>
                        </div>
                    </>
                )}
            </div>

            <PedidoDetailsSlideOut
                pedido={detail}
                onClose={() => setDetail(null)}
                onResend={handleResend}
                onDownload={handleDownload}
                onNovaVenda={() => navigate("/backstage/bilheteria/vender")}
            />

            <CancelPedidosModal
                pedidos={pendingCancel}
                onClose={() => setPendingCancel(null)}
                onConfirm={(targets) => {
                    applyCancel(targets);
                    setPendingCancel(null);
                }}
            />
        </BackstageLayout>
    );
}

