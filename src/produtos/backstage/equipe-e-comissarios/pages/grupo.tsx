import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { CoinsHand, Edit01, Plus, Users01, Wallet02 } from "@untitledui/icons";
import { Tab, TabList, TabPanel, Tabs } from "@/components/application/tabs/tabs";
import { Badge, BadgeWithIcon } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Toggle } from "@/components/base/toggle/toggle";
import { Surgir } from "@/components/foundations/transicao";
import { useDoc } from "@/plataforma";
import { BackstageLayout } from "../../components/Backstage";
import { CabecalhoDaPagina } from "../../components/cabecalho-da-pagina";
import { RodapeDePaginacao, usePaginacao } from "../../components/rodape-de-paginacao";
import { BarraDaLista, CabecalhoDaTabela, CarregandoTabela, CartaoDaTabela, Celula, LinhaDaTabela, SemResultados, TituloDaLinha, VazioDaTabela } from "../../components/tabela";
import { CopiarLink, dataCurta, linkDeVenda, moeda } from "../../comissarios/components/comuns";
import { RegistrarRepasseModal } from "../../comissarios/components/RegistrarRepasseModal";
import { AvisoDeEscala } from "../../itens/components/escala";
import { AbaVendas } from "../components/aba-vendas";
import { ListaDePedidos } from "../components/lista-de-pedidos";
import { CartaoCanal } from "../components/cartao-canal";
import { CodigoVendedor } from "../components/codigo-vendedor";
import { CAMINHO_CRIAR_INGRESSOS, eventoSemItens } from "../components/formulario-canal";
import { ModalDesativar } from "../components/modal-desativar";
import { ModalEditarOperadores } from "../components/modal-editar-operadores";
import { BadgeInativo, TemaCotas, TituloSecao } from "../components/ui-cotas";
import { GRUPO_MEMBROS_POR_ID } from "../data/membros";
import {
    alterarGrupo,
    BASE,
    canaisLigados,
    CANAIS_GRUPO,
    codigosEmUso,
    definirCodigoVendedor,
    lerEstadoComissarios,
    operadorAtivo,
    operadoresDe,
    plural,
    ROTULO_CANAL,
    useEquipeDoEvento,
    type CanalGrupo,
    type DadosDoGrupo,
} from "../data/equipe";

type Aba = "configuracao" | "pessoas" | "pedidos" | "repasses";

/** Grupo (ECO-11 a ECO-22): abas Pedidos, Configuração e Pessoas; com comissário, também Repasses. */
export function GrupoDaEquipe() {
    const { grupoId = "" } = useParams();
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const { carregando, evento, grupos } = useEquipeDoEvento();
    const dados = grupos.find((x) => x.grupo.id === grupoId);
    const slug = useDoc("eventos", evento.id)?.slug ?? evento.id;
    const [repasse, setRepasse] = useState(false);
    const location = useLocation();
    const [criado] = useState(() => Boolean((location.state as { criado?: boolean } | null)?.criado));
    useEffect(() => {
        window.scrollTo({ top: 0 });
        if (criado) navigate(location.pathname, { replace: true, state: null });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [grupoId]);

    const voltar = () => navigate(BASE);

    // Carregando e "não encontrado" também abrem com o cabeçalho de página (BKS-100).
    if (carregando)
        return (
            <BackstageLayout activeSection="equipe-e-comissarios" activeItem="equipe-e-comissarios">
                <TemaCotas className="gap-6">
                    <CabecalhoDaPagina voltar={{ rotulo: "Equipe e comissários", onClick: voltar }} titulo="Grupo" />
                    <CarregandoTabela linhas={4} rotulo="Carregando grupo" />
                </TemaCotas>
            </BackstageLayout>
        );

    if (!dados)
        return (
            <BackstageLayout activeSection="equipe-e-comissarios" activeItem="equipe-e-comissarios">
                <TemaCotas className="gap-6">
                    <CabecalhoDaPagina
                        voltar={{ rotulo: "Equipe e comissários", onClick: voltar }}
                        titulo="Grupo não encontrado"
                        subtitulo={`Este grupo não está em ${evento.nome}. Ele pode ser de outro evento ou ter saído da lista.`}
                    />
                </TemaCotas>
            </BackstageLayout>
        );

    // Pedidos de todos os canais do grupo (ECO-74) e os totais, que somam exatamente a lista (ECO-87).
    const { grupo, comissario, vendas, repasses, pedidos, t } = dados;
    // Pedidos vem primeiro; abre por padrão com comissário ou com pedidos, senão abre a Configuração (ECO-11).
    const abasValidas: Aba[] = comissario ? ["pedidos", "configuracao", "pessoas", "repasses"] : ["pedidos", "configuracao", "pessoas"];
    const padrao: Aba = comissario || pedidos.length > 0 ? "pedidos" : "configuracao";
    // "vendas" era o nome antigo da aba Pedidos.
    const pedidaNaUrl = params.get("aba");
    const pedida = (pedidaNaUrl === "vendas" ? "pedidos" : pedidaNaUrl) as Aba | null;
    const aba: Aba = pedida && abasValidas.includes(pedida) ? pedida : padrao;
    const ligados = canaisLigados(grupo);
    const link = comissario ? linkDeVenda(slug, comissario.codigo) : "";

    return (
        <BackstageLayout activeSection="equipe-e-comissarios" activeItem="equipe-e-comissarios">
            <TemaCotas className="gap-6">
                <CabecalhoDaPagina
                    voltar={{ rotulo: "Equipe e comissários", onClick: voltar }}
                    titulo={grupo.nome}
                    subtitulo={
                        <span className="flex flex-wrap items-center gap-2">
                            {!grupo.ativo && <BadgeInativo />}
                            {comissario && (
                                <BadgeWithIcon size="md" type="pill-color" color="brand" iconLeading={CoinsHand}>
                                    Comissário {comissario.codigo}
                                </BadgeWithIcon>
                            )}
                            {ligados.length ? ligados.map((c) => ROTULO_CANAL[c]).join(", ") : "Nenhum canal ligado"}, {plural(grupo.operadores.length, "pessoa", "pessoas")}
                        </span>
                    }
                    acoes={
                        comissario && (
                            <>
                                {ligados.includes("link") && <CopiarLink link={link} rotulo="Copiar link de venda" size="md" />}
                                <Button color="secondary" size="md" iconLeading={Plus} onClick={() => setRepasse(true)} isDisabled={t.aRepassar <= 0}>
                                    Registrar repasse
                                </Button>
                            </>
                        )
                    }
                />
                <AvisoDeEscala />

                <Tabs selectedKey={aba} onSelectionChange={(k) => setParams(k === padrao ? {} : { aba: String(k) }, { replace: true })} className="gap-6">
                    <TabList type="underline" size="sm" aria-label="Seções do grupo">
                        <Tab id="pedidos" badge={String(pedidos.length)}>
                            Pedidos
                        </Tab>
                        <Tab id="configuracao">Configuração</Tab>
                        <Tab id="pessoas" badge={String(grupo.operadores.length)}>
                            Pessoas
                        </Tab>
                        {comissario && (
                            <Tab id="repasses" badge={String(repasses.length)}>
                                Repasses
                            </Tab>
                        )}
                    </TabList>
                    <TabPanel id="configuracao">
                        <AbaConfiguracao key={grupo.id} dados={dados} criado={criado} />
                    </TabPanel>
                    <TabPanel id="pessoas">
                        <AbaPessoas dados={dados} />
                    </TabPanel>
                    <TabPanel id="pedidos" className="flex flex-col gap-6">
                        {comissario ? (
                            <AbaVendas vendas={vendas} pedidos={pedidos} t={t} grupo={grupo} variosVendedores={comissario.pessoas.length > 1} pessoas={comissario.pessoas} link={link} codigo={comissario.codigo} />
                        ) : (
                            <ListaDePedidos pedidos={pedidos} vendedores={grupo.operadores.map((e) => grupo.nomes?.[e] ?? e.split("@")[0])} comComissao={false} />
                        )}
                    </TabPanel>
                    {comissario && (
                        <TabPanel id="repasses">
                            <AbaRepasses dados={dados} aRepassar={t.aRepassar} repassado={t.repassado} />
                        </TabPanel>
                    )}
                </Tabs>
            </TemaCotas>

            {comissario && (
                <RegistrarRepasseModal
                    aberto={repasse}
                    onFechar={() => setRepasse(false)}
                    comissarioId={comissario.id}
                    comissarioNome={comissario.nome}
                    saldos={[{ eventoId: evento.id, nome: evento.nome, aRepassar: t.aRepassar }]}
                    eventoInicial={evento.id}
                />
            )}
        </BackstageLayout>
    );
}

/* ------------------------------------------------------------------ */
/*  Aba Configuração                                                   */
/* ------------------------------------------------------------------ */

function AbaConfiguracao({ dados, criado }: { dados: DadosDoGrupo; criado: boolean }) {
    const { grupo, comissario } = dados;
    const navigate = useNavigate();
    const semCanal = Object.keys(grupo.canais).length === 0;
    const semItens = eventoSemItens();
    // Configurar e editar abrem a página do canal (ECO-14).
    const configurar = (c: CanalGrupo) => navigate(`${BASE}/${grupo.id}/canal/${c}`);
    return (
        <div className="flex flex-col gap-6">
            <Surgir visivel={criado && !semItens}>
                <p role="status" className="rounded-xl bg-secondary px-4 py-3 text-sm text-secondary">
                    Grupo criado. Agora configure os canais que ele vai operar. Para o grupo vender pelo link e ganhar comissão, configure o canal Comissário.
                </p>
            </Surgir>
            {/* Sem itens no evento, avisa antes de a pessoa abrir um canal sem nada para vender (ECO-37). */}
            {semItens && (
                <div role="status" className="flex flex-col items-start gap-3 rounded-xl bg-secondary px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-secondary">
                        {criado ? "Grupo criado. " : ""}O evento ainda não tem ingressos, produtos nem combos. Crie os ingressos para configurar PDV, Bilheteria online e Cortesia. O canal Comissário já pode vender todos os ingressos que forem criados.
                    </p>
                    <Button size="sm" color="secondary" className="shrink-0" onClick={() => navigate(CAMINHO_CRIAR_INGRESSOS)}>
                        Criar ingressos
                    </Button>
                </div>
            )}

            <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-0.5">
                    <h2 className="text-lg font-semibold text-primary">Canais</h2>
                    <p className="text-sm text-tertiary">
                        {semCanal ? "Nenhum canal configurado ainda. " : ""}Cada canal tem os próprios itens e a própria cota. A cota é do grupo, não de cada pessoa.
                    </p>
                </div>
                {/* O comissário é um canal como os outros (ECO-12): sem ele, o cartão diz o que faz e "Configurar". */}
                {CANAIS_GRUPO.map((c) => (
                    <CartaoCanal key={c} grupo={grupo} canal={c} comissario={comissario} onConfigurar={() => configurar(c)} />
                ))}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Aba Pessoas                                                        */
/* ------------------------------------------------------------------ */

type Desligando = { tipo: "pessoa" | "grupo"; id: string };

/**
 * Pessoas do grupo (ECO-22, ECO-95): os grupos de Membros com o toggle de cada um e uma tabela com
 * todas as pessoas, com busca, contagem e paginação (BKS-110 a BKS-118). Ligar e desligar grava na hora,
 * com toast e Desfazer (ECO-93); desligar pergunta antes.
 */
function AbaPessoas({ dados }: { dados: DadosDoGrupo }) {
    const { grupo, comissario } = dados;
    const [desligando, setDesligando] = useState<Desligando | null>(null);
    const [editando, setEditando] = useState(false);
    const [busca, setBusca] = useState("");

    const alternarPessoa = (email: string) =>
        alterarGrupo(grupo.id, (g) => ({
            ...g,
            operadoresInativos: g.operadoresInativos.includes(email) ? g.operadoresInativos.filter((e) => e !== email) : [...g.operadoresInativos, email],
        }));
    const alternarGrupoMembros = (m: string) =>
        alterarGrupo(grupo.id, (g) => ({ ...g, gruposInativos: g.gruposInativos.includes(m) ? g.gruposInativos.filter((x) => x !== m) : [...g.gruposInativos, m] }));
    const nomeDe = (d: Desligando) => (d.tipo === "grupo" ? (GRUPO_MEMBROS_POR_ID[d.id]?.nome ?? "O grupo") : (grupo.nomes?.[d.id] ?? d.id));
    // Grava, avisa e oferece Desfazer, que repete a troca (ECO-93).
    const trocar = (d: Desligando, ligado: boolean, desfazendo = false) => {
        if (d.tipo === "grupo") alternarGrupoMembros(d.id);
        else alternarPessoa(d.id);
        const texto =
            d.tipo === "grupo"
                ? `Membros de ${nomeDe(d)} ${ligado ? "voltaram a operar" : "não operam mais"} este grupo.`
                : `${nomeDe(d)} ${ligado ? "voltou a operar" : "não opera mais"} este grupo.`;
        toast.success(texto, desfazendo ? undefined : { action: { label: "Desfazer", onClick: () => trocar(d, !ligado, true) } });
    };

    // Em grupo-comissário, toda pessoa tem o cargo Comissário; o responsável aparece como tal (ECO-24).
    const responsavel = comissario?.pessoas.find((p) => p.papel === "responsavel")?.email;
    const cargo = (email: string) => (!comissario ? undefined : email === responsavel ? "Comissário, responsável" : "Comissário");
    // Código de cada pessoa (ECO-27): o do grupo para o responsável, o próprio para o vendedor.
    const codigoDe = (email: string) => comissario?.pessoas.find((p) => p.email === email)?.codigo;
    const validarCodigo = (email: string) => (c: string) => {
        if (c.length < 3) return "Use de 3 a 20 letras ou números.";
        if (codigosEmUso(lerEstadoComissarios().grupos, grupo.eventoId, { grupoId: grupo.id, email }).has(c)) return `${c} já é usado neste evento.`;
        return undefined;
    };

    // De onde a pessoa vem: os grupos de Membros dela e/ou "Adicionada individualmente" (só quando o grupo usa grupos de Membros).
    const origem = (email: string) =>
        grupo.gruposMembrosIds.length === 0
            ? ""
            : [
            ...grupo.gruposMembrosIds.filter((m) => GRUPO_MEMBROS_POR_ID[m]?.emails.includes(email)).map((m) => GRUPO_MEMBROS_POR_ID[m].nome),
                  ...(grupo.emailsAvulsos.includes(email) ? ["Adicionada individualmente"] : []),
              ].join(", ");
    // Só por grupos de Membros desligados: o toggle trava (ECO-60).
    const travada = (email: string) =>
        !grupo.emailsAvulsos.includes(email) &&
        !grupo.gruposMembrosIds.some((m) => !grupo.gruposInativos.includes(m) && GRUPO_MEMBROS_POR_ID[m]?.emails.includes(email));

    const pessoas = grupo.operadores;
    const ativas = pessoas.filter((e) => operadorAtivo(grupo, e)).length;
    const termo = busca.trim().toLowerCase();
    const filtradas = useMemo(
        () => (termo ? pessoas.filter((e) => `${e} ${grupo.nomes?.[e] ?? ""} ${codigoDe(e) ?? ""}`.toLowerCase().includes(termo)) : pessoas),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [pessoas, termo, grupo.nomes, comissario],
    );
    const paginacao = usePaginacao(filtradas, [termo]);
    const gruposMembros = grupo.gruposMembrosIds.filter((m) => GRUPO_MEMBROS_POR_ID[m]);

    return (
        <div className="flex flex-col gap-8">
            {gruposMembros.length > 0 && (
                <section className="flex flex-col gap-4">
                    <TituloSecao apoio="Desligar um grupo de Membros tira todas as pessoas dele deste grupo. Elas voltam quando você ligar de novo.">Grupos de Membros</TituloSecao>
                    <CartaoDaTabela>
                        <ul className="flex flex-col divide-y divide-secondary">
                            {gruposMembros.map((m) => {
                                const membros = GRUPO_MEMBROS_POR_ID[m];
                                const ligado = !grupo.gruposInativos.includes(m);
                                return (
                                    <LinhaDaTabela key={m}>
                                        <Toggle
                                            size="sm"
                                            label={membros.nome}
                                            hint={plural(membros.emails.length, "membro", "membros")}
                                            isSelected={ligado}
                                            onChange={() => (ligado ? setDesligando({ tipo: "grupo", id: m }) : trocar({ tipo: "grupo", id: m }, true))}
                                        />
                                    </LinhaDaTabela>
                                );
                            })}
                        </ul>
                    </CartaoDaTabela>
                </section>
            )}

            <section className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <TituloSecao apoio={`${plural(pessoas.length, "pessoa", "pessoas")}, ${plural(ativas, "ativa", "ativas")}.`}>Pessoas</TituloSecao>
                    <Button size="sm" color="secondary" iconLeading={Edit01} onClick={() => setEditando(true)}>
                        Editar pessoas
                    </Button>
                </div>
                {pessoas.length === 0 ? (
                    <VazioDaTabela icone={Users01} titulo="Nenhuma pessoa no grupo" texto="Adicione pessoas por grupo de Membros ou por e-mail." />
                ) : (
                    <>
                        {pessoas.length > 10 && <BarraDaLista busca={{ valor: busca, onChange: setBusca, placeholder: "Buscar por nome, e-mail ou código", rotulo: "Buscar pessoa" }} />}
                        <CartaoDaTabela>
                            <CabecalhoDaTabela>
                                <span className="w-12 shrink-0">Ativa</span>
                                <span className="min-w-0 flex-1">Pessoa</span>
                                {comissario && <span className="w-48">Cargo</span>}
                                {comissario && <span className="w-52">Código</span>}
                                <span className="w-24 text-right">Emitidos</span>
                            </CabecalhoDaTabela>
                            {filtradas.length === 0 ? (
                                <SemResultados texto="Nenhuma pessoa encontrada com esse nome, e-mail ou código." onLimpar={() => setBusca("")} />
                            ) : (
                                <ul className="flex flex-col divide-y divide-secondary">
                                    {paginacao.visiveis.map((email) => {
                                        const ativa = operadorAtivo(grupo, email);
                                        const codigo = codigoDe(email);
                                        const emitidos = grupo.emitidosPorOperador[email] ?? 0;
                                        const nome = grupo.nomes?.[email];
                                        return (
                                            <LinhaDaTabela key={email}>
                                                {/* Rótulo visível do toggle: o cabeçalho "Ativa" na tabela; no cartão estreito, embaixo do toggle (UI-FRM-005). */}
                                                <span className="flex w-12 shrink-0 flex-col items-start gap-1 pt-0.5 @min-[44rem]:pt-0">
                                                    <Toggle
                                                        size="sm"
                                                        isSelected={ativa}
                                                        isDisabled={travada(email)}
                                                        aria-label={`${nome ?? email} ativa`}
                                                        onChange={() => (ativa ? setDesligando({ tipo: "pessoa", id: email }) : trocar({ tipo: "pessoa", id: email }, true))}
                                                    />
                                                    <span aria-hidden="true" className="text-sm text-tertiary @min-[44rem]:hidden">
                                                        Ativa
                                                    </span>
                                                </span>
                                                {/* Celular: nome e e-mail na primeira linha; cargo, código e emitidos na segunda (UI-MOB-004). */}
                                                <div className="flex min-w-0 flex-1 flex-col gap-1.5 @min-[44rem]:flex-row @min-[44rem]:items-center @min-[44rem]:gap-4">
                                                    <TituloDaLinha titulo={nome ?? email} apoio={[nome ? email : "", origem(email)].filter(Boolean).join(", ")} />
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 @min-[44rem]:contents">
                                                        {comissario && (
                                                            <span className="flex @min-[44rem]:w-48">
                                                                <Badge size="sm" type="pill-color" color="brand">
                                                                    {cargo(email)}
                                                                </Badge>
                                                            </span>
                                                        )}
                                                        {comissario && codigo && (
                                                            <span className="flex @min-[44rem]:w-52">
                                                                <CodigoVendedor
                                                                    codigo={codigo}
                                                                    editavel={email !== responsavel}
                                                                    validar={validarCodigo(email)}
                                                                    onSalvar={(c) => definirCodigoVendedor(grupo.id, email, c)}
                                                                />
                                                            </span>
                                                        )}
                                                        {/* Sem emissão, a linha não diz "0 emitidos" (ECO-22). */}
                                                        <span className="text-sm font-medium text-secondary tabular-nums @min-[44rem]:w-24 @min-[44rem]:text-right">
                                                            {emitidos > 0 ? plural(emitidos, "emitido", "emitidos") : ""}
                                                        </span>
                                                    </div>
                                                </div>
                                            </LinhaDaTabela>
                                        );
                                    })}
                                </ul>
                            )}
                            <RodapeDePaginacao {...paginacao} />
                        </CartaoDaTabela>
                    </>
                )}
            </section>

            <ModalEditarOperadores
                grupo={editando ? grupo : null}
                onCancelar={() => setEditando(false)}
                onSalvar={(gruposMembrosIds, emailsAvulsos) => {
                    const operadores = operadoresDe(gruposMembrosIds, emailsAvulsos);
                    alterarGrupo(grupo.id, (g) => ({
                        ...g,
                        gruposMembrosIds,
                        emailsAvulsos,
                        operadores,
                        operadoresInativos: g.operadoresInativos.filter((e) => operadores.includes(e)),
                        gruposInativos: g.gruposInativos.filter((m) => gruposMembrosIds.includes(m)),
                    }));
                    setEditando(false);
                    toast.success("Pessoas do grupo atualizadas.");
                }}
            />
            <ModalDesativar
                aberto={!!desligando}
                titulo={desligando?.tipo === "grupo" ? "Desativar grupo de Membros?" : "Desativar pessoa?"}
                descricao={
                    desligando?.tipo === "grupo"
                        ? `Os membros de ${nomeDe(desligando)} deixam de operar os canais deste grupo. Você pode ativar de novo quando quiser.`
                        : `${desligando ? nomeDe(desligando) : ""} deixa de operar os canais deste grupo. Você pode ativar de novo quando quiser.`
                }
                acao={desligando?.tipo === "grupo" ? "Desativar grupo" : "Desativar pessoa"}
                onCancelar={() => setDesligando(null)}
                onConfirmar={() => {
                    if (desligando) trocar(desligando, false);
                    setDesligando(null);
                }}
            />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Aba Repasses                                                       */
/* ------------------------------------------------------------------ */

/** Repasses (ECO-73). "Registrar repasse" fica só no topo da página (ECO-96); o vazio explica. */
function AbaRepasses({ dados, aRepassar, repassado }: { dados: DadosDoGrupo; aRepassar: number; repassado: number }) {
    const lista = [...dados.repasses].sort((a, b) => b.data.localeCompare(a.data));
    const paginacao = usePaginacao(lista);
    return (
        <section className="flex flex-col gap-4">
            <TituloSecao apoio={`O pagamento da comissão é feito por fora da Ingresse e registrado aqui. ${repassado > 0 ? `${moeda(repassado)} já repassados, ` : ""}${moeda(aRepassar)} a repassar neste evento.`}>
                Repasses
            </TituloSecao>
            {lista.length === 0 ? (
                <VazioDaTabela
                    icone={Wallet02}
                    titulo="Nenhum repasse registrado neste evento"
                    texto={aRepassar > 0 ? "Cada pagamento de comissão feito ao comissário entra aqui. Use \"Registrar repasse\", no topo da página." : "Quando houver comissão a repassar, registre aqui cada pagamento feito ao comissário, pelo \"Registrar repasse\" no topo da página."}
                />
            ) : (
                <CartaoDaTabela>
                    <CabecalhoDaTabela>
                        <span className="min-w-0 flex-1">Data</span>
                        <span className="w-32 text-right">Valor</span>
                    </CabecalhoDaTabela>
                    <ul className="flex flex-col divide-y divide-secondary">
                        {paginacao.visiveis.map((r) => (
                            <LinhaDaTabela key={r.id} className="flex-col gap-1 @min-[44rem]:flex-row @min-[44rem]:gap-4">
                                <TituloDaLinha titulo={<span className="tabular-nums">{dataCurta(r.data)}</span>} apoio={r.observacao || "Sem observação"} />
                                <Celula rotulo="Valor" numero className="font-medium @min-[44rem]:w-32">
                                    {moeda(r.valor)}
                                </Celula>
                            </LinhaDaTabela>
                        ))}
                    </ul>
                    <RodapeDePaginacao {...paginacao} />
                </CartaoDaTabela>
            )}
        </section>
    );
}
