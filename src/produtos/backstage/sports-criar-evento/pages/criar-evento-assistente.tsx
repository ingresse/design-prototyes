import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { AvisoDeCopia, CabecalhoDaPagina } from "../components/cabecalho";
import { ProvedorDoFormulario, useFormulario } from "../components/contexto";
import { ProgressoDosPassos, type Passo } from "../components/progresso-dos-passos";
import { Revisao, Sucesso } from "../components/revisao";
import { SecaoEvento } from "../components/secao-evento";
import { SecaoFormulario } from "../components/secao-formulario";
import { CategoriaDetalhe } from "../components/categoria-detalhe";
import { ShellAwa, type DestinoDoEvento } from "../components/shell-awa";
import { Tour, useTour } from "../components/tour";
import { SecaoModalidades } from "../components/secao-modalidades";
import { SecaoVendas } from "../components/secao-vendas";
import { horaAgora, irParaCampo } from "../data/campos";
import { IDS_DAS_SECOES, secoes } from "../data/opcoes";
import { useVocabulario, type Vocabulario } from "../data/vocabulario";
import { salvarAgora } from "../data/rascunho";
import type { SecaoId } from "../data/tipos";

/* ------------------------------------------------------------------ */
/*  Versão A: assistente (SCE-50 a SCE-56)                             */
/*  Evento › Modalidades e categorias › Inscrição › Kit e produtos ›   */
/*  Revisão. Valida o passo ao avançar; volta a passos visitados pela  */
/*  barra de passos. Salva sozinho a cada mudança.                     */
/* ------------------------------------------------------------------ */

type IdDoPasso = SecaoId | "revisao";
const passosDe = (t: Vocabulario): { id: IdDoPasso; titulo: string }[] => [...secoes(t), { id: "revisao", titulo: "Revisão" }];
const IDS_DOS_PASSOS: IdDoPasso[] = [...IDS_DAS_SECOES, "revisao"];

const topo = () => document.getElementById("topo-do-formulario")?.scrollIntoView({ behavior: "smooth", block: "start" });

export function CriarEventoAssistente() {
    const [passo, setPasso] = useState(0);
    const [visitados, setVisitados] = useState(1);

    const irPara = useCallback(
        (i: number) => {
            setPasso(i);
            setVisitados((v) => Math.max(v, i + 1));
        },
        [],
    );
    // Pendência clicada na revisão: abre o passo da seção antes de rolar até o campo.
    const antesDeIr = useCallback(
        (secao: SecaoId) => {
            const i = IDS_DOS_PASSOS.indexOf(secao);
            if (i === passo) return false;
            irPara(i);
            return true;
        },
        [passo, irPara],
    );

    const tour = useTour();

    // v0.46 (SCE-293): no 1º passo (Evento) ainda não há evento: fica só o menu da organização. Depois dele, o
    // evento existe e a lateral mostra o cartão e o menu do evento, que também leva aos passos.
    const DESTINOS: Record<DestinoDoEvento, IdDoPasso> = { informacoes: "evento", inscricoes: "modalidades", perguntas: "inscricao", aberturas: "vendas", revisao: "revisao" };
    const atualId = IDS_DOS_PASSOS[passo];
    const ativo = (Object.keys(DESTINOS) as DestinoDoEvento[]).find((d) => DESTINOS[d] === atualId) ?? null;
    const menuDoEvento = passo > 0 ? { ativo, onIr: (d: DestinoDoEvento) => irPara(IDS_DOS_PASSOS.indexOf(DESTINOS[d])) } : undefined;
    return (
        <ShellAwa evento={menuDoEvento}>
            <ProvedorDoFormulario antesDeIr={antesDeIr}>
                <Assistente passo={passo} visitados={visitados} irPara={irPara} onReverTour={tour.abrir} />
            </ProvedorDoFormulario>
            <Tour aberto={tour.aberto} onFechar={tour.fechar} />
        </ShellAwa>
    );
}

function Assistente({ passo, visitados, irPara, onReverTour }: { passo: number; visitados: number; irPara: (i: number) => void; onReverTour: () => void }) {
    const { rascunho, atualizar, pendencias, avisos, tentar, irParaPendencia, abrirCategoria, categoriaAberta, setEditandoNivel1 } = useFormulario();
    const { t } = useVocabulario();
    const PASSOS = passosDe(t);
    const atual = PASSOS[passo];

    if (rascunho.publicado) return <Sucesso />;
    // Categoria e lotes abrem em tela cheia, como o detalhe de ingresso do AWA (v0.3).
    if (categoriaAberta) return <CategoriaDetalhe />;

    const pendenciasDe = (id: IdDoPasso) => (id === "revisao" ? [] : pendencias.filter((p) => p.secao === id));
    // Visitado com pendência: aviso; visitado sem pendência: concluído; o resto ainda não começou.
    const passos: Passo[] = PASSOS.map((p, i) => {
        const visitado = i < visitados;
        // v0.7/v0.8: lotes a revisar (avisos com `ajuste`) também deixam o passo com sinal de atenção.
        const n = pendenciasDe(p.id).length + avisos.filter((a) => a.ajuste && a.secao === p.id).length;
        return {
            id: p.id,
            titulo: p.titulo,
            navegavel: visitado,
            status: i === passo ? "atual" : !visitado ? "futuro" : n > 0 ? "pendencia" : "concluido",
        };
    });

    const mudarDePasso = (i: number) => {
        abrirCategoria(null);
        setEditandoNivel1(null);
        irPara(i);
        requestAnimationFrame(topo);
    };

    const avancar = () => {
        if (atual.id === "revisao") return;
        const p = pendenciasDe(atual.id);
        if (p.length > 0) {
            tentar([atual.id]);
            // v0.15 (SCE-213): na etapa Modalidades, os erros podem estar em cartões fechados ou no detalhe da
            // categoria; a lista no topo da etapa diz onde está cada um e leva até lá.
            if (atual.id === "modalidades") {
                toast.error(p.length === 1 ? "1 item impede de continuar. Veja a lista no topo da etapa." : `${p.length} itens impedem de continuar. Veja a lista no topo da etapa.`);
                setTimeout(() => {
                    const lista = document.getElementById("resumo-de-erros");
                    lista?.scrollIntoView({ behavior: "smooth", block: "start" });
                    lista?.focus({ preventScroll: true });
                }, 60);
                return;
            }
            toast.error(p.length === 1 ? "Corrija o campo destacado para continuar" : `Corrija os ${p.length} campos destacados para continuar`);
            // Campo de categoria: abre o painel dela; os outros, rola até o primeiro.
            if (p[0].categoria) irParaPendencia(p[0]);
            else requestAnimationFrame(() => irParaCampo(p[0].campo));
            return;
        }
        mudarDePasso(passo + 1);
    };

    const publicar = () => {
        tentar(IDS_DAS_SECOES);
        if (pendencias.length > 0) {
            toast.error(pendencias.length === 1 ? "Falta 1 item para abrir as inscrições" : `Faltam ${pendencias.length} itens para abrir as inscrições`);
            // Leva até a lista do que falta.
            const lista = document.getElementById("lista-pendencias");
            lista?.scrollIntoView({ behavior: "smooth", block: "start" });
            lista?.querySelector<HTMLElement>("[data-pendencia]")?.focus({ preventScroll: true });
            return;
        }
        salvarAgora();
        atualizar((r) => ({ ...r, publicado: true }));
        requestAnimationFrame(topo);
    };

    return (
        <div id="topo-do-formulario" className="flex w-full min-w-0 flex-1 scroll-mt-6 flex-col gap-8">
            <CabecalhoDaPagina titulo={rascunho.nome.trim() || "Criar evento"} onReverTour={onReverTour}>
                <ProgressoDosPassos passos={passos} onIr={mudarDePasso} />
            </CabecalhoDaPagina>

            {/* v0.4 (SCE-158): todas as etapas usam a largura toda da área de conteúdo, como Modalidades e a tela de Ingressos do AWA. */}
            <div className="flex w-full flex-col gap-6">
                {/* v0.15 (SCE-214): o aviso da cópia fica no Evento e, em Modalidades, só durante a cópia guiada. */}
                {(passo === 0 || (atual.id === "modalidades" && rascunho.fluxoDeCopia?.tipo === "evento")) && <AvisoDeCopia />}
                {atual.id === "evento" && <SecaoEvento />}
                {atual.id === "modalidades" && <SecaoModalidades />}
                {atual.id === "inscricao" && <SecaoFormulario />}
                {atual.id === "vendas" && <SecaoVendas />}
                {atual.id === "revisao" && <Revisao onEditar={(s) => mudarDePasso(PASSOS.findIndex((p) => p.id === s))} />}
            </div>

            {/* Barra fixa no rodapé, com o fundo da página (UI-VIS-013). */}
            <footer className="sticky bottom-0 z-20 mt-auto border-t border-secondary bg-primary_alt">
                <div className="flex flex-wrap items-center justify-end gap-3 py-3">
                    {passo > 0 && (
                        <Button color="secondary" size="md" iconLeading={ArrowLeft} onClick={() => mudarDePasso(passo - 1)} className="mr-auto">
                            Voltar
                        </Button>
                    )}
                    {atual.id === "revisao" ? (
                        <>
                            <Button
                                color="secondary"
                                size="md"
                                onClick={() => {
                                    salvarAgora();
                                    toast.success(`Rascunho salvo às ${horaAgora()}. Você pode continuar depois.`);
                                }}
                            >
                                Salvar rascunho
                            </Button>
                            <Button color="primary" size="md" onClick={publicar}>
                                Publicar
                            </Button>
                        </>
                    ) : atual.id === "modalidades" && rascunho.fluxoDeCopia ? null : (
                        /* Na cópia guiada, as ações ficam na própria etapa (SCE-180). */
                        <Button color="primary" size="md" onClick={avancar}>
                            Salvar e continuar
                        </Button>
                    )}
                </div>
            </footer>
        </div>
    );
}
