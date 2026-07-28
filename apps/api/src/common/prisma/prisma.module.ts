import { Global, Module } from "@nestjs/common";
import { prisma } from "@vetclinic/db";
import { PRISMA_CLIENT } from "./prisma.constants";

/**
 * Expone el singleton de PrismaClient de @vetclinic/db como provider
 * inyectable, para que los repositorios puedan recibirlo por constructor
 * en vez de importar el módulo directamente (facilita mockearlo en tests).
 */
@Global()
@Module({
  providers: [{ provide: PRISMA_CLIENT, useValue: prisma }],
  exports: [PRISMA_CLIENT],
})
export class PrismaModule {}
