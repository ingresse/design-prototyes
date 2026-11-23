import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ChevronRight } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Toggle } from "@/components/base/toggle/toggle";
import { lerDoc, salvar } from "@/plataforma";
import { useTheme } from "@/providers/theme-provider";
import { BackstageLayout } from "../../components/Backstage";
import { CabecalhoDaPagina } from "../../components/cabecalho-da-pagina";
import { useOrganizacaoAtual } from "../data/organizacao-atual";

/*
 * Ajustes da organização (ORG-43 a ORG-47). Os mesmos do Backstage em produção (regras de compra e
 * personalização), mais o tema da interface. Cada seção é um cartão; dentro, uma linha por ajuste.
 */

type Tema = "light" | "dark" | "system";

const Secao = ({ titulo, children }: { titulo: string; children: ReactNode }) => (
    <section className="flex flex-col gap-5 rounded-2xl bg-primary p-5 ring-1 ring-secondary md:p-6">
        <h2 className="text-lg font-semibold text-primary">{titulo}</h2>
        <div className="flex flex-col divide-y divide-secondary">{children}</div>
    </section>
);

/** Título e descrição à esquerda, controle à direita; empilha no celular. */
const Linha = ({ titulo, descricao, children }: { titulo: string; descricao: string; children: ReactNode }) => (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between md:gap-8">
        <div className="flex min-w-0 flex-col gap-0.5 md:max-w-xl">
            <span className="text-sm font-semibold text-primary">{titulo}</span>
            <span className="text-sm text-tertiary">{descricao}</span>
        </div>
        <div className="shrink-0">{children}</div>
    </div>
);

export function Ajustes() {
    const organizacao = useOrganizacaoAtual();
    const { theme, setTheme } = useTheme();
    const atribuicao = !!organizacao?.atribuicaoADocumentos;
    const [salvando, setSalvando] = useState(false);

    // Grava, avisa com Desfazer e, se falhar, diz o que fazer; o toggle volta sozinho porque lê do banco (ORG-46).
    const mudarAtribuicao = async (ligar: boolean, desfazendo = false) => {
        if (!organizacao || salvando) return;
        setSalvando(true);
        try {
            // Organização que só existe pelos eventos (banco antigo) ganha o documento na primeira gravação.
            const { eventos: _eventos, ativos: _ativos, ...base } = organizacao;
            const doc = lerDoc("organizacoes", organizacao.id) ?? base;
            await salvar("organizacoes", { ...doc, atribuicaoADocumentos: ligar });
            toast.success(
                ligar ? "Atribuição de ingressos a documentos ligada." : "Atribuição de ingressos a documentos desligada.",
                desfazendo ? undefined : { action: { label: "Desfazer", onClick: () => void mudarAtribuicao(!ligar, true) } },
            );
        } catch {
            toast.error("Tente de novo: a atribuição de ingressos a documentos não foi salva.");
        } finally {
            setSalvando(false);
        }
    };

    return (
        <BackstageLayout activeProducer="ajustes" showEventContext={false} showLayoutSwitcher={false}>
            {/* Até 768 px de largura: numa tela larga, o controle ficava longe demais do rótulo (ORG-47). */}
            <div className="flex w-full max-w-3xl min-w-0 flex-1 flex-col gap-6">
                <CabecalhoDaPagina titulo="Ajustes" />

                <Secao titulo="Regras de compra">
                    <Linha titulo="Termos de uso" descricao="Crie termos de uso para seus eventos, esclareça as regras e garanta o consentimento dos compradores.">
                        {/* Abre a página dos termos (TDU), como o cartão com seta de produção. */}
                        <Button color="secondary" size="sm" iconTrailing={ChevronRight} href="/backstage/ajustes/termos-de-uso">
                            Gerenciar
                        </Button>
                    </Linha>
                    <Linha
                        titulo="Atribuição de ingressos a documentos"
                        descricao="Quando ativada, permite que os ingressos dos seus eventos sejam atribuídos diretamente a um CPF ou passaporte, sem necessidade de conta ou cadastro de convidado."
                    >
                        <Toggle aria-label="Atribuição de ingressos a documentos" isSelected={atribuicao} isDisabled={!organizacao || salvando} onChange={(on) => void mudarAtribuicao(on)} />
                    </Linha>
                </Secao>

                <Secao titulo="Personalização">
                    <Linha titulo="Mapas interativos" descricao="Crie mapas interativos para seus eventos e gerencie a disponibilidade dos assentos.">
                        <Button color="secondary" size="sm" iconTrailing={ChevronRight} href="/backstage/ajustes/mapas">
                            Gerenciar
                        </Button>
                    </Linha>
                    {/* Tema da interface: vale para esta pessoa neste navegador, não para a organização (ORG-45). */}
                    <Linha titulo="Tema da interface" descricao="Claro, escuro ou o mesmo do seu sistema. Vale só para você, neste navegador.">
                        <ButtonGroup
                            size="sm"
                            aria-label="Tema da interface"
                            selectedKeys={new Set([theme])}
                            onSelectionChange={(keys) => {
                                const v = [...keys][0];
                                if (v) setTheme(v as Tema);
                            }}
                            disallowEmptySelection
                        >
                            <ButtonGroupItem id="light">Claro</ButtonGroupItem>
                            <ButtonGroupItem id="dark">Escuro</ButtonGroupItem>
                            <ButtonGroupItem id="system">Sistema</ButtonGroupItem>
                        </ButtonGroup>
                    </Linha>
                </Secao>
            </div>
        </BackstageLayout>
    );
}
