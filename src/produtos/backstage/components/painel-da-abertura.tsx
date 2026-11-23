import { useEffect, useId, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Heading as AriaHeading } from "react-aria-components";
import { toast } from "sonner";
import { Dialog, Modal, ModalOverlay, SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Tabs } from "@/components/application/tabs/tabs";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Input } from "@/components/base/input/input";
import { DURACAO_TRANSICAO } from "@/components/foundations/transicao";
import { itensDaAbertura, novoId, type AberturaDeVendas, type Evento, type ItemDaAbertura, type ProdutoDaOrganizacao } from "@/plataforma";
import { ListaDeOpcoes, type OpcaoDeLista } from "../itens/components/SeletorDeLista";
import { produtosDo, salvarAberturas } from "../itens/data/catalogo";
import { formatar, useTextosItens } from "../itens/data/textos-itens";
import { CampoData, CampoHora } from "./campos-de-data-e-hora";
import { ModalDeConfirmacao } from "./modal-de-confirmacao";
import { ArvoreDeIngressos, useResumoDeIngressos, useSelecaoDeIngressos } from "./seletor-de-ingressos";

/*
 * Painel da abertura de vendas (ABV-11): criar e editar numa etapa só. Nome e período (data e hora em
 * campos separados, como no Criar evento, com o fim sugerido) no alto; os ingressos, produtos e combos embaixo, em abas; o
 * resumo do que vai vender e um botão só no rodapé. Abre em Aberturas de vendas e, pelo aviso "Nada
 * programado para entrar à venda", em Ingressos e produtos, sem sair da tela (GDC-10). Grava sozinho no
 * evento (`salvarAberturas`). Fechar com algo mudado pergunta antes (ABV-15).
 */

type TipoDeItem = "ingresso" | "produto" | "combo";

const T = {
    nova: "Nova abertura de vendas",
    editar: "Editar abertura",
    evento: "O evento começa em {data}.",
    nome: "Nome",
    nomePlaceholder: "Ex.: Venda antecipada",
    nomeDica: "Aparece para o comprador.",
    nomeErro: "Dê um nome à abertura.",
    dataInicio: "Data de início",
    horaInicio: "Hora de início",
    dataFim: "Data de término",
    horaFim: "Hora de término",
    dataErro: "Escolha a data.",
    horaErro: "Escolha a hora.",
    fimErro: "Escolha um fim depois do começo.",
    fimSugeridoEvento: "Sugerido: até o começo do evento.",
    fimSugeridoDia: "Sugerido: um dia depois do começo.",
    itens: "O que vende",
    itensDica: "Marque a sessão ou o grupo para incluir todos os ingressos dele. Ingressos criados depois não entram sozinhos.",
    abas: "Itens da abertura",
    ingressos: "Ingressos",
    produtos: "Produtos",
    combos: "Combos",
    semProdutos: "O evento ainda não vende produtos.",
    semCombos: "O evento ainda não tem combos.",
    contagem: { produto: { one: "{n} produto", other: "{n} produtos" }, combo: { one: "{n} combo", other: "{n} combos" } },
    semItens: "Sem itens, esta abertura não vende nada.",
    cancelar: "Cancelar",
    fechar: "Fechar",
    criar: "Criar abertura",
    salvar: "Salvar",
    criada: "{nome} criada.",
    salvo: "Alterações salvas.",
    erro: "Tente de novo: não foi possível salvar.",
    descartarTitulo: "Descartar o que você digitou?",
    descartarDica: "O que você digitou ainda não foi salvo.",
    continuarEditando: "Continuar editando",
    descartar: "Descartar",
};

/** Grava só o formato novo (`itens`), sem as configurações antigas. */
const comItens = (a: AberturaDeVendas, itens: ItemDaAbertura[]): AberturaDeVendas => {
    const { configuracoes: _antigas, ...resto } = a;
    return { ...resto, itens };
};

/** Um dia depois, no mesmo formato local "AAAA-MM-DDTHH:mm". */
const umDiaDepois = (v: string) => {
    const d = new Date(v);
    d.setDate(d.getDate() + 1);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function PainelDaAbertura({
    evento,
    biblioteca,
    abertura,
    onFechar,
}: {
    evento: Evento;
    biblioteca: ProdutoDaOrganizacao[];
    /** Sem abertura: nova. */
    abertura?: AberturaDeVendas;
    onFechar: () => void;
}) {
    const { dataLonga, plural, locale } = useTextosItens();
    const reduzir = useReducedMotion();
    const tituloId = useId();
    const resumirIngressos = useResumoDeIngressos();
    const opcoes = useMemo<Record<"produto" | "combo", OpcaoDeLista[]>>(
        () => ({
            produto: produtosDo(evento, biblioteca).map(({ produto }) => ({ id: produto.id, rotulo: produto.nome })),
            combo: (evento.combos ?? []).map((c) => ({ id: c.id, rotulo: c.nome })),
        }),
        [evento, biblioteca],
    );

    // Nova abertura começa com tudo marcado: o caso comum é abrir tudo de uma vez, e desmarcar é um toque (ABV-12).
    // A abertura grava cada ingresso marcado; gravar "o grupo inteiro, inclusive os futuros" é decisão em aberto.
    const [iniciais] = useState<ItemDaAbertura[]>(() =>
        abertura
            ? itensDaAbertura(abertura)
            : [
                  ...evento.sessoes.flatMap((s) => s.grupos.flatMap((g) => g.ingressos.map((t) => ({ tipo: "ingresso" as const, id: t.id })))),
                  ...opcoes.produto.map((o) => ({ tipo: "produto" as const, id: o.id })),
                  ...opcoes.combo.map((o) => ({ tipo: "combo" as const, id: o.id })),
              ],
    );
    const ingressos = useSelecaoDeIngressos(evento, iniciais);
    const [produtos, setProdutos] = useState(() => new Set(iniciais.filter((i) => i.tipo === "produto").map((i) => i.id)));
    const [combos, setCombos] = useState(() => new Set(iniciais.filter((i) => i.tipo === "combo").map((i) => i.id)));
    // Só as abas que têm o que escolher: sem produtos nem combos no evento, nada de abas vazias (M5).
    const abas = useMemo(() => (["ingresso", ...(opcoes.produto.length ? ["produto"] : []), ...(opcoes.combo.length ? ["combo"] : [])] as TipoDeItem[]), [opcoes]);
    const [aba, setAba] = useState<TipoDeItem>("ingresso");

    const [nome, setNome] = useState(abertura?.nome ?? "");
    // Data e hora em campos separados (ABV-17): escolher dia e hora no mesmo calendário não funcionou com os
    // produtores (decisão de 17/11/2026, reafirmada em 23/11/2026). O período gravado junta os dois.
    const [dataInicio, setDataInicio] = useState(abertura?.inicio.slice(0, 10) ?? "");
    const [horaInicio, setHoraInicio] = useState(abertura?.inicio.slice(11, 16) ?? "");
    const [dataFim, setDataFim] = useState(abertura?.fim.slice(0, 10) ?? "");
    const [horaFim, setHoraFim] = useState(abertura?.fim.slice(11, 16) ?? "");
    const inicio = dataInicio && horaInicio ? `${dataInicio}T${horaInicio}` : undefined;
    const fim = dataFim && horaFim ? `${dataFim}T${horaFim}` : undefined;
    // O fim é sugerido a partir do começo até a pessoa mexer nele (ABV-11).
    const [fimSugerido, setFimSugerido] = useState<string | null>(null);
    const [tentou, setTentou] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [perguntando, setPerguntando] = useState(false);
    const erros = {
        nome: !nome.trim() ? T.nomeErro : undefined,
        dataInicio: !dataInicio ? T.dataErro : undefined,
        horaInicio: !horaInicio ? T.horaErro : undefined,
        dataFim: !dataFim ? T.dataErro : inicio && fim && fim <= inicio ? T.fimErro : undefined,
        horaFim: !horaFim ? T.horaErro : undefined,
    };

    const mudarInicio = (data: string, hora: string) => {
        setDataInicio(data);
        setHoraInicio(hora);
        // Com data e hora de início e o fim vazio (ou ainda sugerido), sugere: o começo do evento, se vem depois;
        // senão, um dia depois.
        if (!data || !hora || (fim && !fimSugerido)) return;
        const v = `${data}T${hora}`;
        const doEvento = evento.data?.slice(0, 16);
        const sugestao = doEvento && doEvento > v ? doEvento : umDiaDepois(v);
        setDataFim(sugestao.slice(0, 10));
        setHoraFim(sugestao.slice(11, 16));
        setFimSugerido(doEvento && doEvento > v ? T.fimSugeridoEvento : T.fimSugeridoDia);
    };
    const mudarFim = (data: string, hora: string) => {
        setDataFim(data);
        setHoraFim(hora);
        setFimSugerido(null);
    };

    // O que mudou desde que o painel abriu: qualquer marcação conta, mesmo desfeita (sem refazer 300 mil ids).
    const [comoAbriu] = useState(() => ({ setores: ingressos.setores, ingressos: ingressos.ingressos, produtos, combos }));
    const alterado =
        nome !== (abertura?.nome ?? "") ||
        inicio !== abertura?.inicio.slice(0, 16) ||
        fim !== abertura?.fim.slice(0, 16) ||
        ingressos.setores !== comoAbriu.setores ||
        ingressos.ingressos !== comoAbriu.ingressos ||
        produtos !== comoAbriu.produtos ||
        combos !== comoAbriu.combos;
    // Recarregar ou fechar a aba do navegador com algo mudado também pergunta.
    useEffect(() => {
        if (!alterado) return;
        const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener("beforeunload", aviso);
        return () => window.removeEventListener("beforeunload", aviso);
    }, [alterado]);
    /** Esc, Cancelar e Fechar passam por aqui: com algo mudado, pergunta antes de descartar (UI-NAV-002). */
    const pedirParaFechar = () => (alterado && !salvando ? setPerguntando(true) : onFechar());

    const totalDeItens = ingressos.total.ingressos + produtos.size + combos.size;
    // Frase do idioma, sem separador (UI-TXT-010): "60 ingressos em 8 grupos e 1 produto".
    const resumo =
        totalDeItens === 0
            ? T.semItens
            : new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(
                  [
                      ingressos.total.ingressos > 0 ? resumirIngressos(ingressos.total.ingressos, ingressos.total.setores) : null,
                      produtos.size > 0 ? plural(T.contagem.produto, produtos.size) : null,
                      combos.size > 0 ? plural(T.contagem.combo, combos.size) : null,
                  ].filter((x): x is string => !!x),
              );

    const salvar = async () => {
        setTentou(true);
        if (erros.nome || erros.dataInicio || erros.horaInicio || erros.dataFim || erros.horaFim || !inicio || !fim) return;
        setSalvando(true);
        const itens: ItemDaAbertura[] = [
            ...ingressos.resultado(),
            ...[...produtos].map((id) => ({ tipo: "produto" as const, id })),
            ...[...combos].map((id) => ({ tipo: "combo" as const, id })),
        ];
        const dados = { nome: nome.trim(), inicio, fim };
        const atuais = evento.aberturas ?? [];
        const lista = abertura
            ? atuais.map((a) => (a.id === abertura.id ? comItens({ ...a, ...dados }, itens) : a))
            : [...atuais, { id: novoId("abv"), ...dados, itens }];
        try {
            await salvarAberturas(evento, lista);
            toast.success(abertura ? T.salvo : formatar(T.criada, { nome: dados.nome }));
            onFechar();
        } catch {
            toast.error(T.erro);
        } finally {
            setSalvando(false);
        }
    };

    const titulo = abertura ? T.editar : T.nova;
    const rotuloDaAba: Record<TipoDeItem, string> = { ingresso: T.ingressos, produto: T.produtos, combo: T.combos };
    const marcadosNaAba: Record<TipoDeItem, number> = { ingresso: ingressos.total.ingressos, produto: produtos.size, combo: combos.size };

    return (
        // Peças do painel lateral do DS montadas aqui para o painel ter o nome do título e o "Fechar" em português
        // (SEG-64). Com algo mudado, clicar fora não fecha e Esc pergunta (UI-NAV-002).
        // Celular: tela cheia (UI-NAV-003). Desktop: 576 px. z-50: acima do cabeçalho fixo do Backstage no celular (z-30).
        <ModalOverlay isOpen isDismissable={!alterado} onOpenChange={(v) => !v && pedirParaFechar()} className="z-50 pl-0">
            <Modal className="md:max-w-[36rem]">
                <Dialog aria-label={undefined} aria-labelledby={tituloId} className="gap-0">
                    <header className="relative z-1 flex w-full flex-col gap-1 px-4 pt-6 pb-4 md:px-6">
                        <AriaHeading id={tituloId} className="pr-8 text-lg font-semibold text-primary">
                            {titulo}
                        </AriaHeading>
                        {evento.data && <p className="text-sm text-tertiary">{formatar(T.evento, { data: dataLonga(evento.data) })}</p>}
                        <CloseButton size="sm" label={T.fechar} className="absolute top-3 right-3 shrink-0" onPress={pedirParaFechar} />
                    </header>

                    <SlideoutMenu.Content className="gap-6 border-t border-secondary pt-5 pb-6">
                        {/* noValidate: os erros são os da tela, não os balões do navegador. */}
                        <form
                            id="form-da-abertura"
                            noValidate
                            className="flex flex-col gap-5"
                            onSubmit={(e) => {
                                e.preventDefault();
                                void salvar();
                            }}
                        >
                            <Input
                                label={T.nome}
                                placeholder={T.nomePlaceholder}
                                isRequired
                                value={nome}
                                onChange={setNome}
                                isInvalid={tentou && !!erros.nome}
                                hint={tentou && erros.nome ? erros.nome : T.nomeDica}
                            />
                            {/* Início e término, cada um com data e hora em campos separados, lado a lado (ABV-17). */}
                            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,9rem)] items-start gap-3">
                                <CampoData
                                    label={T.dataInicio}
                                    isRequired
                                    valor={dataInicio}
                                    onChange={(d) => mudarInicio(d, horaInicio)}
                                    isInvalid={tentou && !!erros.dataInicio}
                                    hint={tentou ? erros.dataInicio : undefined}
                                />
                                <CampoHora
                                    label={T.horaInicio}
                                    isRequired
                                    valor={horaInicio}
                                    onChange={(h) => mudarInicio(dataInicio, h)}
                                    isInvalid={tentou && !!erros.horaInicio}
                                    hint={tentou ? erros.horaInicio : undefined}
                                />
                            </div>
                            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,9rem)] items-start gap-3">
                                <CampoData
                                    label={T.dataFim}
                                    isRequired
                                    valor={dataFim}
                                    minimo={dataInicio || undefined}
                                    onChange={(d) => mudarFim(d, horaFim)}
                                    isInvalid={tentou && !!erros.dataFim}
                                    hint={tentou && erros.dataFim ? erros.dataFim : (fimSugerido ?? undefined)}
                                />
                                <CampoHora
                                    label={T.horaFim}
                                    isRequired
                                    valor={horaFim}
                                    onChange={(h) => mudarFim(dataFim, h)}
                                    isInvalid={tentou && !!erros.horaFim}
                                    hint={tentou ? erros.horaFim : undefined}
                                />
                            </div>
                        </form>

                        {/* Os itens, separados do formulário por uma linha (um nível de contêiner, UI-VIS-019). */}
                        <section aria-labelledby="itens-da-abertura" className="flex flex-col gap-4 border-t border-secondary pt-5">
                            <div className="flex flex-col gap-1">
                                <h3 id="itens-da-abertura" className="text-md font-semibold text-primary">
                                    {T.itens}
                                </h3>
                                <p className="text-sm text-tertiary">{T.itensDica}</p>
                            </div>
                            {abas.length > 1 && (
                                <Tabs selectedKey={aba} onSelectionChange={(k) => setAba(k as TipoDeItem)} className="w-full">
                                    <Tabs.List type="button-border" size="sm" fullWidth aria-label={T.abas}>
                                        {abas.map((a) => (
                                            <Tabs.Item key={a} id={a} badge={marcadosNaAba[a] || undefined}>
                                                {rotuloDaAba[a]}
                                            </Tabs.Item>
                                        ))}
                                    </Tabs.List>
                                </Tabs>
                            )}
                            {/* Trocar de aba troca o conteúdo com um fade curto (UI-VIS-008); sem movimento, na hora. */}
                            <motion.div
                                key={aba}
                                initial={reduzir ? false : { opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: DURACAO_TRANSICAO * 0.75, ease: "easeOut" }}
                                className="flex flex-col gap-3"
                            >
                                {aba === "ingresso" && <ArvoreDeIngressos evento={evento} selecao={ingressos} rotulo={T.ingressos} />}
                                {aba === "produto" && <ListaDeOpcoes opcoes={opcoes.produto} marcados={produtos} onMarcados={setProdutos} vazio={T.semProdutos} />}
                                {aba === "combo" && <ListaDeOpcoes opcoes={opcoes.combo} marcados={combos} onMarcados={setCombos} vazio={T.semCombos} />}
                            </motion.div>
                        </section>
                    </SlideoutMenu.Content>

                    <SlideoutMenu.Footer className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className={totalDeItens === 0 ? "text-sm text-warning-primary" : "text-sm text-tertiary"} role="status">
                            {resumo}
                        </span>
                        <div className="flex flex-col-reverse gap-3 sm:flex-row">
                            <Button color="secondary" size="md" onClick={pedirParaFechar}>
                                {T.cancelar}
                            </Button>
                            <Button color="primary" size="md" type="submit" form="form-da-abertura" isLoading={salvando}>
                                {abertura ? T.salvar : T.criar}
                            </Button>
                        </div>
                    </SlideoutMenu.Footer>

                    {/* Descartar o que foi digitado: a mesma pergunta da lista de ingressos (ITM-133). */}
                    <ModalDeConfirmacao
                        aberto={perguntando}
                        titulo={T.descartarTitulo}
                        descricao={T.descartarDica}
                        confirmar={T.descartar}
                        cancelar={T.continuarEditando}
                        destrutiva
                        onConfirmar={onFechar}
                        onFechar={() => setPerguntando(false)}
                    />
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
