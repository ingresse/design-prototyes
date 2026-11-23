import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { LogIn04 } from "@untitledui/icons";
import { ComboBox } from "@/components/base/select/combobox";
import { Select } from "@/components/base/select/select";
import type { Evento, Grupo } from "@/plataforma";
import { comSetor, salvarSessoes, setorNovo } from "../data/catalogo";
import { formatar, useTextosItens } from "../data/textos-itens";
import { IngressoAberto } from "./campo-de-ingresso";

/*
 * Formulário do grupo na própria lista, dentro do ingresso aberto, sem modal (ITM-131, ITM-132).
 *
 * Criar: nome, como as pessoas entram (QR Code ou reconhecimento facial), acesso na portaria
 * (opcional) e capacidade;
 * Enter cria, o grupo entra na lista e a linha fica pronta para o próximo, com o foco no nome.
 * Editar: o mesmo formulário, preenchido, no lugar do cartão do grupo; "Salvar" grava e fecha, e
 * "Excluir grupo" pede a exclusão a quem abriu (ITM-168). Nos dois, "Cancelar" ou Esc pedem para fechar: quem
 * abriu decide se pergunta antes de descartar o que foi digitado (ITM-133).
 */

const T = {
    nome: "Nome do grupo",
    nomePlaceholder: "Ex.: Pista",
    acesso: "Acesso na portaria",
    acessoPlaceholder: "Ex.: Portão A",
    capacidade: "Capacidade",
    capacidadePlaceholder: "Ex.: 1200",
    criar: "Criar",
    salvar: "Salvar",
    cancelar: "Cancelar",
    excluir: "Excluir grupo",
    desfazer: "Desfazer",
    erroNome: "Dê um nome ao grupo.",
    erroRepetido: "Escolha outro nome: já existe um grupo {nome} nesta sessão.",
    erroCapacidade: "Informe a capacidade do grupo.",
    tipoAcesso: "Como as pessoas entram",
    tipoAcessoPlaceholder: "Escolha",
    tipoAcessoErro: "Escolha como as pessoas entram.",
    tipoAcessoOpcoes: { qr: "Código QR", facial: "Reconhecimento facial" },
    criado: "Grupo {grupo} criado.",
    rotulo: "Criar grupo de ingressos",
    rotuloNaSessao: "Criar grupo de ingressos em {sessao}",
    rotuloEdicao: "Editar grupo {grupo}",
    filtrosLimpos: "Os filtros foram limpos para o grupo novo aparecer na lista.",
};

/** Por que o formulário fechou: quem abriu decide para onde o foco volta (ITM-133). */
export type MotivoDoFechamento = "cancelado" | "salvo" | "removido";

export function FormularioDoGrupo({
    evento,
    sessaoId,
    grupo,
    nomeDaSessao,
    filtrosLimpos,
    onPedirFechar,
    onFechar,
    onAlterado,
    onCriado,
    onExcluir,
}: {
    evento: Evento;
    sessaoId: string;
    /** Com o grupo, edita; sem, cria. */
    grupo?: Grupo;
    /** Com várias sessões, entra no nome acessível do formulário de criação. */
    nomeDaSessao?: string;
    /** Abrir a criação limpou filtros ativos: o formulário avisa no rodapé. */
    filtrosLimpos?: boolean;
    /** Cancelar ou Esc: pede para fechar; quem abriu confirma o descarte se houver alteração. */
    onPedirFechar: () => void;
    /** Fechou de vez, depois de salvar ou remover. */
    onFechar: (motivo: MotivoDoFechamento) => void;
    /** Há algo digitado e não salvo. */
    onAlterado?: (alterado: boolean) => void;
    onCriado?: (grupo: Grupo) => void;
    /** Editando: "Excluir grupo" no rodapé. Quem abriu confirma, exclui ou explica que há vendas (ITM-168). */
    onExcluir?: () => void;
}) {
    const { t } = useTextosItens();
    const editando = !!grupo;
    const [nome, setNome] = useState(grupo?.nome ?? "");
    const [acesso, setAcesso] = useState(grupo?.acesso ?? "");
    const [capacidade, setCapacidade] = useState(grupo?.capacidade != null ? String(grupo.capacidade) : "");
    // Em todo evento o grupo escolhe como as pessoas entram (ITM-89); o novo começa em código QR, o
    // mais comum. Ao criar vários, a última escolha fica para o próximo grupo.
    const [tipoAcesso, setTipoAcesso] = useState<Grupo["tipoAcesso"]>(grupo?.tipoAcesso ?? "qr");
    const [tentou, setTentou] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [anuncio, setAnuncio] = useState("");
    const campoNome = useRef<HTMLDivElement>(null);
    const focarNome = () => campoNome.current?.querySelector("input")?.focus();

    // Abre com o foco no nome e o formulário à vista (o botão do título pode estar longe dele).
    useEffect(() => {
        campoNome.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        focarNome();
    }, []);

    // Alterado = diferente do que abriu (o grupo, na edição; vazio e código QR, na criação).
    const alterado =
        nome.trim() !== (grupo?.nome ?? "") ||
        acesso.trim() !== (grupo?.acesso ?? "") ||
        capacidade !== (grupo?.capacidade != null ? String(grupo.capacidade) : "") ||
        (editando && tipoAcesso !== grupo?.tipoAcesso);
    useEffect(() => {
        onAlterado?.(alterado);
    }, [alterado]);
    useEffect(
        () => () => {
            onAlterado?.(false);
        },
        [],
    );

    const sessao = evento.sessoes.find((s) => s.id === sessaoId);
    // Entradas do local cadastradas na criação ou na edição do evento (EVT-166), como opções do acesso (ITM-162).
    const entradas = (evento.entradas ?? []).map((e) => ({ id: e.id, label: e.nome }));
    const repetido = !!sessao?.grupos.some((g) => g.id !== grupo?.id && g.nome.trim().toLowerCase() === nome.trim().toLowerCase());
    const erroNome = !nome.trim() ? T.erroNome : repetido ? formatar(T.erroRepetido, { nome: nome.trim() }) : undefined;
    const capacidadeNum = Math.round(Number(capacidade));
    const erroCapacidade = !capacidade.trim() || !(capacidadeNum > 0) ? T.erroCapacidade : undefined;
    const erroTipo = !tipoAcesso ? T.tipoAcessoErro : undefined;

    const enviar = async (e?: FormEvent) => {
        e?.preventDefault();
        if (salvando) return;
        setTentou(true);
        if (erroNome || erroCapacidade || erroTipo) {
            // O foco vai para o primeiro campo com erro.
            const primeiro = erroNome ? "nome" : erroCapacidade ? "capacidade" : "tipo";
            (campoNome.current?.closest("form")?.querySelector(`[data-campo="${primeiro}"] input, [data-campo="${primeiro}"] button`) as HTMLElement | null)?.focus();
            return;
        }
        setSalvando(true);
        const dados = { nome: nome.trim(), tipoAcesso, acesso: acesso.trim() || undefined, capacidade: capacidadeNum };
        const prox: Grupo = grupo ? { ...grupo, ...dados } : { ...setorNovo(nome), ...dados };
        // Marca o grupo como novo antes de gravar: a lista monta o cartão assim que o banco muda, e ele
        // precisa já nascer sabendo que é novo para entrar com animação e a tela rolar até ele.
        if (!editando) onCriado?.(prox);
        try {
            await salvarSessoes(evento, comSetor(evento, sessaoId, prox));
            if (editando) {
                toast.success(t.salvo);
                onAlterado?.(false);
                onFechar("salvo");
                return;
            }
            setNome("");
            setAcesso("");
            setCapacidade("");
            setTentou(false);
            setAnuncio(formatar(T.criado, { grupo: prox.nome }));
            focarNome();
        } catch {
            // Falhou: os valores ficam para tentar de novo.
            toast.error(t.erroAoSalvar);
        } finally {
            setSalvando(false);
        }
    };

    const aoTeclar = (e: KeyboardEvent) => {
        if (e.key === "Escape" && !e.defaultPrevented) {
            e.preventDefault();
            onPedirFechar();
        }
    };

    return (
        <IngressoAberto formato="retangulo">
            <form
                aria-label={editando ? formatar(T.rotuloEdicao, { grupo: grupo.nome }) : nomeDaSessao ? formatar(T.rotuloNaSessao, { sessao: nomeDaSessao }) : T.rotulo}
                onSubmit={enviar}
                onKeyDown={aoTeclar}
                noValidate
                className="flex flex-col gap-4"
            >
                <div className="flex flex-wrap items-start gap-3">
                    <div ref={campoNome} data-campo="nome" className="w-full md:w-auto md:min-w-48 md:flex-1">
                        <Input
                            label={T.nome}
                            isRequired
                            value={nome}
                            onChange={setNome}
                            placeholder={T.nomePlaceholder}
                            autoComplete="off"
                            isInvalid={tentou && !!erroNome}
                            hint={tentou ? erroNome : undefined}
                        />
                    </div>
                    <div data-campo="tipo" className="w-full md:w-56">
                        <Select
                            label={T.tipoAcesso}
                            isRequired
                            placeholder={T.tipoAcessoPlaceholder}
                            selectedKey={tipoAcesso ?? null}
                            onSelectionChange={(k) => k && setTipoAcesso(k as Grupo["tipoAcesso"])}
                            isInvalid={tentou && !!erroTipo}
                            hint={tentou ? erroTipo : undefined}
                            items={[
                                { id: "qr", label: T.tipoAcessoOpcoes.qr },
                                { id: "facial", label: T.tipoAcessoOpcoes.facial },
                            ]}
                        >
                            {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                        </Select>
                    </div>
                    <div data-campo="acesso" className="w-full md:w-48">
                        {/* Com as entradas do local cadastradas no evento (EVT-166), o campo as oferece e ainda aceita
                            outro texto (ITM-162). Sem entradas, continua o campo de texto livre. */}
                        {entradas.length > 0 ? (
                            <ComboBox
                                label={T.acesso}
                                icon={LogIn04}
                                shortcut={false}
                                allowsCustomValue
                                placeholder={T.acessoPlaceholder}
                                inputValue={acesso}
                                onInputChange={setAcesso}
                                items={entradas}
                            >
                                {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                            </ComboBox>
                        ) : (
                            <Input label={T.acesso} value={acesso} onChange={setAcesso} placeholder={T.acessoPlaceholder} autoComplete="off" />
                        )}
                    </div>
                    <div data-campo="capacidade" className="min-w-0 flex-1 md:w-36 md:flex-none">
                        <Input
                            label={T.capacidade}
                            isRequired
                            inputMode="numeric"
                            autoComplete="off"
                            value={capacidade}
                            onChange={(v) => setCapacidade(v.replace(/\D/g, "").slice(0, 9))}
                            placeholder={T.capacidadePlaceholder}
                            isInvalid={tentou && !!erroCapacidade}
                            hint={tentou ? erroCapacidade : undefined}
                        />
                    </div>
                </div>

                {/* Rodapé: remover ou aviso à esquerda e os botões no canto direito, 6 px entre eles. */}
                <div className="flex flex-wrap items-center justify-end gap-3">
                    {!editando && filtrosLimpos && <p className="mr-auto text-sm text-tertiary">{T.filtrosLimpos}</p>}
                    {/* Excluir grupo (ITM-168): a página confirma, exclui ou explica que há vendas. */}
                    {editando && onExcluir && (
                        <Button type="button" color="link-destructive" size="sm" onClick={onExcluir} className="mr-auto">
                            {T.excluir}
                        </Button>
                    )}
                    <div className="flex shrink-0 items-center gap-1.5">
                        {/* Mesma ordem dos modais: Cancelar (secundário) e a ação principal à direita. */}
                        <Button type="button" color="secondary" size="md" onClick={onPedirFechar}>
                            {T.cancelar}
                        </Button>
                        <Button type="submit" color="primary" size="md" isLoading={salvando} showTextWhileLoading>
                            {editando ? T.salvar : T.criar}
                        </Button>
                    </div>
                </div>

                {/* Leitor de tela: confirma cada grupo criado, sem toast empilhado na tela. */}
                <p role="status" aria-live="polite" className="sr-only">
                    {anuncio}
                </p>
            </form>
        </IngressoAberto>
    );
}
