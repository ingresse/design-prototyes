import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Copy01, DotsVertical, Download01, Edit01, LinkBroken02, Plus, Ticket01, Trash01, XClose } from "@untitledui/icons";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Toggle } from "@/components/base/toggle/toggle";
import { Surgir } from "@/components/foundations/transicao";
import type { Cupom, Evento } from "@/plataforma";
import { BackstageLayout } from "../../components/Backstage";
import { CabecalhoDaFuncionalidade } from "../../components/cabecalho-da-funcionalidade";
import { ModalDeConfirmacao } from "../../components/modal-de-confirmacao";
import { RodapeDePaginacao, usePaginacao } from "../../components/rodape-de-paginacao";
import { BarraDaLista, CabecalhoDaTabela, CarregandoTabela, CartaoDaTabela, Celula, LinhaDaTabela, SemResultados, TituloDaLinha, VazioDaTabela } from "../../components/tabela";
import { useCatalogo } from "../../itens/data/catalogo";
import { useTextosItens } from "../../itens/data/textos-itens";
import { PainelDeCupons, type PainelDeCupom } from "../components/painel-de-cupons";
import { formatarDesconto, salvarCupons } from "../data/cupons";

/*
 * Cupom de desconto (cupons/rules.md): o gêmeo da tela de produção `coupons`. Lista com filtro,
 * busca, seleção em lote e ações; criar e editar acontecem no painel lateral.
 */

const T = {
    titulo: "Cupom de desconto",
    exportar: "Exportar",
    todos: "Todos",
    ativos: "Ativos",
    inativos: "Inativos",
    filtro: "Filtrar cupons",
    buscar: "Buscar cupom",
    colCupom: "Cupom",
    colStatus: "Status",
    colDesconto: "Desconto",
    colVendidos: "Itens vendidos",
    nenhumVinculo: "Nenhum vínculo",
    umVinculo: "1 vínculo",
    vinculos: "{n} vínculos",
    ativo: "Ativo",
    inativo: "Inativo",
    vendidos: "{usados} de {total}",
    ilimitado: "ilimitado",
    copiar: "Copiar link do cupom",
    copiado: "Link copiado!",
    erroCopiar: "Erro ao copiar link",
    maisOpcoes: "Mais opções",
    editar: "Editar cupom",
    editarVinculos: "Editar vínculos",
    desvincular: "Desvincular tudo",
    ativar: "Ativar",
    desativar: "Desativar",
    excluir: "Excluir",
    naoExclui: "Cupom já usado não pode ser excluído",
    nenhum: "Nenhum cupom encontrado para essa busca ou filtro.",
    novo: "Novo cupom",
    vazioTitulo: "Ofereça descontos e atraia mais compradores",
    vazioTexto:
        "Crie cupons por código para seus ingressos e combos, com limite de uso e validade. Ideal para impulsionar vendas e organizar promoções estratégicas.",
    lote: "Ações para cupons selecionados",
    selecionados: "{n} cupons selecionados",
    umSelecionado: "1 cupom selecionado",
    selecionarTodos: "Selecionar todos os {n} cupons",
    ativado: "Cupom {c} ativado.",
    desativado: "Cupom {c} desativado.",
    desfazer: "Desfazer",
    novasAssociacoes: "Novas associações",
    limpar: "Limpar seleção",
    erroStatus: "Erro ao alterar status do cupom. Tente novamente.",
    erroExcluir: "Erro ao excluir. Tente novamente.",
    erroDesvincular: "Erro ao desvincular itens. Tente novamente.",
};

type Acao = "ativar" | "desativar" | "excluir" | "desvincular";

const CONFIRMACOES: Record<
    Acao,
    {
        um: [string, string];
        varios: [string, string];
        botao: string;
        destrutiva: boolean;
    }
> = {
    ativar: {
        um: ["Deseja ativar este cupom?", "Ao ativá-lo, os itens vinculados permitirão a aplicação do desconto, de acordo com as regras estabelecidas."],
        varios: [
            "Deseja ativar os cupons selecionados?",
            "Ao ativá-los, os itens vinculados permitirão a aplicação do desconto, de acordo com as regras estabelecidas.",
        ],
        botao: "Sim, ative",
        destrutiva: false,
    },
    desativar: {
        um: ["Deseja desativar este cupom?", "Ao desativá-lo, os itens vinculados deixarão de exibir o desconto quando ele for utilizado."],
        varios: ["Deseja desativar os cupons selecionados?", "Ao desativá-los, os itens vinculados deixarão de exibir o desconto quando forem utilizados."],
        botao: "Sim, desative",
        destrutiva: false,
    },
    excluir: {
        um: ["Deseja excluir este cupom?", "Ao excluí-lo, os itens associados deixarão de ter direito ao desconto."],
        varios: ["Deseja excluir os cupons selecionados?", "Ao excluí-los, os itens associados deixarão de ter direito ao desconto."],
        botao: "Sim, exclua",
        destrutiva: true,
    },
    desvincular: {
        um: ["Deseja desvincular os itens deste cupom?", "Ao desvinculá-los, os itens deixarão de ter direito ao desconto."],
        varios: ["Deseja desvincular os cupons selecionados?", "Ao desvinculá-los, os itens deixarão de ter direito ao desconto."],
        botao: "Sim, desvincule",
        destrutiva: true,
    },
};

const contagem = (n: number) => (n === 0 ? T.nenhumVinculo : n === 1 ? T.umVinculo : T.vinculos.replace("{n}", n.toLocaleString("pt-BR")));

export function Cupons() {
    const { evento, carregando } = useCatalogo();
    return (
        <BackstageLayout activeSection="itens" activeItem="cupons">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
                {carregando || !evento ? (
                    <>
                        <CabecalhoDaFuncionalidade titulo={T.titulo} />
                        <CarregandoTabela />
                    </>
                ) : (
                    <ListaDeCupons key={evento.id} evento={evento} />
                )}
            </div>
        </BackstageLayout>
    );
}

function ListaDeCupons({ evento }: { evento: Evento }) {
    const { preco, numero } = useTextosItens();
    const cupons = evento.cupons ?? [];
    const [filtro, setFiltro] = useState<"todos" | "ativos" | "inativos">("todos");
    const [busca, setBusca] = useState("");
    const [selecao, setSelecao] = useState<Set<string>>(new Set());
    const [painel, setPainel] = useState<PainelDeCupom | null>(null);
    const [confirmacao, setConfirmacao] = useState<{
        acao: Acao;
        ids: string[];
    } | null>(null);
    const [aviso, setAviso] = useState(false);
    const [copiado, setCopiado] = useState<string | null>(null);
    const [gravando, setGravando] = useState(false);

    const termo = busca.trim().toLowerCase();
    const filtrados = useMemo(
        () => cupons.filter((c) => (filtro === "todos" || (filtro === "ativos") === c.ativo) && (!termo || c.codigo.toLowerCase().includes(termo))),
        [cupons, filtro, termo],
    );
    const paginacao = usePaginacao(filtrados, [filtro, termo]);
    const limpar = () => (setBusca(""), setFiltro("todos"));
    const daPagina = paginacao.visiveis.map((c) => c.id);
    const todosNaPagina = daPagina.length > 0 && daPagina.every((id) => selecao.has(id));
    const algunsNaPagina = !todosNaPagina && daPagina.some((id) => selecao.has(id));
    const selecionados = cupons.filter((c) => selecao.has(c.id));

    const selecionarPagina = (on: boolean) =>
        setSelecao((s) => {
            const p = new Set(s);
            daPagina.forEach((id) => (on ? p.add(id) : p.delete(id)));
            return p;
        });

    const alternarSelecao = (id: string, on: boolean) =>
        setSelecao((s) => {
            const p = new Set(s);
            on ? p.add(id) : p.delete(id);
            return p;
        });

    const copiarLink = async (c: Cupom) => {
        try {
            await navigator.clipboard.writeText(`${location.origin}/e/${evento.slug}?cupom=${c.codigo}`);
            setCopiado(c.id);
            setTimeout(() => setCopiado((v) => (v === c.id ? null : v)), 2000);
        } catch {
            toast.error(T.erroCopiar);
        }
    };

    /** CSV dos cupons do filtro (antes, prometia um e-mail que não existe; CUP-64). */
    const exportar = () => {
        const linhas = [["Cupom", "Status", "Desconto", "Itens vendidos", "Limite por itens", "Vínculos"], ...filtrados.map((c) => [c.codigo, c.ativo ? T.ativo : T.inativo, formatarDesconto(c, preco), String(c.usos), c.limiteItens ? String(c.limiteItens) : T.ilimitado, String(c.vinculos.length)])];
        const csv = linhas.map((l) => l.map((x) => `"${x.replace(/"/g, '""')}"`).join(",")).join("\n");
        const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `cupons-${evento.slug}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // O toggle (e Ativar/Desativar da linha) grava na hora, com aviso e Desfazer, como na Passkey (CUP-61).
    const alternarStatus = async (c: Cupom, ativo: boolean, desfazendo = false) => {
        try {
            await salvarCupons(evento, (evento.cupons ?? []).map((x) => (x.id === c.id ? { ...x, ativo } : x)));
            toast.success((ativo ? T.ativado : T.desativado).replace("{c}", c.codigo), desfazendo ? undefined : { action: { label: T.desfazer, onClick: () => void alternarStatus(c, !ativo, true) } });
        } catch {
            toast.error(T.erroStatus);
        }
    };
    const todosDoFiltro = filtrados.length > daPagina.length && todosNaPagina && selecao.size < filtrados.length;

    const pedir = (acao: Acao, ids: string[]) => {
        // Cupom já usado não é excluído (CUP-22): no lote, avisa em vez de confirmar.
        if (acao === "excluir" && cupons.some((c) => ids.includes(c.id) && c.usos > 0)) return setAviso(true);
        setConfirmacao({ acao, ids });
    };

    const confirmar = async () => {
        if (!confirmacao) return;
        const { acao, ids } = confirmacao;
        const sel = new Set(ids);
        const prox =
            acao === "excluir"
                ? cupons.filter((c) => !sel.has(c.id))
                : cupons.map((c) => (!sel.has(c.id) ? c : acao === "desvincular" ? { ...c, vinculos: [] } : { ...c, ativo: acao === "ativar" }));
        setGravando(true);
        try {
            await salvarCupons(evento, prox);
            setConfirmacao(null);
            if (acao === "excluir") setSelecao(new Set());
        } catch {
            toast.error(acao === "excluir" ? T.erroExcluir : acao === "desvincular" ? T.erroDesvincular : T.erroStatus);
        } finally {
            setGravando(false);
        }
    };

    // Ao fechar, o modal anima a saída com o último texto, sem esvaziar.
    const ultima = useRef(confirmacao);
    if (confirmacao) ultima.current = confirmacao;
    const exibida = confirmacao ?? ultima.current;
    const conf = exibida && CONFIRMACOES[exibida.acao];
    const [tituloConf, textoConf] = conf ? (exibida!.ids.length > 1 ? conf.varios : conf.um) : ["", ""];

    const painelAberto = painel && <PainelDeCupons painel={painel} evento={evento} onFechar={() => setPainel(null)} />;

    // O painel fica fora da troca vazio ↔ lista: criar o primeiro cupom não pode reiniciar os passos.
    const vazio = cupons.length === 0 && (
        <>
            <CabecalhoDaFuncionalidade titulo={T.titulo} />
            <VazioDaTabela
                icone={Ticket01}
                titulo={T.vazioTitulo}
                texto={T.vazioTexto}
                acao={
                    <Button color="primary" size="md" iconLeading={Plus} onClick={() => setPainel({ tipo: "criar" })}>
                        {T.novo}
                    </Button>
                }
            />
        </>
    );

    return (
        <>
            {vazio || (
                <>
                    {/* Criar fica no cabeçalho, como nas outras listas (BKS-104, CUP-62). */}
                    <CabecalhoDaFuncionalidade
                        titulo={T.titulo}
                        acao={
                            <>
                                <Button color="primary" size="md" iconLeading={Plus} onClick={() => setPainel({ tipo: "criar" })}>
                                    {T.novo}
                                </Button>
                                <Button color="secondary" size="md" iconLeading={Download01} onClick={exportar}>
                                    {T.exportar}
                                </Button>
                            </>
                        }
                    />

                    <div className="flex flex-col gap-4">
                        {/* Busca à esquerda e status à direita, em botões segmentados (BKS-111). */}
                        <BarraDaLista
                            busca={{ valor: busca, onChange: setBusca, placeholder: T.buscar }}
                            filtro={
                                <ButtonGroup
                                    size="sm"
                                    aria-label={T.filtro}
                                    selectedKeys={new Set([filtro])}
                                    onSelectionChange={(k) => setFiltro(([...k][0] as typeof filtro) ?? "todos")}
                                    disallowEmptySelection
                                >
                                    <ButtonGroupItem id="todos">{T.todos}</ButtonGroupItem>
                                    <ButtonGroupItem id="ativos">{T.ativos}</ButtonGroupItem>
                                    <ButtonGroupItem id="inativos">{T.inativos}</ButtonGroupItem>
                                </ButtonGroup>
                            }
                        />

                        <CartaoDaTabela>
                            {/* Barra de ações em lote, dentro do cartão, a mesma da Passkey (CUP-65). */}
                            <Surgir visivel={selecionados.length > 0}>
                                <div role="toolbar" aria-label={T.lote} className="flex flex-wrap items-center gap-2 border-b border-secondary bg-secondary_subtle px-5 py-3 md:px-6">
                                    <span className="mr-auto text-sm font-semibold text-primary">
                                        {selecionados.length === 1 ? T.umSelecionado : T.selecionados.replace("{n}", numero(selecionados.length))}
                                        {todosDoFiltro && (
                                            <Button color="link-color" size="sm" className="ml-2" onClick={() => setSelecao(new Set(filtrados.map((c) => c.id)))}>
                                                {T.selecionarTodos.replace("{n}", numero(filtrados.length))}
                                            </Button>
                                        )}
                                    </span>
                                    {selecionados.some((c) => !c.ativo) && (
                                        <Button color="secondary" size="sm" onClick={() => pedir("ativar", selecionados.map((c) => c.id))}>
                                            {T.ativar}
                                        </Button>
                                    )}
                                    {selecionados.some((c) => c.ativo) && (
                                        <Button color="secondary" size="sm" onClick={() => pedir("desativar", selecionados.map((c) => c.id))}>
                                            {T.desativar}
                                        </Button>
                                    )}
                                    <Button color="secondary" size="sm" onClick={() => setPainel({ tipo: "vinculos", ids: selecionados.map((c) => c.id), modo: "adicionar" })}>
                                        {T.novasAssociacoes}
                                    </Button>
                                    <Button color="secondary" size="sm" onClick={() => pedir("desvincular", selecionados.map((c) => c.id))}>
                                        {T.desvincular}
                                    </Button>
                                    <Button color="secondary-destructive" size="sm" isDisabled={selecionados.some((c) => c.usos > 0)} onClick={() => pedir("excluir", selecionados.map((c) => c.id))}>
                                        {T.excluir}
                                    </Button>
                                    <ButtonUtility icon={XClose} color="tertiary" size="sm" tooltip={T.limpar} onClick={() => setSelecao(new Set())} />
                                </div>
                            </Surgir>
                            {/* O cabeçalho fica também no cartão estreito, por causa do "selecionar a página"; lá as colunas saem e cada linha leva os rótulos (UI-MOB-005). */}
                            <CabecalhoDaTabela ordenavel className="flex">
                                {/* Marca ou desmarca só a página atual, como em produção. */}
                                <Checkbox
                                    size="sm"
                                    aria-label="Selecionar os cupons da página"
                                    isSelected={todosNaPagina}
                                    isIndeterminate={algunsNaPagina}
                                    onChange={selecionarPagina}
                                />
                                <span aria-hidden="true" className="min-w-0 flex-1">
                                    <span className="@min-[44rem]:hidden">Selecionar a página</span>
                                    <span className="hidden @min-[44rem]:inline">{T.colCupom}</span>
                                </span>
                                <span aria-hidden="true" className="hidden w-28 @min-[44rem]:block">
                                    {T.colStatus}
                                </span>
                                <span aria-hidden="true" className="hidden w-24 text-right @min-[44rem]:block">
                                    {T.colDesconto}
                                </span>
                                <span aria-hidden="true" className="hidden w-36 text-right @min-[44rem]:block">
                                    {T.colVendidos}
                                </span>
                                <span aria-hidden="true" className="hidden w-17 @min-[44rem]:block" />
                            </CabecalhoDaTabela>
                            {filtrados.length === 0 ? (
                                <SemResultados texto={T.nenhum} onLimpar={limpar} />
                            ) : (
                                <ul className="flex flex-col divide-y divide-secondary">
                                    {paginacao.visiveis.map((c) => (
                                        <LinhaDaTabela key={c.id} selecionada={selecao.has(c.id)}>
                                            <Checkbox
                                                size="sm"
                                                aria-label={`Selecionar ${c.codigo}`}
                                                isSelected={selecao.has(c.id)}
                                                onChange={(on) => alternarSelecao(c.id, on)}
                                                className="mt-0.5 @min-[44rem]:mt-0"
                                            />
                                            <div className="flex min-w-0 flex-1 flex-col gap-3 @min-[44rem]:flex-row @min-[44rem]:items-center @min-[44rem]:gap-4">
                                                <TituloDaLinha titulo={<span className="font-mono">{c.codigo}</span>} apoio={contagem(c.vinculos.length)} />
                                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 @min-[44rem]:contents">
                                                    <div className="flex items-center gap-2 text-sm @min-[44rem]:w-28">
                                                        <Toggle size="sm" aria-label={`Cupom ${c.codigo} ativo`} isSelected={c.ativo} onChange={(on) => void alternarStatus(c, on)} />
                                                        <span className="text-secondary">{c.ativo ? T.ativo : T.inativo}</span>
                                                    </div>
                                                    <Celula rotulo={T.colDesconto} numero className="font-medium @min-[44rem]:w-24">
                                                        {formatarDesconto(c, preco)}
                                                    </Celula>
                                                    <Celula rotulo={T.colVendidos} numero className="@min-[44rem]:w-36">
                                                        {T.vendidos.replace("{usados}", numero(c.usos)).replace("{total}", c.limiteItens ? numero(c.limiteItens) : T.ilimitado)}
                                                    </Celula>
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 gap-1 @min-[44rem]:w-17 @min-[44rem]:justify-end">
                                                <ButtonUtility
                                                    icon={copiado === c.id ? Check : Copy01}
                                                    color="tertiary"
                                                    size="sm"
                                                    tooltip={copiado === c.id ? T.copiado : T.copiar}
                                                    onClick={() => void copiarLink(c)}
                                                />
                                                <Dropdown.Root>
                                                    <ButtonUtility icon={DotsVertical} color="tertiary" size="sm" tooltip={T.maisOpcoes} />
                                                    <Dropdown.Popover className="w-56" placement="bottom end">
                                                        <Dropdown.Menu
                                                            aria-label={T.maisOpcoes}
                                                            disabledKeys={c.usos > 0 ? ["excluir"] : []}
                                                            onAction={(k) => {
                                                                if (k === "editar") setPainel({ tipo: "regras", id: c.id });
                                                                else if (k === "vinculos")
                                                                    setPainel({
                                                                        tipo: "vinculos",
                                                                        ids: [c.id],
                                                                        modo: "substituir",
                                                                    });
                                                                else if (k === "ativar" || k === "desativar") void alternarStatus(c, k === "ativar");
                                                                else pedir(k as Acao, [c.id]);
                                                            }}
                                                        >
                                                            <Dropdown.Item id="editar" icon={Edit01} label={T.editar} />
                                                            <Dropdown.Item id="vinculos" icon={Ticket01} label={T.editarVinculos} />
                                                            <Dropdown.Item id="desvincular" icon={LinkBroken02} label={T.desvincular} />
                                                            <Dropdown.Item id={c.ativo ? "desativar" : "ativar"} label={c.ativo ? T.desativar : T.ativar} />
                                                            <Dropdown.Separator />
                                                            <Dropdown.Item id="excluir" icon={Trash01} label={c.usos > 0 ? T.naoExclui : T.excluir} />
                                                        </Dropdown.Menu>
                                                    </Dropdown.Popover>
                                                </Dropdown.Root>
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

            {painelAberto}

            <ModalDeConfirmacao
                aberto={!!confirmacao}
                titulo={tituloConf}
                descricao={textoConf}
                confirmar={conf?.botao ?? ""}
                destrutiva={conf?.destrutiva}
                icone={exibida?.acao === "excluir" ? Trash01 : exibida?.acao === "desvincular" ? LinkBroken02 : undefined}
                carregando={gravando}
                onConfirmar={() => void confirmar()}
                onFechar={() => setConfirmacao(null)}
            />
            <ModalDeConfirmacao
                aberto={aviso}
                titulo="Não foi possível excluir alguns cupons"
                descricao="Cupons que já foram utilizados não podem ser excluídos. Para que ele deixe de ter efeito, desative ou desvincule os itens deste cupom."
                confirmar="Entendi"
                onFechar={() => setAviso(false)}
            />
        </>
    );
}
