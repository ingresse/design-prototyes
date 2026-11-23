import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { BackstageLayout } from "../../components/Backstage";
import { CabecalhoDaPagina } from "../../components/cabecalho-da-pagina";
import { CarregandoTabela } from "../../components/tabela";
import { AvisoDeEscala } from "../../itens/components/escala";
import { CAMINHO_CRIAR_INGRESSOS, FormularioCanal } from "../components/formulario-canal";
import { TemaCotas } from "../components/ui-cotas";
import { BASE, CANAIS_GRUPO, codigosEmUso, DICA_CANAL, ROTULO_CANAL, useEquipeDoEvento, type CanalGrupo } from "../data/equipe";

/**
 * Configurar um canal do grupo (ECO-14): página, não modal. O Comissário tem quatro seções e os
 * outros canais abrem o seletor de ingressos por cima; numa página, nada fica empilhado (UI-NAV-001, UI-NAV-002).
 */
export function CanalDoGrupo() {
    const { grupoId = "", canal = "" } = useParams();
    const navigate = useNavigate();
    const { carregando, evento, grupos } = useEquipeDoEvento();
    const dados = grupos.find((x) => x.grupo.id === grupoId);
    const valido = (CANAIS_GRUPO as string[]).includes(canal);
    const doGrupo = `${BASE}/${grupoId}`;
    // Volta ao grupo na Configuração, de onde a pessoa veio (ECO-11).
    const voltar = () => navigate(`${doGrupo}?aba=configuracao`);

    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, [grupoId, canal]);

    // Carregando e "não encontrado" também abrem com o cabeçalho de página (BKS-100).
    if (carregando)
        return (
            <BackstageLayout activeSection="equipe-e-comissarios" activeItem="equipe-e-comissarios">
                <TemaCotas className="gap-6">
                    <CabecalhoDaPagina voltar={{ rotulo: "Grupo", onClick: voltar }} titulo={valido ? ROTULO_CANAL[canal as CanalGrupo] : "Canal"} />
                    <CarregandoTabela linhas={4} rotulo="Carregando canal" />
                </TemaCotas>
            </BackstageLayout>
        );

    if (!dados || !valido)
        return (
            <BackstageLayout activeSection="equipe-e-comissarios" activeItem="equipe-e-comissarios">
                <TemaCotas className="gap-6">
                    <CabecalhoDaPagina
                        voltar={dados ? { rotulo: dados.grupo.nome, onClick: voltar } : { rotulo: "Equipe e comissários", onClick: () => navigate(BASE) }}
                        titulo="Canal não encontrado"
                        subtitulo={`O grupo não é de ${evento.nome} ou o endereço está incompleto.`}
                    />
                </TemaCotas>
            </BackstageLayout>
        );

    const c = canal as CanalGrupo;
    const { grupo, comissario, vendas } = dados;
    return (
        <BackstageLayout activeSection="equipe-e-comissarios" activeItem="equipe-e-comissarios" recolherGuia>
            <TemaCotas className="flex-1 gap-8">
                <FormularioCanal
                    key={`${grupo.id}:${c}`}
                    grupo={grupo}
                    canal={c}
                    comissario={comissario}
                    codigosDoEvento={[...codigosEmUso(grupos.map((x) => x.grupo), evento.id, { grupoId: grupo.id })]}
                    temVendas={vendas.length > 0}
                    onSair={voltar}
                    onCriarItens={() => navigate(CAMINHO_CRIAR_INGRESSOS)}
                    cabecalho={(sair) => (
                        <>
                            <CabecalhoDaPagina voltar={{ rotulo: grupo.nome, onClick: sair }} titulo={ROTULO_CANAL[c]} subtitulo={DICA_CANAL[c]} />
                            <AvisoDeEscala />
                        </>
                    )}
                />
            </TemaCotas>
        </BackstageLayout>
    );
}
