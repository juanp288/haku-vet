import { Controller, Get, Query } from "@nestjs/common";
import { listBreedsQuerySchema, type Breed, type ListBreedsQuery } from "@vetclinic/contracts";
import { Roles } from "../../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { BreedsService } from "./breeds.service";

/** RN-18: mismo grupo que crear/editar mascotas — ADMIN, VETERINARIO, RECEPCION. */
@Controller("breeds")
@Roles("ADMIN", "VETERINARIO", "RECEPCION")
export class BreedsController {
  constructor(private readonly breedsService: BreedsService) {}

  @Get()
  findBySpecies(
    @Query(new ZodValidationPipe(listBreedsQuerySchema)) query: ListBreedsQuery,
  ): Promise<Breed[]> {
    return this.breedsService.findBySpecies(query.species);
  }
}
