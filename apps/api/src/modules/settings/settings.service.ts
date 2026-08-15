import { Injectable } from "@nestjs/common";
import type { ClinicSettingsPublic } from "@vetclinic/contracts";
import { SettingsRepository } from "./settings.repository";

@Injectable()
export class SettingsService {
  constructor(private readonly settingsRepository: SettingsRepository) {}

  /** D6: datos públicos de la clínica para la salida impresa (logo, nombre, dirección, etc.). */
  async getPublic(): Promise<ClinicSettingsPublic> {
    const settings = await this.settingsRepository.findSingleton();
    if (!settings) {
      return { name: "Clínica Veterinaria", taxId: null, address: null, phone: null, email: null, logoPath: null };
    }
    return {
      name: settings.name,
      taxId: settings.taxId,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      logoPath: settings.logoPath,
    };
  }
}
