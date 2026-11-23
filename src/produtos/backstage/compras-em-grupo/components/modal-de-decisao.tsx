import { useState } from "react";
import { toast } from "sonner";
import { ThumbsDown, ThumbsUp, XClose } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { TextArea } from "@/components/base/textarea/textarea";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import type { ComprasEmGrupo, Evento, SolicitacaoDeGrupo } from "@/plataforma";
import { CampoNumero } from "../../components/campo-numero";
import { prazoDaCota, salvarCompras, TIPOS_DE_GRUPO } from "../data/compras-em-grupo";

/*
 * Aprovar ou reprovar uma solicitação (CEG-40 a CEG-46), com os textos de produção. Aprovar define a
 * cota (pode ser maior que o pedido, nunca menor que o já usado); reduzir uma cota aprovada pede o
 * motivo. Reprovar pede o motivo e fica bloqueado quando o grupo já tem pedidos.
 */

const T = {
    aprovarTitulo: "Confirma a aprovação deste grupo?",
    reprovarTitulo: "Confirma a reprovação deste grupo?",
    solicitadoPor: "Solicitado por",
    email: "E-mail",
    nomeDoGrupo: "Nome do grupo",
    quantidade: "Quantidade solicitada",
    descricao: "Descrição",
    tipo: "Tipo de grupo",
    cnpj: "CNPJ",
    confirmeQuantidade: "Confirme ou altere a quantidade de inscrições",
    dicaQuantidade: "Informe a quantidade de vagas que deseja aprovar.",
    dicaUsadas: "O grupo já utilizou {n} vagas. Informe {n} ou mais.",
    erroQuantidade: "Informe a quantidade de vagas aprovadas.",
    erroMenor: "A quantidade aprovada não pode ser menor que as {n} vagas já utilizadas pelo grupo.",
    motivoReducao: "Por que a quantidade aprovada está sendo reduzida?",
    motivoReducaoPlaceholder: "Informe aqui o motivo da redução",
    motivoReducaoDica: "O gestor do grupo perde vagas com que contava, por isso o motivo é obrigatório.",
    erroMotivoReducao: "Informe o motivo da redução da quantidade aprovada.",
    motivo: "Por que esta solicitação está sendo reprovada?",
    motivoPlaceholder: "Informe aqui o motivo da reprovação",
    motivoDica: "O gestor vê este motivo. Se mudar de ideia, use “Aprovar” na linha da solicitação.",
    erroMotivo: "Informe o motivo da reprovação.",
    bloqueada: "Não é possível reprovar esta solicitação: o grupo já tem pedidos emitidos. Para impedir novas emissões, aprove {n} vagas, as que o grupo já usou.",
    cancelar: "Cancelar",
    aprovar: "Aprovar solicitação",
    reprovar: "Reprovar solicitação",
    aprovada: "Solicitação de {g} aprovada.",
    reprovada: "Solicitação de {g} reprovada.",
    atualizada: "Quantidade de vagas de {g} atualizada.",
    erroAprovar: "Não foi possível aprovar a solicitação.",
    erroReprovar: "Não foi possível reprovar a solicitação.",
};

const f = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

export function ModalDeDecisao({
    evento,
    modulo,
    decisao,
    onFechar,
}: {
    evento: Evento;
    modulo: ComprasEmGrupo;
    decisao: { tipo: "aprovar" | "reprovar"; solicitacao: SolicitacaoDeGrupo } | null;
    onFechar: () => void;
}) {
    const s = decisao?.solicitacao;
    const usadas = s ? s.pagas + s.iniciadas : 0;
    const [qtd, setQtd] = useState<number | undefined>(s?.aprovadas ?? s?.solicitadas);
    const [motivo, setMotivo] = useState("");
    const [tentou, setTentou] = useState(false);
    const [gravando, setGravando] = useState(false);
    if (!decisao || !s) return null;
    const aprovar = decisao.tipo === "aprovar";
    const reduzindo = s.status === "aprovada" && qtd != null && s.aprovadas != null && qtd < s.aprovadas;
    const bloqueada = !aprovar && usadas > 0;
    const erroQtd = qtd == null ? T.erroQuantidade : qtd < usadas ? f(T.erroMenor, { n: usadas }) : undefined;
    const erroMotivo = !motivo.trim() ? (aprovar ? T.erroMotivoReducao : T.erroMotivo) : undefined;

    const confirmar = async () => {
        setTentou(true);
        if (aprovar ? erroQtd || (reduzindo && erroMotivo) : erroMotivo || bloqueada) return;
        setGravando(true);
        const agora = new Date();
        const editada: SolicitacaoDeGrupo = aprovar
            ? { ...s, status: "aprovada", aprovadas: qtd, motivo: reduzindo ? motivo.trim() : undefined, decididaEm: s.status === "aprovada" && s.decididaEm ? s.decididaEm : agora.toISOString().slice(0, 16), validaAte: s.status === "aprovada" && s.validaAte ? s.validaAte : prazoDaCota(modulo, agora) }
            : { ...s, status: "reprovada", motivo: motivo.trim(), decididaEm: agora.toISOString().slice(0, 16) };
        try {
            await salvarCompras(evento, { ...modulo, solicitacoes: modulo.solicitacoes.map((x) => (x.id === s.id ? editada : x)) });
            toast.success(f(aprovar ? (s.status === "aprovada" ? T.atualizada : T.aprovada) : T.reprovada, { g: s.grupo }));
            onFechar();
        } catch {
            toast.error(aprovar ? T.erroAprovar : T.erroReprovar);
        } finally {
            setGravando(false);
        }
    };

    const detalhes: [string, string | undefined][] = [
        [T.solicitadoPor, s.responsavel],
        [T.email, s.email],
        [T.nomeDoGrupo, s.grupo],
        [T.quantidade, s.solicitadas.toLocaleString("pt-BR")],
        [T.descricao, s.descricao],
        [T.tipo, TIPOS_DE_GRUPO[s.tipoDeGrupo]],
        [T.cnpj, s.cnpj],
    ];

    return (
        <ModalOverlay isOpen onOpenChange={(o) => !o && !gravando && onFechar()} isDismissable={!gravando}>
            <Modal>
                <Dialog aria-label={aprovar ? T.aprovarTitulo : T.reprovarTitulo}>
                    <div className="relative w-full max-w-lg rounded-2xl bg-primary p-6 shadow-xl ring-1 ring-secondary">
                        <ButtonUtility size="sm" color="tertiary" icon={XClose} tooltip="Fechar" onClick={onFechar} className="absolute top-4 right-4" />
                        <div className="flex flex-col gap-4 pr-8">
                            <FeaturedIcon icon={aprovar ? ThumbsUp : ThumbsDown} color={aprovar ? "success" : "error"} theme="light" size="lg" />
                            <h2 className="text-lg font-semibold text-primary">{aprovar ? T.aprovarTitulo : T.reprovarTitulo}</h2>
                        </div>
                        <dl className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-secondary_subtle p-4 text-sm ring-1 ring-secondary sm:grid-cols-2">
                            {detalhes
                                .filter(([, v]) => v)
                                .map(([k, v]) => (
                                    <div key={k} className="flex min-w-0 flex-col">
                                        <dt className="text-tertiary">{k}</dt>
                                        <dd className="break-words text-primary">{v}</dd>
                                    </div>
                                ))}
                        </dl>
                        <div className="mt-5 flex flex-col gap-4">
                            {aprovar ? (
                                <>
                                    <CampoNumero label={T.confirmeQuantidade} isRequired valor={qtd} vazio onChange={setQtd} isInvalid={tentou && !!erroQtd} hint={tentou && erroQtd ? erroQtd : usadas > 0 ? f(T.dicaUsadas, { n: usadas }) : T.dicaQuantidade} />
                                    {reduzindo && <TextArea label={T.motivoReducao} isRequired rows={3} placeholder={T.motivoReducaoPlaceholder} value={motivo} onChange={setMotivo} isInvalid={tentou && !!erroMotivo} hint={tentou && erroMotivo ? erroMotivo : T.motivoReducaoDica} />}
                                </>
                            ) : bloqueada ? (
                                <p className="rounded-lg bg-warning-primary p-3 text-sm text-warning-primary">{f(T.bloqueada, { n: usadas })}</p>
                            ) : (
                                <TextArea label={T.motivo} isRequired rows={3} placeholder={T.motivoPlaceholder} value={motivo} onChange={setMotivo} isInvalid={tentou && !!erroMotivo} hint={tentou && erroMotivo ? erroMotivo : T.motivoDica} />
                            )}
                        </div>
                        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <Button size="lg" color="secondary" onClick={onFechar} isDisabled={gravando}>
                                {T.cancelar}
                            </Button>
                            <Button size="lg" color={aprovar ? "primary" : "primary-destructive"} isDisabled={bloqueada} isLoading={gravando} showTextWhileLoading onClick={() => void confirmar()}>
                                {aprovar ? T.aprovar : T.reprovar}
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
