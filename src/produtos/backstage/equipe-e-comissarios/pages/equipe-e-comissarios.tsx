import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { ChevronRight, CoinsHand, Plus, UsersPlus } from "@untitledui/icons";
import { BadgeWithIcon } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Select } from "@/components/base/select/select";
import { Toggle } from "@/components/base/toggle/toggle";
import { BackstageLayout } from "../../components/Backstage";
import { AvisoDeEscala } from "../../itens/components/escala";
import { CabecalhoDaPagina } from "../../components/cabecalho-da-pagina";
import { RodapeDePaginacao, usePaginacao } from "../../components/rodape-de-paginacao";
import { BarraDaLista, CabecalhoDaTabela, CarregandoTabela, CartaoDaTabela, Celula, SemResultados, TituloDaLinha, VazioDaTabela } from "../../components/tabela";
import { FaixaDeMetricas, Metrica, moeda, numero } from "../../comissarios/components/comuns";
import { CAMINHO_CRIAR_INGRESSOS, eventoSemItens } from "../components/formulario-canal";
import { ModalCriarGrupo } from "../components/modal-criar-grupo";
import { ModalDesativar } from "../components/modal-desativar";
import { BadgeInativo, TemaCotas } from "../components/ui-cotas";
import { ITEM_POR_ID } from "../data/catalogo-evento";
import {
    alterarGrupo,
    BASE,
    canaisLigados,
    plural,
    ROTULO_CANAL,
    totaisDosPedidos,
    useEquipeDoEvento,
    type CanalGrupo,
    type DadosDoGrupo,
    type GrupoEquipe,
} from "../data/equipe";

type FiltroCanal = "todos" | CanalGrupo;
type FiltroStatus = "todos" | "ativos" | "inativos";

const CANAIS: Array<{ id: FiltroCanal; label: string }> = [
    { id: "todos", label: "Todos os canais" },
    { id: "link", label: ROTULO_CANAL.link },
    { id: "pdv", label: ROTULO_CANAL.pdv },
    { id: "bilheteria", label: ROTULO_CANAL.bilheteria },
    { id: "cortesia", label: ROTULO_CANAL.cortesia },
];
const STATUS: Array<{ id: FiltroStatus; label: string }> = [
    { id: "todos", label: "Todos" },
    { id: "ativos", label: "Ativos" },
    { id: "inativos", label: "Inativos" },
];

/** Lista da Equipe e Comissários do evento (ECO-02 a ECO-05). */
export function EquipeEComissarios() {
    const navigate = useNavigate();
    const { carregando, evento, organizacao, grupos } = useEquipeDoEvento();
    const [busca, setBusca] = useState("");
    const [canal, setCanal] = useState<FiltroCanal>("todos");
    const [status, setStatus] = useState<FiltroStatus>("todos");
    const [desativando, setDesativando] = useState<GrupoEquipe | null>(null);
    const [criando, setCriando] = useState(false);

    const filtrados = useMemo(() => {
        const q = busca.trim().toLowerCase();
        const lista = grupos.filter(({ grupo: g, comissario }) => {
            if (canal !== "todos" && !g.canais[canal]?.ligado) return false;
            if (status === "ativos" && !g.ativo) return false;
            if (status === "inativos" && g.ativo) return false;
            if (!q) return true;
            return (
                g.nome.toLowerCase().includes(q) ||
                !!comissario?.nome.toLowerCase().includes(q) ||
                g.operadores.some((e) => e.toLowerCase().includes(q)) ||
                Object.values(g.canais).some((c) => c?.itens.some((id) => ITEM_POR_ID[id]?.nome.toLowerCase().includes(q)))
            );
        });
        // Ativos primeiro, inativos no fim (ECO-04).
        return [...lista.filter((x) => x.grupo.ativo), ...lista.filter((x) => !x.grupo.ativo)];
    }, [grupos, busca, canal, status]);

    // Soma exata dos grupos-comissário: os mesmos pedidos e repasses que cada grupo lista (ECO-87).
    const comComissarios = useMemo(() => grupos.filter((x) => x.comissario), [grupos]);
    const geral = useMemo(() => totaisDosPedidos(comComissarios.flatMap((x) => x.pedidos), comComissarios.flatMap((x) => x.repasses)), [comComissarios]);

    // Busca, filtro ou tamanho novo voltam à página 1 (BKS-114, ECO-03).
    const paginacao = usePaginacao(filtrados, [busca, canal, status]);
    const limparFiltros = () => {
        setBusca("");
        setCanal("todos");
        setStatus("todos");
    };
    // Liga e desliga gravando na hora, com toast e Desfazer (ECO-93); desativar pergunta antes (ECO-05).
    const mudarAtivo = (g: GrupoEquipe, ativo: boolean, desfazendo = false) => {
        alterarGrupo(g.id, (x) => ({ ...x, ativo }));
        toast.success(`${g.nome} ${ativo ? "ativado" : "desativado"}.`, desfazendo ? undefined : { action: { label: "Desfazer", onClick: () => mudarAtivo(g, !ativo, true) } });
    };
    const alternar = (g: GrupoEquipe) => (g.ativo ? setDesativando(g) : mudarAtivo(g, true));

    return (
        <BackstageLayout activeSection="equipe-e-comissarios" activeItem="equipe-e-comissarios">
            <TemaCotas className="gap-6">
                <CabecalhoDaPagina
                    titulo="Equipe e comissários"
                    subtitulo="Quem opera o evento, em quais canais, com quais itens e qual cota. Com comissário, o grupo também vende pelo link e ganha comissão."
                    acoes={
                        grupos.length > 0 && (
                            <Button size="md" color="primary" onClick={() => setCriando(true)}>
                                Criar grupo
                            </Button>
                        )
                    }
                />
                <AvisoDeEscala />

                {carregando ? (
                    <CarregandoTabela linhas={5} rotulo="Carregando grupos" />
                ) : grupos.length === 0 ? (
                    <VazioDaTabela
                        icone={UsersPlus}
                        titulo="Nenhum grupo neste evento"
                        texto={`Crie um grupo para quem emite cortesias, vende no PDV e na bilheteria ou vende pelo link como comissário.${
                            // Os canais precisam de itens: avisa antes de criar o grupo (ECO-37).
                            eventoSemItens() ? " O evento ainda não tem ingressos: crie antes, para os canais terem o que vender." : ""
                        }`}
                        acao={
                            <>
                                {eventoSemItens() && (
                                    <Button color="secondary" size="md" onClick={() => navigate(CAMINHO_CRIAR_INGRESSOS)}>
                                        Criar ingressos
                                    </Button>
                                )}
                                <Button color="primary" size="md" iconLeading={Plus} onClick={() => setCriando(true)}>
                                    Criar grupo
                                </Button>
                            </>
                        }
                    />
                ) : (
                    <main className="flex flex-1 flex-col gap-6">
                        {comComissarios.length > 0 && (
                            <FaixaDeMetricas>
                                <Metrica
                                    rotulo="Vendido por comissários"
                                    valor={moeda(geral.receita)}
                                    apoio={`${plural(geral.porCanal.online.quantidade, "ingresso", "ingressos")} no link, ${numero(geral.porCanal.bilheteria.quantidade)} no PDV e na bilheteria`}
                                />
                                <Metrica rotulo="Cortesias enviadas" valor={numero(geral.cortesias)} apoio="Pelos grupos com comissário" />
                                <Metrica rotulo="Comissão gerada" valor={moeda(geral.comissao)} apoio={geral.estornado > 0 ? `${moeda(geral.estornado)} estornados em cancelamentos` : undefined} />
                                <Metrica rotulo="A repassar" valor={moeda(geral.aRepassar)} apoio={`${moeda(geral.repassado)} já repassados`} />
                            </FaixaDeMetricas>
                        )}

                        <div className="flex flex-col gap-4">
                            <BarraDaLista
                                busca={{ valor: busca, onChange: setBusca, placeholder: "Grupo, comissário, pessoa ou item", rotulo: "Buscar grupo" }}
                                filtro={
                                    // Status em botões segmentados (BKS-111); na largura toda no celular.
                                    <ButtonGroup
                                        size="sm"
                                        aria-label="Status"
                                        disallowEmptySelection
                                        selectedKeys={[status]}
                                        onSelectionChange={(keys) => {
                                            const [k] = [...keys];
                                            if (k !== undefined) setStatus(String(k) as FiltroStatus);
                                        }}
                                        className="w-full sm:w-max"
                                    >
                                        {STATUS.map((s) => (
                                            <ButtonGroupItem key={s.id} id={s.id} className="flex-1 justify-center sm:flex-none">
                                                {s.label}
                                            </ButtonGroupItem>
                                        ))}
                                    </ButtonGroup>
                                }
                            >
                                <div className="w-full sm:w-48">
                                    <Select size="sm" aria-label="Canal" selectedKey={canal} onSelectionChange={(k) => k && setCanal(String(k) as FiltroCanal)} items={CANAIS}>
                                        {(item) => (
                                            <Select.Item id={item.id} selectionIndicator="none">
                                                {item.label}
                                            </Select.Item>
                                        )}
                                    </Select>
                                </div>
                            </BarraDaLista>

                            <CartaoDaTabela>
                                <CabecalhoDaTabela>
                                    <span className="w-9 shrink-0">Ativo</span>
                                    <span className="min-w-0 flex-1">Grupo</span>
                                    <span className="w-56">Canais</span>
                                    <span className="w-20 text-right">Pessoas</span>
                                    <span className="w-4" />
                                </CabecalhoDaTabela>
                                {filtrados.length === 0 ? (
                                    <SemResultados texto="Nenhum grupo encontrado para essa busca ou esses filtros." onLimpar={limparFiltros} />
                                ) : (
                                    <ul className="flex flex-col divide-y divide-secondary">
                                        {/* Desativar leva o grupo para o fim, reativar o traz para cima: a linha desliza até o novo lugar (ECO-101). */}
                                        <AnimatePresence initial={false}>
                                            {paginacao.visiveis.map((d) => (
                                                <LinhaGrupo key={d.grupo.id} dados={d} onToggle={() => alternar(d.grupo)} onAbrir={() => navigate(`${BASE}/${d.grupo.id}`)} />
                                            ))}
                                        </AnimatePresence>
                                    </ul>
                                )}
                                <RodapeDePaginacao {...paginacao} />
                            </CartaoDaTabela>
                        </div>
                    </main>
                )}

                <ModalDesativar
                    aberto={!!desativando}
                    titulo="Desativar grupo?"
                    descricao={
                        desativando?.comissarioId
                            ? "Ao desativar, as pessoas do grupo deixam de operar os canais dele e o link de venda do comissário para de contar vendas. O já vendido e o saldo continuam. Você pode ativar de novo quando quiser."
                            : "Ao desativar, as pessoas do grupo deixam de ter acesso aos itens dos canais dele. Você pode ativar de novo quando quiser."
                    }
                    acao="Desativar grupo"
                    onCancelar={() => setDesativando(null)}
                    onConfirmar={() => {
                        if (desativando) mudarAtivo(desativando, false);
                        setDesativando(null);
                    }}
                />
                <ModalCriarGrupo aberto={criando} onFechar={() => setCriando(false)} eventoId={evento.id} organizacaoId={organizacao?.id ?? ""} grupos={grupos.map((x) => x.grupo)} />
            </TemaCotas>
        </BackstageLayout>
    );
}

/* ------------------------------ Linha ------------------------------- */

function LinhaGrupo({ dados, onToggle, onAbrir }: { dados: DadosDoGrupo; onToggle: () => void; onAbrir: () => void }) {
    // Sem cota, uso e valores na lista: ficam no detalhe do grupo (ECO-14).
    const { grupo, comissario } = dados;
    // Inativo mostra os canais que voltam ao reativar.
    const ligados = canaisLigados({ ...grupo, ativo: true });
    const canais = ligados.length ? ligados.map((c) => ROTULO_CANAL[c]).join(", ") : "Nenhum canal ligado";
    const selos = !grupo.ativo || comissario;

    const reduzir = useReducedMotion();
    return (
        // A linha toda abre o grupo (o botão cobre a linha); o toggle fica por cima. Mesmas classes da
        // LinhaDaTabela (BKS-113), num motion.li para deslizar ao mudar de lugar (ECO-101).
        <motion.li
            layout={reduzir ? false : "position"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="group relative flex items-start gap-4 bg-primary px-5 py-3 transition-colors duration-100 ease-linear hover:bg-primary_hover @min-[44rem]:items-center md:px-6"
        >
            <Toggle
                size="sm"
                isSelected={grupo.ativo}
                onChange={onToggle}
                aria-label={`${grupo.nome} ativo`}
                className="relative z-10 mt-0.5 w-9 shrink-0 @min-[44rem]:mt-0"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 @min-[44rem]:flex-row @min-[44rem]:items-center @min-[44rem]:gap-4">
                <TituloDaLinha
                    titulo={
                        <button type="button" onClick={onAbrir} className="text-left outline-hidden after:absolute after:inset-0 focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-focus-ring">
                            {grupo.nome}
                        </button>
                    }
                    apoio={
                        selos ? (
                            <span className="mt-1 flex flex-wrap items-center gap-2">
                                {!grupo.ativo && <BadgeInativo />}
                                {comissario && (
                                    <BadgeWithIcon size="sm" type="pill-color" color="brand" iconLeading={CoinsHand}>
                                        Comissário {comissario.codigo}
                                    </BadgeWithIcon>
                                )}
                            </span>
                        ) : undefined
                    }
                />
                <Celula rotulo="Canais" className="@min-[44rem]:w-56">
                    <span className="@min-[44rem]:block @min-[44rem]:truncate">{canais}</span>
                </Celula>
                <Celula rotulo="Pessoas" numero className="@min-[44rem]:w-20">
                    {numero(grupo.operadores.length)}
                </Celula>
            </div>
            <ChevronRight className="mt-0.5 size-4 shrink-0 text-fg-quaternary transition duration-100 ease-linear group-hover:translate-x-0.5 @min-[44rem]:mt-0" aria-hidden="true" />
        </motion.li>
    );
}
