import { Heading as AriaHeading } from "react-aria-components";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { BottomSheet } from "../../components/BottomSheet";
import fotoAmigos from "../../assets/foto-amigos.jpg";
import uberLogo from "../../assets/uber-logo.svg";

/**
 * Comunicação da oferta de crédito Uber ao abrir o app: bottom sheet curto, com o mesmo título da
 * página da oferta para a pessoa reconhecer onde chega. Uma ação principal (ir para a oferta) e uma
 * saída ("Não tenho interesse").
 */
export function OfertaUberSheet({ isOpen, onClose, onAproveitar }: { isOpen: boolean; onClose: () => void; onAproveitar: () => void }) {
    return (
        <BottomSheet isOpen={isOpen} onClose={onClose}>
            <div className="flex flex-col items-center text-center">
                <span aria-hidden="true" className="mb-5 h-1 w-10 rounded-full bg-quaternary" />

                {/* Banner com a foto dos amigos (a mesma do banner da Carteira) e, por cima, o selo da Uber com o desconto */}
                <div className="relative isolate h-40 w-full overflow-hidden rounded-2xl">
                    <img src={fotoAmigos} alt="" aria-hidden="true" className="absolute inset-0 -z-10 size-full object-cover object-[center_45%]" />
                    <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                    <div className="absolute bottom-3 left-3 flex items-center gap-2">
                        <span className="flex size-12 items-center justify-center rounded-xl bg-black ring-1 ring-white/15">
                            <img src={uberLogo} alt="Uber" className="h-3.5 w-auto invert" />
                        </span>
                        <Badge color="success" type="pill-color" size="md" className="whitespace-nowrap">
                            5% off
                        </Badge>
                    </div>
                </div>

                <AriaHeading slot="title" className="mt-5 text-xl font-bold text-primary">
                    Menos na corrida, mais pro rolê
                </AriaHeading>
                <p className="mt-2 text-md text-tertiary">Compre crédito{"\u00a0"}Uber com 5% de desconto aqui na Ingresse e vá e volte do rolê com mais tranquilidade.</p>

                <div className="mt-6 flex w-full flex-col gap-2">
                    <Button size="lg" color="primary" className="w-full" onClick={onAproveitar}>
                        Aproveitar desconto
                    </Button>
                    <Button size="lg" color="link-gray" className="self-center" onClick={onClose}>
                        Não tenho interesse
                    </Button>
                </div>
            </div>
        </BottomSheet>
    );
}
