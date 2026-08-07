import { Body, Controller, Get, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import {
  createAppointmentSchema,
  getAgendaQuerySchema,
  type AgendaAppointment,
  type AgendaDay,
  type CreateAppointmentInput,
  type GetAgendaQuery,
} from "@vetclinic/contracts";
import type { JwtPayload } from "../../common/auth.constants";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { AppointmentsService } from "./appointments.service";

@Controller("appointments")
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  /** RN-18: "Ver agenda" está abierto a los 4 roles — sin @Roles(). */
  @Get()
  getAgenda(
    @Query(new ZodValidationPipe(getAgendaQuerySchema)) query: GetAgendaQuery,
  ): Promise<AgendaDay> {
    return this.appointmentsService.getAgenda(query);
  }

  /** RN-18: "Crear / mover citas" — ADMIN, VETERINARIO, RECEPCION (no AUXILIAR). */
  @Post()
  @Roles("ADMIN", "VETERINARIO", "RECEPCION")
  create(
    @Body(new ZodValidationPipe(createAppointmentSchema)) body: CreateAppointmentInput,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ): Promise<AgendaAppointment> {
    return this.appointmentsService.create(body, user.sub, user.role, req.ip ?? "unknown");
  }
}
