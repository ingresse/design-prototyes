/* ------------------------------------------------------------------ */
/*  Pré-calcula os vetores (embedding) das tags de evento              */
/*                                                                     */
/*  Rodar depois de mudar src/plataforma/categorias-catalogo.ts:       */
/*    node --experimental-strip-types ia-local/vetores-catalogo.mjs    */
/*                                                                     */
/*  Mesmo modelo do Hugging Face que o navegador usa. O vetor de cada   */
/*  tag é a média dos vetores do nome e de cada termo. A               */
/*  assinatura (nome + termos) deixa o navegador recalcular sozinho    */
/*  uma tag que mudou e não foi regravada aqui.                        */
/* ------------------------------------------------------------------ */

import { writeFileSync } from "node:fs";
import { pipeline } from "@xenova/transformers";
import { TAGS } from "../src/plataforma/categorias-catalogo.ts";

const MODELO = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
const DESTINO = new URL("../src/plataforma/categorias-catalogo-vetores.json", import.meta.url);

const extrator = await pipeline("feature-extraction", MODELO);
const vetorDe = async (t) => Array.from((await extrator(t, { pooling: "mean", normalize: true })).data);

const saida = { modelo: MODELO, vetores: {} };
for (const c of TAGS) {
    const textos = [c.nome, ...c.termos];
    const soma = new Array(384).fill(0);
    for (const t of textos) (await vetorDe(t)).forEach((x, i) => (soma[i] += x));
    const n = Math.hypot(...soma);
    saida.vetores[c.id] = { assinatura: textos.join("|"), vetor: soma.map((x) => Math.round((x / n) * 1e4) / 1e4) };
    process.stdout.write(".");
}
writeFileSync(DESTINO, JSON.stringify(saida));
console.log(`\n${TAGS.length} tags gravadas em ${DESTINO.pathname}`);
