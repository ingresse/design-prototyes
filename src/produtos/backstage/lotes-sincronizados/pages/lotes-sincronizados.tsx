import { Fragment, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, Edit01, InfoCircle, Link01, Plus, Trash01 } from "@untitledui/icons";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { InputBase } from "@/components/base/input/input";
import { Tooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import { Surgir } from "@/components/foundations/transicao";
import type { ConjuntoSincronizado, Evento } from "@/plataforma";
import { cx } from "@/utils/cx";
import { BackstageLayout } from "../../components/Backstage";
import { CabecalhoDaFuncionalidade } from "../../components/cabecalho-da-funcionalidade";
import { ModalDeConfirmacao } from "../../components/modal-de-confirmacao";
import { RodapeDePaginacao, usePaginacao } from "../../components/rodape-de-paginacao";
import { CabecalhoDaTabela, CarregandoTabela, CartaoDaTabela, Celula, LinhaDaTabela, TituloDaLinha, VazioDaTabela } from "../../components/tabela";
import { useCatalogo } from "../../itens/data/catalogo";
import { estadoDoConjunto, LIMITE_DO_NOME, salvarConjuntos, type EstadoDoConjunto, type Virada } from "../data/conjuntos";

/*
 * Lotes sincronizados (lotes-sincronizados/rules.md): o gêmeo de `sync-rotation-groups` de produção.
 * Lista do Backstage (BKS-110 a BKS-118): uma linha por conjunto no cartão da tabela; aberta, mostra as
 * viradas (a mesma tabela, que vira blocos no estreito), o gatilho de cada uma (editável) e o progresso.
 */

export const ROTA_LOTES_SINCRONIZADOS = "/backstage/vendas/lotes-sincronizados";

const T = {
    titulo: "Lotes sincronizados",
    subtitulo: "Ingressos que viram de lote juntos, pela soma das vendas.",
    criar: "Criar novo conjunto",
    semItensTitulo: "Antes de configurar lotes sincronizados, crie alguns itens",
    semItensTexto: "Para configurar estratégia de lote sincronizado, é necessário ter itens cadastrados no evento. Crie seus itens para começar.",
    irItens: "Ir para criação de itens",
    vazioTitulo: "Sincronize lotes entre múltiplos itens",
    vazioTexto: "Gerencie a abertura e encerramento de lotes de forma conjunta entre diferentes itens do evento.",
    criarPrimeiro: "Criar conjunto de lote sincronizado",
    itensSincronizados: "Itens sincronizados",
    viradaAtual: "Virada atual",
    nota: "A quantidade de viradas é baseada no item com mais lotes",
    colConjunto: "Conjunto",
    editarNome: "Editar nome",
    excluir: "Excluir conjunto",
    expandir: "Expandir conjunto",
    recolher: "Recolher conjunto",
    nomeDoConjunto: "Nome do conjunto",
    erroNome: "Informe um nome",
    colViradas: "Viradas",
    colStatus: "Status",
    colGatilho: "Disparar virada após",
    colGatilhoDica: "Total de vendas que encerra esta virada e abre a próxima.",
    colProgresso: "Progresso da virada",
    colProgressoDica: "Soma de itens aprovados e pendentes em relação ao gatilho da virada.",
    virada: "Virada {n}",
    itensNaVirada: "{n} itens sincronizados",
    concluida: "Concluído",
    ativa: "Ativo",
    aguardando: "Aguardando",
    definir: "Definir",
    definirGatilho: "Definir gatilho de virada",
    gatilho: "Gatilho da virada",
    metaAtingida: "meta atingida",
    erroGatilho: "Informe um número inteiro maior que zero.",
    gatilhoSalvo: "Gatilho da virada atualizado",
    disparada: "Virada disparada imediatamente",
    erroSalvar: "Falha ao atualizar o gatilho",
    banner: "Novos lotes foram adicionados aos itens deste conjunto.",
    bannerAcao: "Defina o gatilho das viradas para manter a sincronização atualizada.",
    colItens: "Itens",
    colAvanco: "Avanço",
    ingresso: "Ingresso",
    grupo: "Grupo: {g}",
    avanca: "Avança na próxima virada",
    avancou: "Avançou nesta virada",
    aguardandoProxima: "Aguardando próxima virada",
    semProximo: "Sem próximo lote",
    inativo: "Item inativo",
    lote: "Lote {n}",
    deLotePara: "Lote {de} para lote {para}",
    excluirTitulo: "Excluir conjunto",
    excluirTexto: "Excluir o conjunto {nome} é irreversível. Os itens voltarão a vender individualmente.",
    excluirJaVirou: { one: " Este conjunto já executou 1 virada. O histórico é preservado, mas cada item fica no lote atual.", other: " Este conjunto já executou {n} viradas. O histórico é preservado, mas cada item fica no lote atual." },
    excluirConfirmar: "Excluir",
    cancelar: "Cancelar",
    excluido: "Conjunto excluído com sucesso",
    erroExcluir: "Não foi possível excluir o conjunto",
    nomeSalvo: "Nome do conjunto atualizado",
};

const f = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

export function LotesSincronizados() {
    const { evento, carregando } = useCatalogo();
    return (
        <BackstageLayout activeSection="itens" activeItem="lotes-sincronizados">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
                {carregando || !evento ? (
                    <>
                        <CabecalhoDaFuncionalidade titulo={T.titulo} subtitulo={T.subtitulo} />
                        <CarregandoTabela />
                    </>
                ) : (
                    <Conteudo evento={evento} />
                )}
            </div>
        </BackstageLayout>
    );
}

function Conteudo({ evento }: { evento: Evento }) {
    const { vendidos, pendentes } = useCatalogo();
    const conjuntos = evento.conjuntosSincronizados ?? [];
    const temItens = evento.sessoes.some((s) => s.grupos.some((g) => g.ingressos.length > 0));
    const [excluindo, setExcluindo] = useState<EstadoDoConjunto | null>(null);
    const [gravando, setGravando] = useState(false);
    const estados = useMemo(() => conjuntos.map((c) => estadoDoConjunto(c, evento, vendidos, pendentes)), [conjuntos, evento, vendidos, pendentes]);
    const paginacao = usePaginacao(estados);
    const ultimo = useRef(excluindo);
    if (excluindo) ultimo.current = excluindo;
    const mostrado = excluindo ?? ultimo.current;

    const atualizar = (c: ConjuntoSincronizado) => salvarConjuntos(evento, conjuntos.map((x) => (x.id === c.id ? c : x)));

    const excluir = async () => {
        if (!excluindo) return;
        setGravando(true);
        try {
            await salvarConjuntos(evento, conjuntos.filter((c) => c.id !== excluindo.conjunto.id));
            toast.success(T.excluido);
            setExcluindo(null);
        } catch {
            toast.error(T.erroExcluir);
        } finally {
            setGravando(false);
        }
    };

    const novo = `${ROTA_LOTES_SINCRONIZADOS}/novo`;

    return (
        <>
            <CabecalhoDaFuncionalidade
               
                titulo={T.titulo}
                subtitulo={T.subtitulo}
                acao={
                    conjuntos.length > 0 && (
                        <Button color="primary" size="md" iconLeading={Plus} href={novo}>
                            {T.criar}
                        </Button>
                    )
                }
            />
            {!temItens || conjuntos.length === 0 ? (
                <VazioDaTabela
                    icone={Link01}
                    titulo={temItens ? T.vazioTitulo : T.semItensTitulo}
                    texto={temItens ? T.vazioTexto : T.semItensTexto}
                    acao={
                        <Button color="primary" size="md" iconLeading={temItens ? Plus : undefined} href={temItens ? novo : "/backstage/catalogo/ingressos"}>
                            {temItens ? T.criarPrimeiro : T.irItens}
                        </Button>
                    }
                />
            ) : (
                <div className="flex flex-col gap-2">
                    <CartaoDaTabela>
                        <CabecalhoDaTabela>
                            <span className="min-w-0 flex-1">{T.colConjunto}</span>
                            <span className="w-36 text-right">{T.itensSincronizados}</span>
                            <span className="w-32 text-right">{T.viradaAtual}</span>
                            <span className="w-28" />
                        </CabecalhoDaTabela>
                        <ul className="flex flex-col divide-y divide-secondary">
                            {paginacao.visiveis.map((e) => (
                                <LinhaDoConjunto key={e.conjunto.id} estado={e} onAtualizar={atualizar} onExcluir={() => setExcluindo(e)} />
                            ))}
                        </ul>
                        <RodapeDePaginacao {...paginacao} />
                    </CartaoDaTabela>
                    <p className="text-sm text-tertiary">{T.nota}</p>
                </div>
            )}
            <ModalDeConfirmacao
                aberto={!!excluindo}
                titulo={T.excluirTitulo}
                descricao={mostrado ? f(T.excluirTexto, { nome: mostrado.conjunto.nome }) + (mostrado.executadas > 0 ? f(mostrado.executadas === 1 ? T.excluirJaVirou.one : T.excluirJaVirou.other, { n: mostrado.executadas }) : "") : ""}
                confirmar={T.excluirConfirmar}
                cancelar={T.cancelar}
                destrutiva
                icone={Trash01}
                carregando={gravando}
                onConfirmar={() => void excluir()}
                onFechar={() => setExcluindo(null)}
            />
        </>
    );
}

function LinhaDoConjunto({ estado, onAtualizar, onExcluir }: { estado: EstadoDoConjunto; onAtualizar: (c: ConjuntoSincronizado) => Promise<unknown>; onExcluir: () => void }) {
    const { conjunto, viradas, executadas, atual } = estado;
    const [aberto, setAberto] = useState(false);
    const [editando, setEditando] = useState(false);
    const [nome, setNome] = useState(conjunto.nome);
    const [salvo, setSalvo] = useState(false);
    const [viradasAbertas, setViradasAbertas] = useState<Set<number>>(new Set());
    const n = nome.trim();
    const erroNome = !n ? T.erroNome : n.length > LIMITE_DO_NOME ? `Máximo de ${LIMITE_DO_NOME} caracteres` : undefined;

    const salvarNome = async () => {
        if (erroNome) return;
        if (n === conjunto.nome) return setEditando(false);
        await onAtualizar({ ...conjunto, nome: n });
        setEditando(false);
        setSalvo(true);
        setTimeout(() => setSalvo(false), 2000);
    };

    const salvarGatilho = async (numero: number, valor: number) => {
        const virada = viradas.find((v) => v.numero === numero);
        try {
            await onAtualizar({ ...conjunto, gatilhos: { ...conjunto.gatilhos, [numero]: valor } });
            // Já passou do novo gatilho: a virada roda na hora (ING-411).
            toast.success(virada && virada.status !== "concluida" && virada.vendidos >= valor && atual?.numero === numero ? T.disparada : T.gatilhoSalvo);
        } catch {
            toast.error(T.erroSalvar);
        }
    };

    const alternarVirada = (n: number) =>
        setViradasAbertas((s) => {
            const p = new Set(s);
            p.has(n) ? p.delete(n) : p.add(n);
            return p;
        });

    const primeiraSemGatilho = viradas.find((v) => v.gatilho == null && v.numero > executadas + 1)?.numero;

    return (
        // A linha do conjunto (BKS-113); aberta, as viradas ficam embaixo, dentro da mesma linha.
        <LinhaDaTabela className="flex-col items-stretch gap-0 @min-[44rem]:items-stretch">
            <div className="relative flex items-start gap-4 @min-[44rem]:items-center">
                <div className="flex min-w-0 flex-1 flex-col gap-2 @min-[44rem]:flex-row @min-[44rem]:items-center @min-[44rem]:gap-4">
                    {editando ? (
                        <div className="relative z-10 min-w-0 flex-1">
                            <InputBase
                                aria-label={T.nomeDoConjunto}
                                autoFocus
                                size="sm"
                                maxLength={LIMITE_DO_NOME}
                                value={nome}
                                onChange={(v: unknown) => setNome(typeof v === "string" ? v : ((v as { target?: { value?: string } })?.target?.value ?? ""))}
                                onKeyDown={(e: KeyboardEvent) => {
                                    if (e.key === "Enter") void salvarNome();
                                    if (e.key === "Escape") (setNome(conjunto.nome), setEditando(false));
                                }}
                                onBlur={() => void salvarNome()}
                                isInvalid={!!erroNome}
                            />
                            {erroNome && <p className="mt-1 text-sm text-error-primary">{erroNome}</p>}
                        </div>
                    ) : (
                        <TituloDaLinha
                            titulo={
                                // O nome abre e fecha o conjunto e cobre a linha (sem as ações).
                                <button
                                    type="button"
                                    aria-expanded={aberto}
                                    onClick={() => setAberto((v) => !v)}
                                    className="inline-flex max-w-full cursor-pointer items-center gap-2 text-left outline-focus-ring after:absolute after:inset-0 focus-visible:outline-2"
                                >
                                    <span className="truncate">{conjunto.nome}</span>
                                    {salvo && <Check className="size-4 shrink-0 text-fg-success-primary" aria-label={T.nomeSalvo} />}
                                </button>
                            }
                        />
                    )}
                    <Celula rotulo={T.itensSincronizados} numero className="@min-[44rem]:w-36">
                        {estado.itens.length.toLocaleString("pt-BR")}
                    </Celula>
                    <Celula rotulo={T.viradaAtual} numero className="@min-[44rem]:w-32">
                        {`${atual?.numero ?? executadas} de ${viradas.length}`}
                    </Celula>
                </div>
                <div className="relative z-10 flex shrink-0 gap-1 @min-[44rem]:w-28 @min-[44rem]:justify-end">
                    <ButtonUtility icon={Edit01} color="tertiary" size="sm" tooltip={T.editarNome} onClick={() => setEditando(true)} />
                    <ButtonUtility icon={Trash01} color="tertiary" size="sm" tooltip={T.excluir} onClick={onExcluir} />
                    <ButtonUtility icon={ChevronDown} color="tertiary" size="sm" tooltip={aberto ? T.recolher : T.expandir} onClick={() => setAberto((v) => !v)} className={cx("transition-transform duration-200", aberto && "rotate-180")} />
                </div>
            </div>

            <Surgir visivel={aberto}>
                <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-secondary">
                    {/* Com dicas no cabeçalho: fica acessível (as dicas são botões). */}
                    <CabecalhoDaTabela ordenavel>
                        <span className="min-w-0 flex-1">{T.colViradas}</span>
                        <span className="w-32">{T.colStatus}</span>
                        <span className="flex w-44 items-center gap-1">
                            {T.colGatilho}
                            <Dica texto={T.colGatilhoDica} />
                        </span>
                        <span className="flex w-52 items-center gap-1">
                            {T.colProgresso}
                            <Dica texto={T.colProgressoDica} />
                        </span>
                    </CabecalhoDaTabela>
                    <ul className="flex flex-col divide-y divide-secondary">
                        {viradas.map((v) => (
                            <Fragment key={v.numero}>
                                {v.numero === primeiraSemGatilho && (
                                    <li role="note" className="flex items-start gap-2 bg-warning-primary px-5 py-3 text-sm text-warning-primary md:px-6">
                                        <InfoCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                        <span>
                                            {T.banner} <strong className="font-semibold">{T.bannerAcao}</strong>
                                        </span>
                                    </li>
                                )}
                                <LinhaDaVirada virada={v} aberta={viradasAbertas.has(v.numero)} onAlternar={() => alternarVirada(v.numero)} onGatilho={(valor) => void salvarGatilho(v.numero, valor)} />
                            </Fragment>
                        ))}
                    </ul>
                </div>
            </Surgir>
        </LinhaDaTabela>
    );
}

const Dica = ({ texto }: { texto: string }) => (
    <Tooltip title={texto}>
        <TooltipTrigger className="cursor-help text-fg-quaternary">
            <InfoCircle className="size-4" aria-hidden="true" />
        </TooltipTrigger>
    </Tooltip>
);

const STATUS = {
    concluida: { rotulo: T.concluida, cor: "gray" as const },
    ativa: { rotulo: T.ativa, cor: "error" as const },
    aguardando: { rotulo: T.aguardando, cor: "gray" as const },
};

function LinhaDaVirada({ virada: v, aberta, onAlternar, onGatilho }: { virada: Virada; aberta: boolean; onAlternar: () => void; onGatilho: (valor: number) => void }) {
    const s = STATUS[v.status];
    const meta = v.gatilho ?? 0;
    const pct = meta ? Math.min(100, (v.vendidos / meta) * 100) : 0;
    const pctPend = meta ? Math.min(pct, (v.pendentes / meta) * 100) : 0;
    return (
        <LinhaDaTabela className="flex-col items-stretch gap-0 @min-[44rem]:items-stretch">
            <div className="relative flex min-w-0 flex-col gap-2 @min-[44rem]:flex-row @min-[44rem]:items-center @min-[44rem]:gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-2 @min-[44rem]:items-center">
                    <ChevronDown className={cx("mt-0.5 size-4 shrink-0 text-fg-quaternary transition-transform duration-200 @min-[44rem]:mt-0", !aberta && "-rotate-90")} aria-hidden="true" />
                    <TituloDaLinha
                        titulo={
                            <button type="button" aria-expanded={aberta} onClick={onAlternar} className="max-w-full cursor-pointer truncate text-left outline-focus-ring after:absolute after:inset-0 focus-visible:outline-2">
                                {f(T.virada, { n: v.numero })}
                            </button>
                        }
                        apoio={f(T.itensNaVirada, { n: v.itens.length })}
                    />
                </div>
                <Celula rotulo={T.colStatus} className="items-center @min-[44rem]:w-32">
                    {v.status === "concluida" ? (
                        <Badge type="pill-color" color="gray" size="sm">
                            <Check className="mr-1 size-3" aria-hidden="true" />
                            {s.rotulo}
                        </Badge>
                    ) : (
                        <BadgeWithDot type="pill-color" color={s.cor} size="sm">
                            {s.rotulo}
                        </BadgeWithDot>
                    )}
                </Celula>
                {/* Por cima do botão que cobre a linha: o gatilho se edita aqui. */}
                <Celula rotulo={T.colGatilho} className="relative z-10 items-center @min-[44rem]:w-44">
                    <Gatilho virada={v} onSalvar={onGatilho} />
                </Celula>
                <Celula rotulo={T.colProgresso} className="items-center @min-[44rem]:w-52">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-quaternary" role="img" aria-label={`${v.vendidos} de ${v.gatilho ?? "—"}`}>
                            <span className="absolute inset-y-0 left-0 bg-fg-success-secondary" style={{ width: `${pct}%` }} />
                            <span className="absolute inset-y-0 left-0 bg-fg-warning-secondary" style={{ width: `${pctPend}%` }} />
                        </div>
                        <span className="text-sm text-tertiary tabular-nums">{`${v.vendidos.toLocaleString("pt-BR")}/${v.gatilho != null ? v.gatilho.toLocaleString("pt-BR") : "—"}`}</span>
                    </div>
                </Celula>
            </div>
            <Surgir visivel={aberta}>
                <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-secondary">
                    <div aria-hidden="true" className="hidden gap-4 bg-secondary_subtle px-4 py-2 text-sm font-medium text-tertiary @min-[44rem]:flex">
                        <span className="min-w-0 flex-1">{T.colItens}</span>
                        <span className="w-48">{T.colAvanco}</span>
                    </div>
                    <ul className="flex flex-col divide-y divide-secondary">
                        {v.itens.map((it) => (
                            <li key={it.ingressoId} className="flex flex-col gap-2 px-4 py-3 @min-[44rem]:flex-row @min-[44rem]:items-center @min-[44rem]:gap-4">
                                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                                    <span className="truncate text-sm font-medium text-primary" title={it.nome}>
                                        {it.nome}
                                    </span>
                                    <Badge type="modern" color="gray" size="sm">
                                        {T.ingresso}
                                    </Badge>
                                    {/* O grupo vai na linha de apoio, sem separador (UI-TXT-010). */}
                                    <span className="w-full text-sm text-tertiary">{f(T.grupo, { g: it.grupo })}</span>
                                </div>
                                <Celula rotulo={T.colAvanco} className="items-center @min-[44rem]:w-48">
                                    {!it.ativo ? (
                                        <BadgeWithDot type="pill-color" color="error" size="sm">
                                            {T.inativo}
                                        </BadgeWithDot>
                                    ) : it.para == null ? (
                                        <Badge type="pill-color" color="gray" size="sm">
                                            {T.semProximo}
                                        </Badge>
                                    ) : v.status === "aguardando" ? (
                                        <BadgeWithDot type="pill-color" color="warning" size="sm">
                                            {T.aguardandoProxima}
                                        </BadgeWithDot>
                                    ) : (
                                        <span className="flex flex-col">
                                            <span className="text-tertiary">{v.status === "concluida" ? T.avancou : T.avanca}</span>
                                            <span className="font-medium text-primary">{f(T.deLotePara, { de: it.de, para: it.para })}</span>
                                        </span>
                                    )}
                                </Celula>
                            </li>
                        ))}
                    </ul>
                </div>
            </Surgir>
        </LinhaDaTabela>
    );
}

/** Gatilho editável na própria linha: Enter ou sair do campo salva, Esc cancela; virada concluída só mostra. */
function Gatilho({ virada: v, onSalvar }: { virada: Virada; onSalvar: (valor: number) => void }) {
    const [editando, setEditando] = useState(false);
    const [texto, setTexto] = useState(v.gatilho != null ? String(v.gatilho) : "");
    const [erro, setErro] = useState<string>();
    const concluida = v.status === "concluida";

    const salvar = () => {
        const n = Number(texto);
        if (!Number.isInteger(n) || n <= 0) return setErro(T.erroGatilho);
        setErro(undefined);
        setEditando(false);
        if (n !== v.gatilho) onSalvar(n);
    };

    if (editando)
        return (
            <div className="flex flex-col gap-1">
                <InputBase
                    aria-label={T.gatilho}
                    autoFocus
                    size="sm"
                    inputMode="numeric"
                    value={texto}
                    onChange={(x: unknown) => setTexto(String(typeof x === "string" ? x : ((x as { target?: { value?: string } })?.target?.value ?? "")).replace(/\D/g, "").slice(0, 7))}
                    onKeyDown={(e: KeyboardEvent) => {
                        if (e.key === "Enter") salvar();
                        if (e.key === "Escape") (setEditando(false), setErro(undefined), setTexto(v.gatilho != null ? String(v.gatilho) : ""));
                    }}
                    onBlur={salvar}
                    isInvalid={!!erro}
                />
                {erro && <span className="text-sm text-error-primary">{erro}</span>}
            </div>
        );

    return (
        <div className="flex flex-col">
            <div className="flex items-center gap-1">
                {v.gatilho != null ? (
                    <span className="text-sm font-medium text-primary tabular-nums">{v.gatilho.toLocaleString("pt-BR")}</span>
                ) : (
                    <Button color="link-color" size="sm" onClick={() => setEditando(true)} isDisabled={concluida}>
                        {T.definir}
                    </Button>
                )}
                {/* Sem gatilho, só "Definir"; o lápis aparece quando já há valor (LSI-37). */}
                {!concluida && v.gatilho != null && <ButtonUtility icon={Edit01} color="tertiary" size="xs" tooltip={T.definirGatilho} onClick={() => setEditando(true)} />}
            </div>
            {concluida && <span className="text-sm text-tertiary">{T.metaAtingida}</span>}
        </div>
    );
}
