import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { useNavegarNoPainel } from "../../components/painel";
import { BackstageLayout } from "../../components/Backstage";
import { PainelDePassos } from "../../components/painel-de-passos";
import { EmailListManager, type EmailListValidity } from "../components/EmailListManager";
import { useAvisoAoSair, useRascunhoDaEmissao } from "../data/rascunho-da-emissao";
import { ETAPAS_DA_EMISSAO, TITULO_DA_EMISSAO } from "./SelecaoItens";

/** Emissão, passo 2: Destinatários (COR-30 a COR-36), no fluxo em etapas do Backstage (COR-50). */
export function EmissaoCortesias() {
    const navigate = useNavegarNoPainel();
    // Itens e e-mails vêm do rascunho da sessão (COR-53), não da navegação: recarregar não perde.
    const { rascunho, mudar, temAlgo } = useRascunhoDaEmissao();
    useAvisoAoSair(temAlgo);

    // Sem item escolhido (abriu direto pela URL), volta ao passo 1.
    useEffect(() => {
        if (rascunho.itemIds.length === 0) navigate("/backstage/itens", { replace: true });
    }, [rascunho.itemIds.length, navigate]);

    const [validity, setValidity] = useState<EmailListValidity>({
        canAdvance: rascunho.emails.length > 0,
        validEmails: rascunho.emails,
        counts: { all: rascunho.emails.length, valid: rascunho.emails.length, invalid: 0 },
    });

    const guardarEmails = useCallback((emails: string[]) => mudar({ emails }), [mudar]);

    const handleAdvance = useCallback(() => {
        if (!validity.canAdvance) return;
        // A verificação trabalha com os válidos; o rascunho guarda os mesmos.
        mudar({ emails: validity.validEmails });
        navigate("/backstage/verificacao");
    }, [navigate, validity, mudar]);

    return (
        <BackstageLayout activeSection="cortesias" activeItem="emissao-cortesias">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
                <PainelDePassos
                    titulo={TITULO_DA_EMISSAO}
                    passos={ETAPAS_DA_EMISSAO}
                    atual={1}
                    resumoNoCelular={
                        <p className="text-sm font-semibold text-primary" aria-live="polite">
                            {validity.counts.all === 1 ? "1 e-mail" : `${validity.counts.all} e-mails`}
                            {validity.counts.invalid > 0 && <span className="font-normal text-error-primary">{`, ${validity.counts.invalid} com erro`}</span>}
                        </p>
                    }
                    rodapeFim={
                        <>
                            <Button size="md" color="secondary" iconLeading={ChevronLeft} onClick={() => navigate("/backstage/itens")}>
                                Voltar
                            </Button>
                            <Button size="md" color="primary" iconTrailing={ChevronRight} isDisabled={!validity.canAdvance} onClick={handleAdvance}>
                                Avançar
                            </Button>
                        </>
                    }
                >
                    <section className="flex w-full max-w-[800px] flex-col">
                        <EmailListManager valorInicial={rascunho.emails} onValidityChange={setValidity} onEmailsChange={guardarEmails} />
                    </section>
                </PainelDePassos>
            </div>
        </BackstageLayout>
    );
}
