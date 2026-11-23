import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { HelpCircle, Map01, SearchLg } from "@untitledui/icons";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Button } from "@/components/base/buttons/button";
import { BackstageLayout } from "../../components/Backstage";
import { CabecalhoDaPagina } from "../../components/cabecalho-da-pagina";
import { VazioDaTabela } from "../../components/tabela";
import { useMapas } from "../data/mapas";
import { ROTA_MAPAS } from "./mapas-interativos";

/*
 * Editor do mapa (MAP-20 a MAP-23, MAP-34). Em produção o desenho é feito no ChartDesigner do PickSeats,
 * embutido na página; aqui fica o lugar dele, com o "Como funciona?" de produção.
 */

const T = {
    voltar: "Mapas interativos",
    criacao: "Criação de mapa",
    edicao: "Edição de mapa",
    comoFunciona: "Como funciona?",
    naoAchouTitulo: "Mapa não encontrado",
    naoAchouVazio: "Nenhum mapa neste endereço",
    naoAchouTexto: "Confira o endereço ou volte para a lista e escolha um mapa desta organização.",
    verMapas: "Ver mapas interativos",
    externoTitulo: "O editor de mapas roda fora do Backstage",
    externoTexto: "Em produção, o desenho é feito no editor do PickSeats, embutido nesta página. Ele não faz parte do protótipo.",
    publicar: "Simular publicação",
    publicarDica: "Ferramenta do protótipo: marca o mapa como publicado, com assentos.",
    publicado: "Mapa publicado.",
    guiaTitulo: "Como criar um mapa",
    visaoGeral: "Visão geral",
    visaoGeralTexto: "A ferramenta de mapas interativos permite criar mapas personalizados e gerenciar a capacidade em tempo real. A seguir, os conceitos e passos essenciais mais comuns para auxiliar na criação do mapa.",
    conceitos: "Conceitos rápidos",
    lista: [
        ["Imagem de referência (opcional)", "Se você tiver uma imagem de referência do espaço, pode adicioná-la pelo menu da direita e desenhar por cima para facilitar a definição do layout."],
        ["Espaços de venda de ingressos", "Use as ferramentas de Área ou Seção, no menu da esquerda, para desenhar os espaços. Área define a capacidade total, enquanto Seção permite adicionar cadeiras ou mesas específicas. Para isso, desenhe a seção e dê dois cliques sobre ela."],
        ["Categorias", "Defina as categorias no menu da direita. Elas representam os setores do evento e são usadas na criação dos ingressos para indicar onde cada ingresso estará disponível. Uma categoria pode ser usada em mais de um espaço de venda."],
    ],
};

export function EditorDeMapa() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { todos, gravar, carregando } = useMapas();
    const mapa = todos.find((m) => m.id === id);
    const naoAchou = !carregando && !mapa;
    const [guia, setGuia] = useState(false);

    const publicar = async () => {
        if (!mapa) return;
        await gravar(todos.map((m) => (m.id === mapa.id ? { ...m, status: "publicado", assentos: m.assentos || 1200, atualizadoEm: new Date().toISOString().slice(0, 16) } : m)));
        toast.success(T.publicado);
    };

    return (
        <BackstageLayout activeProducer="ajustes" showEventContext={false} showLayoutSwitcher={false}>
            <div className="flex w-full min-w-0 flex-1 flex-col gap-6">
                <CabecalhoDaPagina
                    voltar={{ rotulo: T.voltar, href: ROTA_MAPAS }}
                    titulo={naoAchou ? T.naoAchouTitulo : mapa?.status === "rascunho" || !mapa ? T.criacao : T.edicao}
                    subtitulo={mapa?.nome}
                    acoes={
                        !naoAchou && (
                            <Button color="secondary" size="md" iconLeading={HelpCircle} onClick={() => setGuia(true)}>
                                {T.comoFunciona}
                            </Button>
                        )
                    }
                />

                {naoAchou ? (
                    // Mapa inexistente: vazio do DS com a saída para a lista (MAP-34).
                    <VazioDaTabela
                        icone={SearchLg}
                        titulo={T.naoAchouVazio}
                        texto={T.naoAchouTexto}
                        acao={
                            <Button color="primary" size="md" onClick={() => navigate(ROTA_MAPAS)}>
                                {T.verMapas}
                            </Button>
                        }
                    />
                ) : (
                    <section className="flex min-h-[28rem] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-secondary bg-secondary_subtle p-8 text-center">
                        <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-fg-quaternary ring-1 ring-secondary">
                            <Map01 className="size-6" aria-hidden="true" />
                        </span>
                        <div className="flex max-w-md flex-col gap-1">
                            <h2 className="text-md font-semibold text-primary">{T.externoTitulo}</h2>
                            <p className="text-sm text-tertiary">{T.externoTexto}</p>
                        </div>
                        {mapa?.status !== "publicado" && (
                            <div className="flex flex-col items-center gap-1 pt-2">
                                <Button color="link-gray" size="sm" onClick={() => void publicar()}>
                                    {T.publicar}
                                </Button>
                                <span className="text-xs text-quaternary">{T.publicarDica}</span>
                            </div>
                        )}
                    </section>
                )}
            </div>

            <SlideoutMenu isOpen={guia} isDismissable onOpenChange={setGuia} className="z-50 pl-0 md:*:max-w-[746px]" dialogClassName="gap-0">
                <SlideoutMenu.Header onClose={() => setGuia(false)} className="pb-4">
                    <h2 className="pr-8 text-lg font-semibold text-primary">{T.guiaTitulo}</h2>
                </SlideoutMenu.Header>
                <SlideoutMenu.Content className="gap-8 pb-8">
                    <section className="flex flex-col gap-2">
                        <h3 className="text-md font-semibold text-primary">{T.visaoGeral}</h3>
                        <p className="text-sm text-tertiary">{T.visaoGeralTexto}</p>
                    </section>
                    <section className="flex flex-col gap-4">
                        <h3 className="text-md font-semibold text-primary">{T.conceitos}</h3>
                        {T.lista.map(([t, d]) => (
                            <div key={t} className="flex flex-col gap-1 rounded-xl bg-secondary_subtle p-4 ring-1 ring-secondary">
                                <span className="text-sm font-semibold text-primary">{t}</span>
                                <span className="text-sm text-tertiary">{d}</span>
                            </div>
                        ))}
                    </section>
                </SlideoutMenu.Content>
            </SlideoutMenu>
        </BackstageLayout>
    );
}
