import { useState, type FC, type ReactNode } from "react";
import { useParams } from "react-router";
import { CalendarCheck01, CheckCircle, Clock, PauseCircle, SearchLg, SlashCircle01 } from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { entrar, pedirVagasDeGrupo, useBanco, useColecao, useSessao, type SolicitacaoDeGrupo } from "@/plataforma";

/*
 * Formulário de pedido de vagas para grupos (pedido-de-grupo/rules.md): o lado do gestor das Compras
 * em grupo do Backstage. Quem gerencia um grupo ou assessoria entra, diz quantas vagas quer e o pedido
 * cai na fila do Backstage para a produtora aprovar.
 */

const TIPOS: { id: SolicitacaoDeGrupo["tipoDeGrupo"]; label: string }[] = [
    { id: "assessoria", label: "Assessoria esportiva" },
    { id: "amigos", label: "Amigos e familiares" },
    { id: "empresa", label: "Grupo corporativo ou do trabalho" },
    { id: "corrida", label: "Equipe de corrida" },
    { id: "escola", label: "Grupo escolar ou faculdade" },
    { id: "outros", label: "Outros" },
];

const quando = (iso?: string) => (iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(",", " às") : "—");

/** CNPJ com dígitos verificadores certos. */
function cnpjValido(v: string) {
    const d = v.replace(/\D/g, "");
    if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
    const calc = (n: number) => {
        const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        const r = pesos.reduce((s, p, i) => s + Number(d[i]) * p, 0) % 11;
        return r < 2 ? 0 : 11 - r;
    };
    return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

export function PedidoDeGrupo() {
    const { slug } = useParams();
    const { modo } = useBanco();
    const evento = useColecao("eventos").find((e) => e.slug === slug);
    const sessao = useSessao();

    if (modo === "carregando")
        return (
            <Moldura>
                <LoadingIndicator type="line-spinner" size="md" label="Carregando" />
            </Moldura>
        );
    if (!evento) return <Aviso icone={SearchLg} titulo="Não encontramos este evento" texto="Confira o link com quem enviou." />;

    const m = evento.comprasEmGrupo;
    const agora = new Date().toISOString().slice(0, 16);
    if (!m?.publicado) return <Aviso icone={SlashCircle01} titulo="Solicitações indisponíveis" texto={`${evento.nome} não está recebendo pedidos de grupos.`} />;
    if (!m.habilitado) return <Aviso icone={PauseCircle} titulo="Inscrições pausadas" texto="A produção pausou os pedidos de vagas. Tente de novo mais tarde." />;
    if (m.inicio && agora < m.inicio) return <Aviso icone={Clock} titulo={`As solicitações abrem em ${quando(m.inicio)}`} texto={`Volte nesse dia para pedir vagas para ${evento.nome}.`} />;
    if (m.fim && agora > m.fim) return <Aviso icone={CalendarCheck01} titulo="Vagas encerradas" texto={`O período para pedir vagas para ${evento.nome} terminou.`} />;

    const meu = sessao ? m.solicitacoes.find((s) => s.email?.toLowerCase() === sessao.email.toLowerCase() && s.status === "pendente") : undefined;

    return (
        <Moldura>
            <div className="flex w-full max-w-xl flex-col gap-6">
                <header className="flex items-center gap-4 rounded-2xl bg-primary p-4 ring-1 ring-secondary">
                    {evento.capa && <img src={evento.capa} alt="" className="h-20 w-16 shrink-0 rounded-lg object-cover" />}
                    <div className="flex min-w-0 flex-col gap-1">
                        <h1 className="text-lg font-semibold text-primary">{evento.nome}</h1>
                        <p className="text-sm text-tertiary">{`Período para solicitar suas vagas: de ${quando(m.inicio)} até ${quando(m.fim)}`}</p>
                    </div>
                </header>
                {!sessao ? <Entrar /> : meu ? <JaPediu solicitacao={meu} /> : <Formulario eventoId={evento.id} minimo={m.minimo ?? 1} maximo={m.maximo ?? 9999} nome={sessao.nome} email={sessao.email} />}
            </div>
        </Moldura>
    );
}

const Moldura = ({ children }: { children: ReactNode }) => <div className="flex min-h-screen items-start justify-center bg-secondary px-4 py-10 md:py-16">{children}</div>;

function Aviso({ icone, titulo, texto }: { icone: FC<{ className?: string }>; titulo: string; texto: string }) {
    return (
        <Moldura>
            <EmptyState size="md">
                <EmptyState.Header>
                    <EmptyState.FeaturedIcon icon={icone} color="gray" />
                </EmptyState.Header>
                <EmptyState.Content>
                    <EmptyState.Title>{titulo}</EmptyState.Title>
                    <EmptyState.Description>{texto}</EmptyState.Description>
                </EmptyState.Content>
            </EmptyState>
        </Moldura>
    );
}

/** Sem conta: em produção, o login da Ingresse; aqui, nome e e-mail bastam (PDG-03). */
function Entrar() {
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const valido = nome.trim().length >= 2 && /^\S+@\S+\.\S+$/.test(email.trim());
    return (
        <section className="flex flex-col gap-4 rounded-2xl bg-primary p-6 ring-1 ring-secondary">
            <p className="text-md text-secondary">Para solicitar vagas para este evento, você precisa acessar ou criar sua conta.</p>
            <Input label="Nome" value={nome} onChange={setNome} />
            <Input label="E-mail" type="email" value={email} onChange={setEmail} />
            <Button color="primary" size="lg" isDisabled={!valido} onClick={() => entrar({ nome, email })}>
                Acesse sua conta
            </Button>
        </section>
    );
}

function JaPediu({ solicitacao: s }: { solicitacao: SolicitacaoDeGrupo }) {
    return (
        <section className="flex flex-col items-center gap-3 rounded-2xl bg-primary p-8 text-center ring-1 ring-secondary">
            <CheckCircle className="size-10 text-fg-success-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-primary">Solicitação enviada</h2>
            <p className="text-sm text-tertiary">{`Você pediu ${s.solicitadas.toLocaleString("pt-BR")} vagas para ${s.grupo}. A produção vai analisar e você recebe a resposta por e-mail.`}</p>
            <p className="text-xs text-quaternary">Você já tem uma solicitação para este evento.</p>
        </section>
    );
}

function Formulario({ eventoId, minimo, maximo, nome, email }: { eventoId: string; minimo: number; maximo: number; nome: string; email: string }) {
    const [tipo, setTipo] = useState<SolicitacaoDeGrupo["tipoDeGrupo"] | "">("");
    const [descricao, setDescricao] = useState("");
    const [grupo, setGrupo] = useState("");
    const [vagas, setVagas] = useState("");
    const [cnpj, setCnpj] = useState("");
    const [tentou, setTentou] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const n = Number(vagas);
    const erros = {
        tipo: !tipo ? "Escolha o tipo de grupo." : undefined,
        descricao: tipo === "outros" && !descricao.trim() ? "Descreva seu grupo." : undefined,
        grupo: !grupo.trim() ? "Informe o nome do grupo." : undefined,
        vagas: !vagas ? "Informe a quantidade de vagas." : n < minimo ? `Você deve solicitar no mínimo ${minimo} vagas` : n > maximo ? `Você deve solicitar no máximo ${maximo.toLocaleString("pt-BR")} vagas` : undefined,
        cnpj: cnpj.trim() && !cnpjValido(cnpj) ? "Informe um CNPJ válido ou deixe em branco" : undefined,
    };
    const valido = !Object.values(erros).some(Boolean);

    const enviar = async () => {
        setTentou(true);
        if (!valido || !tipo) return;
        setEnviando(true);
        await pedirVagasDeGrupo(eventoId, { grupo: grupo.trim(), tipoDeGrupo: tipo, descricao: tipo === "outros" ? descricao.trim() : undefined, responsavel: nome, email, cnpj: cnpj.trim() || undefined, solicitadas: n });
        setEnviando(false);
    };

    return (
        <section className="flex flex-col gap-4 rounded-2xl bg-primary p-6 ring-1 ring-secondary">
            <h2 className="text-lg font-semibold text-primary">Vagas para compras em grupo</h2>
            <NativeSelect label="Tipo de grupo" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)} options={[{ label: "Selecione", value: "" }, ...TIPOS.map((t) => ({ label: t.label, value: t.id }))]} hint={tentou ? erros.tipo : undefined} />
            {tipo === "outros" && <Input label="Como você descreveria seu grupo?" isRequired maxLength={120} placeholder="Ex.: Grupo religioso, Escola, Excursão" value={descricao} onChange={setDescricao} isInvalid={tentou && !!erros.descricao} hint={tentou ? erros.descricao : undefined} />}
            <Input label="Nome do grupo" isRequired maxLength={120} value={grupo} onChange={setGrupo} isInvalid={tentou && !!erros.grupo} hint={tentou ? erros.grupo : undefined} />
            <Input
                label="Quantidade de vagas"
                isRequired
                inputMode="numeric"
                placeholder={`Mínimo de ${minimo} vagas`}
                value={vagas}
                onChange={(v) => setVagas(v.replace(/\D/g, "").slice(0, 6))}
                isInvalid={tentou && !!erros.vagas}
                hint={tentou && erros.vagas ? erros.vagas : `Você pode solicitar entre ${minimo} e ${maximo.toLocaleString("pt-BR")} vagas`}
            />
            <Input label="CNPJ (opcional)" inputMode="numeric" value={cnpj} onChange={setCnpj} isInvalid={tentou && !!erros.cnpj} hint={tentou ? erros.cnpj : undefined} />
            <Button color="primary" size="lg" isLoading={enviando} showTextWhileLoading onClick={() => void enviar()}>
                Solicitar vagas
            </Button>
        </section>
    );
}
