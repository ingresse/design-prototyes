import { useEffect, useRef, useState } from "react";
import { useCorDeParticulas } from "../../components/campo-de-particulas";
import { cx } from "@/utils/cx";
import { NUMERO_DO_RELATORIO, PainelDoRelatorio } from "./visual-dos-relatorios";

/*
 * Funil de vendas ao vivo (REL-205 a REL-208): as quatro etapas da compra lado a lado, com quantas
 * pessoas estão em cada uma agora. O volume vira partículas que correm da esquerda para a direita
 * dentro de um funil: a altura de cada trecho é proporcional ao volume da etapa e, na passagem de
 * uma etapa para a outra, a fração que não segue some na linha azul. Como todas andam na mesma
 * velocidade, a quantidade de partículas em cada trecho fica proporcional ao volume.
 *
 * Os números são simulados e variam a cada poucos segundos para mostrar o ao vivo. Canvas 2D nativo,
 * a mesma família visual das partículas do guia; respeita reduzir movimento e pausa fora de vista.
 */

export const ETAPAS_DO_FUNIL = ["Seleção de ingresso", "Produto", "Atribuição", "Pagamento"] as const;

/** Intervalo entre duas leituras simuladas. */
const LEITURA_MS = 2200;
const ALTURA_DO_FUNIL = 200;
/** Fração da altura do canvas ocupada pela primeira etapa e piso das etapas estreitas. */
const ALTURA_MAXIMA = 0.92;
const ALTURA_MINIMA = 0.1;
/** Velocidade em larguras por segundo (atravessa o funil em ~12 s). */
const VELOCIDADE = 0.08;
/**
 * Padrões leves (REL-209): as partículas escorrem para onde o campo f ≈ 0, como na figura de Chladni
 * do guia. O padrão se alterna: filetes ondulados e figuras cimáticas, com troca suave entre eles.
 */
type Padrao = { tipo: "filetes"; filetes: number; ondulacao: number } | { tipo: "cimatico"; m: number; n: number; a: number; b: number };
const PADROES: Padrao[] = [
    { tipo: "filetes", filetes: 7, ondulacao: 2.2 },
    { tipo: "cimatico", m: 3, n: 5, a: 1, b: 1 },
    { tipo: "filetes", filetes: 5, ondulacao: 3.4 },
    { tipo: "cimatico", m: 4, n: 7, a: 1, b: -1 },
    { tipo: "filetes", filetes: 9, ondulacao: 1.4 },
    { tipo: "cimatico", m: 2, n: 5, a: 1, b: 1 },
];
/** Cada padrão fica parado 70% do ciclo e migra para o próximo no resto. */
const CICLO_DO_PADRAO_MS = 14000;
const PARADA_DO_PADRAO = 0.7;
/** Aumenta as células da figura cimática no funil comprido. */
const ESCALA_CIMATICA = 2.4;
const PASSO_DO_PADRAO = 0.05;
const PASSO_MINIMO = 0.004;

/** Lê um token de cor do DS (variável CSS) como [r, g, b]; canvas não lê classe do Tailwind. */
function corDoToken(variavel: string): [number, number, number] {
    const valor = getComputedStyle(document.documentElement).getPropertyValue(variavel).trim();
    const c = document.createElement("canvas").getContext("2d");
    if (!c || !valor) return [37, 99, 235];
    c.fillStyle = valor;
    const n = c.fillStyle;
    if (n.startsWith("#")) return [parseInt(n.slice(1, 3), 16), parseInt(n.slice(3, 5), 16), parseInt(n.slice(5, 7), 16)];
    const m = n.match(/[\d.]+/g)?.map(Number) ?? [37, 99, 235];
    return [m[0], m[1], m[2]];
}

const numero = new Intl.NumberFormat("pt-BR");
const percentual = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0 });

const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const suavizar = (t: number) => t * t * (3 - 2 * t);

/**
 * Leitura inicial e passeio aleatório das próximas (REL-207): entrada e taxas de passagem andam um
 * pouco a cada leitura. Calibrado pela conversão média (12%): quase 80% sai na seleção de ingresso,
 * quase todo mundo segue até a atribuição e metade de quem atribui chega ao pagamento (REL-248: desde
 * 23/11/2026 o pagamento tem metade do volume de antes, quando quase todos chegavam e a média era 23%).
 */
export const CONVERSAO_MEDIA = 0.12;
const TAXAS_INICIAIS = [0.25, 0.96, 0.48];
const FAIXAS_DAS_TAXAS: ReadonlyArray<readonly [number, number, number]> = [
    // [mínimo, máximo, passo]
    [0.21, 0.29, 0.012],
    [0.92, 0.99, 0.008],
    [0.46, 0.5, 0.004],
];
function useVolumesAoVivo() {
    const [estado, setEstado] = useState({ entrada: 1248, taxas: TAXAS_INICIAIS });
    useEffect(() => {
        const id = window.setInterval(() => {
            setEstado(({ entrada, taxas }) => ({
                entrada: Math.round(limitar(entrada + (Math.random() * 2 - 1) * 60, 950, 1550)),
                taxas: taxas.map((t, i) => {
                    const [min, max, passo] = FAIXAS_DAS_TAXAS[i];
                    return limitar(t + (Math.random() * 2 - 1) * passo, min, max);
                }),
            }));
        }, LEITURA_MS);
        return () => window.clearInterval(id);
    }, []);
    const volumes = [estado.entrada];
    estado.taxas.forEach((t, i) => volumes.push(Math.round(volumes[i] * t)));
    return volumes;
}

/** Número que corre até o valor novo em vez de trocar de uma vez. */
function useNumeroAnimado(alvo: number, duracao = 700) {
    const [valor, setValor] = useState(alvo);
    const atual = useRef(alvo);
    useEffect(() => {
        const reduzir = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
        const de = atual.current;
        if (reduzir || de === alvo) {
            atual.current = alvo;
            setValor(alvo);
            return;
        }
        let quadro = 0;
        const inicio = performance.now();
        const passo = (agora: number) => {
            const k = suavizar(Math.min(1, (agora - inicio) / duracao));
            atual.current = Math.round(de + (alvo - de) * k);
            setValor(atual.current);
            if (k < 1) quadro = requestAnimationFrame(passo);
        };
        quadro = requestAnimationFrame(passo);
        return () => cancelAnimationFrame(quadro);
    }, [alvo, duracao]);
    return valor;
}

function CabecalhoDaEtapa({ indice, volume, anterior }: { indice: number; volume: number; anterior?: number }) {
    const mostrado = useNumeroAnimado(volume);
    const ultima = indice === ETAPAS_DO_FUNIL.length - 1;
    return (
        <div className="flex min-w-0 flex-col gap-3">
            {/* Trilho com os nós das etapas, como uma linha de produção. */}
            <div aria-hidden="true" className="flex items-center">
                <span className="size-2 shrink-0 rotate-45 rounded-[2px] bg-fg-quaternary" />
                <span className="h-px flex-1 bg-border-primary" />
                {ultima && <span className="size-2 shrink-0 rotate-45 rounded-[2px] bg-fg-quaternary" />}
            </div>
            <div className="flex min-w-0 flex-col gap-1 pr-2">
                <span className="text-xs font-medium text-quaternary">{ETAPAS_DO_FUNIL[indice]}</span>
                <span className={cx(NUMERO_DO_RELATORIO, "text-xl font-semibold md:text-display-xs")}>{numero.format(mostrado)}</span>
                <span className="truncate text-sm text-tertiary">
                    {anterior === undefined ? "pessoas agora" : `${percentual.format(anterior > 0 ? volume / anterior : 0)} da etapa anterior`}
                </span>
            </div>
        </div>
    );
}

/** O funil de partículas. Lê os volumes por referência, então nunca reinicia ao mudar a leitura. */
function FunilDeParticulas({ volumes, cor }: { volumes: number[]; cor: string }) {
    const ref = useRef<HTMLCanvasElement | null>(null);
    const volumesAtuais = useRef(volumes);
    volumesAtuais.current = volumes;
    const corAtual = useRef(cor);
    corAtual.current = cor;

    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return;
        let ctx: CanvasRenderingContext2D;
        try {
            const c = canvas.getContext("2d");
            if (!c) return;
            ctx = c;
        } catch {
            return;
        }

        const reduzir = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
        const etapas = ETAPAS_DO_FUNIL.length;
        // blue-600 do DS (REL-210).
        const azul = corDoToken("--color-blue-600");
        let largura = 1;
        let altura = 1;
        let dpr = 1;
        let quadro = 0;
        let rodando = false;
        let antes = 0;

        // Alturas mostradas (0–1) que andam até as pedidas, para o funil respirar sem saltos.
        const alturaPedida = () => {
            const v = volumesAtuais.current;
            return v.map((x) => limitar((x / Math.max(1, v[0])) * ALTURA_MAXIMA, ALTURA_MINIMA, ALTURA_MAXIMA));
        };
        const alturas = alturaPedida();

        // Meia altura do funil em x: constante no centro de cada etapa, suave entre os centros.
        const meiaAltura = (x: number) => {
            const p = x * etapas - 0.5;
            if (p <= 0) return alturas[0] / 2;
            if (p >= etapas - 1) return alturas[etapas - 1] / 2;
            const i = Math.floor(p);
            const k = suavizar(p - i);
            return (alturas[i] + (alturas[i + 1] - alturas[i]) * k) / 2;
        };
        // Chance de seguir para a etapa i (i ≥ 1).
        const seguir = (i: number) => {
            const v = volumesAtuais.current;
            return v[i - 1] > 0 ? limitar(v[i] / v[i - 1], 0, 1) : 0;
        };

        const r0 = canvas.getBoundingClientRect();
        const total = Math.round(limitar((Math.max(1, r0.width) * ALTURA_DO_FUNIL) / 22, 900, 7000));
        const xs = new Float32Array(total);
        const faixas = new Float32Array(total);
        const velocidades = new Float32Array(total);
        const etapaDe = new Uint8Array(total);

        const fracaoDaEtapa = (i: number) => {
            let f = 1;
            for (let j = 1; j <= i; j++) f *= seguir(j);
            return f;
        };
        const nascer = (i: number, x: number) => {
            xs[i] = x;
            faixas[i] = Math.random() * 2 - 1;
            velocidades[i] = VELOCIDADE * (0.9 + Math.random() * 0.2);
            etapaDe[i] = limitar(Math.floor(x * etapas), 0, etapas - 1);
        };
        // Começa já no regime: amostra x pela fração de cada etapa (rejeição).
        for (let i = 0; i < total; i++) {
            let x = Math.random();
            while (Math.random() > fracaoDaEtapa(limitar(Math.floor(x * etapas), 0, etapas - 1))) x = Math.random();
            nascer(i, x);
        }

        const redimensionar = () => {
            const r = canvas.getBoundingClientRect();
            dpr = Math.min(2, window.devicePixelRatio || 1);
            largura = Math.max(1, Math.floor(r.width));
            altura = Math.max(1, Math.floor(r.height));
            canvas.width = largura * dpr;
            canvas.height = altura * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        // Passo aleatório proporcional a |f|: onde f ≈ 0 a partícula quase para, então elas se juntam
        // em filetes que ondulam ao longo do funil e com o tempo (REL-209).
        const campoDo = (p: Padrao, x: number, u: number, tempo: number) => {
            if (p.tipo === "filetes") return Math.sin(Math.PI * p.filetes * u + p.ondulacao * Math.sin(Math.PI * 2 * (x * 1.3 - tempo / 9000)));
            // Figura de Chladni no retângulo do funil: x esticado pela proporção para as células ficarem
            // quadradas. A figura anda junto com o fluxo, senão as partículas atravessam as células
            // antes de assentar e a figura não aparece.
            x -= (VELOCIDADE * tempo) / 1000;
            const proporcao = largura / Math.max(1, altura);
            const nx = Math.max(1, Math.round((p.n * proporcao) / ESCALA_CIMATICA));
            const mx = Math.max(1, Math.round((p.m * proporcao) / ESCALA_CIMATICA));
            return p.a * Math.sin(Math.PI * nx * x) * Math.sin(Math.PI * p.m * u) + p.b * Math.sin(Math.PI * mx * x) * Math.sin(Math.PI * p.n * u);
        };
        // Padrão do momento: o atual e o próximo, misturados durante a troca.
        let padraoDe = PADROES[0];
        let padraoPara = PADROES[0];
        let mistura = 0;
        const definirPadrao = (tempo: number) => {
            const ciclo = tempo / CICLO_DO_PADRAO_MS;
            const indice = Math.floor(ciclo);
            const fase = ciclo - indice;
            padraoDe = PADROES[indice % PADROES.length];
            padraoPara = PADROES[(indice + 1) % PADROES.length];
            mistura = fase <= PARADA_DO_PADRAO ? 0 : suavizar((fase - PARADA_DO_PADRAO) / (1 - PARADA_DO_PADRAO));
        };
        const passoDoPadrao = (i: number, tempo: number) => {
            const u = (faixas[i] + 1) / 2;
            const de = campoDo(padraoDe, xs[i], u, tempo);
            const f = mistura > 0 ? de + (campoDo(padraoPara, xs[i], u, tempo) - de) * mistura : de;
            const amp = Math.max(PASSO_MINIMO, PASSO_DO_PADRAO * Math.abs(f));
            faixas[i] = limitar(faixas[i] + (Math.random() * 2 - 1) * amp, -1, 1);
        };

        const avancar = (dt: number, tempo: number) => {
            definirPadrao(tempo);
            const pedidas = alturaPedida();
            const k = 1 - Math.exp(-dt * 2.5);
            for (let e = 0; e < etapas; e++) alturas[e] += (pedidas[e] - alturas[e]) * k;

            for (let i = 0; i < total; i++) {
                xs[i] += velocidades[i] * dt;
                if (xs[i] >= 1) {
                    nascer(i, -Math.random() * 0.03);
                    continue;
                }
                passoDoPadrao(i, tempo);

                const agora = limitar(Math.floor(xs[i] * etapas), 0, etapas - 1);
                if (agora > etapaDe[i]) {
                    etapaDe[i] = agora;
                    // Quem não segue some na linha azul e volta a entrar no começo do funil.
                    if (Math.random() > seguir(agora)) nascer(i, -Math.random() * 0.03);
                }
            }
        };

        const pintar = (tempo: number) => {
            ctx.clearRect(0, 0, largura, altura);
            ctx.fillStyle = corAtual.current;
            const meio = altura / 2;
            const t = tempo / 1000;
            const [r, g, b] = azul;
            const azulCom = (a: number) => `rgba(${r},${g},${b},${a})`;

            // Dentro do funil: uma passada só, opaca.
            ctx.fillStyle = corAtual.current;
            ctx.globalAlpha = 1;
            for (let i = 0; i < total; i++) {
                if (xs[i] < 0) continue;
                const y = meio + faixas[i] * meiaAltura(xs[i]) * altura;
                ctx.fillRect(xs[i] * largura, y, 1.5, 1.5);
            }

            // A divisa entre as etapas por cima, em blue-600, com brilho que pulsa de leve.
            ctx.save();
            ctx.shadowColor = azulCom(0.9);
            ctx.shadowBlur = 12 + 4 * Math.sin(t * 1.6);
            ctx.fillStyle = azulCom(1);
            for (let e = 1; e < etapas; e++) {
                const x = (e / etapas) * largura;
                const h = meiaAltura(e / etapas) * altura + 6;
                ctx.fillRect(x - 1, meio - h, 2, h * 2);
            }
            ctx.restore();
        };

        const desenhar = (tempo: number) => {
            try {
                const dt = antes ? Math.min(0.05, (tempo - antes) / 1000) : 0.016;
                antes = tempo;
                avancar(dt, tempo);
                pintar(tempo);
                if (rodando) quadro = requestAnimationFrame(desenhar);
            } catch {
                rodando = false;
            }
        };
        const iniciar = () => {
            if (rodando || reduzir) return;
            rodando = true;
            antes = 0;
            quadro = requestAnimationFrame(desenhar);
        };
        const parar = () => {
            rodando = false;
            cancelAnimationFrame(quadro);
        };
        const aoMudarVisibilidade = () => (document.hidden ? parar() : iniciar());

        redimensionar();
        // Já começa com os filetes formados, sem esperar as partículas escorrerem.
        for (let passo = 0; passo < 220; passo++) for (let i = 0; i < total; i++) passoDoPadrao(i, 0);
        const observador = new ResizeObserver(() => {
            redimensionar();
            if (reduzir) pintar(0);
        });
        observador.observe(canvas);
        document.addEventListener("visibilitychange", aoMudarVisibilidade);
        if (reduzir) pintar(0);
        else iniciar();

        return () => {
            parar();
            observador.disconnect();
            document.removeEventListener("visibilitychange", aoMudarVisibilidade);
        };
    }, []);

    return <canvas ref={ref} aria-hidden="true" className="pointer-events-none block w-full" style={{ height: ALTURA_DO_FUNIL }} />;
}

function AoVivo() {
    return (
        <span className="inline-flex items-center gap-2 rounded-full bg-primary px-2.5 py-1 text-sm font-medium text-secondary ring-1 ring-secondary ring-inset">
            <span aria-hidden="true" className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-fg-success-secondary opacity-75 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2 rounded-full bg-fg-success-secondary" />
            </span>
            Ao vivo
        </span>
    );
}

/** Painel do funil ao vivo, para o relatório de vendas. */
export function FunilAoVivo() {
    const volumes = useVolumesAoVivo();
    const cor = useCorDeParticulas({ escuro: 0.7, claro: 0.6 });
    const conversao = volumes[0] > 0 ? volumes[volumes.length - 1] / volumes[0] : 0;

    return (
        <PainelDoRelatorio titulo="Funil de vendas ao vivo" subtitulo="Quantas pessoas estão em cada etapa da compra agora" acoes={<AoVivo />}>
            <div className="flex flex-col gap-4 px-5 pt-6 pb-5">
                <div className="grid grid-cols-4">
                    {ETAPAS_DO_FUNIL.map((_, i) => (
                        <CabecalhoDaEtapa key={i} indice={i} volume={volumes[i]} anterior={i > 0 ? volumes[i - 1] : undefined} />
                    ))}
                </div>

                {/* As divisas entre as etapas são as linhas azuis, desenhadas no próprio canvas. */}
                <FunilDeParticulas volumes={volumes} cor={cor} />

                <p className="text-sm text-tertiary">
                    <span className={cx(NUMERO_DO_RELATORIO, "font-semibold")}>{percentual.format(conversao)}</span> de quem escolhe o ingresso chega ao pagamento agora. Média: {percentual.format(CONVERSAO_MEDIA)}.
                </p>
            </div>
        </PainelDoRelatorio>
    );
}
