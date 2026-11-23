import { eventoAtualId, setEventoAtual } from "../eventos/data/eventos";

/*
 * Troca do evento em contexto pelos seletores da shell (rail, celular, Relatórios), com proteção do
 * que está sendo editado (BKS-129, EVT-149). Uma tela com edição pendente registra a proteção: se ela
 * devolver `true`, a troca espera a confirmação dela, que chama `seguir` ao descartar.
 */

type Protecao = (seguir: () => void) => boolean;

let protecao: Protecao | null = null;

/** Registra a proteção da tela; devolve a função que a tira (para o `useEffect`). */
export function protegerTrocaDeEvento(fn: Protecao) {
    protecao = fn;
    return () => {
        if (protecao === fn) protecao = null;
    };
}

/** Troca o evento em contexto, passando antes pela proteção da tela, se houver. */
export function trocarDeEvento(id: string) {
    if (id === eventoAtualId()) return;
    const seguir = () => setEventoAtual(id);
    if (protecao?.(seguir)) return;
    seguir();
}
