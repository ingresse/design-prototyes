import { BadgeWithDot } from "@/components/base/badges/badges";
import { cx } from "@/utils/cx";

/*
 * Status de pedido e de item do Backstage, e os cartões de métrica das listas de pedidos
 * (Bilheteria online e Cortesias): um desenho e um mapa só, para "Cancelado" ser igual nas duas.
 *
 * Cores pelo sentido, não pela tela:
 * - verde: deu certo (Aprovado, Emitido, Aceito);
 * - amarelo: falta alguém agir (Pendente, Pendente de cadastro, Parcial);
 * - cinza: alguém encerrou de propósito (Cancelado);
 * - vermelho: falhou ou custou dinheiro sem ninguém agir (Expirado, Erro);
 * - azul: em andamento (Processando).
 */

export type CorDeStatus = "success" | "warning" | "gray" | "error" | "blue";

export type StatusDoBackstage =
    "aprovado" | "emitido" | "aceito" | "pendente" | "pendente-de-cadastro" | "parcial" | "cancelado" | "expirado" | "erro" | "processando";

export const MAPA_DE_STATUS: Record<StatusDoBackstage, { rotulo: string; cor: CorDeStatus }> = {
    aprovado: { rotulo: "Aprovado", cor: "success" },
    emitido: { rotulo: "Emitido", cor: "success" },
    aceito: { rotulo: "Aceito", cor: "success" },
    pendente: { rotulo: "Pendente", cor: "warning" },
    "pendente-de-cadastro": { rotulo: "Pendente de cadastro", cor: "warning" },
    parcial: { rotulo: "Parcial", cor: "warning" },
    cancelado: { rotulo: "Cancelado", cor: "gray" },
    expirado: { rotulo: "Expirado", cor: "error" },
    erro: { rotulo: "Erro", cor: "error" },
    processando: { rotulo: "Processando", cor: "blue" },
};

/** Selo de status das listas e dos detalhes: `BadgeWithDot` pill do DS, tamanho md (texto de 14 px). `rotulo` troca o texto (ex.: "Parcial: 2 de 3 cancelados"). */
export function SeloDeStatus({ status, rotulo, className }: { status: StatusDoBackstage; rotulo?: string; className?: string }) {
    const meta = MAPA_DE_STATUS[status];
    return (
        <BadgeWithDot size="md" type="pill-color" color={meta.cor} className={className}>
            {rotulo ?? meta.rotulo}
        </BadgeWithDot>
    );
}

const numero = new Intl.NumberFormat("pt-BR");

/**
 * Cartões de métrica das listas: composto do DS com o desenho do `MetricsSimple` (anel secundário,
 * sombra xs, rótulo sm médio terciário, número display-sm semibold), sem o menu de ações e a tendência,
 * que estas listas não têm. Cada cartão com 10rem ou mais; quantos cabem por linha depende da largura.
 */
export function MetricasDaLista({ metricas, className }: { metricas: { rotulo: string; valor: number | string }[]; className?: string }) {
    return (
        <dl className={cx("grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-4", className)}>
            {metricas.map((m) => (
                <div key={m.rotulo} className="flex flex-col gap-2 rounded-xl bg-primary px-4 py-5 shadow-xs ring-1 ring-secondary ring-inset md:px-5">
                    <dt className="text-sm font-medium text-tertiary">{m.rotulo}</dt>
                    <dd className="text-display-sm font-semibold text-primary tabular-nums">
                        {typeof m.valor === "number" ? numero.format(m.valor) : m.valor}
                    </dd>
                </div>
            ))}
        </dl>
    );
}
