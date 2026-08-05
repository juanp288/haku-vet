import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { createPatientSchema, type CreatePatientInput, type Patient } from "@vetclinic/contracts";
import type { JwtPayload } from "../../common/auth.constants";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { PatientsService } from "./patients.service";

/** RN-18: crear/editar acudientes y mascotas — ADMIN, VETERINARIO, RECEPCION (no AUXILIAR). */
@Controller("patients")
@Roles("ADMIN", "VETERINARIO", "RECEPCION")
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(createPatientSchema)) body: CreatePatientInput,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ): Promise<Patient> {
    return this.patientsService.create(body, user.sub, req.ip ?? "unknown");
  }

  @Get()
  findAll(): Promise<Patient[]> {
    return this.patientsService.findAll();
  }
}
