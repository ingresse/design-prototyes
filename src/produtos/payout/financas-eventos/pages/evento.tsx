import { useLocation, useNavigate, useParams } from "react-router";
import { ArrowLeft, Download01 } from "@untitledui/icons";
import { toast } from "sonner";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Cascata, Distribuicao, PARTES_COM_DETALHE, Secao } from "../../components/financas/cascata";
import { ROTULO_LIBERACAO, TAXA_DA_MODALIDADE, eventosDoCenario, registroDoRepasse, retido, seuDinheiro, somarDias, type Evento, type Repasse } from "../../components/financas/dados";
import { Aviso, AvisoDeBloqueio, Carregando, ErroAoCarregar, EventoNaoEncontrado, SemEventos, TelaFinal, type AcaoFinal } from "../../components/financas/estados";
import { dataComDia, dataCurta, dataDoEvento, reais } from "../../components/financas/formato";
import { detalhesDaDistribuicao } from "../../components/financas/frases";
import { Linha, Lista, Vazio } from "../../components/financas/linha";
import { PainelDoDetalhe } from "../../components/financas/painel-do-detalhe";
import { CabecalhoDaPagina, FinancasShell, useCenario, useParametro } from "../../components/financas/shell";
import { SelosDoEvento } from "../components/selos-do-evento";

/*
 * Página do evento (a pasta aberta): a mesma conta do total, só deste evento; o calendário de
 * liberações; os repasses; as devoluções; e o que ainda pode mudar, até quando.
 * O rótulo explica; a legenda só entra quando traz data, prazo ou motivo. Termos e regras dos ajustes v3.
 */

const ACOES: AcaoFinal[] = ["repasse", "antecipar"];

const SITUACAO: Record<Repasse["situacao"], { rotulo: string; cor: "gray" | "success" | "error" }> = {
    agendado: { rotulo: "Agendado", cor: "gray" },
    pago: { rotulo: "Pago", cor: "success" },
    falhou: { rotulo: "Não concluído", cor: "error" },
};

const ORIGEM = { disponivel: "Saiu do Disponível", antecipavel: "Saiu do Antecipável" };

const explicacaoDoNegativo = (e: Evento) => {
    const custos = (e.custosExtras ?? []).reduce((s, c) => s + c.valor, 0);
    const saidas = [e.ajustes ? `${reais(e.ajustes)} em devoluções` : "", custos ? `${reais(custos)} em custos` : ""].filter(Boolean).join(" e ");
    return `Foram repassados ${reais(e.recebido)} deste evento. Depois, saíram ${saidas}${e.creditos ? `, e entraram ${reais(e.creditos)} em créditos` : ""}. Com ${reais(retido(e))} ainda retidos, faltam ${reais(-e.disponivel)}.`;
};

/** Modalidade, taxa de transferência e valor creditado (regra 6 dos ajustes v3). A conta vem antes, com o selo de conta de terceiro. */
const detalheDoRepasse = (r: Repasse) => {
    const taxa = TAXA_DA_MODALIDADE[r.modalidade];
    const credito = r.situacao === "pago" ? "Valor creditado" : r.situacao === "agendado" ? "Valor a creditar" : "";
    return `${r.modalidade} · ${taxa ? `Taxa de transferência ${reais(taxa)}` : "Sem taxa de transferência"}${credito ? ` · ${credito} ${reais(r.valor - taxa)}` : ""}`;
};

export function FinancasEvento() {
    const navigate = useNavigate();
    const { eventoId } = useParams();
    const [cenario, setCenario] = useCenario();
    const [acaoAberta, setAcao] = useParametro("acao");
    const [detalheAberto, setDetalhe] = useParametro("detalhe");
    const { state } = useLocation();

    const eventos = eventosDoCenario(cenario);
    const evento = eventos.find((e) => e.id === eventoId);
    const bloqueado = cenario === "bloqueado";
    const acao = ACOES.find((a) => a === acaoAberta);
    const sufixo = cenario === "normal" ? "" : `?cenario=${cenario}`;
    // Na página do evento o Vendido leva direto ao relatório: não há painel "Vendido por evento".
    const detalhe = PARTES_COM_DETALHE.find((p) => p === detalheAberto && p !== "vendido") ?? null;
    // Volta para a lista como ela estava (busca, filtro, página), no cenário atual.
    const voltar = () => {
        const lista = new URLSearchParams((state as { lista?: string } | null)?.lista ?? "");
        if (cenario === "normal") lista.delete("cenario");
        else lista.set("cenario", cenario);
        const consulta = lista.toString();
        navigate(`/payout/financas-eventos${consulta ? `?${consulta}` : ""}`);
    };

    const voltarParaFinancas = (
        <Button size="sm" color="link-gray" iconLeading={ArrowLeft} className="self-start" onClick={voltar}>
            Finanças
        </Button>
    );

    if (!evento || cenario === "carregando" || cenario === "erro") {
        return (
            <FinancasShell jornada="Jornada · Eventos como pastas">
                <CabecalhoDaPagina titulo={evento?.nome ?? "Finanças"} acima={evento && voltarParaFinancas} />
                {cenario === "carregando" ? <Carregando /> : cenario === "erro" ? <ErroAoCarregar aoTentar={() => setCenario("normal")} /> : eventos.length === 0 ? <SemEventos aoIrParaEventos={voltar} /> : <EventoNaoEncontrado aoVoltar={voltar} />}
            </FinancasShell>
        );
    }

    const proximaRetida = evento.liberacoes.find((l) => l.tipo === "retidoSeguranca");
    const liberacoes = evento.liberacoes.slice().sort((a, b) => a.data.localeCompare(b.data));
    const totalDoCalendario = evento.processamento + liberacoes.reduce((s, l) => s + l.valor, 0);
    const restoDoNegativo = -evento.disponivel - (proximaRetida?.valor ?? 0);
    const fimDasContestacoes = somarDias(evento.data, 120);

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
                                você não precisa pagar nada: o valor já foi descontado do Disponível dos seus outros eventos.
                                {proximaRetida && ` Em ${dataCurta(proximaRetida.data)}, ${reais(proximaRetida.valor)} retidos são liberados e reduzem o saldo negativo para ${reais(restoDoNegativo)}.`}
                            </p>
                        </Aviso>
                    )}

                    <Secao titulo="Resumo financeiro do evento">
                        <Cascata
                            totais={{ ...evento, seuDinheiro: seuDinheiro(evento) }}
                            aoAbrir={setDetalhe}
                            aoVerRelatorio={() => toast("Aqui abriria o relatório de vendas deste evento.")}
                            creditoPendente={Boolean(evento.creditoPendente)}
                        />
                        <Distribuicao totais={{ ...evento, retido: retido(evento), seuDinheiro: seuDinheiro(evento) }} detalhes={detalhesDaDistribuicao([evento])} />
                    </Secao>

                    <div className="grid grid-cols-2 items-start gap-6">
                        <Secao
                            titulo="Próximas liberações"
                            lateral={
                                totalDoCalendario > 0 && (
                                    <Button size="sm" color="link-gray" href={`/payout/financas-eventos/calendario?evento=${evento.id}${sufixo.replace("?", "&")}`}>
                                        Ver no calendário
                                    </Button>
                                )
                            }
                        >
                            {totalDoCalendario === 0 ? (
                                <Vazio>Nenhuma liberação prevista neste evento.</Vazio>
                            ) : (
                                <Lista>
                                    {evento.processamento > 0 && (
                                        <Linha
                                            quando={evento.previsaoProcessamento === "hoje" ? "Hoje" : "Sem data"}
                                            titulo="Em processamento"
                                            detalhe={evento.previsaoProcessamento === "hoje" ? "Vendas recentes. Libera hoje." : "Pix parcelado: libera a cada parcela paga."}
                                            valor={reais(evento.processamento)}
                                        />
                                    )}
                                    {liberacoes.map((l) => (
                                        <Linha
                                            key={`${l.data}-${l.tipo}`}
                                            quando={dataComDia(l.data)}
                                            titulo={ROTULO_LIBERACAO[l.tipo]}
                                            detalhe={l.nota}
                                            valor={reais(l.valor)}
                                                                                    />
                                    ))}
                                    <li className="flex items-baseline justify-between gap-4 bg-secondary px-6 py-4">
                                        <span className="text-sm font-semibold text-primary">Total a liberar</span>
                                        <span className="text-sm font-semibold whitespace-nowrap text-primary tabular-nums">{reais(totalDoCalendario)}</span>
                                    </li>
                                </Lista>
                            )}
                        </Secao>

                        <Secao
                            titulo="Repasses"
                            lateral={
                                evento.repasses.length > 0 && (
                                    <Button size="sm" color="link-gray" href={`/payout/financas-eventos/extrato?evento=${evento.id}&tipo=repasse&periodo=90${sufixo.replace("?", "&")}`}>
                                        Ver no extrato
                                    </Button>
                                )
                            }
                        >
                            {evento.repasses.length === 0 ? (
                                <Vazio>Você ainda não solicitou repasse deste evento.</Vazio>
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
                                            detalhe={
                                                <>
                                                    <span className="flex flex-wrap items-center gap-2">
                                                        {r.conta.replace("Conta de terceiro · ", "")}
                                                        {r.conta.startsWith("Conta de terceiro") && (
                                                            <Badge size="sm" type="pill-color" color="warning">
                                                                Conta de terceiro
                                                            </Badge>
                                                        )}
                                                    </span>
                                                    {detalheDoRepasse(r)}
                                                    <br />
                                                    {(() => {
                                                        const reg = registroDoRepasse(evento, r);
                                                        return `${reg.codigo} · Solicitado por ${reg.solicitante} em ${dataCurta(reg.data)} às ${reg.hora}`;
                                                    })()}
                                                    {r.nota && (
                                                        <>
                                                            <br />
                                                            {r.nota}
                                                        </>
                                                    )}
                                                </>
                                            }
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
                        <Secao titulo="Devoluções">
                            {evento.ajustesLista.length === 0 ? (
                                <Vazio>Nenhuma devolução neste evento.</Vazio>
                            ) : (
                                <Lista>
                                    {evento.ajustesLista.map((a) => (
                                        <Linha
                                            key={a.titulo}
                                            quando={dataCurta(a.data)}
                                            titulo={a.titulo}
                                            detalhe={
                                                <>
                                                    {ORIGEM[a.origem ?? "disponivel"]}
                                                    <br />
                                                    {a.motivo}
                                                </>
                                            }
                                            valor={reais(-a.valor)}
                                                                                    />
                                    ))}
                                </Lista>
                            )}
                        </Secao>

                        <Secao titulo="O que ainda pode mudar">
                            {evento.podeMudar.length === 0 && !proximaRetida ? (
                                <Vazio>Nada mais pode mudar neste evento. O prazo de contestação no cartão terminou em {dataCurta(fimDasContestacoes)}.</Vazio>
                            ) : (
                                <Lista>
                                    {evento.podeMudar.map((p) => (
                                        <Linha key={p.titulo} quando={p.ate ? `Até ${dataComDia(p.ate)}` : "Sem prazo"} titulo={p.titulo} detalhe={p.texto} />
                                    ))}
                                    {proximaRetida && (
                                        <Linha
                                            quando={dataComDia(proximaRetida.data)}
                                            titulo="Liberação do Retido por segurança"
                                            detalhe={`${reais(proximaRetida.valor)} ficam reservados para esses casos. O que sobrar libera nesta data.`}
                                        />
                                    )}
                                </Lista>
                            )}
                        </Secao>
                    </div>
                </>
            )}
            {!acao && <PainelDoDetalhe parte={detalhe} eventos={[evento]} aoFechar={() => setDetalhe(null)} />}
        </FinancasShell>
    );
}
