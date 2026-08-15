import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import {
  createAddendumSchema,
  createConsultationSchema,
  updateConsultationDraftSchema,
  updateVitalsSchema,
  type ConsultationDetail,
  type CreateAddendumInput,
  type CreateConsultationInput,
  type UpdateConsultationDraftInput,
  type UpdateVitalsInput,
} from "@vetclinic/contracts";
import type { JwtPayload } from "../../common/auth.constants";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { ConsultationsService } from "./consultations.service";

@Controller("consultations")
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  /** RN-18 "Crear y cerrar consultas": ADMIN, VETERINARIO (no RECEPCION, no AUXILIAR). */
  @Post()
  @Roles("ADMIN", "VETERINARIO")
  create(
    @Body(new ZodValidationPipe(createConsultationSchema)) body: CreateConsultationInput,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ): Promise<ConsultationDetail> {
    return this.consultationsService.create(body, user.sub, req.ip ?? "unknown");
  }

  /** RN-18 "Ver historia clínica": ADMIN, VETERINARIO, AUXILIAR (redactado a signos vitales). RECEPCION no la ve. */
  @Get(":id")
  @Roles("ADMIN", "VETERINARIO", "AUXILIAR")
  findById(@Param("id") id: string, @CurrentUser() user: JwtPayload): Promise<ConsultationDetail> {
    return this.consultationsService.findById(id, user);
  }

  /** RN-18 "Crear y cerrar consultas": ADMIN, VETERINARIO. RN-05: rechaza si ya está CERRADA. */
  @Patch(":id")
  @Roles("ADMIN", "VETERINARIO")
  updateDraft(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateConsultationDraftSchema)) body: UpdateConsultationDraftInput,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ): Promise<ConsultationDetail> {
    return this.consultationsService.updateDraft(id, body, user, req.ip ?? "unknown");
  }

  /** RN-18 "Editar signos vitales (borrador)": ADMIN, VETERINARIO, AUXILIAR. No exige autoría (a diferencia de updateDraft). */
  @Patch(":id/vitals")
  @Roles("ADMIN", "VETERINARIO", "AUXILIAR")
  updateVitals(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateVitalsSchema)) body: UpdateVitalsInput,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ): Promise<ConsultationDetail> {
    return this.consultationsService.updateVitals(id, body, user, req.ip ?? "unknown");
  }

  /** RN-18 "Crear y cerrar consultas": ADMIN, VETERINARIO. RN-06: exige reason/objective/assessment; deja la cita en ATENDIDA. */
  @Post(":id/close")
  @HttpCode(HttpStatus.OK)
  @Roles("ADMIN", "VETERINARIO")
  close(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ): Promise<ConsultationDetail> {
    return this.consultationsService.close(id, user, req.ip ?? "unknown");
  }

  /** RN-18 "Agregar adenda": solo el autor de la consulta o ADMIN. RN-05: solo sobre una consulta CERRADA. */
  @Post(":id/addenda")
  @Roles("ADMIN", "VETERINARIO")
  addAddendum(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(createAddendumSchema)) body: CreateAddendumInput,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ): Promise<ConsultationDetail> {
    return this.consultationsService.addAddendum(id, body, user, req.ip ?? "unknown");
  }
}
