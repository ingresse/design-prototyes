import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { Edit01, Plus, SearchLg, Trash01, UserPlus01 } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { BackstageLayout } from "../../components/Backstage";
import { CabecalhoDaPagina } from "../../components/cabecalho-da-pagina";
import { ModalDeConfirmacao } from "../../components/modal-de-confirmacao";
import { RodapeDePaginacao, usePaginacao } from "../../components/rodape-de-paginacao";
import { BarraDaLista, CabecalhoDaTabela, CarregandoTabela, CartaoDaTabela, LinhaDaTabela, SemResultados, TituloDaLinha, VazioDaTabela } from "../../components/tabela";
import { PainelDeSegmento } from "../components/painel-de-segmento";
import { mascararCpf, resumoDaIdade, useSegmentacoes } from "../data/segmentacoes";
import { ROTA_SEGMENTACOES } from "./segmentacoes";

/*
 * Detalhe do segmento (SEG-40 a SEG-46, SEG-68, SEG-69): o nome, "Editar segmento" e os documentos da
 * lista manual, com busca, a paginação comum (BKS-114) e "Remover documento".
 */

const T = {
    voltar: "Segmentações",
    editar: "Editar segmento",
    naoEncontrado: "Segmento não encontrado",
    naoEncontradoVazio: "Este segmento não existe mais",
    naoEncontradoTexto: "Ele pode ter sido excluído ou o endereço está errado. Veja os segmentos da organização.",
    verSegmentos: "Ver segmentações",
    buscar: "Buscar por documento",
    buscarRotulo: "Buscar documento no segmento",
    colDocumento: "Documento",
    colTipo: "Tipo",
    semResultados: "Nenhum documento encontrado para essa busca.",
    remover: "Remover documento",
    vazioTitulo: "Nenhum documento neste segmento",
    vazioTexto: "Adicione CPFs ou passaportes pela lista manual. Só quem tem o documento no segmento compra os ingressos limitados a ele.",
    adicionar: "Adicionar documentos",
    removerTitulo: "Remover o documento {doc}?",
    removerTexto: "Quem tem este documento deixa de ter acesso aos ingressos limitados a este segmento.",
    removerConfirmar: "Remover documento",
    removido: "Documento removido",
    removidoDica: "{doc} saiu do segmento.",
    erroRemover: "Tente de novo: não foi possível remover o documento.",
    idade: "Idade",
    checkout: "Documento no checkout",
    cie: "CIE",
};

/** CPF com máscara; passaporte como está. */
const mostrarDocumento = (doc: string) => (/^\d{11}$/.test(doc) ? mascararCpf(doc) : doc);

export function Segmento() {
    const { id } = useParams<{ id: string }>();
    const { carregando, segmentacoes, gravar } = useSegmentacoes();
    const s = segmentacoes.find((x) => x.id === id);
    const [editando, setEditando] = useState(false);
    const [busca, setBusca] = useState("");
    const [removendo, setRemovendo] = useState<string | null>(null);
    const [gravando, setGravando] = useState(false);

    const termo = busca.replace(/[.\-\s]/g, "").toLowerCase();
    const docs = useMemo(() => (s?.documentos ?? []).filter((d) => !termo || d.documento.toLowerCase().includes(termo)), [s, termo]);
    const paginacao = usePaginacao(docs, [termo]);

    const remover = async () => {
        if (!s || !removendo) return;
        setGravando(true);
        try {
            await gravar(segmentacoes.map((x) => (x.id === s.id ? { ...x, documentos: x.documentos.filter((d) => d.documento !== removendo), atualizadoEm: new Date().toISOString() } : x)));
            toast.success(T.removido, { description: T.removidoDica.replace("{doc}", mostrarDocumento(removendo)) });
            setRemovendo(null);
        } catch {
            toast.error(T.erroRemover);
        } finally {
            setGravando(false);
        }
    };

    return (
        <BackstageLayout activeProducer="publico" showEventContext={false} showLayoutSwitcher={false}>
            <div className="flex w-full min-w-0 flex-1 flex-col gap-6">
                <CabecalhoDaPagina
                    voltar={{ rotulo: T.voltar, href: ROTA_SEGMENTACOES }}
                    titulo={s?.nome ?? (carregando ? "" : T.naoEncontrado)}
                    subtitulo={
                        s &&
                        (s.idadeMinima != null || s.idadeMaxima != null || s.documentoNoCheckout === "cie") && (
                            // Faixas do segmento logo abaixo do título (8 px, como antes).
                            <span className="mt-1 flex flex-wrap gap-2">
                                {(s.idadeMinima != null || s.idadeMaxima != null) && (
                                    <Badge type="pill-color" color="gray" size="sm">{`${T.idade}: ${resumoDaIdade(s.idadeMinima, s.idadeMaxima)}`}</Badge>
                                )}
                                {s.documentoNoCheckout === "cie" && <Badge type="pill-color" color="gray" size="sm">{`${T.checkout}: ${T.cie}`}</Badge>}
                            </span>
                        )
                    }
                    acoes={
                        // Sem documentos, "Editar segmento" fica só no vazio (BKS-117), como "Novo segmento" na lista (SEG-01).
                        s &&
                        s.documentos.length > 0 && (
                            <Button color="secondary" size="md" iconLeading={Edit01} onClick={() => setEditando(true)}>
                                {T.editar}
                            </Button>
                        )
                    }
                />

                {carregando ? (
                    <CarregandoTabela rotulo="Carregando segmento..." />
                ) : !s ? (
                    // Id desconhecido: diz o que houve e leva de volta à lista (SEG-69).
                    <VazioDaTabela
                        icone={SearchLg}
                        titulo={T.naoEncontradoVazio}
                        texto={T.naoEncontradoTexto}
                        acao={
                            <Button color="secondary" size="md" href={ROTA_SEGMENTACOES}>
                                {T.verSegmentos}
                            </Button>
                        }
                    />
                ) : (
                    s &&
                    (s.documentos.length === 0 ? (
                        <VazioDaTabela
                            icone={UserPlus01}
                            titulo={T.vazioTitulo}
                            texto={T.vazioTexto}
                            acao={
                                <Button color="primary" size="md" iconLeading={Plus} onClick={() => setEditando(true)}>
                                    {T.adicionar}
                                </Button>
                            }
                        />
                    ) : (
                        <div className="flex flex-col gap-4">
                            <BarraDaLista busca={{ valor: busca, onChange: setBusca, placeholder: T.buscar, rotulo: T.buscarRotulo }} />
                            <CartaoDaTabela>
                                <CabecalhoDaTabela>
                                    <span className="min-w-0 flex-1">{T.colDocumento}</span>
                                    <span className="w-24">{T.colTipo}</span>
                                    <span className="w-8" />
                                </CabecalhoDaTabela>
                                {docs.length === 0 ? (
                                    <SemResultados texto={T.semResultados} onLimpar={() => setBusca("")} />
                                ) : (
                                    <ul className="flex flex-col divide-y divide-secondary">
                                        {paginacao.visiveis.map((d) => (
                                            <LinhaDaTabela key={d.documento} className="items-center">
                                                <div className="flex min-w-0 flex-1 flex-col gap-1 @min-[44rem]:flex-row @min-[44rem]:items-center @min-[44rem]:gap-4">
                                                    <TituloDaLinha titulo={<span className="tabular-nums">{d.tipo === "cpf" ? mascararCpf(d.documento) : d.documento}</span>} />
                                                    <div className="@min-[44rem]:w-24">
                                                        <Badge type="modern" color="gray" size="sm">
                                                            {d.tipo === "cpf" ? "CPF" : "Passaporte"}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <ButtonUtility icon={Trash01} color="tertiary" size="sm" tooltip={T.remover} aria-label={`Remover ${mostrarDocumento(d.documento)}`} onClick={() => setRemovendo(d.documento)} />
                                            </LinhaDaTabela>
                                        ))}
                                    </ul>
                                )}
                                <RodapeDePaginacao {...paginacao} />
                            </CartaoDaTabela>
                        </div>
                    ))
                )}
            </div>

            {editando && s && <PainelDeSegmento segmento={s} segmentacoes={segmentacoes} gravar={gravar} onFechar={() => setEditando(false)} />}
            <ModalDeConfirmacao
                aberto={!!removendo}
                titulo={T.removerTitulo.replace("{doc}", removendo ? mostrarDocumento(removendo) : "")}
                descricao={T.removerTexto}
                confirmar={T.removerConfirmar}
                destrutiva
                icone={Trash01}
                carregando={gravando}
                onConfirmar={() => void remover()}
                onFechar={() => setRemovendo(null)}
            />
        </BackstageLayout>
    );
}
