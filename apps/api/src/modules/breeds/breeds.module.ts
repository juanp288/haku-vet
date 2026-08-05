import { Module } from "@nestjs/common";
import { BreedsController } from "./breeds.controller";
import { BreedsRepository } from "./breeds.repository";
import { BreedsService } from "./breeds.service";

@Module({
  controllers: [BreedsController],
  providers: [BreedsService, BreedsRepository],
  exports: [BreedsRepository],
})
export class BreedsModule {}
