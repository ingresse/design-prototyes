import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowRight } from "@untitledui/icons";
import { toast } from "sonner";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import type { Evento, Grupo, TipoIngresso } from "@/plataforma";
import { comIngresso, ingressoNovo, salvarSessoes } from "../data/catalogo";
import { formatar, useTextosItens } from "../data/textos-itens";
import { IngressoAberto } from "./campo-de-ingresso";
import { CampoPreco } from "./comuns";

/*
 * Criação rápida de ingresso, dentro do grupo (ITM-139): o mesmo ingresso aberto da criação de grupo,
 * com o essencial para vender (nome, tipo, preço e quantidade do 1º lote). Enter cria, o ingresso
 * entra na lista e o formulário fica pronto para o próximo (Inteira, depois Meia-entrada). Meia-entrada
 * sugere metade do preço da Inteira do grupo. O resto (descrição, mais lotes, regras, Passkeys,
 * avançado) fica em "Mais opções", que leva o que foi digitado para a página do ingresso.
 */

const T = {
    nome: "Nome do ingresso",
    nomePlaceholder: "Ex.: Inteira",
    tipo: "Tipo",
    inteira: "Inteira",
    meia: "Meia-entrada",
    preco: "Preço",
    quantidade: "Quantidade",
    quantidadePlaceholder: "Ex.: 500",
    metade: "Metade da Inteira.",
    criar: "Criar",
    cancelar: "Cancelar",
    maisOpcoes: "Mais opções",
    erroNome: "Dê um nome ao ingresso.",
    erroRepetido: "Escolha outro nome: já existe um ingresso {nome} neste grupo.",
    erroPreco: "Informe o preço. Para ingresso gratuito, use 0,00.",
    erroQuantidade: "Informe quantos ingressos o 1º lote vende.",
    criado: "{ingresso} criado no {grupo}.",
    rotulo: "Criar ingresso em {grupo}",
    primeiroLote: "1º lote",
};

/** O que foi digitado, para "Mais opções" levar à página do ingresso. */
export interface RascunhoRapido {
    nome: string;
    beneficio: NonNullable<TipoIngresso["beneficio"]>;
    preco?: number;
    quantidade?: number;
}

export type MotivoDoFechamentoDoIngresso = "cancelado" | "mais-opcoes";

export function FormularioDoIngresso({
    evento,
    grupo,
    onPedirFechar,
    onAlterado,
    onAntesDeCriar,
    onMaisOpcoes,
}: {
    evento: Evento;
    grupo: Grupo;
    /** Cancelar ou Esc: quem abriu confirma o descarte se houver algo digitado (ITM-133). */
    onPedirFechar: () => void;
    onAlterado?: (alterado: boolean) => void;
    /** Antes de gravar: a lista marca o ingresso como novo, para ele entrar com animação. */
    onAntesDeCriar?: (id: string) => void;
    onMaisOpcoes: (rascunho: RascunhoRapido) => void;
}) {
    const { t, preco: emReais } = useTextosItens();
    const [nome, setNome] = useState("");
    const [nomeTocado, setNomeTocado] = useState(false);
    const [beneficio, setBeneficio] = useState<RascunhoRapido["beneficio"]>("inteira");
    const [preco, setPreco] = useState<number | undefined>(undefined);
    const [precoSugerido, setPrecoSugerido] = useState(false);
    const [quantidade, setQuantidade] = useState("");
    const [tentou, setTentou] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [anuncio, setAnuncio] = useState("");
    const raiz = useRef<HTMLFormElement>(null);
    const focarNome = () => raiz.current?.querySelector<HTMLInputElement>('[data-campo="nome"] input')?.focus();

    useEffect(() => {
        raiz.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        focarNome();
    }, []);

    const alterado = nome.trim() !== "" || preco !== undefined || quantidade !== "";
    useEffect(() => {
        onAlterado?.(alterado);
    }, [alterado]);
    useEffect(
        () => () => {
            onAlterado?.(false);
        },
        [],
    );

    // Preço da Inteira do grupo, para sugerir a metade na Meia-entrada.
    const precoDaInteira = grupo.ingressos.find((x) => (x.beneficio ?? "inteira") === "inteira")?.lotes[0]?.preco;
    const trocarBeneficio = (b: RascunhoRapido["beneficio"]) => {
        setBeneficio(b);
        // O nome segue o tipo enquanto não for digitado.
        if (!nomeTocado) setNome(b === "meia-entrada" ? T.meia : nome === T.meia ? "" : nome);
        if (b === "meia-entrada" && precoDaInteira && (preco === undefined || precoSugerido)) {
            setPreco(Math.round((precoDaInteira / 2) * 100) / 100);
            setPrecoSugerido(true);
        } else if (b === "inteira" && precoSugerido) {
            setPreco(undefined);
            setPrecoSugerido(false);
        }
    };

    const repetido = grupo.ingressos.some((x) => x.nome.trim().toLowerCase() === nome.trim().toLowerCase());
    const erroNome = !nome.trim() ? T.erroNome : repetido ? formatar(T.erroRepetido, { nome: nome.trim() }) : undefined;
    const erroPreco = preco === undefined ? T.erroPreco : undefined;
    const qtd = Math.round(Number(quantidade));
    const erroQuantidade = !quantidade.trim() || !(qtd > 0) ? T.erroQuantidade : undefined;


    const criar = async (e?: FormEvent) => {
        e?.preventDefault();
        if (salvando) return;
        setTentou(true);
        if (erroNome || erroPreco || erroQuantidade) {
            const primeiro = erroNome ? "nome" : erroPreco ? "preco" : "quantidade";
            raiz.current?.querySelector<HTMLElement>(`[data-campo="${primeiro}"] input`)?.focus();
            return;
        }
        setSalvando(true);
        const base = ingressoNovo();
        const tipo: TipoIngresso = {
            ...base,
            nome: nome.trim(),
            beneficio,
            lotes: [{ ...base.lotes[0], nome: T.primeiroLote, preco: preco ?? 0, quantidade: qtd }],
        };
        // A linha nova entra acima do formulário e a lista rola junto, para ele ficar parado (ITM-139).
        onAntesDeCriar?.(tipo.id);
        try {
            await salvarSessoes(evento, comIngresso(evento, tipo, grupo.id));
            setNome("");
            setNomeTocado(false);
            setPreco(undefined);
            setPrecoSugerido(false);
            setQuantidade("");
            setBeneficio("inteira");
            setTentou(false);
            setAnuncio(formatar(T.criado, { ingresso: tipo.nome, grupo: grupo.nome }));
            focarNome();
        } catch {
            toast.error(t.erroAoSalvar);
        } finally {
            setSalvando(false);
        }
    };

    const aoTeclar = (e: KeyboardEvent) => {
        if (e.key === "Escape" && !e.defaultPrevented) {
            e.preventDefault();
            onPedirFechar();
        }
    };

    return (
        <IngressoAberto>
            <form ref={raiz} aria-label={formatar(T.rotulo, { grupo: grupo.nome })} onSubmit={criar} onKeyDown={aoTeclar} noValidate className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start gap-3">
                    <div data-campo="nome" className="w-full md:w-auto md:min-w-48 md:flex-1">
                        <Input
                            label={T.nome}
                            isRequired
                            maxLength={70}
                            value={nome}
                            onChange={(v) => {
                                setNome(v);
                                setNomeTocado(v.trim() !== "");
                            }}
                            placeholder={T.nomePlaceholder}
                            autoComplete="off"
                            isInvalid={tentou && !!erroNome}
                            hint={tentou ? erroNome : undefined}
                        />
                    </div>
                    <div data-campo="tipo" className="w-full sm:w-auto sm:min-w-40 sm:flex-1 md:w-44 md:flex-none">
                        <Select
                            label={T.tipo}
                            selectedKey={beneficio}
                            onSelectionChange={(k) => k && trocarBeneficio(k as RascunhoRapido["beneficio"])}
                            items={[
                                { id: "inteira", label: T.inteira },
                                { id: "meia-entrada", label: T.meia },
                            ]}
                        >
                            {(i) => <Select.Item id={i.id}>{i.label}</Select.Item>}
                        </Select>
                    </div>
                    <div data-campo="preco" className="min-w-0 flex-1 md:w-40 md:flex-none">
                        <CampoPreco
                            label={T.preco}
                            isRequired
                            opcional
                            valor={preco}
                            onChange={(v) => {
                                setPreco(v);
                                setPrecoSugerido(false);
                            }}
                            isInvalid={tentou && !!erroPreco}
                            hint={tentou && erroPreco ? erroPreco : precoSugerido && preco !== undefined ? T.metade : undefined}
                        />
                    </div>
                    <div data-campo="quantidade" className="min-w-0 flex-1 md:w-32 md:flex-none">
                        <Input
                            label={T.quantidade}
                            isRequired
                            inputMode="numeric"
                            autoComplete="off"
                            value={quantidade}
                            onChange={(v) => setQuantidade(v.replace(/\D/g, "").slice(0, 7))}
                            placeholder={T.quantidadePlaceholder}
                            isInvalid={tentou && !!erroQuantidade}
                            hint={tentou ? erroQuantidade : undefined}
                        />
                    </div>
                </div>

                {/* Rodapé: "Mais opções" à esquerda (leva o que foi digitado para a página do ingresso) e os botões no canto direito. */}
                <div className="flex flex-wrap items-center justify-end gap-3">
                    <Button
                        type="button"
                        color="link-gray"
                        size="sm"
                        iconTrailing={ArrowRight}
                        // Seta: leva para a página do ingresso. A área de toque vai a 44 px sem mudar o desenho.
                        className="mr-auto after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']"
                        onClick={() => onMaisOpcoes({ nome: nome.trim(), beneficio, preco, quantidade: qtd > 0 ? qtd : undefined })}
                    >
                        {T.maisOpcoes}
                    </Button>
                    <div className="flex shrink-0 items-center gap-1.5">
                        <Button type="button" color="secondary" size="md" onClick={onPedirFechar}>
                            {T.cancelar}
                        </Button>
                        <Button type="submit" color="primary" size="md" isLoading={salvando} showTextWhileLoading>
                            {T.criar}
                        </Button>
                    </div>
                </div>

                {/* Leitor de tela: confirma cada ingresso criado, sem toast empilhado. */}
                <p role="status" aria-live="polite" className="sr-only">
                    {anuncio}
                </p>
                {/* Preço sugerido fica visível no campo; o valor da Inteira vai para quem usa leitor de tela. */}
                {precoSugerido && precoDaInteira ? <span className="sr-only">{`${T.inteira}: ${emReais(precoDaInteira)}`}</span> : null}
            </form>
        </IngressoAberto>
    );
}
