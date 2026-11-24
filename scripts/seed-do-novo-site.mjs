/*
 * Gera public/novo-site/_api/seed-backstage.json: os eventos e o histórico de vendas da seed do banco (src/plataforma/db/seed.ts),
 * para o novo site (cópia estática) mostrar os eventos do Backstage mesmo em navegador onde o Backstage nunca abriu.
 * A ponte (public/novo-site/ponte-backstage.js) completa o banco do navegador com estes documentos, sem sobrescrever o que já existe.
 *
 * Rode sempre que mudar a seed:  npm run seed:site
 */
import { build } from "esbuild";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tmp = resolve(raiz, "node_modules/.cache/seed-do-novo-site.mjs");
mkdirSync(dirname(tmp), { recursive: true });
await build({ entryPoints: [resolve(raiz, "src/plataforma/db/seed.ts")], bundle: true, format: "esm", platform: "node", outfile: tmp, alias: { "@": resolve(raiz, "src") }, logLevel: "warning" });
const { SEED, SEED_VERSAO } = await import(pathToFileURL(tmp).href + "?t=" + Date.now());
rmSync(tmp, { force: true });
const saida = resolve(raiz, "public/novo-site/_api/seed-backstage.json");
writeFileSync(saida, JSON.stringify({ versao: SEED_VERSAO, eventos: SEED.eventos, historico: SEED.historico, pedidos: SEED.pedidos, ingressos: SEED.ingressos }));
console.log(`seed do site: ${SEED.eventos.length} eventos, ${SEED.historico.length} históricos, ${SEED.pedidos.length} pedidos, ${SEED.ingressos.length} ingressos (versão ${SEED_VERSAO}) -> ${saida}`);
