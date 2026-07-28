# Arquitectura y despliegue

Decisiones tomadas: **LAN con varios dispositivos**, **Postgres**, **mantenimiento mínimo del desarrollador**.

---

## 1. Stack

| Capa | Elección | Versión objetivo |
|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | pnpm 9, turbo 2 |
| Backend | NestJS | 10 |
| Frontend | Next.js App Router | 15 |
| Lenguaje | TypeScript estricto | 5.5+ |
| ORM | Prisma | 5 |
| Base de datos | PostgreSQL | 16 |
| Contratos | Zod + ts-rest | |
| Estado servidor | TanStack Query | 5 |
| UI | Tailwind + shadcn/ui | |
| Tablas | TanStack Table | 8 |
| Formularios | react-hook-form + `@hookform/resolvers/zod` | |
| Auth | JWT propio (`@nestjs/jwt`) + bcrypt | |
| Jobs | `@nestjs/schedule` | Cron en proceso, sin Redis |
| Tests | Vitest + Supertest | |
| Contenedores | Docker Compose | |

**Lo que deliberadamente no se usa:** Redis, BullMQ, Kafka, S3, Auth0/Clerk, microservicios, GraphQL. Cada uno de ellos es una pieza más que puede fallar a las 8 de la mañana en una clínica sin internet.

## 2. Estructura del monorepo

```
vetclinic/
├── apps/
│   ├── api/                      # NestJS
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── users/
│   │   │   │   ├── tutors/
│   │   │   │   ├── patients/
│   │   │   │   ├── appointments/
│   │   │   │   ├── consultations/
│   │   │   │   ├── vaccines/
│   │   │   │   ├── reminders/
│   │   │   │   ├── attachments/
│   │   │   │   ├── audit/
│   │   │   │   └── settings/
│   │   │   ├── common/           # guards, interceptors, filters, decorators
│   │   │   ├── jobs/             # crons
│   │   │   └── main.ts
│   │   └── test/
│   └── web/                      # Next.js
│       ├── src/
│       │   ├── app/(auth)/login/
│       │   ├── app/(app)/agenda/
│       │   ├── app/(app)/pacientes/
│       │   ├── app/(app)/acudientes/
│       │   ├── app/(app)/recordatorios/
│       │   ├── app/(app)/admin/
│       │   ├── components/ui/    # shadcn
│       │   ├── features/         # un folder por dominio
│       │   └── lib/
│       └── ...
├── packages/
│   ├── contracts/                # Zod + ts-rest — fuente única de verdad de la API
│   ├── db/                       # schema.prisma, migraciones, seed, cliente
│   └── config/                   # tsconfig, eslint, tailwind base
├── docker/
│   ├── api.Dockerfile
│   ├── web.Dockerfile
│   └── backup/
├── scripts/
│   ├── backup.sh
│   ├── restore.sh
│   └── update.sh
├── docker-compose.yml
├── .env.example
├── turbo.json
├── pnpm-workspace.yaml
└── CLAUDE.md
```

### Por qué cada módulo de Nest tiene la misma forma

```
modules/patients/
├── patients.module.ts
├── patients.controller.ts    # solo HTTP: valida contrato, delega
├── patients.service.ts       # reglas de negocio, transacciones
├── patients.repository.ts    # acceso a Prisma
└── patients.service.spec.ts
```

Uniformidad sobre elegancia. Cuando el agente genera el módulo número doce, copia la forma de los anteriores y tú puedes revisar por diferencia en lugar de leer todo.

## 3. `packages/contracts`: la pieza que hace revisable el vibe-code

Un solo lugar define cada entrada y salida de la API:

```ts
// packages/contracts/src/patients.ts
import { z } from 'zod';
import { initContract } from '@ts-rest/core';

export const createPatientSchema = z.object({
  name: z.string().min(1).max(60),
  species: z.enum(['CANINO','FELINO','AVE','ROEDOR','REPTIL','OTRO']),
  speciesOther: z.string().max(40).optional(),
  breedId: z.string().cuid().optional(),
  sex: z.enum(['MACHO','HEMBRA','DESCONOCIDO']).default('DESCONOCIDO'),
  birthDate: z.coerce.date().max(new Date()).optional(),
  birthDateIsApprox: z.boolean().default(false),
  microchip: z.string().max(30).optional(),
  tutors: z.array(z.object({
    tutorId: z.string().cuid(),
    isPrimary: z.boolean(),
  })).min(1),
}).refine(
  d => d.species !== 'OTRO' || !!d.speciesOther,
  { message: 'Indique la especie', path: ['speciesOther'] }
).refine(
  d => d.tutors.filter(t => t.isPrimary).length === 1,
  { message: 'Debe haber exactamente un acudiente principal', path: ['tutors'] }
);

const c = initContract();
export const patientsContract = c.router({
  create: {
    method: 'POST',
    path: '/patients',
    body: createPatientSchema,
    responses: { 201: patientSchema, 409: errorSchema },
  },
  // ...
});
```

Nest valida con ese schema, Next tipa el cliente con ese schema, el formulario resuelve con ese schema. Si el agente inventa un campo, TypeScript rompe en tres archivos a la vez y lo ves de inmediato. **Esta es la principal defensa contra el vibe-code que se desalinea.**

## 4. Autenticación

- JWT firmado con secreto de `.env`, 12 horas de vigencia, en cookie `httpOnly` `SameSite=Lax`.
- `bcrypt` con costo 12.
- `JwtAuthGuard` global; se opta por salir con `@Public()`.
- `RolesGuard` + decorador `@Roles('ADMIN','VETERINARIO')` según la matriz de RN-18.
- Sin refresh token en v1: 12 horas cubren la jornada. Simplicidad sobre completitud.
- Rate limit con `@nestjs/throttler` solo en `/auth/login`.

## 5. Archivos

- Se guardan en `STORAGE_ROOT/{patientId}/{uuid}.{ext}`, volumen montado en Docker.
- La BD guarda **ruta relativa**, nunca absoluta.
- Se sirven por un endpoint de Nest que valida el JWT, no por Nginx directo. Son datos clínicos.
- Toda la escritura pasa por una interfaz `StorageService` con implementación `LocalDiskStorage`. Migrar a S3 mañana es cambiar una clase.

## 6. docker-compose.yml

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      retries: 5

  api:
    build: { context: ., dockerfile: docker/api.Dockerfile }
    restart: unless-stopped
    depends_on:
      db: { condition: service_healthy }
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      JWT_SECRET: ${JWT_SECRET}
      STORAGE_ROOT: /data/storage
      TZ: America/Bogota
    volumes:
      - storage:/data/storage
    ports: ["3001:3001"]

  web:
    build: { context: ., dockerfile: docker/web.Dockerfile }
    restart: unless-stopped
    depends_on: [api]
    environment:
      NEXT_PUBLIC_API_URL: http://${HOST_LAN_IP}:3001
    ports: ["3000:3000"]

  backup:
    image: postgres:16-alpine
    restart: unless-stopped
    depends_on: [db]
    environment:
      PGPASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - ./scripts:/scripts:ro
      - ${BACKUP_DIR}:/backups
    entrypoint: ["/bin/sh", "/scripts/backup-loop.sh"]

volumes:
  pgdata:
  storage:
```

`restart: unless-stopped` en todos los servicios: si el PC de la clínica se reinicia por una actualización de Windows, el sistema vuelve solo. Docker Desktop configurado para arrancar con el sistema.

## 7. Acceso desde la LAN

1. Asignar **IP fija** al PC servidor en el router (por reserva DHCP). Sin esto, todo se rompe el día que el router reasigne direcciones.
2. Abrir los puertos 3000 y 3001 en el firewall de Windows para la red privada.
3. Los demás dispositivos entran a `http://192.168.1.X:3000`.
4. Opcional pero recomendado: entrada en el DNS del router para que sea `http://clinica.local`.
5. Crear accesos directos en el escritorio de cada equipo y fijar la pestaña en el navegador.

## 8. Backups — no negociable

**Qué se respalda:** la base de datos completa y la carpeta de archivos adjuntos. Un backup sin los adjuntos es un backup incompleto.

**Esquema:**

- `pg_dump` comprimido cada día a las 22:00
- `tar` incremental de `storage/` el mismo horario
- Retención: 14 diarios + 8 semanales + 12 mensuales
- Destino primario: carpeta local del PC
- Destino secundario: carpeta sincronizada con Google Drive o OneDrive, o un disco USB permanente

```sh
# scripts/backup.sh
set -euo pipefail
STAMP=$(date +%Y%m%d-%H%M)
pg_dump -h db -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc \
  > "/backups/db-$STAMP.dump"
tar czf "/backups/storage-$STAMP.tar.gz" -C /data storage
find /backups -name 'db-*.dump'      -mtime +14 -delete
find /backups -name 'storage-*.tar.gz' -mtime +14 -delete
echo "$(date -Iseconds) backup ok $STAMP" >> /backups/backup.log
```

**Verificación:** un cron semanal restaura el último dump en una base `vetclinic_verify`, cuenta filas de `Patient` y `Consultation`, y escribe el resultado en `backup.log`. Un backup que nunca se restauró no es un backup.

**Antes de entregar el sistema:** restaurar en una máquina limpia y confirmar que todo funciona. Este ejercicio siempre revela algo.

## 9. Mantenimiento mínimo

| Necesidad | Solución |
|---|---|
| El sistema arranca solo | `restart: unless-stopped` + Docker Desktop al inicio de Windows |
| Actualizar a una versión nueva | `scripts/update.sh`: `git pull && docker compose build && prisma migrate deploy && docker compose up -d` |
| Saber si algo falló | Endpoint `/health` (BD, disco, último backup) + página de estado simple en `/admin/estado` |
| Diagnosticar a distancia | Logs JSON con `pino`, rotados, descargables desde `/admin/estado` |
| Disco lleno | `/health` alerta si queda menos del 15% libre |
| El dueño necesita ayuda | Manual de una página impreso y pegado junto al PC: cómo reiniciar, cómo ver el estado, tu teléfono |

## 10. Ruta a la nube (cuando exista)

El diseño ya lo permite. El día que haya segunda sede:

1. `docker-compose` sube a un VPS o a Railway/Fly.io sin cambios de código.
2. Postgres pasa a servicio administrado: solo cambia `DATABASE_URL`.
3. `LocalDiskStorage` se sustituye por `S3Storage`: una clase.
4. Se agrega HTTPS con Caddy o Traefik al frente.
5. Se agrega `clinicId` a las entidades principales para multi-sede — el único cambio de esquema, y por eso todas usan `cuid()`.

Nada de esto exige reescribir lógica de negocio, que es exactamente el punto.
