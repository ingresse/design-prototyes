import { useMemo } from "react";
import { Plus, Tag01 } from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { useBanco, useColecao, type Categoria, type CriacaoDeEvento } from "@/plataforma";
import { CATALOGO, DIAS_DE_FORMACAO, formacaoDe } from "@/plataforma/categorias";
import { TITULO_PAGINA } from "@/produtos/backstage/components/titulo-pagina";
import { BackstageLayout } from "../../components/Backstage";

/* ------------------------------------------------------------------ */
/*  Categorias de show ou festa (CAT-01 a CAT-22)                      */
/*                                                                     */
/*  Lista visual do que está no banco: as categorias que os eventos    */
/*  reais usaram, as criações que não couberam em nenhuma e o que do    */
/*  catálogo ainda não apareceu.                                       */
/* ------------------------------------------------------------------ */

const data = (iso: string) => new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
const plural = (n: number, um: string, varios: string) => `${new Intl.NumberFormat("pt-BR").format(n)} ${n === 1 ? um : varios}`;
const CATALOGO_POR_ID = new Map(CATALOGO.map((c) => [c.id, c]));

export function Categorias() {
    const { modo } = useBanco();
    const categorias = useColecao("categorias");
    const criacoes = useColecao("criacoes");
    const carregando = modo === "carregando";

    const formacao = useMemo(() => formacaoDe(criacoes), [criacoes]);
    const lista = useMemo(() => [...categorias].sort((a, b) => b.criacoes - a.criacoes || a.nome.localeCompare(b.nome)), [categorias]);
    const semCategoria = useMemo(() => criacoes.filter((c) => !c.categoriaId).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)), [criacoes]);
    const naoUsadas = useMemo(() => {
        const usadas = new Set(categorias.map((c) => c.id));
        return CATALOGO.filter((c) => !usadas.has(c.id));
    }, [categorias]);

    const subtitulo = !formacao.inicio
        ? `A lista se forma com os shows e festas criados nos ${DIAS_DE_FORMACAO} primeiros dias. Cada categoria entra no primeiro evento que cai nela.`
        : formacao.aberta
          ? `Em formação até ${data(formacao.fim!)}. Cada categoria entra na lista no primeiro evento que cai nela.`
          : `Lista formada de ${data(formacao.inicio)} a ${data(formacao.fim!)}. Eventos que não cabem nela ficam sem categoria.`;

    return (
        <BackstageLayout activeProducer="eventos" showEventContext={false}>
            <div className="flex min-w-0 flex-1 flex-col gap-8">
                <header className="flex flex-col gap-1">
                    <h1 className={TITULO_PAGINA}>Categorias</h1>
                    <p className="max-w-[72ch] text-md text-tertiary">{subtitulo}</p>
                </header>

                {carregando ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="h-40 animate-pulse rounded-xl bg-secondary" />
                        ))}
                    </div>
                ) : criacoes.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                        <EmptyState size="sm">
                            <EmptyState.Header>
                                <EmptyState.FeaturedIcon icon={Tag01} color="gray" theme="modern" />
                            </EmptyState.Header>
                            <EmptyState.Content>
                                <EmptyState.Title>Nenhuma categoria ainda</EmptyState.Title>
                                <EmptyState.Description>A primeira entra na lista quando um show ou festa for criado.</EmptyState.Description>
                            </EmptyState.Content>
                            <EmptyState.Footer>
                                <Button size="md" iconLeading={Plus} href="/backstage/eventos/novo?tipo=show">
                                    Criar show ou festa
                                </Button>
                            </EmptyState.Footer>
                        </EmptyState>
                    </div>
                ) : (
                    <>
                        <Resumo categorias={lista.length} classificadas={criacoes.length - semCategoria.length} semCategoria={semCategoria.length} />

                        <section aria-labelledby="na-lista" className="flex flex-col gap-4">
                            <h2 id="na-lista" className="text-lg font-semibold text-primary">
                                Na lista
                            </h2>
                            {lista.length === 0 ? (
                                <p className="text-md text-tertiary">Nenhum evento caiu numa categoria até agora.</p>
                            ) : (
                                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                    {lista.map((c) => (
                                        <CartaoDaCategoria key={c.id} categoria={c} />
                                    ))}
                                </ul>
                            )}
                        </section>

                        {semCategoria.length > 0 && (
                            <section aria-labelledby="sem-categoria" className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1">
                                    <h2 id="sem-categoria" className="text-lg font-semibold text-primary">
                                        Sem categoria
                                    </h2>
                                    <p className="max-w-[72ch] text-md text-tertiary">
                                        Nenhuma categoria ficou parecida o bastante com estes eventos. Se vários contam a mesma coisa, falta uma categoria no catálogo.
                                    </p>
                                </div>
                                <ul className="divide-y divide-border-secondary rounded-xl bg-primary ring-1 ring-border-secondary">
                                    {semCategoria.map((c) => (
                                        <LinhaSemCategoria key={c.id} criacao={c} />
                                    ))}
                                </ul>
                            </section>
                        )}

                        {formacao.aberta && naoUsadas.length > 0 && (
                            <section aria-labelledby="nao-usadas" className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1">
                                    <h2 id="nao-usadas" className="text-lg font-semibold text-primary">
                                        Ainda não usadas
                                    </h2>
                                    <p className="max-w-[72ch] text-md text-tertiary">
                                        {plural(naoUsadas.length, "categoria do catálogo pode entrar", "categorias do catálogo podem entrar")} na lista até o fim da formação.
                                    </p>
                                </div>
                                <ul className="flex flex-wrap gap-2">
                                    {naoUsadas.map((c) => (
                                        <li key={c.id}>
                                            <Badge size="md" color="gray" type="modern">
                                                {c.nome}
                                            </Badge>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </>
                )}
            </div>
        </BackstageLayout>
    );
}

function Resumo({ categorias, classificadas, semCategoria }: { categorias: number; classificadas: number; semCategoria: number }) {
    const itens = [
        { rotulo: "Categorias na lista", valor: categorias },
        { rotulo: "Eventos com categoria", valor: classificadas },
        { rotulo: "Eventos sem categoria", valor: semCategoria },
    ];
    return (
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {itens.map((i) => (
                <div key={i.rotulo} className="flex flex-col gap-1 rounded-xl bg-primary p-5 ring-1 ring-border-secondary">
                    <dt className="text-sm font-medium text-tertiary">{i.rotulo}</dt>
                    <dd className="text-display-xs font-semibold text-primary">{new Intl.NumberFormat("pt-BR").format(i.valor)}</dd>
                </div>
            ))}
        </dl>
    );
}

function CartaoDaCategoria({ categoria: c }: { categoria: Categoria }) {
    return (
        <li className="flex flex-col gap-4 rounded-xl bg-primary p-5 ring-1 ring-border-secondary">
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                    <h3 className="text-lg font-semibold text-primary">{c.nome}</h3>
                    <p className="text-sm text-tertiary">{plural(c.criacoes, "evento", "eventos")}</p>
                </div>
                <Badge size="md" color="gray" type="modern">
                    {c.grupo}
                </Badge>
            </div>
            <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-secondary">O que escreveram</p>
                <ul className="flex flex-col gap-1.5">
                    {c.textos.slice(0, 3).map((t, i) => (
                        <li key={i} className="text-sm text-tertiary">
                            “{t}”
                        </li>
                    ))}
                </ul>
            </div>
            <p className="mt-auto text-sm text-tertiary">
                Último: <span className="text-secondary">{c.exemplos[0]}</span>, em {data(c.ultimaEm)}
            </p>
        </li>
    );
}

function LinhaSemCategoria({ criacao: c }: { criacao: CriacaoDeEvento }) {
    const parecida = c.maisParecidaId ? CATALOGO_POR_ID.get(c.maisParecidaId) : undefined;
    return (
        <li className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-md font-medium text-primary">{c.nome}</p>
                <p className="text-sm text-tertiary">“{c.texto}”</p>
            </div>
            <p className="shrink-0 text-sm text-tertiary">
                {parecida ? `Mais perto de ${parecida.nome} (${Math.round((c.similaridade ?? 0) * 100)}%)` : "Sem leitura"}, em {data(c.criadoEm)}
            </p>
        </li>
    );
}
