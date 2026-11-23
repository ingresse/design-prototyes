import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import type { Key } from "react-aria-components";
import { ChevronDown, Edit01, Lock01, Plus, Trash01 } from "@untitledui/icons";
import { toast } from "sonner";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Select } from "@/components/base/select/select";
import { Tooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import { Tabs } from "@/components/application/tabs/tabs";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { BackstageLayout } from "../../components/Backstage";
import { CabecalhoDaPagina } from "../../components/cabecalho-da-pagina";
import { CriarGrupoModal } from "../../components/CriarGrupoModal";
import { CriarMembroModal } from "../../components/CriarMembroModal";
import { BarraDaLista, CabecalhoDaTabela, CarregandoTabela, CartaoDaTabela, Celula, LinhaDaTabela, SemResultados, TituloDaLinha } from "../../components/tabela";
import { RodapeDePaginacao, usePaginacao } from "../../components/rodape-de-paginacao";
import {
    adicionarAosMembros,
    cargoById,
    eventoById,
    eventosDoMembro,
    isCargoSistema,
    removeCargo,
    removeGrupos,
    removeMembros,
    useCargos,
    useGrupos,
    useMembros,
    useMembrosCarregando,
    type Cargo,
    type Grupo,
    type Membro,
} from "../../components/membros-store";

type TabKey = "membros" | "grupos" | "cargos";

const ABAS: TabKey[] = ["membros", "grupos", "cargos"];
/** A aba fica na URL (`?aba=grupos`): voltar do navegador e de Criar cargo caem nela (MEM-78). */
export const rotaDaAba = (aba: TabKey) => (aba === "membros" ? "/backstage/membros" : `/backstage/membros?aba=${aba}`);

const TODOS = "todos";

const PLACEHOLDERS: Record<TabKey, string> = {
    membros: "Busque por e-mail",
    grupos: "Busque por grupo ou evento",
    cargos: "Busque por cargo",
};

export function Membros() {
    const navigate = useNavigate();
    const membros = useMembros();
    const grupos = useGrupos();
    const cargos = useCargos();
    // Membros, grupos e cargos da organização em contexto, gravados nela (MEM-45).
    const carregando = useMembrosCarregando();
    const [params, setParams] = useSearchParams();
    const abaDaUrl = params.get("aba") as TabKey | null;
    const tab: TabKey = abaDaUrl && ABAS.includes(abaDaUrl) ? abaDaUrl : "membros";
    const [busca, setBusca] = useState("");
    // Filtros da aba Membros (MEM-79).
    const [filtroCargo, setFiltroCargo] = useState(TODOS);
    const [filtroGrupo, setFiltroGrupo] = useState(TODOS);
    const [grupoEditando, setGrupoEditando] = useState<Grupo | null>(null);
    const [membroModalOpen, setMembroModalOpen] = useState(false);
    const [grupoModalOpen, setGrupoModalOpen] = useState(false);
    const [selMembros, setSelMembros] = useState<Set<string>>(new Set());
    const [selGrupos, setSelGrupos] = useState<Set<string>>(new Set());
    const [confirmRemover, setConfirmRemover] = useState(false);
    const [membroEditando, setMembroEditando] = useState<Membro | null>(null);
    const [cargoExcluindo, setCargoExcluindo] = useState<Cargo | null>(null);

    const termo = busca.trim().toLowerCase();

    const membrosFiltrados = useMemo(
        () =>
            membros.filter(
                (m) =>
                    (!termo || m.email.toLowerCase().includes(termo)) &&
                    (filtroCargo === TODOS || m.cargoIds.includes(filtroCargo)) &&
                    (filtroGrupo === TODOS || m.grupoIds.includes(filtroGrupo)),
            ),
        [membros, termo, filtroCargo, filtroGrupo],
    );
    const filtrando = Boolean(termo) || filtroCargo !== TODOS || filtroGrupo !== TODOS;
    const limparFiltros = () => {
        setBusca("");
        setFiltroCargo(TODOS);
        setFiltroGrupo(TODOS);
    };
    const gruposFiltrados = useMemo(() => {
        if (!termo) return grupos;
        return grupos.filter(
            (g) => g.nome.toLowerCase().includes(termo) || g.eventoIds.some((id) => (eventoById(id)?.nome ?? "").toLowerCase().includes(termo)),
        );
    }, [grupos, termo]);
    const cargosFiltrados = useMemo(() => (termo ? cargos.filter((c) => c.nome.toLowerCase().includes(termo)) : cargos), [cargos, termo]);

    const changeTab = (key: TabKey) => setParams(key === "membros" ? {} : { aba: key });
    // Trocar de aba (pelas abas ou pelo voltar do navegador) limpa busca, filtros e seleções (MEM-03).
    useEffect(() => {
        limparFiltros();
        setSelMembros(new Set());
        setSelGrupos(new Set());
    }, [tab]);

    const selCount = tab === "membros" ? selMembros.size : tab === "grupos" ? selGrupos.size : 0;

    /** Ação em lote na aba Membros: dá um cargo ou põe num grupo, sem tirar o que já têm (MEM-79). */
    const emLote = (chave: string) => {
        const [tipo, id] = chave.split(":");
        const n = selMembros.size;
        const quem = n === 1 ? "1 membro" : `${n} membros`;
        if (tipo === "cargo") {
            adicionarAosMembros(selMembros, { cargoId: id });
            toast.success(`Cargo "${cargoById(id)?.nome ?? id}" dado a ${quem}`);
        } else {
            adicionarAosMembros(selMembros, { grupoId: id });
            toast.success(`${n === 1 ? "1 membro incluído" : `${n} membros incluídos`} no grupo "${grupos.find((g) => g.id === id)?.nome ?? id}"`);
        }
        setSelMembros(new Set());
    };
    const podeRemover = tab === "membros" || tab === "grupos";

    const confirmarRemocao = () => {
        if (tab === "membros") {
            removeMembros(selMembros);
            toast.success(selMembros.size === 1 ? "Membro removido" : `${selMembros.size} membros removidos`);
            setSelMembros(new Set());
        } else if (tab === "grupos") {
            removeGrupos(selGrupos);
            toast.success(selGrupos.size === 1 ? "Grupo excluído" : `${selGrupos.size} grupos excluídos`);
            setSelGrupos(new Set());
        }
        setConfirmRemover(false);
    };

    return (
        <BackstageLayout showEventContext={false} activeProducer="equipe">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
                <CabecalhoDaPagina
                    titulo="Membros"
                    acoes={
                        <>
                            {tab === "membros" && (
                                <Button size="md" color="primary" iconLeading={Plus} onClick={() => setMembroModalOpen(true)}>
                                    Adicionar membro
                                </Button>
                            )}
                            {tab === "grupos" && (
                                <Button size="md" color="primary" iconLeading={Plus} onClick={() => setGrupoModalOpen(true)}>
                                    Novo grupo
                                </Button>
                            )}
                            {tab === "cargos" && (
                                <Button size="md" color="primary" iconLeading={Plus} onClick={() => navigate("/backstage/membros/criar-cargo")}>
                                    Novo cargo
                                </Button>
                            )}
                        </>
                    }
                />

                {/* Abas só trocam de seção (BKS-111); a barra e o cartão são os comuns (BKS-110). */}
                <Tabs selectedKey={tab} onSelectionChange={(key: Key) => changeTab(key as TabKey)} className="w-fit!">
                    <Tabs.List type="button-border" size="sm">
                        <Tabs.Item id="membros">{`Membros (${membros.length})`}</Tabs.Item>
                        <Tabs.Item id="grupos">{`Grupos (${grupos.length})`}</Tabs.Item>
                        <Tabs.Item id="cargos">{`Cargos (${cargos.length})`}</Tabs.Item>
                    </Tabs.List>
                </Tabs>

                <div className="flex flex-col gap-4">
                    <BarraDaLista
                        busca={{ valor: busca, onChange: setBusca, placeholder: PLACEHOLDERS[tab], rotulo: "Buscar" }}
                        filtro={
                            tab === "membros" && (
                                <>
                                    <div className="w-full @min-[36rem]:w-48">
                                        <Select
                                            size="sm"
                                            aria-label="Filtrar por cargo"
                                            selectedKey={filtroCargo}
                                            onSelectionChange={(k) => k && setFiltroCargo(String(k))}
                                            items={[{ id: TODOS, label: "Todos os cargos" }, ...cargos.map((c) => ({ id: c.id, label: c.nome }))]}
                                        >
                                            {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                                        </Select>
                                    </div>
                                    <div className="w-full @min-[36rem]:w-48">
                                        <Select
                                            size="sm"
                                            aria-label="Filtrar por grupo"
                                            selectedKey={filtroGrupo}
                                            onSelectionChange={(k) => k && setFiltroGrupo(String(k))}
                                            items={[{ id: TODOS, label: "Todos os grupos" }, ...grupos.map((g) => ({ id: g.id, label: g.nome }))]}
                                        >
                                            {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                                        </Select>
                                    </div>
                                </>
                            )
                        }
                    >
                        {tab === "membros" && (
                            <Dropdown.Root>
                                <Button size="sm" color="secondary" iconTrailing={ChevronDown} isDisabled={selCount === 0}>
                                    {`Editar em lote (${selCount})`}
                                </Button>
                                <Dropdown.Popover className="max-h-80 w-64" placement="bottom end">
                                    <Dropdown.Menu aria-label="Editar os membros selecionados" onAction={(k) => emLote(String(k))}>
                                        <Dropdown.Section>
                                            <Dropdown.SectionHeader className="px-4 pt-2 pb-1 text-xs font-semibold text-tertiary">Dar o cargo</Dropdown.SectionHeader>
                                            {cargos.map((c) => (
                                                <Dropdown.Item key={c.id} id={`cargo:${c.id}`} label={c.nome} />
                                            ))}
                                        </Dropdown.Section>
                                        <Dropdown.Separator />
                                        <Dropdown.Section>
                                            <Dropdown.SectionHeader className="px-4 pt-2 pb-1 text-xs font-semibold text-tertiary">Incluir no grupo</Dropdown.SectionHeader>
                                            {grupos
                                                .filter((g) => !g.sistema)
                                                .map((g) => (
                                                    <Dropdown.Item key={g.id} id={`grupo:${g.id}`} label={g.nome} />
                                                ))}
                                        </Dropdown.Section>
                                    </Dropdown.Menu>
                                </Dropdown.Popover>
                            </Dropdown.Root>
                        )}
                        {podeRemover && (
                            <Button size="sm" color="secondary-destructive" iconLeading={Trash01} isDisabled={selCount === 0} onClick={() => setConfirmRemover(true)}>
                                {`Remover (${selCount})`}
                            </Button>
                        )}
                    </BarraDaLista>

                    {carregando ? (
                        <CarregandoTabela />
                    ) : (
                        <CartaoDaTabela>
                            {tab === "membros" && (
                                <MembrosTable
                                    rows={membrosFiltrados}
                                    filtros={[termo, filtroCargo, filtroGrupo]}
                                    filtrando={filtrando}
                                    grupos={grupos}
                                    selected={selMembros}
                                    onChange={setSelMembros}
                                    onEdit={setMembroEditando}
                                    onLimpar={limparFiltros}
                                />
                            )}
                            {tab === "grupos" && (
                                <GruposTable rows={gruposFiltrados} termo={termo} selected={selGrupos} onChange={setSelGrupos} onEdit={setGrupoEditando} onLimpar={() => setBusca("")} />
                            )}
                            {tab === "cargos" && (
                                <CargosTable
                                    rows={cargosFiltrados}
                                    termo={termo}
                                    onEdit={(c) => navigate(`/backstage/membros/cargos/${c.id}/editar`)}
                                    onDelete={setCargoExcluindo}
                                    onLimpar={() => setBusca("")}
                                />
                            )}
                        </CartaoDaTabela>
                    )}
                </div>
            </div>

            <CriarMembroModal isOpen={membroModalOpen} onClose={() => setMembroModalOpen(false)} />
            <CriarMembroModal isOpen={membroEditando !== null} membro={membroEditando ?? undefined} onClose={() => setMembroEditando(null)} />
            <ExcluirCargoModal
                cargo={cargoExcluindo}
                membrosAfetados={cargoExcluindo ? membros.filter((m) => m.cargoIds.includes(cargoExcluindo.id)).length : 0}
                onClose={() => setCargoExcluindo(null)}
                onConfirm={() => {
                    if (!cargoExcluindo) return;
                    removeCargo(cargoExcluindo.id);
                    toast.success(`Cargo "${cargoExcluindo.nome}" excluído`);
                    setCargoExcluindo(null);
                }}
            />
            <CriarGrupoModal isOpen={grupoModalOpen} onClose={() => setGrupoModalOpen(false)} />
            <CriarGrupoModal isOpen={grupoEditando !== null} grupo={grupoEditando ?? undefined} onClose={() => setGrupoEditando(null)} />

            <ConfirmarRemocaoModal
                isOpen={confirmRemover}
                tab={tab}
                count={selCount}
                onClose={() => setConfirmRemover(false)}
                onConfirm={confirmarRemocao}
            />
        </BackstageLayout>
    );
}

/* ------------------------------------------------------------------ */
/*  Tabelas (peças comuns de ../../components/tabela, BKS-110 a BKS-118) */
/* ------------------------------------------------------------------ */

function toggleId(set: Set<string>, id: string): Set<string> {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
}

/** Valores da linha: empilhados com rótulo no cartão estreito; colunas no largo (BKS-115). */
const VALORES = "flex min-w-0 flex-1 flex-col gap-2 @min-[44rem]:flex-row @min-[44rem]:items-center @min-[44rem]:gap-4";

/** Cabeçalho com "selecionar todos": fica visível também no cartão estreito, onde vira "Selecionar todos". */
function CabecalhoSelecionavel({
    allSel,
    someSel,
    onToggle,
    isDisabled,
    children,
}: {
    allSel: boolean;
    someSel: boolean;
    onToggle: () => void;
    isDisabled?: boolean;
    children: ReactNode;
}) {
    return (
        <CabecalhoDaTabela ordenavel className="flex">
            <Checkbox size="sm" isSelected={allSel} isIndeterminate={someSel} isDisabled={isDisabled} onChange={onToggle} aria-label="Selecionar todos" />
            <span aria-hidden="true" className="min-w-0 flex-1 @min-[44rem]:hidden">
                Selecionar todos
            </span>
            {children}
        </CabecalhoDaTabela>
    );
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

function MembrosTable({
    rows,
    filtros,
    filtrando,
    grupos,
    selected,
    onChange,
    onEdit,
    onLimpar,
}: {
    rows: Membro[];
    filtros: string[];
    filtrando: boolean;
    grupos: Grupo[];
    selected: Set<string>;
    onChange: (s: Set<string>) => void;
    onEdit: (m: Membro) => void;
    onLimpar: () => void;
}) {
    const paginacao = usePaginacao(rows, filtros);
    if (rows.length === 0) return <SemResultados texto={filtrando ? "Não encontramos membros com esses filtros." : "Nenhum membro."} onLimpar={filtrando ? onLimpar : undefined} />;

    const allSel = rows.every((r) => selected.has(r.id));
    const someSel = !allSel && rows.some((r) => selected.has(r.id));
    const toggleAll = () => onChange(allSel ? new Set() : new Set(rows.map((r) => r.id)));

    return (
        <>
            <CabecalhoSelecionavel allSel={allSel} someSel={someSel} onToggle={toggleAll}>
                <span aria-hidden="true" className="hidden min-w-0 flex-1 @min-[44rem]:block">
                    E-mail
                </span>
                <span aria-hidden="true" className="hidden w-56 @min-[44rem]:block">
                    Cargos
                </span>
                <span aria-hidden="true" className="hidden w-24 text-right @min-[44rem]:block">
                    Grupos
                </span>
                <span aria-hidden="true" className="hidden w-24 text-right @min-[44rem]:block">
                    Eventos
                </span>
                <span aria-hidden="true" className="hidden w-8 @min-[44rem]:block" />
            </CabecalhoSelecionavel>
            <ul className="flex flex-col divide-y divide-secondary">
                {paginacao.visiveis.map((m) => (
                    <LinhaDaTabela key={m.id} selecionada={selected.has(m.id)}>
                        <Checkbox
                            size="sm"
                            isSelected={selected.has(m.id)}
                            onChange={() => onChange(toggleId(selected, m.id))}
                            aria-label={`Selecionar ${m.email}`}
                            className="mt-0.5 @min-[44rem]:mt-0"
                        />
                        <div className={VALORES}>
                            <TituloDaLinha titulo={m.email} />
                            <Celula rotulo="Cargos" className="@min-[44rem]:w-56">
                                <span className="inline-flex flex-wrap gap-1.5">
                                    {m.cargoIds.map((id) => (
                                        <Badge key={id} size="sm" type="pill-color" color="gray">
                                            {cargoById(id)?.nome ?? id}
                                        </Badge>
                                    ))}
                                </span>
                            </Celula>
                            <Celula rotulo="Grupos" numero className="@min-[44rem]:w-24">
                                {m.grupoIds.length}
                            </Celula>
                            <Celula rotulo="Eventos" numero className="@min-[44rem]:w-24">
                                {eventosDoMembro(m, grupos)}
                            </Celula>
                        </div>
                        <div className="flex shrink-0 justify-end @min-[44rem]:w-8">
                            <ButtonUtility icon={Edit01} color="tertiary" size="sm" tooltip="Editar membro" aria-label={`Editar ${m.email}`} onClick={() => onEdit(m)} />
                        </div>
                    </LinhaDaTabela>
                ))}
            </ul>
            <RodapeDePaginacao {...paginacao} />
        </>
    );
}

function GruposTable({
    rows,
    termo,
    selected,
    onChange,
    onEdit,
    onLimpar,
}: {
    rows: Grupo[];
    termo: string;
    selected: Set<string>;
    onChange: (s: Set<string>) => void;
    onEdit: (g: Grupo) => void;
    onLimpar: () => void;
}) {
    const paginacao = usePaginacao(rows, [termo]);
    if (rows.length === 0) return <SemResultados texto="Não encontramos grupos para essa busca." onLimpar={onLimpar} />;

    const selecionaveis = rows.filter((r) => !r.sistema);
    const allSel = selecionaveis.length > 0 && selecionaveis.every((r) => selected.has(r.id));
    const someSel = !allSel && selecionaveis.some((r) => selected.has(r.id));
    const toggleAll = () => onChange(allSel ? new Set() : new Set(selecionaveis.map((r) => r.id)));

    return (
        <>
            <CabecalhoSelecionavel allSel={allSel} someSel={someSel} onToggle={toggleAll} isDisabled={selecionaveis.length === 0}>
                <span aria-hidden="true" className="hidden min-w-0 flex-1 @min-[44rem]:block">
                    Nome do grupo
                </span>
                <span aria-hidden="true" className="hidden w-28 text-right @min-[44rem]:block">
                    Membros
                </span>
                <span aria-hidden="true" className="hidden w-28 text-right @min-[44rem]:block">
                    Eventos
                </span>
                <span aria-hidden="true" className="hidden w-8 @min-[44rem]:block" />
            </CabecalhoSelecionavel>
            <ul className="flex flex-col divide-y divide-secondary">
                {paginacao.visiveis.map((g) => (
                    // A linha abre o grupo para editar nome, eventos e membros (MEM-77): o nome cobre a linha para o mouse;
                    // no teclado, o lápis (uma parada só por linha). Checkbox e lápis ficam por cima.
                    <LinhaDaTabela key={g.id} interativa selecionada={selected.has(g.id)} className="relative">
                        <Checkbox
                            size="sm"
                            isSelected={selected.has(g.id)}
                            isDisabled={g.sistema}
                            onChange={() => onChange(toggleId(selected, g.id))}
                            aria-label={g.sistema ? `${g.nome} (grupo padrão, não removível)` : `Selecionar ${g.nome}`}
                            className="relative z-10 mt-0.5 @min-[44rem]:mt-0"
                        />
                        <div className={VALORES}>
                            <TituloDaLinha
                                titulo={
                                    <>
                                        <button
                                            type="button"
                                            tabIndex={-1}
                                            onClick={() => onEdit(g)}
                                            className="cursor-pointer text-left outline-hidden after:absolute after:inset-0"
                                        >
                                            {g.nome}
                                        </button>
                                        {g.sistema && (
                                            <Badge size="sm" type="pill-color" color="gray" className="ml-2 inline-flex align-middle">
                                                Padrão
                                            </Badge>
                                        )}
                                    </>
                                }
                            />
                            <Celula rotulo="Membros" numero className="@min-[44rem]:w-28">
                                {g.membroIds.length}
                            </Celula>
                            <Celula rotulo="Eventos" numero className="@min-[44rem]:w-28">
                                {g.eventoIds.length}
                            </Celula>
                        </div>
                        <div className="relative z-10 flex shrink-0 justify-end @min-[44rem]:w-8">
                            <ButtonUtility icon={Edit01} color="tertiary" size="sm" tooltip="Editar grupo" aria-label={`Editar ${g.nome}`} onClick={() => onEdit(g)} />
                        </div>
                    </LinhaDaTabela>
                ))}
            </ul>
            <RodapeDePaginacao {...paginacao} />
        </>
    );
}

function CargosTable({
    rows,
    termo,
    onEdit,
    onDelete,
    onLimpar,
}: {
    rows: Cargo[];
    termo: string;
    onEdit: (c: Cargo) => void;
    onDelete: (c: Cargo) => void;
    onLimpar: () => void;
}) {
    const paginacao = usePaginacao(rows, [termo]);
    if (rows.length === 0) return <SemResultados texto="Não encontramos cargos para essa busca." onLimpar={onLimpar} />;

    return (
        <>
            <CabecalhoDaTabela>
                <span className="min-w-0 flex-1">Nome do cargo</span>
                <span className="min-w-0 flex-[2]">Informações</span>
                <span className="w-17" />
            </CabecalhoDaTabela>
            <ul className="flex flex-col divide-y divide-secondary">
                {paginacao.visiveis.map((c) => {
                    const permissionsSummary = c.permissions?.some((p) => p.level !== "none")
                        ? c.permissions
                              .filter((p) => p.level !== "none")
                              .map((p) => `${p.nome}: ${p.level === "admin" ? "Admin" : p.level === "editor" ? "Editor" : "Visualizador"}`)
                              .join(", ")
                        : null;
                    const totalAcoes = c.acoes?.length ?? 0;

                    return (
                        <LinhaDaTabela key={c.id}>
                            <div className={VALORES}>
                                <TituloDaLinha
                                    titulo={c.nome}
                                    // O selo vai na linha de baixo: ao lado do nome, o truncamento o escondia no estreito.
                                    apoio={
                                        c.porFeature && (
                                            <Badge size="sm" type="pill-color" color="blue" className="mt-1 inline-flex">
                                                Limites em cada funcionalidade
                                            </Badge>
                                        )
                                    }
                                />
                                <Celula rotulo="Informações" className="min-w-0 text-tertiary @min-[44rem]:flex-[2]">
                                    {permissionsSummary ? (
                                        <span>
                                            <span className="font-medium text-secondary">Permissões: </span>
                                            {permissionsSummary}
                                        </span>
                                    ) : (
                                        <span className="flex flex-col gap-1">
                                            {c.descricao && <span>{c.descricao}</span>}
                                            {c.acoes && <span className="text-quaternary">{plural(totalAcoes, "permissão", "permissões")}</span>}
                                        </span>
                                    )}
                                </Celula>
                            </div>
                            <div className="flex shrink-0 justify-end gap-1 @min-[44rem]:w-17">
                                {isCargoSistema(c.id) ? (
                                    <Tooltip title="Cargo padrão" description="Cargos padrão não podem ser editados nem excluídos.">
                                        <TooltipTrigger aria-label={`${c.nome}: cargo padrão`} className="flex size-8 items-center justify-center rounded-md text-fg-quaternary">
                                            <Lock01 className="size-5" aria-hidden="true" />
                                        </TooltipTrigger>
                                    </Tooltip>
                                ) : (
                                    <>
                                        <ButtonUtility icon={Edit01} color="tertiary" size="sm" tooltip="Editar cargo" aria-label={`Editar ${c.nome}`} onClick={() => onEdit(c)} />
                                        <ButtonUtility icon={Trash01} color="tertiary" size="sm" tooltip="Excluir cargo" aria-label={`Excluir ${c.nome}`} onClick={() => onDelete(c)} />
                                    </>
                                )}
                            </div>
                        </LinhaDaTabela>
                    );
                })}
            </ul>
            <RodapeDePaginacao {...paginacao} />
        </>
    );
}

/* ------------------------------------------------------------------ */
/*  Modal de exclusão de cargo                                         */
/* ------------------------------------------------------------------ */

function ExcluirCargoModal({
    cargo,
    membrosAfetados,
    onClose,
    onConfirm,
}: {
    cargo: Cargo | null;
    membrosAfetados: number;
    onClose: () => void;
    onConfirm: () => void;
}) {
    const consequencia =
        membrosAfetados === 0
            ? "Nenhum membro usa este cargo."
            : membrosAfetados === 1
              ? "1 membro perde as permissões concedidas por ele."
              : `${membrosAfetados} membros perdem as permissões concedidas por ele.`;

    return (
        <ModalOverlay isOpen={cargo !== null} onOpenChange={(o) => !o && onClose()} isDismissable>
            <Modal className="sm:max-w-[440px]">
                <Dialog>
                    <div className="flex w-full flex-col gap-5 rounded-2xl bg-primary p-6 shadow-xl ring-1 ring-border-secondary">
                        <div className="flex items-start gap-4">
                            <FeaturedIcon icon={Trash01} color="error" theme="light" size="lg" />
                            <div className="flex flex-col gap-1">
                                <h2 className="text-lg font-semibold text-primary">Excluir o cargo "{cargo?.nome}"?</h2>
                                <p className="text-sm text-tertiary">{consequencia} Esta ação não pode ser desfeita.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Button size="md" color="secondary" onClick={onClose}>
                                Manter cargo
                            </Button>
                            <Button size="md" color="primary-destructive" onClick={onConfirm}>
                                Excluir cargo
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}

/* ------------------------------------------------------------------ */
/*  Modal de confirmação de remoção                                    */
/* ------------------------------------------------------------------ */

function ConfirmarRemocaoModal({
    isOpen,
    tab,
    count,
    onClose,
    onConfirm,
}: {
    isOpen: boolean;
    tab: TabKey;
    count: number;
    onClose: () => void;
    onConfirm: () => void;
}) {
    const isGrupo = tab === "grupos";
    const titulo = isGrupo ? "Excluir grupos" : "Remover membros";
    const descricao = isGrupo
        ? count === 1
            ? "Excluir o grupo selecionado? Os membros perdem os acessos concedidos por ele. Esta ação não pode ser desfeita."
            : `Excluir os ${count} grupos selecionados? Os membros perdem os acessos concedidos por eles. Esta ação não pode ser desfeita.`
        : count === 1
          ? "Remover o membro selecionado da organização? Isso revoga todo o acesso dele e não pode ser desfeito."
          : `Remover os ${count} membros selecionados da organização? Isso revoga todo o acesso deles e não pode ser desfeito.`;

    return (
        <ModalOverlay isOpen={isOpen} onOpenChange={(o) => !o && onClose()} isDismissable>
            <Modal className="sm:max-w-[440px]">
                <Dialog>
                    <div className="flex w-full flex-col gap-5 rounded-2xl bg-primary p-6 shadow-xl ring-1 ring-border-secondary">
                        <div className="flex items-start gap-4">
                            <FeaturedIcon icon={Trash01} color="error" theme="light" size="lg" />
                            <div className="flex flex-col gap-1">
                                <h2 className="text-lg font-semibold text-primary">{titulo}</h2>
                                <p className="text-sm text-tertiary">{descricao}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Button size="md" color="secondary" onClick={onClose}>
                                Cancelar
                            </Button>
                            <Button size="md" color="primary-destructive" onClick={onConfirm}>
                                {isGrupo ? "Excluir" : "Remover"}
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
