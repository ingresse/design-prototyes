import { useEffect, useState } from "react";
import { Button } from "@/components/base/buttons/button";
import type { GrupoEquipe } from "@/plataforma/equipe";
import { CascaDoModalDeMembros } from "../../components/CriarMembroModal";
import { operadoresDe, SeletorOperadores } from "./seletor-operadores";

interface Props {
    grupo: GrupoEquipe | null;
    onCancelar: () => void;
    onSalvar: (gruposMembrosIds: string[], emailsAvulsos: string[]) => void;
}

const mesmaLista = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

/**
 * "Editar pessoas" no grupo: a mesma seleção da criação (grupos de Membros + pessoas por e-mail), na
 * casca dos modais de Membros (MEM-75): tela cheia no celular e "Descartar o que você preencheu?" ao
 * fechar com algo mudado (ECO-99).
 */
export function ModalEditarOperadores({ grupo, onCancelar, onSalvar }: Props) {
    const [grupos, setGrupos] = useState<string[]>([]);
    const [emails, setEmails] = useState<string[]>([]);

    // Cada abertura começa do que está salvo no grupo.
    useEffect(() => {
        if (!grupo) return;
        setGrupos(grupo.gruposMembrosIds);
        setEmails(grupo.emailsAvulsos);
    }, [grupo]);

    const vazio = operadoresDe(grupos, emails).length === 0;
    const alterado = !!grupo && (!mesmaLista(grupos, grupo.gruposMembrosIds) || !mesmaLista(emails, grupo.emailsAvulsos));

    return (
        <CascaDoModalDeMembros
            isOpen={Boolean(grupo)}
            titulo="Editar pessoas"
            alterado={alterado}
            onFechar={onCancelar}
            largura="sm:max-w-[640px]"
            rodape={(pedirParaFechar) => (
                <>
                    <Button size="lg" color="secondary" onClick={pedirParaFechar}>
                        Cancelar
                    </Button>
                    <Button size="lg" color="primary" isDisabled={vazio} onClick={() => onSalvar(grupos, emails)}>
                        Salvar alterações
                    </Button>
                </>
            )}
        >
            <p className="-mt-3 text-sm text-tertiary">Escolha grupos de Membros ou adicione pessoas por e-mail.</p>
            <SeletorOperadores grupos={grupos} onGrupos={setGrupos} emails={emails} onEmails={setEmails} semMoldura />
        </CascaDoModalDeMembros>
    );
}
