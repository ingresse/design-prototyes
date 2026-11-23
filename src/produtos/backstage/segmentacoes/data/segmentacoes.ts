import { novoId, type Segmentacao } from "@/plataforma";
import { useSegmentacoesDaOrganizacao } from "../../components/segmentacoes-da-organizacao";

/*
 * Segmentações do público (SEG), as regras de produção: nome, idade, lista manual de documentos (CPF
 * ou passaporte; até 1 mil por vez e 100 mil por segmento) e documento exigido no checkout. Sem
 * gravação, valem as sete PNE que o formulário de participação e os ingressos já usam.
 */

export const LIMITE_POR_VEZ = 1000;
export const LIMITE_POR_SEGMENTO = 100_000;
/** Teto do arquivo CSV, o que o texto da tela sempre disse (SEG-66). */
export const LIMITE_POR_ARQUIVO = 10_000;
export const ARQUIVO_MAX_BYTES = 2 * 1024 * 1024;

/** A lista e a gravação ficam no componente compartilhado do Backstage, porque Público e Ingressos também usam. */
export const useSegmentacoes = useSegmentacoesDaOrganizacao;

export const novaSegmentacao = (): Segmentacao => ({ id: novoId("seg"), nome: "", documentos: [], documentoNoCheckout: "nenhum", atualizadoEm: new Date().toISOString() });

/** CPF com 11 dígitos e dígitos verificadores certos. */
export function cpfValido(v: string) {
    const d = v.replace(/\D/g, "");
    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
    const dv = (n: number) => {
        let soma = 0;
        for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
        const r = (soma * 10) % 11;
        return r === 10 ? 0 : r;
    };
    return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

/** Passaporte: 6 a 9 letras ou números. */
export const passaporteValido = (v: string) => /^[A-Za-z0-9]{6,9}$/.test(v);

/** Classifica o que foi digitado: CPF (só dígitos ou com máscara) ou passaporte; o resto é inválido. */
export function lerDocumentos(texto: string) {
    const itens = texto
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    const validos: Segmentacao["documentos"] = [];
    const invalidos: string[] = [];
    for (const it of itens) {
        const digitos = it.replace(/[.\-]/g, "");
        if (/^\d{11}$/.test(digitos) && cpfValido(digitos)) validos.push({ documento: digitos, tipo: "cpf" });
        else if (!/^\d+$/.test(digitos) && passaporteValido(it)) validos.push({ documento: it.toUpperCase(), tipo: "passaporte" });
        else invalidos.push(it);
    }
    return { validos, invalidos };
}

/** Junta sem repetir (a lista nova soma à existente, SEG-24). */
export const juntarDocumentos = (atuais: Segmentacao["documentos"], novos: Segmentacao["documentos"]) => {
    const vistos = new Set(atuais.map((d) => d.documento));
    return [...atuais, ...novos.filter((d) => !vistos.has(d.documento) && vistos.add(d.documento))];
};

/** Resumo da faixa de idade em palavras (SEG-61): "Qualquer idade", "A partir de 18 anos", "Até 60 anos", "De 18 a 60 anos". */
export const resumoDaIdade = (min?: number, max?: number) => {
    if (min == null && max == null) return "Qualquer idade";
    if (max == null) return `A partir de ${min} anos`;
    if (min == null) return `Até ${max} anos`;
    return min === max ? `${min} anos` : `De ${min} a ${max} anos`;
};

/** Resumo dos critérios para a lista (SEG-67): o que define o segmento, no lugar da descrição repetida. */
export const resumoDosCriterios = (s: Segmentacao) => {
    const partes: string[] = [];
    if (s.idadeMinima != null || s.idadeMaxima != null) partes.push(resumoDaIdade(s.idadeMinima, s.idadeMaxima));
    if (s.documentoNoCheckout === "cie") partes.push("pede CIE no checkout");
    if (partes.length === 0) return "Lista de documentos";
    return partes.join(", ").replace(/^./, (c) => c.toUpperCase());
};

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
/** "26 nov 2026, 20:00": o formato de data de Público (PUB-109). */
export const ultimaAtualizacao = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** CPF com máscara, para leitura. */
export const mascararCpf = (d: string) => d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
