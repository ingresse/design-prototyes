import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Ticket01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Surgir } from "@/components/foundations/transicao";
import { novoId, type Evento } from "@/plataforma";
import { BackstageLayout } from "../../components/Backstage";
import { CabecalhoDaPagina } from "../../components/cabecalho-da-pagina";
import { dataEHora } from "../../components/formatar-data";
import { ArvoreDeIngressos, useResumoDeIngressos, useSelecaoDeIngressos } from "../../components/seletor-de-ingressos";
import { useCatalogo } from "../../itens/data/catalogo";
import { formatar, useTextosItens } from "../../itens/data/textos-itens";
import { conjuntoDoIngresso, ingressosDoEvento, LIMITE_DO_NOME, loteVigente, salvarConjuntos, viradasPossiveis } from "../data/conjuntos";
import { ROTA_LOTES_SINCRONIZADOS } from "./lotes-sincronizados";

/*
 * Criar conjunto de lotes sincronizados (LSI-10 a LSI-16, LSI-32 a LSI-36): nome e ingressos, numa
 * página só. Os ingressos vêm na árvore comum com escala (`ArvoreDeIngressos`), só com os que podem
 * entrar; os que não podem (já em outro conjunto, inativos ou sem lote à venda) são contados abaixo.
 * Cada ingresso entra a partir do lote vigente. Os gatilhos das viradas são definidos depois, na lista.
 */

const T = {
    titulo: "Novo conjunto sincronizado",
    voltar: "Cancelar",
    criar: "Criar conjunto",
    secaoNome: "Nome do conjunto",
    nome: "Nome",
    nomePlaceholder: "Exemplo: Só camarotes",
    erroNome: "Informe o nome do conjunto.",
    secaoItens: "Ingressos que viram de lote juntos",
    nota: "A quantidade de viradas é baseada no ingresso com mais lotes.",
    arvore: "Ingressos do conjunto",
    foraTitulo: { one: "{n} ingresso não aparece aqui", other: "{n} ingressos não aparecem aqui" },
    foraTexto: "Um ingresso fica em um conjunto só, e precisa estar ativo e com lote à venda.",
    foraDetalhe: "Ver quais",
    foraOcultar: "Ocultar",
    jaEm: "Já está em “{c}”",
    inativo: "Inativo",
    semSaldo: "Sem lote à venda",
    eMais: { one: "e mais {n}", other: "e mais {n}" },
    itens: "Itens",
    nenhum: "Você ainda não selecionou nenhum ingresso.",
    removerTodos: "Remover todos",
    remover: "Remover",
    removerItem: "Remover {item}",
    loteSincronizado: "Começa no lote {n}",
    mostrarMais: { one: "Mostrar mais {n}", other: "Mostrar mais {n}" },
    erroItens: "Selecione ao menos um ingresso para criar o conjunto.",
    erroViradas: "Escolha ao menos um ingresso com mais de um lote: com um lote só não há virada.",
    criado: "Conjunto criado com {n}. Defina o gatilho para começar.",
    erroCriar: "Ocorreu um erro inesperado. Tente novamente.",
};

const PASSO = 20;

export function NovoConjunto() {
    const { evento, carregando } = useCatalogo();
    return (
        <BackstageLayout activeSection="itens" activeItem="lotes-sincronizados">
            {carregando || !evento ? <span role="status" aria-label="Carregando..." className="h-40 w-full animate-pulse rounded-2xl bg-secondary" /> : <Formulario evento={evento} />}
        </BackstageLayout>
    );
}

function Formulario({ evento }: { evento: Evento }) {
    const navigate = useNavigate();
    const { vendidos } = useCatalogo();
    const { plural } = useTextosItens();
    const resumir = useResumoDeIngressos();
    const [nome, setNome] = useState("");
    const [tentou, setTentou] = useState(false);
    const [erroItens, setErroItens] = useState<string>();
    const [gravando, setGravando] = useState(false);
    const [verFora, setVerFora] = useState(false);
    const [limite, setLimite] = useState(PASSO);
    const campoNome = useRef<HTMLDivElement>(null);
    const mapa = useMemo(() => ingressosDoEvento(evento), [evento]);

    // A árvore recebe só os ingressos que podem entrar (LSI-13): os outros ficam contados à parte (LSI-33).
    const { elegivel, fora } = useMemo(() => {
        const fora: { nome: string; motivo: string }[] = [];
        const elegivel: Evento = {
            ...evento,
            sessoes: evento.sessoes
                .map((s) => ({
                    ...s,
                    grupos: s.grupos
                        .map((g) => ({
                            ...g,
                            ingressos: g.ingressos.filter((t) => {
                                const outro = conjuntoDoIngresso(evento, t.id);
                                const motivo = outro ? formatar(T.jaEm, { c: outro.nome }) : !t.ativo ? T.inativo : !loteVigente(t, vendidos) ? T.semSaldo : null;
                                if (motivo) fora.push({ nome: `${g.nome}, ${t.nome}`, motivo });
                                return !motivo;
                            }),
                        }))
                        .filter((g) => g.ingressos.length > 0),
                }))
                .filter((s) => s.grupos.length > 0),
        };
        return { elegivel, fora };
    }, [evento, vendidos]);

    const selecao = useSelecaoDeIngressos(elegivel, []);
    // O grupo da árvore (só com os ingressos que podem entrar), para "Remover" sem marcar os de fora.
    const grupoNaArvore = useMemo(() => new Map(elegivel.sessoes.flatMap((s) => s.grupos.flatMap((g) => g.ingressos.map((t) => [t.id, g] as const)))), [elegivel]);
    const marcados = useMemo(() => selecao.resultado().map((i) => i.id), [selecao.setores, selecao.ingressos]);
    const variasSessoes = evento.sessoes.length > 1;
    // Mudou a escolha: o erro da seção sai (volta no próximo "Criar conjunto", se ainda valer).
    useEffect(() => setErroItens(undefined), [marcados]);

    const criar = async () => {
        setTentou(true);
        const n = nome.trim();
        if (!n) return campoNome.current?.querySelector("input")?.focus();
        // Os erros dos ingressos aparecem na seção, perto do problema (LSI-34), em vez de toast.
        if (!marcados.length) return setErroItens(T.erroItens);
        const itens = marcados.flatMap((id) => {
            const c = mapa.get(id);
            const lote = c && loteVigente(c.tipo, vendidos);
            return c && lote ? [{ ingressoId: id, loteInicialId: lote.id, tipo: c.tipo, inicio: c.tipo.lotes.indexOf(lote) }] : [];
        });
        const viradas = viradasPossiveis(itens);
        if (viradas <= 0) return setErroItens(T.erroViradas);
        setErroItens(undefined);
        setGravando(true);
        try {
            await salvarConjuntos(evento, [
                ...(evento.conjuntosSincronizados ?? []),
                { id: novoId("lsi"), nome: n.slice(0, LIMITE_DO_NOME), itens: itens.map(({ ingressoId, loteInicialId }) => ({ ingressoId, loteInicialId })), gatilhos: {}, criadoEm: new Date().toISOString() },
            ]);
            toast.success(formatar(T.criado, { n: viradas === 1 ? "1 virada" : `${viradas} viradas` }));
            navigate(ROTA_LOTES_SINCRONIZADOS);
        } catch {
            toast.error(T.erroCriar);
        } finally {
            setGravando(false);
        }
    };

    const visiveis = marcados.slice(0, limite);

    return (
        <div className="flex min-w-0 flex-1 flex-col gap-8">
            <CabecalhoDaPagina
                voltar={{ rotulo: "Lotes sincronizados", href: ROTA_LOTES_SINCRONIZADOS }}
                titulo={T.titulo}
                acoes={
                    <>
                        <Button color="secondary" size="md" href={ROTA_LOTES_SINCRONIZADOS}>
                            {T.voltar}
                        </Button>
                        <Button color="primary" size="md" isLoading={gravando} showTextWhileLoading onClick={() => void criar()}>
                            {T.criar}
                        </Button>
                    </>
                }
            />

            <section aria-labelledby="secao-nome" className="flex flex-col gap-4">
                <h2 id="secao-nome" className="text-lg font-semibold text-primary">
                    {T.secaoNome}
                </h2>
                <div ref={campoNome} className="sm:max-w-md">
                    <Input label={T.nome} isRequired placeholder={T.nomePlaceholder} maxLength={LIMITE_DO_NOME} value={nome} onChange={setNome} isInvalid={tentou && !nome.trim()} hint={tentou && !nome.trim() ? T.erroNome : undefined} />
                </div>
            </section>

            <section aria-labelledby="secao-itens" className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <h2 id="secao-itens" className="text-lg font-semibold text-primary">
                        {T.secaoItens}
                    </h2>
                    <p className="text-sm text-tertiary">{T.nota}</p>
                </div>
                <Surgir visivel={!!erroItens}>
                    <p role="alert" className="rounded-lg bg-error-primary p-3 text-sm text-error-primary ring-1 ring-error_subtle">
                        {erroItens}
                    </p>
                </Surgir>
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
                    <div className="flex min-w-0 flex-col gap-4">
                        <ArvoreDeIngressos evento={elegivel} selecao={selecao} rotulo={T.arvore} />
                        {fora.length > 0 && (
                            <div className="flex flex-col gap-2 rounded-xl bg-secondary_subtle p-4 ring-1 ring-secondary">
                                <span className="text-sm font-semibold text-secondary">{plural(T.foraTitulo, fora.length)}</span>
                                <span className="text-sm text-tertiary">{T.foraTexto}</span>
                                <div>
                                    <Button color="link-color" size="sm" aria-expanded={verFora} onClick={() => setVerFora((v) => !v)}>
                                        {verFora ? T.foraOcultar : T.foraDetalhe}
                                    </Button>
                                </div>
                                <Surgir visivel={verFora}>
                                    <ul className="flex flex-col gap-1 text-sm text-tertiary">
                                        {fora.slice(0, 30).map((x, i) => (
                                            <li key={i}>
                                                <span className="font-medium text-secondary">{x.nome}</span>: {x.motivo}
                                            </li>
                                        ))}
                                        {fora.length > 30 && <li>{plural(T.eMais, fora.length - 30)}</li>}
                                    </ul>
                                </Surgir>
                            </div>
                        )}
                    </div>

                    <aside aria-label={T.itens} className="flex h-max flex-col gap-3 rounded-2xl bg-primary p-4 ring-1 ring-secondary lg:sticky lg:top-6">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex flex-col">
                                <span className="text-md font-semibold text-primary">{T.itens}</span>
                                <span role="status" className="text-sm text-tertiary">
                                    {resumir(selecao.total.ingressos, selecao.total.setores)}
                                </span>
                            </div>
                            {marcados.length > 0 && (
                                <Button color="link-gray" size="sm" onClick={() => elegivel.sessoes.forEach((s) => selecao.alternarSessao(s.id, false))}>
                                    {T.removerTodos}
                                </Button>
                            )}
                        </div>
                        {marcados.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-8 text-center">
                                <Ticket01 className="size-6 text-fg-quaternary" aria-hidden="true" />
                                <p className="text-sm text-tertiary">{T.nenhum}</p>
                            </div>
                        ) : (
                            <>
                                <ul className="flex flex-col divide-y divide-secondary">
                                    {visiveis.map((id) => {
                                        const c = mapa.get(id);
                                        if (!c) return null;
                                        const lote = loteVigente(c.tipo, vendidos);
                                        return (
                                            <li key={id} className="flex items-start gap-3 py-3">
                                                <div className="flex min-w-0 flex-1 flex-col">
                                                    <span className="truncate text-sm font-medium text-primary">{c.tipo.nome}</span>
                                                    <span className="truncate text-sm text-tertiary">{variasSessoes ? `${c.grupo.nome}, ${dataEHora(c.sessao.inicio)}` : c.grupo.nome}</span>
                                                    {lote && <span className="text-sm font-medium text-brand-secondary">{formatar(T.loteSincronizado, { n: c.tipo.lotes.indexOf(lote) + 1 })}</span>}
                                                </div>
                                                <Button color="link-gray" size="sm" aria-label={formatar(T.removerItem, { item: c.tipo.nome })} onClick={() => selecao.alternarIngresso(grupoNaArvore.get(id) ?? c.grupo, c.tipo, false)}>
                                                    {T.remover}
                                                </Button>
                                            </li>
                                        );
                                    })}
                                </ul>
                                {marcados.length > visiveis.length && (
                                    <div>
                                        <Button color="link-color" size="sm" onClick={() => setLimite((n) => n + PASSO)}>
                                            {plural(T.mostrarMais, Math.min(PASSO, marcados.length - visiveis.length))}
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </aside>
                </div>
            </section>
        </div>
    );
}
