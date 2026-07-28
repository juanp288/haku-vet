import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { createTutorSchema, type CreateTutorInput, type Tutor } from "@vetclinic/contracts";
import type { JwtPayload } from "../../common/auth.constants";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { TutorsService } from "./tutors.service";

/** RN-18: crear/editar acudientes — ADMIN, VETERINARIO, RECEPCION (no AUXILIAR). */
@Controller("tutors")
@Roles("ADMIN", "VETERINARIO", "RECEPCION")
export class TutorsController {
  constructor(private readonly tutorsService: TutorsService) {}

  @Post()
  create(
    // El pipe va en el parámetro, no en @UsePipes() del método — a nivel de
    // método corre contra TODOS los parámetros, incluido @CurrentUser().
    @Body(new ZodValidationPipe(createTutorSchema)) body: CreateTutorInput,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ): Promise<Tutor> {
    return this.tutorsService.create(body, user.sub, req.ip ?? "unknown");
  }

  @Get()
  findAll(): Promise<Tutor[]> {
    return this.tutorsService.findAll();
  }
}
