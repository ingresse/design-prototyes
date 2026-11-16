import type { ReactNode } from "react";
import { Link } from "react-router";
import { ChevronRight, Folder } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { cx } from "@/utils/cx";
import { NumeroGrande, Secao } from "../../components/financas/cascata";
import { calendario, eventosDoCenario, totalizar, type Evento } from "../../components/financas/dados";
import { Aviso, AvisoDeBloqueio, Carregando, ErroAoCarregar, SemEventos, TelaFinal, type AcaoFinal } from "../../components/financas/estados";
import { dataComDia, dataDoEvento, reais } from "../../components/financas/formato";
import { fraseDeCompensacao, statusDoDinheiro } from "../../components/financas/frases";
import { CabecalhoDaPagina, FinancasShell, useCenario, useParametro } from "../../components/financas/shell";
import { SelosDoEvento } from "../components/selos-do-evento";

/*
 * Jornada "Eventos como pastas" (direção D do briefing de 16/11/2026).
 * Sem tabela de muitas colunas: cada evento é uma pasta com uma frase de status do dinheiro.
 * O que explica o dinheiro (conta, calendário, ajustes) mora dentro da pasta, na página do evento.
 */

const ACOES: AcaoFinal[] = ["repasse", "antecipar", "eventos"];

/** Três números do topo, cada um com rótulo, valor e uma linha de apoio na mesma coluna. */
const Numero = ({ rotulo, valor, apoio, cor, children }: { rotulo: string; valor: number; apoio: string; cor: string; children?: ReactNode }) => (
    <div className="flex min-w-0 flex-col gap-3 px-6 py-5">
        <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-secondary">{rotulo}</span>
            <NumeroGrande valor={valor} className={cx("text-display-xs", cor)} classeDosCentavos="text-lg" />
            <span className="text-sm text-tertiary">{apoio}</span>
        </div>
        {children}
    </div>
);

const PastaDoEvento = ({ evento, sufixo }: { evento: Evento; sufixo: string }) => (
    <li>
        <Link
            to={`/payout/financas-eventos/${evento.id}${sufixo}`}
            className="group flex items-center gap-4 px-6 py-5 outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover focus-visible:outline-2 focus-visible:-outline-offset-2"
        >
            <FeaturedIcon icon={Folder} color="gray" theme="modern" size="md" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-md font-semibold text-primary">{evento.nome}</span>
                    <span className="text-sm text-tertiary">{dataDoEvento(evento.data)}</span>
                    <SelosDoEvento evento={evento} />
                </div>
                <span className={cx("text-sm", evento.disponivel < 0 ? "text-error-primary" : "text-secondary")}>{statusDoDinheiro(evento)}</span>
            </div>
            <ChevronRight className="size-5 shrink-0 text-fg-quaternary transition duration-100 ease-linear group-hover:text-fg-secondary" aria-hidden="true" />
        </Link>
    </li>
);

export function FinancasEventos() {
    const [cenario, setCenario] = useCenario();
    const [acaoAberta, setAcao] = useParametro("acao");

    const eventos = eventosDoCenario(cenario);
    const totais = totalizar(eventos);
    const bloqueado = cenario === "bloqueado";
    const acao = ACOES.find((a) => a === acaoAberta);
    const sufixo = cenario === "normal" ? "" : `?cenario=${cenario}`;
    const proxima = calendario(eventos)[0];
    const compensa = fraseDeCompensacao(eventos);

    const conteudo = () => {
        if (acao) return <TelaFinal acao={acao} valor={acao === "repasse" ? totais.disponivel : acao === "antecipar" ? totais.aLiberar : undefined} aoVoltar={() => setAcao(null)} />;
        if (cenario === "carregando") return <Carregando />;
        if (cenario === "erro") return <ErroAoCarregar aoTentar={() => setCenario("normal")} />;
        if (cenario === "sem-eventos") return <SemEventos aoIrParaEventos={() => setAcao("eventos")} />;
        return (
            <>
                {bloqueado && <AvisoDeBloqueio />}
                {compensa && (
                    <Aviso tom="erro" titulo={`Seu Disponível agora está negativo em ${reais(-totais.disponivel)}`}>
                        <p>O evento Arraial Estrelado São Paulo teve ajustes depois do último repasse e você já sacou o que estava disponível nos outros eventos.</p>
                        <p>Você não precisa pagar nada. {compensa}</p>
                    </Aviso>
                )}
                <section aria-label="Resumo do seu dinheiro" className="grid grid-cols-3 divide-x divide-secondary rounded-2xl bg-primary ring-1 ring-secondary">
                    <Numero
                        rotulo="Disponível agora"
                        valor={totais.disponivel}
                        cor={totais.disponivel < 0 ? "text-error-primary" : "text-success-primary"}
                        apoio={totais.disponivel > 0 ? "Para sacar hoje, somando todos os eventos." : "Nada para sacar hoje."}
                    />
                    <Numero
                        rotulo="A liberar"
                        valor={totais.aLiberar}
                        cor="text-utility-blue-500"
                        apoio={proxima ? `Próxima liberação: ${reais(proxima.valor)} em ${dataComDia(proxima.data)}.` : "Nenhuma liberação prevista."}
                    >
                        {totais.aLiberar > 0 && (
                            <Button size="sm" color="secondary" className="self-start" isDisabled={bloqueado} onClick={() => setAcao("antecipar")}>
                                Antecipar
                            </Button>
                        )}
                    </Numero>
                    <Numero rotulo="Já recebido" valor={totais.recebido} cor="text-primary" apoio="Repasses que já caíram na sua conta." />
                </section>
                <Secao titulo="Seus eventos" descricao="Abra um evento para ver de onde veio o dinheiro, onde ele está e quando chega.">
                    <ul className="flex flex-col divide-y divide-secondary overflow-hidden rounded-b-2xl">
                        {eventos.map((e) => (
                            <PastaDoEvento key={e.id} evento={e} sufixo={sufixo} />
                        ))}
                    </ul>
                </Secao>
            </>
        );
    };

    const temDados = !acao && (cenario === "normal" || cenario === "negativo" || bloqueado);

    return (
        <FinancasShell jornada="Jornada · Eventos como pastas">
            <CabecalhoDaPagina
                titulo="Finanças"
                acoes={
                    temDados && (
                        <Button size="md" color="primary" isDisabled={bloqueado || totais.disponivel <= 0} onClick={() => setAcao("repasse")}>
                            Solicitar repasse
                        </Button>
                    )
                }
            />
            {conteudo()}
        </FinancasShell>
    );
}
