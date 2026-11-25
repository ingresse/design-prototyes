import { Outlet } from "react-router";
import { EquipeV3Provider } from "../equipe-de-operacao-v3/data/equipe-v3-store";
import { RemixProvider } from "./remix/remix-context";

/** Backstage antigo: telas publicadas antes da troca de layout, com o shell e os dados de 30/10/2026.
 *  O Remix e a store das cotas são os daquela data, separados dos do Backstage atual. */
export function BackstageOldRotas() {
    return (
        <RemixProvider>
            <EquipeV3Provider>
                <Outlet />
            </EquipeV3Provider>
        </RemixProvider>
    );
}
