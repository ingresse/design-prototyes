import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CalendarDate, ClipboardCheck, Ticket01, Users01 } from "@untitledui/icons";
import { Progress } from "@/components/application/progress-steps/progress-steps";
import type { ProgressFeaturedIconType } from "@/components/application/progress-steps/progress-types";
import { Button } from "@/components/base/buttons/button";
import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { Surgir } from "@/components/foundations/transicao";
import type { ComprasEmGrupo, Evento, ItemDaAbertura } from "@/plataforma";
import { CabecalhoDaPagina } from "../../components/cabecalho-da-pagina";
import { CampoNumero } from "../../components/campo-numero";
import { CampoData, CampoHora } from "../../components/campos-de-data-e-hora";
import { dataEHora } from "../../components/formatar-data";
import { ArvoreDeIngressos, useResumoDeIngressos, useSelecaoDeIngressos } from "../../components/seletor-de-ingressos";
import { useCatalogo } from "../../itens/data/catalogo";
import { formatar, useTextosItens } from "../../itens/data/textos-itens";
import { salvarCompras, validarPeriodo } from "../data/compras-em-grupo";

/*
 * Assistente das compras em grupo (CEG-10 a CEG-19): três passos, cada "Continuar" grava. Também
 * abre direto num passo pelo "Editar formulário" (período ou itens), e aí "Salvar" volta à fila.
 */

const T = {
    titulo: "Compras em grupo",
    /** Editando, o voltar leva à fila de pedidos (tela "Compras em grupo"). */
    voltarFila: "Compras em grupo",
    continuar: "Continuar",
    publicar: "Publicar formulário",
    salvar: "Salvar",
    passos: ["Período e limites", "Itens do formulário", "Revisão"],
    passosDica: ["Quem pode pedir e quando", "O que o grupo pode comprar", "Confira e publique"],
    limites: "Limites do grupo de compra",
    limitesDica: "Defina a quantidade de pessoas que um gestor de grupo pode solicitar",
    minimo: "Mínimo de pessoas no grupo de compra",
    maximo: "Máximo de pessoas no grupo de compra",
    periodo: "Período de disponibilidade do formulário de pedidos",
    periodoDica: "Defina o período em que o formulário de pedidos estará disponível para gestores de grupos e assessorias solicitarem as compras.",
    inicio: "Início",
    fim: "Fim",
    hora: "Hora",
    prazo: "Prazo para comprar no grupo",
    prazoDica: "Após a aprovação de um pedido o gestor poderá fazer as compras de seu grupo após quanto tempo?",
    porData: "Até uma data específica",
    porDataDica: "Ex.: as compras podem acontecer até a véspera do evento.",
    porDias: "Por um período após a aprovação",
    porDiasDica: "Ex.: Gestores terão 30 dias corridos para finalizar os pagamentos",
    dataLimite: "Data limite",
    dias: "Dias após a aprovação",
    avisoPrazo: "Atenção: ao salvar, o prazo dos {n} grupos já aprovados será atualizado. Uma data específica vale para todos; dias contam a partir da aprovação de cada grupo.",
    etapa: "Etapa {n} de 3: {nome}",
    arvore: "Ingressos do formulário",
    vagas: { one: "{n} vaga", other: "{n} vagas" },
    inscricoes: "Inscrições",
    selecioneUm: "Selecione ao menos um ingresso para o formulário.",
    remover: "Remover",
    removerItem: "Remover {item}",
    mostrarMais: { one: "Mostrar mais {n}", other: "Mostrar mais {n}" },
    verTodos: "Ver todos",
    verMenos: "Ver menos",
    porSetor: { one: "{grupo}: {n} ingresso", other: "{grupo}: {n} ingressos" },
    revise: "Revise a configuração",
    reviseDica: "Confira os dados antes de publicar o formulário de pedidos.",
    revLimites: "De {min} a {max} pessoas por pedido",
    revPeriodo: "De {inicio} até {fim}",
    revAteData: "Até {data}",
    revDias: "{dias} dias após a aprovação",
    revItens: "Itens disponíveis para o grupo",
    revItensN: { one: "{n} ingresso selecionado", other: "{n} ingressos selecionados" },
    salvo: "Configuração salva.",
    publicado: "Formulário publicado. Divulgue o link para receber pedidos.",
    erroSalvar: "Não foi possível salvar a configuração.",
};

const f = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

const Cartao = ({ titulo, dica, children }: { titulo: string; dica?: string; children: ReactNode }) => (
    <section className="flex flex-col gap-4 rounded-2xl bg-primary p-5 ring-1 ring-secondary md:p-6">
        <div className="flex flex-col gap-1">
            <h2 className="text-md font-semibold text-primary">{titulo}</h2>
            {dica && <p className="text-sm text-tertiary">{dica}</p>}
        </div>
        {children}
    </section>
);

const partes = (iso?: string) => ({ data: iso?.slice(0, 10) ?? "", hora: iso?.slice(11, 16) ?? "" });
const juntar = (data: string, hora: string) => (data ? `${data}T${hora || "00:00"}` : undefined);

/**
 * O passo vem do endereço (`?passo=N`, CEG-74): o Voltar do navegador volta um passo em vez de sair
 * do fluxo. Quem usa passa `passo` e `onPasso`.
 */
export function Assistente({ evento, modulo, passo, onPasso, editando = false, onSair }: { evento: Evento; modulo: ComprasEmGrupo; passo: number; onPasso: (p: number) => void; editando?: boolean; onSair: () => void }) {
    const { vendidos } = useCatalogo();
    const { numero, plural } = useTextosItens();
    const resumir = useResumoDeIngressos();
    const setPasso = onPasso;
    const [m, setM] = useState<ComprasEmGrupo>(modulo);
    const [tentou, setTentou] = useState(false);
    const [gravando, setGravando] = useState(false);
    const [limite, setLimite] = useState(20);
    const [verTodos, setVerTodos] = useState(false);
    const erros = validarPeriodo(m);
    const mostrar = (k: keyof typeof erros) => (tentou ? erros[k] : undefined);
    const quando = (iso?: string) => (iso ? dataEHora(iso) : "não definido");

    // Passo 2: a árvore comum com escala (CEG-73); o que fica marcado vira a lista de ingressos do módulo.
    const [iniciais] = useState<ItemDaAbertura[]>(() => modulo.itens.map((id) => ({ tipo: "ingresso" as const, id })));
    const selecao = useSelecaoDeIngressos(evento, iniciais);
    const porId = useMemo(() => new Map(evento.sessoes.flatMap((s) => s.grupos.flatMap((g) => g.ingressos.map((t) => [t.id, { t, g, s }] as const)))), [evento]);
    const vagas = (id: string) => {
        const t = porId.get(id)?.t;
        return t ? t.lotes.reduce((n, l) => n + Math.max(0, l.quantidade - (vendidos.get(l.id) ?? 0)), 0) : 0;
    };
    const escolhidos = useMemo(() => selecao.resultado().map((i) => i.id), [selecao.setores, selecao.ingressos]);
    const itens = passo === 1 ? escolhidos : m.itens;
    const totalDeVagas = useMemo(() => itens.reduce((n, id) => n + vagas(id), 0), [itens, vendidos]);
    const variasSessoes = evento.sessoes.length > 1;
    // Revisão: contagem por setor (CEG-75), não a lista de todos os ingressos.
    const porSetor = useMemo(() => {
        const mapa = new Map<string, { nome: string; n: number }>();
        for (const id of m.itens) {
            const x = porId.get(id);
            if (!x) continue;
            const chave = x.g.id;
            const nome = variasSessoes ? `${x.g.nome}, ${dataEHora(x.s.inicio)}` : x.g.nome;
            mapa.set(chave, { nome, n: (mapa.get(chave)?.n ?? 0) + 1 });
        }
        return [...mapa.values()];
    }, [m.itens, porId, variasSessoes]);
    const aprovados = m.solicitacoes.filter((s) => s.status === "aprovada").length;
    const prazoMudou = JSON.stringify(m.prazo) !== JSON.stringify(modulo.prazo);

    const steps: ProgressFeaturedIconType[] = T.passos.map((title, i) => ({
        title,
        description: T.passosDica[i],
        status: i < passo ? "complete" : i === passo ? "current" : "incomplete",
        icon: [CalendarDate, Ticket01, ClipboardCheck][i],
    }));

    const avancar = async () => {
        if (passo === 0) {
            setTentou(true);
            if (Object.keys(erros).length) return;
        }
        if (passo === 1 && escolhidos.length === 0) return;
        setGravando(true);
        try {
            const final = passo === 2;
            const base = passo === 1 ? { ...m, itens: escolhidos } : m;
            if (passo === 1) setM(base);
            const prox = final ? { ...base, publicado: true, habilitado: true } : base;
            await salvarCompras(evento, prox);
            if (final) {
                toast.success(T.publicado);
                onSair();
            } else if (editando) {
                toast.success(T.salvo);
                onSair();
            } else setPasso(passo + 1);
        } catch {
            toast.error(T.erroSalvar);
        } finally {
            setGravando(false);
        }
    };

    return (
        <div className="flex min-w-0 flex-1 flex-col gap-8">
            {/* O voltar diz para onde vai: a fila (editando), a tela de Compras em grupo (1º passo) ou o passo anterior. */}
            <CabecalhoDaPagina
                voltar={{
                    rotulo: editando ? T.voltarFila : passo === 0 ? T.titulo : T.passos[passo - 1],
                    onClick: () => (passo === 0 || editando ? onSair() : setPasso(passo - 1)),
                }}
                titulo={T.titulo}
                acoes={
                    <Button color="primary" size="md" isLoading={gravando} showTextWhileLoading isDisabled={passo === 1 && escolhidos.length === 0} onClick={() => void avancar()}>
                        {editando ? T.salvar : passo === 2 ? T.publicar : T.continuar}
                    </Button>
                }
            />
            {!editando && (
                <>
                    <Progress.IconsWithText items={steps} size="sm" type="number" orientation="horizontal" className="max-w-[860px] max-md:hidden" />
                    {/* No celular, uma linha só no lugar do stepper vertical de 200 px (CEG-76). */}
                    <p className="text-sm font-semibold text-secondary md:hidden">{formatar(T.etapa, { n: passo + 1, nome: T.passos[passo] })}</p>
                </>
            )}

            {passo === 0 && (
                <div className="flex max-w-3xl flex-col gap-4">
                    <Cartao titulo={T.limites} dica={T.limitesDica}>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <CampoNumero label={T.minimo} isRequired placeholder="Ex.: 10" valor={m.minimo} vazio minimo={0} onChange={(v) => setM({ ...m, minimo: v })} isInvalid={!!mostrar("minimo")} hint={mostrar("minimo")} />
                            <CampoNumero label={T.maximo} isRequired placeholder="Ex.: 5.000" valor={m.maximo} vazio minimo={0} onChange={(v) => setM({ ...m, maximo: v })} isInvalid={!!mostrar("maximo")} hint={mostrar("maximo")} />
                        </div>
                    </Cartao>
                    <Cartao titulo={T.periodo} dica={T.periodoDica}>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {(["inicio", "fim"] as const).map((k) => (
                                <div key={k} className="grid grid-cols-[1fr_auto] gap-3">
                                    <CampoData label={T[k]} isRequired valor={partes(m[k]).data} onChange={(d) => setM({ ...m, [k]: juntar(d, partes(m[k]).hora) })} isInvalid={!!mostrar(k)} hint={mostrar(k)} />
                                    <div className="w-28">
                                        <CampoHora label={T.hora} valor={partes(m[k]).hora} onChange={(h) => setM({ ...m, [k]: juntar(partes(m[k]).data, h) })} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Cartao>
                    <Cartao titulo={T.prazo} dica={T.prazoDica}>
                        <RadioGroup aria-label={T.prazo} value={m.prazo.tipo} onChange={(v) => setM({ ...m, prazo: v === "dias" ? { tipo: "dias", dias: undefined } : { tipo: "data", data: undefined } })} className="flex flex-col gap-4">
                            <RadioButton value="data" label={T.porData} hint={T.porDataDica} />
                            <Surgir visivel={m.prazo.tipo === "data"} gap={16}>
                                <div className="grid grid-cols-[1fr_auto] gap-3 pl-6 sm:max-w-md">
                                    <CampoData label={T.dataLimite} isRequired valor={partes(m.prazo.tipo === "data" ? m.prazo.data : "").data} onChange={(d) => setM({ ...m, prazo: { tipo: "data", data: juntar(d, partes(m.prazo.tipo === "data" ? m.prazo.data : "").hora) } })} isInvalid={!!mostrar("prazo")} hint={mostrar("prazo")} />
                                    <div className="w-28">
                                        <CampoHora label={T.hora} valor={partes(m.prazo.tipo === "data" ? m.prazo.data : "").hora} onChange={(h) => setM({ ...m, prazo: { tipo: "data", data: juntar(partes(m.prazo.tipo === "data" ? m.prazo.data : "").data, h) } })} />
                                    </div>
                                </div>
                            </Surgir>
                            <RadioButton value="dias" label={T.porDias} hint={T.porDiasDica} />
                            <Surgir visivel={m.prazo.tipo === "dias"} gap={16}>
                                <div className="pl-6 sm:max-w-60">
                                    <CampoNumero label={T.dias} isRequired placeholder="Ex.: 30" valor={m.prazo.tipo === "dias" ? m.prazo.dias : undefined} vazio minimo={0} onChange={(v) => setM({ ...m, prazo: { tipo: "dias", dias: v } })} isInvalid={!!mostrar("prazo")} hint={mostrar("prazo")} />
                                </div>
                            </Surgir>
                        </RadioGroup>
                        {aprovados > 0 && prazoMudou && <p className="rounded-lg bg-warning-primary p-3 text-sm text-warning-primary">{f(T.avisoPrazo, { n: aprovados })}</p>}
                    </Cartao>
                </div>
            )}

            {passo === 1 && (
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
                    <div className="min-w-0">
                        <ArvoreDeIngressos evento={evento} selecao={selecao} rotulo={T.arvore} />
                    </div>
                    <aside aria-label={T.inscricoes} className="flex h-max flex-col gap-3 rounded-2xl bg-primary p-4 ring-1 ring-secondary lg:sticky lg:top-6">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex flex-col">
                                <span className="text-md font-semibold text-primary">{T.inscricoes}</span>
                                <span role="status" className="text-sm text-tertiary">
                                    {resumir(selecao.total.ingressos, selecao.total.setores)}
                                </span>
                            </div>
                            <span className="text-sm text-tertiary tabular-nums">{plural(T.vagas, totalDeVagas)}</span>
                        </div>
                        {escolhidos.length === 0 ? (
                            <p className="py-6 text-center text-sm text-tertiary">{T.selecioneUm}</p>
                        ) : (
                            <>
                                <ul className="flex flex-col divide-y divide-secondary">
                                    {escolhidos.slice(0, limite).map((id) => {
                                        const x = porId.get(id);
                                        if (!x) return null;
                                        return (
                                            <li key={id} className="flex items-center gap-3 py-2.5">
                                                <div className="flex min-w-0 flex-1 flex-col">
                                                    <span className="truncate text-sm font-medium text-primary">{x.t.nome}</span>
                                                    <span className="truncate text-sm text-tertiary">{variasSessoes ? `${x.g.nome}, ${dataEHora(x.s.inicio)}` : x.g.nome}</span>
                                                    <span className="text-sm text-tertiary tabular-nums">{plural(T.vagas, vagas(id))}</span>
                                                </div>
                                                <Button color="link-gray" size="sm" aria-label={formatar(T.removerItem, { item: x.t.nome })} onClick={() => selecao.alternarIngresso(x.g, x.t, false)}>
                                                    {T.remover}
                                                </Button>
                                            </li>
                                        );
                                    })}
                                </ul>
                                {escolhidos.length > limite && (
                                    <div>
                                        <Button color="link-color" size="sm" onClick={() => setLimite((n) => n + 20)}>
                                            {plural(T.mostrarMais, Math.min(20, escolhidos.length - limite))}
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </aside>
                </div>
            )}

            {passo === 2 && (
                <div className="flex max-w-3xl flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-lg font-semibold text-primary">{T.revise}</h2>
                        <p className="text-sm text-tertiary">{T.reviseDica}</p>
                    </div>
                    <Cartao titulo={T.limites}>
                        <p className="flex items-center gap-2 text-sm text-secondary">
                            <Users01 className="size-4 text-fg-quaternary" aria-hidden="true" />
                            {f(T.revLimites, { min: numero(m.minimo ?? 0), max: numero(m.maximo ?? 0) })}
                        </p>
                    </Cartao>
                    <Cartao titulo="Período de disponibilidade">
                        <p className="text-sm text-secondary">{f(T.revPeriodo, { inicio: quando(m.inicio), fim: quando(m.fim) })}</p>
                    </Cartao>
                    <Cartao titulo={T.prazo}>
                        <p className="text-sm text-secondary">{m.prazo.tipo === "data" ? f(T.revAteData, { data: quando(m.prazo.data) }) : f(T.revDias, { dias: m.prazo.dias ?? 0 })}</p>
                    </Cartao>
                    <Cartao titulo={T.revItens} dica={plural(T.revItensN, m.itens.length)}>
                        <ul className="flex flex-col gap-1 text-sm text-secondary">
                            {(verTodos ? porSetor : porSetor.slice(0, 8)).map((x) => (
                                <li key={x.nome}>{plural(T.porSetor, x.n, { grupo: x.nome })}</li>
                            ))}
                        </ul>
                        {porSetor.length > 8 && (
                            <div>
                                <Button color="link-color" size="sm" aria-expanded={verTodos} onClick={() => setVerTodos((v) => !v)}>
                                    {verTodos ? T.verMenos : `${T.verTodos} (${numero(porSetor.length)})`}
                                </Button>
                            </div>
                        )}
                    </Cartao>
                </div>
            )}
        </div>
    );
}
