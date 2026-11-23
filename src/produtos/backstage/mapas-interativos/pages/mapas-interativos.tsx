import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { Archive, DotsVertical, Edit01, Map01, Plus, XClose } from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Input } from "@/components/base/input/input";
import { novoId, type MapaInterativo } from "@/plataforma";
import { BackstageLayout } from "../../components/Backstage";
import { CabecalhoDaPagina } from "../../components/cabecalho-da-pagina";
import { ModalDeConfirmacao } from "../../components/modal-de-confirmacao";
import { atualizadoEm, LIMITE_DO_NOME, useMapas } from "../data/mapas";

/*
 * Mapas interativos (mapas-interativos/rules.md): o gêmeo de `settings/seat-maps` de produção. Lista
 * em cartões, "Novo mapa" (nome e vai para o editor) e "Arquivar".
 */

export const ROTA_MAPAS = "/backstage/ajustes/mapas";

const T = {
    voltar: "Ajustes",
    titulo: "Mapas interativos",
    novo: "Novo mapa",
    vazioTitulo: "Crie o seu primeiro mapa interativo",
    vazioTexto: "Com o mapa interativo os compradores podem selecionar seus ingressos clicando em setores, mesas ou assentos específicos!",
    rascunho: "Rascunho",
    assentos: "Assentos cadastrados",
    mais: "Mais ações do mapa {nome}",
    editar: "Editar",
    arquivar: "Arquivar",
    novoDica: "Dê um nome ao mapa. Em seguida, você o desenha no editor.",
    nome: "Nome do mapa",
    nomePlaceholder: "Ex.: Arena padrão",
    criar: "Criar mapa",
    cancelar: "Voltar",
    erroCriar: "Não foi possível criar o mapa. Tente novamente.",
    arquivarTitulo: "Arquivar mapa?",
    arquivarTexto: "Ao arquivar um mapa, ele deixa de aparecer nesta lista e não pode mais ser vinculado a novos eventos. Os eventos que já usam o mapa continuam vendendo normalmente.",
    arquivarConfirmar: "Arquivar mapa",
    arquivado: "Mapa arquivado.",
    erroArquivar: "Não foi possível arquivar o mapa.",
    descartarTitulo: "Descartar o novo mapa?",
    descartarTexto: "O nome que você digitou não fica salvo.",
    descartar: "Descartar",
    continuar: "Continuar editando",
};

export function MapasInterativos() {
    const navigate = useNavigate();
    const { carregando, todos, mapas, gravar } = useMapas();
    const [criando, setCriando] = useState(false);
    const [arquivando, setArquivando] = useState<MapaInterativo | null>(null);
    const [gravando, setGravando] = useState(false);
    const ultimo = useRef(arquivando);
    if (arquivando) ultimo.current = arquivando;

    const arquivar = async () => {
        if (!arquivando) return;
        setGravando(true);
        try {
            await gravar(todos.map((m) => (m.id === arquivando.id ? { ...m, arquivado: true } : m)));
            toast.success(T.arquivado);
            setArquivando(null);
        } catch {
            toast.error(T.erroArquivar);
        } finally {
            setGravando(false);
        }
    };

    return (
        <BackstageLayout activeProducer="ajustes" showEventContext={false} showLayoutSwitcher={false}>
            <div className="flex w-full min-w-0 flex-1 flex-col gap-6">
                <CabecalhoDaPagina
                    voltar={{ rotulo: T.voltar, href: "/backstage/ajustes" }}
                    titulo={T.titulo}
                    acoes={
                        !carregando &&
                        mapas.length > 0 && (
                            <Button color="secondary" size="md" iconLeading={Plus} onClick={() => setCriando(true)}>
                                {T.novo}
                            </Button>
                        )
                    }
                />

                {carregando ? (
                    <div role="status" aria-label="Carregando mapas" className="flex flex-col gap-3">
                        {[0, 1, 2].map((i) => (
                            <span key={i} aria-hidden="true" className="h-24 w-full animate-pulse rounded-2xl bg-secondary motion-reduce:animate-none" />
                        ))}
                    </div>
                ) : mapas.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                        <EmptyState size="sm">
                            <EmptyState.Header>
                                <EmptyState.FeaturedIcon icon={Map01} color="gray" theme="modern" />
                            </EmptyState.Header>
                            <EmptyState.Content>
                                <EmptyState.Title>{T.vazioTitulo}</EmptyState.Title>
                                <EmptyState.Description>{T.vazioTexto}</EmptyState.Description>
                            </EmptyState.Content>
                            <EmptyState.Footer>
                                <Button color="primary" size="md" iconLeading={Plus} onClick={() => setCriando(true)}>
                                    {T.novo}
                                </Button>
                            </EmptyState.Footer>
                        </EmptyState>
                    </div>
                ) : (
                    <ul className="flex flex-col gap-3">
                        {mapas.map((m) => (
                            // O cartão inteiro abre o editor (MAP-31): o nome é o link e se estica sobre o cartão; o ⋮ fica por cima.
                            <li key={m.id} className="relative flex items-center gap-4 rounded-2xl bg-primary p-4 ring-1 ring-secondary transition duration-100 ease-linear hover:bg-primary_hover">
                                {/* Miniatura: sem imagem do desenho no protótipo, fica o ícone de mapa (como em produção sem miniatura). */}
                                <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-secondary text-fg-quaternary">
                                    <Map01 className="size-6" aria-hidden="true" />
                                </span>
                                <div className="flex min-w-0 flex-1 flex-col gap-1">
                                    <span className="text-xs text-tertiary">{atualizadoEm(m.atualizadoEm)}</span>
                                    <span className="flex flex-wrap items-center gap-2">
                                        <Link
                                            to={`${ROTA_MAPAS}/${m.id}`}
                                            className="min-w-0 truncate rounded-sm text-md font-semibold text-primary outline-focus-ring after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2"
                                        >
                                            {m.nome}
                                        </Link>
                                        {m.status === "rascunho" && (
                                            <Badge type="pill-color" color="gray" size="sm">
                                                {T.rascunho}
                                            </Badge>
                                        )}
                                    </span>
                                    {/* No celular os assentos ficam aqui, abaixo do nome (antes sumiam abaixo de 640 px). */}
                                    <span className="text-sm text-tertiary sm:hidden">{`${m.assentos.toLocaleString("pt-BR")} ${m.assentos === 1 ? "assento" : "assentos"}`}</span>
                                </div>
                                <div className="hidden flex-col items-end sm:flex">
                                    <span className="text-xs text-tertiary">{T.assentos}</span>
                                    <span className="text-md font-semibold text-primary tabular-nums">{m.assentos.toLocaleString("pt-BR")}</span>
                                </div>
                                <div className="relative z-10">
                                    <Dropdown.Root>
                                        <ButtonUtility icon={DotsVertical} color="tertiary" size="sm" tooltip={T.mais.replace("{nome}", m.nome)} />
                                        <Dropdown.Popover className="w-44" placement="bottom end">
                                            <Dropdown.Menu aria-label={T.mais.replace("{nome}", m.nome)} onAction={(k) => (k === "editar" ? navigate(`${ROTA_MAPAS}/${m.id}`) : setArquivando(m))}>
                                                <Dropdown.Item id="editar" icon={Edit01} label={T.editar} />
                                                <Dropdown.Item id="arquivar" icon={Archive} label={T.arquivar} />
                                            </Dropdown.Menu>
                                        </Dropdown.Popover>
                                    </Dropdown.Root>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {criando && (
                <ModalNovoMapa
                    onFechar={() => setCriando(false)}
                    onCriar={async (nome) => {
                        const novo: MapaInterativo = { id: novoId("mapa"), nome, status: "rascunho", arquivado: false, assentos: 0, atualizadoEm: new Date().toISOString().slice(0, 16) };
                        await gravar([...todos, novo]);
                        navigate(`${ROTA_MAPAS}/${novo.id}`);
                    }}
                />
            )}
            <ModalDeConfirmacao
                aberto={!!arquivando}
                titulo={T.arquivarTitulo}
                descricao={T.arquivarTexto}
                confirmar={T.arquivarConfirmar}
                icone={Archive}
                carregando={gravando}
                onConfirmar={() => void arquivar()}
                onFechar={() => setArquivando(null)}
            />
        </BackstageLayout>
    );
}

function ModalNovoMapa({ onFechar, onCriar }: { onFechar: () => void; onCriar: (nome: string) => Promise<void> }) {
    const [nome, setNome] = useState("");
    const [erro, setErro] = useState<string>();
    const [gravando, setGravando] = useState(false);
    const [descartando, setDescartando] = useState(false);
    // Com nome digitado, clicar fora não fecha; Esc, X e Voltar perguntam antes (MAP-32, T6).
    const alterado = !!nome.trim();
    const fechar = () => (gravando ? undefined : alterado ? setDescartando(true) : onFechar());
    const criar = async () => {
        if (!nome.trim()) return;
        setGravando(true);
        try {
            await onCriar(nome.trim());
        } catch {
            setErro(T.erroCriar);
            setGravando(false);
        }
    };
    return (
        <ModalOverlay isOpen onOpenChange={(o) => !o && fechar()} isDismissable={!gravando && !alterado}>
            <Modal>
                <Dialog aria-label={T.novo}>
                    <form
                        noValidate
                        onSubmit={(e) => {
                            e.preventDefault();
                            void criar();
                        }}
                        className="relative w-full max-w-md rounded-2xl bg-primary p-6 shadow-xl ring-1 ring-secondary"
                    >
                        <ButtonUtility size="sm" color="tertiary" icon={XClose} tooltip="Fechar" onClick={fechar} isDisabled={gravando} className="absolute top-4 right-4" />
                        <div className="flex flex-col gap-1 pr-8">
                            <h2 className="text-lg font-semibold text-primary">{T.novo}</h2>
                            <p className="text-sm text-tertiary">{T.novoDica}</p>
                        </div>
                        <div className="mt-5">
                            <Input label={T.nome} autoFocus placeholder={T.nomePlaceholder} maxLength={LIMITE_DO_NOME} value={nome} onChange={(v) => (setNome(v), setErro(undefined))} isInvalid={!!erro} hint={erro} />
                        </div>
                        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <Button size="lg" color="tertiary" onClick={fechar} isDisabled={gravando}>
                                {T.cancelar}
                            </Button>
                            <Button type="submit" size="lg" color="primary" isDisabled={!nome.trim()} isLoading={gravando} showTextWhileLoading>
                                {T.criar}
                            </Button>
                        </div>
                    </form>
                    <ModalDeConfirmacao aberto={descartando} titulo={T.descartarTitulo} descricao={T.descartarTexto} confirmar={T.descartar} cancelar={T.continuar} destrutiva onConfirmar={onFechar} onFechar={() => setDescartando(false)} />
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
