import { useCallback, useEffect, useRef, useState } from "react";
import { lerBanner, lerTags, type LeituraDeTags } from "@/plataforma/categorias";
import { exportarRecorte, type ImagemDoBanner, type Recorte } from "../components/campo-banner";

/* ------------------------------------------------------------------ */
/*  Tags do show ou festa na criação (EVT-97)                          */
/*                                                                     */
/*  Nada roda enquanto a pessoa digita. A leitura começa quando ela    */
/*  sai do campo aberto, do nome ou da descrição (`ler`), e quando o   */
/*  banner muda: o Claude lê o recorte e a frase entra na leitura.     */
/*  Só busca com o campo aberto preenchido.                            */
/*  Resposta antiga que chega depois de uma nova é descartada.         */
/* ------------------------------------------------------------------ */

export interface EntradaDasTags {
    ativo: boolean;
    texto: string;
    nome: string;
    /** Descrição em texto puro. */
    descricao: string;
    banner: ImagemDoBanner | null;
    recorte: Recorte | null;
    /** Sem campo aberto (edição, EVT-127): lê do nome, da descrição e do banner ao sair deles. */
    semTextoAberto?: boolean;
}

export type EstadoDasTags =
    | { status: "vazio" }
    | { status: "lendo"; banner: boolean }
    | { status: "pronto"; resultado: LeituraDeTags }
    | { status: "erro" };

/** Tempo mínimo da busca, com o campo travado e "Buscando…" na ponta. */
const MINIMO_DA_BUSCA_MS = 2000;
const esperar = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function useTagsDoEvento(entrada: EntradaDasTags) {
    const [estado, setEstado] = useState<EstadoDasTags>({ status: "vazio" });
    const [bannerDescricao, setBannerDescricao] = useState<string | null>(null);

    // Valores mais recentes, para o blur e o Criar lerem sem depender do render.
    const atual = useRef({ entrada, bannerDescricao });
    atual.current = { entrada, bannerDescricao };
    const ultima = useRef<{ chave: string; promessa: Promise<LeituraDeTags | null> } | null>(null);
    const leituraDoBanner = useRef<Promise<string | null> | null>(null);

    /**
     * Busca as tags. Cada saída de campo busca de novo, mesmo sem mudança. `reaproveitar` (só no
     * Criar) devolve a última leitura quando nada mudou. `inicio` conta os 2 s mínimos desde antes
     * (a leitura do banner), para a busca não somar mais 2 s depois dela.
     */
    const ler = useCallback((opcoes: { reaproveitar?: boolean; inicio?: number } = {}): Promise<LeituraDeTags | null> => {
        const { entrada: e, bannerDescricao: banner } = atual.current;
        if (!e.ativo) return Promise.resolve(null);
        const dados = { texto: e.texto.trim(), nome: e.nome.trim(), descricao: e.descricao.trim(), bannerDescricao: banner ?? undefined };
        // Sem o texto aberto não há busca ao sair de um campo (no Criar há, com o nome, a descrição e o banner): o campo trava enquanto busca, e travaria quem chega nele vindo do nome.
        const temOQueLer = e.semTextoAberto ? !!(dados.nome || dados.descricao || dados.bannerDescricao) : !!dados.texto;
        if (!temOQueLer && !opcoes.reaproveitar) {
            ultima.current = null;
            setEstado({ status: "vazio" });
            return Promise.resolve(null);
        }
        const chave = JSON.stringify(dados);
        if (opcoes.reaproveitar && ultima.current?.chave === chave) return ultima.current.promessa;

        setEstado({ status: "lendo", banner: false });
        // A busca dura no mínimo 2 s: com o modelo em cache ela é instantânea e a pessoa não veria que leu de novo.
        // No Criar não há espera: o botão já mostra que está criando.
        const resto = opcoes.reaproveitar ? 0 : Math.max(0, (opcoes.inicio ?? Date.now()) + MINIMO_DA_BUSCA_MS - Date.now());
        const busca = lerTags(dados).then(
            (resultado) => ({ resultado }),
            () => null,
        );
        const promessa: Promise<LeituraDeTags | null> = Promise.all([busca, esperar(resto)]).then(([r]) => {
            // Resposta antiga que chega depois de uma nova é descartada.
            if (ultima.current?.promessa !== promessa) return r?.resultado ?? null;
            setEstado(r ? { status: "pronto", resultado: r.resultado } : { status: "erro" });
            if (!r) ultima.current = null;
            return r?.resultado ?? null;
        });
        ultima.current = { chave, promessa };
        return promessa;
    }, []);

    // Banner novo, recortado de novo ou removido: o Claude lê o recorte e as tags são lidas outra vez.
    const chaveDoBanner = entrada.banner && entrada.recorte ? `${entrada.banner.url}|${JSON.stringify(entrada.recorte)}` : null;
    useEffect(() => {
        if (!entrada.ativo) return;
        if (!chaveDoBanner) {
            leituraDoBanner.current = null;
            if (atual.current.bannerDescricao !== null) {
                atual.current.bannerDescricao = null;
                setBannerDescricao(null);
                void ler();
            }
            return;
        }
        let valendo = true;
        const inicio = Date.now();
        // Com o campo aberto ainda vazio, o banner é lido em silêncio e entra na busca quando ele for escrito.
        if (atual.current.entrada.texto.trim()) setEstado({ status: "lendo", banner: true });
        const { banner, recorte } = atual.current.entrada;
        const leitura = exportarRecorte(banner!, recorte!).then(lerBanner, () => null);
        leituraDoBanner.current = leitura;
        void leitura.then((descricao) => {
            if (!valendo) return;
            atual.current.bannerDescricao = descricao;
            setBannerDescricao(descricao);
            void ler({ inicio });
        });
        return () => {
            valendo = false;
        };
    }, [chaveDoBanner, entrada.ativo, ler]);

    /** Ao criar: espera o banner e a leitura em curso; sem mudança, vale a última leitura; com mudança, lê agora. */
    const garantir = useCallback(async () => {
        if (leituraDoBanner.current) {
            const descricao = await leituraDoBanner.current;
            atual.current.bannerDescricao = descricao;
        }
        return ler({ reaproveitar: true });
    }, [ler]);

    return { estado, bannerDescricao, ler, garantir };
}
