import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Radio as AriaRadio, RadioGroup as AriaRadioGroup } from "react-aria-components";
import { toast } from "sonner";
import { Bank, Calendar, CheckCircle, ChevronDown, Plus, SearchLg, Trash01, XClose } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Progress } from "@/components/application/progress-steps/progress-steps";
import type { ProgressIconType } from "@/components/application/progress-steps/progress-types";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Input, InputBase } from "@/components/base/input/input";
import { RadioButtonBase } from "@/components/base/radio-buttons/radio-buttons";
import { RadioButton as RadioGroupDeCartoes } from "@/components/base/radio-groups/radio-groups";
import { NativeSelect } from "@/components/base/select/select-native";
import { TextArea } from "@/components/base/textarea/textarea";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { novoId, type ContaFavorecida, type Repasse } from "@/plataforma";
import { cx } from "@/utils/cx";
import { CabecalhoDaPagina } from "../../components/cabecalho-da-pagina";
import { ModalDeConfirmacao } from "../../components/modal-de-confirmacao";
import { CabecalhoDaTabela, CartaoDaTabela, Celula, LinhaDaTabela, SemResultados } from "../../components/tabela";
import { CampoPreco } from "../../itens/components/comuns";
import { dataPorExtenso, descricaoDaConta, opcoesDeRepasse, reais, taxaDeAntecipacao, tipoDaConta, TAXA_OUTRAS_CONTAS, type SaldoDoEvento } from "../data/financas";

/*
 * Repasse de saldo (FIN-30 a FIN-59), o assistente de produção: 1. Conta favorecida, 2. Valor do
 * repasse, 3. Revisão; depois o código de segurança e a confirmação. Ocupa o lugar do painel.
 *
 * O passo fica no endereço (`?passo=1..3`, FIN-49): avançar empilha uma entrada no histórico, então
 * o voltar do navegador recua um passo sem perder nada. Quem cuida do endereço é a página; aqui só se
 * pede para ir a um passo. Sair com algo escolhido pergunta antes (FIN-50).
 */

const PASSOS = ["Conta favorecida", "Valor do repasse", "Revisão"];

export function AssistenteDeRepasse({
    eventos,
    contas,
    repasses,
    gravar,
    passo,
    irPara,
    substituirPasso,
    voltarPasso,
    onFechar,
    onRecomecar,
}: {
    eventos: SaldoDoEvento[];
    contas: ContaFavorecida[];
    repasses: Repasse[];
    gravar: (p: { contasFavorecidas?: ContaFavorecida[]; repasses?: Repasse[] }) => Promise<void>;
    /** Passo atual, de 0 a 2, lido do endereço. */
    passo: number;
    /** Avança para um passo (nova entrada no histórico). */
    irPara: (passo: number) => void;
    /** Troca o passo sem nova entrada no histórico (passo do endereço sem o que ele precisa). */
    substituirPasso: (passo: number) => void;
    /** Um passo para trás. */
    voltarPasso: () => void;
    /** Sai do assistente e volta para Finanças. */
    onFechar: () => void;
    /** Depois do sucesso, "Pedir novo repasse" volta ao passo 1. */
    onRecomecar: () => void;
}) {
    // Com uma conta só, ela já vem escolhida (FIN-51).
    const contaInicial = contas.length === 1 ? contas[0].id : undefined;
    const [contaId, setContaId] = useState<string | undefined>(contaInicial);
    const [valores, setValores] = useState<Record<string, number | undefined>>({});
    const [modalidade, setModalidade] = useState<"express" | "basic">();
    const [custo, setCusto] = useState<"repasse" | "saldo">("repasse");
    const [descricao, setDescricao] = useState("");
    const [controle, setControle] = useState("");
    const [codigo, setCodigo] = useState<{ repasse: Repasse } | null>(null);
    const [sucesso, setSucesso] = useState(false);
    const [confirmandoSaida, setConfirmandoSaida] = useState(false);
    const semMovimento = useReducedMotion();

    const conta = contas.find((c) => c.id === contaId);
    const comSaldo = eventos.filter((e) => e.total >= 0.01);
    const soma = Object.values(valores).reduce<number>((n, v) => n + (v ?? 0), 0);
    const limpos = Object.fromEntries(Object.entries(valores).filter(([, v]) => (v ?? 0) >= 0.001)) as Record<string, number>;
    const antecipacao = taxaDeAntecipacao(limpos, eventos);
    const opcoes = opcoesDeRepasse(soma, !!conta && !conta.padraoDoContrato);
    const escolhida = opcoes.find((o) => o.modalidade === modalidade);
    const taxas = antecipacao + (escolhida?.taxa ?? 0);
    const saldoCobre = Object.entries(limpos).every(([id, v]) => v * (1 + taxas / Math.max(soma, 1)) <= (eventos.find((e) => e.eventoId === id)?.total ?? 0));
    const bruto = custo === "saldo" ? soma + taxas : soma;
    const liquido = custo === "saldo" ? soma : Math.max(0, soma - taxas);
    const primeiraDisponivel = (["basic", "express"] as const).find((m) => opcoes.find((o) => o.modalidade === m)?.disponivel);

    // Há o que perder se sair agora: passou do primeiro passo, digitou valor ou trocou a conta que veio escolhida.
    const temTrabalho = !sucesso && (passo > 0 || soma > 0 || (!!contaId && contaId !== contaInicial));

    // Endereço com um passo que ainda não tem o que precisa (recarregou, ou avançou pelo navegador): volta para o que falta.
    useEffect(() => {
        if (passo >= 1 && !conta) substituirPasso(0);
        else if (passo === 2 && soma <= 0) substituirPasso(1);
    }, [passo, conta, soma]);

    // Na revisão, a modalidade escolhida precisa estar disponível; senão vale a primeira que está (FIN-47).
    useEffect(() => {
        if (passo === 2 && !opcoes.find((o) => o.modalidade === modalidade)?.disponivel) setModalidade(primeiraDisponivel);
    }, [passo, soma, contaId]);

    // Recarregar ou fechar a aba com o repasse pela metade: o aviso do navegador é a única chance de segurar.
    useEffect(() => {
        if (!temTrabalho) return;
        const aoDescarregar = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", aoDescarregar);
        return () => window.removeEventListener("beforeunload", aoDescarregar);
    }, [temTrabalho]);

    const sair = () => (temTrabalho ? setConfirmandoSaida(true) : onFechar());

    const avancarParaRevisao = () => {
        // Pré-escolhe a primeira modalidade disponível, na ordem quinta-feira, próximo dia útil (FIN-47).
        setModalidade(primeiraDisponivel);
        irPara(2);
    };

    const transferir = async () => {
        if (!conta || !modalidade || !escolhida) return;
        const fator = bruto / Math.max(soma, 0.01);
        const repasse: Repasse = {
            id: novoId("rep"),
            contaId: conta.id,
            solicitante: "voce@produtora.com",
            liquidacoes: Object.entries(limpos).map(([eventoId, v]) => ({ eventoId, valor: Math.round(v * fator * 100) / 100 })),
            valorSolicitado: bruto,
            taxaAntecipacao: antecipacao,
            taxaTransferencia: escolhida.taxa,
            valorTransferido: liquido,
            modalidade,
            status: "analisando",
            solicitadoEm: new Date().toISOString(),
            dataPrevista: escolhida.data,
            descricao: descricao.trim() || undefined,
            idDeControle: controle.trim() || undefined,
        };
        // Só vale depois do código de segurança (FIN-44).
        setCodigo({ repasse });
    };

    const progresso: ProgressIconType[] = PASSOS.map((titulo, i) => ({ title: titulo, description: "", status: i < passo ? "complete" : i === passo ? "current" : "incomplete" }));

    return (
        <div className="flex min-w-0 flex-1 flex-col gap-6">
            <div className="flex flex-col gap-4">
                {/* O assistente substitui a página de Finanças: o título dele é o da página, e fechar volta para ela. */}
                <CabecalhoDaPagina voltar={{ rotulo: "Finanças", ariaLabel: "Sair do repasse e voltar para Finanças", onClick: sair }} titulo="Repasse de saldo" />
                {/* Passos com o indicador do DS (FIN-52); o passo atual é anunciado ao mudar. */}
                <Progress.TextWithLine items={progresso} size="sm" orientation="horizontal" className="max-w-2xl" />
                <p className="sr-only" aria-live="polite">{`Passo ${passo + 1} de ${PASSOS.length}: ${PASSOS[passo]}`}</p>
            </div>

            {/* Cada passo entra com um leve deslize (180 ms); com movimento reduzido, aparece direto. */}
            <motion.div key={passo} initial={semMovimento ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: "easeOut" }} className="flex min-w-0 flex-col">
                {passo === 0 && <PassoConta contas={contas} contaId={contaId} onEscolher={setContaId} gravar={gravar} onCancelar={sair} onAvancar={() => irPara(1)} />}

                {passo === 1 && (
                    <PassoValor
                        eventos={comSaldo}
                        valores={valores}
                        soma={soma}
                        onValor={(id, v) => setValores((x) => ({ ...x, [id]: v }))}
                        onTodos={(tipo) => setValores(Object.fromEntries(comSaldo.map((e) => [e.eventoId, tipo === "disponivel" ? e.disponivel || undefined : e.total])))}
                        onVoltar={voltarPasso}
                        onAvancar={avancarParaRevisao}
                    />
                )}

                {passo === 2 && conta && (
                    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
                        <div className="flex min-w-0 flex-col gap-6">
                            <div className="flex flex-col gap-3">
                                <h3 id="titulo-quando" className="text-md font-semibold text-primary">
                                    Quando o repasse deve chegar?
                                </h3>
                                {/* Cartões de rádio do DS (FIN-53). Indisponível fica a 50% e diz por quê. */}
                                <RadioGroupDeCartoes
                                    aria-labelledby="titulo-quando"
                                    value={modalidade ?? null}
                                    onChange={(v) => setModalidade(v as "express" | "basic")}
                                    className="[&_[data-disabled]]:opacity-50"
                                    items={opcoes.map((o) => ({
                                        value: o.modalidade,
                                        title: o.modalidade === "express" ? "No próximo dia útil" : "Na quinta-feira",
                                        secondaryTitle: dataPorExtenso(o.data),
                                        description: !o.disponivel ? (o.motivo ?? "") : o.taxa > 0 ? `Taxa de ${reais(o.taxa)}.` : "Sem taxa.",
                                        disabled: !o.disponivel,
                                        icon: Calendar,
                                    }))}
                                />
                            </div>
                            <div className="flex flex-col gap-3">
                                <h3 id="titulo-taxas" className="text-md font-semibold text-primary">
                                    De onde saem as taxas?
                                </h3>
                                <RadioGroupDeCartoes
                                    aria-labelledby="titulo-taxas"
                                    value={custo}
                                    onChange={(v) => setCusto(v as "repasse" | "saldo")}
                                    className="[&_[data-disabled]]:opacity-50"
                                    items={[
                                        { value: "repasse", title: "Descontar do repasse", secondaryTitle: "", description: "Chega na conta o valor pedido menos as taxas.", icon: Bank },
                                        {
                                            value: "saldo",
                                            title: "Descontar do saldo do evento",
                                            secondaryTitle: "",
                                            description: saldoCobre ? "Chega na conta o valor pedido; as taxas saem do saldo do evento." : "Saldo insuficiente para cobrir os custos nesta modalidade.",
                                            disabled: !saldoCobre,
                                            icon: Bank,
                                        },
                                    ]}
                                />
                            </div>
                            <TextArea label="Descrição" rows={2} placeholder="Digite a descrição..." maxLength={140} value={descricao} onChange={setDescricao} hint="Máximo 140 caracteres" />
                            <Input label="ID de controle" placeholder="Digite o ID de controle..." maxLength={20} value={controle} onChange={setControle} hint="Máximo 20 caracteres" />
                        </div>
                        <aside className="flex h-max min-w-0 flex-col gap-5 rounded-2xl bg-primary p-5 ring-1 ring-secondary lg:sticky lg:top-6">
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-medium text-tertiary">Resumo financeiro</span>
                                <span className="text-display-sm font-semibold text-brand-secondary tabular-nums">{reais(liquido)}</span>
                                <span className="text-sm text-tertiary">{`Chega na conta de ${conta.titular}`}</span>
                            </div>
                            <dl className="flex flex-col gap-2 border-t border-secondary pt-4 text-sm">
                                <span className="font-semibold text-primary">Composição do repasse</span>
                                <Linha rotulo="Valor bruto do repasse" valor={reais(bruto)} />
                                <Linha rotulo="Taxa de antecipação" valor={antecipacao > 0 ? `- ${reais(antecipacao)}` : reais(0)} />
                                <Linha rotulo="Taxa de agendamento" valor={escolhida ? (escolhida.taxa > 0 ? `- ${reais(escolhida.taxa)}` : reais(0)) : "Escolha a data"} />
                                <Linha rotulo="Valor creditado ao favorecido" valor={reais(liquido)} />
                            </dl>
                            <dl className="flex flex-col gap-2 border-t border-secondary pt-4 text-sm">
                                <span className="font-semibold text-primary">Conta favorecida</span>
                                <Linha rotulo="Nome" valor={conta.titular} />
                                {conta.tipo === "pix" ? (
                                    <Linha rotulo="Chave Pix" valor={conta.chavePix ?? ""} />
                                ) : (
                                    <>
                                        <Linha rotulo="Agência" valor={conta.agencia ?? ""} />
                                        <Linha rotulo="Conta" valor={conta.conta ?? ""} />
                                        <Linha rotulo="Instituição" valor={conta.banco ?? ""} />
                                    </>
                                )}
                                <Linha rotulo="Tipo" valor={tipoDaConta(conta)} />
                            </dl>
                            <Button color="primary" size="lg" className="w-full" isDisabled={!modalidade} onClick={() => void transferir()}>
                                Transferir
                            </Button>
                            <Button color="secondary" size="md" className="w-full" onClick={voltarPasso}>
                                Voltar
                            </Button>
                        </aside>
                    </section>
                )}
            </motion.div>

            {codigo && (
                <ModalDeCodigo
                    onFechar={() => setCodigo(null)}
                    onConfirmado={async () => {
                        await gravar({ repasses: [codigo.repasse, ...repasses] });
                        setCodigo(null);
                        setSucesso(true);
                    }}
                />
            )}
            {sucesso && (
                <ModalOverlay isOpen onOpenChange={(o) => !o && onFechar()} isDismissable>
                    <Modal>
                        <Dialog aria-label="Tudo certo!">
                            <div className="flex w-full max-w-lg flex-col items-center gap-4 rounded-2xl bg-primary p-8 text-center shadow-xl ring-1 ring-secondary">
                                <FeaturedIcon icon={CheckCircle} color="success" theme="light" size="xl" />
                                <h2 className="text-display-xs font-semibold text-primary">Tudo certo!</h2>
                                <p className="text-md text-secondary">Sua solicitação de repasse foi confirmada com sucesso!</p>
                                <p className="text-sm text-tertiary">Em breve, o processo será analisado e o valor será disponibilizado conforme o prazo estabelecido.</p>
                                <div className="mt-2 flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-center">
                                    <Button color="secondary" size="lg" onClick={onFechar}>
                                        Fechar
                                    </Button>
                                    <Button
                                        color="primary"
                                        size="lg"
                                        onClick={() => {
                                            setSucesso(false);
                                            setValores({});
                                            setModalidade(undefined);
                                            setCusto("repasse");
                                            setDescricao("");
                                            setControle("");
                                            setContaId(contaInicial);
                                            onRecomecar();
                                        }}
                                    >
                                        Pedir novo repasse
                                    </Button>
                                </div>
                            </div>
                        </Dialog>
                    </Modal>
                </ModalOverlay>
            )}
            {/* Sair com o repasse pela metade pergunta antes (FIN-50). */}
            <ModalDeConfirmacao
                aberto={confirmandoSaida}
                titulo="Sair do repasse?"
                descricao="A conta e os valores que você escolheu não ficam salvos."
                confirmar="Sair do repasse"
                cancelar="Continuar repasse"
                destrutiva
                onConfirmar={() => {
                    setConfirmandoSaida(false);
                    onFechar();
                }}
                onFechar={() => setConfirmandoSaida(false)}
            />
        </div>
    );
}

/**
 * Passo 2 (FIN-54): busca, "Máximo em todos" e, por evento, o valor com o atalho de máximo ao lado.
 * O campo tem largura para o valor inteiro (antes, 64 px cortavam o número).
 */
function PassoValor({
    eventos,
    valores,
    soma,
    onValor,
    onTodos,
    onVoltar,
    onAvancar,
}: {
    eventos: SaldoDoEvento[];
    valores: Record<string, number | undefined>;
    soma: number;
    onValor: (eventoId: string, v: number | undefined) => void;
    onTodos: (tipo: "disponivel" | "total") => void;
    onVoltar: () => void;
    onAvancar: () => void;
}) {
    const [busca, setBusca] = useState("");
    const termo = busca.trim().toLowerCase();
    const lista = eventos.filter((e) => !termo || e.nome.toLowerCase().includes(termo) || e.eventoId.toLowerCase().includes(termo));

    const menuDeMaximo = (rotulo: string, aoEscolher: (tipo: "disponivel" | "total") => void, disponivel?: number, total?: number) => (
        <Dropdown.Root>
            <Button color="secondary" size="sm" iconTrailing={ChevronDown}>
                {rotulo}
            </Button>
            <Dropdown.Popover className="w-72" placement="bottom end">
                <Dropdown.Menu aria-label={rotulo} onAction={(k) => aoEscolher(k as "disponivel" | "total")}>
                    <Dropdown.Item id="disponivel" label="Máximo disponível, sem taxa" addon={disponivel === undefined ? undefined : reais(disponivel)} />
                    <Dropdown.Item id="total" label="Máximo total, com antecipação" addon={total === undefined ? undefined : reais(total)} />
                </Dropdown.Menu>
            </Dropdown.Popover>
        </Dropdown.Root>
    );

    return (
        <section className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold text-primary">Quanto você vai repassar?</h3>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <InputBase
                    size="sm"
                    icon={SearchLg}
                    aria-label="Buscar eventos"
                    placeholder="Buscar eventos..."
                    value={busca}
                    onChange={(v: unknown) => setBusca(typeof v === "string" ? v : ((v as { target?: { value?: string } })?.target?.value ?? ""))}
                    wrapperClassName="w-full sm:max-w-80"
                />
                {menuDeMaximo("Máximo em todos", onTodos)}
            </div>
            <CartaoDaTabela>
                <CabecalhoDaTabela>
                    <span className="min-w-0 flex-1">{`Eventos (${eventos.length})`}</span>
                    <span className="w-32 text-right">Disponível</span>
                    <span className="w-32 text-right">A antecipar</span>
                    <span className="w-72">Repasse por evento</span>
                </CabecalhoDaTabela>
                {lista.length === 0 ? (
                    <SemResultados texto="Nenhum evento encontrado para essa busca." onLimpar={() => setBusca("")} />
                ) : (
                    <ul className="flex flex-col divide-y divide-secondary">
                        {lista.map((e) => (
                            <LinhaDaTabela key={e.eventoId}>
                                <div className="flex min-w-0 flex-1 flex-col gap-2 @min-[44rem]:flex-row @min-[44rem]:items-center @min-[44rem]:gap-4">
                                    <div className="flex min-w-0 flex-1 items-center gap-3">
                                        <img src={e.capa} alt="" className="h-12 w-9 shrink-0 rounded object-cover" />
                                        <span className="truncate text-sm font-medium text-primary">{e.nome}</span>
                                    </div>
                                    <Celula rotulo="Disponível" numero className="text-secondary @min-[44rem]:w-32">
                                        {reais(e.disponivel)}
                                    </Celula>
                                    <Celula rotulo="A antecipar" numero className="text-secondary @min-[44rem]:w-32">
                                        {reais(e.aLiberar)}
                                    </Celula>
                                    <div className="flex items-start gap-2 @min-[44rem]:w-72">
                                        <div className="min-w-0 flex-1">
                                            <CampoPreco
                                                label={`Repasse de ${e.nome}`}
                                                ocultarLabel
                                                opcional
                                                placeholder="0,00"
                                                valor={valores[e.eventoId]}
                                                onChange={(v) => onValor(e.eventoId, v == null ? undefined : Math.min(v, e.total))}
                                            />
                                        </div>
                                        {menuDeMaximo("Máximo", (tipo) => onValor(e.eventoId, tipo === "disponivel" ? e.disponivel || undefined : e.total), e.disponivel, e.total)}
                                    </div>
                                </div>
                            </LinhaDaTabela>
                        ))}
                    </ul>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-secondary bg-secondary_subtle px-5 py-3 text-sm md:px-6">
                    <span className="text-tertiary">{`Você pode repassar até ${reais(eventos.reduce((n, e) => n + e.total, 0))}`}</span>
                    <span className="flex items-baseline gap-2">
                        <span className="font-medium text-secondary">Total do repasse</span>
                        <span className="font-semibold text-primary tabular-nums">{reais(soma)}</span>
                    </span>
                </div>
            </CartaoDaTabela>
            <p className="text-sm text-tertiary">O valor solicitado para repasse poderá sofrer descontos referentes às taxas de antecipação e agendamento.</p>
            <Rodape>
                <Button color="secondary" size="md" onClick={onVoltar}>
                    Voltar
                </Button>
                <Button color="primary" size="md" isDisabled={soma <= 0} onClick={onAvancar}>
                    Avançar
                </Button>
            </Rodape>
        </section>
    );
}

const Rodape = ({ children }: { children: ReactNode }) => <div className="flex flex-col-reverse gap-3 border-t border-secondary pt-4 sm:flex-row sm:justify-end">{children}</div>;

const Linha = ({ rotulo, valor }: { rotulo: string; valor: string }) => (
    <div className="flex justify-between gap-3">
        <dt className="text-tertiary">{rotulo}</dt>
        <dd className="text-right text-primary tabular-nums">{valor}</dd>
    </div>
);

/** Passo 1: contas do contrato e outras contas (com taxa extra), busca, nova conta e remover. Escolha em grupo de rádio (FIN-53). */
function PassoConta({
    contas,
    contaId,
    onEscolher,
    gravar,
    onCancelar,
    onAvancar,
}: {
    contas: ContaFavorecida[];
    contaId?: string;
    onEscolher: (id: string) => void;
    gravar: (p: { contasFavorecidas?: ContaFavorecida[] }) => Promise<void>;
    onCancelar: () => void;
    onAvancar: () => void;
}) {
    const [busca, setBusca] = useState("");
    const [nova, setNova] = useState(false);
    const [removendo, setRemovendo] = useState<ContaFavorecida | null>(null);
    const termo = busca.trim().toLowerCase();
    const filtradas = contas.filter((c) => !termo || c.titular.toLowerCase().includes(termo) || (c.conta ?? c.chavePix ?? "").toLowerCase().includes(termo));
    const doContrato = filtradas.filter((c) => c.padraoDoContrato);
    const outras = filtradas.filter((c) => !c.padraoDoContrato);

    // Cada conta é um rádio (o cartão inteiro escolhe); "Remover conta" fica fora do rádio, ao lado.
    const cartao = (c: ContaFavorecida) => (
        <li key={c.id} className={cx("flex items-center gap-3 rounded-xl p-3", contaId === c.id ? "bg-secondary_subtle ring-2 ring-brand" : "bg-primary ring-1 ring-secondary")}>
            <AriaRadio value={c.id} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-4">
                {({ isSelected, isFocusVisible }) => (
                    <>
                        <RadioButtonBase size="md" isSelected={isSelected} isFocusVisible={isFocusVisible} />
                        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-fg-secondary">
                            {c.tipo === "pix" ? <span className="text-xs font-semibold">Pix</span> : <Bank className="size-5" />}
                        </span>
                        <span className="flex min-w-0 flex-col">
                            <span className="truncate text-sm font-semibold text-primary">{c.titular}</span>
                            <span className="truncate text-sm text-tertiary">{descricaoDaConta(c)}</span>
                        </span>
                    </>
                )}
            </AriaRadio>
            {!c.padraoDoContrato && <ButtonUtility icon={Trash01} color="tertiary" size="sm" tooltip="Remover conta" aria-label={`Remover a conta de ${c.titular}`} onClick={() => setRemovendo(c)} />}
        </li>
    );

    return (
        <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 id="titulo-contas" className="text-lg font-semibold text-primary">
                    Quem vai receber o repasse?
                </h3>
                <div className="flex items-center gap-2">
                    <InputBase
                        size="sm"
                        icon={SearchLg}
                        aria-label="Buscar contas"
                        placeholder="Buscar contas..."
                        value={busca}
                        onChange={(v: unknown) => setBusca(typeof v === "string" ? v : ((v as { target?: { value?: string } })?.target?.value ?? ""))}
                        wrapperClassName="min-w-0 flex-1"
                    />
                    <ButtonUtility icon={Plus} color="secondary" size="sm" tooltip="Nova conta" onClick={() => setNova(true)} />
                </div>
            </div>
            <AriaRadioGroup aria-labelledby="titulo-contas" value={contaId ?? null} onChange={onEscolher} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-secondary">{`Conta padrão do contrato (${doContrato.length})`}</span>
                    <ul className="flex flex-col gap-2">{doContrato.map(cartao)}</ul>
                </div>
                <div className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-secondary">{`Outras contas (${outras.length})`}</span>
                    <p className="text-sm text-tertiary">{`Repasses para outras contas têm taxa adicional de ${TAXA_OUTRAS_CONTAS.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}% sobre o valor solicitado.`}</p>
                    <ul className="flex flex-col gap-2">{outras.map(cartao)}</ul>
                </div>
            </AriaRadioGroup>
            <Rodape>
                <Button color="secondary" size="md" onClick={onCancelar}>
                    Cancelar
                </Button>
                <Button color="primary" size="md" isDisabled={!contaId} onClick={onAvancar}>
                    Avançar
                </Button>
            </Rodape>
            {nova && (
                <ModalNovaConta
                    onFechar={() => setNova(false)}
                    onAdicionar={async (c) => {
                        await gravar({ contasFavorecidas: [c, ...contas] });
                        onEscolher(c.id);
                        setNova(false);
                    }}
                />
            )}
            <ModalDeConfirmacao
                aberto={!!removendo}
                titulo="Remover conta bancária"
                descricao="Tem certeza de que deseja remover essa conta? Após a remoção da conta, não irá poder reativar ela novamente."
                confirmar="Remover conta bancária"
                destrutiva
                icone={Trash01}
                onConfirmar={async () => {
                    if (!removendo) return;
                    await gravar({ contasFavorecidas: contas.filter((c) => c.id !== removendo.id) });
                    toast.success("A remoção da conta bancária foi realizada com sucesso.");
                    setRemovendo(null);
                }}
                onFechar={() => setRemovendo(null)}
            />
        </section>
    );
}

/** "Adicionar nova conta" (FIN-33): Pix (o nome vem da chave) ou conta corrente/poupança. Com algo digitado, fechar pergunta antes (FIN-50). */
function ModalNovaConta({ onFechar, onAdicionar }: { onFechar: () => void; onAdicionar: (c: ContaFavorecida) => Promise<void> }) {
    const [tipo, setTipo] = useState<ContaFavorecida["tipo"]>("pix");
    const [nome, setNome] = useState("");
    const [chave, setChave] = useState("");
    const [doc, setDoc] = useState("");
    const [banco, setBanco] = useState("");
    const [agencia, setAgencia] = useState("");
    const [conta, setConta] = useState("");
    const [tentou, setTentou] = useState(false);
    const [descartando, setDescartando] = useState(false);
    const erroAg = !agencia ? "Não pode ficar em branco" : !/^\d{1,4}$/.test(agencia) ? "Deve ter entre 1 e 4 dígitos" : undefined;
    const erroConta = !conta ? "Não pode ficar em branco" : !/^\d{3,14}-?\d$/.test(conta) ? "Deve ser numérica, com o dígito verificador ao final" : undefined;
    const valido = tipo === "pix" ? chave.trim().length >= 5 : !!nome.trim() && !!doc.trim() && !!banco && !erroAg && !erroConta;
    const alterado = [nome, chave, doc, banco, agencia, conta].some((v) => v.trim());
    const fechar = () => (alterado ? setDescartando(true) : onFechar());

    const adicionar = () => {
        setTentou(true);
        if (!valido) return;
        // No protótipo a chave Pix não é consultada: o titular vem do nome digitado ou fica genérico.
        void onAdicionar({
            id: novoId("conta"),
            titular: nome.trim() || "Titular da chave Pix",
            tipo,
            chavePix: tipo === "pix" ? chave.trim() : undefined,
            documento: tipo === "pix" ? undefined : doc.trim(),
            banco: tipo === "pix" ? undefined : banco,
            agencia: tipo === "pix" ? undefined : agencia,
            conta: tipo === "pix" ? undefined : conta,
            padraoDoContrato: false,
            criadaEm: new Date().toISOString(),
        });
    };

    return (
        // Com algo digitado, clicar fora não fecha; Esc, X e Cancelar perguntam antes de descartar (T6).
        <ModalOverlay isOpen onOpenChange={(o) => !o && fechar()} isDismissable={!alterado}>
            <Modal>
                <Dialog aria-label="Adicionar nova conta">
                    <div className="relative flex w-full max-w-lg flex-col gap-5 rounded-2xl bg-primary p-6 shadow-xl ring-1 ring-secondary">
                        <ButtonUtility size="sm" color="tertiary" icon={XClose} tooltip="Fechar" onClick={fechar} className="absolute top-4 right-4" />
                        <h2 className="pr-8 text-lg font-semibold text-primary">Adicionar nova conta</h2>
                        <NativeSelect
                            label="Tipo de conta"
                            value={tipo}
                            onChange={(e) => setTipo(e.target.value as ContaFavorecida["tipo"])}
                            options={[
                                { label: "Pix", value: "pix" },
                                { label: "Conta corrente", value: "corrente" },
                                { label: "Conta poupança", value: "poupanca" },
                            ]}
                        />
                        {tipo === "pix" ? (
                            <Input label="Chave Pix" isRequired placeholder="000.000.000/00" value={chave} onChange={setChave} isInvalid={tentou && chave.trim().length < 5} hint={tentou && chave.trim().length < 5 ? "Insira uma chave Pix válida" : "O nome do titular vem da chave."} />
                        ) : (
                            <>
                                <Input label="Nome completo" isRequired placeholder="Beneficiário" value={nome} onChange={setNome} isInvalid={tentou && !nome.trim()} hint={tentou && !nome.trim() ? "Não pode ficar em branco" : undefined} />
                                <Input label="Documento" isRequired placeholder="000.000.000/00" value={doc} onChange={setDoc} isInvalid={tentou && !doc.trim()} hint={tentou && !doc.trim() ? "Não pode ficar em branco" : undefined} />
                                <NativeSelect
                                    label="Instituição financeira"
                                    value={banco}
                                    onChange={(e) => setBanco(e.target.value)}
                                    options={[{ label: "Selecione", value: "" }, ...["Banco do Brasil 001", "Bradesco 237", "Caixa 104", "Itaú 341", "Nubank 260", "Santander 033"].map((b) => ({ label: b, value: b }))]}
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <Input label="Agência" isRequired placeholder="0001" value={agencia} onChange={(v) => setAgencia(v.replace(/\D/g, "").slice(0, 4))} isInvalid={tentou && !!erroAg} hint={tentou ? erroAg : undefined} />
                                    <Input label="Conta com dígito" isRequired placeholder="0000001-8" value={conta} onChange={setConta} isInvalid={tentou && !!erroConta} hint={tentou ? erroConta : undefined} />
                                </div>
                            </>
                        )}
                        <Checkbox label="Salvar conta bancária para pagamentos futuros" defaultSelected isDisabled />
                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <Button color="secondary" size="lg" onClick={fechar}>
                                Cancelar
                            </Button>
                            <Button color="primary" size="lg" onClick={adicionar}>
                                Adicionar conta
                            </Button>
                        </div>
                    </div>
                    <ModalDeConfirmacao
                        aberto={descartando}
                        titulo="Descartar a conta?"
                        descricao="Os dados que você digitou não ficam salvos."
                        confirmar="Descartar"
                        cancelar="Continuar editando"
                        destrutiva
                        onConfirmar={onFechar}
                        onFechar={() => setDescartando(false)}
                    />
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}

/** "Confirmação do repasse" (FIN-44): canal, envio do código e os 6 dígitos. No protótipo, o código aparece na tela. */
function ModalDeCodigo({ onFechar, onConfirmado }: { onFechar: () => void; onConfirmado: () => Promise<void> }) {
    const [canal, setCanal] = useState<"WhatsApp" | "SMS">();
    const [enviado, setEnviado] = useState(false);
    const [digitado, setDigitado] = useState("");
    const token = useMemo(() => String(Math.floor(100000 + Math.random() * 900000)), []);
    const [gravando, setGravando] = useState(false);

    return (
        <ModalOverlay isOpen onOpenChange={(o) => !o && !gravando && onFechar()} isDismissable={!gravando}>
            <Modal>
                <Dialog aria-label="Confirmação do repasse">
                    <div className="relative flex w-full max-w-md flex-col gap-5 rounded-2xl bg-primary p-6 shadow-xl ring-1 ring-secondary">
                        <ButtonUtility size="sm" color="tertiary" icon={XClose} tooltip="Fechar" onClick={onFechar} className="absolute top-4 right-4" />
                        <h2 className="pr-8 text-lg font-semibold text-primary">Confirmação do repasse</h2>
                        {!enviado ? (
                            <>
                                <p className="text-sm text-secondary">Selecione o canal que enviaremos o código de segurança</p>
                                <div className="flex gap-3">
                                    {(["WhatsApp", "SMS"] as const).map((c) => (
                                        <Button key={c} color={canal === c ? "primary" : "secondary"} size="md" onClick={() => setCanal(c)}>
                                            {c}
                                        </Button>
                                    ))}
                                </div>
                                {canal && <p className="text-sm text-tertiary">{`Enviaremos o token por ${canal} para o número ****1234, vinculado ao responsável financeiro.`}</p>}
                                <Button color="primary" size="lg" isDisabled={!canal} onClick={() => setEnviado(true)}>
                                    Enviar código
                                </Button>
                            </>
                        ) : (
                            <>
                                <Input label="Digite o código de confirmação" autoFocus inputMode="numeric" placeholder="------" value={digitado} onChange={(v) => setDigitado(v.replace(/\D/g, "").slice(0, 6))} />
                                {/* Ferramenta de protótipo: sem SMS de verdade, o código aparece aqui. */}
                                <p className="rounded-lg bg-secondary_subtle p-3 text-sm text-tertiary ring-1 ring-secondary">{`Protótipo: o código enviado é ${token}.`}</p>
                                <Button
                                    color="primary"
                                    size="lg"
                                    isDisabled={digitado !== token}
                                    isLoading={gravando}
                                    showTextWhileLoading
                                    onClick={async () => {
                                        setGravando(true);
                                        await onConfirmado();
                                    }}
                                >
                                    Confirmar código
                                </Button>
                            </>
                        )}
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
