import type { FC, ReactNode } from "react";
import { AlertCircle, AlertTriangle, ArrowLeft, Calendar, CoinsHand, RefreshCw01, Send01 } from "@untitledui/icons";
import { toast } from "sonner";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { cx } from "@/utils/cx";
import { reais } from "./formato";

/* Estados de tela dos protótipos de Finanças (briefing, seção 4), acessados pelo seletor de cenário. */

/* ---------------- aviso em linha ---------------- */

interface AvisoProps {
    tom: "alerta" | "erro";
    titulo: string;
    children: ReactNode;
    acao?: ReactNode;
}

/**
 * Aviso dentro da página. Mesma composição do AlertFloating do DS (ícone em destaque, título,
 * descrição, ação), sem cortar o texto em uma linha: aqui a explicação precisa ser lida inteira.
 */
export const Aviso = ({ tom, titulo, children, acao }: AvisoProps) => (
    <div role="status" className={cx("flex gap-4 rounded-xl bg-primary p-4 ring-1 ring-inset", tom === "erro" ? "ring-error_subtle" : "ring-primary")}>
        <FeaturedIcon icon={tom === "erro" ? AlertCircle : AlertTriangle} color={tom === "erro" ? "error" : "warning"} theme="outline" size="md" />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-secondary">{titulo}</p>
                <div className="flex max-w-3xl flex-col gap-1 text-sm text-tertiary">{children}</div>
            </div>
            {acao && <div className="flex gap-3">{acao}</div>}
        </div>
    </div>
);

/** Repasses pausados, em linguagem de cliente. O dinheiro continua visível na tela. */
export const AvisoDeBloqueio = () => (
    <Aviso
        tom="alerta"
        titulo="Seus repasses estão pausados"
        acao={
            <Button size="sm" color="secondary" onClick={() => toast("Aqui abriria a conversa com o atendimento.")}>
                Falar com o atendimento
            </Button>
        }
    >
        <p>Precisamos confirmar os dados da conta bancária da Arena Produções antes de enviar novos repasses.</p>
        <p>Seu dinheiro continua guardado e os valores desta tela seguem atualizados. Assim que a conta for confirmada, você volta a solicitar repasses.</p>
    </Aviso>
);

/* ---------------- carregando ---------------- */

/* Lacuna do DS: não existe componente de esqueleto. Mesmo recurso do Figma atual: bloco bg-tertiary. */
const Bloco = ({ className }: { className?: string }) => <div aria-hidden="true" className={cx("animate-pulse rounded-md bg-tertiary", className)} />;

export const Carregando = () => (
    <div role="status" aria-label="Carregando suas finanças" className="flex flex-col gap-6">
        <div className="flex flex-col gap-5 rounded-2xl bg-primary p-6 ring-1 ring-secondary">
            <Bloco className="h-5 w-56" />
            <div className="grid grid-cols-5 gap-6">
                {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="flex flex-col gap-3">
                        <Bloco className="h-3 w-24" />
                        <Bloco className="h-8 w-full" />
                    </div>
                ))}
            </div>
            <Bloco className="h-2 w-full rounded-full" />
        </div>
        <div className="flex flex-col gap-5 rounded-2xl bg-primary p-6 ring-1 ring-secondary">
            <Bloco className="h-5 w-40" />
            {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex items-center gap-4">
                    <Bloco className="size-10 rounded-lg" />
                    <div className="flex flex-1 flex-col gap-2">
                        <Bloco className="h-4 w-72" />
                        <Bloco className="h-3 w-96" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

/* ---------------- erro e sem eventos ---------------- */

const EstadoCentral = ({ icone, titulo, descricao, acao }: { icone: FC<{ className?: string }>; titulo: string; descricao: string; acao: ReactNode }) => (
    <div className="flex flex-1 items-center justify-center rounded-2xl bg-primary px-6 py-20 ring-1 ring-secondary">
        <EmptyState size="sm">
            <EmptyState.Header>
                <EmptyState.FeaturedIcon icon={icone} color="gray" theme="modern" />
            </EmptyState.Header>
            <EmptyState.Content>
                <EmptyState.Title>{titulo}</EmptyState.Title>
                <EmptyState.Description>{descricao}</EmptyState.Description>
            </EmptyState.Content>
            <EmptyState.Footer>{acao}</EmptyState.Footer>
        </EmptyState>
    </div>
);

export const ErroAoCarregar = ({ aoTentar }: { aoTentar: () => void }) => (
    <EstadoCentral
        icone={AlertCircle}
        titulo="Não conseguimos carregar suas finanças"
        descricao="O problema é do nosso lado e seu dinheiro não foi afetado. Tente de novo em instantes."
        acao={
            <Button size="md" color="secondary" iconLeading={RefreshCw01} onClick={aoTentar}>
                Tentar de novo
            </Button>
        }
    />
);

export const SemEventos = ({ aoIrParaEventos }: { aoIrParaEventos: () => void }) => (
    <EstadoCentral
        icone={Calendar}
        titulo="Você ainda não tem eventos com vendas"
        descricao="Quando um evento seu começar a vender, o dinheiro aparece aqui: quanto vendeu, quanto é seu e quando você recebe."
        acao={
            <Button size="md" color="primary" onClick={aoIrParaEventos}>
                Ir para Eventos
            </Button>
        }
    />
);

/* ---------------- tela final (fora do teste) ---------------- */

export type AcaoFinal = "repasse" | "antecipar" | "eventos";

interface TelaFinalProps {
    acao: AcaoFinal;
    /** Nome do evento já selecionado; sem ele, vale para todos os eventos. */
    evento?: string;
    valor?: number;
    aoVoltar: () => void;
}

/** "Aqui começa o repasse": o fluxo de repasse e o de antecipação não fazem parte deste teste. */
export const TelaFinal = ({ acao, evento, valor, aoVoltar }: TelaFinalProps) => {
    const escopo = evento ? `com o evento ${evento} já selecionado` : "com todos os seus eventos";
    const textos = {
        repasse: {
            icone: Send01,
            titulo: "Aqui começa o repasse",
            descricao: `O pedido de repasse abre ${escopo}${valor !== undefined ? ` e ${reais(valor)} disponíveis para sacar` : ""}.`,
        },
        antecipar: {
            icone: CoinsHand,
            titulo: "Aqui começa a antecipação",
            descricao: `A antecipação abre ${escopo}${valor !== undefined ? ` e ${reais(valor)} a liberar` : ""}. A taxa aparece antes de você confirmar.`,
        },
        eventos: { icone: Calendar, titulo: "Aqui você vai para Eventos", descricao: "A lista de eventos da organização abre a partir daqui." },
    }[acao];
    return (
        <div className="flex flex-1 items-center justify-center rounded-2xl bg-primary px-6 py-20 ring-1 ring-secondary">
            <EmptyState size="md">
                <EmptyState.Header>
                    <EmptyState.FeaturedIcon icon={textos.icone} color="gray" theme="modern" />
                </EmptyState.Header>
                <EmptyState.Content>
                    <EmptyState.Title>{textos.titulo}</EmptyState.Title>
                    <EmptyState.Description>{textos.descricao} Esta etapa não faz parte do teste de hoje.</EmptyState.Description>
                </EmptyState.Content>
                <EmptyState.Footer>
                    <Button size="md" color="secondary" iconLeading={ArrowLeft} onClick={aoVoltar}>
                        Voltar
                    </Button>
                </EmptyState.Footer>
            </EmptyState>
        </div>
    );
};
