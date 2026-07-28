# Plan de implementación

Orden de construcción pensado para vibe-code: cada fase deja el sistema en un estado usable y verificable antes de pasar a la siguiente.

---

## Fase 0 · Fundaciones (sin lógica de negocio)

Esta fase la haces tú a mano o con supervisión estrecha. Es la que determina si el resto se puede revisar.

- [ ] Monorepo con pnpm workspaces + Turborepo
- [ ] `apps/api` (Nest) y `apps/web` (Next) arrancando con `pnpm dev`
- [ ] `packages/config` con tsconfig, eslint y tailwind compartidos
- [ ] `packages/db` con el `schema.prisma` completo del documento 02
- [ ] Primera migración aplicada + `seed.ts` con admin, settings, razas y biológicos
- [ ] `packages/contracts` con el contrato base de ts-rest y el schema de errores
- [ ] `docker-compose.yml` funcionando de punta a punta
- [ ] `CLAUDE.md` y `/docs` en el repo
- [ ] Commit inicial

**No delegues el esquema de la base de datos.** Es la decisión más cara de revertir.

## Fase 1 · Esqueleto vertical

Objetivo: una funcionalidad completa de extremo a extremo que sirva de plantilla para todo lo demás.

- [ ] A1 — Login (JWT, guards, roles, rate limit)
- [ ] Layout de la aplicación: barra lateral, encabezado, usuario actual, cerrar sesión
- [ ] B1 — Registrar acudiente (CRUD completo con Zod, formulario, tabla)

Al terminar esta fase revisa el código **con lupa**. Todo lo que venga después va a imitar esta forma; los vicios que dejes pasar aquí se multiplican por doce.

## Fase 2 · Núcleo de datos

- [ ] B2 — Buscador único
- [ ] B3 — Registrar mascota
- [ ] B4 — Vincular varios acudientes
- [ ] B5 — Ficha de la mascota (sin las pestañas clínicas todavía)

**Hito:** el sistema ya reemplaza la agenda de contactos en papel. Muéstraselo a tu amigo aquí, no al final.

## Fase 3 · Agenda

- [ ] C1 — Vista de agenda del día
- [ ] C2 — Agendar cita (con RN-01, la validación transaccional de solapamiento)
- [ ] C3 — Estados, mover y cancelar

**Hito:** el sistema reemplaza el cuaderno de citas. Es el módulo de mayor valor percibido. Ponlo en uso real ya, aunque falte lo clínico.

## Fase 4 · Historia clínica

- [ ] D1 — Crear consulta desde cita
- [ ] D2 — Signos vitales
- [ ] D3 — Cerrar consulta (con toda la transacción de RN-06)
- [ ] D5 — Ver historia completa + gráfica de peso
- [ ] D4 — Adendas
- [ ] G1 — Bitácora de auditoría

**Hito:** el veterinario deja el papel.

## Fase 5 · Vacunación

- [ ] E1 — Registrar aplicación
- [ ] E2 — Carnet con semáforo
- [ ] E3 — Cron de recordatorios + bandeja

## Fase 6 · Complementos

- [ ] F1 — Adjuntos
- [ ] A2 — Administrar usuarios
- [ ] A3 — Configuración de la clínica
- [ ] D6 — Impresión de consulta y receta
- [ ] C4 — Vista semanal

## Fase 7 · Endurecimiento y entrega

- [ ] Scripts de backup, restauración y actualización, probados
- [ ] Restauración verificada en máquina limpia
- [ ] Endpoint `/health` y página `/admin/estado`
- [ ] Logs con `pino`, rotación configurada
- [ ] Prueba de carga informal: 3 dispositivos usando el sistema a la vez durante una jornada
- [ ] IP fija, firewall y accesos directos configurados en la clínica
- [ ] Manual de una página impreso
- [ ] Capacitación: una hora con cada rol

---

## Cómo trabajar cada historia (el bucle de vibe-code)

Este bucle es lo que separa un sistema mantenible de un montón de código que nadie entiende.

**1 · Preparar el contexto.** Sesión nueva por historia. Adjunta: `CLAUDE.md`, el glosario, el fragmento relevante del modelo de datos, la historia con sus criterios y las reglas de negocio que la tocan. Nada más — el contexto de más ensucia tanto como el de menos.

**2 · Pedir el contrato primero.** Antes de cualquier implementación, que defina el schema de Zod en `packages/contracts`. Revísalo tú. Si el contrato está mal, todo lo demás estará mal.

**3 · Backend antes que frontend.** Servicio + repositorio + tests de las reglas de negocio. Corre los tests antes de aceptar.

**4 · Frontend después.** Con el contrato ya fijo, el frontend es casi mecánico.

**5 · Revisar por diferencia.** `git diff` completo antes de commitear. Preguntas de revisión: ¿tocó el schema? ¿inventó un campo fuera del contrato? ¿metió lógica de negocio en el controlador? ¿agregó una dependencia? ¿usó `any`?

**6 · Commit atómico.** Un commit por historia, con el código de la historia en el mensaje: `feat(agenda): C2 agendar cita con validación de solapamiento`.

**7 · Contra el agente que se desvía:** si en tres intentos no cumple un criterio de aceptación, no insistas con más prompts. Descarta el intento, escribe tú el esqueleto de la función y pídele que la complete. El problema casi siempre es una especificación ambigua, no el modelo.

## Señales de alarma durante el desarrollo

Si ves alguna de estas, detente y corrige antes de seguir:

- El agente propone cambiar el `schema.prisma` "para simplificar"
- Aparecen tipos duplicados entre `apps/api` y `apps/web`
- Un servicio supera las 300 líneas
- Empiezan a aparecer `any` o `@ts-ignore`
- Un test se marca como `skip` para que pase la suite
- Se instala una dependencia que no está en el documento de arquitectura
- Los mensajes de error empiezan a salir en inglés
- El controlador llama directamente a `prisma`

## Estimación aproximada

Con dedicación de tiempo parcial y vibe-code supervisado:

| Fase | Esfuerzo |
|---|---|
| 0 — Fundaciones | 1 semana |
| 1 — Esqueleto vertical | 1 semana |
| 2 — Núcleo de datos | 1 a 2 semanas |
| 3 — Agenda | 2 semanas |
| 4 — Historia clínica | 2 a 3 semanas |
| 5 — Vacunación | 1 a 2 semanas |
| 6 — Complementos | 2 semanas |
| 7 — Endurecimiento y entrega | 1 semana |

Total: **11 a 14 semanas** de trabajo de fin de semana. La agenda (fase 3) ya es entregable por sí sola alrededor de la semana 5, y conviene ponerla en producción ahí mismo: el feedback real es lo que evita construir el módulo equivocado.
