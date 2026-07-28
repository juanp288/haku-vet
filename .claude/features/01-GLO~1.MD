# Glosario del dominio (lenguaje ubicuo)

Regla: **un concepto, un término, en todas partes.** UI en español, código en inglés. Si un término no está en esta tabla, no debe aparecer en el código.

---

## Términos principales

| Término (UI, español) | Nombre en código | Definición | No confundir con |
|---|---|---|---|
| Acudiente | `Tutor` | Persona responsable legal y económicamente de una o más mascotas | "Cliente" o "dueño" — no usar esos términos |
| Mascota / Paciente | `Patient` | El animal atendido. En UI decimos "mascota" al acudiente y "paciente" al veterinario | — |
| Vínculo | `PatientTutor` | Relación entre una mascota y un acudiente. Una mascota puede tener varios | — |
| Acudiente principal | `isPrimary` en `PatientTutor` | El contacto por defecto para recordatorios y autorizaciones | — |
| Cita | `Appointment` | Espacio reservado en la agenda de un veterinario | Consulta |
| Consulta | `Consultation` | El registro clínico de una atención efectivamente realizada | Cita. Una cita puede no generar consulta (inasistencia) |
| Historia clínica | (no es una tabla) | El conjunto de todas las consultas de un paciente, en orden cronológico | Consulta individual |
| SOAP | campos de `Consultation` | Subjetivo, Objetivo, Análisis, Plan. Estructura estándar de la nota clínica | — |
| Adenda | `Addendum` | Corrección o agregado a una consulta ya cerrada. Nunca se edita el original | Edición |
| Signos vitales | campos de `Consultation` | Peso, temperatura, FC, FR, condición corporal, mucosas, TLLC | — |
| Biológico | `Vaccine` | Entrada del catálogo de vacunas disponibles (ej. "Quíntuple canina") | Aplicación |
| Aplicación de vacuna | `VaccineApplication` | El acto de aplicar un biológico a un paciente en una fecha, con lote | Biológico |
| Refuerzo | `nextDueDate` | Siguiente dosis calculada a partir del intervalo del biológico | — |
| Carnet | (vista) | Vista consolidada de todas las aplicaciones de un paciente | — |
| Recordatorio | `Reminder` | Tarea pendiente generada por el sistema (vacuna por vencer, control) | Notificación externa |
| Adjunto | `Attachment` | Archivo (foto, PDF) asociado a un paciente o a una consulta | — |
| Bitácora | `AuditLog` | Registro inmutable de quién hizo qué y cuándo | — |
| Usuario | `User` | Miembro del personal de la clínica con acceso al sistema | Acudiente. Los acudientes **no** tienen cuenta en v1 |

## Enumeraciones

| Enum | Valores | Nota |
|---|---|---|
| `Role` | `ADMIN`, `VETERINARIO`, `RECEPCION`, `AUXILIAR` | En español porque son roles del negocio |
| `Species` | `CANINO`, `FELINO`, `AVE`, `ROEDOR`, `REPTIL`, `OTRO` | `OTRO` obliga a llenar `speciesOther` |
| `Sex` | `MACHO`, `HEMBRA`, `DESCONOCIDO` | La esterilización es un campo aparte, no un valor de sexo |
| `AppointmentType` | `CONSULTA`, `VACUNACION`, `CONTROL`, `PROCEDIMIENTO`, `URGENCIA`, `OTRO` | |
| `AppointmentStatus` | `AGENDADA`, `CONFIRMADA`, `EN_SALA`, `EN_ATENCION`, `ATENDIDA`, `NO_ASISTIO`, `CANCELADA` | Ver máquina de estados en reglas de negocio |
| `ConsultationStatus` | `BORRADOR`, `CERRADA` | Cerrada es inmutable |
| `ReminderType` | `VACUNA`, `CONTROL`, `CITA` | |
| `ReminderStatus` | `PENDIENTE`, `ATENDIDO`, `DESCARTADO` | |

## Términos prohibidos

No usar en código ni en UI, porque generan ambigüedad:

- ❌ "cliente" → usar **acudiente** (`Tutor`)
- ❌ "dueño" → usar **acudiente**
- ❌ "animal" → usar **mascota** (`Patient`)
- ❌ "visita" → usar **cita** o **consulta** según corresponda
- ❌ "expediente" / "ficha" → usar **historia clínica**
- ❌ "doctor" → usar **veterinario**

## Convenciones de datos

- **Fechas y horas:** todo se guarda en UTC en la base de datos; la UI muestra en `America/Bogota`. La zona horaria de la clínica es una variable de entorno, no un valor quemado.
- **Fecha de nacimiento:** puede ser aproximada. Se guarda `birthDate` + `birthDateIsApprox: boolean`. La edad siempre se calcula, nunca se almacena.
- **Peso:** siempre en kilogramos, tipo decimal con 2 decimales. Nunca `float`.
- **Temperatura:** grados Celsius, decimal con 1 decimal.
- **Documento de identidad:** `documentType` + `documentNumber`. La unicidad es sobre la pareja, no sobre el número solo.
- **Teléfonos:** se guardan como texto sin formato, solo dígitos y `+`. El formateo es de presentación.
- **Borrado:** nada se borra físicamente. Todo usa `isActive` o `deletedAt`. La historia clínica ni siquiera eso.
