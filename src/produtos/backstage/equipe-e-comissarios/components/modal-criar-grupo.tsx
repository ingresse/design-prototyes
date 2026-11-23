import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { CascaDoModalDeMembros } from "../../components/CriarMembroModal";
import { gruposDeExemplo } from "../data/grupos-exemplo";
import { BASE, criarGrupo, NOME_MAX, operadoresDe, type GrupoEquipe } from "../data/equipe";
import { SeletorOperadores } from "./seletor-operadores";

/**
 * Criar grupo (ECO-07, ECO-08, ECO-30, ECO-31): só nome e pessoas. Comissário e canais se
 * configuram depois, na tela do grupo, para onde a criação leva.
 */
export function ModalCriarGrupo({
    aberto,
    onFechar,
    eventoId,
    organizacaoId,
    grupos,
}: {
    aberto: boolean;
    onFechar: () => void;
    eventoId: string;
    organizacaoId: string;
    /** Grupos do evento, para o nome não repetir. */
    grupos: GrupoEquipe[];
}) {
    const navigate = useNavigate();
    const [nome, setNome] = useState("");
    const [gruposMembros, setGruposMembros] = useState<string[]>([]);
    const [emails, setEmails] = useState<string[]>([]);
    const [tentou, setTentou] = useState(false);
    const pessoas = operadoresDe(gruposMembros, emails);

    const nomeLimpo = nome.trim();
    const repetido = grupos.some((g) => g.nome.toLowerCase() === nomeLimpo.toLowerCase());
    const longo = nomeLimpo.length > NOME_MAX;
    const erros = {
        nome: !nomeLimpo ? "Dê um nome ao grupo." : repetido ? "Já existe um grupo com esse nome neste evento." : longo ? `Use até ${NOME_MAX} caracteres.` : undefined,
        pessoas: pessoas.length === 0 ? "Adicione ao menos uma pessoa, por grupo de Membros ou por e-mail." : undefined,
    };

    const fechar = () => {
        setNome("");
        setGruposMembros([]);
        setEmails([]);
        setTentou(false);
        onFechar();
    };

    const criar = () => {
        if (erros.nome || erros.pessoas) return setTentou(true);
        const novo = criarGrupo(
            {
                eventoId,
                organizacaoId,
                nome: nomeLimpo,
                gruposMembrosIds: gruposMembros,
                emailsAvulsos: emails,
                operadores: pessoas,
            },
            gruposDeExemplo(eventoId, organizacaoId),
        );
        fechar();
        // Na simulação de escala nada é gravado e o grupo não nasce (ECO-100).
        if (novo) navigate(`${BASE}/${novo.id}`, { state: { criado: true } });
    };

    const alterado = !!nome.trim() || gruposMembros.length > 0 || emails.length > 0;

    return (
        // Casca dos modais de Membros (MEM-75): tela cheia no celular e confirmação ao descartar (ECO-99).
        <CascaDoModalDeMembros
            isOpen={aberto}
            titulo="Criar grupo"
            alterado={alterado}
            onFechar={fechar}
            largura="sm:max-w-[640px]"
            rodape={(pedirParaFechar) => (
                <>
                    <Button size="lg" color="secondary" onClick={pedirParaFechar}>
                        Cancelar
                    </Button>
                    <Button size="lg" color="primary" onClick={criar}>
                        Criar grupo
                    </Button>
                </>
            )}
        >
            <p className="-mt-3 text-sm text-tertiary">Depois de criar, você configura os canais do grupo e, se houver, o comissário.</p>
            <Input
                label="Nome do grupo"
                isRequired
                placeholder="Ex.: Equipe de portaria"
                value={nome}
                onChange={setNome}
                isInvalid={(tentou && !!erros.nome) || repetido || longo}
                hint={(tentou || repetido || longo) && erros.nome ? erros.nome : undefined}
            />
            <div className="flex flex-col gap-3 border-t border-secondary pt-5">
                <h3 className="text-sm font-semibold text-primary">Pessoas</h3>
                <SeletorOperadores grupos={gruposMembros} onGrupos={setGruposMembros} emails={emails} onEmails={setEmails} semMoldura />
                {tentou && erros.pessoas && <p className="text-sm text-error-primary">{erros.pessoas}</p>}
            </div>
        </CascaDoModalDeMembros>
    );
}
