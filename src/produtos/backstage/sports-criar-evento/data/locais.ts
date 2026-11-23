/* ------------------------------------------------------------------ */
/*  Busca de local (mesmo padrão do Criar evento do AWA, EVT-65)       */
/*  Em produção, a API de busca de endereço (Google Places) responde;  */
/*  aqui, uma lista simulada. Digitar o nome do lugar ou o endereço    */
/*  (a partir de 2 letras) devolve até 6 sugestões com o endereço      */
/*  completo. Buscar por "erro" simula a falha da API.                 */
/* ------------------------------------------------------------------ */

export interface LocalEncontrado {
    id: string;
    /** Nome do lugar, como no Google (ex.: "Trapiche da Beira-Mar Norte"). */
    nome: string;
    /** Rua, número e bairro. */
    endereco: string;
    /** Cidade e UF. */
    cidade: string;
    cep: string;
}

const LOCAIS_SIMULADOS: LocalEncontrado[] = [
    { id: "trapiche-beira-mar", nome: "Trapiche da Beira-Mar Norte", endereco: "Avenida Jornalista Rubens de Arruda Ramos, 1000, Centro", cidade: "Florianópolis, SC", cep: "88015-700" },
    { id: "parque-coqueiros", nome: "Parque de Coqueiros", endereco: "Rua Desembargador Pedro Silva, 2800, Coqueiros", cidade: "Florianópolis, SC", cep: "88080-701" },
    { id: "lagoa-conceicao", nome: "Avenida das Rendeiras", endereco: "Avenida das Rendeiras, Lagoa da Conceição", cidade: "Florianópolis, SC", cep: "88062-400" },
    { id: "expoville", nome: "Expoville", endereco: "Rua XV de Novembro, 4315, Glória", cidade: "Joinville, SC", cep: "89216-202" },
    { id: "rua-do-principe", nome: "Praça da Bandeira", endereco: "Rua do Príncipe, 330, Centro", cidade: "Joinville, SC", cep: "89201-001" },
    { id: "estrada-graciosa", nome: "Portal da Estrada da Graciosa", endereco: "Estrada da Graciosa, km 1, Zona Rural", cidade: "Morretes, PR", cep: "83350-000" },
    { id: "parque-ibirapuera", nome: "Parque Ibirapuera, Portão 3", endereco: "Avenida Pedro Álvares Cabral, s/n, Vila Mariana", cidade: "São Paulo, SP", cep: "04094-050" },
    { id: "usp-raia", nome: "Raia Olímpica da USP", endereco: "Avenida Professor Mello Moraes, 1200, Butantã", cidade: "São Paulo, SP", cep: "05508-030" },
    { id: "aterro-flamengo", nome: "Aterro do Flamengo", endereco: "Avenida Infante Dom Henrique, s/n, Flamengo", cidade: "Rio de Janeiro, RJ", cep: "22210-000" },
    { id: "orla-moscoso", nome: "Praça do Papa", endereco: "Avenida Dante Michelini, s/n, Jardim da Penha", cidade: "Vitória, ES", cep: "29060-235" },
];

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Texto que vai inteiro para o campo ao escolher (UI-FRM-004). */
export const textoDoLocal = (l: LocalEncontrado) => `${l.nome}, ${l.endereco}, ${l.cidade}`;

/** Chamada simulada à busca de endereço (~400 ms). */
export const buscarLocais = (q: string) =>
    new Promise<LocalEncontrado[]>((resolve, reject) => {
        const termo = semAcento(q.trim());
        setTimeout(() => {
            if (termo.includes("erro")) return reject(new Error("falha na busca"));
            if (termo.length < 2) return resolve([]);
            const palavras = termo.split(/[\s,]+/).filter(Boolean);
            resolve(LOCAIS_SIMULADOS.filter((l) => palavras.every((p) => semAcento(`${l.nome} ${l.endereco} ${l.cidade} ${l.cep}`).includes(p))).slice(0, 6));
        }, 400);
    });

export const LOCAL_POR_ID = (id: string) => LOCAIS_SIMULADOS.find((l) => l.id === id) ?? null;
