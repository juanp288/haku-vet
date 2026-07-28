import { BadRequestException, Injectable, type PipeTransform } from "@nestjs/common";
import { ZodError, type ZodSchema } from "zod";

/** Valida el body contra el schema de packages/contracts. Mensajes en español. */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown): unknown {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.issues[0]?.message ?? "Datos inválidos.";
        throw new BadRequestException(message);
      }
      throw error;
    }
  }
}
