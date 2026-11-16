import { useEffect, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, CheckCircle, Copy06, HelpCircle, PlayCircle, RefreshCw01, Tool02 } from "@untitledui/icons";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { BadgeWithIcon } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Select } from "@/components/base/select/select";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { TITULO_PAGINA } from "../../components/titulo-pagina";
import { ehPerfil, escolherPerfil, PERFIS, usePerfil, type Perfil } from "../data/perfil";
import { useRascunho } from "../data/rascunho";
import { ehVariante, escolherVariante, useVocabulario, VARIANTES, type VarianteDeNomes } from "../data/vocabulario";

/* Cabeçalho das telas: ferramentas de protótipo (perfil e nomes dos níveis), título, salvamento automático e ajuda. v0.13: a Versão B saiu; a criação é o assistente. */

export const ROTAS = {
    eventos: "/backstage/sports",
    inicio: "/backstage/sports/criar-evento",
    a: "/backstage/sports/criar-evento/assistente",
};

/**
 * Itens de protótipo (não vão para produção): o perfil e os nomes dos níveis do catálogo,
 * para o teste de nomenclatura (SCE-80). Os nomes também vêm da URL (`?nomes=`) e ficam no navegador.
 */
export function FerramentasDoPrototipo() {
    const { variante } = useVocabulario();
    const [params, setParams] = useSearchParams();
    const daUrl = params.get("nomes");
    // Ao abrir pela URL com ?nomes=, essa variante passa a valer (e fica salva no navegador).
    useEffect(() => {
        if (ehVariante(daUrl)) escolherVariante(daUrl);
    }, [daUrl]);
    const perfil = usePerfil();
    const perfilDaUrl = params.get("perfil");
    // ?perfil= escolhe o perfil ao abrir (RN-09) e fica salvo no navegador.
    useEffect(() => {
        if (ehPerfil(perfilDaUrl)) escolherPerfil(perfilDaUrl);
    }, [perfilDaUrl]);
    const trocarPerfil = (v: Perfil) => {
        escolherPerfil(v);
        const p = new URLSearchParams(params);
        p.set("perfil", v);
        setParams(p, { replace: true });
    };
    const trocarNomes = (v: VarianteDeNomes) => {
        escolherVariante(v);
        const p = new URLSearchParams(params);
        p.set("nomes", v);
        setParams(p, { replace: true });
    };
    return (
        <div className="flex flex-col gap-2 md:items-end" role="group" aria-label="Ferramentas do protótipo">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 md:justify-end">
                <BadgeWithIcon type="pill-color" color="gray" size="sm" iconLeading={Tool02}>
                    Protótipo v0.15
                </BadgeWithIcon>
                <div className="w-full sm:w-60">
                    <Select
                        aria-label="Perfil de quem usa"
                        size="sm"
                        items={PERFIS}
                        selectedKey={perfil}
                        onSelectionChange={(k) => ehPerfil(String(k)) && trocarPerfil(String(k) as Perfil)}
                    >
                        {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                    </Select>
                </div>
                <div className="w-full sm:w-72">
                    <Select
                        aria-label="Nomes dos níveis"
                        size="sm"
                        items={OPCOES_DE_NOMES}
                        selectedKey={variante}
                        onSelectionChange={(k) => ehVariante(String(k)) && trocarNomes(String(k) as VarianteDeNomes)}
                    >
                        {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                    </Select>
                </div>
            </div>
            <p className="text-sm text-tertiary">Para o teste de nomenclatura: troque os nomes sem mudar a estrutura.</p>
        </div>
    );
}

const OPCOES_DE_NOMES = (Object.keys(VARIANTES) as VarianteDeNomes[]).map((id) => ({ id, label: VARIANTES[id].rotulo }));

/** Caminho com a variante de nomes na URL, para trocar de tela sem perder a escolha. */
export const comNomes = (caminho: string, variante: VarianteDeNomes) => `${caminho}${caminho.includes("?") ? "&" : "?"}nomes=${variante}`;

/** "Salvo automaticamente às HH:MM" (SCE-04). */
export function IndicadorDeSalvamento() {
    const { rascunho, salvando } = useRascunho();
    return (
        <div className="flex flex-col gap-0.5 text-sm md:items-end md:text-right" aria-live="polite">
            <span className="inline-flex items-center gap-1.5 text-secondary">
                {salvando ? (
                    <>
                        <RefreshCw01 className="size-4 animate-spin text-fg-quaternary motion-reduce:animate-none" aria-hidden="true" />
                        Salvando…
                    </>
                ) : rascunho.salvoEm ? (
                    <>
                        <CheckCircle className="size-4 text-fg-success-primary" aria-hidden="true" />
                        Salvo automaticamente às {rascunho.salvoEm}
                    </>
                ) : null}
            </span>
            <span className="text-tertiary">Você pode sair e continuar depois.</span>
        </div>
    );
}

export function CabecalhoDaPagina({
    titulo,
    subtitulo,
    comSalvamento = true,
    onReverTour,
    children,
}: {
    onReverTour?: () => void;
    titulo: string;
    subtitulo?: string;
    comSalvamento?: boolean;
    children?: ReactNode;
}) {
    const navigate = useNavigate();
    return (
        <header className="flex flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                {/* Sem confirmação ao sair: o rascunho já está salvo. */}
                <Button color="tertiary" size="md" iconLeading={ArrowLeft} className="-ml-3" onClick={() => navigate(ROTAS.eventos)}>
                    Seus eventos
                </Button>
                <FerramentasDoPrototipo />
            </div>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="flex min-w-0 flex-col gap-1">
                    <h1 className={TITULO_PAGINA}>{titulo}</h1>
                    {subtitulo && <p className="max-w-[60ch] text-md text-tertiary">{subtitulo}</p>}
                </div>
                <div className="flex flex-col gap-2 md:items-end">
                    {comSalvamento && <IndicadorDeSalvamento />}
                    {onReverTour && (
                        // Ajuda: reabre o tour (RN-11).
                        <Dropdown.Root>
                            <Button color="link-gray" size="sm" iconLeading={HelpCircle}>
                                Ajuda
                            </Button>
                            <Dropdown.Popover className="w-48" placement="bottom end">
                                <Dropdown.Menu aria-label="Ajuda" onAction={() => onReverTour()}>
                                    <Dropdown.Item id="tour" icon={PlayCircle} label="Rever tour" />
                                </Dropdown.Menu>
                            </Dropdown.Popover>
                        </Dropdown.Root>
                    )}
                </div>
            </div>
            {children}
        </header>
    );
}

/** Aviso da cópia: de onde veio e o que revisar (RN-07). Composto com FeaturedIcon e tokens do DS. */
export function AvisoDeCopia() {
    const { rascunho } = useRascunho();
    if (rascunho.origem !== "copia" || !rascunho.copiadoDe) return null;
    // v0.8 (SCE-184): diz o que falta revisar: lotes copiados (SCE-191) e a largada. Data limite em branco é normal.
    const lotes = rascunho.modalidades.reduce((n, m) => n + m.categorias.reduce((k, c) => k + c.lotes.filter((l) => l.revisar).length, 0), 0);
    const largada = rascunho.datasARevisar.includes("campo-largada") || rascunho.datasARevisar.includes("campo-termino");
    const partes = [
        lotes > 0 && `${lotes === 1 ? "1 lote copiado está marcado" : `${lotes} lotes copiados estão marcados`} para revisar.`,
        largada && 'A largada e o término vieram para o próximo ano e estão marcados com "Revise esta data".',
    ].filter(Boolean);
    return (
        <div className="flex items-start gap-3 rounded-xl bg-primary p-4 ring-1 ring-secondary ring-inset" role="note">
            <FeaturedIcon icon={Copy06} color="brand" theme="modern" size="md" />
            <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-sm font-semibold text-primary">Copiado de {rascunho.copiadoDe}</p>
                <p className="max-w-[65ch] text-sm text-tertiary">
                    Datas de venda, inscritos e cupons não vêm na cópia. {partes.length ? partes.join(" ") : "Tudo já foi revisado."}
                </p>
            </div>
        </div>
    );
}
