import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import {
  changeAppointmentStatusSchema,
  createAppointmentSchema,
  getAgendaQuerySchema,
  getAgendaWeekQuerySchema,
  moveAppointmentSchema,
  type AgendaAppointment,
  type AgendaDay,
  type AgendaWeek,
  type ChangeAppointmentStatusInput,
  type CreateAppointmentInput,
  type GetAgendaQuery,
  type GetAgendaWeekQuery,
  type MoveAppointmentInput,
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

  /**
   * RN-18: "Ver agenda" está abierto a los 4 roles — sin @Roles(). El nav
   * solo muestra este link a ADMIN (comodidad de UI, ver nav-links.ts), pero
   * la vista semanal es la misma categoría de acción que la diaria.
   */
  @Get("week")
  getWeek(
    @Query(new ZodValidationPipe(getAgendaWeekQuerySchema)) query: GetAgendaWeekQuery,
  ): Promise<AgendaWeek> {
    return this.appointmentsService.getWeek(query);
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

  /** RN-18: "Crear / mover citas" — mismo grupo de roles que create() cubre también cambios de estado. */
  @Post(":id/status")
  @HttpCode(HttpStatus.OK)
  @Roles("ADMIN", "VETERINARIO", "RECEPCION")
  changeStatus(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(changeAppointmentStatusSchema)) body: ChangeAppointmentStatusInput,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ): Promise<AgendaAppointment> {
    return this.appointmentsService.changeStatus(id, body, user.sub, req.ip ?? "unknown");
  }

  /** RN-18: "Crear / mover citas" — ADMIN, VETERINARIO, RECEPCION (no AUXILIAR). */
  @Post(":id/move")
  @HttpCode(HttpStatus.OK)
  @Roles("ADMIN", "VETERINARIO", "RECEPCION")
  move(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(moveAppointmentSchema)) body: MoveAppointmentInput,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ): Promise<AgendaAppointment> {
    return this.appointmentsService.move(id, body, user.role, user.sub, req.ip ?? "unknown");
  }
}
