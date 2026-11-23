import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { CheckboxSelect } from "./CheckboxSelect";
import { CascaDoModalDeMembros } from "./CriarMembroModal";
import { addGrupo, editarGrupo, useEventosDaOrganizacao, useGrupos, useMembros, type Grupo } from "./membros-store";

interface CriarGrupoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCriado?: (g: Grupo) => void;
    /** Nome pré-preenchido (ex.: fluxo JIT da gestão de cortesias). */
    nomeInicial?: string;
    /** Quando informado, o modal edita este grupo (MEM-77). */
    grupo?: Grupo;
}

const mesmoConjunto = (a: Set<string>, b: string[]) => a.size === new Set(b).size && b.every((x) => a.has(x));

export function CriarGrupoModal({ isOpen, onClose, onCriado, nomeInicial = "", grupo }: CriarGrupoModalProps) {
    const membros = useMembros();
    const grupos = useGrupos();
    // Os eventos da organização em contexto (MEM-15).
    const eventosDaOrg = useEventosDaOrganizacao();
    const editando = Boolean(grupo);
    // O grupo padrão cobre todos os eventos e tem nome fixo: só os membros mudam (MEM-64, MEM-77).
    const padrao = Boolean(grupo?.sistema);
    const [nome, setNome] = useState(nomeInicial);
    const [eventos, setEventos] = useState<Set<string>>(new Set());
    const [membrosSel, setMembrosSel] = useState<Set<string>>(new Set());
    // Erros só depois de tentar criar (MEM-72).
    const [tentou, setTentou] = useState(false);
    const nomeId = useId();

    useEffect(() => {
        if (isOpen) {
            setTentou(false);
            setNome(grupo?.nome ?? nomeInicial);
            setEventos(new Set(grupo?.eventoIds ?? []));
            setMembrosSel(new Set(grupo?.membroIds ?? []));
        }
    }, [isOpen, nomeInicial, grupo]);

    const nomeLimpo = nome.trim();
    const faltaNome = nomeLimpo.length === 0;
    const nomeRepetido = useMemo(
        () => !faltaNome && grupos.some((g) => g.id !== grupo?.id && g.nome.trim().toLowerCase() === nomeLimpo.toLowerCase()),
        [grupos, grupo?.id, nomeLimpo, faltaNome],
    );
    const faltaEvento = !padrao && eventos.size === 0;
    const erroDoNome = faltaNome ? "Informe o nome do grupo." : nomeRepetido ? "Use outro nome: já existe um grupo com esse nome." : undefined;

    const alterado = grupo
        ? nome !== grupo.nome || !mesmoConjunto(eventos, grupo.eventoIds) || !mesmoConjunto(membrosSel, grupo.membroIds)
        : nome !== nomeInicial || eventos.size > 0 || membrosSel.size > 0;

    const handleSalvar = () => {
        setTentou(true);
        if (erroDoNome) requestAnimationFrame(() => document.getElementById(nomeId)?.focus());
        if (erroDoNome || faltaEvento) return;
        if (grupo) {
            editarGrupo(grupo.id, { nome: nomeLimpo, eventoIds: [...eventos], membroIds: [...membrosSel] });
            toast.success(`Grupo "${nomeLimpo}" atualizado`);
            onClose();
            return;
        }
        const novo: Grupo = {
            id: crypto.randomUUID(),
            nome: nomeLimpo,
            eventoIds: [...eventos],
            membroIds: [...membrosSel],
        };
        addGrupo(novo);
        toast.success(`Grupo "${novo.nome}" criado`);
        onCriado?.(novo);
        onClose();
    };

    return (
        <CascaDoModalDeMembros
            isOpen={isOpen}
            titulo={editando ? "Editar grupo" : "Novo grupo"}
            alterado={alterado}
            onFechar={onClose}
            largura="sm:max-w-[480px]"
            rodape={(pedirParaFechar) => (
                <>
                    <Button size="md" color="secondary" onClick={pedirParaFechar}>
                        Cancelar
                    </Button>
                    <Button size="md" color="primary" onClick={handleSalvar}>
                        {editando ? "Salvar alterações" : "Criar grupo"}
                    </Button>
                </>
            )}
        >
            {padrao ? (
                <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-secondary">Nome do grupo</span>
                    <p className="text-md text-primary">{grupo?.nome}</p>
                    <p className="text-sm text-tertiary">Grupo padrão: vale para todos os eventos da organização, inclusive os criados depois.</p>
                </div>
            ) : (
                <>
                    <Input
                        label="Nome do grupo"
                        placeholder="Ex.: Portaria, Financeiro SP"
                        value={nome}
                        onChange={setNome}
                        isRequired
                        id={nomeId}
                        isInvalid={tentou && Boolean(erroDoNome)}
                        hint={tentou ? erroDoNome : undefined}
                    />
                    <CheckboxSelect
                        label="Eventos"
                        required
                        placeholder="Selecione os eventos"
                        options={eventosDaOrg.map((e) => ({ id: e.id, label: e.nome }))}
                        selected={eventos}
                        onChange={setEventos}
                        hint="Quem está no grupo atua nestes eventos."
                        erro={tentou && faltaEvento ? "Selecione ao menos um evento." : undefined}
                    />
                </>
            )}
            <CheckboxSelect
                label="Membros"
                placeholder="Selecione os membros"
                options={membros.map((m) => ({ id: m.id, label: m.email }))}
                selected={membrosSel}
                onChange={setMembrosSel}
                hint={editando ? undefined : "Opcional. Dá para incluir pessoas depois."}
            />
        </CascaDoModalDeMembros>
    );
}
