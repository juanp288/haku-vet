import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import {
  createPatientSchema,
  linkTutorSchema,
  listConsultationsQuerySchema,
  type ConsultationsPage,
  type CreatePatientInput,
  type LinkTutorInput,
  type ListConsultationsQuery,
  type Patient,
} from "@vetclinic/contracts";
import type { JwtPayload } from "../../common/auth.constants";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { PatientsService } from "./patients.service";

/**
 * RN-18: roles declarados por endpoint, no a nivel de clase — la matriz no
 * es uniforme. Crear/editar mascota y su directorio de acudientes es
 * ADMIN/VETERINARIO/RECEPCION (no AUXILIAR); leer la ficha básica suma
 * AUXILIAR; la historia clínica excluye a RECEPCION por completo ("regla
 * clave" del documento).
 */
@Controller("patients")
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @Roles("ADMIN", "VETERINARIO", "RECEPCION")
  create(
    @Body(new ZodValidationPipe(createPatientSchema)) body: CreatePatientInput,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ): Promise<Patient> {
    return this.patientsService.create(body, user.sub, req.ip ?? "unknown");
  }

  @Get()
  @Roles("ADMIN", "VETERINARIO", "RECEPCION", "AUXILIAR")
  findAll(): Promise<Patient[]> {
    return this.patientsService.findAll();
  }

  @Get(":id")
  @Roles("ADMIN", "VETERINARIO", "RECEPCION", "AUXILIAR")
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
  @Roles("ADMIN", "VETERINARIO", "RECEPCION")
  linkTutor(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(linkTutorSchema)) body: LinkTutorInput,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ): Promise<Patient> {
    return this.patientsService.linkTutor(id, body, user.sub, req.ip ?? "unknown");
  }

  @Post(":id/tutors/:tutorId/primary")
  @Roles("ADMIN", "VETERINARIO", "RECEPCION")
  setPrimaryTutor(
    @Param("id") id: string,
    @Param("tutorId") tutorId: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ): Promise<Patient> {
    return this.patientsService.setPrimaryTutor(id, tutorId, user.sub, req.ip ?? "unknown");
  }

  @Post(":id/tutors/:tutorId/unlink")
  @Roles("ADMIN", "VETERINARIO", "RECEPCION")
  unlinkTutor(
    @Param("id") id: string,
    @Param("tutorId") tutorId: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ): Promise<Patient> {
    return this.patientsService.unlinkTutor(id, tutorId, user.sub, req.ip ?? "unknown");
  }

  /** B5: sin RECEPCION — RN-18 "regla clave", no ve la historia clínica. */
  @Get(":id/consultations")
  @Roles("ADMIN", "VETERINARIO", "AUXILIAR")
  listConsultations(
    @Param("id") id: string,
    @Query(new ZodValidationPipe(listConsultationsQuerySchema)) query: ListConsultationsQuery,
    @CurrentUser() user: JwtPayload,
  ): Promise<ConsultationsPage> {
    return this.patientsService.listConsultations(id, query, user);
  }
}
