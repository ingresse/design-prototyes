import { useDeferredValue, useEffect, useId, useMemo, useState } from "react";
import { ChevronDown, Edit01, SearchLg } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input, InputBase } from "@/components/base/input/input";
import { Surgir } from "@/components/foundations/transicao";
import { cx } from "@/utils/cx";
import { BotaoMostrarMais, paraBusca, useMostrarMais } from "../../itens/components/escala";
import { INGRESSOS, ITEM_POR_ID, SESSOES, legendaDeSessao, type ItemCatalogo, type Sessao } from "../data/catalogo-evento";
import { itemValido, itensDoCanal, plural, type CanalDoGrupo, type CotaGrupo } from "../data/equipe";
import { CotaEditavel } from "./cota-editavel";
import { soNumero } from "./cotas-por-item";
import { BarraUso } from "./ui-cotas";

/* ------------------------------------------------------------------ */
/*  Itens e uso do canal (ECO-92)                                      */
/*                                                                     */
/*  Escala de 1 a milhares de ingressos (UI-LST-001, UI-LST-002):      */
/*  sessão › setor › ingresso, tudo recolhido, com busca e "Mostrar    */
/*  mais" em cada nível. O setor soma o uso dos ingressos dele e, na   */
/*  cota por item, define a cota de todos de uma vez. Só os setores    */
/*  abertos desenham ingressos.                                        */
/* ------------------------------------------------------------------ */

/** A partir de quantos itens a busca aparece. */
const LIMIAR_BUSCA = 8;
const PASSO_SESSOES = 10;
const PASSO_SETORES = 30;
const PASSO_ITENS = 20;

interface Setor {
    chave: string;
    nome: string;
    itens: ItemCatalogo[];
}

interface SessaoDoUso {
    sessao?: Sessao;
    setores: Setor[];
}

/** Agrupa por sessão e setor, na ordem do catálogo. Produtos e combos ficam no fim, sem sessão, como dois "setores". */
function agrupar(itens: ItemCatalogo[]): SessaoDoUso[] {
    const porSessao = new Map<string, Map<string, Setor>>();
    const produtos: ItemCatalogo[] = [];
    const combos: ItemCatalogo[] = [];
    for (const item of itens) {
        if (item.tipo === "produto") produtos.push(item);
        else if (item.tipo === "combo") combos.push(item);
        else {
            const setores = porSessao.get(item.sessaoId) ?? new Map<string, Setor>();
            porSessao.set(item.sessaoId, setores);
            const chave = `${item.sessaoId}:${item.grupo}`;
            const setor = setores.get(chave) ?? { chave, nome: item.grupo, itens: [] };
            setores.set(chave, setor);
            setor.itens.push(item);
        }
    }
    const sessoes: SessaoDoUso[] = SESSOES.filter((s) => porSessao.has(s.id)).map((s) => ({ sessao: s, setores: [...porSessao.get(s.id)!.values()] }));
    const extras: Setor[] = [
        ...(produtos.length ? [{ chave: "produtos", nome: "Produtos", itens: produtos }] : []),
        ...(combos.length ? [{ chave: "combos", nome: "Combos", itens: combos }] : []),
    ];
    return extras.length ? [...sessoes, { setores: extras }] : sessoes;
}

/** Busca por sessão, setor ou item: o que casa com o nome do setor (ou da sessão) entra inteiro. */
function filtrar(sessoes: SessaoDoUso[], termo: string): SessaoDoUso[] {
    if (!termo) return sessoes;
    return sessoes
        .map(({ sessao, setores }) => {
            if (sessao && paraBusca(sessao.rotulo).includes(termo)) return { sessao, setores };
            const achados = setores
                .map((s) => (paraBusca(s.nome).includes(termo) ? s : { ...s, itens: s.itens.filter((i) => paraBusca(i.nome).includes(termo)) }))
                .filter((s) => s.itens.length > 0);
            return { sessao, setores: achados };
        })
        .filter((s) => s.setores.length > 0);
}

/**
 * Itens do canal com o uso e a cota, na árvore sessão › setor › item. `cfg` é o canal gravado; as
 * mudanças de cota chegam por `onCota`.
 */
export function ItensEUso({ cfg, id, onCota }: { cfg: CanalDoGrupo; id: string; onCota: (fn: (c: CotaGrupo) => CotaGrupo) => void }) {
    const [busca, setBusca] = useState("");
    const termo = paraBusca(useDeferredValue(busca).trim());
    const [editando, setEditando] = useState<string | null>(null);
    const itens = useMemo(
        () => (cfg.todos ? INGRESSOS : itensDoCanal(cfg, itemValido).map((i) => ITEM_POR_ID[i])).filter((i): i is ItemCatalogo => Boolean(i)),
        // O catálogo é um espelho mutável: a contagem refaz a lista quando ele muda.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [cfg.todos, cfg.itens, INGRESSOS.length],
    );
    const todas = useMemo(() => agrupar(itens), [itens]);
    const sessoes = useMemo(() => filtrar(todas, termo), [todas, termo]);
    const variasSessoes = todas.filter((s) => s.sessao).length > 1;
    const sessoesVisiveis = useMostrarMais(sessoes, PASSO_SESSOES);
    const contexto: Contexto = { cfg, editando, setEditando, onCota, abertoPelaBusca: !!termo };

    return (
        <div id={id} className="flex flex-col gap-3">
            {itens.length > LIMIAR_BUSCA && (
                <InputBase
                    size="sm"
                    icon={SearchLg}
                    aria-label="Buscar sessão, grupo ou item"
                    placeholder="Buscar sessão, grupo ou item"
                    value={busca}
                    onChange={(v: unknown) => setBusca(typeof v === "string" ? v : ((v as { target?: { value?: string } })?.target?.value ?? ""))}
                    wrapperClassName="w-full sm:max-w-80"
                />
            )}
            {sessoes.length === 0 ? (
                <p role="status" className="text-sm text-tertiary">
                    Nada encontrado. Tente outro termo.
                </p>
            ) : variasSessoes ? (
                <>
                    <ul className="flex flex-col divide-y divide-secondary">
                        {sessoesVisiveis.visiveis.map((s) => (
                            <LinhaSessao key={s.sessao?.id ?? "sem-sessao"} dados={s} contexto={contexto} />
                        ))}
                    </ul>
                    <BotaoMostrarMais restantes={sessoesVisiveis.restantes} onClick={sessoesVisiveis.mostrarMais} passo={PASSO_SESSOES} />
                </>
            ) : (
                <ListaDeSetores setores={sessoes.flatMap((s) => s.setores)} contexto={contexto} />
            )}
        </div>
    );
}

interface Contexto {
    cfg: CanalDoGrupo;
    editando: string | null;
    setEditando: (k: string | null) => void;
    onCota: (fn: (c: CotaGrupo) => CotaGrupo) => void;
    /** Com busca, sessões e setores achados já abrem. */
    abertoPelaBusca: boolean;
}

/** Uso somado e o teto dos itens: a cota por item, o estoque (sem limite) ou nenhum (compartilhada). */
function somar(itens: ItemCatalogo[], cfg: CanalDoGrupo) {
    let uso = 0;
    let teto = 0;
    let maiorUso = 0;
    for (const i of itens) {
        const u = cfg.uso[i.id] ?? 0;
        uso += u;
        maiorUso = Math.max(maiorUso, u);
        teto += cfg.cota.tipo === "por-item" ? (cfg.cota.porItem[i.id] ?? 0) : Math.max(i.estoque, u);
    }
    return { uso, teto: cfg.cota.tipo === "compartilhada" ? null : teto, maiorUso };
}

function UsoSomado({ itens, cfg }: { itens: ItemCatalogo[]; cfg: CanalDoGrupo }) {
    const { uso, teto } = somar(itens, cfg);
    if (teto === null) return <span className="text-sm font-medium whitespace-nowrap text-secondary tabular-nums">{plural(uso, "emissão", "emissões")}</span>;
    return (
        <span className="flex w-32 shrink-0 flex-col gap-1.5 sm:w-40">
            <span className="text-sm font-medium whitespace-nowrap text-secondary tabular-nums">
                {uso.toLocaleString("pt-BR")} de {teto.toLocaleString("pt-BR")}
            </span>
            <BarraUso usadas={uso} total={teto} />
        </span>
    );
}

/** Aberto ou fechado: começa recolhido e abre sozinho quando a busca acha algo dentro; a pessoa sempre pode fechar. */
function useAberto(pelaBusca: boolean) {
    const [aberto, setAberto] = useState(pelaBusca);
    useEffect(() => setAberto(pelaBusca), [pelaBusca]);
    return [aberto, setAberto] as const;
}

/** Botão que abre e fecha um nível da árvore, com `aria-expanded` e `aria-controls`. */
function Alternar({ aberto, controla, onClick, children }: { aberto: boolean; controla: string; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            aria-expanded={aberto}
            aria-controls={controla}
            onClick={onClick}
            className="flex min-w-0 flex-1 items-start gap-2 rounded-sm text-left outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
        >
            <ChevronDown
                aria-hidden="true"
                className={cx("mt-0.5 size-4 shrink-0 text-fg-quaternary transition duration-150 ease-out", !aberto && "-rotate-90")}
            />
            {children}
        </button>
    );
}

function LinhaSessao({ dados, contexto }: { dados: SessaoDoUso; contexto: Contexto }) {
    const [aberta, setAberta] = useAberto(contexto.abertoPelaBusca);
    const id = useId();
    const visivel = aberta;
    const itens = useMemo(() => dados.setores.flatMap((s) => s.itens), [dados]);
    const titulo = dados.sessao ? `Sessão de ${dados.sessao.rotulo}` : "Produtos e combos";
    return (
        <li className="flex flex-col py-3 first:pt-0">
            <div className="flex items-start gap-3">
                <Alternar aberto={visivel} controla={id} onClick={() => setAberta(!visivel)}>
                    <span className="flex min-w-0 flex-col">
                        <span className="text-sm font-semibold text-primary">{titulo}</span>
                        <span className="text-sm text-tertiary">{plural(itens.length, "item", "itens")}</span>
                    </span>
                </Alternar>
                <UsoSomado itens={itens} cfg={contexto.cfg} />
            </div>
            <div id={id}>
                <Surgir visivel={visivel}>
                    <div className="pt-3 pl-6">
                        <ListaDeSetores setores={dados.setores} contexto={contexto} />
                    </div>
                </Surgir>
            </div>
        </li>
    );
}

function ListaDeSetores({ setores, contexto }: { setores: Setor[]; contexto: Contexto }) {
    const { visiveis, restantes, mostrarMais } = useMostrarMais(setores, PASSO_SETORES);
    return (
        <div className="flex flex-col gap-3">
            <ul className="flex flex-col divide-y divide-secondary rounded-xl ring-1 ring-secondary ring-inset">
                {visiveis.map((s) => (
                    <LinhaSetor key={s.chave} setor={s} contexto={contexto} />
                ))}
            </ul>
            <BotaoMostrarMais restantes={restantes} onClick={mostrarMais} passo={PASSO_SETORES} />
        </div>
    );
}

function LinhaSetor({ setor, contexto }: { setor: Setor; contexto: Contexto }) {
    const { cfg } = contexto;
    const [aberto, setAberto] = useAberto(contexto.abertoPelaBusca);
    const id = useId();
    const visivel = aberto;
    const porItem = cfg.cota.tipo === "por-item";
    return (
        <li className="flex flex-col px-4 py-3">
            <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                <Alternar aberto={visivel} controla={id} onClick={() => setAberto(!visivel)}>
                    <span className="flex min-w-0 flex-col">
                        <span className="text-sm font-medium text-primary">{setor.nome}</span>
                        <span className="text-sm text-tertiary">{plural(setor.itens.length, "item", "itens")}</span>
                    </span>
                </Alternar>
                <span className="ml-auto flex items-start gap-1">
                    <UsoSomado itens={setor.itens} cfg={cfg} />
                    {porItem && (
                        <ButtonUtility
                            size="sm"
                            color="tertiary"
                            icon={Edit01}
                            tooltip="Mesma cota para todos"
                            aria-label={`Mesma cota para todos os itens de ${setor.nome}`}
                            onClick={() => contexto.setEditando(`setor:${setor.chave}`)}
                        />
                    )}
                </span>
            </div>
            {porItem && (
                <Surgir visivel={contexto.editando === `setor:${setor.chave}`}>
                    <CotaDoSetor setor={setor} contexto={contexto} />
                </Surgir>
            )}
            <div id={id}>
                <Surgir visivel={visivel}>
                    <ItensDoSetor setor={setor} contexto={contexto} />
                </Surgir>
            </div>
        </li>
    );
}

/** Cota em lote: o mesmo número para cada item do setor, nunca abaixo do que algum já emitiu (ECO-34). */
function CotaDoSetor({ setor, contexto }: { setor: Setor; contexto: Contexto }) {
    const { maiorUso } = somar(setor.itens, contexto.cfg);
    const [valor, setValor] = useState(0);
    const [erro, setErro] = useState<string>();
    const aplicar = () => {
        if (!(valor > 0)) return setErro("Informe uma quantidade maior que zero.");
        if (valor < maiorUso) return setErro(`Informe ${maiorUso} ou mais: um item de ${setor.nome} já emitiu ${maiorUso}.`);
        contexto.onCota((c) => ({ ...c, porItem: { ...c.porItem, ...Object.fromEntries(setor.itens.map((i) => [i.id, valor])) } }));
        contexto.setEditando(null);
    };
    return (
        <div className="flex flex-col gap-2 pt-3 pl-6">
            <div className="flex flex-wrap items-start gap-2">
                <div className="w-40">
                    <Input
                        size="sm"
                        inputMode="numeric"
                        aria-label={`Cota de cada item de ${setor.nome}`}
                        placeholder="Ex.: 20"
                        value={valor ? String(valor) : ""}
                        onChange={(v) => {
                            setValor(soNumero(v));
                            setErro(undefined);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") aplicar();
                            if (e.key === "Escape") contexto.setEditando(null);
                        }}
                        isInvalid={!!erro}
                        hint={erro ?? `Vale para ${plural(setor.itens.length, "item", "itens")} de ${setor.nome}.`}
                        autoFocus
                    />
                </div>
                <Button size="sm" color="secondary" onClick={aplicar}>
                    Aplicar
                </Button>
                <Button size="sm" color="tertiary" onClick={() => contexto.setEditando(null)}>
                    Cancelar
                </Button>
            </div>
        </div>
    );
}

function ItensDoSetor({ setor, contexto }: { setor: Setor; contexto: Contexto }) {
    const { cfg, editando, setEditando, onCota } = contexto;
    const { visiveis, restantes, mostrarMais } = useMostrarMais(setor.itens, PASSO_ITENS);
    return (
        <div className="flex flex-col gap-3 pt-3 pl-6">
            <ul className="flex flex-col gap-3">
                {visiveis.map((item) => {
                    const uso = cfg.uso[item.id] ?? 0;
                    const apoio = item.tipo === "combo" ? legendaDeSessao(item, "curto") : undefined;
                    return (
                        <li key={item.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                            <span className="flex min-w-0 flex-1 flex-col">
                                <span className="text-sm text-primary">{item.nome}</span>
                                {apoio && <span className="text-sm text-tertiary">{apoio}</span>}
                            </span>
                            {cfg.cota.tipo === "por-item" ? (
                                <CotaEditavel
                                    nome={item.nome}
                                    uso={uso}
                                    cota={cfg.cota.porItem[item.id] ?? 0}
                                    editando={editando === item.id}
                                    onEditar={() => setEditando(item.id)}
                                    onCancelar={() => setEditando(null)}
                                    onSalvar={(n) => {
                                        onCota((c) => ({ ...c, porItem: { ...c.porItem, [item.id]: n } }));
                                        setEditando(null);
                                    }}
                                />
                            ) : cfg.cota.tipo === "sem-limite" ? (
                                <span className="flex w-32 shrink-0 flex-col gap-1.5 sm:w-40">
                                    <span className="text-sm font-medium whitespace-nowrap text-secondary tabular-nums">
                                        {uso} de {Math.max(item.estoque, uso)} emissões
                                    </span>
                                    <BarraUso usadas={uso} total={Math.max(item.estoque, uso)} />
                                </span>
                            ) : (
                                <span className="text-sm font-medium whitespace-nowrap text-secondary tabular-nums">{plural(uso, "emissão", "emissões")}</span>
                            )}
                        </li>
                    );
                })}
            </ul>
            <BotaoMostrarMais restantes={restantes} onClick={mostrarMais} passo={PASSO_ITENS} />
        </div>
    );
}
