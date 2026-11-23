import { organizacaoDoEvento, salvar, type Etiqueta, type Organizacao, type VinculoDaEtiqueta } from "@/plataforma";
import { useCatalogo } from "../../itens/data/catalogo";

/*
 * Adaptador das etiquetas (ETQ): ficam na organização e valem para todos os eventos dela; os vínculos
 * são por evento. A tela do evento lista todas as etiquetas da organização e conta só os vínculos dele.
 */

export const LIMITE_DO_NOME = 30;
export const LIMITE_POR_ITEM = 3;

export function useEtiquetas() {
    const { evento, organizacao, carregando } = useCatalogo();
    const orgId = evento ? organizacaoDoEvento(evento) : "";
    const etiquetas = [...(organizacao?.etiquetas ?? [])].sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
    return { evento, organizacao, orgId, etiquetas, carregando };
}

/** Grava a lista na organização (a primeira gravação cria o documento, como a biblioteca de produtos). */
export function salvarEtiquetas(org: Organizacao | undefined, orgId: string, etiquetas: Etiqueta[]) {
    const base: Organizacao = org ?? { id: orgId, nome: orgId, sigla: "", criadoEm: new Date().toISOString() };
    return salvar("organizacoes", { ...base, etiquetas });
}

export const vinculosNoEvento = (e: Etiqueta, eventoId: string) => e.vinculos.filter((v) => v.eventoId === eventoId);

/** "tipo:id": a chave de um vínculo, para contar as etiquetas de cada item (ETQ-21). */
export const chaveDoVinculo = (v: VinculoDaEtiqueta) => `${v.tipo}:${v.id}`;
