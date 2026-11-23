import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Button } from "@/components/base/buttons/button";
import type { Evento, ProdutoDaOrganizacao } from "@/plataforma";
import { combosDoEvento, ConferenciaDeVinculos, produtosDoEvento, SeletorDeVinculos, useResumoDosVinculos, useVinculos } from "../../components/arvore-de-vinculos";
import { BackstageLayout } from "../../components/Backstage";
import { CabecalhoDaPagina } from "../../components/cabecalho-da-pagina";
import { PainelLateral, useProtecaoDoPreenchido } from "../../components/painel-lateral";
import { salvarPasskeys } from "../../components/passkeys-do-evento";
import { CarregandoTabela } from "../../components/tabela";
import { useCatalogo } from "../../itens/data/catalogo";
import { useTextosItens } from "../../itens/data/textos-itens";
import { apagarRascunho, ROTA_CRIAR_PASSKEY, ROTA_LISTA_DE_PASSKEYS, ROTA_PASSKEY } from "../data/rascunho";

/*
 * Vincular itens (CHA-20 a CHA-23, CHA-41, CHA-42): os ingressos na árvore comum com escala
 * (`SeletorDeVinculos`), combos e produtos em abas. À direita (no celular, "Ver selecionados"),
 * a conferência do escolhido, com os lotes de cada ingresso. Navega sem atraso.
 */

const T = {
    titulo: "Passkey",
    instrucao: "Marque os itens que serão liberados ao usar a Passkey",
    adicionar: "Adicionar vínculos",
    adicionarDica: "Esta ação só adiciona vínculos. Itens já vinculados continuam como estão.",
    cancelar: "Cancelar",
    salvar: "Salvar",
    arvore: "Ingressos para vincular",
    semItens: "Este evento ainda não tem ingressos, combos nem produtos para vincular.",
    escolhidos: "Itens escolhidos",
    verSelecionados: "Ver selecionados",
    pronto: "Pronto",
    descartarTitulo: "Descartar a seleção?",
    descartarTexto: "Os itens marcados ainda não foram vinculados.",
    criadas: { one: "Passkey criada.", other: "{n} Passkeys criadas." },
    vinculados: "Vínculos adicionados.",
    erro: "Não foi possível salvar os vínculos. Tente de novo.",
};

/** Largura do desktop (lg): a conferência fica ao lado; abaixo, num painel. */
function useLargo() {
    const consulta = "(min-width: 1024px)";
    const [largo, setLargo] = useState(() => typeof window !== "undefined" && window.matchMedia(consulta).matches);
    useEffect(() => {
        const m = window.matchMedia(consulta);
        const mudar = () => setLargo(m.matches);
        m.addEventListener("change", mudar);
        return () => m.removeEventListener("change", mudar);
    }, []);
    return largo;
}

export function VincularItens() {
    const location = useLocation();
    // Modo "adicionar vínculos" (vindo da lista) muda o título e o destino do voltar.
    const estado = location.state as { adicionar?: boolean; codigos?: string[]; limite?: number | null } | null;
    const { carregando, evento, biblioteca } = useCatalogo();
    const codigos = estado?.codigos ?? [];

    // Sem Passkey para vincular (URL aberta direto): volta para o começo.
    if (codigos.length === 0) return <Navigate to={ROTA_PASSKEY} replace />;

    return (
        <BackstageLayout activeSection="itens" activeItem="chave-de-acesso">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
                {carregando || !evento ? (
                    <>
                        <CabecalhoDaPagina titulo={T.titulo} />
                        <CarregandoTabela />
                    </>
                ) : (
                    <Vincular key={evento.id} evento={evento} biblioteca={biblioteca} codigos={codigos} limite={estado?.limite} adicionar={!!estado?.adicionar} />
                )}
            </div>
        </BackstageLayout>
    );
}

function Vincular({ evento, biblioteca, codigos, limite, adicionar }: { evento: Evento; biblioteca: ProdutoDaOrganizacao[]; codigos: string[]; limite?: number | null; adicionar: boolean }) {
    const navigate = useNavigate();
    const { preco, plural } = useTextosItens();
    const largo = useLargo();
    const resumir = useResumoDosVinculos();
    const vinculos = useVinculos(evento);
    const [salvando, setSalvando] = useState(false);
    const [conferindo, setConferindo] = useState(false);
    const combos = useMemo(() => combosDoEvento(evento, preco), [evento, preco]);
    const produtos = useMemo(() => produtosDoEvento(evento, biblioteca, preco, false), [evento, biblioteca, preco]);

    // O voltar devolve as chaves: a criação lê o rascunho da sessão (CHA-40). Da lista, volta para a lista.
    const voltarPara = adicionar ? ROTA_LISTA_DE_PASSKEYS : ROTA_CRIAR_PASSKEY;
    const protecao = useProtecaoDoPreenchido({ alterado: vinculos.alterado, onFechar: () => navigate(voltarPara), titulo: T.descartarTitulo, descricao: T.descartarTexto });

    const salvar = async () => {
        if (vinculos.vazio || salvando) return;
        setSalvando(true);
        const r = vinculos.resultado();
        try {
            await salvarPasskeys(evento.id, codigos, { lotes: r.lotes, combos: r.combos, produtos: r.produtos }, limite);
            if (!adicionar) apagarRascunho(evento.id);
            toast.success(adicionar ? T.vinculados : plural(T.criadas, codigos.length));
            navigate(ROTA_LISTA_DE_PASSKEYS, { state: adicionar ? undefined : { recem: codigos } });
        } catch {
            toast.error(T.erro);
            setSalvando(false);
        }
    };

    const conferencia = <ConferenciaDeVinculos vinculos={vinculos} combos={combos} produtos={produtos} />;

    return (
        <>
            {/* Os dois destinos do voltar (lista ou criação) são telas "Passkey". */}
            <CabecalhoDaPagina
                voltar={{ rotulo: T.titulo, onClick: protecao.pedirParaFechar }}
                titulo={T.titulo}
                acoes={
                    <>
                        <Button size="md" color="secondary" onClick={protecao.pedirParaFechar}>
                            {T.cancelar}
                        </Button>
                        <Button size="md" color="primary" isDisabled={vinculos.vazio} isLoading={salvando} showTextWhileLoading onClick={() => void salvar()}>
                            {T.salvar}
                        </Button>
                    </>
                }
            />

            <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-primary">{adicionar ? T.adicionar : T.instrucao}</h2>
                {adicionar && <p className="text-sm text-tertiary">{T.adicionarDica}</p>}
            </div>

            <div className="flex gap-6 pb-20 lg:pb-0">
                <div className="flex min-w-0 flex-1 flex-col">
                    <SeletorDeVinculos vinculos={vinculos} rotulo={T.arvore} combos={combos} produtos={produtos} vazio={<p className="py-6 text-sm text-tertiary">{T.semItens}</p>} />
                </div>
                {largo && (
                    <aside aria-label={T.escolhidos} className="w-80 shrink-0">
                        <div className="sticky top-2 flex max-h-[calc(100dvh-6rem)] flex-col gap-3 overflow-y-auto rounded-xl p-4 ring-1 ring-secondary">
                            <h3 className="text-sm font-semibold text-primary">{T.escolhidos}</h3>
                            {conferencia}
                        </div>
                    </aside>
                )}
            </div>

            {/* Celular e tablet: a contagem fica presa embaixo, com "Ver selecionados" (UI-MOB-003). */}
            {!largo && (
                <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-secondary bg-primary px-4 py-3 shadow-lg">
                    <span role="status" className="min-w-0 text-sm font-medium text-secondary">
                        {resumir(vinculos)}
                    </span>
                    <Button size="sm" color="secondary" onClick={() => setConferindo(true)} isDisabled={vinculos.vazio}>
                        {T.verSelecionados}
                    </Button>
                </div>
            )}
            {conferindo && !largo && (
                <PainelLateral titulo={T.escolhidos} aoFechar={() => setConferindo(false)}>
                    <SlideoutMenu.Content className="pb-6">{conferencia}</SlideoutMenu.Content>
                    <SlideoutMenu.Footer className="mt-auto flex justify-end">
                        <Button size="md" color="primary" onClick={() => setConferindo(false)}>
                            {T.pronto}
                        </Button>
                    </SlideoutMenu.Footer>
                </PainelLateral>
            )}
            {protecao.confirmacao}
        </>
    );
}
