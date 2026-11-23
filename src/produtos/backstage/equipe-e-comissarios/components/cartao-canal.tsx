import { useId, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Edit01, HelpCircle } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Toggle } from "@/components/base/toggle/toggle";
import { Tooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import { Surgir } from "@/components/foundations/transicao";
import { cx } from "@/utils/cx";
import { ModalDeConfirmacao } from "../../components/modal-de-confirmacao";
import { INGRESSOS, ITEM_POR_ID } from "../data/catalogo-evento";
import {
    DICA_CANAL,
    geraComissao,
    itemValido,
    itensDoCanal,
    limiteDoCanal,
    plural,
    ROTULO_CANAL,
    ROTULO_COTA,
    salvarCanal,
    usadasDoCanal,
    type CanalGrupo,
    type GrupoEquipe,
} from "../data/equipe";
import { textoComissao } from "../../comissarios/components/comuns";
import type { Comissario } from "../data/equipe";
import { CotaEditavel } from "./cota-editavel";
import { ItensEUso } from "./itens-e-uso";
import { BarraUso } from "./ui-cotas";

/** Resumo dos itens do canal: "Todos os ingressos" ou "3 ingressos, 1 produto". */
function resumoDosItens(itens: string[], todos?: boolean) {
    if (todos) return "Todos os ingressos";
    const conta = { ingresso: 0, produto: 0, combo: 0 };
    for (const id of itens) {
        const i = ITEM_POR_ID[id];
        if (i) conta[i.tipo]++;
    }
    const partes = [
        conta.ingresso && plural(conta.ingresso, "ingresso", "ingressos"),
        conta.produto && plural(conta.produto, "produto", "produtos"),
        conta.combo && plural(conta.combo, "combo", "combos"),
    ].filter(Boolean) as string[];
    return partes.length ? new Intl.ListFormat("pt-BR", { style: "long", type: "conjunction" }).format(partes) : "Nenhum item";
}

/**
 * Um canal do grupo na aba Configuração (ECO-12 a ECO-19). Sem configuração: o que o canal faz e
 * "Configurar". Configurado: liga e desliga direto (com Desfazer, ECO-93), resumo, uso da cota, "Editar"
 * e os itens com o uso e a cota editável no lugar, na árvore sessão › setor › item (ECO-92).
 */
export function CartaoCanal({ grupo, canal, comissario, onConfigurar }: { grupo: GrupoEquipe; canal: CanalGrupo; comissario?: Comissario; onConfigurar: () => void }) {
    // O cartão do comissário só conta como configurado com um comissário no grupo (ECO-12).
    const cfg = canal === "link" && !comissario ? undefined : grupo.canais[canal];
    const titulo = ROTULO_CANAL[canal];
    const [abertos, setAbertos] = useState(false);
    const [editando, setEditando] = useState<string | null>(null);
    const [desligando, setDesligando] = useState(false);
    const idItens = useId();

    if (!cfg)
        return (
            <section className="flex flex-col gap-3 rounded-2xl bg-primary p-5 ring-1 ring-secondary sm:flex-row sm:items-center sm:justify-between">
                <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm font-semibold text-primary">{ROTULO_CANAL[canal]}</span>
                    <span className="text-sm text-tertiary">Não configurado. {DICA_CANAL[canal]}</span>
                </span>
                <Button color="secondary" size="sm" className="shrink-0 self-start sm:self-center" onClick={onConfigurar}>
                    Configurar
                </Button>
            </section>
        );

    const usadas = usadasDoCanal(cfg, itemValido);
    const tipo = cfg.cota.tipo;
    // Com "Todos os ingressos" a lista de itens gravada é vazia: a cota por item soma os ingressos de hoje.
    const limite = cfg.todos && tipo === "por-item" ? INGRESSOS.reduce((s, i) => s + (cfg.cota.porItem[i.id] ?? 0), 0) : limiteDoCanal(cfg, itemValido);
    // Só a contagem: os itens são montados quando a pessoa abre "Ver itens e uso" (ECO-92).
    const nItens = cfg.todos ? INGRESSOS.length : itensDoCanal(cfg, itemValido).length;
    const comissao = geraComissao(grupo, canal, cfg);
    const alterarCota = (fn: (c: typeof cfg.cota) => typeof cfg.cota) => salvarCanal(grupo.id, canal, { ...cfg, cota: fn(cfg.cota) });

    // Liga e desliga gravando na hora, com toast e Desfazer (ECO-93). Desligar canal que gera comissão pergunta antes.
    const ligar = (ligado: boolean, desfazendo = false) => {
        salvarCanal(grupo.id, canal, { ...cfg, ligado });
        toast.success(
            `${titulo} ${ligado ? "ligado" : "desligado"}.`,
            desfazendo ? undefined : { action: { label: "Desfazer", onClick: () => ligar(!ligado, true) } },
        );
    };
    const alternar = (ligado: boolean) => (!ligado && comissao ? setDesligando(true) : ligar(ligado));

    return (
        <section className="flex flex-col gap-4 rounded-2xl bg-primary p-5 ring-1 ring-secondary">
            <div className="flex items-start gap-3">
                <Toggle size="sm" isSelected={cfg.ligado} onChange={alternar} aria-label={`${titulo} ligado`} className="mt-0.5 shrink-0" />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-primary">{titulo}</span>
                        {!cfg.ligado && (
                            <Badge size="sm" type="pill-color" color="gray">
                                Desligado
                            </Badge>
                        )}
                        {grupo.comissarioId && (canal === "pdv" || canal === "bilheteria") && (
                            <Badge size="sm" type="pill-color" color={comissao ? "brand" : "gray"}>
                                {comissao ? "Gera comissão" : "Sem comissão"}
                            </Badge>
                        )}
                    </span>
                    {canal === "link" && comissario && (
                        <span className="text-sm text-tertiary">
                            Link e cupom {comissario.codigo}, {textoComissao(comissario.padrao)}.
                        </span>
                    )}
                    <span className="text-sm text-tertiary">
                        {resumoDosItens(cfg.itens, cfg.todos)}, {ROTULO_COTA[tipo].toLowerCase()}.
                    </span>
                </span>
                {/* "Editar" fica na linha do título também no celular (antes caía solto numa linha própria). */}
                <Button size="sm" color="tertiary" iconLeading={Edit01} className="shrink-0" onClick={onConfigurar}>
                    Editar
                </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3 pl-12">
                {limite === null ? (
                    <span className="flex items-center gap-1 text-sm font-medium text-secondary">
                        Sem limite: {plural(usadas, "emissão", "emissões")}
                        <Tooltip title={<span className="font-normal">Sem cota definida: o limite de cada item é o estoque disponível.</span>} placement="right" arrow>
                            <TooltipTrigger aria-label="Como o limite é calculado" className="flex text-fg-quaternary transition duration-100 ease-linear hover:text-fg-quaternary_hover">
                                <HelpCircle className="size-4" aria-hidden="true" />
                            </TooltipTrigger>
                        </Tooltip>
                    </span>
                ) : tipo === "compartilhada" ? (
                    <CotaEditavel
                        variante="topo"
                        nome={ROTULO_CANAL[canal]}
                        uso={usadas}
                        cota={limite}
                        editando={editando === "total"}
                        onEditar={() => setEditando("total")}
                        onCancelar={() => setEditando(null)}
                        onSalvar={(n) => {
                            alterarCota((c) => ({ ...c, total: n }));
                            setEditando(null);
                        }}
                    />
                ) : (
                    <>
                        <BarraUso usadas={usadas} total={limite} className="w-32 shrink-0 sm:w-60" />
                        <span className="text-sm font-medium text-secondary tabular-nums">
                            {usadas.toLocaleString("pt-BR")} de {limite.toLocaleString("pt-BR")}
                        </span>
                    </>
                )}
            </div>
            {cfg.todos && tipo === "por-item" && (
                <p className="pl-12 text-sm text-tertiary">A cota por item vale para os ingressos de hoje. Ingresso criado depois entra no link sem cota: defina a dele aqui.</p>
            )}

            {nItens > 0 && (
                <div className="flex flex-col gap-3 border-t border-secondary pt-3">
                    <Button
                        color="link-gray"
                        size="sm"
                        className="self-start"
                        aria-expanded={abertos}
                        aria-controls={idItens}
                        iconTrailing={<ChevronDown data-icon className={cx("size-4 transition duration-100 ease-linear", abertos && "rotate-180")} />}
                        onClick={() => setAbertos((a) => !a)}
                    >
                        {abertos ? "Esconder itens" : `Ver itens e uso (${nItens.toLocaleString("pt-BR")})`}
                    </Button>
                    <Surgir visivel={abertos}>
                        <ItensEUso id={idItens} cfg={cfg} onCota={alterarCota} />
                    </Surgir>
                </div>
            )}

            <ModalDeConfirmacao
                aberto={desligando}
                titulo={`Desligar ${titulo}?`}
                descricao={
                    canal === "link"
                        ? "O link e o cupom do comissário param de vender e de contar comissão. O já vendido e o saldo continuam. Você pode ligar de novo quando quiser."
                        : `A venda das pessoas do grupo em ${titulo} para de gerar comissão. O já vendido e o saldo continuam. Você pode ligar de novo quando quiser.`
                }
                cancelar="Cancelar"
                confirmar="Desligar"
                destrutiva
                onConfirmar={() => {
                    setDesligando(false);
                    ligar(false);
                }}
                onFechar={() => setDesligando(false)}
            />
        </section>
    );
}
