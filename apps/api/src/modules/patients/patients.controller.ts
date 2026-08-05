import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import {
  createPatientSchema,
  linkTutorSchema,
  type CreatePatientInput,
  type LinkTutorInput,
  type Patient,
} from "@vetclinic/contracts";
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

  @Get(":id")
  findById(@Param("id") id: string): Promise<Patient> {
    return this.patientsService.findById(id);
  }

  /**
   * B4: agrega un acudiente adicional a una mascota ya existente. No es
   * DELETE físico de una entidad clínica (RN-16 no incluye PatientTutor):
   * es la tabla intermedia N:N, y vincular/desvincular es su operación
   * normal.
   */
  @Post(":id/tutors")
  linkTutor(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(linkTutorSchema)) body: LinkTutorInput,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ): Promise<Patient> {
    return this.patientsService.linkTutor(id, body, user.sub, req.ip ?? "unknown");
  }

  @Post(":id/tutors/:tutorId/primary")
  setPrimaryTutor(
    @Param("id") id: string,
    @Param("tutorId") tutorId: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ): Promise<Patient> {
    return this.patientsService.setPrimaryTutor(id, tutorId, user.sub, req.ip ?? "unknown");
  }

  @Post(":id/tutors/:tutorId/unlink")
  unlinkTutor(
    @Param("id") id: string,
    @Param("tutorId") tutorId: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ): Promise<Patient> {
    return this.patientsService.unlinkTutor(id, tutorId, user.sub, req.ip ?? "unknown");
  }
}
