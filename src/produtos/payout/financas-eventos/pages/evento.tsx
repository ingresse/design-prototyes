import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Download01 } from "@untitledui/icons";
import { toast } from "sonner";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import { Cascata, Distribuicao, Secao } from "../../components/financas/cascata";
import { ROTULO_LIBERACAO, eventosDoCenario, retido, seuDinheiro, type Evento, type Repasse } from "../../components/financas/dados";
import { Aviso, AvisoDeBloqueio, Carregando, ErroAoCarregar, SemEventos, TelaFinal, type AcaoFinal } from "../../components/financas/estados";
import { dataComDia, dataCurta, dataDoEvento, reais } from "../../components/financas/formato";
import { detalhesDaDistribuicao } from "../../components/financas/frases";
import { CabecalhoDaPagina, FinancasShell, useCenario, useParametro } from "../../components/financas/shell";
import { SelosDoEvento } from "../components/selos-do-evento";

/*
 * Página do evento (a pasta aberta): a mesma conta do total, só deste evento; o calendário de
 * liberações; os repasses; os ajustes depois do fechamento; e o que ainda pode mudar, até quando.
 */

const ACOES: AcaoFinal[] = ["repasse", "antecipar"];

/** Linha com guia visual: data à esquerda, o que é no meio, valor à direita, divisor entre linhas. */
const Linha = ({ quando, titulo, detalhe, valor, corDoValor = "text-primary", extra }: { quando: string; titulo: ReactNode; detalhe?: ReactNode; valor?: string; corDoValor?: string; extra?: ReactNode }) => (
    <li className="grid grid-cols-[9rem_minmax(0,1fr)_auto] items-baseline gap-4 px-6 py-4">
        <span className="text-sm font-medium whitespace-nowrap text-secondary">{quando}</span>
        <div className="flex min-w-0 flex-col gap-1">
            <span className="text-sm font-medium text-primary">{titulo}</span>
            {detalhe && <span className="text-sm text-tertiary">{detalhe}</span>}
            {extra}
        </div>
        {valor && <span className={cx("text-sm font-semibold whitespace-nowrap tabular-nums", corDoValor)}>{valor}</span>}
    </li>
);

const Lista = ({ children }: { children: ReactNode }) => <ul className="flex flex-col divide-y divide-secondary">{children}</ul>;
const Vazio = ({ children }: { children: ReactNode }) => <p className="px-6 py-5 text-sm text-tertiary">{children}</p>;

const SITUACAO: Record<Repasse["situacao"], { rotulo: string; cor: "gray" | "success" | "error" }> = {
    agendado: { rotulo: "Agendado", cor: "gray" },
    pago: { rotulo: "Pago", cor: "success" },
    falhou: { rotulo: "Não concluído", cor: "error" },
};

const explicacaoDoNegativo = (e: Evento) =>
    `Você já recebeu ${reais(e.recebido)} deste evento. Depois disso, saíram ${reais(e.ajustes)} em ajustes${e.creditos ? ` e entraram ${reais(e.creditos)} em créditos` : ""}: o que é seu ficou em ${reais(seuDinheiro(e))}. Com ${reais(retido(e))} ainda retidos por segurança, a diferença é de ${reais(-e.disponivel)}.`;

export function FinancasEvento() {
    const navigate = useNavigate();
    const { eventoId } = useParams();
    const [cenario, setCenario] = useCenario();
    const [acaoAberta, setAcao] = useParametro("acao");

    const eventos = eventosDoCenario(cenario);
    const evento = eventos.find((e) => e.id === eventoId);
    const bloqueado = cenario === "bloqueado";
    const acao = ACOES.find((a) => a === acaoAberta);
    const sufixo = cenario === "normal" ? "" : `?cenario=${cenario}`;
    const voltar = () => navigate(`/payout/financas-eventos${sufixo}`);

    const voltarParaFinancas = (
        <Button size="sm" color="link-gray" iconLeading={ArrowLeft} className="self-start" onClick={voltar}>
            Finanças
        </Button>
    );

    if (!evento || cenario === "carregando" || cenario === "erro") {
        return (
            <FinancasShell jornada="Jornada · Eventos como pastas">
                <CabecalhoDaPagina titulo={evento?.nome ?? "Finanças"} acima={evento && voltarParaFinancas} />
                {cenario === "carregando" ? <Carregando /> : cenario === "erro" ? <ErroAoCarregar aoTentar={() => setCenario("normal")} /> : <SemEventos aoIrParaEventos={voltar} />}
            </FinancasShell>
        );
    }

    const proximaRetida = evento.liberacoes.find((l) => l.tipo === "retidoSeguranca");
    const liberacoes = evento.liberacoes.slice().sort((a, b) => a.data.localeCompare(b.data));
    const totalDoCalendario = evento.processamento + liberacoes.reduce((s, l) => s + l.valor, 0);

    return (
        <FinancasShell jornada="Jornada · Eventos como pastas">
            <CabecalhoDaPagina
                titulo={evento.nome}
                acima={voltarParaFinancas}
                abaixo={
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-md text-tertiary">{dataDoEvento(evento.data)}</span>
                        <SelosDoEvento evento={evento} />
                    </div>
                }
                acoes={
                    !acao && (
                        <>
                            {evento.aLiberar > 0 && (
                                <Button size="md" color="secondary" isDisabled={bloqueado} onClick={() => setAcao("antecipar")}>
                                    Antecipar
                                </Button>
                            )}
                            <Button size="md" color="primary" isDisabled={bloqueado || evento.disponivel <= 0} onClick={() => setAcao("repasse")}>
                                Solicitar repasse deste evento
                            </Button>
                        </>
                    )
                }
            />

            {acao ? (
                <TelaFinal acao={acao} evento={evento.nome} valor={acao === "repasse" ? evento.disponivel : evento.aLiberar} aoVoltar={() => setAcao(null)} />
            ) : (
                <>
                    {bloqueado && <AvisoDeBloqueio />}
                    {evento.disponivel < 0 && (
                        <Aviso tom="erro" titulo={`Este evento está com saldo negativo de ${reais(-evento.disponivel)}`}>
                            <p>
                                <span className="font-medium text-secondary">Por quê: </span>
                                {explicacaoDoNegativo(evento)}
                            </p>
                            <p>
                                <span className="font-medium text-secondary">O que acontece agora: </span>
                                você não precisa pagar nada. O valor é compensado com o dinheiro dos seus outros eventos e já está descontado do seu Disponível agora total.
                                {proximaRetida && ` Em ${dataComDia(proximaRetida.data)}, ${reais(proximaRetida.valor)} retidos são liberados e reduzem o saldo negativo para ${reais(-evento.disponivel - proximaRetida.valor)}.`}
                            </p>
                        </Aviso>
                    )}

                    <Secao titulo="A conta deste evento" descricao="Do que foi vendido até o que é seu, e onde cada parte está hoje.">
                        <Cascata totais={{ ...evento, seuDinheiro: seuDinheiro(evento) }} escopo="neste evento" />
                        <Distribuicao totais={{ ...evento, retido: retido(evento), seuDinheiro: seuDinheiro(evento) }} detalhes={detalhesDaDistribuicao([evento])} />
                    </Secao>

                    <div className="grid grid-cols-2 items-start gap-6">
                        <Secao titulo="Calendário de liberações" descricao="Quando cada valor entra no seu Disponível agora.">
                            {totalDoCalendario === 0 ? (
                                <Vazio>Este evento não tem valores para liberar.</Vazio>
                            ) : (
                                <Lista>
                                    {evento.processamento > 0 && (
                                        <Linha quando={evento.emVendas ? "Sem data fixa" : "Hoje, até 18h"} titulo="Em processamento" detalhe={`${evento.motivoProcessamento} ${evento.quandoProcessamento}.`} valor={reais(evento.processamento)} />
                                    )}
                                    {liberacoes.map((l) => (
                                        <Linha
                                            key={`${l.data}-${l.tipo}`}
                                            quando={dataComDia(l.data)}
                                            titulo={ROTULO_LIBERACAO[l.tipo]}
                                            detalhe={l.nota}
                                            valor={reais(l.valor)}
                                            corDoValor={l.tipo === "aLiberar" ? "text-utility-blue-500" : "text-primary"}
                                        />
                                    ))}
                                    <li className="grid grid-cols-[9rem_minmax(0,1fr)_auto] items-baseline gap-4 bg-secondary px-6 py-4">
                                        <span className="col-span-2 text-sm font-semibold text-primary">Total a entrar no seu saldo</span>
                                        <span className="text-sm font-semibold whitespace-nowrap text-primary tabular-nums">{reais(totalDoCalendario)}</span>
                                    </li>
                                </Lista>
                            )}
                        </Secao>

                        <Secao titulo="Repasses" descricao="O que você pediu e o que já caiu na sua conta.">
                            {evento.repasses.length === 0 ? (
                                <Vazio>Você ainda não pediu repasse deste evento.</Vazio>
                            ) : (
                                <Lista>
                                    {evento.repasses.map((r) => (
                                        <Linha
                                            key={`${r.data}-${r.situacao}`}
                                            quando={r.situacao === "agendado" ? dataComDia(r.data) : dataCurta(r.data)}
                                            titulo={
                                                <span className="flex items-center gap-2">
                                                    Repasse
                                                    <Badge size="sm" type="pill-color" color={SITUACAO[r.situacao].cor}>
                                                        {SITUACAO[r.situacao].rotulo}
                                                    </Badge>
                                                </span>
                                            }
                                            detalhe={r.situacao === "agendado" ? "Cai na sua conta bancária nesta data." : r.nota}
                                            valor={reais(r.valor)}
                                            extra={
                                                r.situacao === "pago" ? (
                                                    <Button size="sm" color="link-gray" iconLeading={Download01} className="self-start" onClick={() => toast.success("Comprovante baixado.")}>
                                                        Baixar comprovante
                                                    </Button>
                                                ) : r.situacao === "falhou" ? (
                                                    <Button size="sm" color="link-gray" className="self-start" onClick={() => toast("Aqui abriria a conversa com o atendimento.")}>
                                                        Falar com o atendimento
                                                    </Button>
                                                ) : undefined
                                            }
                                        />
                                    ))}
                                </Lista>
                            )}
                        </Secao>
                    </div>

                    <div className="grid grid-cols-2 items-start gap-6">
                        <Secao titulo="Ajustes depois do fechamento" descricao="O que mudou, quanto, por quê e quando.">
                            {evento.ajustesLista.length === 0 && evento.creditosLista.length === 0 ? (
                                <Vazio>Nenhum ajuste depois do fechamento.</Vazio>
                            ) : (
                                <Lista>
                                    {evento.ajustesLista.map((a) => (
                                        <Linha key={a.titulo} quando={dataCurta(a.data)} titulo={a.titulo} detalhe={a.motivo} valor={reais(-a.valor)} corDoValor="text-error-primary" />
                                    ))}
                                    {evento.creditosLista.map((c) => (
                                        <Linha key={c.titulo} quando={dataCurta(c.data)} titulo={`Crédito · ${c.titulo}`} detalhe={c.motivo} valor={`+ ${reais(c.valor)}`} />
                                    ))}
                                </Lista>
                            )}
                        </Secao>

                        <Secao titulo="O que ainda pode mudar" descricao="O que pode mexer nesta conta daqui para a frente, e até quando.">
                            <Lista>
                                {evento.podeMudar.map((p) => (
                                    <Linha key={p.titulo} quando={p.ate ? `Até ${dataComDia(p.ate)}` : "Sem prazo"} titulo={p.titulo} detalhe={p.texto} />
                                ))}
                                {proximaRetida && (
                                    <Linha
                                        quando={dataComDia(proximaRetida.data)}
                                        titulo="Liberação do retido por segurança"
                                        detalhe={`${reais(proximaRetida.valor)} estão guardados para cobrir esses casos. O que não for usado é liberado nesta data.`}
                                    />
                                )}
                            </Lista>
                        </Secao>
                    </div>
                </>
            )}
        </FinancasShell>
    );
}
