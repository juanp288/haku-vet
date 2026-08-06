import type { Species } from "@vetclinic/contracts";
import { Bird } from "@phosphor-icons/react/dist/csr/Bird";
import { Cat } from "@phosphor-icons/react/dist/csr/Cat";
import { Dog } from "@phosphor-icons/react/dist/csr/Dog";
import { PawPrint } from "@phosphor-icons/react/dist/csr/PawPrint";
import { Rabbit } from "@phosphor-icons/react/dist/csr/Rabbit";
import { Shrimp } from "@phosphor-icons/react/dist/csr/Shrimp";
import type { Icon } from "@phosphor-icons/react/dist/lib/types";

/** Phosphor no tiene un ícono de reptil dedicado — Shrimp es lo más cercano a un caparazón/animal de agua fría. */
export const SPECIES_ICONS: Record<Species, Icon> = {
  CANINO: Dog,
  FELINO: Cat,
  AVE: Bird,
  ROEDOR: Rabbit,
  REPTIL: Shrimp,
  OTRO: PawPrint,
};
