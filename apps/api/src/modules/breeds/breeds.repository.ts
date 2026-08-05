import { Inject, Injectable } from "@nestjs/common";
import type { Breed, PrismaClient, Species } from "@vetclinic/db";
import { PRISMA_CLIENT } from "../../common/prisma/prisma.constants";

@Injectable()
export class BreedsRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  findBySpecies(species: Species): Promise<Breed[]> {
    return this.prisma.breed.findMany({
      where: { species, isActive: true },
      orderBy: { name: "asc" },
    });
  }

  findById(id: string): Promise<Breed | null> {
    return this.prisma.breed.findUnique({ where: { id } });
  }
}
