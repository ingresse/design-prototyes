/*
 * "Exportar em CSV" das Cortesias (COR-56): baixa um arquivo com as linhas do filtro atual, todas as
 * páginas. Separador ";" e BOM para o Excel em português abrir com acentos e colunas certas.
 */

const celula = (valor: string | number) => {
    const texto = String(valor ?? "");
    return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
};

export function baixarCsv(nomeDoArquivo: string, cabecalho: string[], linhas: (string | number)[][]) {
    const conteudo = [cabecalho, ...linhas].map((linha) => linha.map(celula).join(";")).join("\r\n");
    const blob = new Blob(["﻿", conteudo], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nomeDoArquivo;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // O navegador já leu o endereço ao clicar; libera depois para não cortar o download.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Nome do arquivo com a data de hoje: "cortesias-pedidos-2026-11-22.csv". */
export const nomeComData = (base: string) => {
    const d = new Date();
    const p2 = (n: number) => String(n).padStart(2, "0");
    return `${base}-${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}.csv`;
};
