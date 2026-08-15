import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import {
  createConsultationSchema,
  updateConsultationDraftSchema,
  type ConsultationDetail,
  type CreateConsultationInput,
  type UpdateConsultationDraftInput,
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
}
