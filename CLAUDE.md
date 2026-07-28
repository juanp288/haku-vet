# CLAUDE.md

Guía para agentes de IA que trabajen en este repositorio. Léela completa antes de escribir código.

---

## Qué es este proyecto

Sistema de gestión para una clínica veterinaria pequeña. Corre **en la red local de la clínica**, sin internet. Maneja agenda de citas, acudientes, mascotas, historia clínica en formato SOAP y carnet de vacunación.

Documentos de referencia en `/docs`:

- `00-vision-y-alcance.md` — qué está dentro y fuera de la v1
- `01-glosario.md` — **lenguaje obligatorio**: los nombres de esta tabla son los únicos permitidos
- `02-modelo-de-datos.md` — esquema y las razones detrás de cada decisión
- `03-historias-de-usuario.md` — unidades de trabajo con criterios de aceptación
- `04-reglas-de-negocio.md` — invariantes que deben validarse en el backend
- `05-arquitectura-y-despliegue.md` — stack y operación

## Reglas que no se negocian

1. **No modifiques `packages/db/prisma/schema.prisma` sin autorización explícita del humano.** Si una tarea parece requerir un cambio de esquema, deténte y propónlo antes de tocarlo.
2. **Toda validación de reglas de negocio va en el backend.** La validación en el frontend es comodidad para el usuario, no seguridad.
3. **Todo tipo de entrada o salida de la API se define en `packages/contracts` con Zod.** Nunca declares un DTO ad hoc dentro de `apps/api` o de `apps/web`.
4. **Usa exclusivamente los términos del glosario.** `Tutor`, no `Client` ni `Owner`. `Patient`, no `Animal` ni `Pet`.
5. **Nada se borra.** No generes endpoints `DELETE` que borren físicamente. Usa `isActive` / `deletedAt`. `Consultation`, `Addendum` y `AuditLog` no se pueden borrar ni desactivar.
6. **Una consulta cerrada es inmutable.** No generes rutas de actualización sobre `Consultation` con `status = CERRADA`.
7. **Fechas en UTC en la base de datos.** Cualquier lógica de "hoy" o "vencido" convierte primero a `ClinicSettings.timezone`.
8. **Dinero y peso en `Decimal`, jamás en `Float`.**
9. **No agregues dependencias sin preguntar.** El stack está fijado en `05-arquitectura-y-despliegue.md`. Nada de Redis, colas, GraphQL ni servicios externos.
10. **Los mensajes de error visibles al usuario van en español**, sin jerga técnica.

## Convenciones de código

**Nombres**

- Archivos: `kebab-case.ts`
- Clases y tipos: `PascalCase`
- Variables y funciones: `camelCase`
- Enums de Prisma: `SCREAMING_SNAKE_CASE`, en español (son del dominio)
- Rutas de la API: plural en inglés, kebab-case (`/vaccine-applications`)
- Rutas del frontend: español (`/pacientes`, `/agenda`, `/recordatorios`)

**Backend (NestJS)** — todos los módulos tienen la misma forma:

```
modules/<dominio>/
├── <dominio>.module.ts
├── <dominio>.controller.ts    # solo HTTP; valida contrato y delega
├── <dominio>.service.ts       # reglas de negocio y transacciones
├── <dominio>.repository.ts    # único lugar que toca PrismaClient
└── <dominio>.service.spec.ts
```

- El controlador nunca contiene lógica de negocio ni llama a Prisma.
- Las operaciones que tocan más de una tabla van en `prisma.$transaction`.
- Errores de dominio: lanza excepciones HTTP de Nest con mensajes en español.
- Cada endpoint declara sus roles con `@Roles(...)` según la matriz de RN-18.

**Frontend (Next.js)**

- App Router. Server Components por defecto; `'use client'` solo cuando haya interactividad.
- Datos del servidor siempre con TanStack Query, nunca con `useEffect` + `fetch`.
- Formularios con `react-hook-form` + `zodResolver` usando el schema de `packages/contracts`.
- Componentes de `components/ui` son shadcn sin modificar. La composición propia va en `features/<dominio>/`.
- Sin `any`. Sin `@ts-ignore`.

## Comandos

```bash
pnpm install                  # instalar todo
pnpm dev                      # api + web en paralelo
pnpm db:migrate               # crear y aplicar migración en desarrollo
pnpm db:seed                  # datos semilla
pnpm db:studio                # Prisma Studio
pnpm test                     # todos los tests
pnpm --filter api test        # solo backend
pnpm lint && pnpm typecheck   # antes de cada commit
```

## Tests

No busques cobertura total. Se testea:

- Toda regla de negocio del documento `04-reglas-de-negocio.md`, sin excepción
- Los 12 casos límite listados al final de ese documento
- Los endpoints de autenticación y autorización
- La lógica de cálculo de próxima dosis de vacuna
- La detección de solapamiento en la agenda

No se testean: componentes de presentación, mapeos triviales, código generado.

## Flujo de trabajo esperado

1. Se te asigna **una** historia de usuario (por ejemplo, C2).
2. Lees sus criterios de aceptación y las reglas de negocio que la afectan.
3. Si necesitas cambiar el esquema, **preguntas primero**.
4. Defines o extiendes el contrato en `packages/contracts`.
5. Implementas backend → tests → frontend.
6. Corres `pnpm lint && pnpm typecheck && pnpm test`.
7. Reportas qué criterios de aceptación quedaron cubiertos y cuáles no.

No avances a la siguiente historia por iniciativa propia. Una historia por sesión.

## Errores frecuentes en este dominio

- Confundir `Appointment` con `Consultation`. Son entidades distintas: una cita puede no producir consulta, y una urgencia produce consulta sin cita.
- Modelar la relación mascota↔acudiente como 1:N. Es N:N mediante `PatientTutor`.
- Calcular la edad y almacenarla. Se calcula siempre al vuelo desde `birthDate`.
- Recalcular `nextDueAt` de una vacuna cuando el veterinario ya lo sobrescribió manualmente.
- Validar el solapamiento de citas con un `SELECT` previo en lugar de dentro de la transacción. Con varios dispositivos eso produce dobles reservas.
- Permitir que el rol `RECEPCION` vea la historia clínica. No debe verla.
- Usar la zona horaria del servidor o del navegador para decidir qué es "hoy".
