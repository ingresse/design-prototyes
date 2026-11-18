import { AlertCircle, AlertTriangle, CheckCircle } from "@untitledui/icons";
import { BadgeWithIcon } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { secoes } from "../data/opcoes";
import { useVocabulario } from "../data/vocabulario";
import type { Pendencia, SecaoId } from "../data/tipos";
import { useFormulario } from "./contexto";

/* "Falta para abrir as inscrições" (RN-06): cada pendência é um link que leva até o campo. */

export function ListaDePendencias({ limite, nivel = "h3" }: { limite?: number; nivel?: "h3" | "h4" }) {
    const Titulo = nivel;
    const { pendencias, irParaPendencia } = useFormulario();
    const { t } = useVocabulario();
    if (pendencias.length === 0) {
        return (
            <p className="inline-flex items-center gap-2 text-sm text-secondary">
                <CheckCircle className="size-5 shrink-0 text-fg-success-primary" aria-hidden="true" />
                Tudo pronto. Publique para abrir as inscrições.
            </p>
        );
    }
    const visiveis = limite ? pendencias.slice(0, limite) : pendencias;
    const porSecao = secoes(t).map((s) => ({ ...s, itens: visiveis.filter((p) => p.secao === s.id) })).filter((s) => s.itens.length);
    return (
        <div className="flex flex-col gap-4">
            {porSecao.map((s) => (
                <div key={s.id} className="flex flex-col gap-1.5">
                    <Titulo className="text-sm font-semibold text-primary">{s.titulo}</Titulo>
                    <ul className="flex flex-col gap-1">
                        {s.itens.map((p, i) => (
                            <li key={`${p.campo}-${i}`}>
                                <LinkDaPendencia pendencia={p} onIr={() => irParaPendencia(p)} />
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
            {limite && pendencias.length > limite && (
                <p className="text-sm text-tertiary">E mais {pendencias.length - limite}. Elas aparecem marcadas em cada seção.</p>
            )}
        </div>
    );
}

/** Avisos que não impedem publicar (SCE-112, RN-12), agrupados por seção, com link até o campo. */
export function ListaDeAvisos({ limite, nivel = "h3" }: { limite?: number; nivel?: "h3" | "h4" }) {
    const Titulo = nivel;
    const { avisos, irParaPendencia } = useFormulario();
    const { t } = useVocabulario();
    if (avisos.length === 0) return <p className="text-sm text-tertiary">Nenhum aviso.</p>;
    const visiveis = limite ? avisos.slice(0, limite) : avisos;
    const porSecao = secoes(t).map((s) => ({ ...s, itens: visiveis.filter((p) => p.secao === s.id) })).filter((s) => s.itens.length);
    return (
        <div className="flex flex-col gap-4">
            {porSecao.map((s) => (
                <div key={s.id} className="flex flex-col gap-1.5">
                    <Titulo className="text-sm font-semibold text-primary">{s.titulo}</Titulo>
                    {/* v0.17 (SCE-226): cada aviso em amarelo, com ícone, clicável até o campo. */}
                    <ul className="flex flex-col gap-1.5">
                        {s.itens.map((p, i) => (
                            <li key={`${p.campo}-${i}`}>
                                <button
                                    type="button"
                                    onClick={() => irParaPendencia(p)}
                                    className="flex cursor-pointer items-start gap-2 rounded text-left text-sm font-medium text-warning-primary underline-offset-2 outline-focus-ring hover:underline focus-visible:outline-2"
                                >
                                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-fg-warning-primary" aria-hidden="true" />
                                    <span>{p.contexto ? `${p.contexto}: ${minuscula(p.texto)}` : p.texto}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
            {limite && avisos.length > limite && <p className="text-sm text-tertiary">E mais {avisos.length - limite}.</p>}
        </div>
    );
}

const LinkDaPendencia = ({ pendencia: p, onIr }: { pendencia: Pendencia; onIr: () => void }) => (
    <Button color="link-color" size="sm" onClick={onIr} data-pendencia="" className="h-auto text-left whitespace-normal">
        {p.contexto ? `${p.contexto}: ${minuscula(p.texto)}` : p.texto}
    </Button>
);

const minuscula = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

/** Selo de status da seção: ok ou N pendências. */
export function StatusDaSecao({ secao }: { secao: SecaoId }) {
    const { pendencias, avisos } = useFormulario();
    const n = pendencias.filter((p) => p.secao === secao).length;
    // v0.8: lotes copiados a revisar não impedem publicar, mas a seção avisa.
    const ajustes = avisos.filter((p) => p.ajuste && p.secao === secao).length;
    if (n === 0 && ajustes > 0)
        return (
            <BadgeWithIcon type="pill-color" color="warning" size="sm" iconLeading={AlertCircle}>
                {ajustes === 1 ? "1 lote a revisar" : `${ajustes} lotes a revisar`}
            </BadgeWithIcon>
        );
    // v0.17 (SCE-227): sem pendência, mas com aviso na seção (ex.: formulário sem perguntas): selo de aviso, não "Ok".
    const outros = avisos.filter((p) => !p.ajuste && p.secao === secao).length;
    if (n === 0 && outros > 0)
        return (
            <BadgeWithIcon type="pill-color" color="warning" size="sm" iconLeading={AlertTriangle}>
                {outros === 1 ? "1 aviso" : `${outros} avisos`}
            </BadgeWithIcon>
        );
    return n === 0 ? (
        <BadgeWithIcon type="pill-color" color="success" size="sm" iconLeading={CheckCircle}>
            Ok
        </BadgeWithIcon>
    ) : (
        <BadgeWithIcon type="pill-color" color="warning" size="sm" iconLeading={AlertCircle}>
            {n === 1 ? "1 pendência" : `${n} pendências`}
        </BadgeWithIcon>
    );
}
