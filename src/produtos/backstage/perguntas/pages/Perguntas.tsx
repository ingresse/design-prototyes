import { Plus } from "@untitledui/icons";
import { useNavigate } from "react-router";
import { Button } from "@/components/base/buttons/button";
import { BackstageLayout } from "../../components/Backstage";
import { CabecalhoDaPagina } from "../../components/cabecalho-da-pagina";
import { PerguntasEmptyState } from "../components/PerguntasEmptyState";
import { PerguntasList } from "../components/PerguntasList";
import { usePerguntas } from "../data/perguntas-store";

export function Perguntas() {
    const navigate = useNavigate();
    const { perguntas, togglePergunta, removePergunta } = usePerguntas();

    const isEmpty = perguntas.length === 0;

    return (
        <BackstageLayout activeProducer="perguntas" showEventContext={false}>
            <div className="flex min-w-0 flex-1 flex-col gap-6">
                <CabecalhoDaPagina
                    voltar={{ rotulo: "Eventos", onClick: () => navigate(-1) }}
                    titulo="Perguntas"
                    acoes={
                        !isEmpty && (
                            <Button size="md" color="primary" iconLeading={Plus} onClick={() => navigate("/backstage/perguntas/nova")}>
                                Nova pergunta
                            </Button>
                        )
                    }
                />

                {isEmpty ? (
                    <PerguntasEmptyState onCreate={() => navigate("/backstage/perguntas/nova")} />
                ) : (
                    <main className="flex flex-1 flex-col gap-6">
                        <PerguntasList
                            perguntas={perguntas}
                            onToggle={togglePergunta}
                            onEdit={(id) => navigate(`/backstage/perguntas/${id}/editar`)}
                            onDelete={removePergunta}
                        />
                    </main>
                )}
            </div>
        </BackstageLayout>
    );
}
