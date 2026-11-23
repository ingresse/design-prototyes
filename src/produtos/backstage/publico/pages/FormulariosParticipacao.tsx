import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { Calendar, Plus } from "@untitledui/icons";
import { BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { BackstageLayout } from "../../components/Backstage";
import { CabecalhoDaPagina } from "../../components/cabecalho-da-pagina";
import { SelecionarEventoModal } from "../components/SelecionarEventoModal";
import { FormularioParticipacaoModal, type LimiteSolicitacoes } from "../components/FormularioParticipacaoModal";
import { salvarFormulario, useFormulariosDaOrganizacao, type FormularioParticipacao } from "../data/formularios";
import { CabecalhoDaTabela, CarregandoTabela, CartaoDaTabela, Celula, LinhaDaTabela, TituloDaLinha, VazioDaTabela } from "../../components/tabela";

type StatusFormulario = "inativo" | "disponivel" | "pausado";

const STATUS_META: Record<StatusFormulario, { label: string; color: "gray" | "success" | "warning" }> = {
    inativo: { label: "Inativo", color: "gray" },
    disponivel: { label: "Disponível", color: "success" },
    pausado: { label: "Pausado", color: "warning" },
};

const statusDoFormulario = (f: FormularioParticipacao): StatusFormulario => {
    if (!f.ativo) return "inativo";
    if (f.limite === "limitado" && f.quantidadeLimite !== undefined && f.solicitacoesRecebidas >= f.quantidadeLimite) {
        return "pausado";
    }
    return "disponivel";
};

const n = (v: number) => v.toLocaleString("pt-BR");
/** "12 de 500" com limite; "12" sem limite (PUB-14). */
const pedidosRecebidos = (f: FormularioParticipacao) => (f.limite === "limitado" && f.quantidadeLimite !== undefined ? `${n(f.solicitacoesRecebidas)} de ${n(f.quantidadeLimite)}` : n(f.solicitacoesRecebidas));

export const ROTA_PEDIDOS = "/backstage/publico/solicitacoes";

/** Backstage → Público → Formulário de participação: lista de formulários por evento. */
export function FormulariosParticipacao() {
    const navigate = useNavigate();
    // Um formulário por evento da organização, gravado no evento (PUB-94).
    const { carregando, formularios, eventosSemFormulario } = useFormulariosDaOrganizacao();
    const [isSelecionarEventoOpen, setIsSelecionarEventoOpen] = useState(false);
    // Evento escolhido para o formulário novo: fica guardado ao voltar da configuração para a escolha (PUB-106).
    const [eventoEscolhido, setEventoEscolhido] = useState<string | null>(null);
    const [configurando, setConfigurando] = useState(false);

    const abrirNovo = () => {
        setEventoEscolhido(null);
        setIsSelecionarEventoOpen(true);
    };

    const handleContinuarSelecaoEvento = (eventoId: string) => {
        setEventoEscolhido(eventoId);
        setIsSelecionarEventoOpen(false);
        setConfigurando(true);
    };

    // Depois de criar, o toast leva aos pedidos do formulário e diz se ele aceita pedidos (PUB-105).
    const handleSalvarNovoFormulario = ({ ativo, limite, quantidade }: { ativo: boolean; limite: LimiteSolicitacoes; quantidade?: number }) => {
        const eventoId = eventoEscolhido;
        if (!eventoId) return;
        void salvarFormulario(eventoId, { ativo, limite, quantidadeLimite: quantidade });
        toast.success("Formulário criado", {
            description: ativo ? "Ele já aceita pedidos. Os pedidos aparecem na tela do formulário." : "O recebimento está desligado. Ligue em Configurar formulário quando quiser aceitar pedidos.",
            duration: 6000,
            action: { label: "Abrir formulário", onClick: () => navigate(ROTA_PEDIDOS, { state: { formularioId: eventoId } }) },
        });
        setEventoEscolhido(null);
    };

    const eventoDoNovo = eventosSemFormulario.find((e) => e.id === eventoEscolhido);

    return (
        <BackstageLayout showEventContext={false} showLayoutSwitcher={false} activeProducer="publico">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
                <CabecalhoDaPagina
                    voltar={{ rotulo: "Público", onClick: () => navigate("/backstage/publico") }}
                    titulo="Formulário de participação"
                    acoes={
                        formularios.length > 0 && (
                            <Button size="md" color="primary" iconLeading={Plus} onClick={abrirNovo}>
                                Novo formulário
                            </Button>
                        )
                    }
                />

                {carregando && <CarregandoTabela />}

                {/* Nenhum evento da organização tem formulário ainda (PUB-95). */}
                {!carregando && formularios.length === 0 && (
                    <VazioDaTabela
                        icone={Calendar}
                        titulo="Comece a receber pedidos de participação"
                        texto="Escolha um evento para criar o formulário. Quem precisa de um acesso especial, como pessoas com deficiência, pede pelo formulário e você aprova cada pedido por aqui."
                        acao={
                            <Button size="md" color="primary" iconLeading={Plus} onClick={abrirNovo}>
                                Novo formulário
                            </Button>
                        }
                    />
                )}

                {!carregando && formularios.length > 0 && (
                    // Lista no cartão comum (BKS-110, PUB-104): abaixo de 704 px de cartão, cada formulário vira um bloco.
                    <CartaoDaTabela>
                        <CabecalhoDaTabela>
                            <span className="min-w-0 flex-1">Evento</span>
                            <span className="w-32">Situação</span>
                            <span className="w-36 text-right">Pedidos recebidos</span>
                        </CabecalhoDaTabela>
                        <ul className="flex flex-col divide-y divide-secondary">
                            {formularios.map((f) => {
                                const status = STATUS_META[statusDoFormulario(f)];
                                return (
                                    <LinhaDaTabela key={f.id} interativa className="relative outline-focus-ring -outline-offset-2 has-[a:focus-visible]:outline-2">
                                        <div className="flex min-w-0 flex-1 flex-col gap-2 @min-[44rem]:flex-row @min-[44rem]:items-center @min-[44rem]:gap-4">
                                            <div className="flex min-w-0 flex-1 items-center gap-3">
                                                {f.imagem ? (
                                                    <img src={f.imagem} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
                                                ) : (
                                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                                                        <Calendar className="size-5 text-fg-quaternary" aria-hidden="true" />
                                                    </span>
                                                )}
                                                {/* O nome é o link e cobre a linha (BKS-113). */}
                                                <TituloDaLinha
                                                    titulo={
                                                        <Link to={ROTA_PEDIDOS} state={{ formularioId: f.id }} className="outline-hidden after:absolute after:inset-0">
                                                            {f.titulo}
                                                        </Link>
                                                    }
                                                    apoio={f.data}
                                                />
                                            </div>
                                            <Celula rotulo="Situação" className="@min-[44rem]:w-32">
                                                <BadgeWithDot size="sm" type="pill-color" color={status.color} className="inline-flex align-middle">
                                                    {status.label}
                                                </BadgeWithDot>
                                            </Celula>
                                            <Celula rotulo="Pedidos recebidos" numero className="@min-[44rem]:w-36">
                                                {pedidosRecebidos(f)}
                                            </Celula>
                                        </div>
                                    </LinhaDaTabela>
                                );
                            })}
                        </ul>
                    </CartaoDaTabela>
                )}
            </div>

            <SelecionarEventoModal
                isOpen={isSelecionarEventoOpen}
                onClose={() => {
                    setIsSelecionarEventoOpen(false);
                    setEventoEscolhido(null);
                }}
                onContinuar={handleContinuarSelecaoEvento}
                eventos={eventosSemFormulario}
                eventoInicial={eventoEscolhido}
            />

            <FormularioParticipacaoModal
                isOpen={configurando}
                onClose={() => {
                    setConfigurando(false);
                    setEventoEscolhido(null);
                }}
                onVoltar={() => {
                    setConfigurando(false);
                    setIsSelecionarEventoOpen(true);
                }}
                onSalvar={handleSalvarNovoFormulario}
                evento={eventoDoNovo ? [eventoDoNovo.titulo, eventoDoNovo.data].filter(Boolean).join(", ") : undefined}
                ativoInicial={true}
                limiteInicial="ilimitado"
                // Formulário novo nasce sem pedidos (PUB-26).
                solicitacoesRecebidas={0}
            />
        </BackstageLayout>
    );
}
