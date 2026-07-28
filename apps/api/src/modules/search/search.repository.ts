import { Inject, Injectable } from "@nestjs/common";
import { Prisma, type PrismaClient, type Species } from "@vetclinic/db";
import { PRISMA_CLIENT } from "../../common/prisma/prisma.constants";

export interface SearchRow {
  patientId: string;
  patientName: string;
  species: Species;
  primaryTutorFirstName: string;
  primaryTutorLastName: string;
  primaryTutorPhone: string;
}

const RESULT_LIMIT = 20;

@Injectable()
export class SearchRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  /**
   * Un resultado por paciente activo cuyo nombre, o el de cualquiera de
   * sus acudientes (nombre/documento/teléfono), coincide con la
   * búsqueda — mostrando siempre al acudiente principal (RN de B2, doc
   * 03), sin importar por cuál acudiente haya coincidido.
   *
   * unaccent()+ILIKE cubre mayúsculas y tildes (caso límite #12, doc 04).
   * namePattern y phonePattern ya vienen armados como '%...%' desde el
   * service — acá solo se interpolan de forma segura vía Prisma.sql.
   */
  search(namePattern: string, phonePattern: string): Promise<SearchRow[]> {
    return this.prisma.$queryRaw<SearchRow[]>(Prisma.sql`
      SELECT
        p.id AS "patientId",
        p.name AS "patientName",
        p.species AS "species",
        t."firstName" AS "primaryTutorFirstName",
        t."lastName" AS "primaryTutorLastName",
        t.phone AS "primaryTutorPhone"
      FROM "Patient" p
      JOIN "PatientTutor" pt ON pt."patientId" = p.id AND pt."isPrimary" = true
      JOIN "Tutor" t ON t.id = pt."tutorId"
      WHERE p."isActive" = true
        AND (
          unaccent(p.name) ILIKE unaccent(${namePattern})
          OR EXISTS (
            SELECT 1
            FROM "PatientTutor" pt2
            JOIN "Tutor" t2 ON t2.id = pt2."tutorId"
            WHERE pt2."patientId" = p.id
              AND (
                unaccent(t2."firstName" || ' ' || t2."lastName") ILIKE unaccent(${namePattern})
                OR t2."documentNumber" ILIKE ${namePattern}
                OR t2.phone ILIKE ${phonePattern}
              )
          )
        )
      ORDER BY p.name ASC
      LIMIT ${RESULT_LIMIT}
    `);
  }
}
