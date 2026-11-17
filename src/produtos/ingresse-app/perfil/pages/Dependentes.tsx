import { MULTIPERFIS } from "../../components/funcionalidades";
import { DependentesClassico } from "./dependentes-classico";
import { DependentesMultiperfis } from "./dependentes-multiperfis";

/** Lista de dependentes: a versão com acesso aos perfis só com a chave ligada. */
export const Dependentes = MULTIPERFIS ? DependentesMultiperfis : DependentesClassico;
