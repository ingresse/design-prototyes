import { useEffect, useState, type FC, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Copy01, EyeOff, InfoCircle, Key01, Plus, RefreshCw01, SearchLg, Ticket01 } from "@untitledui/icons";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Tooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import { useTransicao } from "@/components/foundations/transicao";
import { cx } from "@/utils/cx";
import { formatarDataHora, formatarReais, simboloDaMoeda } from "../data/campos";
import {
    chavesDe,
    codigoValido,
    comLotes,
    cuponsDe,
    gerarCodigo,
    lotesDoAlvo,
    menorPrecoDoAlvo,
    novaChave,
    novoCupom,
    normalizarCodigo,
    textoDoDesconto,
    textoDoUso,
    vinculadosAoAlvo,
    type Alvo,
    type Recurso,
} from "../data/marketing";
import type { ChaveDeAcesso, CupomDeDesconto, Rascunho } from "../data/tipos";
import { useVocabulario } from "../data/vocabulario";
import { CampoDataHora, CampoNumero, CampoTexto, Escolha } from "./campos";
import { useFormulario } from "./contexto";

/* ------------------------------------------------------------------ */
/*  Atalho de cupons e chaves de acesso (v0.37 a v0.40,               */
/*  SCE-279 a SCE-287)                                                 */
/*  Ícone com o número na categoria (todos os lotes) e em cada lote.   */
/*  O painel é um atalho para este lugar: vincular o que já existe no  */
/*  evento ou criar novos, num assistente. Gerenciar cupons e chaves   */
/*  de várias categorias de uma vez é no menu Marketing. O backend é   */
/*  o do AWA: cupons e chaves são do evento e se ligam aos lotes.      */
/* ------------------------------------------------------------------ */

const ICONE: Record<Recurso, FC<{ className?: string }>> = { cupom: Ticket01, chave: Key01 };
const NOME: Record<Recurso, { um: string; muitos: string; nenhum: string; titulo: string; novo: string; menu: string }> = {
    cupom: { um: "cupom de desconto", muitos: "cupons de desconto", nenhum: "Nenhum cupom de desconto", titulo: "Cupons de desconto", novo: "Novo cupom", menu: "Marketing › Cupons" },
    chave: { um: "chave de acesso", muitos: "chaves de acesso", nenhum: "Nenhuma chave de acesso", titulo: "Chaves de acesso", novo: "Nova chave", menu: "Marketing › Chave de acesso" },
};

type Item = CupomDeDesconto | ChaveDeAcesso;

/** Indicador clicável (ícone + número). Zero fica apagado, mas abre igual: é por ele que se cria o primeiro. */
export function AtalhoMarketing({ recurso, alvo }: { recurso: Recurso; alvo: Alvo }) {
    const { rascunho: r } = useFormulario();
    const [aberto, setAberto] = useState(false);
    const itens: Item[] = recurso === "cupom" ? cuponsDe(r) : chavesDe(r);
    const n = vinculadosAoAlvo(itens, alvo).length;
    const Icone = ICONE[recurso];
    const texto = n === 0 ? NOME[recurso].nenhum : n === 1 ? `1 ${NOME[recurso].um}` : `${n} ${NOME[recurso].muitos}`;
    return (
        <>
            <Tooltip title={texto} description="Clique para vincular ou criar">
                <TooltipTrigger
                    aria-label={`${texto}: vincular ou criar`}
                    onPress={() => setAberto(true)}
                    className={cx(
                        "flex items-center gap-1 rounded-md bg-primary px-1.5 py-0.5 text-xs font-medium ring-1 ring-secondary outline-focus-ring transition duration-100 ease-linear ring-inset hover:bg-primary_hover focus-visible:outline-2",
                        n > 0 ? "text-secondary" : "text-quaternary",
                    )}
                >
                    <Icone className={cx("size-3.5", n > 0 ? "text-fg-quaternary" : "text-fg-quaternary opacity-50")} aria-hidden="true" />
                    {/* v0.49 (SCE-297): número e o que é, por extenso. */}
                    {n} {recurso === "cupom" ? (n === 1 ? "cupom" : "cupons") : n === 1 ? "chave de acesso" : "chaves de acesso"}
                </TooltipTrigger>
            </Tooltip>
            <PainelMarketing recurso={recurso} alvo={alvo} aberto={aberto} onFechar={() => setAberto(false)} />
        </>
    );
}

function PainelMarketing({ recurso, alvo, aberto, onFechar }: { recurso: Recurso; alvo: Alvo; aberto: boolean; onFechar: () => void }) {
    const { rascunho: r, atualizar } = useFormulario();
    const { t } = useVocabulario();
    const transicao = useTransicao();
    const chave = recurso === "chave";
    const itens: Item[] = chave ? chavesDe(r) : cuponsDe(r);
    const ids = lotesDoAlvo(alvo);
    const modalidade = r.modalidades.find((m) => m.categorias.some((c) => c.id === alvo.categoria.id));
    const nomeCat = alvo.categoria.nome.trim() || t.nivel2SemNome;
    const onde = alvo.lote ? `${modalidade?.nome ?? ""} › ${nomeCat} › ${alvo.lote.nome.trim() || "lote sem nome"}` : `${modalidade?.nome ?? ""} › ${nomeCat}`;
    // v0.43 (SCE-290): o nome dos lotes por extenso.
    const nomesDosLotes = (alvo.lote ? [alvo.lote] : alvo.categoria.lotes).map((l, i) => l.nome.trim() || `${i + 1}º lote`);
    const listaDeLotes = nomesDosLotes.length <= 1 ? nomesDosLotes[0] ?? "" : `${nomesDosLotes.slice(0, -1).join(", ")} e ${nomesDosLotes[nomesDosLotes.length - 1]}`;
    const ondeLotes = alvo.lote ? `só o lote ${listaDeLotes}` : nomesDosLotes.length === 1 ? `o lote ${listaDeLotes}` : `os lotes ${listaDeLotes}`;
    const [busca, setBusca] = useState("");
    const [criando, setCriando] = useState(false);
    const [recentes, setRecentes] = useState<Set<string>>(new Set());
    // v0.43 (SCE-290): o que havia ao abrir, para "Cancelar" desfazer tudo o que foi marcado, desmarcado ou criado aqui.
    const [antes, setAntes] = useState<Item[]>([]);
    useEffect(() => {
        if (aberto) {
            setBusca("");
            setCriando(false);
            setRecentes(new Set());
            setAntes(itens);
        }
    }, [aberto]); // eslint-disable-line react-hooks/exhaustive-deps
    // v0.57 (SCE-317): Cancelar desfaz só as marcações deste painel; o que foi criado aqui fica (vinculado).
    const cancelar = () => {
        const porId = new Map(antes.map((i) => [i.id, i]));
        gravar((lista) => lista.map((i) => porId.get(i.id) ?? i));
        onFechar();
    };

    // Links como no AWA: cupom por ?coupon=, chave por ?chave= (a página do evento ainda não existe no protótipo).
    const linkDe = (codigo: string) => `https://ticketsports.com.br/e/${(r.nome || "evento").toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-")}?${chave ? "chave" : "coupon"}=${codigo}`;
    const gravar = (fn: (lista: Item[]) => Item[]) =>
        atualizar((x: Rascunho) => (chave ? { ...x, chaves: fn(chavesDe(x)) as ChaveDeAcesso[] } : { ...x, cupons: fn(cuponsDe(x)) as CupomDeDesconto[] }));
    // Marcar liga o item a todos os lotes deste lugar; desmarcar tira de todos.
    const alternar = (item: Item, ligar: boolean) => gravar((lista) => lista.map((i) => (i.id === item.id ? comLotes(i, ids, ligar) : i)));
    const cobertura = (item: Item) => ids.filter((id) => item.lotes.includes(id)).length;
    const q = normalizarCodigo(busca);
    // Os recém-criados primeiro, em destaque; depois os vinculados; depois o resto.
    const ordem = (i: Item) => (recentes.has(i.id) ? 0 : cobertura(i) > 0 ? 1 : 2);
    const visiveis = itens.filter((i) => !q || i.codigo.includes(q)).sort((a, b) => ordem(a) - ordem(b));
    const marcados = itens.filter((i) => cobertura(i) > 0).length;
    const marcarTodos = (ligar: boolean) => {
        const alvos = new Set(visiveis.map((i) => i.id));
        gravar((lista) => lista.map((i) => (alvos.has(i.id) ? comLotes(i, ids, ligar) : i)));
    };

    const criados = (novos: Item[]) => {
        gravar((lista) => [...lista, ...novos.map((n) => ({ ...n, lotes: ids }))]);
        setRecentes(new Set(novos.map((n) => n.id)));
        setCriando(false);
        toast.success(novos.length === 1 ? `${novos[0].codigo} criad${chave ? "a" : "o"} e vinculad${chave ? "a" : "o"}.` : `${novos.length} ${NOME[recurso].muitos} criad${chave ? "as" : "os"} e vinculad${chave ? "as" : "os"}.`);
    };

    return (
        <ModalOverlay isOpen={aberto} onOpenChange={(v) => !v && onFechar()} isDismissable>
            <Modal className="sm:max-w-xl">
                <Dialog aria-label={`${NOME[recurso].titulo}: ${onde}`}>
                    <div className="flex max-h-[88vh] w-full flex-col overflow-hidden rounded-2xl bg-primary shadow-xl ring-1 ring-secondary">
                        {/* Topo: título, lugar e a ação principal */}
                        <div className="flex shrink-0 items-start justify-between gap-4 px-6 pt-6 pb-4">
                            <div className="flex min-w-0 flex-col gap-1">
                                <h2 className="text-lg font-semibold text-primary">{criando ? NOME[recurso].novo : NOME[recurso].titulo}</h2>
                                <p className="text-sm text-tertiary">
                                    {onde} · vale para {ondeLotes}
                                </p>
                            </div>
                            {!criando && (
                                <Button size="sm" color="primary" iconLeading={Plus} onClick={() => setCriando(true)}>
                                    {NOME[recurso].novo}
                                </Button>
                            )}
                        </div>

                        <AnimatePresence initial={false} mode="wait">
                            {criando ? (
                                <motion.div key="assistente" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={transicao} className="flex min-h-0 flex-1 flex-col">
                                    {chave ? (
                                        <AssistenteChave existentes={chavesDe(r)} onde={onde} ondeLotes={ondeLotes} onCancelar={() => setCriando(false)} onCriar={criados} />
                                    ) : (
                                        <AssistenteCupom existentes={cuponsDe(r)} alvo={alvo} onde={onde} ondeLotes={ondeLotes} onCancelar={() => setCriando(false)} onCriar={criados} />
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div key="lista" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={transicao} className="flex min-h-0 flex-1 flex-col">
                                    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto border-y border-secondary px-6 py-5">
                                        {/* Escopo do atalho: este lugar. Várias categorias de uma vez é no menu. */}
                                        <p className="flex items-start gap-2 rounded-lg bg-secondary px-3 py-2.5 text-sm text-secondary">
                                            <InfoCircle className="mt-0.5 size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />
                                            <span>
                                                Este atalho vincula {chave ? "chaves" : "cupons"} só a {alvo.lote ? "este lote" : "esta categoria"}. Para gerenciar {chave ? "chaves" : "cupons"} de várias categorias de uma vez, use{" "}
                                                <button
                                                    type="button"
                                                    className="rounded font-semibold text-brand-secondary underline underline-offset-2 outline-focus-ring focus-visible:outline-2"
                                                    onClick={() => toast(`No evento: ${NOME[recurso].menu}. Fora deste protótipo.`)}
                                                >
                                                    {NOME[recurso].menu}
                                                </button>
                                                .
                                            </span>
                                        </p>
                                        {chave && (
                                            <p className="flex items-start gap-2 text-sm text-tertiary">
                                                <EyeOff className="mt-0.5 size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />
                                                Com chave vinculada, {alvo.lote ? "este lote fica oculto" : "esta categoria fica oculta"} para o público: só aparece para quem tem a chave.
                                            </p>
                                        )}

                                        {itens.length === 0 ? (
                                            <div className="flex flex-col items-center gap-3 py-6 text-center">
                                                <p className="text-sm text-tertiary">{chave ? "O evento ainda não tem chaves de acesso." : "O evento ainda não tem cupons de desconto."}</p>
                                                <Button size="sm" color="secondary" iconLeading={Plus} onClick={() => setCriando(true)}>
                                                    Criar {chave ? "a primeira chave" : "o primeiro cupom"}
                                                </Button>
                                            </div>
                                        ) : (
                                            <section className="flex flex-col gap-2">
                                                <h3 className="text-sm font-semibold text-primary">
                                                    {chave ? "Chaves do evento" : "Cupons do evento"}{" "}
                                                    <span className="font-normal text-tertiary">
                                                        · {marcados} de {itens.length} vinculad{chave ? "as" : "os"} aqui. Marque para vincular.
                                                    </span>
                                                </h3>
                                                {/* v0.42 (SCE-289): marcar e desmarcar todos (os encontrados, com busca). */}
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                                    {itens.length > 6 && <Input aria-label="Buscar código" placeholder="Buscar código" icon={SearchLg} size="sm" value={busca} onChange={setBusca} className="sm:max-w-xs" />}
                                                    <div className="flex items-center gap-1 sm:ml-auto">
                                                        <Button size="sm" color="secondary" isDisabled={!visiveis.length || visiveis.every((i) => cobertura(i) === ids.length)} onClick={() => marcarTodos(true)}>
                                                            {q ? `Marcar os ${visiveis.length} encontrados` : "Marcar todos"}
                                                        </Button>
                                                        <Button size="sm" color="secondary" isDisabled={visiveis.every((i) => cobertura(i) === 0)} onClick={() => marcarTodos(false)}>
                                                            {q ? "Desmarcar encontrados" : "Desmarcar todos"}
                                                        </Button>
                                                    </div>
                                                </div>
                                                <ul className="flex flex-col divide-y divide-secondary rounded-xl px-4 ring-1 ring-secondary">
                                                    {visiveis.length === 0 && <li className="py-3 text-sm text-tertiary">Nada encontrado para "{busca.trim()}".</li>}
                                                    {visiveis.slice(0, 50).map((item) => {
                                                        const n = cobertura(item);
                                                        return (
                                                            <li key={item.id} className="flex items-center gap-2 py-2.5">
                                                                <Checkbox
                                                                    className="min-w-0 flex-1"
                                                                    isSelected={n === ids.length}
                                                                    isIndeterminate={n > 0 && n < ids.length}
                                                                    onChange={() => alternar(item, n < ids.length)}
                                                                    label={<span className="font-mono font-semibold text-primary">{item.codigo}</span>}
                                                                    hint={[
                                                                        "tipo" in item ? textoDoDesconto(item) : null,
                                                                        textoDoUso(item),
                                                                        n > 0 && n < ids.length ? `vale em ${n} de ${ids.length} lotes` : null,
                                                                        !item.ativo ? (chave ? "inativa" : "inativo") : null,
                                                                    ]
                                                                        .filter(Boolean)
                                                                        .join(" · ")}
                                                                />
                                                                <ButtonUtility
                                                                    size="xs"
                                                                    color="tertiary"
                                                                    icon={Copy01}
                                                                    tooltip="Copiar link"
                                                                    aria-label={`Copiar link de ${item.codigo}`}
                                                                    onClick={() => {
                                                                        navigator.clipboard?.writeText(linkDe(item.codigo)).catch(() => undefined);
                                                                        toast.success(chave ? `Link da chave ${item.codigo} copiado. Quem abrir já vê ${alvo.lote ? "o lote" : "a categoria"}.` : `Link do cupom ${item.codigo} copiado. Quem abrir já entra com o desconto.`);
                                                                    }}
                                                                />
                                                                {recentes.has(item.id) && (
                                                                    <Badge size="sm" type="pill-color" color="success">
                                                                        Nov{chave ? "a" : "o"}
                                                                    </Badge>
                                                                )}
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                                {visiveis.length > 50 && <p className="text-sm text-tertiary">Mostrando 50 de {visiveis.length}. Busque pelo código para achar os outros.</p>}
                                            </section>
                                        )}
                                    </div>
                                    <div className="flex shrink-0 justify-end gap-3 px-6 py-4">
                                        <Button size="md" color="secondary" onClick={cancelar}>
                                            Cancelar
                                        </Button>
                                        <Button size="md" color="primary" onClick={onFechar}>
                                            Concluir
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}

/* ------------------------------------------------------------------ */
/*  Assistente de criação (SCE-287): um passo por vez, com revisão.    */
/* ------------------------------------------------------------------ */

function Assistente({
    passos,
    passo,
    conteudo,
    podeAvancar,
    onVoltar,
    onAvancar,
    onCancelar,
    textoFinal,
}: {
    passos: string[];
    passo: number;
    conteudo: ReactNode;
    podeAvancar: () => boolean;
    onVoltar: () => void;
    onAvancar: () => void;
    onCancelar: () => void;
    textoFinal: string;
}) {
    const ultimo = passo === passos.length - 1;
    return (
        <>
            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto border-y border-secondary px-6 py-5">
                {/* Passos: número, nome, atual em destaque */}
                <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm" aria-label="Passos">
                    {passos.map((p, i) => (
                        <li key={p} className="flex items-center gap-2" aria-current={i === passo ? "step" : undefined}>
                            <span
                                className={cx(
                                    "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                                    i === passo ? "bg-brand-solid text-white" : i < passo ? "bg-success-solid text-white" : "bg-secondary text-tertiary",
                                )}
                            >
                                {i + 1}
                            </span>
                            <span className={i === passo ? "font-semibold text-primary" : "text-tertiary"}>{p}</span>
                            {i < passos.length - 1 && <span className="w-4 border-t border-secondary" aria-hidden="true" />}
                        </li>
                    ))}
                </ol>
                {conteudo}
            </div>
            <div className="flex shrink-0 items-center justify-between gap-3 px-6 py-4">
                <Button size="md" color="tertiary" onClick={onCancelar}>
                    Cancelar
                </Button>
                <div className="flex items-center gap-2">
                    {passo > 0 && (
                        <Button size="md" color="secondary" iconLeading={ArrowLeft} onClick={onVoltar}>
                            Voltar
                        </Button>
                    )}
                    <Button
                        size="md"
                        color="primary"
                        iconTrailing={ultimo ? undefined : ArrowRight}
                        iconLeading={ultimo ? Plus : undefined}
                        onClick={() => {
                            if (podeAvancar()) onAvancar();
                        }}
                    >
                        {ultimo ? textoFinal : "Continuar"}
                    </Button>
                </div>
            </div>
        </>
    );
}

const Resumo = ({ linhas }: { linhas: [string, ReactNode][] }) => (
    <dl className="divide-y divide-secondary rounded-xl ring-1 ring-secondary">
        {linhas.map(([rotulo, valor]) => (
            <div key={rotulo} className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
                <dt className="text-sm font-medium text-tertiary">{rotulo}</dt>
                <dd className="text-sm text-primary">{valor}</dd>
            </div>
        ))}
    </dl>
);

/** Código: só letras e números, único no evento. */
const erroDoCodigo = (codigo: string, existentes: { codigo: string }[]) =>
    !codigo ? "Informe o código" : !codigoValido(codigo) ? "Use só letras e números, sem espaço nem símbolo" : existentes.some((e) => e.codigo === codigo) ? "Este código já existe no evento" : undefined;

/** Passo "Códigos", igual para cupom e chave: um código ou vários gerados. */
function PassoCodigos({
    recurso,
    forma,
    setForma,
    codigo,
    setCodigo,
    quantidade,
    setQuantidade,
    prefixo,
    setPrefixo,
    erros,
}: {
    recurso: Recurso;
    forma: "um" | "varios";
    setForma: (v: "um" | "varios") => void;
    codigo: string;
    setCodigo: (v: string) => void;
    quantidade: number | null;
    setQuantidade: (v: number | null) => void;
    prefixo: string;
    setPrefixo: (v: string) => void;
    erros: { codigo?: string; quantidade?: string; prefixo?: string };
}) {
    const chave = recurso === "chave";
    return (
        <div className="flex flex-col gap-4">
            <Escolha
                label={chave ? "Quantas chaves" : "Quantos cupons"}
                valor={forma}
                opcoes={[
                    { id: "um", label: chave ? "Uma chave" : "Um cupom" },
                    { id: "varios", label: chave ? "Várias chaves" : "Vários cupons" },
                ]}
                onChange={setForma}
            />
            {forma === "um" ? (
                <div className="flex items-start gap-2">
                    <CampoTexto
                        id="campo-assistente-codigo"
                        label="Código"
                        isRequired
                        valor={codigo}
                        onChange={(v) => setCodigo(normalizarCodigo(v))}
                        erro={erros.codigo}
                        dica={chave ? "Quem tem a chave digita no checkout ou abre o link." : "O comprador digita este código no checkout."}
                        className="flex-1"
                    />
                    <Button size="md" color="secondary" iconLeading={RefreshCw01} className="mt-6" onClick={() => setCodigo(gerarCodigo())}>
                        Gerar
                    </Button>
                </div>
            ) : (
                <div className="grid items-start gap-4 sm:grid-cols-2">
                    <CampoNumero id="campo-assistente-qtd" label="Quantidade" isRequired valor={quantidade} onChange={setQuantidade} erro={erros.quantidade} dica="De 1 a 5.000. Cada um com código próprio." semSetas />
                    <CampoTexto
                        id="campo-assistente-prefixo"
                        label="Prefixo (opcional)"
                        valor={prefixo}
                        onChange={(v) => setPrefixo(normalizarCodigo(v))}
                        erro={erros.prefixo}
                        dica={`Ex.: ${normalizarCodigo(prefixo) || (chave ? "ASSESSORIA" : "CORRIDA")}7K2P`}
                    />
                </div>
            )}
        </div>
    );
}

const gerarLote = (qtd: number, prefixo: string, existentes: { codigo: string }[]) => {
    const usados = new Set(existentes.map((x) => x.codigo));
    return Array.from({ length: qtd }, () => {
        let cod = gerarCodigo(prefixo);
        while (usados.has(cod)) cod = gerarCodigo(prefixo);
        usados.add(cod);
        return cod;
    });
};

function useCodigos(existentes: { codigo: string }[]) {
    const [forma, setForma] = useState<"um" | "varios">("um");
    const [codigo, setCodigo] = useState(() => gerarCodigo());
    const [quantidade, setQuantidade] = useState<number | null>(10);
    const [prefixo, setPrefixo] = useState("");
    const erros = {
        codigo: forma === "um" ? erroDoCodigo(codigo, existentes) : undefined,
        quantidade: forma === "varios" && !(quantidade && quantidade >= 1 && quantidade <= 5000) ? "Use de 1 a 5.000" : undefined,
        prefixo: forma === "varios" && prefixo && !codigoValido(prefixo) ? "Use só letras e números" : undefined,
    };
    const total = forma === "um" ? 1 : (quantidade ?? 0);
    const textoCodigos = forma === "um" ? codigo : `${total.toLocaleString("pt-BR")} códigos gerados${prefixo ? `, começando com ${prefixo}` : ""}`;
    const codigos = () => (forma === "um" ? [codigo] : gerarLote(total, prefixo, existentes));
    return { forma, setForma, codigo, setCodigo, quantidade, setQuantidade, prefixo, setPrefixo, erros, total, textoCodigos, codigos };
}

function AssistenteCupom({
    existentes,
    alvo,
    onde,
    ondeLotes,
    onCancelar,
    onCriar,
}: {
    existentes: CupomDeDesconto[];
    alvo: Alvo;
    onde: string;
    ondeLotes: string;
    onCancelar: () => void;
    onCriar: (cs: CupomDeDesconto[]) => void;
}) {
    const [passo, setPasso] = useState(0);
    const [tentou, setTentou] = useState<Set<number>>(new Set());
    const cod = useCodigos(existentes);
    const [c, setC] = useState(() => novoCupom());
    const set = (m: Partial<CupomDeDesconto>) => setC((x) => ({ ...x, ...m }));
    const menor = menorPrecoDoAlvo(alvo);
    const erros: Record<number, Record<string, string | undefined>> = {
        0: cod.erros,
        1: {
            valor:
                c.valor == null || c.valor <= 0
                    ? "Informe o desconto"
                    : c.tipo === "percentual" && c.valor > 100
                      ? "Use de 1 a 100%"
                      : c.tipo === "valor" && menor != null && c.valor >= menor
                        ? `Precisa ser menor que o menor preço destes lotes (${formatarReais(menor)})`
                        : undefined,
        },
        2: {
            limite: c.limite != null && c.limite < 1 ? "Use 1 ou mais, ou deixe em branco" : undefined,
        },
        3: {},
    };
    const e = (k: string) => (tentou.has(passo) ? erros[passo][k] : undefined);
    const passos = ["Códigos", "Desconto", "Regras", "Revisar"];

    const conteudo = [
        <PassoCodigos key="c" recurso="cupom" {...cod} erros={tentou.has(0) ? cod.erros : {}} />,
        <div key="d" className="grid items-start gap-4 sm:grid-cols-2">
            <Escolha
                label="Tipo de desconto"
                size="md"
                valor={c.tipo}
                opcoes={[
                    { id: "percentual", label: "Percentual" },
                    { id: "valor", label: "Valor fixo" },
                ]}
                onChange={(tipo) => set({ tipo, valor: null })}
            />
            <CampoNumero
                id="campo-cupom-valor"
                label={c.tipo === "percentual" ? "Desconto (%)" : `Desconto (${simboloDaMoeda()})`}
                isRequired
                valor={c.valor}
                onChange={(valor) => set({ valor })}
                formato={c.tipo === "valor" ? { style: "currency", currency: "BRL" } : { maximumFractionDigits: 0 }}
                erro={e("valor")}
                dica={c.tipo === "valor" && menor != null ? `Menor preço destes lotes: ${formatarReais(menor)}.` : undefined}
                semSetas
            />
        </div>,
        <div key="r" className="flex flex-col gap-4">
            <CampoNumero id="campo-cupom-limite" label={cod.forma === "um" ? "Limite de uso (opcional)" : "Limite de uso por cupom (opcional)"} valor={c.limite} onChange={(limite) => set({ limite })} dica="Em branco: sem limite." erro={e("limite")} semSetas className="sm:max-w-[calc(50%-0.5rem)]" />
            <CampoDataHora id="campo-cupom-ate" label="Válido até (opcional)" valor={c.validoAte} onChange={(validoAte) => set({ validoAte })} dica="Vale a partir de agora. Em branco: sem data final." erro={e("validoAte")} />
        </div>,
        <Resumo
            key="v"
            linhas={[
                ["Códigos", <span className="font-mono">{cod.textoCodigos}</span>],
                ["Desconto", textoDoDesconto(c)],
                ["Limite de uso", c.limite == null ? "Sem limite" : `${c.limite} ${cod.forma === "um" ? "usos" : "usos por cupom"}`],
                ["Validade", c.validoAte ? `De agora até ${formatarDataHora(c.validoAte)}` : "De agora, sem data final"],
                ["Vinculado a", `${onde}, ${ondeLotes}`],
            ]}
        />,
    ][passo];

    return (
        <Assistente
            passos={passos}
            passo={passo}
            conteudo={conteudo}
            textoFinal={cod.total === 1 ? "Criar e vincular" : `Criar ${cod.total.toLocaleString("pt-BR")} e vincular`}
            onCancelar={onCancelar}
            onVoltar={() => setPasso((p) => p - 1)}
            podeAvancar={() => {
                setTentou((s) => new Set(s).add(passo));
                return !Object.values(erros[passo]).some(Boolean);
            }}
            onAvancar={() => {
                if (passo < passos.length - 1) return setPasso((p) => p + 1);
                onCriar(cod.codigos().map((codigo) => ({ ...c, id: novoCupom().id, codigo })));
            }}
        />
    );
}

function AssistenteChave({ existentes, onde, ondeLotes, onCancelar, onCriar }: { existentes: ChaveDeAcesso[]; onde: string; ondeLotes: string; onCancelar: () => void; onCriar: (cs: ChaveDeAcesso[]) => void }) {
    const [passo, setPasso] = useState(0);
    const [tentou, setTentou] = useState<Set<number>>(new Set());
    const cod = useCodigos(existentes);
    const [limite, setLimite] = useState<number | null>(null);
    const erros: Record<number, Record<string, string | undefined>> = {
        0: cod.erros,
        1: { limite: limite != null && limite < 1 ? "Use 1 ou mais, ou deixe em branco" : undefined },
        2: {},
    };
    const passos = ["Códigos", "Limite", "Revisar"];
    const conteudo = [
        <PassoCodigos key="c" recurso="chave" {...cod} erros={tentou.has(0) ? cod.erros : {}} />,
        <CampoNumero
            key="l"
            id="campo-chave-limite"
            label={cod.forma === "um" ? "Limite de uso (opcional)" : "Limite de uso por chave (opcional)"}
            valor={limite}
            onChange={setLimite}
            dica="Quantas inscrições cada chave libera. Em branco: sem limite."
            erro={tentou.has(1) ? erros[1].limite : undefined}
            semSetas
            className="sm:max-w-[calc(50%-0.5rem)]"
        />,
        <div key="v" className="flex flex-col gap-3">
            <Resumo
                linhas={[
                    ["Códigos", <span className="font-mono">{cod.textoCodigos}</span>],
                    ["Limite de uso", limite == null ? "Sem limite" : `${limite} ${cod.forma === "um" ? "usos" : "usos por chave"}`],
                    ["Vinculada a", `${onde}, ${ondeLotes}`],
                ]}
            />
            <p className="flex items-start gap-2 text-sm text-tertiary">
                <EyeOff className="mt-0.5 size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />
                Depois de criar, {ondeLotes === "só este lote" ? "este lote fica oculto" : "esta categoria fica oculta"} para o público: só aparece para quem tem a chave.
            </p>
        </div>,
    ][passo];

    return (
        <Assistente
            passos={passos}
            passo={passo}
            conteudo={conteudo}
            textoFinal={cod.total === 1 ? "Criar e vincular" : `Criar ${cod.total.toLocaleString("pt-BR")} e vincular`}
            onCancelar={onCancelar}
            onVoltar={() => setPasso((p) => p - 1)}
            podeAvancar={() => {
                setTentou((s) => new Set(s).add(passo));
                return !Object.values(erros[passo]).some(Boolean);
            }}
            onAvancar={() => {
                if (passo < passos.length - 1) return setPasso((p) => p + 1);
                onCriar(cod.codigos().map((codigo) => novaChave({ codigo, limite })));
            }}
        />
    );
}
