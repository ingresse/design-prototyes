import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { Radio as AriaRadio, RadioGroup as AriaRadioGroup } from "react-aria-components";
import { toast } from "sonner";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { HintText } from "@/components/base/input/hint-text";
import { Input } from "@/components/base/input/input";
import { RadioButtonBase } from "@/components/base/radio-buttons/radio-buttons";
import { cx } from "@/utils/cx";
import { BarraVoltar, ControlesCarteira, TopoCompra, brlc, useTopoAoEntrar } from "../components/carteira-ui";
import { CartaoResumoTroca } from "../components/resumo-troca";
import { PERG, W, abrirPagamentoCarteira, camisetaOk, criarTrocaNaCarteira, faltamNaCarteira, itemPorId, mod, pessoa, tocar, ultimoLote, calc, useTroca, type Item } from "../data/troca-store";

/**
 * Perguntas da nova inscrição no modelo do fluxo de compra ("Para quem é esta inscrição?"):
 * um cartão por atleta, formulário com as opções em lista e "Salvar respostas" fechando o cartão.
 * Respostas atuais já preenchidas, perguntas novas marcadas e tamanho esgotado em branco.
 */
export function Perguntas() {
    useTroca();
    const { itemId } = useParams();
    useTopoAoEntrar(itemId);
    const navigate = useNavigate();
    const x = itemPorId(itemId);
    const [salvos, setSalvos] = useState<boolean[]>([]);

    if (!x || W.item !== itemId || !W.dest || !W.resp.length) return <Navigate to={`/carteira-web/inscricoes/${itemId}/trocar`} replace />;
    const { it } = x;
    const m = mod(W.dest)!;
    const l = ultimoLote(m)!;
    const f = calc(it.pago, it.taxa, l.valor);
    const faltamDe = (i: number) => m.perguntas.filter((k) => PERG[k].req && !String(W.resp[i][k] ?? "").trim()).length;
    const faltam = faltamNaCarteira();

    // Como no AWA: cada formulário é salvo no próprio botão, e a ação do resumo só libera com tudo salvo.
    const todosSalvos = it.ps.every((_, i) => salvos[i]);
    const salvar = (i: number) => {
        if (faltamDe(i)) {
            W.tentou = true;
            tocar();
            toast.error("Falta responder", { description: "Preencha as perguntas obrigatórias em vermelho." });
            setTimeout(() => document.querySelector(`#form-${i} [data-invalid]`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 60);
            return;
        }
        const n = [...salvos];
        n[i] = true;
        setSalvos(n);
        toast.success("Respostas salvas");
    };
    const editou = (i: number) => {
        if (!salvos[i]) return;
        const n = [...salvos];
        n[i] = false;
        setSalvos(n);
    };

    const continuar = () => {
        if (faltam || !todosSalvos) {
            W.tentou = true;
            tocar();
            toast.error("Salve as respostas para continuar", { description: faltam ? "Preencha as perguntas obrigatórias em vermelho." : "Toque em Salvar respostas no formulário." });
            return;
        }
        const s = criarTrocaNaCarteira();
        if (s.status === "CONCLUIDA") return navigate(`/carteira-web/troca/${s.id}/confirmada`);
        const r = abrirPagamentoCarteira(s.id);
        if (!r.ok) {
            toast.error(r.tipo === "pergunta" ? `O tamanho ${r.tam} da camiseta esgotou antes do pagamento` : "A modalidade escolhida esgotou antes do pagamento", {
                description: "A troca foi cancelada e nada foi alterado.",
            });
            return navigate(`/carteira-web/inscricoes?item=${it.id}`);
        }
        navigate(`/carteira-web/troca/${s.id}/pagamento`);
    };
    // Total zero: sem checkout, a troca é concluída ao confirmar (RN-25).
    const acao = f.total ? "Continuar" : "Confirmar troca";
    const estado = !todosSalvos ? "Salve as respostas para continuar" : f.total ? "A troca só acontece depois do pagamento." : "Sem valor a pagar: a troca é concluída assim que você confirmar.";

    return (
        <div className="min-h-dvh bg-secondary text-primary">
            <TopoCompra />
            <BarraVoltar grande titulo="Trocar inscrição" onVoltar={() => navigate(`/carteira-web/inscricoes/${it.id}/trocar`)} />
            <div className="px-4 pt-6 pb-36 md:px-12 min-[1000px]:pb-16">
                <div className="mx-auto grid max-w-7xl items-start gap-6 min-[1000px]:grid-cols-[1fr_380px]">
                    {/* Mesmo painel do formulário do fluxo de compra do AWA: um bloco branco por atleta. */}
                    <div className="flex flex-col gap-4">
                        {it.ps.map((pid, i) => (
                            <section key={pid} id={`form-${i}`} aria-labelledby={`atleta-${i}`} className="flex flex-col gap-4 rounded-2xl border border-secondary bg-primary p-4 md:p-5">
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                    <h2 id={`atleta-${i}`} className="text-md font-bold">
                                        Formulário do atleta
                                    </h2>
                                    <span className="text-sm text-tertiary">
                                        {pessoa(pid).nome}, {m.nome}
                                    </span>
                                </div>
                                {m.perguntas.map((k) => (
                                    <Pergunta key={k} it={it} i={i} k={k} onEditar={() => editou(i)} />
                                ))}
                                <Button size="lg" color="primary" className="w-full" onClick={() => salvar(i)} isDisabled={salvos[i]}>
                                    {salvos[i] ? "Respostas salvas" : "Salvar respostas"}
                                </Button>
                            </section>
                        ))}
                    </div>

                    <aside className="flex flex-col gap-4 min-[1000px]:sticky min-[1000px]:top-6">
                        <CartaoResumoTroca
                            pago={it.pago}
                            nomeDestino={m.nome}
                            lote={l}
                            f={f}
                            acao={
                                <Button size="lg" color="primary" className="max-[999px]:hidden" isDisabled={!todosSalvos} onClick={continuar}>
                                    {acao}
                                </Button>
                            }
                            nota={estado}
                        />
                    </aside>
                </div>
            </div>

            <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-secondary bg-primary px-4 py-3 min-[1000px]:hidden">
                <div className="min-w-0 flex-1">
                    <b className="block text-lg font-semibold">{brlc(f.total)}</b>
                    <span className="text-sm text-tertiary">{todosSalvos ? "Respostas salvas" : "Salve as respostas para continuar"}</span>
                </div>
                <Button size="lg" color="primary" isDisabled={!todosSalvos} onClick={continuar}>
                    {acao}
                </Button>
            </div>
            <ControlesCarteira />
        </div>
    );
}

/** Uma pergunta no modelo do fluxo de compra: opções em lista de rádio, texto em campo. */
function Pergunta({ it, i, k, onEditar }: { it: Item; i: number; k: string; onEditar: () => void }) {
    const q = PERG[k];
    const orig = it.resp[i]?.[k];
    const v = W.resp[i][k] ?? "";
    const nova = !(k in (it.resp[i] ?? {}));
    const esgotou = q.estoque && orig && !v && !camisetaOk(orig);
    const erro = q.req && !v.trim() && (nova || !!esgotou || W.tentou);
    const msg = esgotou ? `O tamanho ${orig} esgotou. Escolha outro.` : nova ? "Pergunta nova obrigatória. Responda para continuar." : "Resposta obrigatória.";
    const set = (val: string) => {
        W.resp[i][k] = val;
        onEditar();
        tocar();
    };
    const rotulo = (
        <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-secondary">
            {q.label}
            {q.req ? (
                <span className="text-brand-tertiary" aria-hidden="true">
                    *
                </span>
            ) : (
                <span className="font-normal text-tertiary">(opcional)</span>
            )}
            {nova && (
                <Badge size="sm" type="color" color="brand">
                    Nova pergunta
                </Badge>
            )}
        </span>
    );

    if (q.tipo === "text")
        return (
            <div className="flex flex-col gap-1.5">
                {rotulo}
                <Input aria-label={q.label} size="md" placeholder={q.ph} value={v} isInvalid={!!erro} hint={erro ? msg : undefined} onChange={set} />
            </div>
        );

    return (
        <div className="flex flex-col gap-2">
            <AriaRadioGroup aria-label={q.label} value={v || null} onChange={set} isInvalid={!!erro} className="flex flex-col gap-2">
                {rotulo}
                {(q.opcoes ?? []).map((o) => {
                    const semEstoque = !!q.estoque && !camisetaOk(o);
                    return (
                        <AriaRadio key={o} value={o} isDisabled={semEstoque} className={({ isDisabled }) => cx("relative flex w-max cursor-pointer items-center gap-3 py-1", isDisabled && "cursor-not-allowed")}>
                            {({ isSelected, isDisabled, isFocusVisible }) => (
                                <>
                                    <RadioButtonBase size="sm" isSelected={isSelected} isDisabled={isDisabled} isFocusVisible={isFocusVisible} />
                                    <span className={cx("text-sm", isDisabled ? "text-tertiary" : "text-primary")}>{o}</span>
                                    {semEstoque && (
                                        <Badge size="sm" type="color" color="gray">
                                            Esgotado
                                        </Badge>
                                    )}
                                </>
                            )}
                        </AriaRadio>
                    );
                })}
            </AriaRadioGroup>
            {erro && <HintText isInvalid>{msg}</HintText>}
        </div>
    );
}
