import { useEffect, useId, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/base/buttons/button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import { cx } from "@/utils/cx";
import { BackstageLayout } from "../../components/Backstage";
import { CabecalhoDaPagina } from "../../components/cabecalho-da-pagina";
import { ModalDeConfirmacao } from "../../components/modal-de-confirmacao";
import { addCargo, cargoById, isCargoSistema, updateCargo, useCargos, useMembros, useMembrosCarregando } from "../../components/membros-store";
import { CarregandoTabela } from "../../components/tabela";
import { ResumoCargoModal } from "../components/resumo-cargo-modal";
import {
    CATALOGO_PERMISSOES,
    acoesDaSecao,
    chavePermissao,
    chavesDoRecurso,
    completarSelecao,
    semDependentesOrfaos,
    type AcaoBase,
    type RecursoPermissao,
    type SecaoPermissao,
} from "../data/permissoes-catalogo";

// Matriz a partir de 44rem (704 px) de largura das tabelas; abaixo disso, um bloco por recurso
// com as ações como checkboxes com rótulo (container query, como BKS-115 e MEM-68).
const COL_ACAO_REM = 8.5;
const gridStyle = (colunas: number) => ({
    gridTemplateColumns: `minmax(0,1fr) repeat(${colunas}, ${COL_ACAO_REM}rem)`,
});

// Criar e editar cargo voltam para a aba Cargos de Membros (MEM-78).
const ABA_CARGOS = "/backstage/membros?aba=cargos";

export function CriarCargo() {
    const { id } = useParams();
    // Os cargos vêm da organização em contexto: espera o banco antes de decidir se o cargo existe (MEM-43).
    const carregando = useMembrosCarregando();
    useCargos();
    if (carregando) {
        return (
            <BackstageLayout showEventContext={false} activeProducer="equipe" showLayoutSwitcher={false}>
                <CarregandoTabela />
            </BackstageLayout>
        );
    }
    return <FormularioDoCargo key={id ?? "novo"} id={id} />;
}

function FormularioDoCargo({ id }: { id?: string }) {
    const navigate = useNavigate();
    const cargo = id ? cargoById(id) : undefined;
    const editando = Boolean(cargo);
    const [nome, setNome] = useState(cargo?.nome ?? "");
    const [descricao, setDescricao] = useState(cargo?.descricao ?? "");
    const [selecionadas, setSelecionadas] = useState<Set<string>>(() => new Set(cargo?.acoes ?? []));
    const [revisando, setRevisando] = useState(false);
    // Os erros dos campos aparecem ao tentar salvar, não antes (MEM-34).
    const [tentou, setTentou] = useState(false);
    const nomeId = useId();
    const descricaoId = useId();
    const membros = useMembros();
    const faltaNome = !nome.trim();
    const faltaDescricao = !descricao.trim();
    // Sair com algo preenchido pergunta antes de descartar (MEM-80).
    const [saindo, setSaindo] = useState(false);
    const [inicial] = useState(() => JSON.stringify({ n: cargo?.nome ?? "", d: cargo?.descricao ?? "", a: [...(cargo?.acoes ?? [])].sort() }));
    const alterado = JSON.stringify({ n: nome, d: descricao, a: [...selecionadas].sort() }) !== inicial;
    const sair = () => (alterado ? setSaindo(true) : navigate(ABA_CARGOS));
    // Recarregar ou fechar a aba com alteração: o aviso do navegador.
    useEffect(() => {
        if (!alterado) return;
        const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener("beforeunload", avisar);
        return () => window.removeEventListener("beforeunload", avisar);
    }, [alterado]);

    const setChaves = (chaves: string[], marcar: boolean) => {
        setSelecionadas((prev) => {
            const next = new Set(prev);
            chaves.forEach((k) => (marcar ? next.add(k) : next.delete(k)));
            return marcar ? completarSelecao(next) : semDependentesOrfaos(next);
        });
    };

    if (id && (!cargo || isCargoSistema(id))) {
        return <Navigate to={ABA_CARGOS} replace />;
    }

    const revisar = () => {
        setTentou(true);
        if (faltaNome || faltaDescricao) {
            // Foco no primeiro campo com erro, depois do clique (o botão retém o foco no press).
            const campo = faltaNome ? nomeId : descricaoId;
            requestAnimationFrame(() => document.getElementById(campo)?.focus());
            return;
        }
        setRevisando(true);
    };

    const salvar = () => {
        if (cargo) {
            updateCargo(cargo.id, {
                nome: nome.trim(),
                descricao: descricao.trim(),
                acoes: [...selecionadas],
            });
            toast.success(`Cargo "${nome.trim()}" atualizado`);
            navigate(ABA_CARGOS);
            return;
        }
        addCargo({
            id: `cargo-${Date.now()}`,
            nome: nome.trim(),
            descricao: descricao.trim(),
            acoes: [...selecionadas],
        });
        toast.success(`Cargo "${nome.trim()}" criado`);
        navigate(ABA_CARGOS);
    };

    return (
        <BackstageLayout showEventContext={false} activeProducer="equipe" showLayoutSwitcher={false}>
            <div className="flex min-w-0 flex-1 flex-col">
                <main className="flex flex-1 flex-col gap-6 pb-10">
                    <CabecalhoDaPagina voltar={{ rotulo: "Membros", onClick: sair }} titulo={editando ? "Editar cargo" : "Criar cargo"} />

                    <div className="flex w-full max-w-lg flex-col gap-5">
                        <Input
                            label="Nome do cargo"
                            placeholder="Ex.: Gerente de eventos"
                            value={nome}
                            onChange={setNome}
                            isRequired
                            id={nomeId}
                            isInvalid={tentou && faltaNome}
                            hint={tentou && faltaNome ? "Informe o nome do cargo." : undefined}
                        />
                        <TextArea
                            label="Descrição"
                            placeholder="Ex.: Cria e edita eventos, ingressos e cupons, sem acesso ao financeiro"
                            hint={tentou && faltaDescricao ? "Informe a descrição do cargo." : "Ajuda quem for convidar membros a escolher o cargo certo."}
                            rows={3}
                            value={descricao}
                            isRequired
                            isInvalid={tentou && faltaDescricao}
                            id={descricaoId}
                            onChange={setDescricao}
                        />
                    </div>

                    <div className="@container flex flex-col gap-6">
                        {CATALOGO_PERMISSOES.map((secao) => (
                            <SecaoTabela key={secao.id} secao={secao} selecionadas={selecionadas} onSet={setChaves} />
                        ))}
                    </div>
                </main>

                <footer data-barra-fixa className="sticky bottom-0 z-10 flex items-center bg-primary_alt justify-between gap-3 border-t border-secondary py-4">
                    <span className="text-sm text-tertiary">
                        {selecionadas.size} {selecionadas.size === 1 ? "permissão selecionada" : "permissões selecionadas"}
                    </span>
                    <div className="flex items-center gap-3">
                        <Button size="md" color="secondary" onClick={sair}>
                            Cancelar
                        </Button>
                        <Button size="md" color="primary" onClick={revisar}>
                            {editando ? "Salvar alterações" : "Criar cargo"}
                        </Button>
                    </div>
                </footer>
            </div>

            <ResumoCargoModal
                isOpen={revisando}
                nome={nome.trim()}
                selecionadas={selecionadas}
                originais={cargo ? new Set(cargo.acoes ?? []) : undefined}
                membrosAfetados={cargo ? membros.filter((m) => m.cargoIds.includes(cargo.id)).length : 0}
                onClose={() => setRevisando(false)}
                onConfirm={salvar}
            />
            <ModalDeConfirmacao
                aberto={saindo}
                titulo={editando ? "Descartar as alterações do cargo?" : "Descartar o cargo?"}
                descricao="O que você preencheu ainda não foi salvo."
                cancelar="Continuar editando"
                confirmar="Descartar"
                destrutiva
                onConfirmar={() => navigate(ABA_CARGOS)}
                onFechar={() => setSaindo(false)}
            />
        </BackstageLayout>
    );
}

interface SecaoTabelaProps {
    secao: SecaoPermissao;
    selecionadas: Set<string>;
    onSet: (chaves: string[], marcar: boolean) => void;
}

type Acao = { id: AcaoBase; nome: string };

function SecaoTabela({ secao, selecionadas, onSet }: SecaoTabelaProps) {
    const [preview, setPreview] = useState<Preview | null>(null);
    const previsualizar = (origem: string, chaves: string[] | null) => {
        if (!chaves?.length) return setPreview(null);
        // Inclui o que viria junto: pais completos e os Visualizar exigidos.
        setPreview({ origem, chaves: completarSelecao(new Set([...selecionadas, ...chaves])) });
    };
    const soltar = (origem: string) => setPreview((p) => (p?.origem === origem ? null : p));
    const naoMarcadas = (chaves: string[]) => chaves.filter((k) => !selecionadas.has(k));

    const todasChaves = useMemo(() => secao.recursos.flatMap((r) => chavesDoRecurso(r)), [secao]);

    const acoes = acoesDaSecao(secao);
    const colunas = acoes.filter((a) => secao.recursos.some((r) => r.base.includes(a.id)));
    const filhosDe = (i: number) => {
        if (secao.recursos[i].nivel) return [];
        const filhos: RecursoPermissao[] = [];
        for (const r of secao.recursos.slice(i + 1)) {
            if (!r.nivel) break;
            filhos.push(r);
        }
        return filhos;
    };
    const chavesDaColuna = (acao: AcaoBase) => secao.recursos.filter((r) => r.base.includes(acao)).map((r) => chavePermissao(r.id, acao));
    const tituloId = `secao-${secao.id}`;
    const massa = { selecionadas, preview, onSet, onPreview: previsualizar, onPreviewEnd: soltar, naoMarcadas };
    const celula = { selecionadas, onSet, preview, onPreview: previsualizar, onPreviewEnd: soltar };

    const checkboxDaSecao = (className?: string) => (
        <CheckboxMassa className={className} aria-label={`Todas as permissões de ${secao.nome}`} chaves={todasChaves} origem="secao" {...massa} />
    );

    return (
        <section aria-labelledby={tituloId} className="overflow-clip rounded-xl bg-primary ring-1 ring-secondary">
            {/* Largo: matriz com uma coluna por ação. */}
            <div className="hidden @min-[44rem]:block">
                <div className="sticky top-0 z-10 grid items-center border-b border-secondary bg-secondary" style={gridStyle(acoes.length)}>
                    <div className="flex items-start gap-3 px-5 py-4">
                        {checkboxDaSecao("mt-0.5")}
                        <div className="flex min-w-0 flex-col gap-0.5">
                            <h2 id={tituloId} className="text-lg font-semibold text-primary">
                                {secao.nome}
                            </h2>
                            {secao.descricao && <p className="text-sm text-tertiary">{secao.descricao}</p>}
                        </div>
                    </div>
                    {acoes.map((acao) => {
                        if (!colunas.includes(acao)) return <div key={acao.id} aria-hidden="true" />;
                        return (
                            <div key={acao.id} className="flex flex-col items-center gap-2 px-2 py-4 text-center">
                                <span className="text-sm font-semibold text-primary">{acao.nome}</span>
                                <CheckboxMassa
                                    aria-label={`${acao.nome} em todas as permissões de ${secao.nome}`}
                                    chaves={chavesDaColuna(acao.id)}
                                    origem={`coluna:${acao.id}`}
                                    {...massa}
                                />
                            </div>
                        );
                    })}
                </div>

                {secao.recursos.map((recurso, i) => (
                    <LinhaRecurso
                        key={recurso.id}
                        recurso={recurso}
                        filhos={filhosDe(i)}
                        acoes={acoes}
                        colunas={colunas}
                        ultima={i === secao.recursos.length - 1}
                        {...celula}
                    />
                ))}
            </div>

            {/* Estreito: um bloco por recurso, com as ações empilhadas como checkboxes com rótulo. */}
            <div className="@min-[44rem]:hidden">
                <div className="flex flex-col gap-3 border-b border-secondary bg-secondary px-4 py-4">
                    <div className="flex items-start gap-3">
                        {checkboxDaSecao("mt-0.5")}
                        <div className="flex min-w-0 flex-col gap-0.5">
                            <h2 className="text-lg font-semibold text-primary">{secao.nome}</h2>
                            {secao.descricao && <p className="text-sm text-tertiary">{secao.descricao}</p>}
                        </div>
                    </div>
                    {colunas.length > 1 && (
                        <div role="group" aria-label={`Em toda a seção ${secao.nome}`} className="flex flex-col gap-2">
                            <span className="text-xs font-medium text-tertiary">Em toda a seção</span>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                {colunas.map((acao) => (
                                    <CheckboxMassa
                                        key={acao.id}
                                        rotulo={acao.nome}
                                        aria-label={`${acao.nome} em todas as permissões de ${secao.nome}`}
                                        chaves={chavesDaColuna(acao.id)}
                                        origem={`coluna:${acao.id}`}
                                        {...massa}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {secao.recursos.map((recurso, i) => (
                    <BlocoRecurso key={recurso.id} recurso={recurso} filhos={filhosDe(i)} acoes={acoes} ultima={i === secao.recursos.length - 1} {...celula} />
                ))}
            </div>
        </section>
    );
}

interface CheckboxMassaProps {
    "aria-label": string;
    /** Rótulo visível (no estreito); sem ele, só o quadrado. */
    rotulo?: string;
    className?: string;
    chaves: string[];
    origem: string;
    selecionadas: Set<string>;
    preview: Preview | null;
    onSet: (chaves: string[], marcar: boolean) => void;
    onPreview: (origem: string, chaves: string[] | null) => void;
    onPreviewEnd: (origem: string) => void;
    naoMarcadas: (chaves: string[]) => string[];
}

/** Checkbox do cabeçalho: marca ou desmarca um conjunto (seção ou coluna); parcial quando só parte está marcada. */
function CheckboxMassa({ chaves, origem, selecionadas, preview, onSet, onPreview, onPreviewEnd, naoMarcadas, rotulo, className, ...props }: CheckboxMassaProps) {
    const marcadas = chaves.filter((k) => selecionadas.has(k)).length;
    const previstas = preview && preview.origem !== origem ? chaves.filter((k) => selecionadas.has(k) || preview.chaves.has(k)).length : marcadas;
    const emPreview = previstas > marcadas;
    const exibidas = emPreview ? previstas : marcadas;
    const total = chaves.length;
    return (
        <Checkbox
            size={rotulo ? "sm" : "md"}
            label={rotulo}
            aria-label={props["aria-label"]}
            // Área de clique maior que o quadrado, sem mudar o layout.
            className={cx(rotulo ? "cursor-pointer py-1.5" : "-m-1 cursor-pointer p-1", emPreview && "[&>div:first-of-type]:opacity-50", className)}
            isSelected={total > 0 && exibidas === total}
            isIndeterminate={exibidas > 0 && exibidas < total}
            onChange={() => onSet(chaves, marcadas < total)}
            onHoverStart={() => marcadas < total && onPreview(origem, naoMarcadas(chaves))}
            onHoverEnd={() => onPreviewEnd(origem)}
        />
    );
}

/** Chaves que o controle sob o mouse marcaria ao ser clicado. */
interface Preview {
    origem: string;
    chaves: Set<string>;
}

interface CelulaProps {
    selecionadas: Set<string>;
    onSet: (chaves: string[], marcar: boolean) => void;
    preview: Preview | null;
    onPreview: (origem: string, chaves: string[] | null) => void;
    onPreviewEnd: (origem: string) => void;
}

/**
 * Estado de uma ação de um recurso. O pai só agrega os filhos nas colunas que ele próprio tem;
 * sem isso, ganharia uma célula que apenas duplica a do sub-item.
 */
function estadoDaAcao(recurso: RecursoPermissao, filhos: RecursoPermissao[], acao: AcaoBase, selecionadas: Set<string>, preview: Preview | null) {
    const grupo = recurso.base.includes(acao) ? [recurso, ...filhos].filter((r) => r.base.includes(acao)).map((r) => chavePermissao(r.id, acao)) : [];
    const marcadas = grupo.filter((k) => selecionadas.has(k)).length;
    const origem = `celula:${recurso.id}:${acao}`;
    const previstas = preview && preview.origem !== origem ? grupo.filter((k) => selecionadas.has(k) || preview.chaves.has(k)).length : marcadas;
    const emPreview = previstas > marcadas;
    const exibidas = emPreview ? previstas : marcadas;
    return { grupo, marcadas, origem, emPreview, exibidas, disponivel: grupo.length > 0 };
}

/** Checkbox de uma ação de um recurso (célula da matriz ou item do bloco). */
function CheckboxDaAcao({
    recurso,
    filhos,
    acao,
    rotulo,
    className,
    selecionadas,
    onSet,
    preview,
    onPreview,
    onPreviewEnd,
}: CelulaProps & { recurso: RecursoPermissao; filhos: RecursoPermissao[]; acao: Acao; rotulo?: string; className?: string }) {
    const { grupo, marcadas, origem, emPreview, exibidas, disponivel } = estadoDaAcao(recurso, filhos, acao.id, selecionadas, preview);
    return (
        <Checkbox
            size={rotulo ? "sm" : "md"}
            label={rotulo}
            className={cx("cursor-pointer", emPreview && "[&>div:first-of-type]:opacity-50", className)}
            // Com rótulo visível, o nome acessível é o próprio rótulo (o grupo diz o recurso).
            aria-label={rotulo ? undefined : `${recurso.nome}: ${acao.nome}`}
            isDisabled={!disponivel}
            isSelected={disponivel && exibidas === grupo.length}
            isIndeterminate={exibidas > 0 && exibidas < grupo.length}
            onChange={(v) => onSet(grupo, v)}
            onHoverStart={() =>
                marcadas < grupo.length &&
                onPreview(
                    origem,
                    grupo.filter((k) => !selecionadas.has(k)),
                )
            }
            onHoverEnd={() => onPreviewEnd(origem)}
        />
    );
}

interface LinhaRecursoProps extends CelulaProps {
    recurso: RecursoPermissao;
    /** Sub-recursos: o checkbox do pai agrega a coluna deles. */
    filhos: RecursoPermissao[];
    /** Todas as trilhas da tabela; `colunas` são as que a seção usa. */
    acoes: Acao[];
    colunas: Acao[];
    ultima: boolean;
}

function LinhaRecurso({ recurso, filhos, acoes, colunas, ultima, ...celula }: LinhaRecursoProps) {
    return (
        <div
            className={cx("grid items-start transition duration-100 ease-linear hover:bg-primary_hover", !ultima && "border-b border-secondary")}
            style={gridStyle(acoes.length)}
        >
            <div className={cx("flex min-w-0 flex-col gap-3 py-3.5 pr-4", recurso.nivel ? "pl-10" : "pl-5")}>
                <span className={cx("text-sm", recurso.nivel ? "text-tertiary" : "font-medium text-secondary")}>{recurso.nome}</span>
            </div>
            {acoes.map((acao) => {
                if (!colunas.includes(acao)) return <div key={acao.id} aria-hidden="true" />;
                return (
                    <div key={acao.id} className="flex self-stretch">
                        <CheckboxDaAcao recurso={recurso} filhos={filhos} acao={acao} className="w-full justify-center py-4" {...celula} />
                    </div>
                );
            })}
        </div>
    );
}

interface BlocoRecursoProps extends CelulaProps {
    recurso: RecursoPermissao;
    filhos: RecursoPermissao[];
    acoes: Acao[];
    ultima: boolean;
}

/** Estreito: o nome em cima e só as ações que o recurso tem, com rótulo. */
function BlocoRecurso({ recurso, filhos, acoes, ultima, ...celula }: BlocoRecursoProps) {
    const disponiveis = acoes.filter((a) => recurso.base.includes(a.id));
    const borda = !ultima && "border-b border-secondary";
    const recuo = recurso.nivel ? "pl-9" : "pl-4";

    // Linha de ação com uma ação só (ex.: "Publicar eventos"): o checkbox leva o próprio nome.
    if (recurso.dono && disponiveis.length === 1) {
        return (
            <div className={cx("py-2 pr-4", recuo, borda)}>
                <CheckboxDaAcao recurso={recurso} filhos={filhos} acao={disponiveis[0]} rotulo={recurso.nome} className="py-1.5" {...celula} />
            </div>
        );
    }

    const nomeId = `recurso-${recurso.id.replace(/[^a-z0-9]/gi, "-")}`;
    return (
        <div role="group" aria-labelledby={nomeId} className={cx("flex flex-col gap-1.5 py-3 pr-4", recuo, borda)}>
            <span id={nomeId} className={cx("text-sm", recurso.nivel ? "text-tertiary" : "font-medium text-secondary")}>
                {recurso.nome}
            </span>
            <div className="grid grid-cols-2 gap-x-4">
                {disponiveis.map((acao) => (
                    <CheckboxDaAcao key={acao.id} recurso={recurso} filhos={filhos} acao={acao} rotulo={acao.nome} className="py-1.5" {...celula} />
                ))}
            </div>
        </div>
    );
}
