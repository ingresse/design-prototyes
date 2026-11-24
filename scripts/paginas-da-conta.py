"""Gera as páginas da área logada do novo site (public/novo-site/*.dc.html) a partir do cabeçalho e do rodapé da Carteira.
As telas em si são montadas por conta.js (estilos em conta.css). Rode de novo se o cabeçalho ou o rodapé da Carteira mudarem:
    python3 scripts/paginas-da-conta.py
"""
import re, pathlib
raiz = pathlib.Path(__file__).resolve().parent.parent / "public" / "novo-site"
cart = (raiz / "Carteira.dc.html").read_text(encoding="utf8")
cab = cart[cart.index('<header class="hdr">'):cart.index("</header>") + len("</header>")]
rod_i = cart.index("<footer"); rod = cart[rod_i:cart.index("</footer>", rod_i) + len("</footer>")]

PAGINAS = [
    ("Compras.dc.html", "compras", "Minhas compras"),
    ("Conta.dc.html", "dados", "Meus dados"),
    ("Dependentes.dc.html", "dependentes", "Dependentes"),
    ("Pagamentos.dc.html", "pagamentos", "Formas de pagamento"),
    ("Dispositivos.dc.html", "dispositivos", "Dispositivos verificados"),
    ("Seguranca.dc.html", "seguranca", "Privacidade e segurança"),
    ("Facial.dc.html", "facial", "Cadastro facial"),
]
CSS = ["theme.css", "base.css", "ux.css", "ds.css", "identidade-v1.css", "cidade-cabecalho.css", "lembretes.css", "menu-conta.css", "conta.css"]
JS_CABECA = ["ponte-backstage.js"]
JS_FIM = ["theme.js", "ux.js", "modal-uui.js", "local.js", "local-ui.js", "lugares-consulta.js", "cidade-cabecalho.js", "lembretes.js",
          "vendor/lottie_svg.min.js", "icones-motion.js", "menu-conta.js"]
EXTRA = {"dependentes": ["rosto.js", "dependentes.js"]}

for arquivo, tela, titulo in PAGINAS:
    css = "\n".join(f'<link rel="stylesheet" href="./{c}">' for c in CSS)
    js1 = "\n".join(f'<script src="./{j}"></script>' for j in JS_CABECA)
    js2 = "\n".join(f'<script src="./{j}"></script>' for j in JS_FIM + EXTRA.get(tela, []) + ["conta.js"])
    html = f"""<!doctype html>
<html lang="pt-BR" data-pagina="conta-{tela}" data-superficie="chao">
<head>
<meta charset="utf-8">
{js1}
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{titulo} · Ingresse</title>
<link rel="preload" href="./fontes/Elza-Semibold.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="./fontes/Elza-Regular.woff2" as="font" type="font/woff2" crossorigin>
{css}
</head>
<body>
<!-- Página da área logada gerada por scripts/paginas-da-conta.py (design-prototypes). A tela é montada por conta.js. -->
{cab}
<main class="ct" data-tela="{tela}" id="conteudo"></main>
{rod}
{js2}
</body>
</html>
"""
    (raiz / arquivo).write_text(html, encoding="utf8")
    print("ok", arquivo)
