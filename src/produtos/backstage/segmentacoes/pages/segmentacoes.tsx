import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Plus, Trash01, Users01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import type { Segmentacao } from "@/plataforma";
import { BackstageLayout } from "../../components/Backstage";
import { CabecalhoDaPagina } from "../../components/cabecalho-da-pagina";
import { ModalDeConfirmacao } from "../../components/modal-de-confirmacao";
import { RodapeDePaginacao, usePaginacao } from "../../components/rodape-de-paginacao";
import { BarraDaLista, CabecalhoDaTabela, CarregandoTabela, CartaoDaTabela, Celula, LinhaDaTabela, SemResultados, TituloDaLinha, VazioDaTabela } from "../../components/tabela";
import { PainelDeSegmento } from "../components/painel-de-segmento";
import { resumoDosCriterios, ultimaAtualizacao, useSegmentacoes } from "../data/segmentacoes";

/*
 * Segmentações (segmentacoes/rules.md): o gêmeo de `audience/segments` de produção. Lista com busca,
 * o que define cada segmento, quantos documentos tem e "Excluir"; "Novo segmento" abre o painel.
 */

export const ROTA_SEGMENTACOES = "/backstage/publico/segmentacoes";

const T = {
    voltar: "Público",
    titulo: "Segmentações",
    novo: "Novo segmento",
    colNome: "Nome do segmento",
    colAtualizacao: "Última atualização",
    colDocumentos: "Documentos",
    buscar: "Buscar segmento",
    semResultados: "Nenhum segmento encontrado para essa busca.",
    excluir: "Excluir segmento",
    vazioTitulo: "Sem segmentos nesta organização",
    vazioTexto: "Crie segmentos para organizar sua base, agrupar clientes e oferecer vantagens especiais de forma personalizada.",
    excluirTitulo: "Excluir o segmento {nome}?",
    excluirTexto: "Os ingressos limitados a este segmento deixam de reconhecer quem estava nele. Esta ação não pode ser desfeita.",
    excluirConfirmar: "Excluir segmento",
    cancelar: "Cancelar",
    excluido: "Segmento excluído",
    excluidoDica: "{nome} foi excluído.",
    erroExcluir: "Tente de novo: não foi possível excluir o segmento.",
};

export function Segmentacoes() {
    const navigate = useNavigate();
    const { carregando, segmentacoes, gravar } = useSegmentacoes();
    const [painel, setPainel] = useState(false);
    const [excluindo, setExcluindo] = useState<Segmentacao | null>(null);
    const [gravando, setGravando] = useState(false);
    const [busca, setBusca] = useState("");
    const termo = busca.trim().toLowerCase();
    const filtradas = useMemo(() => (termo ? segmentacoes.filter((s) => s.nome.toLowerCase().includes(termo)) : segmentacoes), [segmentacoes, termo]);
    const paginacao = usePaginacao(filtradas, [termo]);

    const excluir = async () => {
        if (!excluindo) return;
        setGravando(true);
        try {
            await gravar(segmentacoes.filter((s) => s.id !== excluindo.id));
            toast.success(T.excluido, { description: T.excluidoDica.replace("{nome}", excluindo.nome) });
            setExcluindo(null);
        } catch {
            toast.error(T.erroExcluir);
        } finally {
            setGravando(false);
        }
    };

    return (
        <BackstageLayout activeProducer="publico" showEventContext={false} showLayoutSwitcher={false}>
            <div className="flex w-full min-w-0 flex-1 flex-col gap-6">
                <CabecalhoDaPagina
                    voltar={{ rotulo: T.voltar, href: "/backstage/publico" }}
                    titulo={T.titulo}
                    acoes={
                        segmentacoes.length > 0 && (
                            <Button color="primary" size="md" iconLeading={Plus} onClick={() => setPainel(true)}>
                                {T.novo}
                            </Button>
                        )
                    }
                />

                {carregando ? (
                    <CarregandoTabela rotulo="Carregando segmentos..." />
                ) : segmentacoes.length === 0 ? (
                    <VazioDaTabela
                        icone={Users01}
                        titulo={T.vazioTitulo}
                        texto={T.vazioTexto}
                        acao={
                            <Button color="primary" size="md" iconLeading={Plus} onClick={() => setPainel(true)}>
                                {T.novo}
                            </Button>
                        }
                    />
                ) : (
                    <div className="flex flex-col gap-4">
                        <BarraDaLista busca={{ valor: busca, onChange: setBusca, placeholder: T.buscar }} />
                        <CartaoDaTabela>
                            {filtradas.length === 0 ? (
                                <SemResultados texto={T.semResultados} onLimpar={() => setBusca("")} />
                            ) : (
                                <>
                                    <CabecalhoDaTabela>
                                        <span className="min-w-0 flex-1">{T.colNome}</span>
                                        <span className="w-28 text-right">{T.colDocumentos}</span>
                                        <span className="w-44">{T.colAtualizacao}</span>
                                        <span className="w-8" />
                                    </CabecalhoDaTabela>
                                    <ul className="flex flex-col divide-y divide-secondary">
                                        {paginacao.visiveis.map((s) => (
                                            // A linha inteira abre o segmento: o nome cobre a linha; a lixeira fica por cima.
                                            <LinhaDaTabela key={s.id} interativa className="relative outline-focus-ring -outline-offset-2 has-[.abrir-linha:focus-visible]:outline-2">
                                                <div className="flex min-w-0 flex-1 flex-col gap-1 @min-[44rem]:flex-row @min-[44rem]:items-center @min-[44rem]:gap-4">
                                                    <TituloDaLinha
                                                        titulo={
                                                            <button
                                                                type="button"
                                                                onClick={() => navigate(`${ROTA_SEGMENTACOES}/${s.id}`)}
                                                                className="abrir-linha block w-full cursor-pointer truncate text-left outline-hidden after:absolute after:inset-0"
                                                            >
                                                                {s.nome}
                                                            </button>
                                                        }
                                                        apoio={resumoDosCriterios(s)}
                                                    />
                                                    <Celula rotulo={T.colDocumentos} numero className="@min-[44rem]:w-28">
                                                        {s.documentos.length.toLocaleString("pt-BR")}
                                                    </Celula>
                                                    <Celula rotulo={T.colAtualizacao} className="text-tertiary @min-[44rem]:w-44">
                                                        {ultimaAtualizacao(s.atualizadoEm)}
                                                    </Celula>
                                                </div>
                                                <div className="relative z-10 shrink-0 @min-[44rem]:w-8">
                                                    <ButtonUtility icon={Trash01} color="tertiary" size="sm" tooltip={T.excluir} aria-label={`Excluir ${s.nome}`} onClick={() => setExcluindo(s)} />
                                                </div>
                                            </LinhaDaTabela>
                                        ))}
                                    </ul>
                                    <RodapeDePaginacao {...paginacao} />
                                </>
                            )}
                        </CartaoDaTabela>
                    </div>
                )}
            </div>

            {painel && <PainelDeSegmento segmentacoes={segmentacoes} gravar={gravar} onFechar={() => setPainel(false)} />}
            <ModalDeConfirmacao
                aberto={!!excluindo}
                titulo={T.excluirTitulo.replace("{nome}", excluindo?.nome ?? "")}
                descricao={T.excluirTexto}
                confirmar={T.excluirConfirmar}
                cancelar={T.cancelar}
                destrutiva
                icone={Trash01}
                carregando={gravando}
                onConfirmar={() => void excluir()}
                onFechar={() => setExcluindo(null)}
            />
        </BackstageLayout>
    );
}
