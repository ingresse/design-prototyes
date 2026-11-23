import { useEffect, useRef } from "react";
import { Plus, Trash01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import type { EntradaDoLocal } from "@/plataforma";

/*
 * Entradas do local (EVT-166): opcional, logo depois do Local. Uma lista com o nome de cada entrada
 * (portão) do local, com adicionar, renomear no próprio campo e remover. Os grupos de ingressos
 * oferecem estas entradas em "Acesso na portaria" (itens/rules.md ITM-162). O endereço e o ponto
 * exato de cada entrada ficam para depois (Em aberto).
 */

let sequencia = 0;
const novaEntrada = (): EntradaDoLocal => ({ id: `entrada-${Date.now().toString(36)}-${++sequencia}`, nome: "" });

const chave = (nome: string) => nome.trim().toLowerCase();

/** Ids das entradas com nome repetido (sem diferenciar maiúsculas). Nome vazio não conta: sai ao gravar. */
export function entradasRepetidas(entradas: EntradaDoLocal[]): Set<string> {
    const contagem = new Map<string, number>();
    entradas.forEach((e) => chave(e.nome) && contagem.set(chave(e.nome), (contagem.get(chave(e.nome)) ?? 0) + 1));
    return new Set(entradas.filter((e) => (contagem.get(chave(e.nome)) ?? 0) > 1).map((e) => e.id));
}

/** O que vai gravado: só as entradas com nome, sem espaço sobrando. */
export const entradasParaGravar = (entradas: EntradaDoLocal[]) => entradas.map((e) => ({ ...e, nome: e.nome.trim() })).filter((e) => e.nome);

export function CampoEntradas({
    entradas,
    onChange,
    mostrarErros,
}: {
    entradas: EntradaDoLocal[];
    onChange: (entradas: EntradaDoLocal[]) => void;
    /** Depois de tentar criar ou salvar: marca os nomes repetidos. */
    mostrarErros: boolean;
}) {
    const lista = useRef<HTMLUListElement>(null);
    // Entrada nova: o foco vai para o nome dela.
    const focarUltima = useRef(false);
    useEffect(() => {
        if (!focarUltima.current) return;
        focarUltima.current = false;
        lista.current?.querySelector<HTMLInputElement>("li:last-child input")?.focus();
    }, [entradas.length]);
    const repetidas = mostrarErros ? entradasRepetidas(entradas) : new Set<string>();

    return (
        <div id="campo-entradas" className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-secondary">Entradas do local</span>
                <span className="text-sm text-tertiary">Opcional. Os portões por onde o público entra; os grupos de ingressos mostram essas entradas.</span>
            </div>
            {entradas.length > 0 && (
                <ul ref={lista} className="flex flex-col gap-3">
                    {entradas.map((e, i) => (
                        <li key={e.id} className="flex items-start gap-2" data-erro={repetidas.has(e.id) ? "" : undefined}>
                            <div className="min-w-0 flex-1">
                                <Input
                                    aria-label={`Nome da entrada ${i + 1}`}
                                    value={e.nome}
                                    onChange={(nome) => onChange(entradas.map((x) => (x.id === e.id ? { ...x, nome } : x)))}
                                    placeholder="Ex.: Portão A"
                                    autoComplete="off"
                                    isInvalid={repetidas.has(e.id)}
                                    hint={repetidas.has(e.id) ? "Já há uma entrada com esse nome." : undefined}
                                />
                            </div>
                            <ButtonUtility
                                icon={Trash01}
                                color="tertiary"
                                size="sm"
                                tooltip={e.nome.trim() ? `Remover ${e.nome.trim()}` : `Remover a entrada ${i + 1}`}
                                onClick={() => onChange(entradas.filter((x) => x.id !== e.id))}
                                className="mt-1.5"
                            />
                        </li>
                    ))}
                </ul>
            )}
            <div>
                <Button
                    color="secondary"
                    size="sm"
                    iconLeading={Plus}
                    onClick={() => {
                        focarUltima.current = true;
                        onChange([...entradas, novaEntrada()]);
                    }}
                >
                    Adicionar entrada
                </Button>
            </div>
        </div>
    );
}
