import { Injectable } from "@nestjs/common";
import type { Breed as BreedDto, Species } from "@vetclinic/contracts";
import type { Breed } from "@vetclinic/db";
import { BreedsRepository } from "./breeds.repository";

@Injectable()
export class BreedsService {
  constructor(private readonly breedsRepository: BreedsRepository) {}

  async findBySpecies(species: Species): Promise<BreedDto[]> {
    const breeds = await this.breedsRepository.findBySpecies(species);
    return breeds.map((breed) => this.toDto(breed));
  }

  private toDto(breed: Breed): BreedDto {
    return { id: breed.id, name: breed.name, species: breed.species };
  }
}
