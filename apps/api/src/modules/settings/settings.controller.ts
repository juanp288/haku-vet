import { Controller, Get } from "@nestjs/common";
import type { ClinicSettingsPublic } from "@vetclinic/contracts";
import { Roles } from "../../common/decorators/roles.decorator";
import { SettingsService } from "./settings.service";

/** D6: solo lo consume la vista de impresión de consultas (VETERINARIO/ADMIN). */
@Controller("clinic-settings")
@Roles("ADMIN", "VETERINARIO")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getPublic(): Promise<ClinicSettingsPublic> {
    return this.settingsService.getPublic();
  }
}
