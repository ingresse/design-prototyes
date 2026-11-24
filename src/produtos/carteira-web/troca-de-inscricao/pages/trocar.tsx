import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { BankNote01, Calendar, ChevronDown, InfoCircle, SearchLg } from "@untitledui/icons";
import { Radio as AriaRadio, RadioGroup as AriaRadioGroup } from "react-aria-components";
import { toast } from "sonner";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { InputBase } from "@/components/base/input/input";
import { RadioButtonBase } from "@/components/base/radio-buttons/radio-buttons";
import { cx } from "@/utils/cx";
import { Aviso } from "../components/aviso";
import { BarraVoltar, ControlesCarteira, Recolhivel, TopoCompra, brlc, useTopoAoEntrar } from "../components/carteira-ui";
import { CartaoResumoTroca } from "../components/resumo-troca";
import { EVENTO, W, calc, escolherNaCarteira, itemPorId, mod, nomeItem, nomes, norm, opcoes, periodo, podeTrocar, prepararPerguntas, tocar, ultimoLote, useTroca, type Opcao } from "../data/troca-store";

/**
 * Escolha da nova inscrição no modelo da seleção de itens do fluxo de compra: data e horário,
 * grupos que abrem e fecham e, dentro deles, as inscrições com lote ativo, preço e o valor a cobrar.
 */
export function Trocar() {
    useTroca();
    const { itemId } = useParams();
    useTopoAoEntrar(itemId);
    const navigate = useNavigate();
    const x = itemPorId(itemId);
    const [fechados, setFechados] = useState<Set<string>>(new Set());
    const [busca, setBusca] = useState("");

    if (!x || !podeTrocar(x.p, x.it).ok) return <Navigate to="/carteira-web/inscricoes" replace />;
    if (W.item !== itemId) {
        W.item = itemId;
        W.dest = null;
    }
    const { it } = x;
    const ops = opcoes(it, "carteira");
    // Evento com muitas modalidades: busca pelo nome, como no Backstage.
    const nq = norm(busca);
    const vis = ops.filter((o) => !nq || norm(o.m.nome).includes(nq));
    const grupos = [...new Set(vis.map((o) => o.m.grupo))];
    const l = W.dest ? ultimoLote(mod(W.dest)) : null;
    const f = l ? calc(it.pago, it.taxa, l.valor) : null;
    const pr = periodo();
    const podeContinuar = !!f;
    // Nenhuma opção pode ser escolhida: a tela diz por quê e leva de volta, em vez de deixar o Continuar travado.
    const semOpcao = ops.length > 0 && ops.every((o) => o.off);
    const todasMenores = semOpcao && ops.every((o) => o.motivo || o.e?.some((x) => x.menor));
    const continuar = () => {
        prepararPerguntas();
        navigate(`/carteira-web/inscricoes/${it.id}/trocar/perguntas`);
    };
    // Data da sessão no formato da tela de troca do AWA: dia da semana em cima, data por extenso embaixo.
    const dia = new Date(EVENTO.ultima);
    const semana = dia.toLocaleDateString("pt-BR", { weekday: "long" });
    const dataLonga = `${dia.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })} às ${dia.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    const dataCurta = dia.toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" }).replace(".", "").replace(/ de /g, " ");
    const destino = W.dest ? mod(W.dest) : null;
    const voltar = () => navigate(`/carteira-web/inscricoes?item=${it.id}`);

    return (
        <div className="min-h-dvh bg-secondary text-primary">
            <TopoCompra />
            <BarraVoltar grande titulo="Trocar inscrição" onVoltar={voltar} />
            <div className="px-4 pt-6 pb-36 md:px-12 min-[1000px]:pb-16">
                <div className="mx-auto grid max-w-7xl gap-6 min-[1000px]:grid-cols-[1fr_380px]">
                    <div className="flex flex-col gap-4">
                        {/* Mesmo cabeçalho da troca de ingresso do AWA: só a data da sessão, sem título nem etapas. */}
                        <div>
                            <p className="text-sm text-primary first-letter:uppercase">{semana}</p>
                            <p className="text-lg font-bold text-primary">{dataLonga}</p>
                        </div>

                        {semOpcao && (
                            <Aviso
                                cor="warning"
                                titulo="Nenhuma inscrição disponível para troca"
                                acoes={
                                    <Button size="md" color="secondary" onClick={voltar}>
                                        Voltar para a inscrição
                                    </Button>
                                }
                            >
                                {todasMenores
                                    ? `Todas as inscrições com vaga custam menos que o valor pago na sua inscrição (${brlc(it.pago)}). Por enquanto, só é possível trocar por uma de valor igual ou maior.`
                                    : "Nenhuma inscrição deste evento está disponível para você agora. O motivo de cada uma aparece na lista."}
                            </Aviso>
                        )}

                        {ops.length > 8 && (
                            <InputBase size="md" icon={SearchLg} aria-label="Buscar modalidade" placeholder="Buscar modalidade" value={busca} onChange={(e) => setBusca(e.target.value)} />
                        )}
                        {nq && !vis.length && (
                            <div className="flex flex-col items-center gap-3 rounded-2xl border border-secondary bg-primary py-6 text-center">
                                <p className="text-md font-semibold text-primary">Nenhuma modalidade com esse nome</p>
                                <Button size="md" color="secondary" onClick={() => setBusca("")}>
                                    Limpar busca
                                </Button>
                            </div>
                        )}

                        <AriaRadioGroup aria-label="Nova inscrição" value={W.dest ?? null} onChange={escolherNaCarteira} className="flex flex-col gap-4">
                            {grupos.map((g) => {
                                const aberto = !fechados.has(g);
                                return (
                                    <section key={g} className="overflow-hidden rounded-2xl border border-secondary bg-primary">
                                        <button
                                            type="button"
                                            aria-expanded={aberto}
                                            onClick={() => {
                                                const n = new Set(fechados);
                                                if (aberto) n.add(g);
                                                else n.delete(g);
                                                setFechados(n);
                                            }}
                                            className="flex min-h-16 w-full items-center gap-3 px-4 py-4 text-left hover:bg-primary_hover"
                                        >
                                            <span className="flex-1 text-lg font-bold">{g}</span>
                                            <ChevronDown className={cx("size-5 text-fg-secondary transition-transform duration-200", aberto && "rotate-180")} aria-hidden="true" />
                                        </button>
                                        <Recolhivel aberto={aberto} className="divide-y divide-secondary border-t border-secondary">
                                            {vis
                                                .filter((o) => o.m.grupo === g)
                                                // Dentro do grupo, o que pode ser escolhido vem antes do que está bloqueado.
                                                .sort((a, b) => Number(!!a.off) - Number(!!b.off))
                                                .map((o) => (
                                                    <LinhaOpcao key={o.m.id} o={o} />
                                                ))}
                                        </Recolhivel>
                                    </section>
                                );
                            })}
                        </AriaRadioGroup>
                    </div>

                    <aside className="flex flex-col gap-4 min-[1000px]:sticky min-[1000px]:top-6 min-[1000px]:self-start">
                        <section className="overflow-hidden rounded-2xl border border-secondary bg-primary">
                            <p className="border-b border-secondary px-4 py-4 text-sm font-semibold">Detalhes da sua inscrição atual</p>
                            <div className="flex items-center gap-3 border-b border-secondary px-4 py-4">
                                <div className="size-16 shrink-0 rounded-lg" style={{ background: "linear-gradient(135deg,#0ea5e9,#78350f 60%,#b45309)" }} role="img" aria-label={`Imagem do evento ${EVENTO.nome}`} />
                                <div className="flex min-w-0 flex-col">
                                    <span className="truncate text-md font-semibold">{EVENTO.nome}</span>
                                    <span className="text-sm text-secondary">{nomeItem(it)}</span>
                                    <span className="text-sm text-tertiary">{nomes(it)}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 px-4 py-4">
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs text-tertiary">Data do evento</span>
                                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                                        <Calendar className="size-4" aria-hidden="true" />
                                        {dataCurta}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs text-tertiary">Valor da inscrição</span>
                                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                                        <BankNote01 className="size-4" aria-hidden="true" />
                                        {brlc(it.pago)}
                                    </span>
                                </div>
                            </div>
                        </section>

                        {f && l && destino ? (
                            <CartaoResumoTroca
                                pago={it.pago}
                                nomeDestino={destino.nome}
                                lote={l}
                                f={f}
                                onRemover={() => {
                                    W.dest = null;
                                    tocar();
                                }}
                                acao={
                                    <Button size="lg" color="primary" className="max-[999px]:hidden" isDisabled={!podeContinuar} onClick={continuar}>
                                        Continuar
                                    </Button>
                                }
                                nota={f.total ? "A troca só acontece depois do pagamento." : "Sem valor a pagar: você confirma a troca depois das perguntas."}
                                rodape={pr.st === "aberto" && <p className="border-t border-secondary px-4 py-3 text-xs text-tertiary">Trocas disponíveis até {pr.fim}.</p>}
                            />
                        ) : (
                            <section className="overflow-hidden rounded-2xl border border-secondary bg-primary">
                                <p className="border-b border-secondary px-4 py-4 text-sm font-semibold">Resumo da troca</p>
                                <p className="px-4 py-4 text-sm text-tertiary">Escolha a nova inscrição ao lado para ver os valores.</p>
                                {pr.st === "aberto" && <p className="border-t border-secondary px-4 py-3 text-xs text-tertiary">Trocas disponíveis até {pr.fim}.</p>}
                            </section>
                        )}
                    </aside>
                </div>
            </div>

            {/* Celular: total e Continuar ao alcance do polegar, como no fluxo de compra. Sem opção válida, a saída fica no aviso. */}
            {!semOpcao && (
                <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-secondary bg-primary px-4 py-3 min-[1000px]:hidden">
                    <div className="min-w-0 flex-1">
                        {f ? (
                            <>
                                <b className="block text-lg font-semibold">{brlc(f.total)}</b>
                                <button type="button" className="text-sm text-tertiary underline" onClick={() => document.getElementById("resumo-troca")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                                    Ver detalhes da cobrança
                                </button>
                            </>
                        ) : (
                            <span className="text-sm text-tertiary">Escolha a nova inscrição</span>
                        )}
                    </div>
                    <Button size="lg" color="primary" isDisabled={!podeContinuar} onClick={continuar}>
                        Continuar
                    </Button>
                </div>
            )}
            <ControlesCarteira />
        </div>
    );
}

/** Uma inscrição dentro do grupo, como na troca de ingresso do AWA: nome, lote e preço, com a seleção à direita. */
function LinhaOpcao({ o }: { o: Opcao }) {
    const esgotada = !!o.motivo;
    // Um motivo por opção: valor menor primeiro, depois segmentação e os demais. O toast traz o texto completo.
    const principal = o.e?.find((x) => x.menor) ?? o.e?.find((x) => x.seg) ?? o.e?.[0];
    const motivo = esgotada || !principal ? "" : principal.menor ? principal.curto : principal.msg;
    const motivoCompleto = esgotada || !principal ? "" : principal.msg;

    return (
        <div onClick={() => o.off && toast.error(esgotada ? "Inscrição esgotada" : "Troca não permitida", { description: esgotada ? `${o.m.nome} não tem mais vagas.` : motivoCompleto })}>
            <AriaRadio
                value={o.m.id}
                isDisabled={o.off}
                className={({ isSelected, isDisabled, isFocusVisible }) =>
                    cx(
                        "relative flex cursor-pointer items-center gap-4 px-4 py-4 transition duration-100 ease-linear hover:bg-primary_hover",
                        isSelected && "bg-secondary hover:bg-secondary",
                        isFocusVisible && "outline-2 -outline-offset-2 outline-focus-ring",
                        isDisabled && "cursor-not-allowed hover:bg-transparent",
                    )
                }
            >
                {({ isSelected, isDisabled, isFocusVisible }) => (
                    <>
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className={cx("flex flex-wrap items-center gap-1.5 text-md font-bold", isDisabled && "text-tertiary")}>
                                {o.m.nome}
                                {esgotada && (
                                    <Badge size="sm" type="color" color="gray">
                                        Esgotado
                                    </Badge>
                                )}
                            </span>
                            <span className="text-xs text-tertiary">{esgotada ? "Todos os lotes esgotados" : o.l.nome}</span>
                            <span className={cx("text-sm font-bold", isDisabled ? "text-tertiary" : "text-primary")}>{brlc(o.l.valor)}</span>
                            {motivo && (
                                <span className="flex gap-1.5 text-sm text-tertiary">
                                    <InfoCircle className="mt-0.5 size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />
                                    {motivo}
                                </span>
                            )}
                        </span>
                        <RadioButtonBase size="md" isSelected={isSelected} isDisabled={isDisabled} isFocusVisible={isFocusVisible} />
                    </>
                )}
            </AriaRadio>
        </div>
    );
}
