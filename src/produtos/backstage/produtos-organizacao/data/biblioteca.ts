import { useMemo } from "react";
import { useBanco, useDoc, type Organizacao, type ProdutoDaOrganizacao } from "@/plataforma";
import { bibliotecaDe, salvarBiblioteca } from "../../itens/data/catalogo";
import { useOrganizacaoAtual } from "../../organizacoes/data/organizacao-atual";

/* ------------------------------------------------------------------ */
/*  Biblioteca de produtos da organização em contexto                  */
/*                                                                     */
/*  Nome, descrição, imagem, preço sugerido e regras de venda moram    */
/*  aqui. Cada evento só escolhe o produto e define preço, estoque,    */
/*  transferência e se está à venda (itens/rules.md).                  */
/* ------------------------------------------------------------------ */

export function useBiblioteca() {
    const { modo } = useBanco();
    const atual = useOrganizacaoAtual();
    const orgId = atual?.id ?? "";
    const salva = useDoc("organizacoes", orgId || null);
    const biblioteca = useMemo(() => bibliotecaDe(salva, orgId), [salva, orgId]);

    /** Em quais eventos da organização cada produto está (POR-07: o bloqueio de excluir nomeia os eventos). */
    const eventosDoProduto = useMemo(() => {
        const m = new Map<string, Array<{ id: string; nome: string }>>();
        for (const e of atual?.eventos ?? [])
            for (const p of e.produtos ?? []) {
                const lista = m.get(p.produtoId) ?? [];
                if (!lista.some((x) => x.id === e.id)) lista.push({ id: e.id, nome: e.nome });
                m.set(p.produtoId, lista);
            }
        return m;
    }, [atual]);

    /** Em quantos eventos da organização cada produto está. */
    const usos = useMemo(() => new Map([...eventosDoProduto].map(([id, lista]) => [id, lista.length])), [eventosDoProduto]);

    // Organização que ainda não está gravada (banco antigo) nasce com nome e sigla da que está em contexto.
    const base: Organizacao | undefined = salva ?? (atual ? { id: atual.id, nome: atual.nome, sigla: atual.sigla, criadoEm: atual.criadoEm } : undefined);
    const gravar = (produtos: ProdutoDaOrganizacao[]) => salvarBiblioteca(base, orgId, produtos);

    return { carregando: modo === "carregando" || !atual, organizacao: atual, biblioteca, usos, eventosDoProduto, gravar };
}
