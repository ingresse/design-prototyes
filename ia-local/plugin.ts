import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

/* ------------------------------------------------------------------ */
/*  IA local: o Claude logado nesta máquina lê o banner do evento      */
/*                                                                     */
/*  Único papel do Claude na classificação: descrever o banner em uma  */
/*  frase. A descrição vai para o embedding (modelo do Hugging Face,   */
/*  no navegador) junto do texto, do nome e da descrição do evento.    */
/*                                                                     */
/*  Só existe no `npm run dev` (apply: "serve"): na Vercel não há      */
/*  ponte e a classificação segue sem o banner. Chama o `claude -p`    */
/*  com o login de quem roda, sem API key e sem outra plataforma.      */
/*  O prompt é montado aqui (a página só manda a imagem) e o Claude    */
/*  roda sem ferramentas: só lê e responde.                            */
/*                                                                     */
/*  GET  /api/ia-local                       → { ok: true } (a ponte existe)
 *  POST /api/ia-local { imagem: dataUrl }   → { ok: true, descricao }
 */

const MODELO = "sonnet";
const TEMPO_LIMITE_MS = 120_000;

/** Uma mensagem para o `claude -p`, com imagem opcional. Devolve o texto da resposta. */
function perguntarAoClaude(sistema: string, texto: string, imagem?: { tipo: string; base64: string }): Promise<string> {
    return new Promise((resolve, reject) => {
        // Sem ANTHROPIC_API_KEY no ambiente, o CLI usa o login da pessoa (assinatura), não uma chave paga à parte.
        const env = { ...process.env };
        delete env.ANTHROPIC_API_KEY;
        const filho = spawn(
            "claude",
            [
                "-p",
                "--input-format", "stream-json",
                "--output-format", "stream-json",
                "--verbose",
                "--model", MODELO,
                // Sem ferramentas, MCP, configurações ou sessão gravada: só a pergunta e a resposta.
                "--tools", "",
                "--strict-mcp-config",
                "--setting-sources", "",
                "--no-session-persistence",
                "--system-prompt", sistema,
            ],
            // Fora do repositório, para não carregar o CLAUDE.md do projeto.
            { cwd: tmpdir(), env, stdio: ["pipe", "pipe", "pipe"] },
        );

        let saida = "";
        let erro = "";
        const relogio = setTimeout(() => {
            filho.kill("SIGTERM");
            reject(new Error("O Claude demorou demais para responder."));
        }, TEMPO_LIMITE_MS);

        filho.stdout.on("data", (b) => (saida += b));
        filho.stderr.on("data", (b) => (erro += b));
        filho.on("error", (e) => {
            clearTimeout(relogio);
            reject(new Error(`Não deu para abrir o claude (${e.message}). Ele está instalado e logado?`));
        });
        filho.on("close", () => {
            clearTimeout(relogio);
            const linha = saida.split("\n").find((l) => l.includes('"type":"result"'));
            if (!linha) return reject(new Error(erro.trim() || "O claude não devolveu resposta."));
            const r = JSON.parse(linha) as { is_error?: boolean; result?: string };
            if (r.is_error || !r.result) return reject(new Error(r.result || "O claude devolveu erro."));
            resolve(r.result.trim());
        });

        const conteudo: unknown[] = [];
        if (imagem) conteudo.push({ type: "image", source: { type: "base64", media_type: imagem.tipo, data: imagem.base64 } });
        conteudo.push({ type: "text", text: texto });
        filho.stdin.end(`${JSON.stringify({ type: "user", message: { role: "user", content: conteudo } })}\n`);
    });
}

/* ---------------- leitura do banner ---------------- */

async function lerBanner(dataUrl: string) {
    const m = /^data:(image\/(?:png|jpeg));base64,(.+)$/.exec(dataUrl);
    if (!m) throw new Error("Mande o banner como PNG ou JPG.");
    const descricao = await perguntarAoClaude(
        "Você lê banners de eventos de uma plataforma de ingressos brasileira. Responda só com a descrição, em português, sem aspas.",
        "Em uma frase de até 30 palavras, descreva o que este banner mostra e que tipo de evento ele anuncia (gênero musical, festa, espetáculo, público). Cite textos importantes escritos na arte. Não use travessão.",
        { tipo: m[1], base64: m[2] },
    );
    return { descricao };
}

/* ---------------- HTTP ---------------- */

const lerCorpo = (req: IncomingMessage) =>
    new Promise<string>((resolve, reject) => {
        let corpo = "";
        req.on("data", (b) => (corpo += b));
        req.on("end", () => resolve(corpo));
        req.on("error", reject);
    });

const responder = (res: ServerResponse, status: number, dados: unknown) => {
    res.statusCode = status;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(dados));
};

export function iaLocal(): Plugin {
    return {
        name: "ia-local",
        apply: "serve",
        configureServer(server) {
            server.middlewares.use("/api/ia-local", async (req, res) => {
                if (req.method === "GET") return responder(res, 200, { ok: true });
                if (req.method !== "POST") return responder(res, 405, { ok: false, erro: "Use GET ou POST." });
                try {
                    const corpo = JSON.parse(await lerCorpo(req)) as { imagem?: string };
                    if (!corpo.imagem) return responder(res, 400, { ok: false, erro: "Mande a imagem do banner." });
                    return responder(res, 200, { ok: true, ...(await lerBanner(corpo.imagem)) });
                } catch (e) {
                    return responder(res, 500, { ok: false, erro: e instanceof Error ? e.message : String(e) });
                }
            });
        },
    };
}
