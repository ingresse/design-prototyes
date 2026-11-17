/** Baixa um CSV (separado por ponto e vírgula, com BOM para o Excel abrir os acentos certos). */
export function baixarCsv(nome: string, linhas: Array<Array<string | number>>) {
    const celula = (valor: string | number) => (typeof valor === "number" ? String(valor) : `"${valor.replace(/"/g, '""')}"`);
    const arquivo = new Blob([`﻿${linhas.map((l) => l.map(celula).join(";")).join("\n")}`], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(arquivo);
    link.download = nome;
    link.click();
    URL.revokeObjectURL(link.href);
}

/** dd/mm/aaaa para colunas de data. */
export const dataDoCsv = (iso: string) => iso.split("-").reverse().join("/");
