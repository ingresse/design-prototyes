import { Button } from "@/components/base/buttons/button";
import { Cascata, Distribuicao, Secao, type Parte } from "../../components/financas/cascata";
import { eventosDoCenario, totalizar } from "../../components/financas/dados";
import { Aviso, AvisoDeBloqueio, Carregando, ErroAoCarregar, SemEventos, TelaFinal, type AcaoFinal } from "../../components/financas/estados";
import { reais } from "../../components/financas/formato";
import { detalhesDaDistribuicao, fraseDeCompensacao } from "../../components/financas/frases";
import { CabecalhoDaPagina, FinancasShell, useCenario, useParametro } from "../../components/financas/shell";
import { PainelDaParte } from "../components/painel-da-parte";
import { compor } from "../data/composicao";

/*
 * Jornada "Cascata que fecha" (direção B do briefing de 16/11/2026).
 * A conta do total da organização, lida da esquerda para a direita e sempre fechando, e a
 * distribuição de "Seu dinheiro". Cada parte abre o que a compõe, evento por evento.
 */

const PARTES: Parte[] = ["vendido", "taxas", "creditos", "ajustes", "seuDinheiro", "processamento", "retido", "aLiberar", "disponivel", "agendado", "recebido"];
const ACOES: AcaoFinal[] = ["repasse", "antecipar", "eventos"];

export function FinancasCascata() {
    const [cenario, setCenario] = useCenario();
    const [parteAberta, setParte] = useParametro("parte");
    const [acaoAberta, setAcao] = useParametro("acao");

    const eventos = eventosDoCenario(cenario);
    const totais = totalizar(eventos);
    const bloqueado = cenario === "bloqueado";
    const acao = ACOES.find((a) => a === acaoAberta);
    const parte = PARTES.find((p) => p === parteAberta);
    const abrirAcao = (a: AcaoFinal) => setParte(null, { acao: a });
    const compensa = fraseDeCompensacao(eventos);

    const conteudo = () => {
        if (acao) return <TelaFinal acao={acao} valor={acao === "repasse" ? totais.disponivel : acao === "antecipar" ? totais.aLiberar : undefined} aoVoltar={() => setAcao(null)} />;
        if (cenario === "carregando") return <Carregando />;
        if (cenario === "erro") return <ErroAoCarregar aoTentar={() => setCenario("normal")} />;
        if (cenario === "sem-eventos") return <SemEventos aoIrParaEventos={() => abrirAcao("eventos")} />;
        return (
            <>
                {bloqueado && <AvisoDeBloqueio />}
                {compensa && (
                    <Aviso tom="erro" titulo={`Seu Disponível agora está negativo em ${reais(-totais.disponivel)}`}>
                        <p>
                            Depois do último repasse do Arraial Estrelado São Paulo, saíram R$ 30.000 em ajustes (cancelamentos e custo de equipe extra). Como você já sacou o que estava disponível, a
                            diferença ficou em aberto.
                        </p>
                        <p>Você não precisa pagar nada. {compensa}</p>
                    </Aviso>
                )}
                <Secao titulo="A conta do seu dinheiro" descricao="Todos os eventos da Arena Produções. Toque em uma parte para ver o que a compõe.">
                    <Cascata totais={totais} escopo="em todos os eventos" aoAbrir={setParte} />
                    <Distribuicao
                        totais={totais}
                        detalhes={detalhesDaDistribuicao(eventos)}
                        aoAbrir={setParte}
                        aoSolicitar={() => abrirAcao("repasse")}
                        aoAntecipar={() => abrirAcao("antecipar")}
                        repasseBloqueado={bloqueado}
                    />
                </Secao>
            </>
        );
    };

    const temDados = !acao && (cenario === "normal" || cenario === "negativo" || bloqueado);

    return (
        <FinancasShell jornada="Jornada · Cascata que fecha">
            <CabecalhoDaPagina
                titulo="Finanças"
                acoes={
                    temDados && (
                        <Button size="md" color="primary" isDisabled={bloqueado || totais.disponivel <= 0} onClick={() => abrirAcao("repasse")}>
                            Solicitar repasse
                        </Button>
                    )
                }
            />
            {conteudo()}
            {temDados && (
                <PainelDaParte
                    composicao={parte ? compor(parte, eventos) : null}
                    aoFechar={() => setParte(null)}
                    aoSolicitar={() => abrirAcao("repasse")}
                    aoAntecipar={() => abrirAcao("antecipar")}
                    repasseBloqueado={bloqueado}
                />
            )}
        </FinancasShell>
    );
}
