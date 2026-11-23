import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Calendar, Phone01, SearchLg, UserPlus01, Users01, UserSquare } from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { PaginationCardAdvanced } from "@/components/application/pagination/pagination";
import { Avatar } from "@/components/base/avatar/avatar";
import { InputBase } from "@/components/base/input/input";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { Button } from "@/components/base/buttons/button";
import { atualizarEvento, useBanco } from "@/plataforma";
import { BackstageLayout } from "../../components/Backstage";
import { useTodosOsEventos } from "../../components/escopo-dos-relatorios";
import { eventos as eventosDaOrganizacao, useEventoAtual, useEventosVersao } from "../../eventos/data/eventos";
import { ExportMenu, RelatorioPageHeader } from "../components/RelatorioPageHeader";
import { SortableHeader } from "../components/SortableHeader";
import { inscritosDoEvento, QUANTIDADE_SIMULADA, ROTULO_DO_DOCUMENTO, type InscritoNaLista } from "../data/lista-de-usuarios";

/*
 * Lista de usuários (relatorios/rules.md, LUS): o gêmeo do relatório `waitlist` de produção
 * (awa-reports-web). Total de inscritos e a lista com busca, ordenação, paginação e exportação.
 */

const T = {
    titulo: "Lista de usuários",
    metrica: "Usuários na lista",
    lista: "Usuários",
    buscar: "Buscar por nome, e-mail, telefone ou documento",
    buscarRotulo: "Buscar inscritos por nome, e-mail, telefone ou documento",
    cols: { nome: "Nome", tipoDeDocumento: "Tipo de documento", documento: "Documento", email: "E-mail", telefone: "Telefone", inscritoEm: "Data de interesse" },
    vazioTitulo: "Nenhuma pessoa cadastrada na lista de usuários",
    vazioTexto: "As pessoas inscritas na sua lista aparecerão aqui",
    vazioFechada: "A lista de espera deste evento está desligada. Ligue para receber inscrições quando esgotar ou por um link de convite.",
    configurar: "Configurar lista de espera",
    exportado: "Arquivo exportado.",
    simular: "Simular inscrições",
    simularDica: (evento: string) => `Ferramenta do protótipo: cria ${QUANTIDADE_SIMULADA} inscrições fictícias em ${evento}. Em produção, a lista vem de quem se inscreve pelo link de compra ou pelo link de convite.`,
    limpar: "Limpar inscrições simuladas",
    limparDica: (evento: string) => `Ferramenta do protótipo: tira as inscrições fictícias de ${evento}. As inscrições reais continuam.`,
    simulado: "Inscrições simuladas.",
    limpo: "Inscrições simuladas removidas.",
};

type Coluna = keyof typeof T.cols;

const iniciais = (n: string) => {
    const p = n.trim().split(/\s+/);
    return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
};

/** "16/09/2026, 16:54" no horário do evento. */
const dataDeInteresse = (iso: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}, ${iso.slice(11, 16)}` : "—");
const valor = (i: InscritoNaLista, c: Coluna) => (c === "tipoDeDocumento" ? (i.tipoDeDocumento ? ROTULO_DO_DOCUMENTO[i.tipoDeDocumento] : "") : c === "inscritoEm" ? i.inscritoEm : (i as unknown as Record<string, string>)[c]);
const mostrar = (i: InscritoNaLista, c: Coluna) => (c === "inscritoEm" ? dataDeInteresse(i.inscritoEm) : valor(i, c) || "—");

export function ListaDeUsuarios() {
    return (
        <BackstageLayout activeSection="relatorios" activeItem="lista-de-usuarios">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
                <Corpo />
            </div>
        </BackstageLayout>
    );
}

function Corpo() {
    const evento = useEventoAtual();
    // Evento em contexto ou todos os eventos da organização (BKS-27), só com o que está no banco (LUS-08, LUS-09).
    const todosOsEventos = useTodosOsEventos();
    const { tabelas } = useBanco();
    const versao = useEventosVersao();
    const ids = useMemo(() => (todosOsEventos ? eventosDaOrganizacao.map((e) => e.id) : [evento.id]), [todosOsEventos, evento.id, versao]);
    const todos = useMemo(
        () =>
            ids.flatMap((id) => {
                const ev = tabelas.eventos[id];
                if (!ev) return [];
                // Quem entrou na lista de espera pelo link de compra (LUS-08) vem antes das inscrições simuladas (LUS-09).
                const reais = (ev.listaDeEspera ?? []).map((x): InscritoNaLista => ({ id: x.id, nome: x.nome, email: x.email, telefone: x.telefone, documento: "", tipoDeDocumento: "", inscritoEm: x.inscritoEm }));
                const sim = ev.listaDeUsuariosSimulada;
                return sim ? [...reais, ...inscritosDoEvento(id, sim.quantidade, sim.criadaEm)] : reais;
            }),
        [ids, tabelas.eventos],
    );
    // As duas entradas da lista de espera do evento em contexto desligadas: ninguém consegue se inscrever (LES-02).
    const configDaLista = tabelas.eventos[evento.id]?.configuracaoDaListaDeEspera;
    const listaFechada = !configDaLista?.aoEsgotar && !configDaLista?.convite;
    // A simulação é do evento em contexto, nos dois escopos.
    const simulado = !!tabelas.eventos[evento.id]?.listaDeUsuariosSimulada;
    const alternarSimulacao = () => {
        void atualizarEvento(evento.id, { listaDeUsuariosSimulada: simulado ? undefined : { quantidade: QUANTIDADE_SIMULADA, criadaEm: new Date().toISOString() } });
        setPagina(1);
        toast.success(simulado ? T.limpo : T.simulado);
    };
    const [busca, setBusca] = useState("");
    const [ordem, setOrdem] = useState<{ coluna: Coluna; dir: "asc" | "desc" }>({ coluna: "inscritoEm", dir: "desc" });
    const [pagina, setPagina] = useState(1);
    const [tamanho, setTamanho] = useState(10);

    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    const filtrados = useMemo(() => {
        const l = termo ? todos.filter((i) => [i.nome, i.email, i.telefone, i.documento].some((v) => v.toLocaleLowerCase("pt-BR").includes(termo))) : todos;
        const s = [...l].sort((a, b) => valor(a, ordem.coluna).localeCompare(valor(b, ordem.coluna), "pt-BR") || a.id.localeCompare(b.id));
        return ordem.dir === "desc" ? s.reverse() : s;
    }, [todos, termo, ordem]);
    const paginas = Math.max(1, Math.ceil(filtrados.length / tamanho));
    const atual = Math.min(pagina, paginas);
    const visiveis = filtrados.slice((atual - 1) * tamanho, atual * tamanho);

    // Clicar numa coluna parada ordena crescente; na ativa, inverte. Sempre volta à página 1 (LUS-12).
    const ordenar = (k: string) => {
        const c = k as Coluna;
        setOrdem((o) => (o.coluna === c ? { coluna: c, dir: o.dir === "asc" ? "desc" : "asc" } : { coluna: c, dir: "asc" }));
        setPagina(1);
    };

    const exportar = (formato: "excel" | "csv" | "pdf") => {
        const linhas = [Object.values(T.cols), ...filtrados.map((i) => [i.nome, i.tipoDeDocumento ? ROTULO_DO_DOCUMENTO[i.tipoDeDocumento] : "", i.documento, i.email, i.telefone, i.inscritoEm])];
        const csv = linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(formato === "csv" ? "," : ";")).join("\n");
        const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = formato === "csv" ? "waitlist.csv" : "waitlist.xls";
        a.click();
        URL.revokeObjectURL(url);
        toast.success(T.exportado);
    };

    const colunas: Coluna[] = ["nome", "tipoDeDocumento", "documento", "email", "telefone", "inscritoEm"];

    return (
        <>
            <RelatorioPageHeader title={T.titulo} withFilters={false} actions={todos.length > 0 ? <ExportMenu formats={["excel", "csv"]} size="sm" onExport={exportar} /> : undefined} />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="flex flex-col gap-3 rounded-xl bg-primary p-5 ring-1 ring-secondary">
                    <FeaturedIcon icon={Users01} color="gray" theme="modern" size="lg" />
                    <span className="text-sm text-tertiary">{T.metrica}</span>
                    <span className="text-display-sm font-semibold text-primary tabular-nums">{todos.length.toLocaleString("pt-BR")}</span>
                </div>
            </div>

            <section className="overflow-clip rounded-xl bg-primary ring-1 ring-secondary">
                {todos.length > 0 && (
                    <>
                        <h2 className="border-b border-secondary px-4 py-4 text-md font-semibold text-primary md:px-5">{T.lista}</h2>
                        <div className="border-b border-secondary px-4 py-3 md:px-5">
                            <InputBase
                                size="sm"
                                icon={SearchLg}
                                aria-label={T.buscarRotulo}
                                placeholder={T.buscar}
                                value={busca}
                                onChange={(v: unknown) => {
                                    setBusca(typeof v === "string" ? v : ((v as { target?: { value?: string } })?.target?.value ?? ""));
                                    setPagina(1);
                                }}
                                wrapperClassName="w-full sm:max-w-xs"
                            />
                        </div>
                    </>
                )}
                {filtrados.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                        <EmptyState size="sm">
                            <EmptyState.Header>
                                <EmptyState.FeaturedIcon icon={UserPlus01} color="gray" theme="modern" />
                            </EmptyState.Header>
                            <EmptyState.Content>
                                <EmptyState.Title>{T.vazioTitulo}</EmptyState.Title>
                                <EmptyState.Description>{todos.length === 0 && !todosOsEventos && listaFechada ? T.vazioFechada : T.vazioTexto}</EmptyState.Description>
                            </EmptyState.Content>
                            {/* Lista vazia de um evento: leva para onde o produtor liga a lista de espera (LUS-11, LES). */}
                            {todos.length === 0 && !todosOsEventos && (
                                <EmptyState.Footer>
                                    <Button size="md" color={listaFechada ? "primary" : "secondary"} href="/backstage/marketing/lista-de-espera">
                                        {T.configurar}
                                    </Button>
                                </EmptyState.Footer>
                            )}
                        </EmptyState>
                    </div>
                ) : (
                    <>
                        {/* Tabela no desktop; no celular, um cartão por pessoa (UI-MOB-005). */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-left text-sm" aria-label={T.lista}>
                                <thead className="bg-secondary_subtle">
                                    <tr className="border-b border-secondary">
                                        {colunas.map((c) => (
                                            <th key={c} scope="col" className="px-5 py-3 font-medium whitespace-nowrap text-tertiary">
                                                <SortableHeader label={T.cols[c]} sortKey={c} activeKey={ordem.coluna} dir={ordem.dir} onSort={ordenar} />
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary">
                                    {visiveis.map((i) => (
                                        <tr key={i.id}>
                                            <th scope="row" className="px-5 py-3 font-medium">
                                                <span className="flex min-w-0 items-center gap-3">
                                                    <Avatar size="sm" initials={iniciais(i.nome)} />
                                                    <span className="truncate text-primary">{i.nome}</span>
                                                </span>
                                            </th>
                                            {colunas.slice(1).map((c) => (
                                                <td key={c} className="px-5 py-3 whitespace-nowrap text-tertiary tabular-nums">
                                                    {mostrar(i, c)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="md:hidden">
                            {visiveis.map((i) => (
                                <article key={i.id} className="flex flex-col gap-3 border-b border-secondary px-4 py-4 last:border-b-0">
                                    <div className="flex items-center gap-3">
                                        <Avatar size="sm" initials={iniciais(i.nome)} />
                                        <div className="flex min-w-0 flex-col">
                                            <span className="truncate text-sm font-medium text-primary">{i.nome}</span>
                                            <span className="truncate text-sm text-tertiary">{i.email || "—"}</span>
                                        </div>
                                    </div>
                                    <dl className="flex flex-col gap-1.5 text-sm">
                                        {(
                                            [
                                                [UserSquare, "tipoDeDocumento"],
                                                [UserSquare, "documento"],
                                                [Phone01, "telefone"],
                                                [Calendar, "inscritoEm"],
                                            ] as const
                                        ).map(([Icone, c]) => (
                                            <div key={c} className="flex items-center gap-2">
                                                <Icone className="size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />
                                                <dt className="text-tertiary">{T.cols[c]}:</dt>
                                                <dd className="min-w-0 truncate text-secondary tabular-nums">{mostrar(i, c)}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                </article>
                            ))}
                        </div>
                        <PaginationCardAdvanced
                            page={atual}
                            total={paginas}
                            pageSize={tamanho}
                            onPageChange={(p: number) => setPagina(p)}
                            onPageSizeChange={(s: number) => {
                                setTamanho(s);
                                setPagina(1);
                            }}
                        />
                    </>
                )}
            </section>

            {/* Ferramenta de protótipo (LUS-09): em produção a lista vem de quem se inscreve pelo link de compra. */}
            <div className="flex flex-col items-start gap-1 border-t border-dashed border-secondary pt-4">
                <Button color="link-gray" size="sm" onClick={alternarSimulacao}>
                    {simulado ? T.limpar : T.simular}
                </Button>
                <span className="text-xs text-quaternary">{simulado ? T.limparDica(evento.nome) : T.simularDica(evento.nome)}</span>
            </div>
        </>
    );
}
