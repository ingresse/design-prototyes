import { Download01 } from "@untitledui/icons";
import { toast } from "sonner";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import { NumeroGrande } from "../../components/financas/cascata";
import { dataDoEvento, reais } from "../../components/financas/formato";
import type { Composicao } from "../data/composicao";

/* Painel lateral com o que compõe uma parte da cascata: explicação e o valor aberto por evento. */

interface PainelDaParteProps {
    composicao: Composicao | null;
    aoFechar: () => void;
    aoSolicitar: () => void;
    aoAntecipar: () => void;
    repasseBloqueado?: boolean;
}

export function PainelDaParte({ composicao, aoFechar, aoSolicitar, aoAntecipar, repasseBloqueado }: PainelDaParteProps) {
    if (!composicao) return null;
    const { titulo, valor, explicacao, grupos, rodape, acao } = composicao;
    return (
        <SlideoutMenu isOpen isDismissable onOpenChange={(aberto) => !aberto && aoFechar()} className="z-50">
            <SlideoutMenu.Header onClose={aoFechar} className="flex flex-col gap-2 pb-5">
                <h2 className="pr-8 text-sm font-medium text-secondary">{titulo}</h2>
                <NumeroGrande valor={valor} className={cx("text-display-xs", valor < 0 ? "text-error-primary" : "text-primary")} classeDosCentavos="text-lg" />
                <p className="text-sm text-tertiary">{explicacao}</p>
            </SlideoutMenu.Header>

            <SlideoutMenu.Content className="gap-0 border-t border-secondary pb-6">
                <h3 className="py-4 text-sm font-semibold text-primary">Por evento</h3>
                <ul className="flex flex-col divide-y divide-secondary border-y border-secondary">
                    {grupos.map(({ evento, valor: valorDoEvento, linhas }) => (
                        <li key={evento.id} className="flex flex-col gap-3 py-4">
                            <div className="flex items-baseline justify-between gap-4">
                                <div className="flex min-w-0 flex-col">
                                    <span className="text-sm font-semibold text-primary">{evento.nome}</span>
                                    <span className="text-xs text-tertiary">{dataDoEvento(evento.data)}</span>
                                </div>
                                <span className={cx("shrink-0 text-md font-semibold whitespace-nowrap tabular-nums", valorDoEvento < 0 ? "text-error-primary" : "text-primary")}>{reais(valorDoEvento)}</span>
                            </div>
                            {linhas.length > 0 && (
                                <ul className="flex flex-col gap-3 border-l border-secondary pl-3">
                                    {linhas.map((linha, i) => (
                                        <li key={i} className="flex flex-col gap-1">
                                            <div className="flex items-baseline justify-between gap-4">
                                                <span className={cx("text-sm", linha.tom === "erro" ? "font-medium text-error-primary" : "text-secondary")}>{linha.texto}</span>
                                                {linha.valor !== undefined && linhas.length > 1 && (
                                                    <span className="shrink-0 text-sm whitespace-nowrap text-secondary tabular-nums">{reais(linha.valor)}</span>
                                                )}
                                            </div>
                                            {linha.detalhe && <p className="text-xs text-tertiary">{linha.detalhe}</p>}
                                            {linha.comprovante && (
                                                <Button size="sm" color="link-gray" iconLeading={Download01} className="self-start" onClick={() => toast.success("Comprovante baixado.")}>
                                                    Baixar comprovante
                                                </Button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    ))}
                </ul>
                {/* O total repete o número do topo: a lista fecha com a parte. */}
                <div className="flex items-baseline justify-between gap-4 py-4">
                    <span className="text-sm font-semibold text-primary">Total · {titulo}</span>
                    <span className={cx("text-md font-semibold whitespace-nowrap tabular-nums", valor < 0 ? "text-error-primary" : "text-primary")}>{reais(valor)}</span>
                </div>
                {rodape && <p className="text-xs text-tertiary">{rodape}</p>}
            </SlideoutMenu.Content>

            <SlideoutMenu.Footer className="flex justify-end gap-3">
                <Button size="md" color="secondary" onClick={aoFechar}>
                    Fechar
                </Button>
                {acao === "repasse" && (
                    <Button size="md" color="primary" isDisabled={repasseBloqueado} onClick={aoSolicitar}>
                        Solicitar repasse
                    </Button>
                )}
                {acao === "antecipar" && (
                    <Button size="md" color="primary" isDisabled={repasseBloqueado} onClick={aoAntecipar}>
                        Antecipar
                    </Button>
                )}
            </SlideoutMenu.Footer>
        </SlideoutMenu>
    );
}
