import { Controller, Get, Query } from "@nestjs/common";
import { getAgendaQuerySchema, type AgendaDay, type GetAgendaQuery } from "@vetclinic/contracts";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { AppointmentsService } from "./appointments.service";

/** RN-18: "Ver agenda" está abierto a los 4 roles — sin @Roles(). */
@Controller("appointments")
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  getAgenda(
    @Query(new ZodValidationPipe(getAgendaQuerySchema)) query: GetAgendaQuery,
  ): Promise<AgendaDay> {
    return this.appointmentsService.getAgenda(query);
  }
}
