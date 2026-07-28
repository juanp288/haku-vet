# Reglas de negocio

Estas son las invariantes del sistema. **Todas se validan en el backend**, aunque la UI también las refleje. Cada una debería tener un test.

---

## RN-01 · Agenda: no hay solapamiento

Dos citas del mismo veterinario no pueden traslaparse en el tiempo, salvo que ambas estén en estado `CANCELADA` o `NO_ASISTIO`.

- Se consideran solapadas si `nuevaInicio < existenteFin` **y** `nuevaFin > existenteInicio`.
- La validación corre dentro de una transacción con bloqueo, no como consulta previa. Con varios dispositivos, verificar-y-luego-insertar produce dobles reservas.
- Respuesta ante conflicto: `409 Conflict` con los datos de la cita en conflicto.

## RN-02 · Agenda: citas dentro del horario

`startsAt` y `endsAt` deben caer dentro del horario de `ClinicSettings` y en un día laboral configurado. Excepción: citas de tipo `URGENCIA`, que se permiten a cualquier hora.

## RN-03 · Agenda: no se agenda en el pasado

Salvo rol `ADMIN`, que puede registrar citas retroactivas para digitalizar el cuaderno.

## RN-04 · Agenda: máquina de estados

```
AGENDADA ──> CONFIRMADA ──> EN_SALA ──> EN_ATENCION ──> ATENDIDA (final)
    │             │            │
    ├─────────────┴────────────┴──> NO_ASISTIO (final)
    │
    └──> CANCELADA (final)
```

- Cualquier transición fuera de este grafo devuelve `422`.
- `CANCELADA` exige `cancelReason`.
- `EN_SALA` establece `arrivedAt` con la hora del servidor.
- Una cita cuya consulta esté `CERRADA` no admite cambios de estado ni de horario.

## RN-05 · Consulta cerrada es inmutable

Ningún campo de una `Consultation` con `status = CERRADA` puede modificarse, por ningún rol. Las correcciones se hacen exclusivamente mediante `Addendum`. La API no expone un endpoint de `PATCH` para consultas cerradas.

## RN-06 · Requisitos para cerrar una consulta

Se exige `reason`, `objective` y `assessment` no vacíos. Al cerrar, en la misma transacción:

1. `status = CERRADA`, `closedAt = now()`
2. La cita asociada, si existe, pasa a `ATENDIDA`
3. Si `nextControlAt` está diligenciado, se crea un `Reminder` tipo `CONTROL`
4. Se escribe un `AuditLog` con acción `CLOSE`

## RN-07 · Visibilidad de borradores

Una consulta en `BORRADOR` solo la ve su autor y los usuarios `ADMIN`. No aparece en la historia clínica para otros veterinarios.

## RN-08 · Un solo acudiente principal

Cada mascota tiene exactamente un `PatientTutor` con `isPrimary = true`. Marcar uno nuevo como principal desmarca el anterior en la misma transacción. Una mascota no puede quedar sin acudientes.

## RN-09 · Documento único de acudiente

La pareja (`documentType`, `documentNumber`) es única. Ante un duplicado, la API responde `409` incluyendo el `id` del registro existente, para que la UI ofrezca abrirlo en lugar de mostrar un error seco.

## RN-10 · Autorización de datos obligatoria

No se puede crear ni actualizar un `Tutor` con `dataConsent = false`. Al pasar a `true` se sella `dataConsentAt` con la hora del servidor; ese campo no se puede editar manualmente.

## RN-11 · Mascota fallecida

Con `isDeceased = true`:

- No se pueden crear citas nuevas
- No se pueden crear consultas nuevas
- Sus recordatorios pendientes pasan a `DESCARTADO`
- La historia clínica sigue siendo consultable e imprimible

## RN-12 · Cálculo de la próxima dosis

`nextDueAt = appliedAt + boosterIntervalDays` del biológico. Si `boosterIntervalDays` es nulo, `nextDueAt` queda nulo. El veterinario puede sobrescribir el valor calculado; el sistema respeta siempre la decisión manual y nunca la recalcula después.

## RN-13 · Fecha de aplicación no futura

`VaccineApplication.appliedAt` no puede ser posterior a la fecha del servidor.

## RN-14 · Generación idempotente de recordatorios

El cron diario que crea recordatorios de vacunación debe poder ejecutarse N veces el mismo día sin duplicar. Se logra con una clave lógica única: (`patientId`, `type`, `vaccineApplicationId`, `dueAt`). Si ya existe un recordatorio para esa combinación, se actualiza en lugar de insertarse.

## RN-15 · Cierre automático de recordatorios

Al registrar una `VaccineApplication` de un biológico X para un paciente P, todo `Reminder` pendiente de tipo `VACUNA` de ese biológico y paciente pasa a `ATENDIDO`.

## RN-16 · Nada se borra

Ninguna entidad clínica admite `DELETE` físico:

| Entidad | Mecanismo |
|---|---|
| `Tutor`, `Patient`, `User`, `Vaccine`, `Breed` | `isActive = false` |
| `Attachment` | marcado inactivo; el archivo permanece en disco |
| `Consultation`, `Addendum`, `AuditLog`, `VaccineApplication` | **no se pueden desactivar ni borrar de ninguna forma** |
| `Appointment` | se cancela, no se borra |

## RN-17 · La bitácora es de solo escritura

`AuditLog` no expone endpoints de actualización ni de borrado. El usuario de base de datos de la aplicación puede tener `INSERT` y `SELECT` sobre esa tabla, no `UPDATE` ni `DELETE`.

## RN-18 · Permisos por rol

| Acción | ADMIN | VETERINARIO | RECEPCION | AUXILIAR |
|---|:---:|:---:|:---:|:---:|
| Ver agenda | ✅ | ✅ | ✅ | ✅ |
| Crear / mover citas | ✅ | ✅ | ✅ | ❌ |
| Crear / editar acudientes y mascotas | ✅ | ✅ | ✅ | ❌ |
| Ver historia clínica | ✅ | ✅ | ❌ | solo signos vitales |
| Crear y cerrar consultas | ✅ | ✅ | ❌ | ❌ |
| Editar signos vitales (borrador) | ✅ | ✅ | ❌ | ✅ |
| Agregar adenda | solo propias o como ADMIN | solo propias | ❌ | ❌ |
| Registrar vacunas | ✅ | ✅ | ❌ | ❌ |
| Bandeja de recordatorios | ✅ | ✅ | ✅ | ✅ |
| Subir adjuntos | ✅ | ✅ | ✅ | ✅ |
| Administrar usuarios y catálogos | ✅ | ❌ | ❌ | ❌ |
| Ver bitácora | ✅ | ❌ | ❌ | ❌ |

**Regla clave:** `RECEPCION` no ve la historia clínica. Es información sensible y no la necesita para su trabajo.

## RN-19 · Zona horaria

Todo se persiste en UTC. Toda comparación de "hoy", "esta semana" o "vencido" se hace convirtiendo primero a `ClinicSettings.timezone`. Nunca usar la zona horaria del servidor ni la del navegador para lógica de negocio.

## RN-20 · Unidades

Peso en kilogramos con 2 decimales (`Decimal`, nunca `Float`). Temperatura en grados Celsius con 1 decimal. Las conversiones son de presentación, jamás de almacenamiento.

---

## Casos límite que deben tener test

Estos son los que rompen sistemas veterinarios reales:

1. Dos recepcionistas agendan la misma franja al mismo tiempo → uno recibe 409.
2. Mascota con dos acudientes; se desvincula uno → sigue habiendo principal.
3. Se intenta desvincular el único acudiente → se rechaza.
4. Acudiente que llega con documento ya registrado → se ofrece el registro existente.
5. Consulta en borrador abandonada tres días → sigue siendo borrador y editable solo por su autor.
6. Cita cancelada y luego se intenta crear consulta sobre ella → se rechaza.
7. Vacuna aplicada con `nextDueAt` manual anterior al cálculo → se respeta el manual.
8. El cron corre dos veces → no duplica recordatorios.
9. Paciente marcado como fallecido con citas futuras → las citas se cancelan y los recordatorios se descartan.
10. Consulta cerrada por error → solo queda la vía de la adenda, y el test debe confirmar que el `PATCH` devuelve 403.
11. Archivo de 25 MB → rechazado con mensaje claro, sin dejar basura en disco.
12. Búsqueda con tilde y sin tilde → mismos resultados.
