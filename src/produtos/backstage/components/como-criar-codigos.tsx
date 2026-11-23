import { type ReactNode, useMemo } from "react";
import { XClose } from "@untitledui/icons";
import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { TextArea } from "@/components/base/textarea/textarea";
import { Surgir } from "@/components/foundations/transicao";
import { cx } from "@/utils/cx";
import { formatar, useTextosItens } from "../itens/data/textos-itens";

/*
 * "Como criar os códigos" (Passkey e Cupons, UI-DS-003): o mesmo passo nos dois. Dois cartões,
 * "Criar automaticamente" e "Criar manualmente"; o rádio fica só no cabeçalho do cartão e os campos
 * são irmãos dele, fora do rótulo, então o clique no campo foca o campo (UI-FRM-009, WCAG 2.1.1).
 * O cartão escolhido abre os campos deslizando (Surgir, com movimento reduzido).
 *
 * `CampoDeCodigos`: a lista digitada (ou importada) é validada como um todo (UI-EST-008): inválidos
 * (símbolo, espaço, acento) e repetidos aparecem destacados embaixo, com o X para tirar; inválido
 * bloqueia quem usa (`validarCodigos`); a linha de status diz quantos serão criados.
 */

export type MetodoDeCriacao = "automatico" | "manual";

export interface OpcaoDeCriacao {
    id: MetodoDeCriacao;
    titulo: string;
    dica: string;
    conteudo: ReactNode;
}

export function ComoCriarCodigos({
    rotulo,
    metodo,
    onMetodo,
    opcoes,
}: {
    rotulo: string;
    metodo: MetodoDeCriacao | null;
    onMetodo: (m: MetodoDeCriacao) => void;
    opcoes: OpcaoDeCriacao[];
}) {
    return (
        <RadioGroup size="md" aria-label={rotulo} value={metodo ?? ""} onChange={(v) => onMetodo(v as MetodoDeCriacao)} className="gap-3">
            {opcoes.map((o) => (
                <div
                    key={o.id}
                    className={cx(
                        "w-full rounded-xl bg-primary p-4 ring-inset transition duration-100 ease-linear md:px-5",
                        metodo === o.id ? "ring-2 ring-brand" : "ring-1 ring-secondary",
                    )}
                >
                    <RadioButton value={o.id} size="md" label={o.titulo} hint={o.dica} />
                    <Surgir visivel={metodo === o.id}>
                        <div className="pt-4 sm:pl-8">{o.conteudo}</div>
                    </Surgir>
                </div>
            ))}
        </RadioGroup>
    );
}

/** Exemplos do que será gerado. */
export function ExemplosDeCodigos({ titulo, exemplos }: { titulo: string; exemplos: string[] }) {
    return (
        <div className="flex flex-col gap-2 rounded-lg bg-secondary_subtle p-3 ring-1 ring-secondary">
            <span className="text-sm font-medium text-secondary">{titulo}</span>
            <ul className="flex flex-wrap gap-2">
                {exemplos.map((e, i) => (
                    <li key={`${e}-${i}`} className="rounded-md bg-primary px-2 py-0.5 font-mono text-sm text-primary ring-1 ring-secondary">
                        {e}
                    </li>
                ))}
            </ul>
        </div>
    );
}

/** Exemplos que batem com o gerador: o prefixo limpo e `tamanho` caracteres do alfabeto, sem repetir. */
export function exemplosDoGerador(prefixo: string, alfabeto: string, tamanho: (base: string) => number, quantos = 6) {
    const base = prefixo
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
    const n = tamanho(base);
    let semente = 11;
    const proximo = () => (semente = (semente * 16807) % 2147483647);
    return Array.from({ length: quantos }, () => base + Array.from({ length: n }, () => alfabeto[proximo() % alfabeto.length]).join(""));
}

const VALIDO = /^[A-Za-z0-9]+$/;

/** Códigos digitados, separados por vírgula ou linha (vazios descartados). */
export const lerLista = (texto: string) =>
    texto
        .split(/[,\n\r;]/)
        .map((s) => s.trim())
        .filter(Boolean);

export interface CodigoAvaliado {
    valor: string;
    indice: number;
    estado: "ok" | "invalido" | "repetido";
}

/** Valida a lista inteira: inválido bloqueia; repetido (na lista ou no evento, sem diferenciar maiúsculas) não é criado. */
export function validarCodigos(lista: string[], existentes: Set<string>, limite: number) {
    const vistos = new Set([...existentes].map((c) => c.toUpperCase()));
    const avaliados: CodigoAvaliado[] = lista.map((valor, indice) => {
        if (!VALIDO.test(valor)) return { valor, indice, estado: "invalido" };
        const n = valor.toUpperCase();
        if (vistos.has(n)) return { valor, indice, estado: "repetido" };
        vistos.add(n);
        return { valor, indice, estado: "ok" };
    });
    const validos = avaliados.filter((a) => a.estado === "ok").map((a) => a.valor.toUpperCase());
    const invalidos = avaliados.filter((a) => a.estado === "invalido");
    const repetidos = avaliados.filter((a) => a.estado === "repetido");
    return {
        avaliados,
        validos,
        invalidos,
        repetidos,
        acimaDoLimite: lista.length > limite,
        bloqueia: invalidos.length > 0 || lista.length > limite || validos.length === 0,
    };
}

const T = {
    contador: "{n} / {max}",
    invalidos: {
        one: "{n} código inválido: use só letras e números, sem espaço, acento ou símbolo. Ajuste ou tire o destacado para continuar.",
        other: "{n} códigos inválidos: use só letras e números, sem espaço, acento ou símbolo. Ajuste ou tire os destacados para continuar.",
    },
    repetidos: { one: "{n} repetido não será criado.", other: "{n} repetidos não serão criados." },
    acimaDoLimite: "Use no máximo {max} códigos de uma vez.",
    seraoCriados: { one: "{n} {nome} será criada.", other: "{n} {nomes} serão criadas." },
    seraoCriadosM: { one: "{n} {nome} será criado.", other: "{n} {nomes} serão criados." },
    tirar: "Tirar {codigo}",
    repetido: "repetido",
    eMais: { one: "e mais {n}", other: "e mais {n}" },
    problemas: "Códigos para ajustar",
};

/**
 * Caixa de códigos digitados, com a validação da lista inteira embaixo. `nome` dá o "N Passkeys
 * serão criadas" ou "N cupons serão criados" (`feminino` escolhe a concordância).
 */
export function CampoDeCodigos({
    rotulo,
    placeholder,
    texto,
    onTexto,
    existentes,
    limite,
    nome,
    feminino = false,
    acoes,
}: {
    rotulo: string;
    placeholder: string;
    texto: string;
    onTexto: (t: string) => void;
    existentes: Set<string>;
    limite: number;
    nome: { one: string; other: string };
    feminino?: boolean;
    /** Importar e baixar modelo, embaixo da validação. */
    acoes?: ReactNode;
}) {
    const { numero, plural } = useTextosItens();
    const lista = useMemo(() => lerLista(texto), [texto]);
    const v = useMemo(() => validarCodigos(lista, existentes, limite), [lista, existentes, limite]);
    const problemas = [...v.invalidos, ...v.repetidos].sort((a, b) => a.indice - b.indice);
    const mostrados = problemas.slice(0, 30);

    const tirar = (indice: number) => onTexto(lista.filter((_, i) => i !== indice).join(", "));
    const criados = plural(feminino ? T.seraoCriados : T.seraoCriadosM, v.validos.length, { nome: nome.one, nomes: nome.other });

    return (
        <div className="flex flex-col gap-3">
            <TextArea
                label={rotulo}
                placeholder={placeholder}
                rows={5}
                value={texto}
                onChange={onTexto}
                isInvalid={v.invalidos.length > 0 || v.acimaDoLimite}
            />
            <div className="flex items-start justify-between gap-3">
                <div role="status" className="flex min-w-0 flex-col gap-1 text-sm">
                    {v.invalidos.length > 0 && <span className="text-error-primary">{plural(T.invalidos, v.invalidos.length)}</span>}
                    {v.acimaDoLimite && <span className="text-error-primary">{formatar(T.acimaDoLimite, { max: numero(limite) })}</span>}
                    {v.repetidos.length > 0 && <span className="text-warning-primary">{plural(T.repetidos, v.repetidos.length)}</span>}
                    {lista.length > 0 && !v.acimaDoLimite && <span className="text-tertiary">{criados}</span>}
                </div>
                <span className="shrink-0 text-sm text-tertiary tabular-nums">{formatar(T.contador, { n: numero(lista.length), max: numero(limite) })}</span>
            </div>
            {/* Na caixa de texto não dá para pintar: os inválidos e os repetidos aparecem embaixo, destacados. */}
            {mostrados.length > 0 && (
                <ul aria-label={T.problemas} className="flex flex-wrap gap-1.5">
                    {mostrados.map((p) => (
                        <li
                            key={`${p.indice}-${p.valor}`}
                            className={cx(
                                "inline-flex h-7 max-w-full items-center gap-1 rounded-md pr-1 pl-2 font-mono text-sm ring-1 ring-inset",
                                p.estado === "invalido"
                                    ? "bg-error-primary text-error-primary ring-error_subtle"
                                    : "bg-warning-primary text-warning-primary ring-fg-warning-secondary",
                            )}
                        >
                            <span className="truncate">{p.estado === "repetido" ? `${p.valor} (${T.repetido})` : p.valor}</span>
                            <button
                                type="button"
                                aria-label={formatar(T.tirar, { codigo: p.valor })}
                                onClick={() => tirar(p.indice)}
                                className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded outline-focus-ring focus-visible:outline-2"
                            >
                                <XClose className="size-3.5" aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                    {problemas.length > mostrados.length && (
                        <li className="self-center text-sm text-tertiary">{plural(T.eMais, problemas.length - mostrados.length)}</li>
                    )}
                </ul>
            )}
            {acoes}
        </div>
    );
}
