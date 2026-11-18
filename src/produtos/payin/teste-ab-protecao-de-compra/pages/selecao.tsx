import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { CarregandoPagamento } from "../components/carregando-pagamento";
import { type LinhaResumo, Resumo } from "../components/resumo";
import { SetorCard } from "../components/setor-card";
import { BotaoContorno, Topo } from "../components/topo";
import { EVENTO, INGRESSO_POR_ID, SETORES } from "../data/evento";
import { usePedido } from "../data/pedido-store";
import { useForceLightTheme } from "../utils/use-force-light-theme";

/**
 * Teste A/B de proteção de compra, variante B: /payin/teste-ab-protecao-de-compra.
 * Seleção de ingressos sem oferta de proteção: o "Continuar" leva ao checkout, onde o modal faz a oferta.
 */
/** Tempo do carregamento entre o "Continuar" e o checkout (simulado). */
const TEMPO_CARREGAMENTO_MS = 1500;

export function Selecao() {
    useForceLightTheme();
    const navigate = useNavigate();
    const { quantidades, selecionados, subtotal, qtdIngressos, mudarQuantidade, limpar, escolherProtecao } = usePedido();
    const [abertos, setAbertos] = useState<Set<string>>(new Set([SETORES[0].id]));

    const linhas: LinhaResumo[] = selecionados.map(([id, q]) => {
        const ing = INGRESSO_POR_ID[id];
        return { id, quantidade: q, titulo: ing.setor, subtitulo: ing.nome, valor: ing.preco * q };
    });

    const alternarSetor = (id: string) =>
        setAbertos((a) => {
            const n = new Set(a);
            if (n.has(id)) n.delete(id);
            else n.add(id);
            return n;
        });

    const [carregando, setCarregando] = useState(false);
    const espera = useRef<ReturnType<typeof setTimeout>>(undefined);
    useEffect(() => () => clearTimeout(espera.current), []);

    const continuar = () => {
        if (carregando) return;
        // Simula a preparação do pagamento antes de abrir o checkout
        setCarregando(true);
        espera.current = setTimeout(() => {
            // Cada entrada no checkout é uma nova exposição ao modal
            escolherProtecao(null);
            navigate("/payin/teste-ab-protecao-de-compra/checkout");
        }, TEMPO_CARREGAMENTO_MS);
    };

    return (
        <div className="min-h-screen bg-secondary font-['Elza'] text-primary">
            <Topo />

            <main className="mx-auto grid max-w-[1440px] gap-6 px-4 pt-4 pb-8 lg:grid-cols-[minmax(0,1fr)_330px] lg:pb-16">
                <section className="flex min-w-0 flex-col">
                    <p className="text-md text-tertiary">{EVENTO.diaSemana}</p>
                    <p className="text-display-xs font-bold text-primary">{EVENTO.data}</p>

                    <div className="mt-8 flex flex-col gap-2">
                        {SETORES.map((s) => (
                            <SetorCard
                                key={s.id}
                                setor={s}
                                aberto={abertos.has(s.id)}
                                onAlternar={() => alternarSetor(s.id)}
                                quantidades={quantidades}
                                onQuantidade={mudarQuantidade}
                            />
                        ))}
                    </div>
                </section>

                <div className="flex flex-col gap-7">
                    <div className="hidden lg:flex">
                        <BotaoContorno>Adicionar código ou cupom</BotaoContorno>
                    </div>
                    <div className="lg:sticky lg:top-4">
                        <Resumo
                            linhas={linhas}
                            total={subtotal}
                            qtdItens={qtdIngressos}
                            onRemover={(id) => mudarQuantidade(id, 0)}
                            onRemoverTudo={limpar}
                            onContinuar={continuar}
                        />
                    </div>
                </div>
            </main>

            {carregando && <CarregandoPagamento />}
        </div>
    );
}
