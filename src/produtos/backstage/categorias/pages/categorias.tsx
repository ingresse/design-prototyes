import { useMemo, useState, type FC, type Key } from "react";
import { Award01, Clapperboard, Disc02, FaceHappy, Flag01, GraduationHat01, HeartHand, Microphone02, Plus, ShoppingBag02, Tag01, Trophy01 } from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Tabs } from "@/components/application/tabs/tabs";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Select } from "@/components/base/select/select";
import { useBanco, useColecao, type Categoria, type Evento } from "@/plataforma";
import { categoriaDoEvento, doMapa, GRUPOS_DE_TAG, TAG_POR_ID, TAGS, tagsDoEvento } from "@/plataforma/categorias";
import { TITULO_PAGINA } from "@/produtos/backstage/components/titulo-pagina";
import { cx } from "@/utils/cx";
import { BackstageLayout } from "../../components/Backstage";

/* ------------------------------------------------------------------ */
/*  Categorias e tags de evento (CAT-01 a CAT-41)                      */
/*                                                                     */
/*  Duas abas: o que pode ser atribuído a um evento (as 10 categorias  */
/*  do mapa do Grupo e as tags, por grupo) e os eventos do banco com   */
/*  a categoria e as tags de cada um.                                  */
/* ------------------------------------------------------------------ */

const ICONES: Record<string, FC<{ className?: string }>> = {
    shows: Microphone02,
    festivais: Flag01,
    "festas-e-baladas": Disc02,
    universitario: GraduationHat01,
    futebol: Trophy01,
    esportes: Award01,
    "artes-cenicas": Clapperboard,
    humor: FaceHappy,
    "kids-e-familia": HeartHand,
    "feiras-e-exposicoes": ShoppingBag02,
};

const numero = (n: number) => new Intl.NumberFormat("pt-BR").format(n);
const plural = (n: number, um: string, varios: string) => `${numero(n)} ${n === 1 ? um : varios}`;
const data = (iso: string) => new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

type Aba = "categorias" | "eventos";
const TODAS = "todas";

interface EventoClassificado {
    evento: Evento;
    categoria?: Categoria;
    tags: string[];
}

export function Categorias() {
    const { modo } = useBanco();
    const categorias = useColecao("categorias");
    const eventos = useColecao("eventos");
    const carregando = modo === "carregando";
    const [aba, setAba] = useState<Aba>("categorias");
    const [filtro, setFiltro] = useState<string>(TODAS);

    const doGrupo = useMemo(() => doMapa(categorias).sort((a, b) => a.ordem - b.ordem), [categorias]);
    const classificados = useMemo<EventoClassificado[]>(() => {
        const porId = new Map(doGrupo.map((c) => [c.id, c]));
        return [...eventos]
            .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm) || a.nome.localeCompare(b.nome))
            .map((e) => {
                const id = categoriaDoEvento(e);
                return { evento: e, categoria: id ? porId.get(id) : undefined, tags: tagsDoEvento(e) };
            });
    }, [eventos, doGrupo]);
    const porCategoria = useMemo(() => contar(classificados.map((c) => c.categoria?.id).filter((x): x is string => !!x)), [classificados]);
    const porTag = useMemo(() => contar(classificados.flatMap((c) => c.tags)), [classificados]);

    const verEventosDa = (categoriaId: string) => {
        setFiltro(categoriaId);
        setAba("eventos");
    };

    return (
        <BackstageLayout activeProducer="eventos" showEventContext={false}>
            <div className="flex min-w-0 flex-1 flex-col gap-6">
                <header className="flex flex-col gap-1">
                    <h1 className={TITULO_PAGINA}>Categorias</h1>
                    <p className="max-w-[72ch] text-md text-tertiary">
                        Cada evento tem uma categoria, escolhida por quem cria, e tags, lidas do que a pessoa escreve, do nome, da descrição e do banner.
                    </p>
                </header>

                <Tabs selectedKey={aba} onSelectionChange={(k: Key) => setAba(k as Aba)}>
                    <Tabs.List type="underline" size="sm">
                        <Tabs.Item id="categorias">Categorias e tags</Tabs.Item>
                        <Tabs.Item id="eventos" badge={carregando ? undefined : numero(eventos.length)}>
                            Eventos
                        </Tabs.Item>
                    </Tabs.List>

                    <Tabs.Panel id="categorias" className="pt-6">
                        {carregando ? <Esqueleto /> : <AbaCategorias categorias={doGrupo} porCategoria={porCategoria} porTag={porTag} onVerEventos={verEventosDa} />}
                    </Tabs.Panel>
                    <Tabs.Panel id="eventos" className="pt-6">
                        {carregando ? <Esqueleto /> : <AbaEventos classificados={classificados} categorias={doGrupo} filtro={filtro} onFiltro={setFiltro} />}
                    </Tabs.Panel>
                </Tabs>
            </div>
        </BackstageLayout>
    );
}

function contar(ids: string[]) {
    const m = new Map<string, number>();
    for (const id of ids) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
}

const Esqueleto = () => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-hidden>
        {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-secondary" />
        ))}
    </div>
);

/* ---------------- aba Categorias e tags ---------------- */

function AbaCategorias({
    categorias,
    porCategoria,
    porTag,
    onVerEventos,
}: {
    categorias: Categoria[];
    porCategoria: Map<string, number>;
    porTag: Map<string, number>;
    onVerEventos: (categoriaId: string) => void;
}) {
    return (
        <div className="flex flex-col gap-10">
            <section aria-labelledby="titulo-categorias" className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <h2 id="titulo-categorias" className="text-lg font-semibold text-primary">
                        Categorias
                    </h2>
                    <p className="max-w-[72ch] text-md text-tertiary">Uma por evento. Futebol e evento esportivo já nascem com a sua; show ou festa escolhe entre as outras.</p>
                </div>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {categorias.map((c) => {
                        const Icone = ICONES[c.id] ?? Tag01;
                        const n = porCategoria.get(c.id) ?? 0;
                        return (
                            <li key={c.id}>
                                <button
                                    type="button"
                                    onClick={() => onVerEventos(c.id)}
                                    className="flex w-full items-center gap-3 rounded-xl bg-primary p-4 text-left ring-1 ring-border-secondary outline-focus-ring transition duration-100 ease-linear ring-inset hover:bg-primary_hover focus-visible:outline-2 focus-visible:outline-offset-2"
                                >
                                    <Icone className="size-6 shrink-0 text-fg-secondary" aria-hidden="true" />
                                    <span className="flex min-w-0 flex-col">
                                        <span className="text-md font-semibold text-primary">{c.nome}</span>
                                        <span className="text-sm text-tertiary">{plural(n, "evento", "eventos")}</span>
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </section>

            {GRUPOS_DE_TAG.map((g) => {
                const tags = TAGS.filter((t) => t.grupo === g.id).sort((a, b) => (porTag.get(b.id) ?? 0) - (porTag.get(a.id) ?? 0) || a.nome.localeCompare(b.nome));
                return (
                    <section key={g.id} aria-labelledby={`grupo-${g.id}`} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1">
                            <h2 id={`grupo-${g.id}`} className="text-lg font-semibold text-primary">
                                {g.nome}
                            </h2>
                            <p className="max-w-[72ch] text-md text-tertiary">
                                {g.descricao} Até {g.maximo} por evento.
                            </p>
                        </div>
                        <ul className="flex flex-wrap gap-2">
                            {tags.map((t) => {
                                const n = porTag.get(t.id) ?? 0;
                                return (
                                    <li key={t.id}>
                                        <Badge size="md" color="gray" type="modern">
                                            {t.nome}
                                            {n > 0 && <span className="ml-1.5 text-tertiary">{numero(n)}</span>}
                                        </Badge>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                );
            })}
        </div>
    );
}

/* ---------------- aba Eventos ---------------- */

function AbaEventos({ classificados, categorias, filtro, onFiltro }: { classificados: EventoClassificado[]; categorias: Categoria[]; filtro: string; onFiltro: (v: string) => void }) {
    const visiveis = filtro === TODAS ? classificados : classificados.filter((c) => c.categoria?.id === filtro);
    const opcoes = [{ id: TODAS, label: "Todas as categorias" }, ...categorias.map((c) => ({ id: c.id, label: c.nome }))];

    if (classificados.length === 0)
        return (
            <div className="flex items-center justify-center py-16">
                <EmptyState size="sm">
                    <EmptyState.Header>
                        <EmptyState.FeaturedIcon icon={Tag01} color="gray" theme="modern" />
                    </EmptyState.Header>
                    <EmptyState.Content>
                        <EmptyState.Title>Nenhum evento ainda</EmptyState.Title>
                        <EmptyState.Description>Os eventos aparecem aqui com a categoria e as tags de cada um.</EmptyState.Description>
                    </EmptyState.Content>
                    <EmptyState.Footer>
                        <Button size="md" iconLeading={Plus} href="/backstage/eventos/novo?tipo=show">
                            Criar show ou festa
                        </Button>
                    </EmptyState.Footer>
                </EmptyState>
            </div>
        );

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="w-full sm:max-w-xs">
                    <Select aria-label="Categoria" items={opcoes} selectedKey={filtro} onSelectionChange={(k) => k != null && onFiltro(String(k))}>
                        {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                    </Select>
                </div>
                <p className="text-sm text-tertiary">{plural(visiveis.length, "evento", "eventos")}</p>
            </div>

            {visiveis.length === 0 ? (
                <p className="py-8 text-center text-md text-tertiary">Nenhum evento nesta categoria.</p>
            ) : (
                <ul className="divide-y divide-border-secondary rounded-xl bg-primary ring-1 ring-border-secondary">
                    {visiveis.map((c) => (
                        <LinhaDoEvento key={c.evento.id} {...c} />
                    ))}
                </ul>
            )}
        </div>
    );
}

function LinhaDoEvento({ evento: e, categoria, tags }: EventoClassificado) {
    const Icone = categoria ? (ICONES[categoria.id] ?? Tag01) : Tag01;
    return (
        <li className="flex flex-col gap-3 px-5 py-4 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,2fr)] lg:items-start lg:gap-6">
            <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-md font-medium text-primary">{e.nome}</p>
                <p className="text-sm text-tertiary">
                    {[e.local, e.cidade].filter(Boolean).join(", ")}, {data(e.data)}
                </p>
                {e.categoriaTexto && <p className="text-sm text-tertiary">“{e.categoriaTexto}”</p>}
            </div>
            <p className={cx("flex items-center gap-2 text-sm", categoria ? "font-medium text-secondary" : "text-tertiary")}>
                <Icone className="size-5 shrink-0 text-fg-quaternary" aria-hidden="true" />
                {categoria?.nome ?? "Sem categoria"}
            </p>
            {tags.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
                    {tags.map((id) => (
                        <li key={id}>
                            <Badge size="md" color="gray" type="modern">
                                {TAG_POR_ID.get(id)?.nome ?? id}
                            </Badge>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-tertiary">Sem tags</p>
            )}
        </li>
    );
}
