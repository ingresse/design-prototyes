import { lerDoc, salvar, type MapaInterativo } from "@/plataforma";
import { useOrganizacaoAtual } from "../organizacoes/data/organizacao-atual";

/*
 * Mapas interativos da organização (MAP), num lugar só: Ajustes › Mapas interativos e a criação de
 * evento (mapa de assentos) leem a mesma lista. Sem gravação, valem os três de exemplo.
 */

export const MAPAS_INICIAIS: MapaInterativo[] = [
    { id: "mapa-arena-exemplo", nome: "Arena Exemplo", status: "publicado", arquivado: false, assentos: 12480, atualizadoEm: "2026-10-14T16:20" },
    { id: "mapa-teatro-exemplo", nome: "Teatro Exemplo", status: "publicado-com-rascunho", arquivado: false, assentos: 860, atualizadoEm: "2026-11-02T10:05" },
    { id: "mapa-estadio-exemplo", nome: "Estádio Exemplo", status: "publicado", arquivado: false, assentos: 42300, atualizadoEm: "2026-09-28T09:40" },
];

export function useMapasDaOrganizacao() {
    const org = useOrganizacaoAtual();
    const todos = org?.mapas ?? MAPAS_INICIAIS;
    const gravar = async (mapas: MapaInterativo[]) => {
        if (!org) return;
        // Organização que só existe pelos eventos ganha o documento na primeira gravação (como em Ajustes).
        const { eventos: _e, ativos: _a, ...base } = org;
        const doc = lerDoc("organizacoes", org.id) ?? base;
        await salvar("organizacoes", { ...doc, mapas });
    };
    return { carregando: !org, todos, mapas: todos.filter((m) => !m.arquivado), gravar };
}

