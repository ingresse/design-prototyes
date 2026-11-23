import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { novoId, type Evento, type TipoIngresso } from "@/plataforma";
import { comIngresso, salvarSessoes } from "../data/catalogo";
import { formatar, useTextosItens } from "../data/textos-itens";
import { CampoPreco } from "./comuns";

/*
 * Criação de lote na própria lista (ITM-140): com os lotes do ingresso abertos, "Criar lote" (terciário)
 * abre, no lugar dele, nome, preço e quantidade do lote. Enter cria: o lote entra no fim, depois dos outros,
 * e vende quando o anterior esgotar (virada ao atingir estoque). O formulário fica pronto para o próximo,
 * com o nome seguinte ("3º lote") e o foco no preço. Sem borda própria: já está dentro do cartão do grupo.
 */

const T = {
    nome: "Nome do lote",
    preco: "Preço",
    quantidade: "Quantidade",
    quantidadePlaceholder: "Ex.: 200",
    criar: "Criar",
    cancelar: "Cancelar",
    erroNome: "Dê um nome ao lote.",
    erroRepetido: "Escolha outro nome: já existe um {nome} neste ingresso.",
    erroPreco: "Informe o preço. Para lote gratuito, use 0,00.",
    erroQuantidade: "Informe quantos ingressos o lote vende.",
    criado: "{lote} criado em {ingresso}.",
    rotulo: "Criar lote em {ingresso}",
};

/** "3º lote": o próximo número livre entre os nomes do ingresso. */
const proximoNome = (lotes: TipoIngresso["lotes"]) => {
    const usados = new Set(lotes.map((l) => l.nome.trim().toLowerCase()));
    for (let n = lotes.length + 1; ; n++) if (!usados.has(`${n}º lote`)) return `${n}º lote`;
};

export function FormularioDoLote({
    evento,
    tipo,
    onPedirFechar,
    onAlterado,
    onAntesDeCriar,
}: {
    evento: Evento;
    tipo: TipoIngresso;
    /** Cancelar ou Esc: quem abriu confirma o descarte se houver algo digitado (ITM-133). */
    onPedirFechar: () => void;
    onAlterado?: (alterado: boolean) => void;
    /** Antes de gravar: a lista marca o lote como novo, para ele entrar com animação. */
    onAntesDeCriar?: (id: string) => void;
}) {
    const { t } = useTextosItens();
    const sugerido = proximoNome(tipo.lotes);
    const [nome, setNome] = useState(sugerido);
    const [preco, setPreco] = useState<number | undefined>(undefined);
    const [quantidade, setQuantidade] = useState("");
    const [tentou, setTentou] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [anuncio, setAnuncio] = useState("");
    const raiz = useRef<HTMLFormElement>(null);
    const focar = (campo: string) => raiz.current?.querySelector<HTMLInputElement>(`[data-campo="${campo}"] input`)?.focus();

    // O nome já vem sugerido: o foco começa no preço.
    useEffect(() => {
        raiz.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        focar("preco");
    }, []);

    // O nome sugerido não conta como digitado.
    const alterado = (nome.trim() !== "" && nome.trim() !== sugerido) || preco !== undefined || quantidade !== "";
    useEffect(() => {
        onAlterado?.(alterado);
    }, [alterado]);
    useEffect(
        () => () => {
            onAlterado?.(false);
        },
        [],
    );

    const repetido = tipo.lotes.some((l) => l.nome.trim().toLowerCase() === nome.trim().toLowerCase());
    const erroNome = !nome.trim() ? T.erroNome : repetido ? formatar(T.erroRepetido, { nome: nome.trim() }) : undefined;
    const erroPreco = preco === undefined ? T.erroPreco : undefined;
    const qtd = Math.round(Number(quantidade));
    const erroQuantidade = !quantidade.trim() || !(qtd > 0) ? T.erroQuantidade : undefined;


    const criar = async (e?: FormEvent) => {
        e?.preventDefault();
        if (salvando) return;
        setTentou(true);
        if (erroNome || erroPreco || erroQuantidade) {
            focar(erroNome ? "nome" : erroPreco ? "preco" : "quantidade");
            return;
        }
        setSalvando(true);
        const lote = { id: novoId("lot"), nome: nome.trim(), preco: preco ?? 0, quantidade: qtd };
        onAntesDeCriar?.(lote.id);
        try {
            const lotes = [...tipo.lotes, lote];
            await salvarSessoes(evento, comIngresso(evento, { ...tipo, lotes }));
            setNome(proximoNome(lotes));
            setPreco(undefined);
            setQuantidade("");
            setTentou(false);
            setAnuncio(formatar(T.criado, { lote: lote.nome, ingresso: tipo.nome }));
            focar("preco");
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
        <form ref={raiz} aria-label={formatar(T.rotulo, { ingresso: tipo.nome })} onSubmit={criar} onKeyDown={aoTeclar} noValidate className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start gap-3">
                <div data-campo="nome" className="w-full md:w-auto md:min-w-40 md:flex-1">
                    <Input
                        label={T.nome}
                        isRequired
                        maxLength={40}
                        value={nome}
                        onChange={setNome}
                        autoComplete="off"
                        isInvalid={tentou && !!erroNome}
                        hint={tentou ? erroNome : undefined}
                    />
                </div>
                <div data-campo="preco" className="min-w-0 flex-1 md:w-40 md:flex-none">
                    <CampoPreco label={T.preco} isRequired opcional valor={preco} onChange={setPreco} isInvalid={tentou && !!erroPreco} hint={tentou ? erroPreco : undefined} />
                </div>
                <div data-campo="quantidade" className="min-w-0 flex-1 md:w-40 md:flex-none">
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
            <div className="flex items-center justify-end gap-1.5">
                <Button type="button" color="secondary" size="md" onClick={onPedirFechar}>
                    {T.cancelar}
                </Button>
                <Button type="submit" color="primary" size="md" isLoading={salvando} showTextWhileLoading>
                    {T.criar}
                </Button>
            </div>
            {/* Leitor de tela: confirma cada lote criado. */}
            <p role="status" aria-live="polite" className="sr-only">
                {anuncio}
            </p>
        </form>
    );
}
